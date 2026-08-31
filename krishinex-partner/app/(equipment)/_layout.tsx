import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../../context/I18nContext';

function EquipmentTabs() {
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
          title: isHindi ? 'होम' : 'Home',
          tabBarLabel: isHindi ? 'होम' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: isHindi ? 'रिक्वेस्ट' : 'Requests',
          tabBarLabel: isHindi ? 'रिक्वेस्ट' : 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
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
        name="profile"
        options={{
          title: isHindi ? 'प्रोफाइल' : 'Profile',
          tabBarLabel: isHindi ? 'प्रोफाइल' : 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* hidden routes – tab bar me nahi dikhenge */}
      <Tabs.Screen
        name="add-machine"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="machines"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="terms"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="help"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function EquipmentLayout() {
  return (
    <I18nProvider>
      <EquipmentTabs />
    </I18nProvider>
  );
}
