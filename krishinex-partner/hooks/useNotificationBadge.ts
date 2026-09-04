import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_API_URL } from '../constants/api'; // note: partner app has api url in constants

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
        const res = await fetch(`${BASE_API_URL}/notifications/unread-count`, {
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
      fetchUnreadCount(true); // always fetch from API on focus to keep it fresh
    }, [fetchUnreadCount])
  );

  return { unreadCount, fetchUnreadCount };
}

