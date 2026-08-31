// app/(equipment)/home.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import * as Location from 'expo-location';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/user`;

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

type QuickAction = {
  id: string;
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: any;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: '1',
    titleEn: 'Add machine',
    titleHi: 'मशीन जोड़ें',
    subtitleEn: 'Add new equipment for rent',
    subtitleHi: 'नई मशीन किराये पर जोड़ें',
    icon: 'add-circle-outline',
    color: '#22C55E',
    route: '/(equipment)/add-machine'
  },
  {
    id: '2',
    titleEn: 'View machines',
    titleHi: 'मशीन देखें',
    subtitleEn: 'See all your machines',
    subtitleHi: 'आपकी सारी मशीनें देखें',
    icon: 'construct-outline',
    color: '#3B82F6',
    route: '/(equipment)/machines'
  },
  {
    id: '3',
    titleEn: 'Wallet & Earnings',
    titleHi: 'वॉलेट और कमाई',
    subtitleEn: 'View your earnings',
    subtitleHi: 'अपनी कमाई देखें',
    icon: 'wallet-outline',
    color: '#F59E0B',
    route: '/(equipment)/wallet'
  },
];

export default function EquipmentHome() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const [userName, setUserName] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string>('approved');

  // Stats logic
  const [totalBookings, setTotalBookings] = useState(0);
  const [todayBookings, setTodayBookings] = useState(0);

  // Weather state
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [weatherHumidity, setWeatherHumidity] = useState<number | null>(null);
  const [weatherRain, setWeatherRain] = useState<number | null>(null);
  const [weatherWind, setWeatherWind] = useState<number | null>(null);
  const [weatherFeels, setWeatherFeels] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadUser(),
        fetchUnreadCount(),
        fetchWeather(),
        fetchStats(),
      ]);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  useFocusEffect(
    useCallback(() => {
      loadUser();
      fetchUnreadCount();
      fetchWeather();
      fetchStats();
    }, [])
  );

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.address) setUserAddress(parsed.address);
      }
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name || '');
        setUserAddress(data.address || '');
        if (data.profilePhotoUrl) {
          const pfp = data.profilePhotoUrl.startsWith('http')
            ? data.profilePhotoUrl
            : `${BASE_URL}/${data.profilePhotoUrl.replace(/\\/g, '/')}`;
          setAvatarUri(pfp);
        }
        if (data.status) {
          setProfileStatus(data.status);
        }
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching user for home:', error);
    }
  };

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
    } catch (error) { }
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL.replace('/user', '/rentals')}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTotalBookings(data.totalBookings || 0);
        setTodayBookings(data.todayBookings || 0);
      }
    } catch (error) {
      console.error('Error fetching equipment stats:', error);
    }
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
        console.warn('[Weather] Equipment Geocode failed:', geoErr);
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
      const c = weatherData.current;
      const prob = weatherData.hourly?.precipitation_probability?.[0] || 0;


      if (c) {
        setWeatherTemp(c.temperature_2m !== undefined ? Math.round(c.temperature_2m) : null);
        setWeatherFeels(c.apparent_temperature !== undefined ? Math.round(c.apparent_temperature) : null);
        setWeatherHumidity(c.relative_humidity_2m !== undefined ? c.relative_humidity_2m : null);
        setWeatherRain(prob);
        setWeatherWind(c.wind_speed_10m !== undefined ? Math.round(c.wind_speed_10m) : null);
        setWeatherCode(c.weather_code !== undefined ? c.weather_code : 0);
      }
    } catch (e) {
      console.error('Weather fetch error:', e);
    }
  };

  const displayName = userName
    ? (isHindi ? `${userName} जी` : userName)
    : (isHindi ? 'पार्टनर जी' : 'Partner');

  const displayAddress = weatherCity || userAddress || (isHindi ? 'पता उपलब्ध नहीं' : 'Location not set');
  const weatherInfo = getWeatherInfo(weatherCode, isHindi);

  const t = {
    hi: {
      hello: 'नमस्ते,',
      hint: 'आज की सारी बुकिंग और मशीनों का overview यहीं से देखें.',
      weatherUpdated: 'अभी अपडेट किया गया',
      humidity: 'नमी',
      rain: 'बारिश',
      wind: 'हवा',
      feelsLike: 'महसूस',
      weatherAdvice: 'आज field काम के लिए सही मौसम है',
      overview: 'ओवरव्यू',
      allBookings: 'कुल बुकिंग',
      allBookingsHint: 'अब तक की सभी बुकिंग',
      todayBookings: 'आज की बुकिंग',
      todayBookingsHint: 'सिर्फ आज की बुकिंग',
      quickActions: 'क्विक एक्शन'
    },
    en: {
      hello: 'Hello,',
      hint: 'View all bookings and machines for today from one place.',
      weatherUpdated: 'Updated just now',
      humidity: 'Humidity',
      rain: 'Rain',
      wind: 'Wind',
      feelsLike: 'Feels like',
      weatherAdvice: 'Good weather for field work',
      overview: 'Overview',
      allBookings: 'All bookings',
      allBookingsHint: 'Till date',
      todayBookings: 'Today bookings',
      todayBookingsHint: 'For today',
      quickActions: 'Quick actions'
    }
  }[lang];

  const handleQuickPress = (item: QuickAction) => {
    if (item.id === '1' && profileStatus !== 'approved') {
       showAlert(
         isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
         isHindi 
           ? 'आपकी प्रोफाइल अभी वेरिफाय नहीं हुई है। आप अभी आइटम नहीं जोड़ सकते।' 
           : 'Your profile is not verified yet. You cannot add items.'
       );
       return;
    }
    router.push(item.route);
  };

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickCard, { backgroundColor: item.color }]}
      onPress={() => handleQuickPress(item)}
    >
      <Ionicons name={item.icon} size={22} color="#FFFFFF" />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={styles.quickTitle}>
          {isHindi ? item.titleHi : item.titleEn}
        </Text>
        <Text style={styles.quickSub}>
          {isHindi ? item.subtitleHi : item.subtitleEn}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.logoIconWrap} onPress={() => router.push('/(equipment)/profile' as any)}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Image source={logoIconSource} style={styles.logoIcon} />
          )}
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>

        {/* Right: notification bell */}
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => router.push('/(equipment)/notifications' as any)}
        >
          <Ionicons name="notifications-outline" size={20} color="#4B5563" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <FlatList
        data={QUICK_ACTIONS}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} tintColor="#2563EB" />}
        ListHeaderComponent={
          <>
            {/* Greeting + language toggle */}
            <View style={styles.greetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetText} numberOfLines={1}>
                  {t.hello} {displayName}
                </Text>
                <Text style={styles.greetSub} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} /> {displayAddress}
                </Text>
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

            <Text style={styles.smallHint}>
              {t.hint}
            </Text>

            {/* Weather */}
            <View style={styles.weatherCard}>
              <View style={styles.weatherHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weatherPlace} numberOfLines={1}>
                    {displayAddress}
                  </Text>
                  <Text style={styles.weatherUpdated}>
                    {t.weatherUpdated}
                  </Text>
                </View>
                <Ionicons name={weatherInfo.icon} size={28} color="#FACC15" />
              </View>

              <View style={styles.weatherMainRow}>
                <Text style={styles.weatherTemp}>{weatherTemp !== null ? weatherTemp : '--'}°</Text>
                <View>
                  <Text style={styles.weatherCondition}>
                    {weatherInfo.label}
                  </Text>
                  <Text style={styles.weatherFeels}>
                    {t.feelsLike} {weatherFeels !== null ? weatherFeels : '--'}°
                  </Text>
                </View>
              </View>

              <View style={styles.weatherMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="water-outline" size={18} color="#DBEAFE" />
                  <Text style={styles.metaLabel}>{t.humidity}</Text>
                  <Text style={styles.metaValue}>{weatherHumidity !== null ? weatherHumidity : '--'}%</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="umbrella-outline" size={18} color="#DBEAFE" />
                  <Text style={styles.metaLabel}>{t.rain}</Text>
                  <Text style={styles.metaValue}>{weatherRain !== null ? weatherRain : '--'}%</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="leaf-outline" size={18} color="#DBEAFE" />
                  <Text style={styles.metaLabel}>{t.wind}</Text>
                  <Text style={styles.metaValue}>{weatherWind !== null ? weatherWind : '--'} km/h</Text>
                </View>
              </View>

              <View style={styles.weatherChipsRow}>
                <View style={styles.weatherChip}>
                  <Ionicons name="sunny-outline" size={14} color="#FDE68A" />
                  <Text style={styles.weatherChipText}>
                    {t.weatherAdvice}
                  </Text>
                </View>
              </View>
            </View>

            {/* Overview */}
            <Text style={styles.sectionTitle}>{t.overview}</Text>

            <View style={styles.overviewRow}>
              <View style={[styles.overviewCard, { backgroundColor: '#EEF2FF' }]}>
                <View style={styles.overviewTop}>
                  <Text style={styles.overviewLabel}>{t.allBookings}</Text>
                  <Ionicons name="bar-chart-outline" size={20} color="#4F46E5" />
                </View>
                <Text style={styles.overviewValue}>{totalBookings}</Text>
                <Text style={styles.overviewHint}>{t.allBookingsHint}</Text>
              </View>

              <View style={[styles.overviewCard, { backgroundColor: '#ECFDF3' }]}>
                <View style={styles.overviewTop}>
                  <Text style={styles.overviewLabel}>{t.todayBookings}</Text>
                  <Ionicons name="today-outline" size={20} color="#16A34A" />
                </View>
                <Text style={styles.overviewValue}>{todayBookings}</Text>
                <Text style={styles.overviewHint}>{t.todayBookingsHint}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t.quickActions}</Text>
          </>
        }
        renderItem={renderQuickAction}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 16, paddingVertical: 10 },

  greetRow: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  greetSub: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
  },
  langText: { fontSize: 13, fontWeight: '600', color: '#0369A1' },

  smallHint: { fontSize: 11, color: '#6B7280', marginBottom: 10 },

  weatherCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#2563EB',
    marginBottom: 12,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  weatherPlace: { color: '#E0F2FE', fontSize: 13, fontWeight: '600' },
  weatherUpdated: { color: '#BFDBFE', fontSize: 11, marginTop: 2 },
  weatherMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  weatherTemp: { fontSize: 34, fontWeight: '700', color: '#FFFFFF', marginRight: 8 },
  weatherCondition: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  weatherFeels: { fontSize: 12, color: '#DBEAFE', marginTop: 2 },
  weatherMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#DBEAFE', marginTop: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginTop: 2 },
  weatherChipsRow: { marginTop: 8, flexDirection: 'row' },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weatherChipText: { fontSize: 11, color: '#F9FAFB', marginLeft: 4 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 6,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  overviewCard: { width: '48%', borderRadius: 16, padding: 12 },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  overviewLabel: { fontSize: 12, color: '#4B5563' },
  overviewValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  overviewHint: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  quickCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  quickSub: { fontSize: 11, color: '#F9FAFB' },
});
