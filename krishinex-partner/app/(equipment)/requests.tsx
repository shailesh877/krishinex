// app/(equipment)/requests.tsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Modal,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

type RequestStatus = 'New' | 'Accepted' | 'Completed' | 'Cancelled';

type RequestItem = {
  id: string;
  status: RequestStatus;
  machine: string;
  machineImage: string;
  owner: string;
  ownerPhone: string;
  ownerAddress: string;
  desc: string;
  village: string;
  distanceKm: number;
  priceDay: number;
  priceHour: number;
  amount: number;
  platformCommission?: number;
  ownerPayout?: number;
  fromDate: string;
  toDate: string;
  cancelReason?: string;
  purpose?: string;
  priceType?: 'hourly' | 'daily' | 'kattha';
  hours?: number;
  days?: number;
  kattha?: number;
  startTime?: string;
  selectedSubMachinery?: { name: string; image: string }[];
};

const INITIAL_REQUESTS: RequestItem[] = [];
import { BASE_API_URL, BASE_URL, IMAGE_BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/rentals`;

export default function EquipmentRequests() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [activeTab, setActiveTab] = useState<RequestStatus>('New');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeOtp, setCompleteOtp] = useState('');
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, []);

  // Fetch list on focus
  useFocusEffect(
    useCallback(() => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      fetchRequests(signal);

      const interval = setInterval(() => {
        fetchRequests(); // Silent fetch every 5 seconds
      }, 5000);

      return () => {
        clearInterval(interval);
        abortController.abort();
      };
    }, [])
  );

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${monthNames[d.getMonth()]}`;
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const p = h >= 12 ? (isHindi ? 'PM' : 'PM') : (isHindi ? 'AM' : 'AM');
      h = h % 12 || 12;
      return `${h}:${m} ${p}`;
    } catch {
      return '';
    }
  };

  const fetchRequests = async (signal?: AbortSignal) => {
    try {
      // if (length === 0) setLoading(true) removed for silent polling
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/equipment`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((r: any) => ({
          id: r._id,
          status: r.status,
          machine: r.machine?.name || 'Unknown Machine',
          machineImage: (r.machine?.images && r.machine.images.length > 0)
            ? (r.machine.images[0].startsWith('http') ? r.machine.images[0] : `${IMAGE_BASE_URL}/${r.machine.images[0].replace(/^\//, '')}`)
            : '',
          owner: r.buyer?.name || 'Unknown Buyer',
          ownerPhone: r.buyer?.phone || '',
          ownerAddress: r.buyer?.address || '',
          desc: r.machine?.desc || '',
          village: r.machine?.village || '',
          distanceKm: r.machine?.distanceKm || 0,
          priceDay: r.machine?.priceDay || 0,
          priceHour: r.machine?.priceHour || 0,
          amount: r.totalAmount || 0,
          platformCommission: r.platformCommission || 0,
          ownerPayout: r.ownerPayout || 0,
          fromDate: formatDate(r.fromDate),
          toDate: formatDate(r.toDate),
          cancelReason: r.cancelReason,
          purpose: r.purpose || '',
          priceType: r.priceType || 'daily',
          hours: r.hours || 0,
          days: r.days || 0,
          kattha: r.kattha || 0,
          startTime: formatTime(r.fromDate),
          selectedSubMachinery: r.selectedSubMachinery || []
        }));
        setRequests(mapped);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Fetch requests error', e);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  const headerTabs: RequestStatus[] = ['New', 'Accepted', 'Completed'];

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (r.status !== activeTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.machine.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q)
      );
    });
  }, [activeTab, search, requests]);

  const tabCounts: Record<RequestStatus, number> = useMemo(() => {
    const base: Record<RequestStatus, number> = {
      New: 0,
      Accepted: 0,
      Completed: 0,
      Cancelled: 0,
    };
    requests.forEach(r => {
      base[r.status] += 1;
    });
    return base;
  }, [requests]);

  const statusDot = (status: RequestStatus) => {
    if (status === 'New')
      return { color: '#22C55E', label: isHindi ? 'नया' : 'New' };
    if (status === 'Accepted')
      return { color: '#EAB308', label: isHindi ? 'स्वीकृत' : 'Accepted' };
    if (status === 'Completed')
      return { color: '#16A34A', label: isHindi ? 'पूर्ण' : 'Completed' };
    return { color: '#EF4444', label: isHindi ? 'रद्द' : 'Cancelled' };
  };

  const updateStatus = async (id: string, status: RequestStatus, cancelReasonStr?: string, otpStr?: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, cancelReason: cancelReasonStr, otp: otpStr })
      });
      if (res.ok) {
        setRequests(prev => prev.map(r =>
          r.id === id ? { ...r, status, cancelReason: cancelReasonStr || r.cancelReason } : r
        ));
        if (status !== 'Cancelled') {
          setActiveTab(status);
        } else {
          setActiveTab('Cancelled');
        }
      } else {
        const errorData = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', errorData.error || (isHindi ? 'कुछ गलत हो गया' : 'Something went wrong'));
      }
    } catch (e) {
      console.error('Update Request status error:', e);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network Error');
    }
  };

  const markAccepted = (id: string) => updateStatus(id, 'Accepted');

  const openCompleteModal = (id: string) => {
    setCompleteId(id);
    setCompleteOtp('');
    setCompleteModalVisible(true);
  };

  const confirmComplete = async () => {
    if (!completeId) return;
    if (completeOtp.length !== 4) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया 4 अंकों का OTP दर्ज करें' : 'Please enter a 4-digit OTP');
      return;
    }
    await updateStatus(completeId, 'Completed', undefined, completeOtp);
    setCompleteModalVisible(false);
    setCompleteId(null);
  };

  const openCancelModal = (id: string) => {
    setCancelId(id);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const confirmCancel = () => {
    if (!cancelId) return;
    const reasonText = cancelReason.trim();
    updateStatus(cancelId, 'Cancelled', reasonText || undefined);
    setCancelModalVisible(false);
    setCancelId(null);
  };

  const labelForTab = (tab: RequestStatus) => {
    if (tab === 'New') return isHindi ? 'नया' : 'New';
    if (tab === 'Accepted') return isHindi ? 'स्वीकृत' : 'Accepted';
    if (tab === 'Completed') return isHindi ? 'पूर्ण' : 'Completed';
    return isHindi ? 'रद्द' : 'Cancelled';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.logoIconWrap}>
          <Image source={logoIconSource} style={styles.logoIcon} />
        </TouchableOpacity>
        <View style={styles.logoWrap}>
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>
        <TouchableOpacity style={styles.iconCircle}>
          <NotificationIcon size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Screen title + small hint */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {isHindi ? 'उपकरण रिक्वेस्ट' : 'Equipment requests'}
          </Text>
          <Text style={styles.titleHint}>
            {isHindi
              ? 'नई, स्वीकृत और पूर्ण सभी request एक जगह देखें.'
              : 'View new, accepted and completed requests in one place.'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {headerTabs.map(tab => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabChip,
                  active && styles.tabChipActive,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={active ? styles.tabTextActive : styles.tabText}>
                  {labelForTab(tab)} · {tabCounts[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#6B7280"
            style={{ marginRight: 6 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              isHindi
                ? 'उपकरण, मालिक या गांव से खोजें'
                : 'Search by machine, owner or village'
            }
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#16A34A']}
              tintColor="#16A34A"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="file-tray-outline"
                size={28}
                color="#9CA3AF"
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.emptyText}>
                {isHindi
                  ? 'इस टैब में अभी कोई रिक्वेस्ट नहीं है'
                  : 'No requests in this tab yet'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const dot = statusDot(item.status);

            let primaryLabel = '';
            let primaryAction: () => void = () => { };
            let showPrimary = true;

            if (item.status === 'New') {
              primaryLabel = isHindi ? 'Accept करो' : 'Accept';
              primaryAction = () => markAccepted(item.id);
            } else if (item.status === 'Accepted') {
              primaryLabel = isHindi ? 'Complete करो' : 'Complete';
              primaryAction = () => openCompleteModal(item.id);
            } else {
              showPrimary = false;
            }

            const showCancel =
              item.status === 'New' || item.status === 'Accepted';

            return (
              <View style={styles.card}>
                {/* top badge row */}
                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <View
                      style={[styles.dot, { backgroundColor: dot.color }]}
                    />
                    <Text style={styles.statusLabel}>{dot.label}</Text>
                  </View>
                  <View style={styles.dateChip}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#4B5563"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.dateRange}>
                      {item.fromDate} - {item.toDate}
                    </Text>
                  </View>
                </View>

                {/* Machine header with optional image */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {item.machineImage ? (
                    <Image source={{ uri: item.machineImage }} style={{ width: 56, height: 56, borderRadius: 10, marginRight: 10, backgroundColor: '#F3F4F6' }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name="construct-outline" size={26} color="#16A34A" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.machineText}>{item.machine}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>{item.village} · {item.distanceKm.toFixed(1)} km</Text>
                  </View>
                </View>
                {/* Booking Purpose & Duration */}
                <View style={{ backgroundColor: '#EEF2FF', borderRadius: 10, padding: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>{isHindi ? 'बुकिंग डिटेल्स' : 'Booking Details'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={12} color="#1E40AF" style={{ marginRight: 2 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>{item.startTime}</Text>
                    </View>
                  </View>
                  
                  {item.purpose ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="chatbox-outline" size={13} color="#1E40AF" style={{ marginRight: 4 }} />
                      <Text style={[styles.infoText, { color: '#1E40AF', fontWeight: '500' }]}>{isHindi ? 'उद्देश्य: ' : 'Purpose: '}{item.purpose}</Text>
                    </View>
                  ) : null}
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="timer-outline" size={13} color="#1E40AF" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoText, { color: '#1E40AF' }]}>
                      {isHindi ? 'अवधि: ' : 'Duration: '}
                      {item.priceType === 'kattha'
                        ? (isHindi ? `${item.kattha} कट्ठा` : `${item.kattha} Kattha`)
                        : item.priceType === 'hourly' 
                          ? (isHindi ? `${item.hours} घंटे` : `${item.hours} Hours`)
                          : (isHindi ? `${item.days} दिन` : `${item.days} Days`)}
                    </Text>
                  </View>
                </View>
                
                {/* Selected Sub-Machinery/Attachments */}
                {item.selectedSubMachinery && item.selectedSubMachinery.length > 0 && (
                  <View style={{ backgroundColor: '#F0F9FF', borderRadius: 10, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#BAE6FD' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1', marginBottom: 6 }}>
                      {isHindi ? 'चुने गए अटैचमेंट' : 'Selected Attachments'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {item.selectedSubMachinery.map((sub, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E0F2FE' }}>
                          {sub.image ? (
                            <Image source={{ uri: sub.image.startsWith('http') ? sub.image : `${IMAGE_BASE_URL}/${sub.image.replace(/^\//, '')}` }} style={{ width: 24, height: 24, borderRadius: 4, marginRight: 4 }} />
                          ) : (
                            <Ionicons name="cog-outline" size={14} color="#0369A1" style={{ marginRight: 4 }} />
                          )}
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369A1' }}>{sub.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Farmer (Buyer) Details */}
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 }}>{isHindi ? 'किसान की जानकारी' : 'Farmer Details'}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoText, item.status === 'New' && { color: '#9CA3AF', fontStyle: 'italic' }]}>
                      {item.status === 'New' 
                        ? (isHindi ? 'नाम (छिपा हुआ)' : 'Name (Hidden)') 
                        : item.owner}
                    </Text>
                  </View>
                  {item.ownerPhone ? (
                    <TouchableOpacity 
                      style={styles.infoRow} 
                      disabled={item.status === 'New'}
                      onPress={() => Linking.openURL(`tel:${item.ownerPhone}`)}
                    >
                      <Ionicons name="call-outline" size={13} color={item.status === 'New' ? "#9CA3AF" : "#16A34A"} style={{ marginRight: 4 }} />
                      <Text style={[styles.infoText, item.status === 'New' ? { color: '#9CA3AF' } : { color: '#16A34A', fontWeight: '700', textDecorationLine: 'underline' }]}>
                        {item.status === 'New' ? 'XXXXXXXXXX' : item.ownerPhone}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.ownerAddress ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="home-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={[styles.infoText, item.status === 'New' && { color: '#9CA3AF', fontStyle: 'italic' }]} numberOfLines={2}>
                        {item.status === 'New' 
                          ? (isHindi ? 'पता (छिपा हुआ)' : 'Address (Hidden)') 
                          : item.ownerAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Price + Total + buttons */}
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceMain}>
                      ₹{item.amount} <Text style={styles.priceUnit}>{isHindi ? 'कुल बुकिंग' : 'Total'}</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>- ₹{(item.platformCommission || 0).toLocaleString()}</Text>
                      <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 4 }}>{isHindi ? 'एडमिन कमीशन' : 'Admin Commission'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669' }}>₹{(item.ownerPayout || item.amount).toLocaleString()}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669', marginLeft: 4 }}>{isHindi ? 'आपका भुगतान' : 'Net Payout'}</Text>
                    </View>
                    {item.desc ? <Text style={styles.descText} numberOfLines={2}>{item.desc}</Text> : null}
                    {item.status === 'Cancelled' && item.cancelReason ? (
                      <Text style={styles.cancelReason}>
                        {isHindi ? 'कारण: ' : 'Reason: '}{item.cancelReason}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.buttonsCol}>
                    {showPrimary && (
                      <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={primaryAction}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.primaryText}>{primaryLabel}</Text>
                      </TouchableOpacity>
                    )}

                    {showCancel && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => openCancelModal(item.id)}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={14}
                          color="#DC2626"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.cancelText}>
                          {isHindi ? 'Cancel' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Cancel reason modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {isHindi ? 'रिक्वेस्ट कैंसल करें' : 'Cancel request'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isHindi
                ? 'कारण लिखना वैकल्पिक है (optional).'
                : 'Adding a reason is optional.'}
            </Text>
            <TextInput
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={
                isHindi ? 'कारण लिखें (optional)' : 'Reason (optional)'
              }
              placeholderTextColor="#9CA3AF"
              style={styles.modalInput}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalSecondaryText}>
                  {isHindi ? 'Back' : 'Back'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={confirmCancel}
              >
                <Text style={styles.modalPrimaryText}>
                  {isHindi ? 'Confirm cancel' : 'Confirm cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete OTP modal */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {isHindi ? 'रिक्वेस्ट पूरी करें' : 'Complete Request'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isHindi
                ? 'किसान से 4 अंकों का OTP मांगकर यहाँ डालें.'
                : 'Ask the farmer for a 4-digit OTP and enter it here.'}
            </Text>
            <TextInput
              value={completeOtp}
              onChangeText={setCompleteOtp}
              placeholder="0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.modalInput, { minHeight: 40, fontSize: 24, textAlign: 'center', letterSpacing: 10 }]}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => setCompleteModalVisible(false)}
              >
                <Text style={styles.modalSecondaryText}>
                  {isHindi ? 'Back' : 'Back'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimary, { backgroundColor: '#16A34A' }]}
                onPress={confirmComplete}
              >
                <Text style={styles.modalPrimaryText}>
                  {isHindi ? 'Verify & Complete' : 'Verify & Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E5F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { width: 28, height: 28, resizeMode: 'contain' },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  titleRow: { marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  titleHint: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  tabsRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#DCFCE7',
    shadowColor: '#16A34A40',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: { fontSize: 12, color: '#4B5563' },
  tabTextActive: { fontSize: 12, color: '#15803D', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#00000010',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, color: '#111827', fontWeight: '600' },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  dateRange: { fontSize: 11, color: '#1F2937' },

  machineBlock: { marginBottom: 8 },
  machineText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  infoText: { fontSize: 12, color: '#4B5563' },
  descText: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceMain: { fontSize: 16, fontWeight: '700', color: '#111827' },
  priceUnit: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  priceSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cancelReason: { fontSize: 11, color: '#EF4444', marginTop: 4 },

  buttonsCol: { alignItems: 'flex-end' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    marginBottom: 6,
  },
  primaryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: '90%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  modalInput: {
    marginTop: 10,
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111827',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  modalSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalSecondaryText: { fontSize: 13, color: '#374151' },
  modalPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  modalPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
