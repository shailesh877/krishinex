import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_API_URL } from '../constants/api';

export function useEquipmentBadge() {
  const [newCount, setNewCount] = useState(0);

  const fetchNewCount = useCallback(async (forceApi = false) => {
    try {
      // 1. Read from cache first
      const cached = await AsyncStorage.getItem('cached_equipment_new');
      if (cached) {
        setNewCount(parseInt(cached, 10));
      }

      // 2. Fetch from API optionally
      if (forceApi) {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${BASE_API_URL}/rentals/equipment-new-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const count = data.count || 0;
          setNewCount(count);
          await AsyncStorage.setItem('cached_equipment_new', count.toString());
        }
      }
    } catch (e) {
      console.log('Error fetching equipment new count', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNewCount(true);
      
      const interval = setInterval(() => {
        fetchNewCount(true);
      }, 5000); // Silent fetch every 5 seconds like requests.tsx
      
      return () => {
        clearInterval(interval);
      }
    }, [fetchNewCount])
  );

  return { newCount, fetchNewCount };
}
