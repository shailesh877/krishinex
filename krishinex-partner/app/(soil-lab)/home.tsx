// app/(soil-lab)/home.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import * as Location from 'expo-location';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}`;

export default function SoilLabHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang, toggleLang } = useI18n();
  const isHindi = lang === 'hi';

  const { profile, refreshUser } = useUser();
  const labName = profile?.businessName || profile?.name || 'Soil Lab';

  // SWR Cached Fetches
  const { data: statsData, refetch: refetchStats } = useCachedFetch('soil-dashboard-stats', async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No token');
    const res = await fetch(`${API_URL}/soil/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  });

  const stats = statsData || {
    lifetime: { totalRequests: 0, totalCompleted: 0 },
    today: { new: 0, accepted: 0, inProgress: 0, completed: 0 }
  };
  const [unreadCount, setUnreadCount] = React.useState(0);
  const loading = false;

  // Weather state
  const [weatherCity, setWeatherCity] = React.useState('');
  const [weatherTemp, setWeatherTemp] = React.useState<number | null>(null);
  const [weatherCode, setWeatherCode] = React.useState<number>(0);
  const [weatherHumidity, setWeatherHumidity] = React.useState<number | null>(null);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      // SWR handles stats and user context handles profile.
      fetchUnreadCount();
      fetchWeather();
    }, [])
  );
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
        console.warn('[Weather] Soil Lab Geocode failed:', geoErr);
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&wind_speed_unit=kmh&timezone=auto`
      );
      const contentType = weatherRes.headers.get('content-type') || '';
      if (!weatherRes.ok || !contentType.includes('application/json')) {
        console.warn(`[Weather] API status ${weatherRes.status} (${contentType}), skipping weather parse.`);
        return;
      }
      const weatherData = await weatherRes.json();
      const c = weatherData?.current;
      // Prob is not used in the UI here yet, but the fetch is now correct


      if (c) {
        setWeatherTemp(c.temperature_2m !== undefined ? Math.round(c.temperature_2m) : null);
        setWeatherHumidity(c.relative_humidity_2m !== undefined ? c.relative_humidity_2m : null);
        setWeatherCode(c.weather_code !== undefined ? c.weather_code : 0);
      }
    } catch (e) {
      console.error('Soil Lab Weather fetch error:', e);
    }
  };

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  const DUMMY = [{ id: '1' }];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={[styles.appHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.logoIconWrap} onPress={() => router.push('./profile')}>
          {profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#16A34A" />
          )}
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('./notifications')}>
          <NotificationIcon size={20} color="#4B5563" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={DUMMY}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} tintColor="#2563EB" />}
        ListHeaderComponent={
          <>
            {/* LAB NAME + LOCATION + LANGUAGE */}
            <View style={styles.topInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labName}>
                  {labName || (isHindi ? 'आपकी मिट्टी जांच लैब' : 'Your soil testing lab')}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color="#2563EB"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {weatherCity || (isHindi ? 'पता उपलब्ध नहीं' : 'Location not set')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.langButton} onPress={toggleLang}>
                <Ionicons
                  name="language-outline"
                  size={16}
                  color="#0369A1"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.langText}>
                  {isHindi ? 'English' : 'हिन्दी'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* WEATHER STRIP */}
            <View style={styles.weatherStrip}>
              <View style={styles.weatherLeft}>
                <View style={styles.weatherIconWrap}>
                  <Ionicons name="partly-sunny-outline" size={18} color="#F59E0B" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.weatherTitle}>
                    {isHindi ? 'आज का मौसम' : 'Today’s weather'}
                  </Text>
                  <Text style={styles.weatherText}>
                    {isHindi
                      ? 'हल्की धूप और बादल, sample लेने के लिए अनुकूल दिन'
                      : 'Mild sun and clouds, good day for soil sampling'}
                  </Text>
                </View>
              </View>
              <View style={styles.weatherRight}>
                <Text style={styles.weatherTemp}>{weatherTemp !== null ? `${weatherTemp}°` : '--°'}</Text>
                <Text style={styles.weatherMetaSmall}>
                  {weatherHumidity !== null ? (isHindi ? `${weatherHumidity}% नमी` : `${weatherHumidity}% humidity`) : (isHindi ? '-- नमी' : '-- humidity')}
                </Text>
              </View>
            </View>

            {/* TOTAL – 2 COLORFUL CARDS */}
            <Text style={styles.sectionTitle}>
              {isHindi
                ? 'कुल मिट्टी जांच (अब तक)'
                : 'Total soil testing (overall)'}
            </Text>

            <View style={styles.totalRow}>
              {/* Total apply */}
              <View style={[styles.totalCard, styles.cardShadow, styles.totalApplyBorder]}>
                <View style={styles.totalHeaderRow}>
                  <View
                    style={[
                      styles.totalIconWrap,
                      { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#4F46E5"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.totalLabel}>
                      {isHindi
                        ? 'कुल apply for testing'
                        : 'Total apply for testing'}
                    </Text>
                    <Text style={styles.totalSubText}>
                      {isHindi
                        ? 'अब तक किसानों की सभी मिट्टी जांच रिक्वेस्ट'
                        : 'All soil test requests raised till now'}
                    </Text>
                  </View>
                </View>

                <View style={styles.totalMiddleRow}>
                  <Text style={styles.totalValue}>{stats.lifetime.totalRequests}</Text>
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

              {/* Total complete */}
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
                      name="checkmark-circle-outline"
                      size={18}
                      color="#16A34A"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.totalLabel}>
                      {isHindi
                        ? 'कुल complete testing'
                        : 'Total complete testing'}
                    </Text>
                    <Text style={styles.totalSubText}>
                      {isHindi
                        ? 'जिनकी रिपोर्ट किसान तक पहुंच चुकी है'
                        : 'Reports fully generated and shared'}
                    </Text>
                  </View>
                </View>

                <View style={styles.totalMiddleRow}>
                  <Text style={styles.totalValue}>{stats.lifetime.totalCompleted}</Text>
                  <View style={[styles.chip, { backgroundColor: '#BBF7D0' }]}>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={12}
                      color="#15803D"
                    />
                    <Text style={[styles.chipText, { color: '#15803D' }]}>
                      {isHindi ? 'पूरी जांच' : 'Completed'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* TODAY – 4 COLORFUL CARDS */}
            <Text style={styles.sectionTitle}>
              {isHindi ? 'आज का स्टेटस' : 'Today’s status'}
            </Text>

            <View style={styles.statsGrid}>
              {/* Today new apply */}
              <View style={[styles.statCard, styles.cardShadow, styles.borderBlue]}>
                <View style={styles.statHeader}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9' },
                    ]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#0284C7"
                    />
                  </View>
                  <Text style={styles.statLabel}>
                    {isHindi ? 'आज new apply' : 'Today new apply'}
                  </Text>
                </View>
                <Text style={styles.statValue}>{stats.today.new}</Text>
                <Text style={styles.statHint}>
                  {isHindi
                    ? 'आज जितनी नई मिट्टी जांच रिक्वेस्ट farmers ने डाली'
                    : 'New soil test requests created by farmers today'}
                </Text>
              </View>

              {/* Today accepted – sample pending */}
              <View style={[styles.statCard, styles.cardShadow, styles.borderAmber]}>
                <View style={styles.statHeader}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
                    ]}
                  >
                    <Ionicons
                      name="thumbs-up-outline"
                      size={18}
                      color="#D97706"
                    />
                  </View>
                  <Text style={styles.statLabel}>
                    {isHindi
                      ? 'आज accepted (sample pending)'
                      : 'Today accepted (sample pending)'}
                  </Text>
                </View>
                <Text style={styles.statValue}>{stats.today.accepted}</Text>
                <Text style={styles.statHint}>
                  {isHindi
                    ? 'आज allot हो चुके, लेकिन sample अभी lab तक नहीं पहुंचा'
                    : 'Accepted today, sample not yet received in lab'}
                </Text>
              </View>

              {/* Today in progress */}
              <View style={[styles.statCard, styles.cardShadow, styles.borderPurple]}>
                <View style={styles.statHeader}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: '#F5F3FF', borderColor: '#8B5CF6' },
                    ]}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={18}
                      color="#7C3AED"
                    />
                  </View>
                  <Text style={styles.statLabel}>
                    {isHindi ? 'आज in progress' : 'Today in progress'}
                  </Text>
                </View>
                <Text style={styles.statValue}>{stats.today.inProgress}</Text>
                <Text style={styles.statHint}>
                  {isHindi
                    ? 'जिनका sample lab में है और आज testing चल रही है'
                    : 'Samples currently under testing in lab today'}
                </Text>
              </View>

              {/* Today completed */}
              <View style={[styles.statCard, styles.cardShadow, styles.borderGreen]}>
                <View style={styles.statHeader}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: '#ECFDF3', borderColor: '#22C55E' },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color="#16A34A"
                    />
                  </View>
                  <Text style={styles.statLabel}>
                    {isHindi ? 'आज complete testing' : 'Today complete testing'}
                  </Text>
                </View>
                <Text style={styles.statValue}>{stats.today.completed}</Text>
                <Text style={styles.statHint}>
                  {isHindi
                    ? 'आज जिनकी testing और advisory पूरी तरह final हो गई'
                    : 'Tests whose advisory is fully finalised today'}
                </Text>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <Text style={styles.sectionTitle}>
              {isHindi ? 'क्विक एक्शन' : 'Quick Actions'}
            </Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionCard, styles.cardShadow, { backgroundColor: '#F97316' }]}
                activeOpacity={0.9}
                onPress={() => router.push('/(soil-lab)/wallet')}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>
                  {isHindi ? 'वॉलेट / कमाई' : 'Wallet / Earnings'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, styles.cardShadow, { backgroundColor: '#2563EB' }]}
                activeOpacity={0.9}
                onPress={() => router.push('/(soil-lab)/requests')}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name="list-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>
                  {isHindi ? 'मिट्टी जांच रिक्वेस्ट' : 'Lab Requests'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
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
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: { paddingHorizontal: 16, paddingVertical: 10 },

  topInfoRow: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: { fontSize: 13, color: '#4B5563', flexShrink: 1 },

  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    marginLeft: 8,
  },
  langText: { fontSize: 13, fontWeight: '600', color: '#0369A1' },

  /* WEATHER STRIP */
  weatherStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherTitle: { fontSize: 12, fontWeight: '600', color: '#111827' },
  weatherText: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  weatherRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  weatherTemp: { fontSize: 18, fontWeight: '700', color: '#111827' },
  weatherMetaSmall: { fontSize: 11, color: '#6B7280' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },

  // TOTAL CARDS
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
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
    fontWeight: '700',
    color: '#111827',
  },

  totalApplyBorder: {
    borderColor: '#A5B4FC',
  },
  totalCompleteBorder: {
    borderColor: '#86EFAC',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, marginLeft: 2 },

  // TODAY GRID CARDS
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  statLabel: { fontSize: 12, color: '#111827', flexShrink: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statHint: { fontSize: 11, color: '#6B7280', marginTop: 3 },

  borderBlue: { borderColor: '#93C5FD' },
  borderAmber: { borderColor: '#FCD34D' },
  borderPurple: { borderColor: '#C4B5FD' },
  borderGreen: { borderColor: '#86EFAC' },

  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },

  // Quick Actions Styles
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
