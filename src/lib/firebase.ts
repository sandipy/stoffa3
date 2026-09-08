import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import type { CuratedCollectionItem } from '../data/collectionsData';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Connection verification test as required by skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('[Firebase] Firestore connected successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore is in offline mode or network is unreachable.');
    } else {
      console.info('[Firebase] Firestore initialized.');
    }
    return false;
  }
}

// Automatically test connection on boot
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

/**
 * Save curated collections to Firestore (curated_catalog doc)
 */
export async function syncCollectionsToFirestore(
  collections: CuratedCollectionItem[]
): Promise<boolean> {
  try {
    const docRef = doc(db, 'collections', 'curated_catalog');
    await setDoc(
      docRef,
      {
        collections,
        updatedAt: new Date().toISOString(),
        version: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to sync collections to Firestore:', err);
    return false;
  }
}

/**
 * Fetch curated collections from Firestore
 */
export async function fetchCollectionsFromFirestore(): Promise<CuratedCollectionItem[] | null> {
  try {
    const docRef = doc(db, 'collections', 'curated_catalog');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.collections) && data.collections.length > 0) {
        return data.collections as CuratedCollectionItem[];
      }
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Could not fetch collections from Firestore:', err);
    return null;
  }
}

export interface CmsSnapshotRecord {
  id: string;
  timestamp: string;
  note: string;
  collectionsCount: number;
  collectionsJson: string;
}

/**
 * Create a new backup version snapshot in Firestore
 */
export async function createCmsSnapshot(
  collections: CuratedCollectionItem[],
  note = 'Manual CMS Snapshot'
): Promise<string | null> {
  try {
    const snapshotCol = collection(db, 'cms_snapshots');
    const docData = {
      timestamp: new Date().toISOString(),
      note: note.trim() || 'Snapshot',
      collectionsCount: collections.length,
      collectionsJson: JSON.stringify(collections),
    };
    const res = await addDoc(snapshotCol, docData);
    return res.id;
  } catch (err) {
    console.error('[Firebase] Failed to create snapshot:', err);
    return null;
  }
}

/**
 * List recent CMS backup snapshots
 */
export async function listCmsSnapshots(maxLimit = 15): Promise<CmsSnapshotRecord[]> {
  try {
    const snapshotCol = collection(db, 'cms_snapshots');
    const q = query(snapshotCol, orderBy('timestamp', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    const results: CmsSnapshotRecord[] = [];
    snap.forEach((docItem) => {
      const d = docItem.data();
      results.push({
        id: docItem.id,
        timestamp: d.timestamp || '',
        note: d.note || 'Snapshot',
        collectionsCount: Number(d.collectionsCount) || 0,
        collectionsJson: d.collectionsJson || '[]',
      });
    });
    return results;
  } catch (err) {
    console.warn('[Firebase] Failed to list snapshots:', err);
    return [];
  }
}

/**
 * Restore a specific CMS backup snapshot by ID
 */
export async function restoreCmsSnapshot(
  snapshotId: string
): Promise<CuratedCollectionItem[] | null> {
  try {
    const docRef = doc(db, 'cms_snapshots', snapshotId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      if (d?.collectionsJson) {
        const parsed = JSON.parse(d.collectionsJson) as CuratedCollectionItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Also sync as the new live catalog
          await syncCollectionsToFirestore(parsed);
          return parsed;
        }
      }
    }
    return null;
  } catch (err) {
    console.error('[Firebase] Failed to restore snapshot:', err);
    return null;
  }
}
