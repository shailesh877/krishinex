// app/my-sell.tsx — KHETIFY "My Sell Requests (Form History)" — premium + sticky filter

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

type SellRequestForm = {
  _id: string;
  cropName: string;
  variety: string;
  quantity: string;
  originalQuantity?: string;
  expectedPrice: string;
  createdAt: string;
  mandi?: { name: string };
  moisture?: string;
  bagCount?: string;
  notes?: string;
  status: string;
  assignedTo?: { name: string; businessName?: string };
  otp?: string;
  adminPrice?: number;
  totalAmount?: number;
};

type FilterKey = 'all' | 'wheat' | 'maize' | 'paddy' | 'other';

const calculateTotalAmount = (qtyStr: string, rate: number) => {
  if (!qtyStr || !rate) return 0;
  // Try to find KG value first as per user's formula (KG / 100)
  const kgMatch = qtyStr.match(/([\d.]+)\s*KG/i);
  if (kgMatch) {
    const kgs = parseFloat(kgMatch[1]);
    return Math.round((kgs / 100) * rate);
  }
  // Fallback to Quintal if KG not found
  const qtlMatch = qtyStr.match(/([\d.]+)\s*Quintal/i);
  if (qtlMatch) {
    return Math.round(parseFloat(qtlMatch[1]) * rate);
  }
  // Last resort: raw number
  const numMatch = qtyStr.match(/([\d.]+)/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]) * rate);
  }
  return 0;
};

export default function MySellScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [forms, setForms] = useState<SellRequestForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const res = await authApi.getMySellRequests();
      setForms(res.data);
    } catch (e) {
      console.error('Fetch sell requests error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const translateCrop = (name: string) => {
    if (!hi) return name;
    const lower = name.toLowerCase();
    const map: Record<string, string> = {
      'wheat': 'गेहूं',
      'maize': 'मक्का',
      'paddy': 'धान',
      'rice': 'चावल',
      'mustard': 'सरसों',
      'onion': 'प्याज',
      'potato': 'आलू',
      'garlic': 'लहसुन',
      'tomato': 'टमाटर',
      'soybean': 'सोयाबीन',
      'gram': 'चना',
      'lentil': 'मसूर',
      'pea': 'मटर',
    };
    return map[lower] || name;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
  };

  const t = {
    title: hi ? 'मेरी सेल रिक्वेस्ट' : 'My Sell Requests',
    sub: hi
      ? 'कब-कब कौन सा फॉर्म भरा था'
      : 'Forms you have submitted',
    summaryLabel: hi ? 'कुल भरी गई रिक्वेस्ट' : 'Total requests filled',
    cropFilterAll: hi ? 'सभी' : 'All',
    cropFilterWheat: hi ? 'गेहूं' : 'Wheat',
    cropFilterMaize: hi ? 'मक्का' : 'Maize',
    cropFilterPaddy: hi ? 'धान' : 'Paddy',
    cropFilterOther: hi ? 'अन्य' : 'Other',
    mandiLabel: hi ? 'पसंदीदा मंडी' : 'Preferred mandi',
    qtyLabel: hi ? 'मात्रा' : 'Quantity',
    rateLabel: hi ? 'उम्मीदित रेट' : 'Expected rate',
    varietyLabel: hi ? 'वैरायटी' : 'Variety',
    moistureLabel: hi ? 'नमी' : 'Moisture',
    bagLabel: hi ? 'बोरी' : 'Bags',
    priceLabel: hi ? 'कीमत' : 'Price',
    finalPriceLabel: hi ? 'अंतिम कीमत (प्रति क्विंटल)' : 'Final Price (Per Qtl)',
    otpLabel: hi ? 'ओटीपी (OTP)' : 'OTP (Code)',
    otpWarning: hi ? 'यह OTP तभी शेयर करें जब खरीदार आपका माल प्राप्त कर ले।' : 'Share this OTP only when the buyer has received your items.',
    notesLabel: hi ? 'नोट' : 'Notes',
    buyerLabel: hi ? 'खरीदार (Assigned)' : 'Assigned Buyer',
    expectedQtyLabel: hi ? 'उम्मीदित मात्रा' : 'Expected Quantity',
    finalQtyLabel: hi ? 'बेची गई मात्रा' : 'Final Quantity',
    totalAmountLabel: hi ? 'कुल बिक्री राशि' : 'Total Sale Amount',
    noData: hi ? 'कोई रिक्वेस्ट नहीं मिली' : 'No requests found',
  };

  const filteredForms = useMemo(() => {
    if (filter === 'all') return forms;
    return forms.filter((f: SellRequestForm) => {
      const name = f.cropName.toLowerCase();
      if (filter === 'wheat') return name.includes('wheat') || name.includes('गेहूं');
      if (filter === 'maize') return name.includes('maize') || name.includes('मक्का');
      if (filter === 'paddy') return name.includes('paddy') || name.includes('धान') || name.includes('rice');
      if (filter === 'other') return !name.includes('wheat') && !name.includes('गेहूं') && !name.includes('maize') && !name.includes('मक्का') && !name.includes('paddy') && !name.includes('धान') && !name.includes('rice');
      return true;
    });
  }, [filter, forms]);

  const totalCount = forms.length;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* TOP SUMMARY + STICKY FILTER */}
      <View style={styles.topContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{t.summaryLabel}</Text>
              <Text style={styles.summaryValue}>{totalCount}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color="#047857"
              />
              <Text style={styles.summaryBadgeText}>
                {hi ? 'रिक्वेस्ट हिस्ट्री' : 'Request history'}
              </Text>
            </View>
          </View>

          {/* <View style={styles.summaryStrip}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.summaryStripText}>
              {hi
                ? 'यहाँ सिर्फ रिक्वेस्ट फॉर्म का डेटा दिखता है, डील का डेटा Sell orders में रहेगा।'
                : 'This page only shows form data, deals live in Sell orders.'}
            </Text>
          </View> */}
        </View>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <FilterChip
              label={t.cropFilterAll}
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <FilterChip
              label={t.cropFilterWheat}
              active={filter === 'wheat'}
              onPress={() => setFilter('wheat')}
            />
            <FilterChip
              label={t.cropFilterMaize}
              active={filter === 'maize'}
              onPress={() => setFilter('maize')}
            />
            <FilterChip
              label={t.cropFilterPaddy}
              active={filter === 'paddy'}
              onPress={() => setFilter('paddy')}
            />
            <FilterChip
              label={t.cropFilterOther}
              active={filter === 'other'}
              onPress={() => setFilter('other')}
            />
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.sub}</Text>
        </View>
      </View>

      {/* ONLY LIST SCROLLS */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[KHETIFY_GREEN_DARK]} />
        }
      >
        <View style={styles.listCard}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={KHETIFY_GREEN_DARK} />
            </View>
          ) : filteredForms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.noData}</Text>
            </View>
          ) : (
            filteredForms.map((f: SellRequestForm, index) => {
              const dateObj = new Date(f.createdAt);
              const formattedDate = dateObj.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }) + ' • ' + dateObj.toLocaleTimeString(hi ? 'hi-IN' : 'en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <View
                  key={f._id}
                  style={[
                    styles.formCard,
                    index === filteredForms.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  {/* Top row: crop + date + chip */}
                  <View style={styles.formHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.iconWrap}>
                        <Ionicons
                          name="leaf-outline"
                          size={18}
                          color={KHETIFY_GREEN_DARK}
                        />
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.cropTitle} numberOfLines={1}>
                          {translateCrop(f.cropName)} {`(#${f._id.slice(-6).toUpperCase()})`}
                        </Text>
                        <Text style={styles.formDate}>{formattedDate}</Text>
                      </View>
                    </View>

                    <View style={[styles.cropChip, { backgroundColor: f.status === 'completed' ? '#ECFDF5' : f.status === 'cancelled' ? '#FEF2F2' : '#EFF6FF' }]}>
                      <Text style={[styles.cropChipText, { color: f.status === 'completed' ? '#047857' : f.status === 'cancelled' ? '#DC2626' : '#2563EB' }]}>
                        {hi ? (f.status === 'pending' ? 'लंबित' : f.status === 'accepted' ? 'स्वीकृत' : f.status === 'completed' ? 'पूर्ण' : 'रद्द') : f.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Form fields */}
                  <View style={styles.cardContent}>
                    {f.status === 'accepted' && f.otp ? (
                      <View style={styles.otpSection}>
                        <View style={styles.otpBanner}>
                          <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
                          <Text style={styles.otpText}>{t.otpLabel}: {f.otp}</Text>
                        </View>
                        <Text style={styles.otpWarningText}>{t.otpWarning}</Text>
                      </View>
                    ) : null}

                    <FormRow
                      label={hi ? 'रिक्वेस्ट आईडी' : 'Request ID'}
                      value={`#${f._id.slice(-6).toUpperCase()}`}
                    />
                    <FormRow
                      label={t.varietyLabel}
                      value={f.variety || (hi ? '—' : '—')}
                    />
                    <FormRow
                      label={t.expectedQtyLabel}
                      value={f.originalQuantity || f.quantity}
                    />
                    <FormRow
                      label={t.rateLabel}
                      value={f.expectedPrice}
                    />
                    <FormRow
                      label={t.mandiLabel}
                      value={f.mandi?.name || (hi ? '—' : '—')}
                    />
                    {f.assignedTo && (f.assignedTo.name || f.assignedTo.businessName) ? (
                      <FormRow
                        label={t.buyerLabel}
                        value={f.assignedTo.name || f.assignedTo.businessName || ''}
                      />
                    ) : null}
                    {f.adminPrice ? (
                       <FormRow
                        label={t.finalPriceLabel}
                        value={`₹${f.adminPrice}/Q`}
                      />
                    ) : null}
                    {f.status === 'completed' || f.totalAmount ? (
                      <>
                        <FormRow
                          label={t.finalQtyLabel}
                          value={f.quantity}
                        />
                        <FormRow
                          label={t.totalAmountLabel}
                          value={`₹${f.totalAmount || calculateTotalAmount(f.quantity, f.adminPrice || 0)}`}
                        />
                      </>
                    ) : null}
                    {f.moisture ? (
                      <FormRow
                        label={t.moistureLabel}
                        value={f.moisture}
                      />
                    ) : null}
                    {f.bagCount ? (
                      <FormRow
                        label={t.bagLabel}
                        value={f.bagCount}
                      />
                    ) : null}
                    {f.notes ? (
                      <View style={styles.formRowMulti}>
                        <Text style={styles.formLabel}>{t.notesLabel}</Text>
                        <Text style={styles.formValueMulti} numberOfLines={3}>
                          {f.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type FormRowProps = {
  label: string;
  value: string;
};

function FormRow({ label, value }: FormRowProps) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <Text style={styles.formValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  topContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  summaryBadgeText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  summaryStrip: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStripText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },

  filterContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterScrollContent: {
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#F9FAFB',
  },

  sectionHeader: {
    marginTop: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },

  formCard: {
    borderBottomWidth: 0.7,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  formDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  cropChipText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },

  cardContent: {
    padding: 16,
  },
  otpSection: {
    marginBottom: 12,
  },
  otpBanner: {
    backgroundColor: '#0EA5E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  otpText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  otpWarningText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  formRowMulti: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  formValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  formValueMulti: {
    fontSize: 11,
    color: '#4B5563',
    maxWidth: '70%',
    textAlign: 'right',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});
