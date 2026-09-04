// app/(soil-lab)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../../context/I18nContext';
import NotificationIcon from '@/components/NotificationIcon';

function SoilLabTabs() {
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B9C85',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
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
            <Ionicons name="flask-outline" size={size} color={color} />
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

      {/* future hidden pages: report edit / view etc. */}
      <Tabs.Screen
        name="report-edit"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="report-view"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="help"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="terms"
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
