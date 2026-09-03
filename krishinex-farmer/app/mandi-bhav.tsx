// app/mandi-bhav.tsx — Mandi-wise 7 दिन का भाव + crop filter

import React, { useState, useEffect } from 'react';
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
}
  from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';

const SHADOW_COLOR = '#00000020';
const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const GREEN_LIGHT = '#a3d546ff';

let RAM_CACHE_MANDI_LIST: any = null;
let RAM_CACHE_MANDI_CROPS: any = null;
let RAM_CACHE_MANDI_PRICES: Record<string, any> = {};
let RAM_CACHE_MANDI_TIMESTAMP = 0;

export default function MandiBhavScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [mandis, setMandis] = useState<any[]>([]);
  const [selectedMandi, setSelectedMandi] = useState<any>(null);
  const [mandiDropdownOpen, setMandiDropdownOpen] = useState(false);
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [cropData, setCropData] = useState<any[]>([]);
  const [loadingMandis, setLoadingMandis] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMandis();
    fetchCrops();
  }, []);

  useEffect(() => {
    if (selectedMandi && selectedCrop) {
      fetchPrices();
    }
  }, [selectedMandi, selectedCrop]);

  const fetchCrops = async (signal?: AbortSignal) => {
    try {
      const res = await authApi.getCrops({ signal });
      const sortedCrops = (res.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCrops(sortedCrops);
        if (sortedCrops.length > 0) {
        setSelectedCrop((prev: string) => prev || sortedCrops[0].name);
      }
      return sortedCrops;
    } catch (e: any) {
      if (e.name !== 'CanceledError') console.error('Fetch crops error', e);
      return null;
    } finally {
      setLoadingCrops(false);
    }
  };

  const fetchMandis = async (signal?: AbortSignal) => {
    try {
      const res = await authApi.getMandis({ signal });
      const sortedMandis = (res.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setMandis(sortedMandis);
      if (sortedMandis.length > 0) {
        setSelectedMandi((prev: any) => prev || sortedMandis[0]);
      }
      return sortedMandis;
    } catch (e: any) {
      if (e.name !== 'CanceledError') console.error('Fetch mandis error', e);
      return null;
    } finally {
      setLoadingMandis(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    RAM_CACHE_MANDI_PRICES = {};
    await Promise.all([fetchMandis(), fetchCrops()]);
    if (selectedMandi && selectedCrop) {
      await fetchPrices(undefined, true);
    }
    setRefreshing(false);
  };

  const fetchPrices = async (signal?: AbortSignal, forceRefresh = false) => {
    if (!selectedMandi || !selectedCrop || crops.length === 0) return;
    const cacheKey = `${selectedMandi._id}_${selectedCrop}`;
    if (!forceRefresh && RAM_CACHE_MANDI_PRICES[cacheKey]) {
      setCropData(RAM_CACHE_MANDI_PRICES[cacheKey]);
      setLoadingPrices(false);
      return;
    }
    setLoadingPrices(true);
    try {
      // Find the crop object to get the internal name for backend
      const cropObj = crops.find(c => c.name === selectedCrop);
      if (!cropObj) {
        console.warn('Crop object not found for:', selectedCrop);
        setLoadingPrices(false);
        return;
      }
      const apiCrop = cropObj.name;

      const res = await authApi.getMandiPrices(selectedMandi._id, apiCrop, { signal });

      // Generate full 7-day list starting from today
      const full7Days = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dStr = d.toDateString();
        
        // Find if we have backend data for this date
        const item = res.data.find((p: any) => new Date(p.date).toDateString() === dStr);
        
        let dateLabel = d.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' });
        const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();
        const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();

        if (dStr === todayStr) dateLabel = hi ? 'आज' : 'Today';
        else if (dStr === yesterdayStr) dateLabel = hi ? 'कल' : 'Yesterday';

        full7Days.push({
          date: d,
          dateLabel,
          price: item ? item.price : null,
          isPlaceholder: !item
        });
      }

      RAM_CACHE_MANDI_PRICES[cacheKey] = full7Days;
      setCropData(full7Days);
    } catch (e: any) {
      if (e.name !== 'CanceledError') console.error('Fetch prices error', e);
    } finally {
      setLoadingPrices(false);
    }
  };

  const t = {
    title: hi ? 'मंडी भाव' : 'Mandi Prices',
    sub: hi
      ? 'आज से पिछले 7 दिन तक के मंडी भाव देखें'
      : 'View mandi prices for today and last 7 days',
    cropLabel: hi ? 'फसल चुनें' : 'Select crop',
    mandiLabel: hi ? 'मंडी चुनें' : 'Select mandi',
    unit: hi ? '₹ / क्विंटल' : '₹ / Quintal',
    todayText: hi ? 'आज' : 'Today',
    loading: hi ? 'मंडी लोड हो रही है...' : 'Loading mandis...',
    noMandis: hi ? 'कोई मंडी उपलब्ध नहीं है' : 'No mandis available',
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.title}</Text>

        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_DARK]} />
        }
      >
        {/* TOP INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="trending-up-outline" size={22} color={GREEN_DARK} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.infoTitle}>{t.title}</Text>
            <Text style={styles.infoSub}>{t.sub}</Text>
          </View>
        </View>

        {/* MANDI DROPDOWN */}
        <Text style={styles.sectionLabel}>{t.mandiLabel}</Text>
        <View style={styles.mandiDropdownWrapper}>
          <TouchableOpacity
            style={styles.mandiDropdownBtn}
            onPress={() => setMandiDropdownOpen((p) => !p)}
            activeOpacity={0.9}
          >
            <Ionicons name="business-outline" size={16} color={GREEN_DARK} />
            <Text style={styles.mandiDropdownText} numberOfLines={1}>
              {loadingMandis ? t.loading : selectedMandi ? (selectedMandi.name || selectedMandi) : t.noMandis}
            </Text>
            <Ionicons
              name={mandiDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>

          {mandiDropdownOpen && (
            <View style={styles.mandiDropdownList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                {mandis.map((m) => {
                  const active = m._id === selectedMandi?._id;
                  return (
                    <TouchableOpacity
                      key={m._id}
                      style={styles.mandiItem}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedMandi(m);
                        setMandiDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.mandiItemText,
                          active && { color: GREEN_DARK, fontWeight: '700' },
                        ]}
                      >
                        {m.name}
                      </Text>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={GREEN_DARK}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* CROP TABS */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
          {t.cropLabel}
        </Text>
        <View style={{ marginBottom: 16 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {loadingCrops ? (
              <ActivityIndicator size="small" color={GREEN_DARK} />
            ) : (
              crops.map((c) => {
                const isActive = c.name === selectedCrop;
                const cropDisplayName = hi ? c.hindiName : c.name;
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setSelectedCrop(c.name)}
                    activeOpacity={0.9}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.chipText,
                          isActive && styles.chipTextActive,
                        ]}
                      >
                        {cropDisplayName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* LEGEND */}
        <View style={styles.legendRow}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>{t.unit}</Text>
        </View>

        {/* 7‑DAY LIST */}
        <View style={styles.listCard}>
          {loadingPrices ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={GREEN_DARK} />
            </View>
          ) : cropData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {hi
                  ? 'इस मंडी में इस फसल का डेटा उपलब्ध नहीं है।'
                  : 'No data for this crop in selected mandi.'}
              </Text>
            </View>
          ) : (
            cropData.map((item, index) => {
              const isToday = index === 0;
              // Find next available price for trend
              let nextPrice = null;
              for (let i = index + 1; i < cropData.length; i++) {
                if (cropData[i].price !== null) {
                  nextPrice = cropData[i].price;
                  break;
                }
              }
              const isUp = item.price !== null && nextPrice !== null ? item.price >= nextPrice : true;

              return (
                <View
                  key={index}
                  style={[
                    styles.row,
                    index !== cropData.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <Text
                      style={[styles.rowDate, isToday && styles.rowDateToday]}
                    >
                      {item.dateLabel}
                    </Text>
                    {item.dateLabel === (hi ? 'आज' : 'Today') && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>
                          {t.todayText}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={[styles.rowPrice, item.price === null && { color: '#9CA3AF', fontSize: 12, fontWeight: '600' }]}>
                      {item.price !== null ? `₹ ${item.price.toLocaleString('en-IN')}` : (hi ? 'उपलब्ध नहीं' : 'Not Available')}
                    </Text>
                    {item.price !== null && (
                      <View style={styles.trendPill}>
                        <Ionicons
                          name={isUp ? 'arrow-up' : 'arrow-down'}
                          size={12}
                          color={isUp ? '#16A34A' : '#DC2626'}
                        />
                      </View>
                    )}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1.2,
    borderBottomColor: GREEN_LIGHT,
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

  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 18,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  infoSub: {
    fontSize: 12,
    color: '#4B5563',
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },

  // MANDI DROPDOWN
  mandiDropdownWrapper: {
    marginBottom: 12,
  },
  mandiDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mandiDropdownText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  mandiDropdownList: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  mandiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  mandiItemText: {
    fontSize: 13,
    color: '#111827',
  },

  chipRow: {
    flexDirection: 'row',
    paddingRight: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: GREEN_DARK,
    backgroundColor: 'rgba(152,205,6,0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: {
    color: GREEN_DARK,
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 4,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN_DARK,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowDateToday: {
    color: GREEN_DARK,
  },
  todayBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: GREEN_LIGHT,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginRight: 10,
  },
  trendPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
