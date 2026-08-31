// app/(shop-partner)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../context/I18nContext';

export default function ShopTabsLayout() {
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const homeLabel = isHindi ? 'होम' : 'Home';
  const posLabel = isHindi ? 'बिक्री' : 'POS';
  const newOrdersLabel = isHindi ? 'नया' : 'New';
  const acceptedOrdersLabel = isHindi ? 'Accepted' : 'Accepted';
  const ledgerLabel = isHindi ? 'खाता' : 'Ledger';
  const profileLabel = isHindi ? 'प्रोफाइल' : 'Profile';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#00000020',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700' },
      }}
    >
      {/* VISIBLE TABS */}
      <Tabs.Screen
        name="home"
        options={{
          title: homeLabel,
          tabBarLabel: homeLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: posLabel,
          tabBarLabel: posLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: newOrdersLabel,
          tabBarLabel: newOrdersLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accept"
        options={{
          title: acceptedOrdersLabel,
          tabBarLabel: acceptedOrdersLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: ledgerLabel,
          tabBarLabel: ledgerLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: profileLabel,
          tabBarLabel: profileLabel,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* HIDDEN SCREENS */}
      <Tabs.Screen name="items-add" options={{ href: null }} />
      <Tabs.Screen name="items-list" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}
