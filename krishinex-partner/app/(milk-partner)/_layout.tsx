import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../context/I18nContext';
import { initSocket, disconnectSocket } from '../../services/socket';

export default function MilkPartnerTabsLayout() {
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  useEffect(() => {
    initSocket();
    return () => {
      // Keep socket open or disconnect on layout unmount
    };
  }, []);

  const homeLabel = hi ? 'होम' : 'Home';
  const purchaseLabel = hi ? 'दूध खरीद' : 'Purchase';
  const salesLabel = hi ? 'दूध बिक्री' : 'Sales';
  const walletLabel = hi ? 'वॉलेट' : 'Wallet';
  const profileLabel = hi ? 'प्रोफाइल' : 'Profile';

  const bottomPadding = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669', // Emerald 600
        tabBarInactiveTintColor: '#64748B', // Slate 500
        tabBarStyle: {
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          elevation: 12,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: homeLabel,
          tabBarLabel: homeLabel,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase"
        options={{
          title: purchaseLabel,
          tabBarLabel: purchaseLabel,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "water" : "water-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: salesLabel,
          tabBarLabel: salesLabel,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bicycle" : "bicycle-outline"} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: walletLabel,
          tabBarLabel: walletLabel,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: profileLabel,
          tabBarLabel: profileLabel,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Hidden screens inside layout */}
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="approval-pending"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
