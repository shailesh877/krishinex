// app/(employee)/machine-assign.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

type MachineStatus = 'new' | 'accepted' | 'in-progress' | 'completed';

type MachineTask = {
  id: string;
  farmerName: string;
  farmerPhone: string;
  farmerAddress: string;
  farmerCardNumber?: string;
  village: string;
  machineName: string; // eg. Tractor + rotavator
  workType: string; // eg. Ploughing, rotavator
  dateLabel: string;
  rateType: 'hour' | 'acre';
  rateAmount: number;
  status: MachineStatus;
};

const STATUS_ORDER: MachineStatus[] = ['new', 'accepted', 'in-progress', 'completed'];

const DUMMY_MACHINE: MachineTask[] = [
  {
    id: 'M1',
    farmerName: 'Sohan Lal',
    farmerPhone: '9876543210',
    farmerAddress: 'Bhagwanpur',
    village: 'Bhagwanpur',
    machineName: 'Tractor + Rotavator',
    workType: 'Rotavator work',
    dateLabel: 'Today • 3:00 PM',
    rateType: 'hour',
    rateAmount: 600,
    status: 'new' },
];

export default function MachineAssignScreen() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [tasks, setTasks] = useState<MachineTask[]>([]);
  const [activeTab, setActiveTab] = useState<MachineStatus>('new');

  const fetchTasks = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/employee/machine-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped: MachineTask[] = data.map((r: any) => ({
          id: r._id,
          farmerName: r.buyer?.name || 'Unknown Farmer',
          farmerPhone: r.buyer?.phone || '+91 -',
          farmerAddress: r.buyer?.address || 'N/A',
          farmerCardNumber: r.buyer?.cardNumber || '',
          village: r.buyer?.address || 'Unknown Village',
          machineName: r.machine?.name || 'Machine',
          workType: r.note || 'Rental Work',
          dateLabel: new Date(r.fromDate || r.createdAt).toLocaleDateString(),
          rateType: 'hour' as 'hour' | 'acre',
          rateAmount: r.machine?.priceHour || 0,
          status: r.status === 'New' ? 'new'
            : r.status === 'Accepted' ? 'accepted'
              : r.status === 'Completed' ? 'completed'
                : 'new' as MachineStatus }));
        setTasks(mapped);
      }
    } catch (e) {
      console.error('Fetch machine tasks error:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
      const interval = setInterval(() => fetchTasks(), 5000);
      return () => clearInterval(interval);
    }, [])
  );

  const t = {
    header: isHindi ? 'Machine assign' : 'Machine assign',
    chipNew: isHindi ? 'New' : 'New',
    chipAccepted: isHindi ? 'Accepted' : 'Accepted',
    chipProgress: isHindi ? 'In progress' : 'In progress',
    chipCompleted: isHindi ? 'Completed' : 'Completed' };

  const statusLabel = (status: MachineStatus) => {
    if (status === 'new') return isHindi ? 'नई machine booking' : 'New machine booking';
    if (status === 'accepted') return isHindi ? 'Accept हो चुकी (pending)' : 'Accepted (pending)';
    if (status === 'in-progress') return isHindi ? 'Machine काम पर लगी' : 'Machine on work';
    return isHindi ? 'Booking complete' : 'Booking completed';
  };

  const primaryBtnText = (status: MachineStatus) => {
    if (status === 'new')
      return isHindi ? 'Accept करके pending करें' : 'Accept & move to pending';
    if (status === 'accepted')
      return isHindi ? 'फार्म पर पहुंच गया, in‑progress' : 'Reached farm, mark in progress';
    if (status === 'in-progress')
      return isHindi ? 'काम पूरा, booking complete' : 'Work done, mark completed';
    return isHindi ? 'Booking already complete' : 'Booking already completed';
  };

  const nextStatus = (current: MachineStatus): MachineStatus => {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx === STATUS_ORDER.length - 1) return current;
    return STATUS_ORDER[idx + 1];
  };

  const onPrimaryAction = async (task: MachineTask) => {
    if (task.status === 'completed') return;
    const newStatus = nextStatus(task.status);
    // Update locally immediately for responsiveness
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
    // Also persist to backend
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/employee/machine-tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error('Update machine status err:', e);
    }
  };

  const filteredTasks = useMemo(
    () => tasks.filter(t => (activeTab ? t.status === activeTab : true)),
    [tasks, activeTab],
  );

  const chipLabel = (s: MachineStatus) => {
    if (s === 'new') return t.chipNew;
    if (s === 'accepted') return t.chipAccepted;
    if (s === 'in-progress') return t.chipProgress;
    return t.chipCompleted;
  };

  const renderChip = (status: MachineStatus) => {
    const active = activeTab === status;
    return (
      <TouchableOpacity
        key={status}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => setActiveTab(status)}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {chipLabel(status)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: MachineTask }) => {
    const rateText =
      item.rateType === 'hour'
        ? `₹${item.rateAmount} / hour`
        : `₹${item.rateAmount} / acre`;
    const showButton = item.status !== 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardTitle}>{item.farmerName}</Text>
            <View style={styles.row}>
              <Ionicons name="call-outline" size={13} color="#6B7280" />
              <Text style={styles.rowText}>{item.farmerPhone}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.rowText}>{item.farmerAddress}</Text>
            </View>
            {item.farmerCardNumber ? (
              <View style={styles.row}>
                <Ionicons name="card-outline" size={13} color="#059669" />
                <Text style={[styles.rowText, { color: '#059669', fontWeight: '700' }]}>
                  Card: {item.farmerCardNumber}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="construct-outline" size={13} color="#6B7280" />
          <Text style={styles.rowText}>{item.machineName}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="hammer-outline" size={13} color="#6B7280" />
          <Text style={styles.rowText}>{item.workType}</Text>
        </View>

        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={13} color="#6B7280" />
            <Text style={styles.rowText}>{item.dateLabel}</Text>
          </View>
          <Text style={styles.rateText}>{rateText}</Text>
        </View>

        {showButton ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={() => onPrimaryAction(item)}
          >
            <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{primaryBtnText(item.status)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerInfoRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={14}
              color="#16A34A"
            />
            <Text style={styles.footerInfoText}>
              {isHindi
                ? 'Machine booking admin को completed दिख रही है'
                : 'Admin sees this machine booking as completed'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.header}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* STATUS CHIPS */}
      <View style={styles.chipRow}>
        {STATUS_ORDER.map(renderChip)}
      </View>

      {/* LIST */}
      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          filteredTasks.length === 0
            ? [styles.listContent, { flex: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="file-tray-outline"
              size={40}
              color="#9CA3AF"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'इस status में कोई machine काम नहीं' : 'No machine jobs in this status'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'जब admin नया machine काम देगा या status बदलेगा, वो यहां दिखेगा.'
                : 'When admin assigns/updates machine jobs, they will appear here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: STATUS_GREEN },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5BA40F',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF' },

  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginRight: 6 },
  chipActive: {
    backgroundColor: '#2563EB' },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151' },
  chipTextActive: {
    color: '#FFFFFF' },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 },
  rowText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    alignItems: 'center' },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEF3C7' },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309' },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: 'flex-start' },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6 },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8 },
  footerInfoText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4 },

  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4 },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center' } });
