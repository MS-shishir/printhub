/**
 * dbService.ts
 * Native IndexedDB Service for PrintHub Studio.
 * Handles high-capacity storage of photo media items, thumbnails, and session persistence
 * without browser localStorage quota limits (QuotaExceededError).
 */

export interface MediaItemRecord {
  id: string;
  projectId: string;
  name: string;
  dataUrl: string;
  thumbnail: string;
  width?: number;
  height?: number;
  type?: string;
  selected?: boolean;
  timestamp: number;
}

const DB_NAME = 'PrintHubStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_bin';

class DBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Save a single media item to IndexedDB
   */
  public async saveMediaItem(projectId: string | number, item: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: MediaItemRecord = {
        id: item.id,
        projectId: String(projectId),
        name: item.name,
        dataUrl: item.dataUrl,
        thumbnail: item.thumbnail || item.dataUrl,
        width: item.width,
        height: item.height,
        type: item.type,
        selected: item.selected ?? true,
        timestamp: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save multiple media items in a single transaction
   */
  public async saveMediaItems(projectId: string | number, items: any[]): Promise<void> {
    if (!items.length) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      items.forEach((item) => {
        const record: MediaItemRecord = {
          id: item.id,
          projectId: String(projectId),
          name: item.name,
          dataUrl: item.dataUrl,
          thumbnail: item.thumbnail || item.dataUrl,
          width: item.width,
          height: item.height,
          type: item.type,
          selected: item.selected ?? true,
          timestamp: Date.now(),
        };
        store.put(record);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all media items for a specific project
   */
  public async getProjectMediaItems(projectId: string | number): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('projectId');
      const req = index.getAll(String(projectId));

      req.onsuccess = () => {
        const records: MediaItemRecord[] = req.result || [];
        // Sort by timestamp
        records.sort((a, b) => a.timestamp - b.timestamp);
        const items = records.map((r) => ({
          id: r.id,
          name: r.name,
          dataUrl: r.dataUrl,
          thumbnail: r.thumbnail,
          width: r.width,
          height: r.height,
          type: r.type,
          selected: r.selected,
        }));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a media item by ID
   */
  public async deleteMediaItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clear all media items for a specific project
   */
  public async clearProjectMediaBin(projectId: string | number): Promise<void> {
    const db = await this.getDB();
    const items = await this.getProjectMediaItems(projectId);
    if (!items.length) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      items.forEach((item) => {
        store.delete(item.id);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Auto-migrate legacy media items from localStorage to IndexedDB
   */
  public async migrateFromLocalStorage(projectId: string | number): Promise<any[]> {
    const key = `printhub_mediabin_${projectId}`;
    const legacyStr = localStorage.getItem(key);
    if (!legacyStr) return [];

    try {
      const legacyItems = JSON.parse(legacyStr);
      if (Array.isArray(legacyItems) && legacyItems.length > 0) {
        console.log(`[IndexedDB Migration] Migrating ${legacyItems.length} media items from localStorage to IndexedDB...`);
        await this.saveMediaItems(projectId, legacyItems);
        // Clear legacy key to free up localStorage quota
        localStorage.removeItem(key);
        console.log(`[IndexedDB Migration] Migration complete. Freed up localStorage key: ${key}`);
        return legacyItems;
      }
    } catch (e) {
      console.warn('[IndexedDB Migration] Legacy media bin migration failed:', e);
    }
    return [];
  }
}

export const dbService = new DBService();
