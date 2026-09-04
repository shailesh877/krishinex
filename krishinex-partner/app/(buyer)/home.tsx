import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/user`;

// WMO weather code → label and icon
function getWeatherInfo(code: number, isHindi: boolean): { label: string; icon: keyof typeof import('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json') } {
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

export default function BuyerHome() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const { profile, refreshUser } = useUser();
  const userName = profile?.name || '';
  const userAddress = profile?.address || '';
  const avatarUri = profile?.avatarUri || null;

  // Weather state
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [weatherHumidity, setWeatherHumidity] = useState<number | null>(null);
  const [weatherRain, setWeatherRain] = useState<number | null>(null);
  const [weatherWind, setWeatherWind] = useState<number | null>(null);
  const [weatherFeels, setWeatherFeels] = useState<number | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // SWR Cached Fetches
  const { data: statsData, refetch: refetchStats } = useCachedFetch('buyer-dashboard-stats', async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No token');
    const res = await fetch(`${BASE_API_URL}/orders/my/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  });

  const orderStats = statsData || { totalOrders: 0, totalAmount: 0 };
  const [unreadCount, setUnreadCount] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        fetchWeather(),
        refetchStats(),
        fetchUnreadCount(),
      ]);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refetchStats]);

  useFocusEffect(
    useCallback(() => {
      // SWR handles stats, UserContext handles profile
      fetchUnreadCount();
      fetchWeather();
    }, [])
  );

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${BASE_API_URL}/notifications/unread-count`, {
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
      if (status !== 'granted') {
        setWeatherLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      try {
        // Reverse geocode for city name
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const g = geo[0];
          const city = g.city || g.subregion || g.region || '';
          const region = g.region || '';
          setWeatherCity([city, region].filter(Boolean).join(', '));
        }
      } catch (geoErr) {
        console.warn('[Weather] Buyer Geocode failed:', geoErr);
      }

      // Open-Meteo — free, no API key needed
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`
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
        setWeatherFeels(c.apparent_temperature !== undefined ? Math.round(c.apparent_temperature) : null);
        setWeatherHumidity(c.relative_humidity_2m !== undefined ? c.relative_humidity_2m : null);
        setWeatherRain(c.precipitation_probability !== undefined ? c.precipitation_probability : null);
        setWeatherWind(c.wind_speed_10m !== undefined ? Math.round(c.wind_speed_10m) : null);
        setWeatherCode(c.weather_code !== undefined ? c.weather_code : 0);
      }
    } catch (e) {
      console.error('Weather fetch error:', e);
    } finally {
      setWeatherLoading(false);
    }
  };

  const displayName = userName
    ? (isHindi ? `${userName} जी` : userName)
    : (isHindi ? 'किसान जी' : 'Farmer');

  const displayAddress = userAddress || (isHindi ? 'पता उपलब्ध नहीं' : 'Location not set');
  const weatherInfo = getWeatherInfo(weatherCode, isHindi);

  const t = {
    hi: {
      hello: 'नमस्ते,',
      translate: 'English',
      weatherUpdated: 'लाइव मौसम',
      humidity: 'नमी',
      rain: 'बारिश',
      wind: 'हवा',
      feelsLike: 'महसूस',
      overview: 'ओवरव्यू',
      totalAmountTitle: 'कुल खरीदी राशि',
      totalAmountSub: 'अब तक जितना खरीदा',
      totalOrdersTitle: 'कुल खरीदी ऑर्डर',
      totalOrdersSub: 'अब तक कितने ऑर्डर',
      actionsTitle: 'क्विक एक्शन',
      walletBtn: 'वॉलेट देखें',
      buyBtn: 'नयी खरीद करें',
      assignOrdersBtn: 'असाइन ऑर्डर',
      premiumAssignSubtitle: 'जो ऑर्डर आपको असाइन किए गए हैं',
      loadingWeather: 'मौसम लोड हो रहा है...',
    },
    en: {
      hello: 'Hello,',
      translate: 'हिन्दी',
      weatherUpdated: 'Live weather',
      humidity: 'Humidity',
      rain: 'Rain',
      wind: 'Wind',
      feelsLike: 'Feels like',
      overview: 'Overview',
      totalAmountTitle: 'Total purchase amount',
      totalAmountSub: 'Amount of all purchases',
      totalOrdersTitle: 'Total purchase orders',
      totalOrdersSub: 'Number of orders placed',
      actionsTitle: 'Quick actions',
      walletBtn: 'View wallet',
      buyBtn: 'Place new order',
      assignOrdersBtn: 'Assigned orders',
      premiumAssignSubtitle: 'Orders assigned to you',
      loadingWeather: 'Loading weather...',
    },
  }[lang];

  const stats = {
    totalPurchaseAmount: '₹ 1,25,000',
    totalPurchaseOrders: 32,
  };

  const logoSource =
    lang === 'hi'
      ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
      : require('../../assets/images/Khetify_use_under_the_app-English.png');

  const goProfile = () => router.push('/(buyer)/profile');
  const goAssignedOrders = () => router.push('/(buyer)/assigned-orders');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.avatarWrap} onPress={goProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#16A34A" />
          )}
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Image source={logoSource} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <TouchableOpacity
          style={styles.circleIcon}
          onPress={() => router.push('/(buyer)/notifications' as any)}
        >
          <NotificationIcon size={18} color="#4B5563" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.headerBorder} />

      {/* NAME + LOCATION + LANGUAGE */}
      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.helloText}>
            {t.hello} <Text style={styles.nameText}>{displayName}</Text>
          </Text>
          <View style={styles.villageRow}>
            <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.villageText}>{displayAddress}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.translateBtn} onPress={toggleLang}>
          <Ionicons name="language-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.translateText}>{t.translate}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />}
      >
        {/* WEATHER CARD */}
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherCard}
        >
          <View style={styles.weatherLeft}>
            <View style={styles.weatherLocationRow}>
              <Ionicons name="pin-outline" size={16} color="#BFDBFE" />
              <Text style={styles.weatherPlace}>
                {weatherCity || displayAddress}
              </Text>
            </View>
            <Text style={styles.weatherUpdated}>{t.weatherUpdated}</Text>

            <View style={{ marginTop: 12 }}>
              {weatherLoading ? (
                <Text style={[styles.weatherTemp, { fontSize: 16 }]}>{t.loadingWeather}</Text>
              ) : (
                <>
                  <Text style={styles.weatherTemp}>
                    {weatherTemp !== null ? `${weatherTemp}°C` : '--°'}
                  </Text>
                  <Text style={styles.weatherCond}>{weatherInfo.label}</Text>
                  <Text style={styles.feelsLike}>
                    {t.feelsLike} {weatherFeels !== null ? `${weatherFeels}°C` : '--'}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.weatherRight}>
            <View style={styles.sunCircle}>
              <Ionicons
                name={weatherInfo.icon as any}
                size={30}
                color="#FACC15"
              />
            </View>

            <View style={styles.weatherMetaRow}>
              <View style={styles.metaCol}>
                <Ionicons name="water-outline" size={16} color="#DBEAFE" />
                <Text style={styles.metaValue}>
                  {weatherHumidity !== null ? `${weatherHumidity}%` : '--'}
                </Text>
                <Text style={styles.metaLabel}>{t.humidity}</Text>
              </View>
              <View style={styles.metaCol}>
                <Ionicons name="rainy-outline" size={16} color="#DBEAFE" />
                <Text style={styles.metaValue}>
                  {weatherRain !== null ? `${weatherRain}%` : '--'}
                </Text>
                <Text style={styles.metaLabel}>{t.rain}</Text>
              </View>
              <View style={styles.metaCol}>
                <Ionicons name="navigate-outline" size={16} color="#DBEAFE" />
                <Text style={styles.metaValue}>
                  {weatherWind !== null ? `${weatherWind} km/h` : '--'}
                </Text>
                <Text style={styles.metaLabel}>{t.wind}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* OVERVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.overview}</Text>
        </View>

        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, styles.cardShadow, { backgroundColor: '#EEF2FF' }]}>
            <View style={styles.overviewIconWrap}>
              <Ionicons name="cash-outline" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.overviewTitle}>{t.totalAmountTitle}</Text>
            <Text style={styles.overviewSub}>{t.totalAmountSub}</Text>
            <Text style={styles.overviewValue}>
              {orderStats.totalAmount > 0
                ? `₹ ${orderStats.totalAmount.toLocaleString('en-IN')}`
                : (isHindi ? '₹ 0' : '₹ 0')}
            </Text>
          </View>

          <View style={[styles.overviewCard, styles.cardShadow, { backgroundColor: '#ECFDF5' }]}>
            <View style={styles.overviewIconWrap}>
              <Ionicons name="cart-outline" size={20} color="#047857" />
            </View>
            <Text style={styles.overviewTitle}>{t.totalOrdersTitle}</Text>
            <Text style={styles.overviewSub}>{t.totalOrdersSub}</Text>
            <Text style={styles.overviewValue}>
              {orderStats.totalOrders} {isHindi ? 'ऑर्डर' : 'orders'}
            </Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.actionsTitle}</Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, styles.cardShadow, { backgroundColor: '#F97316' }]}
            activeOpacity={0.9}
            onPress={() => router.push('/(buyer)/wallet')}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="wallet-outline" size={20} color="#FED7AA" />
            </View>
            <Text style={styles.actionTitle}>{t.walletBtn}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.cardShadow, { backgroundColor: '#FBBF24' }]}
            activeOpacity={0.9}
            onPress={goAssignedOrders}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="list-circle-outline" size={20} color="#FEF3C7" />
            </View>
            <Text style={styles.actionTitle}>{t.assignOrdersBtn}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLogo: {
    height: 32,
  },
  circleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBorder: {
    height: 2,
    backgroundColor: '#87D528',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  helloText: {
    fontSize: 16,
    color: '#111827',
  },
  nameText: {
    fontWeight: '800',
  },
  villageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  villageText: {
    fontSize: 13,
    color: '#6B7280',
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  translateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 18,
  },

  weatherCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
  },
  weatherLeft: { flex: 1 },
  weatherLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherPlace: {
    fontSize: 13,
    color: '#BFDBFE',
    fontWeight: '700',
    marginLeft: 4,
    flex: 1,
  },
  weatherUpdated: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 2,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  weatherCond: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  feelsLike: {
    fontSize: 11,
    color: '#E5E7EB',
    marginTop: 2,
  },
  weatherRight: {
    width: 130,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sunCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  metaCol: { alignItems: 'center' },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 10,
    color: '#DBEAFE',
    marginTop: 2,
  },

  sectionHeader: { marginHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  overviewRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
  },
  overviewIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  overviewSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 10,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  actionsGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  premiumAssignCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  premiumSub: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 4,
  },
  premiumIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});

