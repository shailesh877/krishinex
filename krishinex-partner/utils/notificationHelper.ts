import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL } from '../constants/api';

// Check if running inside Expo Go (not a standalone/production build)
const isExpoGo = Constants.appOwnership === 'expo';

// Set notification handler only in real builds (not Expo Go)
if (!isExpoGo) {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * Register for Firebase FCM push notifications and return the native device token.
 * This token is saved to the backend and used by Firebase Admin SDK to send pushes.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (isExpoGo) {
        console.log('[NOTIFY] Expo Go detected — push notifications disabled. Use a production/dev build.');
        return null;
    }

    if (!Device.isDevice) {
        console.log('[NOTIFY] Emulator detected — push notifications disabled.');
        return null;
    }

    const Notifications = require('expo-notifications');
    let token: string | null = null;

    try {
        // Step 1: Create Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'KrishiNex Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4b7d0a',
                sound: 'default',
            });
        }

        // Step 2: Request notification permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('[NOTIFY] User denied notification permission.');
            return null;
        }

        // Step 3: Get native FCM token (used directly with Firebase Admin SDK on backend)
        const result = await Notifications.getDevicePushTokenAsync();
        token = result.data;
        console.log('[NOTIFY] ✅ Native FCM Token obtained successfully');

    } catch (e) {
        console.error('[NOTIFY] registerForPushNotificationsAsync error:', e);
        return null;
    }

    return token;
}

/**
 * Save the FCM token to backend so Firebase can send push notifications.
 * IMPORTANT: Call this AFTER saving userToken to AsyncStorage (post-login).
 * This fixes the race condition where token was registered before login completed.
 */
export async function registerTokenWithBackend(token: string): Promise<void> {
    try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) {
            console.log('[NOTIFY] No auth token in storage — skipping backend token registration');
            return;
        }

        const response = await fetch(`${BASE_API_URL}/notifications/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`,
            },
            body: JSON.stringify({ token }),
        });

        if (response.ok) {
            console.log('[NOTIFY] ✅ FCM token registered with backend successfully.');
        } else {
            const errText = await response.text();
            console.error('[NOTIFY] ❌ Backend token registration failed:', response.status, errText);
        }
    } catch (e) {
        console.error('[NOTIFY] registerTokenWithBackend error:', e);
    }
}
