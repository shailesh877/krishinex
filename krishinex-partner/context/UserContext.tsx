import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL } from '../constants/api';
import * as Location from 'expo-location';

type UserProfile = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatarUri?: string | null;
  role?: string;
  status?: string;
  [key: string]: any; // Allow role-specific fields
};

type LocationData = {
  latitude: number;
  longitude: number;
  address?: string;
} | null;

type UserContextType = {
  profile: UserProfile | null;
  location: LocationData;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (newData: Partial<UserProfile>) => void;
  updateLocation: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [location, setLocation] = useState<LocationData>(null);
  const [loading, setLoading] = useState(true);

  // Load from cache initially
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedProfile = await AsyncStorage.getItem('userData');
        if (cachedProfile) {
          setProfile(JSON.parse(cachedProfile));
        }
        
        const cachedLocation = await AsyncStorage.getItem('userLocation');
        if (cachedLocation) {
          setLocation(JSON.parse(cachedLocation));
        }
      } catch (e) {
        console.error("Error loading cached user data", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadCachedData();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_API_URL}/user/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Format avatar URI properly if needed
        if (data.profilePhotoUrl) {
          data.avatarUri = data.profilePhotoUrl.startsWith('http') 
            ? data.profilePhotoUrl 
            : `${BASE_API_URL.replace('/api', '')}/${data.profilePhotoUrl.replace(/\\/g, '/')}`;
        }
        
        setProfile(data);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error refreshing user profile", e);
    }
  }, []);

  const updateUser = useCallback((newData: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = prev ? { ...prev, ...newData } : { ...newData };
      // Save to cache asynchronously
      AsyncStorage.setItem('userData', JSON.stringify(updated)).catch(err => 
        console.error("Failed to cache updated user data", err)
      );
      return updated;
    });
  }, []);

  const updateLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      
      // Optionally reverse geocode to get address string here if needed by the app
      let addressStr = '';
      try {
        let geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (geocode && geocode.length > 0) {
          const { city, region, country, street } = geocode[0];
          addressStr = `${street ? street + ', ' : ''}${city ? city + ', ' : ''}${region}, ${country}`;
        }
      } catch(e) {
        console.log("Geocoding failed", e);
      }

      const newLoc = { 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude,
        address: addressStr
      };
      
      setLocation(newLoc);
      await AsyncStorage.setItem('userLocation', JSON.stringify(newLoc));
      
      // Sync with backend if needed, or let individual screens do it
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
         await fetch(`${BASE_API_URL}/user/location`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({
                 latitude: newLoc.latitude,
                 longitude: newLoc.longitude,
                 address: newLoc.address
             })
         });
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  }, []);

  return (
    <UserContext.Provider value={{ profile, location, loading, refreshUser, updateUser, updateLocation }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return ctx;
};
