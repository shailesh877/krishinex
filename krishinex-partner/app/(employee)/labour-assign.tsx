import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}`;

type BookingStatus = 'new' | 'accepted' | 'completed';

type BookingItem = {
  id: string;
  farmerName: string;
  farmerPhone: string;
  farmerAddress: string;
  labourName: string;
  labourPhone: string;
  labourAddress: string;
  workType: string;
  village: string;
  distanceKm: number;
  dateLabel: string;
  offerRate: string;
  status: BookingStatus;
};

export default function LabourAssignScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [tab, setTab] = useState<BookingStatus>('new');
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/employee/labour-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped: BookingItem[] = data.map((b: any) => ({
          id: b._id,
          farmerName: b.buyer?.name || 'Unknown Farmer',
          farmerPhone: b.buyer?.phone || '+91 -',
          farmerAddress: b.buyer?.address || 'N/A',
          labourName: b.labour?.businessName || b.labour?.name || 'Unknown Labour',
          labourPhone: b.labour?.phone || '+91 -',
          labourAddress: b.labour?.address || 'N/A',
          workType: b.crop || 'Field Work',
          village: b.location || b.buyer?.address || 'Unknown Village',
          distanceKm: 0,
          dateLabel: new Date(b.createdAt).toLocaleDateString(),
          offerRate: `Qty: ${b.quantity}`,
          status: (b.assignedStatus === 'new' ? 'new' : b.assignedStatus === 'ok' ? 'accepted' : b.assignedStatus === 'completed' || b.assignedStatus === 'delivered' ? 'completed' : 'new') as BookingStatus
        })).filter((b: any) => b.status !== 'remove' && b.status !== 'cancelled');
        setBookings(mapped);
      }
    } catch (e) {
      console.error('Fetch employee tasks error:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
      const interval = setInterval(() => fetchBookings(), 5000);
      return () => clearInterval(interval);
    }, [])
  );

  const filtered = bookings.filter(b => b.status === tab);

  const updateBookingStatus = async (id: string, status: BookingStatus | 'remove') => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/employee/labour-tasks/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setBookings(prev =>
          status === 'remove'
            ? prev.filter(b => b.id !== id)
            : prev.map(b => (b.id === id ? { ...b, status: status as BookingStatus } : b)),
        );
      } else {
        console.error('Failed to update task status on server');
      }
    } catch (e) {
      console.error('Status update error', e);
    }
  };

  const getStatusChip = (status: BookingStatus) => {
    if (status === 'new') {
      return {
        bg: '#DBEAFE',
        color: '#1D4ED8',
        icon: 'sparkles-outline' as const,
        label: isHindi ? 'नया काम' : 'New task',
      };
    }
    if (status === 'accepted') {
      return {
        bg: '#FEF9C3',
        color: '#ca8a04',
        icon: 'time-outline' as const,
        label: isHindi ? 'प्रगति पर' : 'In progress',
      };
    }
    return {
      bg: '#DCFCE7',
      color: '#16A34A',
      icon: 'checkmark-circle-outline' as const,
      label: isHindi ? 'पूरा हुआ' : 'Completed',
    };
  };

  const t = {
    title: isHindi ? 'मज़दूर काम (Labour Tasks)' : 'Labour Tasks',
    tabNew: isHindi ? 'नए काम' : 'New',
    tabAccepted: isHindi ? 'चालू काम' : 'Active',
    tabCompleted: isHindi ? 'पूरे हुए' : 'Done',
    farmer: isHindi ? 'किसान:' : 'Farmer:',
    work: isHindi ? 'काम:' : 'Work:',
    village: isHindi ? 'गाँव:' : 'Village:',
    distInfo: isHindi ? 'किमी दूर' : 'km away',
    rate: isHindi ? 'मात्रा/रेट:' : 'Qty/Rate:',
    btnAccept: isHindi ? 'काम स्वीकार करें' : 'Accept task',
    btnReject: isHindi ? 'हटाएं' : 'Remove',
    btnComplete: isHindi ? 'काम पूरा मार्क करें' : 'Mark completed',
    emptyNew: isHindi ? 'कोई नया काम नहीं है' : 'No new tasks',
    emptyAccepted: isHindi ? 'कोई चालू काम नहीं है' : 'No active tasks',
    emptyCompleted: isHindi ? 'अभी तक कोई काम पूरा नहीं हुआ' : 'No completed tasks yet',
  };

  const renderItem = ({ item }: { item: BookingItem }) => {
    const s = getStatusChip(item.status);
    return (
      <View style={styles.card}>
        {/* HEADER: STATUS & DATE */}
        <View style={styles.cardTop}>
          <View style={[styles.chip, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
          </View>
          <Text style={styles.dateLabel}>{item.dateLabel}</Text>
        </View>

        {/* MIDDLE: INFO */}
        <View style={styles.cardInfoBox}>
          {/* Farmer Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isHindi ? 'किसान विवरण' : 'Farmer Details'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="person-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>{t.farmer}</Text>
            <Text style={styles.infoValue}>{item.farmerName}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="call-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>Ph:</Text>
            <Text style={styles.infoValue}>{item.farmerPhone}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="location-outline" size={16} color="#DC2626" />
            </View>
            <Text style={styles.infoLabel}>{t.village}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {item.farmerAddress}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Labourer Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isHindi ? 'मजदूर विवरण' : 'Labourer Details'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="people-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'मजदूर:' : 'Labour:'}</Text>
            <Text style={styles.infoValue}>{item.labourName}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="call-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>Ph:</Text>
            <Text style={styles.infoValue}>{item.labourPhone}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="home-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'पता:' : 'Addr:'}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{item.labourAddress}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="briefcase-outline" size={16} color="#6bb313ff" />
            </View>
            <Text style={styles.infoLabel}>{t.work}</Text>
            <Text style={styles.infoValue}>{item.workType}</Text>
          </View>
        </View>

        {/* BOTTOM: RATE & ACTIONS */}
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.rateLabel}>{t.rate}</Text>
            <Text style={styles.rateValue}>{item.offerRate}</Text>
          </View>

          {item.status === 'new' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => updateBookingStatus(item.id, 'remove')}
              >
                <Ionicons name="close" size={16} color="#DC2626" />
                <Text style={styles.rejectBtnText}>{t.btnReject}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => updateBookingStatus(item.id, 'accepted')}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>{t.btnAccept}</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'accepted' && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => updateBookingStatus(item.id, 'completed')}
            >
              <Ionicons name="flag-outline" size={16} color="#047857" />
              <Text style={styles.completeBtnText}>{t.btnComplete}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#6bb313ff" />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'new' && styles.tabActive]}
          onPress={() => setTab('new')}
        >
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>
            {t.tabNew}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'accepted' && styles.tabActive]}
          onPress={() => setTab('accepted')}
        >
          <Text style={[styles.tabText, tab === 'accepted' && styles.tabTextActive]}>
            {t.tabAccepted}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'completed' && styles.tabActive]}
          onPress={() => setTab('completed')}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>
            {t.tabCompleted}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={50} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {tab === 'new'
                ? t.emptyNew
                : tab === 'accepted'
                  ? t.emptyAccepted
                  : t.emptyCompleted}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: 16,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#6bb313ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5BA40F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: '#6bb313ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardInfoBox: {
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
  },
  infoLabel: {
    width: 55,
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rateLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    marginRight: 8,
  },
  rejectBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  completeBtnText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyWrap: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#6bb313ff',
    paddingLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
});
