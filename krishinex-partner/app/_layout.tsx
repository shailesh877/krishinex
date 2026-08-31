import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { I18nProvider } from '../context/I18nContext';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from '../utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Image, Text, StatusBar, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_API_URL } from '../constants/api';
import { CustomAlert, customAlertRef } from '../components/CustomAlert';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && rootNavigationState?.key && targetRoute) {
      router.replace(targetRoute as any);
      setTargetRoute(null);
    }
  }, [isReady, rootNavigationState?.key, targetRoute]);

  // 1. Setup notifications ONCE
  useEffect(() => {
    const isExpoGo = require('expo-constants').default.appOwnership === 'expo';
    let notificationListener: any;
    let responseListener: any;

    async function setupNotifications() {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await AsyncStorage.setItem('pushToken', token);
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          await registerTokenWithBackend(token);
        }
      }
    }

    if (!isExpoGo) {
      setupNotifications();
      const Notifications = require('expo-notifications');

      // Foreground listener
      notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('[NOTIFY] Received in foreground:', notification);
      });

      // Interaction listener
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const { data } = response.notification.request.content;
        if (data?.type === 'order' || data?.type === 'request') {
          AsyncStorage.getItem('userData').then((userData: string | null) => {
            if (userData) {
              const user = JSON.parse(userData);
              const rPath = (role: string) => {
                  if (role === 'shop') return '/(shop-partner)/notifications';
                  if (role === 'labour') return '/(labour-partner)/notifications';
                  if (role === 'equipment') return '/(equipment)/notifications';
                  if (role === 'soil') return '/(soil-lab)/notifications';
                  if (role === 'buyer') return '/(buyer)/notifications';
                  if (role === 'employee') return '/(employee)/notifications';
                  return null;
              };
              const path = rPath(user.role);
              if (path) router.push(path as any);
            }
          });
        }
      });
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, []);

  // 2. Initial Auth Check ONCE
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Fetch fresh profile in background
          fetch(`${BASE_API_URL}/user/profile`, { 
              headers: { 'Authorization': `Bearer ${token}` } 
          }).then(res => res.json()).then(async (freshData) => {
              if (freshData && freshData._id) {
                 await AsyncStorage.setItem('userData', JSON.stringify(freshData));
                 setProfileStatus(freshData.status || 'approved');
              }
          }).catch(err => console.log('Profile fresh fetch failed', err));
        }
      } catch (e) {
        console.error('Init auth error', e);
      } finally {
        setIsReady(true);
      }
    };
    initAuth();
  }, []);

  // 3. Navigation Guard
  useEffect(() => {
    if (!isReady || !rootNavigationState?.key) return;

    const guardNav = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        const inAuthGroup = segments[0] === '(auth)' || !segments[0];

        if (token && userData) {
          const user = JSON.parse(userData);
          const r = user.role;
          let path: any = null;
          
          if (r === 'buyer') path = '/(buyer)/home';
          else if (r === 'equipment') path = '/(equipment)/home';
          else if (r === 'soil') path = '/(soil-lab)/home';
          else if (r === 'shop') path = '/(shop-partner)/home';
          else if (r === 'labour') path = '/(labour-partner)/home';
          else if (r === 'employee' || r === 'field_executive') path = '/(employee)/home';

          if (path && inAuthGroup) {
            setTargetRoute(path);
          }
        } else {
          if (!inAuthGroup) {
            setTargetRoute('/');
          }
        }
      } catch (e) {
        console.error('Guard nav error', e);
      }
    };

    guardNav();
  }, [segments, isReady, rootNavigationState?.key]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E9F6E', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" />
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: 200, height: 80, marginBottom: 20 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#ffffff', marginTop: 15, fontWeight: '700', fontSize: 16 }}>
          KrishiNex Partner
        </Text>
      </View>
    );
  }

  return (
    <I18nProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <CustomAlert ref={customAlertRef} />
    </I18nProvider>
  );
}
