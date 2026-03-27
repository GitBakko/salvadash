// Background sync handler for SalvaDash service worker
// Imported by VitePWA via workbox.importScripts
//
// When offline, POST/PUT/DELETE to /api are queued in IndexedDB.
// When back online the browser fires 'sync' and we replay the queue.

const SYNC_TAG = 'salvadash-sync';
const QUEUE_STORE = 'salvadash-sync-queue';
const DB_NAME = 'salvadash-sync';
const DB_VERSION = 1;

// ─── IndexedDB helpers ─────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dequeueAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Intercept mutating API calls when offline ─────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept API mutations (POST/PUT/DELETE)
  if (!url.pathname.startsWith('/api/')) return;
  if (request.method === 'GET' || request.method === 'HEAD') return;

  event.respondWith(
    fetch(request.clone()).catch(async () => {
      // Network failed → queue for background sync
      const body = await request.clone().text();
      await enqueue({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        timestamp: Date.now(),
      });

      // Register sync
      if ('sync' in self.registration) {
        await self.registration.sync.register(SYNC_TAG);
      }

      // Return synthetic response so the UI knows it's queued
      return new Response(
        JSON.stringify({ success: true, queued: true }),
        { status: 202, headers: { 'Content-Type': 'application/json' } },
      );
    }),
  );
});

// ─── Replay queue when back online ─────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag !== SYNC_TAG) return;

  event.waitUntil(replayQueue());
});

async function replayQueue() {
  const items = await dequeueAll();
  if (!items.length) return;

  for (const item of items) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
        credentials: 'include',
      });
    } catch {
      // Still offline — re-register sync so it retries later
      if ('sync' in self.registration) {
        await self.registration.sync.register(SYNC_TAG);
      }
      return; // Stop replaying — we'll retry all remaining items next time
    }
  }

  // All replayed successfully
  await clearQueue();

  // Notify clients to refetch
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  }
}

// ─── Also replay on connectivity restore (fallback) ────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPLAY_SYNC') {
    replayQueue();
  }
});
