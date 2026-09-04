import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

interface NotificationIconProps {
  size?: number;
  color?: string;
}

export default function NotificationIcon({ size = 20, color = "#4B5563" }: NotificationIconProps) {
  const { unreadCount } = useNotificationBadge();

  return (
    <View>
      <Ionicons name="notifications-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
