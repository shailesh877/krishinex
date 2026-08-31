// components/ScreenHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backgroundColor = '#FFFFFF',
  titleColor = '#111827',
  subtitleColor = '#6B7280',
  rightComponent,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.header,
        { backgroundColor, paddingTop: insets.top + 10 },
        style,
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="chevron-back" size={20} color={titleColor} />
      </TouchableOpacity>

      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSub, { color: subtitleColor }]}>{subtitle}</Text>
        ) : null}
      </View>

      {rightComponent ? rightComponent : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    elevation: 3,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
