import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
// import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, registerTokenWithBackend } from '../utils/notificationHelper';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
import { useColorScheme } from '@/hooks/use-color-scheme';
import { I18nProvider } from '@/context/I18nContext';
import { CartProvider } from '@/context/CartContext';
import { View, ActivityIndicator, Image, Text, DeviceEventEmitter } from 'react-native';
import { CustomAlert, customAlertRef } from '@/components/CustomAlert';


import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    console.log('[FONT DEBUG] fontsLoaded:', fontsLoaded, 'fontError:', fontError);
  }, [fontsLoaded, fontError]);
  
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Set up global 401 handler
    const { setOnUnauthorized } = require('../services/api');
    setOnUnauthorized(() => {
      console.warn('[AUTH] 401 Unauthorized detected - auto-logging out');
      handleLogout();
    });

    checkAuth();

    const isExpoGo = require('expo-constants').default.appOwnership === 'expo';
    let notificationListener: any;
    let responseListener: any;

    if (!isExpoGo) {
      setupNotifications();
      const Notifications = require('expo-notifications');

      // Foreground listener
      notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('[NOTIFY] Received in foreground:', notification);
        DeviceEventEmitter.emit('pushNotificationReceived', notification);
      });

      // Interaction listener (user clicks)
      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const { data } = response.notification.request.content;
        console.log('[NOTIFY] User tapped:', data);
        
        if (data?.type === 'order' || data?.type === 'status') {
          if (data?.refId) {
            router.push({ pathname: '/track-order', params: { id: data.refId } } as any);
          } else {
            router.push('/(tabs)/orders' as any);
          }
        } else if (data?.type === 'soil_test') {
          router.push('/soil-reports' as any);
        } else if (data?.type === 'assigned') {
          router.push('/my-bookings' as any);
        } else if (data?.type === 'payment') {
          router.push('/wallet' as any);
        }
      });
    } else {
      console.log('[NOTIFY] Notifications disabled in Expo Go. Use a development build for full testing.');
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await AsyncStorage.setItem('pushToken', token);
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          await registerTokenWithBackend(token);
        }
      }
    } catch (e) {
      console.error('Setup notifications error', e);
    }
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsAuthenticated(!!token);
    } catch (e) {
      console.error('Check auth error', e);
      setIsAuthenticated(false);
    } finally {
      setIsReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch (e) {} // Ignore if already hidden
    }
  };

  useEffect(() => {
    if (!isReady || (!fontsLoaded && !fontError)) return;
    
    const verifyAndNavigate = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const isAuth = !!token;
        setIsAuthenticated(isAuth);

        const inAuthGroup = String(segments[0]) === '(auth)';
        
        // Add delay to let Stack mount completely before navigating
        setTimeout(() => {
          if (isAuth) {
            if (inAuthGroup || (segments as string[]).length === 0) {
              router.replace('/(tabs)' as any);
            }
          } else {
            // Not authenticated
            if (!inAuthGroup || (segments as string[]).length === 0) {
              router.replace('/(auth)/signup' as any);
            }
          }
        }, 500);
      } catch (e) {
        console.error('Verify auth error', e);
      }
    };

    verifyAndNavigate();
  }, [isReady, segments]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      router.replace('/(auth)/signup' as any);
    } catch (e) {
      console.error('Logout error', e);
      router.replace('/(auth)/signup' as any);
    }
  };

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="dark" />
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
          {/* Logo container with scale to compensate for image padding */}
          <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/logo.png')}
              style={{ width: '80%', height: '80%' }} // Tight cropped image needs less scaling
              resizeMode="contain"
            />
          </View>
          
          <Text style={{ 
            fontSize: 36, 
            fontWeight: '900', 
            color: '#4b7d0a', 
            letterSpacing: 1,
            marginTop: -10, // Pull text closer to logo
            fontFamily: 'System'
          }}>
            KrishiNex
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: '#9CA3AF', 
            marginTop: 4, 
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontWeight: '700'
          }}>
            Digital Agriculture
          </Text>
        </View>

        <View style={{ position: 'absolute', bottom: 100, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#4b7d0a" />
          <Text style={{ fontSize: 13, color: '#4B5563', marginTop: 12, fontWeight: '500' }}>
            Loading farming services...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/otp" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
      <CustomAlert ref={customAlertRef} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <I18nProvider>
      <CartProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutContent />
        </ThemeProvider>
      </CartProvider>
    </I18nProvider>
  );
}
