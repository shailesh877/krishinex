// app/(labour-partner)/home.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}`;

function getWeatherInfo(code: number, isHindi: boolean): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  if (code === 0) return { label: isHindi ? 'साफ आसमान' : 'Clear sky', icon: 'sunny-outline' };
  if (code <= 2) return { label: isHindi ? 'आंशिक बादल' : 'Partly cloudy', icon: 'partly-sunny-outline' };
  if (code <= 3) return { label: isHindi ? 'बादल छाए हैं' : 'Overcast', icon: 'cloud-outline' };
  if (code <= 48) return { label: isHindi ? 'धुंध' : 'Foggy', icon: 'cloud-outline' };
  if (code <= 57) return { label: isHindi ? 'हल्की बूंदाबांदी' : 'Drizzle', icon: 'rainy-outline' };
  if (code <= 65) return { label: isHindi ? 'बारिश' : 'Rain', icon: 'rainy-outline' };
  if (code <= 77) return { label: isHindi ? 'बर्फबारी' : 'Snow', icon: 'snow-outline' };
  if (code <= 82) return { label: isHindi ? 'बौछारें' : 'Rain showers', icon: 'rainy-outline' };
  return { label: isHindi ? 'गरज के साथ बारिश' : 'Thunderstorm', icon: 'thunderstorm-outline' };
}

export default function LabourPartnerHome() {
  const router = useRouter();
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const { profile, refreshUser } = useUser();

  // SWR Cached Fetches
  const { data: statsData, refetch: refetchStats } = useCachedFetch('labour-dashboard-stats', async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No token');
    const res = await fetch(`${API_URL}/labour/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  });

  const lifetimeStats = statsData ? {
    totalRequests: statsData.totalRequests || 0,
    completed: statsData.completed || 0,
  } : { totalRequests: 0, completed: 0 };

  // Weather state
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);

  const [unreadCount, setUnreadCount] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        refetchStats(),
        fetchUnreadCount(),
        fetchWeather(),
      ]);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refetchStats]);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) { }
  };

  const fetchWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const g = geo[0];
          const city = g.city || g.subregion || g.district || g.region || '';
          const region = g.region || '';
          setWeatherCity([city, region].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '));
        }
      } catch (geoErr) {
        console.warn('[Weather] Labour Geocode failed:', geoErr);
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      );
      const contentType = weatherRes.headers.get('content-type') || '';
      if (!weatherRes.ok || !contentType.includes('application/json')) {
        console.warn(`[Weather] API status ${weatherRes.status} (${contentType}), skipping weather parse.`);
        return;
      }
      const weatherData = await weatherRes.json();
      const c = weatherData.current;

      if (c) {
        setWeatherTemp(c.temperature_2m !== undefined ? Math.round(c.temperature_2m) : null);
        setWeatherCode(c.weather_code !== undefined ? c.weather_code : 0);
      }
    } catch (e) {
      console.error('Weather fetch error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // SWR handles stats, context handles profile
      fetchUnreadCount();
      fetchWeather();
    }, [])
  );

  const locationText = weatherCity || profile?.address || (isHindi ? 'आपका बेस: ' : 'Your base: ');
  const userName = profile?.name || (isHindi ? 'लेबर पार्टनर' : 'Labour partner');
  const weatherInfo = getWeatherInfo(weatherCode, isHindi);

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');

  const goProfile = () => {
    router.push('/(labour-partner)/profile-settings');
  };

  const goBookings = () => {
    router.push('/(labour-partner)/bookings');
  };

  const openNotifications = () => {
    router.push('/(labour-partner)/notifications');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ECFDF3" />

      {/* PREMIUM HEADER */}
      <View style={[styles.headerBg, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={[styles.appHeader, { paddingTop: insets.top + 10 }]}>
          {/* LEFT: notifications */}
          <TouchableOpacity
            style={styles.notifBtn}
            activeOpacity={0.8}
            onPress={openNotifications}
          >
            <NotificationIcon size={18} color="#065F46" />
            {unreadCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* CENTER: logo text */}
          <View style={styles.logoWrap}>
            <Image source={logoTextSource} style={styles.logoTextImage} />
          </View>

          <TouchableOpacity
            style={styles.logoIconWrap}
            activeOpacity={0.9}
            onPress={goProfile}
          >
            {profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color="#16A34A" />
          )}
          </TouchableOpacity>
        </View>

        {/* NAME + LOCATION + WEATHER inside green panel */}
        <View style={styles.topInfoCard}>
          <View style={styles.nameRow}>
            <View>
              <Text style={styles.helloText}>
                {isHindi ? 'नमस्ते,' : 'Hello,'}
              </Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <View style={styles.badgeChip}>
              <Ionicons name="hammer-outline" size={13} color="#BBF7D0" />
              <Text style={styles.badgeText}>
                {isHindi ? 'आप खुद मजदूर हैं' : 'You are the worker'}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#A7F3D0" />
            <Text style={styles.locationText}>{locationText}</Text>
          </View>

          <View style={styles.weatherRow}>
            <View style={styles.weatherLeft}>
              <View style={styles.weatherIconWrap}>
                <Ionicons
                  name={weatherInfo.icon}
                  size={16}
                  color="#FBBF24"
                />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.weatherTitle}>
                  {isHindi ? 'आज का मौसम' : 'Today’s weather'}
                </Text>
                <Text style={styles.weatherText}>{weatherInfo.label}</Text>
              </View>
            </View>
            <View style={styles.weatherRight}>
              <Text style={styles.weatherTemp}>{weatherTemp !== null ? `${weatherTemp}°C` : '--'}</Text>
              <Text style={styles.weatherMetaSmall}>
                {isHindi
                  ? 'खेत में काम के लिए अच्छा दिन'
                  : 'Good day for field work'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />}
      >
        {/* BODY TOP: compact name + location strip */}
        <View style={styles.bodyTopStrip}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bodyHello}>
              {isHindi ? 'स्वागत है,' : 'Welcome,'}
            </Text>
            <Text style={styles.bodyName}>{userName}</Text>
          </View>
          <View style={styles.bodyLocationRow}>
            <Ionicons name="location-outline" size={13} color="#2563EB" />
            <Text style={styles.bodyLocationText} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
        </View>

        {/* TOTAL booking cards – labour stats */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'कुल booking रिकॉर्ड' : 'Total booking record'}
        </Text>

        <View style={styles.totalRow}>
          <View
            style={[
              styles.totalCard,
              styles.cardShadow,
              styles.totalApplyBorder,
            ]}
          >
            <View style={styles.totalHeaderRow}>
              <View
                style={[
                  styles.totalIconWrap,
                  { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={18}
                  color="#4F46E5"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>
                  {isHindi
                    ? 'कुल booking आए'
                    : 'Total booking requests received'}
                </Text>
                <Text style={styles.totalSubText}>
                  {isHindi
                    ? 'अब तक जितने खेतों के काम आपके पास आए'
                    : 'All field jobs that have come to you so far'}
                </Text>
              </View>
            </View>

            <View style={styles.totalMiddleRow}>
              <Text style={styles.totalValue}>{lifetimeStats.totalRequests}</Text>
              <View style={[styles.chip, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons
                  name="arrow-up-outline"
                  size={12}
                  color="#1D4ED8"
                />
                <Text style={[styles.chipText, { color: '#1D4ED8' }]}>
                  {isHindi ? 'कुल रिक्वेस्ट' : 'All requests'}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.totalCard,
              styles.cardShadow,
              styles.totalCompleteBorder,
            ]}
          >
            <View style={styles.totalHeaderRow}>
              <View
                style={[
                  styles.totalIconWrap,
                  { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
                ]}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color="#16A34A"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>
                  {isHindi
                    ? 'कुल booking complete'
                    : 'Total bookings completed'}
                </Text>
                <Text style={styles.totalSubText}>
                  {isHindi
                    ? 'जितने काम आपने खुद जाकर पूरे किए'
                    : 'Jobs you personally completed in fields'}
                </Text>
              </View>
            </View>

            <View style={styles.totalMiddleRow}>
              <Text style={styles.totalValue}>{lifetimeStats.completed}</Text>
              <View style={[styles.chip, { backgroundColor: '#BBF7D0' }]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={12}
                  color="#15803D"
                />
                <Text style={[styles.chipText, { color: '#15803D' }]}>
                  {isHindi ? 'पूरा हुआ काम' : 'Completed'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'क्विक actions' : 'Quick actions'}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, styles.cardShadowSoft]}
            activeOpacity={0.9}
            onPress={goProfile}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="person-circle-outline" size={18} color="#16A34A" />
            </View>
            <Text style={styles.actionTitle}>
              {isHindi ? 'मेरा प्रोफाइल' : 'My profile'}
            </Text>
            <Text style={styles.actionSub}>
              {isHindi
                ? 'अपनी दूरी और रेट सेट करें, उसी के हिसाब से काम आएंगे'
                : 'Set your distance & rate, jobs will come as per that'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.cardShadowSoft]}
            activeOpacity={0.9}
            onPress={goBookings}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.actionTitle}>
              {isHindi ? 'मेरे सारे काम' : 'My jobs'}
            </Text>
            <Text style={styles.actionSub}>
              {isHindi
                ? 'नए, accept और complete खेतों का काम देखें'
                : 'See new, accepted & completed field work'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.cardShadowSoft, { marginRight: 0 }]}
            activeOpacity={0.9}
            onPress={() => router.push('/(labour-partner)/wallet')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="wallet-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>
              {isHindi ? 'वॉलेट / कमाई' : 'Wallet'}
            </Text>
            <Text style={styles.actionSub}>
              {isHindi
                ? 'अपनी कमाई और हिसाब देखें'
                : 'View your earnings and history'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerBg: {
    backgroundColor: '#ECFDF3',
    paddingBottom: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#00000022',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextImage: {
    width: 150,
    height: 30,
    resizeMode: 'contain',
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E5F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { width: 28, height: 28, resizeMode: 'contain' },

  topInfoCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#16A34A',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helloText: {
    fontSize: 12,
    color: '#BBF7D0',
  },
  nameText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ECFDF5',
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#14532D',
  },
  badgeText: {
    fontSize: 10,
    color: '#BBF7D0',
    marginLeft: 4,
    fontWeight: '600',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#D1FAE5',
    marginLeft: 4,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherTitle: { fontSize: 12, fontWeight: '600', color: '#ECFEFF' },
  weatherText: { fontSize: 11, color: '#E5E7EB', marginTop: 2 },
  weatherRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FEFCE8',
  },
  weatherMetaSmall: { fontSize: 11, color: '#BBF7D0' },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  bodyTopStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bodyHello: {
    fontSize: 12,
    color: '#6B7280',
  },
  bodyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bodyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
  },
  bodyLocationText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  totalLabel: { fontSize: 12, fontWeight: '600', color: '#111827' },
  totalSubText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  totalMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  totalApplyBorder: { borderColor: '#C7D2FE' },
  totalCompleteBorder: { borderColor: '#BBF7D0' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, marginLeft: 2 },

  cardShadow: {
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  cardShadowSoft: {
    shadowColor: '#0000001F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },

  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  actionSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
});
