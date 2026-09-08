import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_API_URL } from '../constants/api';

let globalUnreadCount = 0;
const listeners = new Set<(count: number) => void>();

export function setGlobalUnreadCount(count: number) {
  globalUnreadCount = count;
  listeners.forEach(cb => cb(count));
  AsyncStorage.setItem('cached_unread', count.toString()).catch(() => {});
}

export async function refreshUnreadCount(force?: boolean) {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;
    const res = await fetch(`${BASE_API_URL}/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setGlobalUnreadCount(data.count || 0);
    }
  } catch (e) {
    console.log('Error refreshing unread count', e);
  }
}

export function useNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount);

  useEffect(() => {
    listeners.add(setUnreadCount);

    AsyncStorage.getItem('cached_unread').then(cached => {
      if (cached !== null) {
        const c = parseInt(cached, 10);
        if (!isNaN(c)) {
          globalUnreadCount = c;
          setUnreadCount(c);
        }
      }
    }).catch(() => {});

    refreshUnreadCount();

    return () => {
      listeners.delete(setUnreadCount);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
    }, [])
  );

  return { unreadCount, fetchUnreadCount: refreshUnreadCount };
}

