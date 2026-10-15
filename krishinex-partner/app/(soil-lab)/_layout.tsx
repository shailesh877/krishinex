// app/(soil-lab)/_layout.tsx
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../../context/I18nContext';
import NotificationIcon from '@/components/NotificationIcon';
import { useSoilBadge } from '../../hooks/useSoilBadge';

function SoilLabTabs() {
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const { newCount } = useSoilBadge();

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 6;
  const tabHeight = 54 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B9C85',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: isHindi ? 'मिट्टी होम' : 'Soil home',
          tabBarLabel: isHindi ? 'होम' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: isHindi ? 'जांच रिक्वेस्ट' : 'Soil requests',
          tabBarLabel: isHindi ? 'रिक्वेस्ट' : 'Requests',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="flask-outline" size={size} color={color} />
              {newCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 16,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  elevation: 5,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                    {newCount > 99 ? '99+' : newCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          title: isHindi ? 'वॉलेट' : 'Wallet',
          tabBarLabel: isHindi ? 'वॉलेट' : 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: isHindi ? 'सूचनाएं' : 'Notifications',
          tabBarLabel: isHindi ? 'सूचनाएं' : 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <NotificationIcon size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: isHindi ? 'प्रोफाइल' : 'Profile',
          tabBarLabel: isHindi ? 'प्रोफाइल' : 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="help"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function SoilLabLayout() {
  return (
    <I18nProvider>
      <SoilLabTabs />
    </I18nProvider>
  );
}
