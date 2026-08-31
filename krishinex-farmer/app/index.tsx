import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkAuth() {
            try {
                const token = await AsyncStorage.getItem('userToken');
                setIsAuthenticated(!!token);
            } catch (e) {
                setIsAuthenticated(false);
            }
        }
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return null; // Layout splash screen will be visible
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    } else {
        return <Redirect href="/(auth)/signup" />;
    }
}
