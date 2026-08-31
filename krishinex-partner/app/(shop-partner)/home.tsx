// app/shop-tabs/home.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/shop`;
 // root url used for images too

type OrderStatus = 'NEW' | 'ACCEPTED' | 'DELIVERED';

type OrderItem = {
  id: string;
  customer: string;
  items: string;
  amount: number;
  time: string;
  status: OrderStatus;
  imageUrl: string;
};

export default function ShopHome() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const [stats, setStats] = useState({
    lifetime: { totalOrders: 0, totalDelivered: 0 },
    today: { new: 0, accepted: 0, delivered: 0 },
  });
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [latestOrders, setLatestOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string, address: string, avatarUri?: string | null } | null>(null);
  const [profileStatus, setProfileStatus] = useState<string>('approved');

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchDashboardStats(),
        fetchLatestOrders(),
        fetchUnreadCount(),
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

  const goOrders = () => router.push('./shop-tabs/orders');
  const goAccept = () => router.push('./shop-tabs/accept');
  const goAddItems = () => {
    if (profileStatus !== 'approved') {
       showAlert(
         isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
         isHindi ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप आइटम नहीं जोड़ सकते।' : 'Profile not verified. You cannot add items.'
       );
       return;
    }
    router.push('./items-add');
  };
  const goViewItems = () => router.push('./items-list');

  const fetchDashboardStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await fetch(`${API_URL}/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats.');
    }
  };

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await fetch(`${BASE_API_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      const pfp = data.profilePhotoUrl
        ? (data.profilePhotoUrl.startsWith('http')
          ? data.profilePhotoUrl
          : `${BASE_URL}/${data.profilePhotoUrl.replace(/\\/g, '/')}`)
        : null;
      setUserProfile({ name: data.name, address: data.address, avatarUri: pfp });
      if (data.status) setProfileStatus(data.status);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
    } catch (e) {
      console.log('Error fetching profile', e);
    }
  };
  const fetchLatestOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let data = await response.json();
      // Filter ONLY 'NEW' orders
      data = data.filter((o: any) => o.status === 'NEW').slice(0, 3);
      setLatestOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch latest orders.');
    } finally {
      setLoading(false);
    }
  };
  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${BASE_API_URL}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifCount(data.count || 0);
      }
    } catch (e) {
      console.log('Error fetching unread count', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      fetchProfile();
      fetchDashboardStats();
      fetchLatestOrders();
      fetchUnreadCount();
    }, [])
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP APP HEADER (user avatar + app logo + bell) */}
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.logoIconWrap} onPress={() => router.push('./profile')}>
          {userProfile?.avatarUri ? (
            <Image source={{ uri: userProfile.avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#16A34A" />
          )}
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('./notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#4B5563" />
          {unreadNotifCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />}
      >
        {/* GREETING + LOCATION + LANGUAGE */}
        <View style={styles.topInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetTitle}>
              {isHindi ? `नमस्ते, ${userProfile?.name || ''} जी` : `Namaste, ${userProfile?.name || ''} ji`}
            </Text>
            <Text style={styles.greetSub}>
              {userProfile?.address || (isHindi ? 'पता उपलब्ध नहीं' : 'Address not available')}
            </Text>
            <Text style={styles.greetHint}>
              {isHindi
                ? 'आज की सभी बुकिंग और ऑर्डर का ओवरव्यू यहां देखें.'
                : 'See today’s bookings and orders overview here.'}
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

        {/* OVERVIEW – TOTAL CARDS */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'ओवरव्यू' : 'Overview'}
        </Text>

        <View style={styles.cardRow}>
          {/* Total orders */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}>
              <Ionicons name="cart-outline" size={24} color="#0284C7" />
            </View>
            <Text style={styles.metricValue}>{stats.lifetime.totalOrders}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'कुल ऑर्डर' : 'Total Orders'}
            </Text>
          </View>

          {/* Total delivered */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-done" size={24} color="#16A34A" />
            </View>
            <Text style={styles.metricValue}>{stats.lifetime.totalDelivered}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'कुल बेचे (Delivered)' : 'Total Delivered'}
            </Text>
          </View>
        </View>

        {/* TODAY STATUS – NEW / ACCEPTED / DELIVERED */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'आज का स्टेटस' : 'Today’s status'}
        </Text>

        <View style={styles.statusRow}>
          {/* Card 1: New Orders */}
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxCount}>{stats.today.new}</Text>
            <Text style={styles.statusBoxLabel}>
              {isHindi ? 'नए ऑर्डर' : 'New orders'}
            </Text>
          </View>

          {/* Card 2: Accepted */}
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxCount}>{stats.today.accepted}</Text>
            <Text style={styles.statusBoxLabel}>
              {isHindi ? 'Accepted' : 'Accepted'}
            </Text>
          </View>

          {/* Card 3: Delivered */}
          <View style={[styles.statusBox, { marginRight: 0 }]}>
            <Text style={[styles.statusBoxCount, { color: '#059669' }]}>
              {stats.today.delivered}
            </Text>
            <Text style={styles.statusBoxLabel}>
              {isHindi ? 'Delivered' : 'Delivered'}
            </Text>
          </View>
        </View>

        {/* QUICK ACTIONS – SIRF 2 BUTTON (ADD + VIEW ITEMS) */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
          {isHindi ? 'क्विक एक्शन' : 'Quick actions'}
        </Text>

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#6366F1' }]}
            onPress={goAddItems}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name="add-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>
              {isHindi ? 'नया आइटम' : 'Add item'}
            </Text>
            <Text style={styles.quickSub} numberOfLines={2}>
              {isHindi
                ? 'बीज, खाद, कीटनाशक जैसे नए प्रोडक्ट जोड़ें'
                : 'Add new seeds, fertilizers and products'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#1D4ED8', marginRight: 0 }]}
            onPress={goViewItems}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name="list-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>
              {isHindi ? 'आइटम लिस्ट' : 'View items'}
            </Text>
            <Text style={styles.quickSub} numberOfLines={2}>
              {isHindi
                ? 'inventory के सभी आइटम देखें और edit करें'
                : 'View and edit all items in inventory'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Quick Action for Shop */}
        <TouchableOpacity
          style={styles.fullQuickCard}
          onPress={() => router.push('/(shop-partner)/wallet')}
        >
          <View style={[styles.quickIconWrap, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.fullQuickTitle}>
              {isHindi ? 'वॉलेट और कमाई' : 'Wallet & Earnings'}
            </Text>
            <Text style={styles.fullQuickSub}>
              {isHindi ? 'अपनी कुल बिक्री और कमाई देखें' : 'View your total sales and earnings'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { width: 26, height: 26, resizeMode: 'contain' },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  topInfoRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  greetSub: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  greetHint: { fontSize: 12, color: '#6B7280', marginTop: 4 },

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

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: { // This style is no longer used for the main stats but kept if other parts of the app use it.
    width: '48%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  statLabelTop: { fontSize: 12, fontWeight: '600', color: '#111827' },
  statSubLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  totalMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '600' },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  quickIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00000022',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickSub: {
    fontSize: 11,
    color: '#E5E7EB',
    marginTop: 2,
  },

  // New styles for dashboard
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  statusBoxCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  fullQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#00000010',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginTop: 10,
  },
  fullQuickTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fullQuickSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
