// app/(tabs)/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  SafeAreaView,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { authApi, IMAGE_BASE_URL, BASE_URL } from '../../services/api';
import { updateBackgroundLocation, getStoredLocation } from '@/utils/locationManager';
import { useI18n } from '@/context/I18nContext';

const SHADOW_COLOR = '#00000020';
const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const GREEN_LIGHT = '#a3d546ff';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH * 0.85; // Each card takes 85% of screen width

type TileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: [string, string];
  onPress?: () => void;
};

function CarouselImageItem({ fullUrl, index, totalLength }: { fullUrl: string, index: number, totalLength: number }) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <View style={[
      styles.bannerCardCarousel,
      {
        width: CAROUSEL_WIDTH,
        marginLeft: index === 0 ? 16 : 0,
        marginRight: 16
      }
    ]}>
      <Image
        source={hasError ? require('../../assets/images/logo.png') : { uri: fullUrl }}
        style={[styles.bannerImage, hasError && { opacity: 0.3, resizeMode: 'contain' }]}
        resizeMode={hasError ? "contain" : "cover"}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [farmerName, setFarmerName] = React.useState('किसान साथी');
  const [village, setVillage] = React.useState('');

  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [locationName, setLocationName] = React.useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(true);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [banners, setBanners] = React.useState<any[]>([]); // Added banners state
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState<string | null>(null);
  const [creditLimit, setCreditLimit] = React.useState(0);
  const [creditUsed, setCreditUsed] = React.useState(0);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount(data.count || 0);
        await AsyncStorage.setItem('cached_unread', (data.count || 0).toString());
      }
    } catch (e) {
      console.log('Error fetching unread count', e);
    }
  };

  const loadWeather = async (silent = false, forceFetch = false) => {
    try {
      if (!silent) setWeatherLoading(true);

      // Helper to fetch and set weather
      const updateWeatherForCoords = async (lat: number, lon: number, updateCache = true) => {
        try {
          const res = await authApi.getWeather(lat, lon);

          if (res.data && res.data.current_weather) {
            const cw = res.data.current_weather;
            const newWeatherData = {
              temperature_2m: cw.temperature,
              weather_code: cw.weathercode,
              wind_speed_10m: cw.windspeed,
              relative_humidity_2m: cw.relative_humidity_2m ?? 65,
              rain_probability: cw.precipitation_probability ?? 10,
              apparent_temperature: cw.apparent_temperature ?? (cw.temperature - 2)
            };
            setWeatherData(newWeatherData);

            // Background city name update
            Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }).then(geo => {
              let locName = null;
              if (geo && geo[0]) {
                const { city, region } = geo[0];
                locName = `${city || ''}, ${region || ''}`.replace(/^, /, '').replace(/, $/, '');
                setLocationName(locName);
              }
              if (updateCache) {
                 AsyncStorage.setItem('cached_weather', JSON.stringify({ weatherData: newWeatherData, locationName: locName }));
              }
            }).catch(() => {
              if (updateCache) {
                 AsyncStorage.setItem('cached_weather', JSON.stringify({ weatherData: newWeatherData, locationName: null }));
              }
            });
          }
        } catch (e) {
          console.log('Weather update error', e);
        }
      };

      // 1. Immediately read cached weather if available
      const cachedWeatherStr = await AsyncStorage.getItem('cached_weather');
      if (cachedWeatherStr) {
        const cw = JSON.parse(cachedWeatherStr);
        if (cw.weatherData) setWeatherData(cw.weatherData);
        if (cw.locationName) setLocationName(cw.locationName);
        setWeatherLoading(false);
      } else {
        // Fallback default
        await updateWeatherForCoords(28.61, 77.21, false);
      }

      // 2. BACKGROUND: Update centralized DB location
      updateBackgroundLocation().then(async (result) => {
        if (forceFetch || (result && (result.changed || !cachedWeatherStr))) {
          // If location changed by > 2km, OR we had no cache originally, OR user pulled to refresh
          let lat, lon;
          if (result) {
            lat = result.location.latitude;
            lon = result.location.longitude;
          } else {
            // fallback if background check timed out but we want to force refresh weather anyway
            const stored = await getStoredLocation();
            if (stored) {
              lat = stored.latitude;
              lon = stored.longitude;
            } else {
              lat = 28.61;
              lon = 77.21;
            }
          }
          updateWeatherForCoords(lat, lon, true);
        }
      });

    } catch (error: any) {
      console.log('Weather process error:', error);
      if (!weatherData) {
        setLocationName(hi ? 'मौसम जानकारी उपलब्ध नहीं' : 'Weather Unavailable');
      }
    } finally {
      if (!weatherData) setWeatherLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data) {
        setCreditLimit(res.data.creditLimit || 0);
        setCreditUsed(res.data.creditUsed || 0);

        if (res.data.profilePhotoUrl) {
          const photoUrl = res.data.profilePhotoUrl;
          const fullUrl = photoUrl.startsWith('http')
            ? photoUrl
            : `${IMAGE_BASE_URL}/${photoUrl.replace(/\\/g, '/')}`;
          setProfileImage(fullUrl);
          // Also update stored data
          const storedData = await AsyncStorage.getItem('userData');
          if (storedData) {
            const user = JSON.parse(storedData);
            user.profilePhotoUrl = photoUrl;
            user.creditLimit = res.data.creditLimit;
            user.creditUsed = res.data.creditUsed;
            await AsyncStorage.setItem('userData', JSON.stringify(user));
          }
        }
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWeather(true, true), loadSuggestions(), loadProfile(), fetchUnreadCount()]);
    setRefreshing(false);
  };

  const isFirstWeatherFetch = React.useRef(true);

  useFocusEffect(
    useCallback(() => {
      const loadCachedData = async () => {
        try {
          const storedData = await AsyncStorage.getItem('userData');
          if (storedData) {
            const user = JSON.parse(storedData);
            setFarmerName(user.name || 'किसान साथी');
            setVillage(user.address || '');
            if (user.creditLimit !== undefined) setCreditLimit(user.creditLimit);
            if (user.creditUsed !== undefined) setCreditUsed(user.creditUsed);
            if (user.profilePhotoUrl) {
              const fullUrl = user.profilePhotoUrl.startsWith('http')
                ? user.profilePhotoUrl
                : `${IMAGE_BASE_URL}/${user.profilePhotoUrl.replace(/\\/g, '/')}`;
              setProfileImage(fullUrl);
            }
          }

          const cachedWeather = await AsyncStorage.getItem('cached_weather');
          if (cachedWeather) {
             const { weatherData, locationName } = JSON.parse(cachedWeather);
             setWeatherData(weatherData);
             setLocationName(locationName);
             setWeatherLoading(false);
          }

          const cachedSuggestions = await AsyncStorage.getItem('cached_suggestions');
          if (cachedSuggestions) setSuggestions(JSON.parse(cachedSuggestions));

          const cachedUnread = await AsyncStorage.getItem('cached_unread');
          if (cachedUnread) setUnreadNotifCount(parseInt(cachedUnread, 10));

        } catch (error) {
          console.error('Error loading cache:', error);
        }
      };

      const fetchFreshData = async () => {
        if (isFirstWeatherFetch.current) {
          await loadWeather(true);
          isFirstWeatherFetch.current = false;
        }
        await loadSuggestions();
        await loadProfile();
        await fetchUnreadCount();
      };

      loadCachedData().then(() => {
        fetchFreshData();
      });
    }, [language])
  );

  const loadSuggestions = async () => {
    try {
      const res = await authApi.getAllSuggestions();
      if (res.data && Array.isArray(res.data)) {
        setSuggestions(res.data);
        await AsyncStorage.setItem('cached_suggestions', JSON.stringify(res.data));
      }
    } catch (error) {
      console.log('Error loading suggestions:', error);
    }
  };

  // Carousel scroll handling
  const flatListRef = React.useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Combined Carousel Data
  const combinedData = React.useMemo(() => {
    const list: any[] = [];
    // Suggestions normally have imageUrl
    suggestions.forEach(s => {
      if (s.imageUrl) {
        list.push({ ...s, type: 'suggestion', id: s._id || s.id });
      }
    });
    // Banners normally have image
    banners.forEach(b => {
      if (b.image) {
        list.push({ ...b, type: 'banner', id: b._id || b.id });
      }
    });
    return list;
  }, [suggestions, banners]);

  React.useEffect(() => {
    if (combinedData.length > 1) {
      const interval = setInterval(() => {
        let nextIndex = (currentIndex + 1) % combinedData.length;
        setCurrentIndex(nextIndex);
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 5000); // 5 seconds
      return () => clearInterval(interval);
    }
  }, [combinedData, currentIndex]);

  const getItemLayout = (_: any, index: number) => ({
    length: CAROUSEL_WIDTH + 16, // item width + margin
    offset: (CAROUSEL_WIDTH + 16) * index,
    index,
  });

  const getWeatherCondition = (code: number) => {
    if (code === 0) return { hi: 'साफ मौसम', en: 'Clear sky', icon: 'sunny-outline' };
    if ([1, 2, 3].includes(code)) return { hi: 'आंशिक बादल', en: 'Partly cloudy', icon: 'partly-sunny-outline' };
    if ([45, 48].includes(code)) return { hi: 'कोहरा', en: 'Fog', icon: 'cloud-outline' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { hi: 'बारिश', en: 'Rain', icon: 'rainy-outline' };
    if ([71, 73, 75, 85, 86].includes(code)) return { hi: 'बर्फबारी', en: 'Snow', icon: 'snow-outline' };
    if ([95, 96, 99].includes(code)) return { hi: 'तूफान', en: 'Thunderstorm', icon: 'thunderstorm-outline' };
    return { hi: 'सामान्य', en: 'Normal', icon: 'partly-sunny-outline' };
  };

  const toggleLanguage = () => setLanguage(hi ? 'en' : 'hi');

  const mainLogo = hi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');

  const profileAvatar = require('../../assets/images/logo.png');


  // Book equipment texts (hi/en)
  // Yahi change hai: heading me dono likh diye – "उपकरण बुकिंग / लेबर बुकिंग"
  const bookTitle = hi ? 'उपकरण / लेबर' : 'Equipment / Labor';
  const bookSub = hi
    ? 'ट्रैक्टर, हार्वेस्टर, स्प्रेयर और मज़दूर को किराए पर लें।'
    : 'Rent tractor, harvester, sprayer and labour.';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.mainContent}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={profileAvatar}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>

          <Image source={mainLogo} style={styles.logo} resizeMode="contain" />

          <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={24} color={GREEN_DARK} />
            {unreadNotifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN_DARK} />
          }
        >
          {/* GREETING */}
          <View style={styles.heroSection}>
            <View style={styles.heroText}>
              <Text style={styles.heroHello}>{t.greeting(farmerName)}</Text>
              <Text style={styles.heroVillage}>{t.village(village)}</Text>
            </View>

            <TouchableOpacity
              style={styles.langBtn}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.langGradient}
              >
                <Ionicons name="language-outline" size={14} color="#fff" />
                <Text style={styles.langText}>{hi ? 'English' : 'हिंदी'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* WEATHER */}
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.weatherCard}
          >
            {weatherLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>{hi ? 'मौसम जानकारी लोड हो रही है...' : 'Loading weather...'}</Text>
              </View>
            ) : weatherData ? (
              <>
                <View style={styles.weatherTopRow}>
                  <View>
                    <Text style={styles.weatherLocation}>
                      {locationName || village || (hi ? 'अज्ञात जगह' : 'Unknown location')}
                    </Text>
                    <Text style={styles.weatherUpdate}>
                      {hi ? 'अभी अपडेट किया गया' : 'Updated just now'}
                    </Text>
                  </View>
                  <Ionicons name={getWeatherCondition(weatherData.weather_code).icon as any} size={32} color="#FCD34D" />
                </View>

                <View style={styles.weatherMidRow}>
                  <Text style={styles.weatherTemp}>{Math.round(weatherData.temperature_2m)}°</Text>
                  <View>
                    <Text style={styles.weatherCondition}>
                      {hi ? getWeatherCondition(weatherData.weather_code).hi : getWeatherCondition(weatherData.weather_code).en}
                    </Text>
                    <Text style={styles.weatherFeels}>
                      {hi ? `महसूस ${Math.round(weatherData.apparent_temperature)}°` : `Feels like ${Math.round(weatherData.apparent_temperature)}°`}
                    </Text>
                  </View>
                </View>

                <View style={styles.weatherStatsRow}>
                  <WeatherStat icon="water-outline" label={hi ? 'नमी' : 'Humidity'} value={`${weatherData.relative_humidity_2m}%`} />
                  <WeatherStat icon="umbrella-outline" label={hi ? 'बारिश \%' : 'Rain Chance'} value={`${weatherData.rain_probability}%`} />
                  <WeatherStat icon="leaf-outline" label={hi ? 'हवा' : 'Wind'} value={`${weatherData.wind_speed_10m} km/h`} />
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>{hi ? 'मौसम जानकारी प्राप्त नहीं हुई' : 'Weather data unavailable'}</Text>
              </View>
            )}
          </LinearGradient>

          {/* CREDIT LIMIT CARD */}
          {creditLimit > 0 && (
            <View style={styles.creditCardWrapper}>
              <LinearGradient
                colors={['#111827', '#1F2937']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.creditCard}
              >
                <View style={styles.creditTopRow}>
                  <View>
                    <Text style={styles.creditLabel}>{hi ? 'कृषि-क्रेडिट (उपलब्ध)' : 'Agri-Credit (Available)'}</Text>
                    <Text style={styles.creditAmount}>₹{creditLimit - creditUsed}</Text>
                  </View>
                  <Ionicons name="card-outline" size={32} color="#9CA3AF" />
                </View>

                <View style={styles.creditProgressContainer}>
                  <View style={styles.creditProgressBar}>
                    <View style={[styles.creditProgressFill, { width: `${Math.min(100, (creditUsed / creditLimit) * 100)}%` }]} />
                  </View>
                  <View style={styles.creditUsageRow}>
                    <Text style={styles.creditUsedText}>{hi ? `उपयोग: ₹${creditUsed}` : `Used: ₹${creditUsed}`}</Text>
                    <Text style={styles.creditLimitText}>{hi ? `कुल सीमा: ₹${creditLimit}` : `Total Limit: ₹${creditLimit}`}</Text>
                  </View>
                </View>

                <View style={styles.creditFooter}>
                  <Text style={styles.creditSmall}>{hi ? 'केवल कृषि सामग्री के लिए मान्य' : 'Valid for agricultural inputs only'}</Text>
                  <View style={styles.nexBadge}>
                    <Text style={styles.nexBadgeText}>NexCard</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* DYNAMIC CAROUSEL (Advisory + Shop Banners) */}
          <View style={styles.carouselContainer}>
            {combinedData.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={combinedData}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CAROUSEL_WIDTH + 16}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{
                  paddingRight: 16 // Give some extra space at the end of the list if needed, or leave empty
                }}
                getItemLayout={getItemLayout}
                onMomentumScrollEnd={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const index = Math.round(contentOffset / (CAROUSEL_WIDTH + 16));
                  setCurrentIndex(index);
                }}
                renderItem={({ item, index }) => {
                  const imgPath = item.type === 'suggestion' ? item.imageUrl : item.image;
                  if (!imgPath) return null;

                  // Clean the path: remove leading slashes and fix backslashes
                  const cleanPath = imgPath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');

                  // Handle both external URLs and local paths
                  const fullUrl = imgPath.startsWith('http')
                    ? imgPath
                    : `${IMAGE_BASE_URL}/${cleanPath}`;

                  return (
                    <CarouselImageItem key={item.id} fullUrl={fullUrl} index={index} totalLength={combinedData.length} />
                  );
                }}
              />
            ) : (
              <View style={[styles.bannerCard, { justifyContent: 'center', alignItems: 'center' }]}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={{ width: 100, height: 40, opacity: 0.2 }}
                  resizeMode="contain"
                />
                <Text style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  {hi ? 'सावधानी ही सुरक्षा hai' : 'Safety first'}
                </Text>
              </View>
            )}

            {/* Dots */}
            {combinedData.length > 1 && (
              <View style={styles.dotsContainer}>
                {combinedData.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.activeDot : null
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 4 CARDS ONLY */}
          <View style={styles.tilesGrid}>
            <HomeTile
              icon="trending-up-outline"
              title={t.mandiTitle}
              subtitle={t.mandiSub}
              gradient={['#EF4444', '#DC2626']}
              onPress={() => router.push('/mandi-bhav')}
            />
            <HomeTile
              icon="leaf-outline"
              title={t.soilTitle}
              subtitle={t.soilSub}
              gradient={['#10B981', '#059669']}
              onPress={() => router.push('/soil-test')}
            />
            {/* BOOK EQUIPMENT CARD */}
            <HomeTile
              icon="book-outline"
              title={bookTitle}
              subtitle={bookSub}
              gradient={['#3B82F6', '#1D4ED8']}
              onPress={() => router.push('/book-equipment')}
            />
            <HomeTile
              icon="headset-outline"
              title={t.docTitle}
              subtitle={t.docSub}
              gradient={['#F59E0B', '#D97706']}
              onPress={() => router.push('/agri-doctor')}
            />
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.weatherStatBox}>
      <Ionicons name={icon} size={14} color="#DBEAFE" />
      <Text style={styles.weatherStatValue}>{value}</Text>
      <Text style={styles.weatherStatLabel}>{label}</Text>
    </View>
  );
}

function HomeTile({ icon, title, subtitle, gradient, onPress }: TileProps) {
  return (
    <TouchableOpacity
      style={styles.tileWrapper}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <LinearGradient colors={gradient} style={styles.tileGradient}>
        <View style={styles.tileIconContainer}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.tileSubtitle} numberOfLines={2}>{subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainContent: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomColor: GREEN,
    borderBottomWidth: 1.2,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImage: { width: '100%', height: '100%' },
  logo: { height: 28, width: 150 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroText: { flex: 1 },
  heroHello: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  heroVillage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  langBtn: {
    marginLeft: 12,
  },
  langGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  weatherCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  weatherLocation: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DBEAFE',
  },
  weatherUpdate: {
    fontSize: 11,
    color: '#BFDBFE',
    marginTop: 2,
  },
  weatherMidRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  weatherTemp: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginRight: 10,
  },
  weatherCondition: {
    fontSize: 14,
    color: '#E0F2FE',
    fontWeight: '700',
  },
  weatherFeels: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 2,
  },
  weatherStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weatherStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  weatherStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  weatherStatLabel: {
    fontSize: 11,
    color: '#DBEAFE',
  },
  bannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginBottom: 16,
    height: 160,
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  carouselContainer: {
    marginBottom: 16,
    marginHorizontal: -16, // Offset the parent padding to allow full-width carousel
  },
  bannerCardCarousel: {
    width: CAROUSEL_WIDTH,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    height: 160,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: GREEN_DARK,
    width: 12,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tileWrapper: {
    width: '48%',
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  tileGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  tileSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 14,
  },
  bellBtn: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  creditCardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  creditCard: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  creditTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  creditAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  creditProgressContainer: {
    marginTop: 15,
  },
  creditProgressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  creditProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  creditUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  creditUsedText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  creditLimitText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '700',
  },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  creditSmall: {
    color: '#6B7280',
    fontSize: 10,
    fontStyle: 'italic',
  },
  nexBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nexBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
