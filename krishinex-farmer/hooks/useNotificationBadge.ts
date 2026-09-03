import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_URL } from '../services/api';

export function useNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (forceApi = false) => {
    try {
      // 1. Read from cache first to be instant
      const cached = await AsyncStorage.getItem('cached_unread');
      if (cached) {
        setUnreadCount(parseInt(cached, 10));
      }

      // 2. Fetch from API optionally
      if (forceApi) {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const newCount = data.count || 0;
          setUnreadCount(newCount);
          await AsyncStorage.setItem('cached_unread', newCount.toString());
        }
      }
    } catch (e) {
      console.log('Error fetching unread count', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount(false); // only read cache on focus, API hit should be manually triggered or on home screen
    }, [fetchUnreadCount])
  );

  return { unreadCount, fetchUnreadCount };
}
