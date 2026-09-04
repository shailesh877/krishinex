import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'cached_location';
const CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export type CachedLocation = {
  coords: {
    latitude: number;
    longitude: number;
  };
  timestamp: number;
};

class LocationService {
  private isFetching = false;
  private pendingPromise: Promise<Location.LocationObject | null> | null = null;

  async getLocation(forceRefresh = false): Promise<CachedLocation | null> {
    try {
      if (!forceRefresh) {
        // Try to get cached location first
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedCache: CachedLocation = JSON.parse(cached);
          const age = Date.now() - parsedCache.timestamp;
          
          if (age < CACHE_EXPIRY_MS) {
            // Cache is valid, trigger a background refresh just in case, but return cache immediately
            this.fetchAndCacheLocationSilently();
            return parsedCache;
          }
        }
      }
      
      // If no valid cache or forceRefresh, wait for the actual fetch
      const freshLocation = await this.fetchAndCacheLocationSilently();
      if (freshLocation) {
        return {
          coords: freshLocation.coords,
          timestamp: freshLocation.timestamp
        };
      }
      return null;
    } catch (e) {
      console.warn('LocationService Error:', e);
      return null;
    }
  }

  private async fetchAndCacheLocationSilently(): Promise<Location.LocationObject | null> {
    if (this.isFetching && this.pendingPromise) {
      return this.pendingPromise;
    }

    this.isFetching = true;
    this.pendingPromise = (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return null;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const cacheData: CachedLocation = {
          coords: location.coords,
          timestamp: Date.now() // Use current time for expiry logic
        };
        
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        return location;
      } catch (e) {
        console.warn('Background Location Fetch Error:', e);
        return null;
      } finally {
        this.isFetching = false;
        this.pendingPromise = null;
      }
    })();

    return this.pendingPromise;
  }
}

export default new LocationService();
