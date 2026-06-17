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

async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Replay policy (mirror of src/lib/sync-policy.ts — unit-tested there) ───

const MAX_SYNC_ATTEMPTS = 5;
const BACKOFF_CAP_MS = 5 * 60 * 1000;

function classifyReplayResponse(status) {
  if (status === null) return 'retry';
  if (status >= 200 && status < 300) return 'success';
  if (status === 408 || status === 429 || status >= 500) return 'retry';
  return 'drop';
}

function nextBackoffMs(attempts) {
  const base = 1000 * 2 ** Math.max(0, attempts - 1);
  return Math.min(base, BACKOFF_CAP_MS);
}

function isDue(nextAttemptAt, now) {
  return nextAttemptAt === undefined || now >= nextAttemptAt;
}

function planNextState(status, attempts, now) {
  const outcome = classifyReplayResponse(status);
  if (outcome === 'success') return { remove: true, dropped: false, attempts };
  if (outcome === 'drop') return { remove: true, dropped: true, attempts };
  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_SYNC_ATTEMPTS)
    return { remove: true, dropped: true, attempts: nextAttempts };
  return {
    remove: false,
    dropped: false,
    attempts: nextAttempts,
    nextAttemptAt: now + nextBackoffMs(nextAttempts),
  };
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
      return new Response(JSON.stringify({ success: true, queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
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

  const now = Date.now();
  let anySuccess = false;
  let droppedCount = 0;
  let pending = 0;

  for (const item of items) {
    // Respect per-item backoff so a flapping item doesn't hammer the server.
    if (!isDue(item.nextAttemptAt, now)) {
      pending++;
      continue;
    }

    let status;
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
        credentials: 'include',
      });
      status = res.status;
    } catch {
      status = null; // network/transport failure
    }

    const plan = planNextState(status, item.attempts || 0, now);
    if (plan.remove) {
      // Removed per-item on success — so a later failure can't cause an
      // already-applied mutation to be replayed (no duplicates).
      await deleteItem(item.id);
      if (plan.dropped) droppedCount++;
      else anySuccess = true;
    } else {
      await updateItem({ ...item, attempts: plan.attempts, nextAttemptAt: plan.nextAttemptAt });
      pending++;
    }
  }

  // Anything still queued (retryable or backing off) → ask for another sync.
  if (pending > 0 && 'sync' in self.registration) {
    await self.registration.sync.register(SYNC_TAG);
  }

  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    if (anySuccess) client.postMessage({ type: 'SYNC_COMPLETE' });
    if (droppedCount > 0) client.postMessage({ type: 'SYNC_FAILED', dropped: droppedCount });
  }
}

// ─── Also replay on connectivity restore (fallback) ────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPLAY_SYNC') {
    replayQueue();
  }
});
