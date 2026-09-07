import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_API_URL } from '../constants/api';

export function useSoilBadge() {
  const [newCount, setNewCount] = useState(0);

  const fetchNewCount = useCallback(async (forceApi = false) => {
    try {
      const cached = await AsyncStorage.getItem('cached_soil_new');
      if (cached) {
        setNewCount(parseInt(cached, 10));
      }

      if (forceApi) {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${BASE_API_URL}/soil/new-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const count = data.count || 0;
          setNewCount(count);
          await AsyncStorage.setItem('cached_soil_new', count.toString());
        }
      }
    } catch (e) {
      console.log('Error fetching soil new count', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNewCount(true);
      const interval = setInterval(() => {
        fetchNewCount(true);
      }, 5000);
      return () => clearInterval(interval);
    }, [fetchNewCount])
  );

  return { newCount, fetchNewCount };
}
