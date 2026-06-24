/**
 * Cache Manager Utilities
 * Handles clearing client-side cache, localStorage, sessionStorage, and application state
 */

export interface CacheStats {
  itemsCleared: number;
  storageKeysCleared: string[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

/**
 * List of all storage keys used by the POS application
 */
const STORAGE_KEYS = [
  'pos_product_imeis',
  'pos_payment_methods',
  'pos_auth_token',
  'pos_user_session',
  'pos_cart_items',
  'pos_sale_draft',
  'pos_return_draft',
  'pos_search_cache',
  'pos_filter_preferences',
  'pos_ui_state',
  'pos_notifications',
  'pos_recent_customers',
  'pos_recent_products',
  'pos_invoice_history',
];

/**
 * Clears all client-side cache and storage
 * This includes: localStorage, sessionStorage, and any cached state
 * 
 * @returns CacheStats object with details about what was cleared
 */
export function clearAllCache(): CacheStats {
  const startTime = performance.now();
  const storageKeysCleared: string[] = [];
  let itemsCleared = 0;

  try {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const localKeys = Object.keys(window.localStorage);
      localKeys.forEach(key => {
        window.localStorage.removeItem(key);
        storageKeysCleared.push(key);
        itemsCleared++;
      });
    }

    // Clear sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionKeys = Object.keys(window.sessionStorage);
      sessionKeys.forEach(key => {
        window.sessionStorage.removeItem(key);
        storageKeysCleared.push(key);
        itemsCleared++;
      });
    }

    // Clear IndexedDB if available (for future-proofing)
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const dbs = ['pos_database', 'cache', 'offline_data'];
        dbs.forEach(dbName => {
          const deleteReq = window.indexedDB.deleteDatabase(dbName);
          deleteReq.onsuccess = () => {
            console.log(`Deleted IndexedDB: ${dbName}`);
            itemsCleared++;
          };
          deleteReq.onerror = () => {
            console.warn(`Failed to delete IndexedDB: ${dbName}`);
          };
        });
      } catch (err) {
        console.warn('Error clearing IndexedDB:', err);
      }
    }

    const endTime = performance.now();

    return {
      itemsCleared,
      storageKeysCleared,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  } catch (err) {
    console.error('Error clearing cache:', err);
    const endTime = performance.now();
    return {
      itemsCleared,
      storageKeysCleared,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }
}

/**
 * Clears only POS-specific storage keys
 * Leaves other application data intact
 * 
 * @returns CacheStats object with details about what was cleared
 */
export function clearPosCache(): CacheStats {
  const startTime = performance.now();
  const storageKeysCleared: string[] = [];
  let itemsCleared = 0;

  try {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      STORAGE_KEYS.forEach(key => {
        if (window.localStorage.getItem(key) !== null) {
          window.localStorage.removeItem(key);
          storageKeysCleared.push(key);
          itemsCleared++;
        }
      });
    }

    // Also check for any remaining pos_ prefixed keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = Object.keys(window.localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('pos_') && !STORAGE_KEYS.includes(key)) {
          window.localStorage.removeItem(key);
          storageKeysCleared.push(key);
          itemsCleared++;
        }
      });
    }

    const endTime = performance.now();

    return {
      itemsCleared,
      storageKeysCleared,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  } catch (err) {
    console.error('Error clearing POS cache:', err);
    const endTime = performance.now();
    return {
      itemsCleared,
      storageKeysCleared,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }
}

/**
 * Clears POS cache and reloads the application
 * Used after clearing cache to ensure fresh application state
 */
export function clearCacheAndReload(): void {
  try {
    const stats = clearPosCache();
    console.log('Cache cleared:', stats);

    // Wait a moment for all storage operations to complete
    setTimeout(() => {
      window.location.reload();
    }, 300);
  } catch (err) {
    console.error('Error during cache clear and reload:', err);
    // Force reload even if there was an error
    window.location.reload();
  }
}

/**
 * Get size of current cache in bytes
 * Useful for monitoring cache usage
 */
export function getCacheSize(): number {
  try {
    let size = 0;

    if (typeof window !== 'undefined' && window.localStorage) {
      Object.keys(window.localStorage).forEach(key => {
        const item = window.localStorage.getItem(key);
        if (item) {
          size += key.length + item.length;
        }
      });
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      Object.keys(window.sessionStorage).forEach(key => {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          size += key.length + item.length;
        }
      });
    }

    return size;
  } catch (err) {
    console.error('Error calculating cache size:', err);
    return 0;
  }
}

/**
 * Get human-readable cache size
 */
export function getCacheSizeFormatted(): string {
  const bytes = getCacheSize();
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
