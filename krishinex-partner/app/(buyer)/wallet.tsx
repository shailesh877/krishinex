import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}/user`;

export default function BuyerWallet() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    hi: {
      title: 'वॉलेट',
      sub: 'पूर्ण हुए ऑर्डर और कुल भुगतान',
      totalSpend: 'कुल खर्च',
      totalCompleted: 'पूर्ण ऑर्डर',
      allOrders: 'सभी ऑर्डर',
      adminNote: 'सभी भुगतान एडमिन को किए जाते हैं',
      empty: 'अभी तक कोई लेन-देन नहीं है' },
    en: {
      title: 'Wallet',
      sub: 'Your orders and total spend',
      totalSpend: 'Total Spend',
      totalCompleted: 'Completed',
      allOrders: 'All Orders',
      adminNote: 'All payments are made to admin',
      empty: 'No transactions yet' } }[lang];

  const fetchWallet = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.transactions)) return data.transactions;
          return prev;
        });
      }
    } catch (e) {
      console.error('Buyer Wallet fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWallet(false);
      const interval = setInterval(() => fetchWallet(true), 5000);
      return () => clearInterval(interval);
    }, [fetchWallet])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backWrap} onPress={() => router.push('/(buyer)/home')}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.headerBorder} />

      {/* Summary Cards */}
      <LinearGradient
        colors={['#16A34A', '#15803D']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₹ {balance.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLabel}>{t.totalSpend}</Text>
        </View>
      </LinearGradient>

      <View style={styles.adminNote}>
        <Ionicons name="shield-checkmark-outline" size={13} color="#16A34A" />
        <Text style={styles.adminNoteText}>{t.adminNote}</Text>
      </View>

      <Text style={styles.sectionTitle}>
        {isHindi ? 'लेन-देन का इतिहास' : 'Transaction History'}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isDebit = item.type === 'Debit' || item.type === 'Collection';
            return (
              <View style={styles.transactionItem}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: isDebit ? '#FEF2F2' : '#F0FDF4' },
                  ]}
                >
                  <Ionicons
                    name={isDebit ? 'arrow-up-outline' : 'arrow-down-outline'}
                    size={20}
                    color={isDebit ? '#EF4444' : '#16A34A'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transTitle}>
                    {item.note || (isDebit ? (isHindi ? 'खर्च' : 'Spent') : (isHindi ? 'प्राप्ति' : 'Received'))}
                  </Text>
                  <Text style={styles.transDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transAmount,
                    { color: isDebit ? '#EF4444' : '#16A34A' },
                  ]}
                >
                  {isDebit ? '-' : '+'}₹{item.amount}
                </Text>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.empty}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF' },
  backWrap: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6', marginRight: 8 },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  headerBorder: { height: 2, backgroundColor: '#87D528' },

  summaryCard: {
    margin: 16, borderRadius: 18, padding: 18,
    flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  summaryLabel: { fontSize: 11, color: '#BBF7D0', marginTop: 2 },

  adminNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingBottom: 8 },
  adminNoteText: { fontSize: 12, color: '#16A34A' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#374151',
    marginHorizontal: 16, marginTop: 10, marginBottom: 8 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  transactionItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  transDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  transAmount: { fontSize: 15, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' } });
