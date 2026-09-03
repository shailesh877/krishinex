import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '@/context/I18nContext';
import { authApi, IMAGE_BASE_URL } from '../../services/api';
import { useCart } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useI18n();
  const { addToCart, cartItems, updateQty } = useCart();
  const insets = useSafeAreaInsets();
  const hi = language === 'hi';

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const images = useMemo(() => {
    if (!product) return [];
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls.map((img: string) => {
        if (img.startsWith('http')) return img;
        return `${IMAGE_BASE_URL}/${img}`;
      });
    }
    if (product.imageUrl) {
      return [`${IMAGE_BASE_URL}/${product.imageUrl}`];
    }
    if (product.image) {
      return [product.image];
    }
    return ['https://images.pexels.com/photos/2002055/pexels-photo-2002055.jpeg?auto=compress&cs=tinysrgb&w=600'];
  }, [product]);

  const fetchProduct = async () => {
    try {
      const res = await authApi.getItemById(id);
      const p = res.data;
      setProduct(p);
      if (p.hasVariants && p.variants?.length > 0) {
        setSelectedVariant(p.variants[0]);
      }
    } catch (err) {
      console.error('Fetch product detail error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProduct();
    }
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  const goToCart = () => {
    router.push('/cart');
  };

  const currentPrice = selectedVariant ? selectedVariant.price : product?.price;
  const currentUnit = selectedVariant ? selectedVariant.label : product?.unit;

  const onAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product._id || product.id,
      name: product.name,
      nameHi: product.nameHi || product.name,
      price: currentPrice,
      unit: currentUnit,
      unitEn: selectedVariant ? selectedVariant.label : (product.unit || 'per unit'),
      image: product.imageUrl ? `${IMAGE_BASE_URL}/${product.imageUrl}` : product.image,
      owner: product.owner,
      qty: 1,
      variantLabel: selectedVariant?.label
    });
  };

  const onBuyNow = () => {
    if (!product) return;
    const item = {
      id: product._id || product.id,
      name: product.name,
      nameHi: product.nameHi || product.name,
      price: currentPrice,
      unit: currentUnit,
      unitEn: selectedVariant ? selectedVariant.label : (product.unit || 'per unit'),
      image: product.imageUrl ? `${IMAGE_BASE_URL}/${product.imageUrl}` : product.image,
      owner: product.owner,
      qty: 1,
      variantLabel: selectedVariant?.label
    };
    router.push({
      pathname: '/checkout',
      params: { buyNowItem: JSON.stringify(item) }
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={KHETIFY_GREEN_DARK} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {hi ? 'उत्पाद नहीं मिला।' : 'Product not found.'}
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>
              {hi ? 'वापस जाएं' : 'Go back'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const title = hi ? (product.nameHi || product.name) : product.name;
  
  const cartItem = cartItems.find(i => i.id === (product._id || product.id) && i.variantLabel === selectedVariant?.label);
  const currentQty = cartItem ? cartItem.qty : 1;
  const displayPrice = currentPrice * currentQty;
  const unitText = hi ? currentUnit : (currentUnit || 'per unit');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* top elevated header (statusbar + header ek group) */}
      <View style={[styles.topShell, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.appbar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.appbarMiddle}>
            <Text style={styles.appbarTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.appbarSubtitle} numberOfLines={1}>
              {unitText}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={goToCart}
          >
            <Ionicons name="cart-outline" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[KHETIFY_GREEN_DARK]} />
        }
      >
        {/* hero image */}
        <View
          style={styles.imageWrap}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {images.length > 1 ? (
            <View style={{ width: '100%', aspectRatio: 1 }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const contentOffset = e.nativeEvent.contentOffset.x;
                  const viewSize = e.nativeEvent.layoutMeasurement.width;
                  if (viewSize > 0) {
                    const pageNum = Math.floor((contentOffset + 10) / viewSize);
                    setActiveImageIndex(pageNum);
                  }
                }}
                scrollEventThrottle={16}
              >
                {images.map((uri: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={[styles.heroImgScroll, containerWidth > 0 ? { width: containerWidth } : null]}
                  />
                ))}
              </ScrollView>
              
              {/* Pagination Dots */}
              <View style={styles.dotsContainer}>
                {images.map((_: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      activeImageIndex === index ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: images[0] || 'https://images.pexels.com/photos/2002055/pexels-photo-2002055.jpeg?auto=compress&cs=tinysrgb&w=600' }}
              style={styles.heroImg}
            />
          )}

          {product.rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>{product.rating}</Text>
            </View>
          )}
        </View>

        {/* info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.unit}>{unitText}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>
                ₹ {currentPrice.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.taxText}>
                {hi ? 'सभी कर सहित' : 'Incl. all taxes'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="leaf-outline" size={14} color="#166534" />
              <Text style={styles.metaChipText}>
                {hi ? 'किसान पसंद' : 'Farmer choice'}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="cube-outline" size={14} color="#166534" />
              <Text style={styles.metaChipText}>
                {hi ? 'तेज डिलीवरी' : 'Fast delivery'}
              </Text>
            </View>
          </View>
        </View>

        {/* Variants Section */}
        {product.hasVariants && product.variants?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {hi ? 'उपलब्ध विकल्प' : 'Available Options'}
            </Text>
            <View style={styles.variantList}>
              {product.variants.map((v: any, idx: number) => {
                const isSelected = selectedVariant?.label === v.label;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVariant(v)}
                    style={[
                      styles.variantChip,
                      isSelected && styles.variantChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        isSelected && styles.variantChipTextActive,
                      ]}
                    >
                      {v.label}
                    </Text>
                    <Text
                      style={[
                        styles.variantChipPrice,
                        isSelected && styles.variantChipPriceActive,
                      ]}
                    >
                      ₹{v.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* detail sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {hi ? 'उत्पाद विवरण' : 'Product details'}
          </Text>
          <Text style={styles.sectionText}>
            {product.description || (hi
              ? 'उच्च गुणवत्ता वाला उत्पाद जो बेहतर परिणामों के लिए विकसित किया गया है।'
              : 'High quality product developed for better results.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {hi ? 'उपयोग निर्देश' : 'Usage instructions'}
          </Text>
          <Text style={styles.sectionText}>
            {hi
              ? 'पैकेट पर दिए गए निर्देशों का पालन करें या हमारे कृषि डॉक्टर से सलाह लें।'
              : 'Follow instructions on path or consult our Agri Doctor.'}
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>
            {hi ? 'कुल कीमत' : 'Total price'}
          </Text>
          <Text style={styles.bottomPrice}>
            ₹ {displayPrice.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.bottomActionRow}>
          {cartItems.find(i => i.id === (product._id || product.id) && i.variantLabel === selectedVariant?.label) ? (
            <View style={styles.qtyRowDetail}>
              <TouchableOpacity
                style={styles.qtyBtnDetail}
                onPress={() => updateQty(product._id || product.id, -1, selectedVariant?.label)}
              >
                <Ionicons name="remove" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.qtyValDetail}>
                {cartItems.find(i => i.id === (product._id || product.id) && i.variantLabel === selectedVariant?.label)?.qty}
              </Text>
              <TouchableOpacity
                style={styles.qtyBtnDetail}
                onPress={() => updateQty(product._id || product.id, 1, selectedVariant?.label)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.bottomBtnThin, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KHETIFY_GREEN_DARK }]}
                activeOpacity={0.9}
                onPress={onAddToCart}
              >
                <Text style={[styles.bottomBtnText, { color: KHETIFY_GREEN_DARK }]}>
                  {hi ? 'कार्ट' : 'Cart'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomBtnThin, { marginLeft: 8 }]}
                activeOpacity={0.9}
                onPress={onBuyNow}
              >
                <Text style={styles.bottomBtnText}>
                  {hi ? 'अभी खरीदें' : 'Buy Now'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: 30,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: KHETIFY_GREEN_DARK,
  },
  backBtnText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '700',
    fontSize: 13,
  },

  // premium top shell (statusbar + header ek group)
  topShell: {
    
    paddingBottom: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  appbarMiddle: {
    flex: 1,
    marginHorizontal: 8,
  },
  appbarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  appbarSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
  },

  imageWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  heroImg: { width: '100%', aspectRatio: 1 },
  heroImgScroll: {
    height: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: KHETIFY_GREEN_DARK,
    width: 14,
  },
  dotInactive: {
    backgroundColor: '#00000040',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  infoCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  unit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  taxText: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    marginRight: 8,
  },
  metaChipText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },

  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  bottomPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  bottomBtn: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: KHETIFY_GREEN_DARK,
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qtyRowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KHETIFY_GREEN_DARK,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyBtnDetail: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValDetail: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  variantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  variantChipActive: {
    borderColor: KHETIFY_GREEN_DARK,
    backgroundColor: '#F0FDF4',
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  variantChipTextActive: {
    color: KHETIFY_GREEN_DARK,
  },
  variantChipPrice: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  variantChipPriceActive: {
    color: '#166534',
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBtnThin: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: KHETIFY_GREEN_DARK,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
