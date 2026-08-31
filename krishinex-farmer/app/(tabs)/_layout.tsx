// app/(tabs)/_layout.tsx - ✅ DEFAULT HEADER HAT GAYA
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/context/I18nContext';

import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const PRIMARY_GREEN = '#7CB342';
const GREEN_DARK = '#33691E';
const INACTIVE = '#9CA3AF';

export default function TabsLayout() {
  const { language } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const hi = language === 'hi';

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/(auth)/signup');
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return null; // Don't render anything while checking auth
  }

  const TAB_HEIGHT = Platform.OS === 'ios' ? 60 + insets.bottom : 60 + insets.bottom;
  const PADDING_BOTTOM = insets.bottom > 0 ? insets.bottom : 5;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,  // ✅ DEFAULT HEADER OFF - SABHI SCREENS KE LIYE
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarActiveTintColor: PRIMARY_GREEN,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          height: TAB_HEIGHT,
          paddingTop: 4,
          paddingBottom: PADDING_BOTTOM,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopWidth: 0,
          elevation: 18,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarIcon: ({ focused }) => {
          // CENTER SELL BUTTON - ✅ PERFECTLY WORKING
          if (route.name === 'sell') {
            return (
              <View style={styles.sellWrapper}>
                <LinearGradient
                  colors={
                    focused
                      ? ['#A3E635', '#65A30D']
                      : ['#7CB342', '#558B2F']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.sellCircle,
                    focused && styles.sellCircleActive,
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={32}
                    color="#ffffff"
                    style={{ marginBottom: 0 }}
                  />
                </LinearGradient>
              </View>
            );
          }

          // NORMAL TABS
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'index') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'shop') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'orders') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline';

          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={iconName} size={21} color={focused ? PRIMARY_GREEN : INACTIVE} />
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: hi ? 'होम' : 'Home' }} />
      <Tabs.Screen name="shop" options={{ title: hi ? 'शॉप' : 'Shop' }} />
      
     
      <Tabs.Screen 
        name="sell" 
        options={{ 
          title: hi ? 'बेचे' : 'Sell', 
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            marginTop: Platform.OS === 'ios' ? 1 : 5,
          },
        }} 
      />
      
      <Tabs.Screen name="orders" options={{ title: hi ? 'ऑर्डर' : 'ORDER' }} />
      <Tabs.Screen name="profile" options={{ title: hi ? 'प्रोफाइल' : 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    transform: [{ scale: 1.06 }],
  },
  sellWrapper: {
    marginTop: Platform.OS === 'ios' ? -30 : -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#f2f2f2ff',
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  sellCircleActive: {
    transform: [{ scale: 1.06 }],
  },
  sellText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: GREEN_DARK,
    letterSpacing: 0.3,
  },
});
