import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CachedFetchResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  backgroundFetching: boolean;
};

/**
 * A custom hook to fetch data with Stale-While-Revalidate caching pattern.
 * Instantly loads cached data from AsyncStorage, then fetches fresh data in the background silently.
 * 
 * @param cacheKey Unique string key for this API call (e.g. 'shop-dashboard-stats')
 * @param fetchFn The function that performs the actual API fetch and returns the data
 * @param pollingInterval Optional interval in milliseconds for background polling
 */
export function useCachedFetch<T>(cacheKey: string, fetchFn: () => Promise<T>, pollingInterval?: number): CachedFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Initial load (if no cache)
  const [backgroundFetching, setBackgroundFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performFetch = useCallback(async (isBackground = false) => {
    if (isBackground) setBackgroundFetching(true);
    else setLoading(true);
    setError(null);

    try {
      // Execute the provided fetch function
      const freshData = await fetchFn();
      
      if (freshData) {
        setData(freshData);
        // Cache the result for next time
        await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
      console.error(`[useCachedFetch error for ${cacheKey}]:`, e);
    } finally {
      setLoading(false);
      setBackgroundFetching(false);
    }
  }, [cacheKey, fetchFn]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // 1. Try to load from cache immediately
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        if (cachedStr && mounted) {
          setData(JSON.parse(cachedStr));
          // Once cache is loaded, loading is technically done for the user visually
          setLoading(false); 
          // 2. But we silently re-fetch in the background
          performFetch(true);
        } else {
          // No cache found, do a normal foreground fetch
          if (mounted) performFetch(false);
        }
      } catch (e) {
        // If cache fails, fallback to normal fetch
        if (mounted) performFetch(false);
      }
    };

    loadData();

    let intervalId: NodeJS.Timeout;
    if (pollingInterval) {
      intervalId = setInterval(() => {
        if (mounted) performFetch(true);
      }, pollingInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [cacheKey, pollingInterval]); // Note: DO NOT include performFetch/fetchFn here, it will loop if not memoized perfectly by the parent

  const refetch = useCallback(async () => {
    await performFetch(false);
  }, [performFetch]);

  return { data, loading, error, refetch, backgroundFetching };
}
