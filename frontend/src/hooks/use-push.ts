import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

type PushState = 'loading' | 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported');
        return;
      }

      // Fetch VAPID key
      const res = await api.get<{ publicKey: string }>('/push/vapid-key');
      if (!res.success || !res.data?.publicKey) {
        setState('unsupported');
        return;
      }
      setVapidKey(res.data.publicKey);

      // Check current permission
      const permission = Notification.permission;
      if (permission === 'denied') {
        setState('denied');
        return;
      }

      // Check if already subscribed
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'subscribed' : permission === 'granted' ? 'unsubscribed' : 'prompt');
    }

    init();
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });

      setState('subscribed');
      return true;
    } catch {
      return false;
    }
  }, [vapidKey]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState('unsubscribed');
      return true;
    } catch {
      return false;
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
