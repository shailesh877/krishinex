import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

export default function MilkPartnerHistoryScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [adminCommissionPercent, setAdminCommissionPercent] = useState<number>(10);
  const [summary, setSummary] = useState<any>({
    totalLogs: 0,
    totalCollectedLiters: 0,
    totalDeliveredLiters: 0,
    totalCollectionPayout: 0,
    totalDeliveryValue: 0,
    totalPlatformFee: 0,
    totalPartnerSalesEarnings: 0,
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'sell' | 'buy'>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'Morning' | 'Evening'>('all');
  const [search, setSearch] = useState('');

  // Expandable cards state (tap to reveal breakdown)
  const [expandedIds, setExpandedIds] = useState<{ [id: string]: boolean }>({});

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchHistory = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      let url = `${BASE_API_URL}/milk/partner/history?type=${typeFilter}&shift=${shiftFilter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
        if (data.summary) setSummary(data.summary);
        if (data.adminCommissionPercent !== undefined) {
          setAdminCommissionPercent(data.adminCommissionPercent);
        }
      } else {
        showAlert(
          hi ? 'त्रुटि' : 'Error',
          data.error || (hi ? 'इतिहास लोड करने में विफल।' : 'Failed to load history.')
        );
      }
    } catch (err: any) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, shiftFilter, search, hi]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const renderHeader = () => {
    const totalPartnerEarned = (summary.totalPartnerSalesEarnings !== undefined && summary.totalPartnerSalesEarnings !== null && summary.totalPartnerSalesEarnings > 0)
      ? Number(summary.totalPartnerSalesEarnings)
      : logs
        .filter(l => l.type === 'buy' && l.status === 'Completed')
        .reduce((sum, l) => sum + (Number(l.partnerEarning) || Math.round((Number(l.totalAmount || 0) * 0.9) * 100) / 100), 0);

    return (
      <View style={styles.headerContainer}>
        {/* TOP NAVIGATION BAR */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.navTitleBox}>
            <Text style={styles.navTitle}>
              {hi ? 'खरीद व बिक्री इतिहास' : 'Purchase & Sales History'}
            </Text>
            <Text style={styles.navSub}>
              {hi ? 'सभी संकलन और वितरण का सम्पूर्ण रिकॉर्ड' : 'Comprehensive records of collections & deliveries'}
            </Text>
          </View>
        </View>

        {/* SUMMARY BANNER */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryBadge}>
              <Ionicons name="bar-chart" size={12} color="#38BDF8" />
              <Text style={styles.summaryBadgeText}>
                {hi ? `कुल रिकॉर्ड्स: ${summary.totalLogs || logs.length}` : `Total Logs: ${summary.totalLogs || logs.length}`}
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            {/* COLLECTION / PURCHASE METRIC */}
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHead}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.summaryItemLabel}>{hi ? 'दूध खरीद' : 'Purchased'}</Text>
              </View>
              <Text style={styles.summaryItemLiters}>
                {summary.totalCollectedLiters || 0}
                <Text style={styles.summaryItemUnit}> L</Text>
              </Text>
              <Text style={styles.summaryItemValue}>
                ₹{Number(summary.totalCollectionPayout || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* DELIVERY / SALES METRIC */}
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHead}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.summaryItemLabel}>{hi ? 'दूध बिक्री' : 'Delivered'}</Text>
              </View>
              <Text style={styles.summaryItemLiters}>
                {summary.totalDeliveredLiters || 0}
                <Text style={styles.summaryItemUnit}> L</Text>
              </Text>
              <Text style={styles.summaryItemValue}>
                ₹{totalPartnerEarned.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* SEARCH BAR */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={hi ? 'नाम, मोबाइल, पता खोजें...' : 'Search by name, phone, address...'}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={fetchHistory}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER 1: TYPE (ALL / PURCHASE / SALES) */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{hi ? 'प्रकार चुनें:' : 'Record Type:'}</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.pill, typeFilter === 'all' && styles.pillActive]}
              onPress={() => setTypeFilter('all')}
            >
              <Text style={[styles.pillText, typeFilter === 'all' && styles.pillTextActive]}>
                {hi ? 'सभी (All)' : 'All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, typeFilter === 'sell' && styles.pillActiveGreen]}
              onPress={() => setTypeFilter('sell')}
            >
              <Ionicons
                name="water"
                size={13}
                color={typeFilter === 'sell' ? '#FFFFFF' : '#059669'}
              />
              <Text style={[styles.pillText, typeFilter === 'sell' && styles.pillTextActive]}>
                {hi ? 'दूध खरीद (Purchase)' : 'Purchase'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, typeFilter === 'buy' && styles.pillActiveBlue]}
              onPress={() => setTypeFilter('buy')}
            >
              <Ionicons
                name="bicycle"
                size={13}
                color={typeFilter === 'buy' ? '#FFFFFF' : '#2563EB'}
              />
              <Text style={[styles.pillText, typeFilter === 'buy' && styles.pillTextActive]}>
                {hi ? 'दूध बिक्री (Sales)' : 'Sales'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTER 2: SHIFT (ALL / MORNING / EVENING) */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{hi ? 'शिफ्ट चुनें:' : 'Shift:'}</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.pill, shiftFilter === 'all' && styles.pillActive]}
              onPress={() => setShiftFilter('all')}
            >
              <Text style={[styles.pillText, shiftFilter === 'all' && styles.pillTextActive]}>
                {hi ? 'दोनों शिफ्ट' : 'All Shifts'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, shiftFilter === 'Morning' && styles.pillActive]}
              onPress={() => setShiftFilter('Morning')}
            >
              <Ionicons
                name="sunny-outline"
                size={13}
                color={shiftFilter === 'Morning' ? '#FFFFFF' : '#D97706'}
              />
              <Text style={[styles.pillText, shiftFilter === 'Morning' && styles.pillTextActive]}>
                {hi ? 'सुबह (Morning)' : 'Morning'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, shiftFilter === 'Evening' && styles.pillActive]}
              onPress={() => setShiftFilter('Evening')}
            >
              <Ionicons
                name="moon-outline"
                size={13}
                color={shiftFilter === 'Evening' ? '#FFFFFF' : '#4F46E5'}
              />
              <Text style={[styles.pillText, shiftFilter === 'Evening' && styles.pillTextActive]}>
                {hi ? 'शाम (Evening)' : 'Evening'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>
            {hi ? `इतिहास सूची (${logs.length})` : `History Records (${logs.length})`}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPurchase = item.type === 'sell'; // 'sell' type in DB = partner buying from farmer
    const isMorning = item.shift === 'Morning';
    const isCompleted = item.status === 'Completed';

    const sub = item.subscriptionId || {};
    const u = item.userId || {};
    const name = sub.name || u.name || (isPurchase ? 'Dairy Farmer' : 'Milk Customer');
    const phone = sub.phone || u.phone || '';
    const address = sub.address || '';
    const landmark = sub.landmark || '';

    let dateFormatted = 'N/A';
    if (item.date) {
      try {
        const d = new Date(item.date);
        dateFormatted = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch (e) {
        dateFormatted = String(item.date);
      }
    }

    const logId = item._id || `${item.subscriptionId?._id || ''}_${item.date}_${item.shift}`;
    const isExpanded = !!expandedIds[logId];

    const grossAmount = Number(item.totalAmount || 0);
    const feePercent = (item.adminCommissionPercent !== undefined && item.adminCommissionPercent !== null)
      ? item.adminCommissionPercent
      : (adminCommissionPercent || 10);
    const platformFee = (item.adminCutAmount !== undefined && item.adminCutAmount !== null && item.adminCutAmount > 0)
      ? Number(item.adminCutAmount)
      : Math.round((grossAmount * (feePercent / 100)) * 100) / 100;
    const netEarning = (item.partnerEarning !== undefined && item.partnerEarning !== null && item.partnerEarning > 0)
      ? Number(item.partnerEarning)
      : Math.round((grossAmount - platformFee) * 100) / 100;

    return (
      <TouchableOpacity
        style={[styles.itemCard, isExpanded && styles.itemCardExpanded]}
        onPress={() => toggleExpand(logId)}
        activeOpacity={0.88}
      >
        {/* CARD TOP ROW */}
        <View style={styles.itemCardTop}>
          <View style={styles.badgeRow}>
            {/* TYPE BADGE */}
            <View style={[
              styles.typeBadge,
              { backgroundColor: isPurchase ? '#ECFDF5' : '#EFF6FF' }
            ]}>
              <Ionicons
                name={isPurchase ? 'water' : 'bicycle'}
                size={12}
                color={isPurchase ? '#059669' : '#2563EB'}
              />
              <Text style={[
                styles.typeBadgeText,
                { color: isPurchase ? '#059669' : '#2563EB' }
              ]}>
                {isPurchase
                  ? hi ? 'दूध खरीद (Purchase)' : 'Purchase'
                  : hi ? 'दूध बिक्री (Sales)' : 'Sales'}
              </Text>
            </View>

            {/* SHIFT BADGE */}
            <View style={styles.shiftBadge}>
              <Ionicons
                name={isMorning ? 'sunny-outline' : 'moon-outline'}
                size={11}
                color={isMorning ? '#D97706' : '#4F46E5'}
              />
              <Text style={styles.shiftBadgeText}>
                {isMorning ? (hi ? 'सुबह' : 'Morning') : (hi ? 'शाम' : 'Evening')}
              </Text>
            </View>
          </View>

          {/* STATUS BADGE & EXPAND INDICATOR */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: isCompleted ? '#F0FDF4' : '#FEF2F2' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: isCompleted ? '#16A34A' : '#DC2626' }
              ]}>
                {isCompleted ? (hi ? 'पूर्ण ✓' : 'Completed') : (hi ? 'छोड़ा गया' : 'Skipped')}
              </Text>
            </View>

            {!isPurchase && isCompleted && (
              <View style={[styles.chevronBadge, isExpanded && styles.chevronBadgeExpanded]}>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={12}
                  color={isExpanded ? "#0284C7" : "#64748B"}
                />
              </View>
            )}
          </View>
        </View>

        {/* CUSTOMER / FARMER DETAILS */}
        <View style={styles.personRow}>
          <View style={styles.personCol}>
            <Text style={styles.personName}>{name}</Text>
            {phone ? (
              <TouchableOpacity
                style={styles.phoneChip}
                onPress={() => handleCall(phone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={11} color="#059669" />
                <Text style={styles.phoneText}>{phone}</Text>
              </TouchableOpacity>
            ) : null}
            {address ? (
              <Text style={styles.personAddress} numberOfLines={1}>
                {address}{landmark ? `, ${landmark}` : ''}
              </Text>
            ) : null}
          </View>

          {/* AMOUNT & QUANTITY DISPLAY */}
          <View style={styles.amountCol}>
            <Text style={styles.litersText}>
              {item.quantityLiters || 0}
              <Text style={styles.litersUnit}> L</Text>
            </Text>
            {isPurchase ? (
              <>
                <Text style={styles.amountTextPurchase}>
                  -₹{grossAmount.toFixed(2)}
                </Text>
                <Text style={styles.rateSubText}>
                  @ ₹{item.ratePerLiter || 0}/L
                </Text>
                <Text style={styles.purchaseSubLbl}>
                  {hi ? 'किसान भुगतान' : 'Farmer Payout'}
                </Text>
              </>
            ) : isCompleted ? (
              <>
                <Text style={styles.amountTextNet}>
                  +₹{netEarning.toFixed(2)}
                </Text>
                <View style={styles.receivedBadge}>
                  <Ionicons name="wallet" size={10} color="#059669" />
                  <Text style={styles.receivedBadgeText}>
                    {hi ? 'वॉलेट में मिला' : 'Net Received'}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.amountTextSkipped}>₹0.00</Text>
            )}
          </View>
        </View>

        {/* TRANSPARENT PRICING & PLATFORM FEE BREAKDOWN (FOR SALES) - SHOWN ON TAP */}
        {!isPurchase && isCompleted && isExpanded && (
          <View style={styles.salesBreakdownCard}>
            <View style={styles.breakdownHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="receipt-outline" size={12} color="#0369A1" />
                <Text style={styles.breakdownTitle}>
                  {hi ? 'मूल्य व शुल्क विवरण (Price Breakdown)' : 'Earnings Breakdown'}
                </Text>
              </View>
              <Text style={styles.breakdownFeePercentBadge}>
                {hi ? `${feePercent}% प्लेटफ़ॉर्म शुल्क` : `${feePercent}% Platform Fee`}
              </Text>
            </View>

            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownCol}>
                <Text style={styles.breakdownLbl}>{hi ? 'दूध मूल्य (Gross)' : 'Milk Price'}</Text>
                <Text style={styles.breakdownVal}>₹{grossAmount.toFixed(2)}</Text>
                <Text style={styles.breakdownRateSub}>@{item.ratePerLiter || 0}/L</Text>
              </View>

              <Text style={styles.breakdownOperator}>-</Text>

              <View style={styles.breakdownCol}>
                <Text style={styles.breakdownLblFee}>{hi ? 'शुल्क (Fee)' : 'Platform Fee'}</Text>
                <Text style={styles.breakdownValFee}>-₹{platformFee.toFixed(2)}</Text>
                <Text style={styles.breakdownRateSubFee}>({feePercent}%)</Text>
              </View>

              <Text style={styles.breakdownOperator}>=</Text>

              <View style={[styles.breakdownCol, styles.breakdownColNet]}>
                <Text style={styles.breakdownLblNet}>{hi ? 'आपको मिला (Net)' : 'You Received'}</Text>
                <Text style={styles.breakdownValNet}>₹{netEarning.toFixed(2)}</Text>
                <Text style={styles.breakdownRateSubNet}>{hi ? 'वॉलेट में जमा ✓' : 'In Wallet ✓'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* QUALITY METRICS (FAT / SNF) FOR PURCHASE */}
        {(item.fatPercentage || item.snfPercentage) ? (
          <View style={styles.qualityStrip}>
            {item.fatPercentage ? (
              <View style={styles.qualityItem}>
                <Ionicons name="flask-outline" size={12} color="#059669" />
                <Text style={styles.qualityLbl}>FAT: </Text>
                <Text style={styles.qualityVal}>{item.fatPercentage}%</Text>
              </View>
            ) : null}
            {item.snfPercentage ? (
              <View style={styles.qualityItem}>
                <Ionicons name="cube-outline" size={12} color="#2563EB" />
                <Text style={styles.qualityLbl}>SNF: </Text>
                <Text style={styles.qualityVal}>{item.snfPercentage}%</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* FOOTER: DATE, NOTES & EXPAND PROMPT */}
        <View style={styles.cardFooter}>
          <View style={styles.dateCol}>
            <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>

          {!isPurchase && isCompleted ? (
            <View style={[styles.tapPromptRow, isExpanded && styles.tapPromptRowActive]}>
              <Text style={[styles.tapPromptText, isExpanded && styles.tapPromptTextActive]}>
                {isExpanded
                  ? (hi ? 'विवरण छुपाएं' : 'Hide details')
                  : (hi ? 'शुल्क व कमाई विवरण देखें' : 'View fee breakdown')}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={11}
                color={isExpanded ? "#DC2626" : "#0284C7"}
              />
            </View>
          ) : item.notes ? (
            <Text style={styles.notesText} numberOfLines={1}>
              📝 {item.notes}
            </Text>
          ) : null}
        </View>

        {/* EXPANDED NOTES IF ANY */}
        {isExpanded && item.notes && !isPurchase && (
          <View style={styles.expandedNotesRow}>
            <Text style={styles.expandedNotesText}>
              📝 {hi ? 'टिप्पणी:' : 'Note:'} {item.notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>
            {hi ? 'इतिहास लोड हो रहा है...' : 'Loading history records...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => item._id || String(index)}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई रिकॉर्ड नहीं मिला' : 'No Records Found'}
              </Text>
              <Text style={styles.emptySub}>
                {hi
                  ? 'चयनित फिल्टर या खोज के अनुसार कोई रिकॉर्ड उपलब्ध नहीं है।'
                  : 'No entries match your selected type, shift, or search keyword.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { backgroundColor: '#F8FAFC', paddingBottom: 40 },
  headerContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: '600' },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleBox: { flex: 1 },
  navTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  navSub: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 },

  // Summary Card
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryBadgeText: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: { flex: 1 },
  summaryItemHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  summaryItemLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  summaryItemLiters: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  summaryItemUnit: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  summaryItemValue: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', marginTop: 2 },
  summaryItemValueNet: { color: '#38BDF8', fontSize: 13, fontWeight: '900', marginTop: 2 },
  summaryFeeSub: { color: '#94A3B8', fontSize: 9, fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, height: 42, backgroundColor: 'rgba(255, 255, 255, 0.15)', marginHorizontal: 16 },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Filter Pills
  filterSection: { marginBottom: 10 },
  filterLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6 },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  pillActiveGreen: { backgroundColor: '#059669', borderColor: '#059669' },
  pillActiveBlue: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#FFFFFF' },

  listSectionHeader: { marginTop: 6 },
  listSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  // Item Cards
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  itemCardExpanded: {
    borderColor: '#38BDF8',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  chevronBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronBadgeExpanded: {
    backgroundColor: '#E0F2FE',
  },
  tapPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  tapPromptRowActive: {
    backgroundColor: '#FEF2F2',
  },
  tapPromptText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  tapPromptTextActive: {
    color: '#DC2626',
  },
  expandedNotesRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expandedNotesText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shiftBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },

  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  personCol: { flex: 1, marginRight: 10 },
  personName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  phoneText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  personAddress: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '500' },

  amountCol: { alignItems: 'flex-end' },
  litersText: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  litersUnit: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  amountText: { fontSize: 13, fontWeight: '800', color: '#059669', marginTop: 1 },
  amountTextNet: { fontSize: 14, fontWeight: '900', color: '#059669', marginTop: 1 },
  amountTextPurchase: { fontSize: 13, fontWeight: '800', color: '#DC2626', marginTop: 1 },
  amountTextSkipped: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginTop: 1 },
  purchaseSubLbl: { fontSize: 9, color: '#DC2626', fontWeight: '700', marginTop: 1 },
  receivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  receivedBadgeText: { fontSize: 9, fontWeight: '800', color: '#059669' },
  rateSubText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  // Sales Breakdown Card
  salesBreakdownCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  breakdownTitle: { fontSize: 10, fontWeight: '800', color: '#0369A1' },
  breakdownFeePercentBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownCol: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownColNet: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  breakdownOperator: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
    paddingHorizontal: 2,
  },
  breakdownLbl: { fontSize: 9, color: '#64748B', fontWeight: '600', marginBottom: 1 },
  breakdownVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  breakdownRateSub: { fontSize: 9, color: '#64748B', fontWeight: '500' },
  breakdownLblFee: { fontSize: 9, color: '#DC2626', fontWeight: '700', marginBottom: 1 },
  breakdownValFee: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  breakdownRateSubFee: { fontSize: 9, color: '#EF4444', fontWeight: '600' },
  breakdownLblNet: { fontSize: 9, color: '#059669', fontWeight: '800', marginBottom: 1 },
  breakdownValNet: { fontSize: 13, fontWeight: '900', color: '#059669' },
  breakdownRateSubNet: { fontSize: 9, color: '#059669', fontWeight: '700' },

  qualityStrip: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qualityItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  qualityLbl: { fontSize: 10, fontWeight: '600', color: '#64748B' },
  qualityVal: { fontSize: 11, fontWeight: '800', color: '#0F172A' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  notesText: { fontSize: 10, color: '#64748B', fontWeight: '500', maxWidth: '60%' },

  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#475569', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 18 },
});
