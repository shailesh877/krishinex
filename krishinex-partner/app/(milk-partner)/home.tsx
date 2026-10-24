import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';
import { getSocket } from '../../services/socket';

export default function MilkPartnerHomeScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const res = await fetch(`${BASE_API_URL}/milk/partner/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.dashboard) {
        setDashboard(data.dashboard);
        if (data.dashboard.partner?.status === 'pending') {
          router.replace('/(milk-partner)/approval-pending' as any);
        }
      }
    } catch (e) {
      console.error('Fetch Dashboard Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();

    // Realtime WebSocket listener for auto-refresh
    const s = getSocket();
    if (s) {
      const handleMilkEvent = () => {
        fetchDashboard();
      };
      s.on('milk_event', handleMilkEvent);
      return () => {
        s.off('milk_event', handleMilkEvent);
      };
    }
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const partner = dashboard?.partner || {};
  const currentMonthName = new Date().toLocaleString(hi ? 'hi-IN' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* KRISHINEX BRANDED HEADER WITH LIVE WEBSOCKET & NOTIFICATION BELL */}
      <MilkPartnerHeader
        partnerName={partner?.name}
        assignedRoute={partner?.assignedRoute}
        onRefresh={onRefresh}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>
              {hi ? 'डैशबोर्ड लोड हो रहा है...' : 'Loading Dashboard...'}
            </Text>
          </View>
        ) : (
          <>
            {/* MONTHLY SUMMARY BANNER */}
            <View style={styles.monthBanner}>
              <View style={styles.monthHeaderRow}>
                <Ionicons name="calendar-outline" size={16} color="#059669" />
                <Text style={styles.monthTitle}>
                  {hi ? `मासिक संकलन व वितरण (${currentMonthName})` : `Monthly Volume (${currentMonthName})`}
                </Text>
              </View>

              <View style={styles.kpiRow}>
                {/* 1. Monthly Milk Purchased / Collected */}
                <View style={styles.kpiCardPurchased}>
                  <LinearGradient
                    colors={['#ECFDF5', '#D1FAE5']}
                    style={styles.kpiCardGrad}
                  >
                    <View style={styles.kpiTop}>
                      <View style={styles.kpiIconBoxGreen}>
                        <Ionicons name="arrow-up" size={16} color="#059669" />
                      </View>
                      <Text style={styles.kpiBadgeGreen}>{hi ? 'खरीद' : 'Collected'}</Text>
                    </View>
                    <Text style={styles.kpiValueGreen}>
                      {dashboard?.monthlyPurchasedLiters || 0}
                      <Text style={styles.kpiUnit}> L</Text>
                    </Text>
                    <Text style={styles.kpiLabel}>
                      {hi ? 'कुल खरीदा गया दूध' : 'Total Milk Purchased'}
                    </Text>
                  </LinearGradient>
                </View>

                {/* 2. Monthly Milk Sold / Delivered */}
                <View style={styles.kpiCardSold}>
                  <LinearGradient
                    colors={['#EFF6FF', '#DBEAFE']}
                    style={styles.kpiCardGrad}
                  >
                    <View style={styles.kpiTop}>
                      <View style={styles.kpiIconBoxBlue}>
                        <Ionicons name="arrow-down" size={16} color="#2563EB" />
                      </View>
                      <Text style={styles.kpiBadgeBlue}>{hi ? 'बिक्री' : 'Delivered'}</Text>
                    </View>
                    <Text style={styles.kpiValueBlue}>
                      {dashboard?.monthlySoldLiters || 0}
                      <Text style={styles.kpiUnit}> L</Text>
                    </Text>
                    <Text style={styles.kpiLabel}>
                      {hi ? 'कुल बेचा गया दूध' : 'Total Milk Sold'}
                    </Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* TODAY'S PROGRESS OVERVIEW */}
            <View style={styles.todayCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="today-outline" size={16} color="#0F172A" />
                <Text style={styles.sectionTitle}>
                  {hi ? 'आज की गतिविधि (Today\'s Route Progress)' : 'Today\'s Progress'}
                </Text>
              </View>

              <View style={styles.todayStatsGrid}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{dashboard?.todayCollectedLiters || 0} L</Text>
                  <Text style={styles.statPillLbl}>{hi ? 'आज संकलित' : 'Today Collected'}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{dashboard?.todayDeliveredLiters || 0} L</Text>
                  <Text style={styles.statPillLbl}>{hi ? 'आज वितरित' : 'Today Delivered'}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{dashboard?.totalFarmers || 0}</Text>
                  <Text style={styles.statPillLbl}>{hi ? 'सक्रिय किसान' : 'Dairy Farmers'}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillNum}>{dashboard?.totalCustomers || 0}</Text>
                  <Text style={styles.statPillLbl}>{hi ? 'ग्राहक' : 'Subscribers'}</Text>
                </View>
              </View>
            </View>

            {/* SECTION: MAIN SERVICES */}
            <Text style={styles.optionsSectionTitle}>
              {hi ? 'मुख्य सेवाएं (Core Services)' : 'Core Services'}
            </Text>

            {/* OPTION 1: MILK PURCHASE (COLLECTION) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(milk-partner)/purchase' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="water" size={30} color="#059669" />
                </View>
                <View style={styles.actionTextCol}>
                  <View style={styles.actionBadgeRow}>
                    <Text style={styles.actionSubTag}>{hi ? 'किसान संकलन' : 'Farmer Collection'}</Text>
                  </View>
                  <Text style={styles.actionTitle}>
                    {hi ? 'दूध खरीद (Milk Purchase)' : 'Milk Purchase'}
                  </Text>
                  <Text style={styles.actionDesc}>
                    {hi
                      ? 'पंजीकृत किसानों से दूध संकलित करें, मात्रा और गुणवत्ता अनुसार दर तय करें।'
                      : 'Collect milk from dairy farmers, verify liters and set quality rate.'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* MILK SALES (DELIVERY) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(milk-partner)/sales' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGrad}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="bicycle" size={30} color="#2563EB" />
                </View>
                <View style={styles.actionTextCol}>
                  <View style={styles.actionBadgeRow}>
                    <Text style={styles.actionSubTag}>{hi ? 'ग्राहक आपूर्ति' : 'Consumer Delivery'}</Text>
                  </View>
                  <Text style={styles.actionTitle}>
                    {hi ? 'दूध बिक्री (Milk Sales)' : 'Milk Sales'}
                  </Text>
                  <Text style={styles.actionDesc}>
                    {hi
                      ? 'सक्रिय ग्राहकों को दूध की डिलीवरी करें, तुरंत वॉलेट कटौती करें।'
                      : 'Deliver milk to active subscribers & debit wallet.'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* HISTORY CARD */}
            <TouchableOpacity
              style={styles.routeListCard}
              onPress={() => router.push('/(milk-partner)/history' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.routeCardIconBox}>
                <Ionicons name="time" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeCardTitle}>
                  {hi ? 'सम्पूर्ण खरीद व बिक्री इतिहास' : 'Purchase & Sales History'}
                </Text>
                <Text style={styles.routeCardSub}>
                  {hi
                    ? 'अपनी पिछली सभी खरीद, बिक्री, FAT/SNF व देय भुगतानों का विवरण देखें।'
                    : 'View all past collections, deliveries, quality rates & payouts.'}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color="#059669" />
            </TouchableOpacity>

            {/* VEHICLE & CANISTER STATS */}
            <View style={styles.vehicleInfoCard}>
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleCol}>
                  <Ionicons name="cube-outline" size={16} color="#059669" />
                  <Text style={styles.vehicleLbl}>{hi ? 'कैन क्षमता:' : 'Capacity:'}</Text>
                  <Text style={styles.vehicleVal}>{partner?.canisterCapacityLiters || 40} L</Text>
                </View>
                <View style={styles.vehicleDivider} />
                <View style={styles.vehicleCol}>
                  <Ionicons name="car-outline" size={16} color="#2563EB" />
                  <Text style={styles.vehicleLbl}>{hi ? 'वाहन:' : 'Vehicle:'}</Text>
                  <Text style={styles.vehicleVal}>{partner?.vehicleType || 'Bike'}</Text>
                </View>
                <View style={styles.vehicleDivider} />
                <View style={styles.vehicleCol}>
                  <Ionicons name="flask-outline" size={16} color="#7C3AED" />
                  <Text style={styles.vehicleLbl}>{hi ? 'जांच किट:' : 'Kit:'}</Text>
                  <Text style={styles.vehicleVal}>{partner?.hasTestingKit ? 'Yes ✓' : 'No'}</Text>
                </View>
              </View>
            </View>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  partnerRoleTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  partnerRoleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  routeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  monthBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCardPurchased: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  kpiCardSold: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  kpiCardGrad: {
    padding: 14,
    borderRadius: 16,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBoxGreen: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadgeGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiValueGreen: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
  },
  kpiIconBoxBlue: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadgeBlue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiValueBlue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E40AF',
  },
  kpiUnit: {
    fontSize: 14,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  todayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  todayStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    alignItems: 'center',
    flex: 1,
  },
  statPillNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statPillLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  optionsSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionCard: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  actionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  actionIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  actionOptionTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionSubTag: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'center',
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  actionDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
    fontWeight: '500',
  },
  routeListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    gap: 12,
  },
  routeCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  routeCardSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
    marginTop: 2,
  },
  vehicleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  vehicleCol: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  vehicleLbl: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  vehicleVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  vehicleDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
});
