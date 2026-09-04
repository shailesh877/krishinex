import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { I18nProvider } from '../context/I18nContext';
import { UserProvider } from '../context/UserContext';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from '../utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Image, Text, StatusBar, TouchableOpacity, Animated, Easing, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_API_URL } from '../constants/api';
import { CustomAlert, customAlertRef } from '../components/CustomAlert';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Intercept fetch to redirect all file uploads (FormData) to the live server
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (options && options.body && options.body instanceof FormData && typeof url === 'string') {
    if (url.includes('127.0.0.1') || url.includes('localhost') || url.includes('10.0.2.2')) {
      const newUrl = url.replace(/http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):\d+/, 'https://demo.ranx24.com');
      console.log(`[UPLOAD REDIRECT] Redirecting local upload to live server: ${newUrl}`);
      return originalFetch(newUrl, options);
    }
  }
  return originalFetch(url, options);
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  const [isNavGuardReady, setIsNavGuardReady] = useState(false);

  useEffect(() => {
    if (isReady && rootNavigationState?.key && targetRoute) {
      router.replace(targetRoute as any);
      setTargetRoute(null);
      // Give a tiny delay for router to finish transition before hiding splash
      setTimeout(() => setIsNavGuardReady(true), 100);
    } else if (isReady && rootNavigationState?.key && !targetRoute) {
      // No redirect needed, we can hide splash immediately
      setIsNavGuardReady(true);
    }
  }, [isReady, rootNavigationState?.key, targetRoute]);

  // 1. Setup notifications ONCE
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
          // If unauthenticated and not already on auth/splash screen
          if (!inAuthGroup) {
            setTargetRoute('/(auth)/login');
          } else if (segments[0] === undefined) {
            // if we are at root index, we should also redirect to login
            setTargetRoute('/(auth)/login');
          }
        }
      } catch (e) {
        console.error('Guard nav error', e);
      }
    };

    guardNav();
  }, [segments, isReady, rootNavigationState?.key]);

  const [splashOpacity] = useState(new Animated.Value(1));
  const [logoScale] = useState(new Animated.Value(0.9));
  const [showSplash, setShowSplash] = useState(true);

  // Pulse animation for logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.9,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isNavGuardReady) {
      SplashScreen.hideAsync();
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }
  }, [isNavGuardReady]);

  const AnimatedSplashView = (
    <Animated.View 
      pointerEvents={showSplash ? "auto" : "none"}
      style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999, elevation: 99999,
        backgroundColor: '#0E9F6E', 
        justifyContent: 'center', alignItems: 'center',
        opacity: splashOpacity 
    }}>
      <StatusBar barStyle="light-content" />
      <Animated.Image
        source={require('../assets/images/logo.png')}
        style={{ width: 220, height: 90, marginBottom: 30, transform: [{ scale: logoScale }] }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{ color: '#ffffff', marginTop: 20, fontWeight: '800', fontSize: 18, letterSpacing: 1 }}>
        KrishiNex Partner
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontSize: 13, fontWeight: '600' }}>
        Authenticating...
      </Text>
    </Animated.View>
  );

  // Do not return early, maintain the same React tree to prevent unmounting AnimatedSplashView
  return (
    <UserProvider>
      <I18nProvider>
        <View style={{ flex: 1 }}>
          {isReady && (
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'none'
              }}
            />
          )}
          {showSplash && AnimatedSplashView}
          <CustomAlert ref={customAlertRef} />
        </View>
      </I18nProvider>
    </UserProvider>
  );
}
