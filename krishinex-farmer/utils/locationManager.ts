import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'cached_location';

export interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Distance calculation using Haversine formula
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
};

// 1. Get Stored Location Only (For Shop, Equipment, etc.)
export const getStoredLocation = async (): Promise<CachedLocation | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (cachedData) {
      console.log('[LocationManager] Reading from DB (No GPS)');
      return JSON.parse(cachedData);
    }
    // If no cache at all, fallback to a one-time quick fetch
    console.log('[LocationManager] DB empty, fetching one-time GPS');
    return await fetchFreshAndSave();
  } catch (error) {
    console.error('[LocationManager] Error reading stored location:', error);
    return null;
  }
};

// 2. Fetch Fresh and Save (Internal fallback)
const fetchFreshAndSave = async (): Promise<CachedLocation | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    let freshLoc = await Location.getLastKnownPositionAsync({});
    if (!freshLoc) {
       let timeoutId: NodeJS.Timeout;
       const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
       const timeoutPromise = new Promise<never>((_, reject) => {
         timeoutId = setTimeout(() => reject(new Error('timeout')), 5000);
       });
       freshLoc = await Promise.race([locPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    }
    
    if (freshLoc) {
      const newCache = {
        latitude: freshLoc.coords.latitude,
        longitude: freshLoc.coords.longitude,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(newCache));
      return newCache;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// 3. Update Background Location (For Home Page / Weather)
export const updateBackgroundLocation = async (): Promise<{ location: CachedLocation, changed: boolean } | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationManager] Permission denied for background update');
      return null;
    }

    let timeoutId: NodeJS.Timeout;
    const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Location timeout')), 15000);
    });
    
    const freshLoc = await Promise.race([locPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    
    if (freshLoc) {
      const newLoc: CachedLocation = {
        latitude: freshLoc.coords.latitude,
        longitude: freshLoc.coords.longitude,
        timestamp: Date.now()
      };

      const cachedData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      let changed = true;

      if (cachedData) {
        const parsed: CachedLocation = JSON.parse(cachedData);
        const distance = getDistanceKm(parsed.latitude, parsed.longitude, newLoc.latitude, newLoc.longitude);
        if (distance <= 2) {
           console.log(`[LocationManager] Distance moved is ${distance.toFixed(2)} km (< 2km), no weather re-render needed.`);
           changed = false; // Less than 2 km change
        } else {
           console.log(`[LocationManager] Distance moved is ${distance.toFixed(2)} km (> 2km), trigger weather update.`);
        }
      } else {
        console.log('[LocationManager] First time location update.');
      }

      // Always update timestamp and DB
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(newLoc));
      return { location: newLoc, changed };
    }

    return null;
  } catch (error: any) {
    console.log('[LocationManager] Background location fetch failed:', error.message || error);
    return null;
  }
};
