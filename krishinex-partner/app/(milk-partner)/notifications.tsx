import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API_URL } from '../../constants/api';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';
import { getSocket } from '../../services/socket';
import { refreshUnreadCount } from '../../hooks/useNotificationBadge';

const API_URL = `${BASE_API_URL}/notifications`;

type NotifType = 'farmer_assigned' | 'rate_updated' | 'delivery' | 'status' | 'system' | 'withdrawal' | 'milk_subscription' | string;

type NotifItem = {
  _id: string;
  title: string;
  messageHi: string;
  messageEn: string;
  type: NotifType;
  refId?: string;
  unread: boolean;
  createdAt: string;
};

function typeIcon(type: NotifType) {
  switch (type) {
    case 'farmer_assigned':
      return { name: 'person-add-outline', color: '#059669', bg: '#ECFDF5' };
    case 'rate_updated':
      return { name: 'pricetag-outline', color: '#2563EB', bg: '#EFF6FF' };
    case 'delivery':
      return { name: 'water-outline', color: '#7C3AED', bg: '#F5F3FF' };
    case 'withdrawal':
      return { name: 'cash-outline', color: '#D97706', bg: '#FFFBEB' };
    default:
      return { name: 'notifications-outline', color: '#059669', bg: '#ECFDF5' };
  }
}

function timeAgo(dateStr: string, isHindi: boolean) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return isHindi ? 'अभी' : 'Just now';
  if (mins < 60) return isHindi ? `${mins} मिनट पहले` : `${mins}m ago`;
  if (hrs < 24) return isHindi ? `${hrs} घंटे पहले` : `${hrs}h ago`;
  return isHindi ? `${days} दिन पहले` : `${days}d ago`;
}

export default function MilkPartnerNotifications() {
  const router = useRouter();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      let list: NotifItem[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.success && Array.isArray(data?.notifications)) {
        list = data.notifications;
      } else if (Array.isArray(data?.notifications)) {
        list = data.notifications;
      }
      setItems(list);
    } catch (e) {
      console.error('Fetch milk notifications error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time socket events
    const s = getSocket();
    if (s) {
      const handleMilkEvent = () => {
        fetchNotifications(true);
      };
      const handleNotifNew = () => {
        fetchNotifications(true);
      };
      s.on('milk_event', handleMilkEvent);
      s.on('notification_new', handleNotifNew);
      return () => {
        s.off('milk_event', handleMilkEvent);
        s.off('notification_new', handleNotifNew);
      };
    }
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(true);
    }, [fetchNotifications])
  );

  const markAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await fetch(`${API_URL}/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      refreshUnreadCount();
    } catch (e) {
      console.error('Mark all read error:', e);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      await fetch(`${API_URL}/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, unread: false } : n))
      );
      refreshUnreadCount();
    } catch (e) {
      console.error('Mark read error:', e);
    }
  };

  const renderItem = ({ item }: { item: NotifItem }) => {
    const icon = typeIcon(item.type);
    const message = hi ? item.messageHi || item.messageEn : item.messageEn || item.messageHi;

    return (
      <TouchableOpacity
        style={[styles.itemCard, item.unread && styles.itemCardUnread]}
        onPress={() => markSingleRead(item._id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>

        <View style={styles.contentBox}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, item.unread && styles.itemTitleUnread]}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt, hi)}</Text>
          </View>
          <Text style={styles.itemMessage}>{message}</Text>
        </View>

        {item.unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Back button */}
      <MilkPartnerHeader showBack />

      {/* Title & Actions Bar */}
      <View style={styles.actionBar}>
        <View>
          <Text style={styles.pageTitle}>{hi ? 'सूचनाएं' : 'Notifications'}</Text>
          <Text style={styles.pageSub}>
            {hi ? 'दूध रूट, किसान व ग्राहक आवंटन से जुड़े अलर्ट' : 'Milk route & subscriber allocation alerts'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={14} color="#059669" />
            <Text style={styles.markAllText}>{hi ? 'सभी पढ़ें' : 'Mark all read'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications(true);
              }}
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={42} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>
                {hi ? 'कोई नया नोटिफिकेशन नहीं है' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySub}>
                {hi
                  ? 'जब एडमिन आपको कोई नया किसान या ग्राहक असाइन करेगा, तो यहाँ अलर्ट दिखेगा।'
                  : 'You will receive alerts here when new farmers or subscribers are assigned to your route.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  pageSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardUnread: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contentBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  itemTitleUnread: {
    fontWeight: '900',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  itemMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginLeft: 6,
    marginTop: 4,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
