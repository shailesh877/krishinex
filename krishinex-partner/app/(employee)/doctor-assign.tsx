// app/(employee)/doctor-assign.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ToastAndroid } from 'react-native';
import { Audio } from 'expo-av';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

type DoctorChatItem = {
  id: string;
  farmerName: string;
  farmerPhone: string;
  farmerAddress: string;
  village: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  cropName: string;
  avatar?: any;
  isBlocked?: boolean;
};
export default function DoctorAssignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';
  const [chats, setChats] = React.useState<DoctorChatItem[]>([]);

  const fetchChats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/employee/doctor-chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped: DoctorChatItem[] = data.map((c: any) => ({
          id: c._id,
          farmerName: c.farmer?.name || 'Farmer',
          farmerPhone: c.farmer?.phone || '',
          farmerAddress: c.farmer?.address || '',
          village: c.farmer?.address || 'Unknown Village',
          cropName: c.cropName || '',
          lastMessage: c.isBlocked ? '🚫 Blocked' : (c.lastMessage || 'Start chatting...'),
          lastTime: c.lastTime ? new Date(c.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          unreadCount: c.isBlocked ? 0 : (c.unreadByDoctor || 0),
          isBlocked: c.isBlocked || false,
        }));
        setChats(mapped);
      }
    } catch (e) {
      console.error('Fetch doctor chats error:', e);
    }
  };

  useFocusEffect(React.useCallback(() => {
    fetchChats();

    // Poll every 10s for new messages
    let prevUnreadMap: Record<string, number> = {};
    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`${API_URL}/employee/doctor-chats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) return;

        let hasNew = false;
        let latestMsg = '';
        let latestFarmer = '';
        for (const c of data) {
          const prevUnread = prevUnreadMap[c._id] ?? c.unreadByDoctor;
          if (c.unreadByDoctor > prevUnread) {
            hasNew = true;
            latestMsg = c.lastMessage || 'New message';
            latestFarmer = c.farmer?.name || 'Farmer';
          }
          prevUnreadMap[c._id] = c.unreadByDoctor;
        }

        // Refresh UI if new messages found
        if (hasNew) {
          fetchChats();
          if (Platform.OS === 'android') {
            ToastAndroid.show(`🌾 ${latestFarmer}: ${latestMsg}`, ToastAndroid.LONG);
          } else {
            showAlert(`🌾 ${latestFarmer}`, latestMsg);
          }

          try {
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/sounds/notification.mp3') // make sure to handle if asset is not present by fallback
            );
            await sound.playAsync();
          } catch (e) {
            // silent fail if audio file missing
          }
        }
      } catch (_) { }
    }, 10000);

    return () => clearInterval(interval);
  }, []));

  const t = {
    header: isHindi ? 'Doctor assign chat' : 'Doctor assign chat',
    subtitle: isHindi
      ? 'जितने किसान doctor से जुड़े हैं, उनकी chat यहां दिखेगी'
      : 'All farmers assigned to doctor appear here as chats',
    searchPlaceholder: isHindi ? 'किसान / village खोजें' : 'Search farmer / village',
  };

  const goChat = (item: DoctorChatItem) => {
    router.push({
      pathname: '/(employee)/doctor-chat',
      params: {
        chatId: item.id,
        name: item.farmerName,
        phone: item.farmerPhone,
        village: item.village,
        cropName: item.cropName,
        isBlocked: item.isBlocked ? '1' : '0',
      },
    });
  };

  const renderItem = ({ item }: { item: DoctorChatItem }) => {
    const initials = item.farmerName
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => goChat(item)}
      >
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>

        <View style={styles.mid}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{item.farmerName}</Text>
            <Text style={styles.timeText}>{item.lastTime}</Text>
          </View>
          <View style={styles.subRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.villageText}>{item.village}</Text>
            <View style={styles.dotSmall} />
            <Text style={styles.cropText}>{item.cropName}</Text>
          </View>
          <Text
            style={styles.lastMessageText}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.header}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* SMALL SUBTITLE */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>{t.subtitle}</Text>
      </View>

      {/* CHAT LIST */}
      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          chats.length === 0
            ? [styles.listContent, { flex: 1, justifyContent: 'center' }]
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="chatbubbles-outline"
              size={40}
              color="#9CA3AF"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'अभी कोई doctor chat नहीं' : 'No doctor chats yet'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'जब admin किसी किसान को doctor से जोड़ेगा, chat यहां दिखेगी.'
                : 'When admin assigns farmers to doctor, chats will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: STATUS_GREEN,
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
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  subHeaderText: {
    fontSize: 12,
    color: '#065F46',
  },

  listContent: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  mid: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  villageText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 2,
  },
  dotSmall: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 4,
  },
  cropText: {
    fontSize: 11,
    color: '#6B7280',
  },
  lastMessageText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
