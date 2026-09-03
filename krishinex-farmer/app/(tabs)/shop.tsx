import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authApi, IMAGE_BASE_URL } from '../../services/api';
import { useI18n } from '@/context/I18nContext';
import { useCart } from '@/context/CartContext';
import * as Location from 'expo-location';
import { getStoredLocation } from '@/utils/locationManager';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

const RAM_CACHE_SHOP: Record<string, {
  timestamp: number;
  banners: any[];
  products: any[];
  profileAvatar: string;
  displayAddress: string;
}> = {};

const categoryTabs = [
  { key: 'all', labelEn: 'All', labelHi: 'सब', icon: 'grid-outline' as const },
  { key: 'seed', labelEn: 'Seeds', labelHi: 'बीज', icon: 'leaf-outline' as const },
  {
    key: 'fertilizer',
    labelEn: 'Fertilizer',
    labelHi: 'खाद',
    icon: 'flask-outline' as const,
  },
  {
    key: 'pesticide',
    labelEn: 'Pesticide',
    labelHi: 'कीटनाशक',
    icon: 'bug-outline' as const,
  },
  {
    key: 'equipment',
    labelEn: 'Equipment',
    labelHi: 'उपकरण',
    icon: 'construct-outline' as const,
  },
];

// ---- Shimmer Component ----
function ShimmerBox({ width, height, borderRadius = 8, style }: { width: any; height: number; borderRadius?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#D1D5DB', opacity },
        style,
      ]}
    />
  );
}

const LazyImage = ({ source, style }: any) => {
  const [loading, setLoading] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;
  const [actualSource, setActualSource] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActualSource(source);
    }, 400); // Defer image loading to make card text render instantly
    return () => clearTimeout(timer);
  }, [source]);

  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB', overflow: 'hidden' }]}>
      {loading && <ActivityIndicator size="small" color="#16A34A" style={{ position: 'absolute', zIndex: 1 }} />}
      {actualSource && (
        <Animated.Image
          source={actualSource}
          style={[style, { position: 'absolute', opacity, zIndex: 2, width: '100%', height: '100%' }]}
          onLoadEnd={() => {
            setLoading(false);
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }}
          onError={() => setLoading(false)}
        />
      )}
    </View>
  );
};

// ---- Skeleton for banner ----
function BannerSkeleton() {
  return (
    <View style={{ marginTop: 4, borderRadius: 18, overflow: 'hidden' }}>
      <ShimmerBox width="100%" height={170} borderRadius={18} />
    </View>
  );
}

// ---- Skeleton for one product card ----
function ProductCardSkeleton() {
  return (
    <View style={{ width: '50%', padding: 4 }}>
      <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden', elevation: 3 }}>
        <ShimmerBox width="100%" height={130} borderRadius={0} />
        <View style={{ padding: 8 }}>
          <ShimmerBox width="80%" height={12} borderRadius={6} />
          <ShimmerBox width="50%" height={10} borderRadius={6} style={{ marginTop: 6 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <ShimmerBox width={40} height={14} borderRadius={6} />
            <ShimmerBox width={36} height={22} borderRadius={999} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---- Full skeleton screen ----
function ShopSkeleton() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 10 }}>
      <BannerSkeleton />
      <View style={{ marginTop: 18, marginBottom: 8 }}>
        <ShimmerBox width={160} height={16} borderRadius={6} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6].map(i => <ProductCardSkeleton key={i} />)}
      </View>
    </View>
  );
}


export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const { addToCart, cartItems, updateQty } = useCart();
  const hi = language === 'hi';

  const [activeTab, setActiveTab] =
    useState<'all' | 'seed' | 'fertilizer' | 'pesticide' | 'equipment'>('all');
  const [searchText, setSearchText] = useState('');
  const [posterIndex, setPosterIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [banners, setBanners] = useState<any[]>(() => {
    return RAM_CACHE_SHOP['shop_data']?.banners || [];
  });
  const bannerScrollRef = useRef<ScrollView>(null);
  const scrollWidth = Dimensions.get('window').width - 28; // adjusting for margin

  const t = {
    searchPlaceholder: hi
      ? 'बीज, कीटनाशक या उपकरण खोजें'
      : 'Search seeds, pesticide or tools',
    recTitle: hi ? 'आपके लिए सुझाए गए' : 'Recommended for you',
    prodTitle: hi ? 'सबसे ज्यादा खरीदे गए' : 'Most bought products',
    unit: (p: any) => {
      const u = (p.unit || '').toUpperCase();
      if (u === 'BAG') return hi ? 'प्रति बोरी' : 'per bag';
      if (u === 'BOTTLE') return hi ? 'प्रति बोतल' : 'per bottle';
      if (u === 'PIECE') return hi ? 'प्रति पीस' : 'per piece';
      return p.unit;
    },
    menuOrders: hi ? 'मेरे ऑर्डर' : 'My Orders',
    menuShopOrders: hi ? 'शॉप ऑर्डर' : 'Shop Orders',
    menuCart: hi ? 'कार्ट' : 'Cart',
    btnAdd: hi ? 'जोड़ें' : 'Add',
    btnOrder: hi ? 'ऑर्डर करें' : 'Order now',
  };

  const displayAddressPlaceholder = hi
    ? 'पता सेट नहीं है'
    : 'Address not set';

  const goToProfile = () => router.push('/profile');
  const goToOrders = () => router.push('/orders');
  const goToShopOrders = () => router.push('/shop-orders');
  const goToCart = () => router.push('/cart');
  const goToProduct = (id: string) => router.push(`../product/${id}`);

  const [productsList, setProductsList] = useState<any[]>(() => {
    return RAM_CACHE_SHOP['shop_data']?.products || [];
  });
  const [loading, setLoading] = useState(() => {
    return RAM_CACHE_SHOP['shop_data'] ? false : true;
  });
  const [bannerLoading, setBannerLoading] = useState(() => {
    return RAM_CACHE_SHOP['shop_data'] ? false : true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(() => {
    return RAM_CACHE_SHOP['shop_data']?.profileAvatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200';
  });
  const [displayAddress, setDisplayAddress] = useState(() => {
    return RAM_CACHE_SHOP['shop_data']?.displayAddress || displayAddressPlaceholder;
  });

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchShopData = async (isRefresh = false, signal?: AbortSignal) => {
    if (!isRefresh && RAM_CACHE_SHOP['shop_data']) {
      const age = Date.now() - RAM_CACHE_SHOP['shop_data'].timestamp;
      if (age < 5 * 60 * 1000) {
        console.log('[DEBUG] Skipping API call, shop RAM cache is fresh');
        return;
      }
    }

    if (!isRefresh) {
      setLoading(true);
      setBannerLoading(true);
    }

    let fetchedBanners: any[] = [];
    let fetchedProducts: any[] = [];
    let fetchedAvatar = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200';
    let fetchedAddress = displayAddressPlaceholder;

    // ⚡ TIER 1 — Banners FIRST (lightest API, loads instantly)
    try {
      const bannerRes = await authApi.getBanners(signal);
      fetchedBanners = bannerRes.data || [];
      setBanners(fetchedBanners);
    } catch (e: any) {
      if (e?.name !== 'CanceledError') console.log('Banner fetch error:', e);
    } finally {
      setBannerLoading(false);
    }

    // 🌍 TIER 2 — Location + Products + Profile (Combined)
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const stored = await getStoredLocation();
        if (stored) {
          lat = stored.latitude;
          lng = stored.longitude;
        }
      } catch (e) {
        console.log('Stored location read failed:', e);
      }

      const [itemsRes, profileRes] = await Promise.all([
        authApi.getItems(undefined, lat, lng, 1, 20, signal),
        authApi.getProfile(signal),
      ]);

      if (itemsRes.data && Array.isArray(itemsRes.data) && itemsRes.data.length > 0) {
        fetchedProducts = itemsRes.data;
        setProductsList(fetchedProducts);
        setHasMore(fetchedProducts.length === 20);
      } else if (lat || lng) {
        // Fallback: If GPS fetch returned empty, fetch all without GPS
        try {
          const fallbackRes = await authApi.getItems(undefined, undefined, undefined, 1, 20, signal);
          fetchedProducts = fallbackRes.data || [];
          setProductsList(fetchedProducts);
          setHasMore(fetchedProducts.length === 20);
        } catch(e) {
          setProductsList([]);
          setHasMore(false);
        }
      } else {
        fetchedProducts = itemsRes.data || [];
        setProductsList(fetchedProducts);
        setHasMore(fetchedProducts.length === 20);
      }
      setPage(1);

      if (profileRes.data?.profilePhotoUrl) {
        const photoUrl = profileRes.data.profilePhotoUrl;
        fetchedAvatar = photoUrl.startsWith('http')
          ? photoUrl
          : `${IMAGE_BASE_URL}/${photoUrl}`;
        setProfileAvatar(fetchedAvatar);
      }
      if (profileRes.data?.address) {
        fetchedAddress = profileRes.data.address;
        setDisplayAddress(fetchedAddress);
      }

      // Update RAM Cache
      RAM_CACHE_SHOP['shop_data'] = {
        timestamp: Date.now(),
        banners: fetchedBanners,
        products: fetchedProducts,
        profileAvatar: fetchedAvatar,
        displayAddress: fetchedAddress,
      };

    } catch (error: any) {
      if (error?.name !== 'CanceledError' && !error?.message?.includes('canceled')) {
        console.error('Error fetching shop data:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopData(true);
  };

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const stored = await getStoredLocation();
        if (stored) {
          lat = stored.latitude;
          lng = stored.longitude;
        }
      } catch (e) {}

      let newProducts: any[] = [];
      const itemsRes = await authApi.getItems(undefined, lat, lng, nextPage, 20);
      if (itemsRes.data && Array.isArray(itemsRes.data) && itemsRes.data.length > 0) {
        newProducts = itemsRes.data;
      } else if (lat || lng) {
        const fallbackRes = await authApi.getItems(undefined, undefined, undefined, nextPage, 20);
        newProducts = fallbackRes.data || [];
      }
      
      if (newProducts.length > 0) {
        setProductsList(prev => [...prev, ...newProducts]);
        setPage(nextPage);
        setHasMore(newProducts.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.log('Error loading more:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchShopData(false, controller.signal);
    return () => controller.abort();
  }, []);



  // Auto scroll for banners
  useEffect(() => {
    if (banners.length > 0) {
      const interval = setInterval(() => {
        setPosterIndex(prev => {
          const next = prev === banners.length - 1 ? 0 : prev + 1;
          bannerScrollRef.current?.scrollTo({ x: next * scrollWidth, animated: true });
          return next;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [banners, scrollWidth]);

  const filteredProducts = useMemo(() => {
    const lower = searchText.toLowerCase();
    return productsList.filter(p => {
      const byCat = activeTab === 'all' || (p.category && p.category.toLowerCase() === activeTab.toLowerCase());
      const label = (hi ? (p.nameHi || p.name) : p.name) || p.name || p.title || '';
      const bySearch = !lower || (label || '').toLowerCase().includes(lower);
      return byCat && bySearch;
    });
  }, [activeTab, searchText, hi, productsList]);

  const handlePosterScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    if (newIndex !== posterIndex) setPosterIndex(newIndex);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0FDF4" />

      {/* HEADER gradient */}
      <LinearGradient
        colors={['#b9e573ff', '#69ad49ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={goToProfile}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: profileAvatar }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => {
                console.log('Profile photo failed to load, using placeholder.');
                setProfileAvatar('https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200');
              }}
            />
          </TouchableOpacity>

          <View style={styles.locationWrap}>
            <Text style={styles.locationTitle}>
              {hi ? 'डिलीवर करें' : 'Deliver to'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.locationDesc} numberOfLines={1}>
                {displayAddress}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.cartBtnHeader}
              onPress={goToCart}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="cart-outline" 
                size={22} 
                color={KHETIFY_GREEN_DARK} 
              />
              {cartItems.length > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{cartItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => setMenuOpen(prev => !prev)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={KHETIFY_GREEN_DARK}
                />
              </TouchableOpacity>

              {menuOpen && (
                <>
                  <TouchableOpacity
                    style={styles.menuBackdrop}
                    activeOpacity={1}
                    onPress={() => setMenuOpen(false)}
                  />
                  <View style={styles.menuCard}>
                    {/* My Orders (farmer app orders) */}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuOpen(false);
                        goToOrders();
                      }}
                    >
                      <Ionicons
                        name="receipt-outline"
                        size={16}
                        color={KHETIFY_GREEN_DARK}
                      />
                      <Text style={styles.menuText}>{t.menuOrders}</Text>
                    </TouchableOpacity>

                    {/* Shop Orders (Khetify shop ke orders) */}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuOpen(false);
                        goToShopOrders();
                      }}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={16}
                        color={KHETIFY_GREEN_DARK}
                      />
                      <Text style={styles.menuText}>{t.menuShopOrders}</Text>
                    </TouchableOpacity>

                    {/* Cart */}
                    <TouchableOpacity
                      style={[styles.menuItem, { borderBottomWidth: 0 }]}
                      onPress={() => {
                        setMenuOpen(false);
                        goToCart();
                      }}
                    >
                      <Ionicons
                        name="cart-outline"
                        size={16}
                        color={KHETIFY_GREEN_DARK}
                      />
                      <Text style={styles.menuText}>{t.menuCart}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {categoryTabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.9}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() =>
                  setActiveTab(tab.key as any)
                }
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.tabText,
                    active && styles.tabTextActive,
                  ]}
                >
                  {hi ? tab.labelHi : tab.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* MAIN CONTENT - always visible, sections load independently */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[KHETIFY_GREEN_DARK]} />}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          // Load more when user is 1500px from the bottom (continuous load)
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 1500) {
            loadMoreProducts();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* BANNER — shows instantly as soon as banners arrive */}
        {bannerLoading ? (
          <View style={styles.posterContainer}>
            <BannerSkeleton />
          </View>
        ) : (
        <View style={styles.posterContainer}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handlePosterScroll}
            scrollEventThrottle={16}
          >
            {banners.map(p => {
              const imgUri = p.image.startsWith('http') ? p.image : `${IMAGE_BASE_URL}/${p.image}`;
              return (
                <View key={p._id || p.id} style={[styles.posterSlide, { width: scrollWidth }]}>
                  <Image
                    source={{ uri: imgUri }}
                    style={[styles.posterImage, { width: scrollWidth }]}
                    resizeMode="cover"
                  />
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.dotsRow}>
            {banners.map((p, index) => {
              const active = index === posterIndex;
              return (
                <View
                  key={p._id || p.id}
                  style={[styles.dot, active && styles.dotActive]}
                />
              );
            })}
          </View>
        </View>
        )}

        {/* PRODUCTS — shows skeleton while loading, then real products */}
        {loading ? (
          <>
            <View style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
              <ShimmerBox width={160} height={16} borderRadius={6} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(i => <ProductCardSkeleton key={i} />)}
            </View>
          </>
        ) : (
        <>
        {/* products grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.prodTitle}</Text>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.map(p => {
            const title = (hi ? (p.nameHi || p.name) : p.name) || p.name || p.title || 'Product';
            return (
              <TouchableOpacity
                key={p._id || p.id}
                style={styles.productCard}
                activeOpacity={0.92}
                onPress={() => goToProduct(p._id || p.id)}
              >
                <View style={styles.productCardInner}>
                  <View style={styles.productImageWrap}>
                    <Image
                      source={{ uri: p.imageUrl ? `${IMAGE_BASE_URL}/${p.imageUrl}` : (p.image || 'https://images.pexels.com/photos/2002055/pexels-photo-2002055.jpeg?auto=compress&cs=tinysrgb&w=600') }}
                      style={styles.productImg}
                    />
                    <View style={styles.productRatingChip}>
                      <Ionicons
                        name="star"
                        size={10}
                        color="#FBBF24"
                      />
                      <Text style={styles.productRatingChipText}>
                        {p.rating}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productBody}>
                    <Text
                      style={styles.productTitle}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                    {(() => {
                        let cheapestPrice = p.price;
                        let displayUnit = '';

                        if (p.hasVariants && p.variants?.length > 0) {
                          // For variant products: find cheapest variant and use its label
                          const cheapestVariant = p.variants.reduce((min: any, v: any) =>
                            v.price < min.price ? v : min, p.variants[0]);
                          cheapestPrice = cheapestVariant.price;
                          displayUnit = cheapestVariant.label || ''; // e.g. "500gm", "1kg", "5L"
                        } else {
                          // For simple products: normalize the base unit
                          const rawUnit = (p.unit || '').trim().toLowerCase();
                          if (['kg', 'kgs', 'kilogram', 'kilograms', 'kilo'].includes(rawUnit)) displayUnit = 'kg';
                          else if (['g', 'gm', 'gms', 'gram', 'grams', 'grm'].includes(rawUnit)) displayUnit = 'gm';
                          else if (['l', 'ltr', 'lts', 'litre', 'litres', 'liter', 'liters'].includes(rawUnit)) displayUnit = 'L';
                          else if (['ml', 'millilitre', 'milliliter', 'mls'].includes(rawUnit)) displayUnit = 'ml';
                          else if (['bag', 'bags', 'bori', 'बोरी'].includes(rawUnit)) displayUnit = hi ? 'बोरी' : 'bag';
                          else if (['bottle', 'bottles', 'bottel', 'बोतल'].includes(rawUnit)) displayUnit = hi ? 'बोतल' : 'bottle';
                          else if (['piece', 'pieces', 'pc', 'pcs', 'pice', 'pis', 'नग'].includes(rawUnit)) displayUnit = hi ? 'पीस' : 'pc';
                          else if (['pack', 'packet', 'packets', 'pkt', 'पैकेट'].includes(rawUnit)) displayUnit = hi ? 'पैकेट' : 'pack';
                          else if (['box', 'boxes'].includes(rawUnit)) displayUnit = hi ? 'बॉक्स' : 'box';
                          else displayUnit = p.unit || '';
                        }

                        return cheapestPrice ? (
                          <Text style={styles.productSub}>
                            ₹{cheapestPrice.toLocaleString('en-IN')}{displayUnit ? ` / ${displayUnit}` : ''}
                          </Text>
                        ) : null;
                      })()}
                    <View style={styles.productMetaRow}>
                      <View style={{ flex: 1 }}>
                        {p.hasVariants && p.variants?.length > 0 ? (
                          <Text style={styles.productPrice}>
                            {hi ? '₹ ' : 'Starts ₹ '}{Math.min(...p.variants.map((v: any) => v.price)).toLocaleString('en-IN')}{hi ? ' से' : ''}
                          </Text>
                        ) : (
                          <Text style={styles.productPrice}>
                            ₹ {(p.price * (cartItems.find(i => i.id === (p._id || p.id))?.qty || 1)).toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>
                      {p.hasVariants ? (
                        <TouchableOpacity
                          style={[styles.addBtnSmall, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: KHETIFY_GREEN_DARK }]}
                          activeOpacity={0.9}
                          onPress={() => goToProduct(p._id || p.id)}
                        >
                          <Text style={[styles.addBtnTextSmall, { color: KHETIFY_GREEN_DARK }]}>
                            {hi ? 'विकल्प' : 'Options'}
                          </Text>
                        </TouchableOpacity>
                      ) : cartItems.find(i => i.id === (p._id || p.id)) ? (
                        <View style={styles.qtyRowInline}>
                          <TouchableOpacity
                            style={styles.qtyBtnInline}
                            onPress={() => updateQty(p._id || p.id, -1)}
                          >
                            <Ionicons name="remove" size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                          <Text style={styles.qtyValInline}>
                            {cartItems.find(i => i.id === (p._id || p.id))?.qty}
                          </Text>
                          <TouchableOpacity
                            style={styles.qtyBtnInline}
                            onPress={() => updateQty(p._id || p.id, 1)}
                          >
                            <Ionicons name="add" size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtnSmall}
                          activeOpacity={0.9}
                          onPress={() => {
                            addToCart({
                              id: p._id || p.id,
                              name: p.name,
                              nameHi: p.nameHi || p.name,
                              price: p.price,
                              unit: p.unit,
                              unitEn: p.unit || 'per unit',
                              image: p.imageUrl ? `${IMAGE_BASE_URL}/${p.imageUrl}` : (p.image || 'https://images.pexels.com/photos/2002055/pexels-photo-2002055.jpeg?auto=compress&cs=tinysrgb&w=600'),
                              owner: p.owner,
                              qty: 1
                            });
                          }}
                        >
                          <Text style={styles.addBtnTextSmall}>{t.btnAdd}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {hi
                ? 'कोई उत्पाद नहीं मिला, खोज या कैटेगरी बदलकर देखें।'
                : 'No products found, try another search or category.'}
            </Text>
          </View>
        )}

        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={KHETIFY_GREEN_DARK} />
          </View>
        )}

        <View style={{ height: 24 }} />
        </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  headerGradient: {
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 21 
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBtnHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    width: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  locationWrap: { flex: 1, marginHorizontal: 10 },
  locationTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#6B7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationDesc: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    marginLeft: 4,
    fontWeight: '600',
  },

  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
  },
  menuBackdrop: {
    position: 'absolute',
    top: -16,
    left: -200,
    right: 0,
    bottom: -200,
    zIndex: 12,
  },
  menuCard: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    paddingVertical: 4,
    zIndex: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 0.7,
    borderBottomColor: '#E5E7EB',
  },
  menuText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 6,
    fontSize: 14,
    color: '#111827',
  },

  tabsRow: {
    marginTop: 10,
    paddingVertical: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFFAA',
  },
  tabItemActive: {
    backgroundColor: KHETIFY_GREEN_DARK,
    borderColor: KHETIFY_GREEN_DARK,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },

  posterContainer: {
    marginTop: 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  posterSlide: {
    // width is set dynamically in component
  },
  posterImage: {
    height: 170,
    borderRadius: 18,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#11182755',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 14,
    backgroundColor: '#A3E635',
  },

  sectionHeader: {
    marginTop: 18,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  recoRow: { paddingVertical: 4 },
  recoCard: {
    width: 170,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 8,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  recoImg: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginBottom: 6,
  },
  recoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  recoPrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  recoUnit: {
    fontSize: 10,
    color: '#6B7280',
  },
  recoBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: KHETIFY_GREEN_DARK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ECFDF5',
    marginRight: 4,
  },

  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  productCard: {
    width: '50%',
    padding: 4,
  },
  productCardInner: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  productImageWrap: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  productImg: {
    width: '100%',
    aspectRatio: 1,
  },
  productRatingChip: {
    position: 'absolute',
    right: 6,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#111827AA',
  },
  productRatingChipText: {
    fontSize: 10,
    color: '#FBBF24',
    marginLeft: 3,
    fontWeight: '700',
  },
  productBody: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  productSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KHETIFY_GREEN_DARK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: KHETIFY_GREEN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnTextSmall: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  qtyRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KHETIFY_GREEN_DARK,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtnInline: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValInline: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    marginHorizontal: 4,
    minWidth: 14,
    textAlign: 'center',
  },
});

