import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function MilkPartnerQuickActionScreen() {
  const router = useRouter();

  useEffect(() => {
    // Fallback if opened directly via deep link
    router.replace('/(milk-partner)/home');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}
