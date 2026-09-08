/**
 * Centralized, quota-safe persistent storage utility for Stoffa Style.
 * Combines synchronous localStorage (for instant, flicker-free rendering)
 * with IndexedDB (for unlimited, fail-safe storage of custom images & CMS edits).
 */

const DB_NAME = 'stoffa_app_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'stoffa_key_value_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  return dbPromise;
}

/**
 * Compresses an image file (JPEG, PNG, WebP) down to a lightweight, high-fidelity
 * data URL using an offscreen canvas. Typically reduces 4-10MB files to ~80-150KB.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute proportional downscale
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data URL if canvas context unavailable
            return resolve(e.target?.result as string);
          }

          // Draw with high quality interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Output compressed JPEG data URL
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          // Fallback to uncompressed if canvas fails
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Saves data synchronously to localStorage AND asynchronously to IndexedDB.
 * Gracefully handles localStorage QuotaExceededError by logging and relying on IndexedDB.
 */
export async function saveToStorageWithBackup<T>(key: string, data: T): Promise<void> {
  if (typeof window === 'undefined') return;

  const jsonString = JSON.stringify(data);

  // 1. Synchronous localStorage attempt
  try {
    localStorage.setItem(key, jsonString);
  } catch (err: any) {
    console.warn(
      `[Storage] localStorage quota reached or blocked for key "${key}". Relying on IndexedDB.`,
      err
    );
  }

  // 2. Persistent IndexedDB backup
  try {
    const db = await getIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, value: data, updatedAt: Date.now() });
    });
  } catch (err) {
    console.warn(`[Storage] IndexedDB write failed for key "${key}":`, err);
  }
}

/**
 * Loads data synchronously from localStorage (instant, no flash of default content).
 * Concurrently checks IndexedDB in the background and hydrates localStorage if missing or stale.
 */
export function loadFromStorageWithBackup<T>(
  key: string,
  fallbackDefault: T,
  onHydrated?: (freshData: T) => void
): T {
  if (typeof window === 'undefined') return fallbackDefault;

  let loaded: T | null = null;

  // 1. Fast synchronous localStorage read
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== undefined && parsed !== null) {
        loaded = parsed;
      }
    }
  } catch (err) {
    console.warn(`[Storage] Error reading localStorage key "${key}":`, err);
  }

  // 2. Asynchronous IndexedDB reconciliation in background
  getIndexedDb()
    .then((db) => {
      return new Promise<{ key: string; value: T; updatedAt: number } | undefined>(
        (resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          tx.onerror = () => reject(tx.error);
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
        }
      );
    })
    .then((result) => {
      if (result && result.value !== undefined && result.value !== null) {
        // If localStorage was empty or missing this key, hydrate it now
        const rawLocal = localStorage.getItem(key);
        if (!rawLocal) {
          try {
            localStorage.setItem(key, JSON.stringify(result.value));
          } catch {}
          if (onHydrated) {
            onHydrated(result.value);
          }
        }
      }
    })
    .catch(() => {
      // IndexedDB optional error suppression
    });

  return loaded !== null ? loaded : fallbackDefault;
}

/**
 * Removes data from both localStorage and IndexedDB.
 */
export async function removeFromStorageWithBackup(key: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch {}

  try {
    const db = await getIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
    });
  } catch {}
}
