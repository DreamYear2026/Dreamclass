const CACHE_KEY_PREFIX = 'dreamyear_cache_';
const CACHE_VERSION = 'v1';
const DEFAULT_TTL = 5 * 60 * 1000;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

export const setCache = <T>(key: string, data: T, ttl: number = DEFAULT_TTL): void => {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION,
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to set cache:', error);
  }
};

export const getCache = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    
    if (entry.version !== CACHE_VERSION) {
      removeCache(key);
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      removeCache(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to get cache:', error);
    return null;
  }
};

export const removeCache = (key: string): void => {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
  } catch (error) {
    console.error('Failed to remove cache:', error);
  }
};

export const clearExpiredCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item);
            if (entry.version !== CACHE_VERSION || now - entry.timestamp > entry.ttl) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
};

export const clearAllCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
};

export const getCacheSize = (): number => {
  try {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) size += new Blob([item]).size;
      }
    }
    return size;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
};

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onNetworkStatusChange = (callback: (isOnline: boolean) => void): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
