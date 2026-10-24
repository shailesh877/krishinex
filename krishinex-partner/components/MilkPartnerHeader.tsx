import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../context/I18nContext';
import NotificationIcon from './NotificationIcon';
import { getSocket } from '../services/socket';

interface MilkPartnerHeaderProps {
  partnerName?: string;
  assignedRoute?: string;
  onRefresh?: () => void;
  showBack?: boolean;
}

export default function MilkPartnerHeader({
  partnerName,
  assignedRoute,
  onRefresh,
  showBack = false,
}: MilkPartnerHeaderProps) {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const hi = lang === 'hi';

  const [isSocketLive, setIsSocketLive] = useState(false);

  useEffect(() => {
    const s = getSocket();
    if (s) {
      setIsSocketLive(s.connected);
      const onConnect = () => setIsSocketLive(true);
      const onDisconnect = () => setIsSocketLive(false);

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
      };
    }
  }, []);

  const logoTextSource = hi
    ? require('../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../assets/images/Khetify_use_under_the_app-English.png');

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        {/* Left: Back button or Profile Avatar */}
        {showBack ? (
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => router.push('/(milk-partner)/profile' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(partnerName || 'M')[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Center: KrishiNex App Branding Logo */}
        <View style={styles.logoCenterWrap}>
          <Image
            source={logoTextSource}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.subBrandBadge}>
            <Ionicons name="water" size={10} color="#059669" />
            <Text style={styles.subBrandText}>
              {hi ? 'मिल्क पार्टनर सेवा' : 'MILK PARTNER SERVICE'}
            </Text>
          </View>
        </View>

        {/* Right Actions: Notification bell + Language toggle */}
        <View style={styles.rightActions}>
          {/* Notifications Icon */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => router.push('/(milk-partner)/notifications' as any)}
            activeOpacity={0.7}
          >
            <NotificationIcon size={19} color="#334155" />
          </TouchableOpacity>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={toggleLang}
            activeOpacity={0.7}
          >
            <Text style={styles.langBtnText}>{hi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-header Bar: Partner Route & Info */}
      {assignedRoute && (
        <View style={styles.routeBanner}>
          <View style={styles.routeRow}>
            <Ionicons name="bicycle" size={13} color="#047857" />
            <Text style={styles.routeLabel}>{hi ? 'रूट:' : 'Route:'}</Text>
            <Text style={styles.routeValue} numberOfLines={1}>
              {assignedRoute}
            </Text>
          </View>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshMiniBtn}>
              <Ionicons name="refresh" size={14} color="#047857" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarWrap: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  logoCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 145,
    height: 32,
  },
  subBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: -2,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  subBrandText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  routeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    flex: 1,
  },
  refreshMiniBtn: {
    padding: 3,
  },
});
