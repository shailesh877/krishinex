import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nProvider, useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL } from '../../constants/api';

function BuyerTabs() {
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${BASE_API_URL}/orders/assigned`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const count = data.filter((o: any) => o.assignedStatus === 'new').length;
          setPendingCount(count);
        }
      } catch (e) {}
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16A34A', // KrishiNex green
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
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
          title: isHindi ? 'होम' : 'Home',
          tabBarLabel: isHindi ? 'होम' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="assigned-orders"
        options={{
          title: isHindi ? 'ऑर्डर' : 'Orders',
          tabBarLabel: isHindi ? 'ऑर्डर' : 'Orders',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
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

      {/* Hidden Routes (Not visible in bottom tab bar) */}
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="create-order" options={{ href: null }} />
      <Tabs.Screen name="help-support" options={{ href: null }} />
      <Tabs.Screen name="my-requests" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

export default function BuyerLayout() {
  return (
    <I18nProvider>
      <BuyerTabs />
    </I18nProvider>
  );
}
