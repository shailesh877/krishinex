// app/(soil-lab)/requests.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  RefreshControl,
  Linking,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/soil`;

type StatusType = 'All' | 'New' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

type RequestItem = {
  _id: string;
  farmer: {
    _id: string;
    name: string;
    phone: string;
  };
  state?: string;
  district?: string;
  village?: string;
  crop?: string;
  cropName?: string;
  createdAt: string;
  status: StatusType;
  cancelReason?: string;
  reportUrl?: string;
  advisoryText?: string;
};

export default function SoilLabRequests() {
  const router = useRouter();
  
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [activeTab, setActiveTab] = useState<StatusType>('All');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cancel modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);

  // upload sheet ke liye
  const [uploadingFor, setUploadingFor] = useState<RequestItem | null>(null);
  const [uploadedPdfTarget, setUploadedPdfTarget] = useState<any>(null); // Asset reference
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      const interval = setInterval(() => fetchRequests(), 5000);
      return () => clearInterval(interval);
    }, [])
  );

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      }
    } catch (e) {
      console.error('Fetch requests error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, []);

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  const headerTabs: StatusType[] = ['All', 'New', 'Accepted', 'InProgress', 'Completed', 'Cancelled'];

  const tabCounts: Record<StatusType, number> = useMemo(() => {
    const base: Record<StatusType, number> = {
      All: requests.length,
      New: 0,
      Accepted: 0,
      InProgress: 0,
      Completed: 0,
      Cancelled: 0,
    };
    requests.forEach(r => {
      if (base[r.status] !== undefined) {
        base[r.status] += 1;
      }
    });
    return base;
  }, [requests]);

  const labelForTab = (tab: StatusType) => {
    if (tab === 'All') return isHindi ? 'सभी' : 'All';
    if (tab === 'New') return isHindi ? 'नया' : 'New';
    if (tab === 'Accepted') return isHindi ? 'स्वीकृत' : 'Accepted';
    if (tab === 'InProgress') return isHindi ? 'जांच जारी' : 'In Progress';
    if (tab === 'Completed') return isHindi ? 'पूर्ण' : 'Completed';
    return isHindi ? 'रद्द' : 'Cancelled';
  };

  const statusDot = (status: StatusType) => {
    if (status === 'New')
      return { color: '#22C55E', label: isHindi ? 'नया' : 'New' };
    if (status === 'Accepted')
      return { color: '#EAB308', label: isHindi ? 'स्वीकृत' : 'Accepted' };
    if (status === 'InProgress')
      return { color: '#3B82F6', label: isHindi ? 'जांच जारी' : 'In Progress' };
    if (status === 'Completed')
      return { color: '#16A34A', label: isHindi ? 'पूर्ण' : 'Completed' };
    return { color: '#EF4444', label: isHindi ? 'रद्द' : 'Cancelled' };
  };

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (activeTab !== 'All') {
      list = list.filter(r => r.status === activeTab);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        r =>
          r.farmer?.name?.toLowerCase().includes(s) ||
          r.farmer?.phone?.includes(s) ||
          (r.village && r.village.toLowerCase().includes(s)) ||
          (r.district && r.district.toLowerCase().includes(s)) ||
          (r.crop && r.crop.toLowerCase().includes(s)) ||
          (r.cropName && r.cropName.toLowerCase().includes(s)) ||
          r._id.toLowerCase().includes(s)
      );
    }
    // Sort by latest (descending order of createdAt)
    return list.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, search, requests]);

  const moveStatus = async (item: RequestItem, explicitNext?: StatusType, cancelReasonStr?: string) => {
    let next: StatusType | null = explicitNext || null;

    if (!next) {
      if (item.status === 'New') next = 'Accepted';
      else if (item.status === 'Accepted') next = 'InProgress';
      else if (item.status === 'InProgress') next = 'Completed';
      else next = null;
    }

    if (!next) return;

    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
         const user = JSON.parse(userDataStr);
         if (user.status !== 'approved') {
            showAlert(
              isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
              isHindi ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप रिक्वेस्ट स्वीकार या अपडेट नहीं कर सकते।' : 'Profile not verified. You cannot accept or update requests.'
            );
            return;
         }
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('status', next);
      if (cancelReasonStr) formData.append('cancelReason', cancelReasonStr);
      if (reportNote) formData.append('reportNote', reportNote);

      if (uploadedPdfTarget && next === 'Completed') {
        formData.append('report', {
          uri: uploadedPdfTarget.uri,
          name: uploadedPdfTarget.name,
          type: uploadedPdfTarget.mimeType || 'application/pdf'
        } as any);
      }

      const res = await fetch(`${API_URL}/requests/${item._id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setRequests(prev => prev.map(r =>
          r._id === item._id ? { ...r, status: next as StatusType, cancelReason: cancelReasonStr || r.cancelReason } : r
        ));
        if (next === 'Completed') {
          setUploadingFor(null);
          setUploadedPdfTarget(null);
          setUploadedPdfName(null);
          setReportNote('');
        }
        if (next === 'Cancelled') {
          setActiveTab('Cancelled');
        }
        fetchRequests();
      } else {
        const d = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', d.error || (isHindi ? 'कुछ गलत हो गया' : 'Failed to update request'));
      }
    } catch (e: any) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नेटवर्क समस्या' : 'Network error changing status');
    }
  };

  const openCancelModal = (id: string) => {
    setCancelId(id);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const confirmCancel = () => {
    if (!cancelId) return;
    const targetItem = requests.find(r => r._id === cancelId);
    if (!targetItem) return;
    const reasonText = cancelReason.trim();
    moveStatus(targetItem, 'Cancelled', reasonText || undefined);
    setCancelModalVisible(false);
    setCancelId(null);
  };

  const handlePickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (asset) {
      setUploadedPdfTarget(asset);
      setUploadedPdfName(asset.name ?? 'soil-report.pdf');
    }
  };

  const renderRequest = ({ item }: { item: RequestItem }) => {
    const dot = statusDot(item.status);
    const showPrimary = item.status !== 'Completed' && item.status !== 'Cancelled';
    const showCancel = item.status === 'New' || item.status === 'Accepted' || item.status === 'InProgress';
    const isInProgress = item.status === 'InProgress';

    const addressParts = [item.village, item.district, item.state].filter(p => p && p.trim() !== '');
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    const cropDisplay = item.cropName || item.crop || 'N/A';

    const handlePhoneCall = () => {
      if (item.farmer?.phone) {
        Linking.openURL(`tel:${item.farmer.phone}`).catch(() => {
          showAlert('Error', isHindi ? 'कॉल करने में असमर्थ' : 'Unable to make call');
        });
      }
    };

    const primaryLabel =
      item.status === 'New'
        ? isHindi
          ? 'Accept कर के pending में भेजें'
          : 'Accept & move to pending'
        : item.status === 'Accepted'
          ? isHindi
            ? 'Sample मिला, testing शुरू करें'
            : 'Sample received, start testing'
          : isHindi
            ? 'Report upload करके complete करें'
            : 'Upload report & complete';

    const primaryColor =
      item.status === 'New'
        ? '#16A34A'
        : item.status === 'Accepted'
          ? '#16A34A'
          : '#2563EB';

    return (
      <View style={styles.reqCard}>
        {/* top pill row (status + id) */}
        <View style={styles.cardTopRow}>
          <View style={styles.statusRow}>
            <View style={[styles.smallDot, { backgroundColor: dot.color }]} />
            <Text style={styles.statusText}>{dot.label}</Text>
          </View>

          <View style={styles.datePill}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color="#2563EB"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.datePillText}>{item._id.slice(-6).toUpperCase()}</Text>
          </View>
        </View>

        {/* main content */}
        <Text style={styles.reqFarmer}>{item.farmer?.name}</Text>

        {item.farmer?.phone ? (
          <TouchableOpacity
            style={styles.infoLine}
            onPress={item.status !== 'New' ? handlePhoneCall : undefined}
            disabled={item.status === 'New'}
          >
            <Ionicons
              name="call-outline"
              size={14}
              color={item.status === 'New' ? '#9CA3AF' : '#16A34A'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.reqMobile,
                item.status !== 'New' && { color: '#16A34A', fontWeight: '700', textDecorationLine: 'underline' },
              ]}
            >
              {item.status === 'New'
                ? 'XXXXXXXXXX'
                : item.farmer.phone}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.infoLine}>
          <Ionicons
            name="location-outline"
            size={14}
            color="#4B5563"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.reqInfoText}>
            {fullAddress} · {cropDisplay}
          </Text>
        </View>

        <View style={styles.infoLine}>
          <Ionicons
            name="time-outline"
            size={14}
            color="#4B5563"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.reqInfoText}>
            {new Date(item.createdAt).toLocaleString(isHindi ? 'hi-IN' : 'en-US')}
          </Text>
        </View>

        {/* bottom actions */}
        <View style={styles.actionsRow}>
          {showPrimary && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
              onPress={
                isInProgress
                  ? () => {
                      setUploadingFor(item);
                      setUploadedPdfTarget(null);
                      setUploadedPdfName(null);
                      setReportNote('');
                    }
                  : () => moveStatus(item)
              }
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}

          {showCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => openCancelModal(item._id)}
            >
              <Ionicons
                name="close-circle-outline"
                size={14}
                color="#DC2626"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.cancelBtnText}>
                {isHindi ? 'Cancel' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.status === 'Completed' ? (
          <View style={styles.completedContainer}>
            <View style={styles.completedRow}>
              <Ionicons
                name="checkmark-done-outline"
                size={14}
                color="#16A34A"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.completedText}>
                {isHindi
                  ? 'Testing पूरी और report भेज दी गई'
                  : 'Testing done and report sent'}
              </Text>
            </View>

            {item.reportUrl && (
              <TouchableOpacity
                style={styles.viewReportBtn}
                onPress={() => {
                  Linking.openURL(item.reportUrl!).catch(() => {
                    showAlert('Error', isHindi ? 'रिपोर्ट खोलने में असमर्थ' : 'Unable to open report');
                  });
                }}
              >
                <Ionicons
                  name="eye-outline"
                  size={16}
                  color="#2563EB"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.viewReportBtnText}>
                  {isHindi ? 'रिपोर्ट देखें (PDF)' : 'View Report (PDF)'}
                </Text>
              </TouchableOpacity>
            )}

            {item.advisoryText ? (
              <View style={styles.advisoryBox}>
                <Text style={styles.advisoryLabel}>
                  {isHindi ? 'नोट:' : 'Note:'}
                </Text>
                <Text style={styles.advisoryText}>{item.advisoryText}</Text>
              </View>
            ) : null}

            <View style={styles.completedActionsRow}>
              <TouchableOpacity
                style={styles.editReportBtn}
                onPress={() => {
                  setUploadingFor(item);
                  const fileName = item.reportUrl ? item.reportUrl.split('/').pop() || 'report.pdf' : null;
                  setUploadedPdfTarget(null);
                  setUploadedPdfName(fileName);
                  setReportNote(item.advisoryText || '');
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={14}
                  color="#D97706"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.editReportBtnText}>
                  {isHindi ? 'रिपोर्ट एडिट करें' : 'Edit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : item.status === 'Cancelled' ? (
          <View style={styles.cancelledBox}>
            <View style={styles.completedRow}>
              <Ionicons
                name="close-circle-outline"
                size={14}
                color="#DC2626"
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.completedText, { color: '#DC2626' }]}>
                {isHindi ? 'रद्द कर दिया गया' : 'Cancelled'}
              </Text>
            </View>
            {item.cancelReason ? (
              <Text style={styles.cancelReasonText}>
                {isHindi ? 'कारण: ' : 'Reason: '}{item.cancelReason}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="file-tray-outline" size={24} color="#9CA3AF" />
      <Text style={styles.emptyText}>
        {isHindi
          ? 'इस status में अभी कोई रिक्वेस्ट नहीं है'
          : 'No requests in this status yet'}
      </Text>
    </View>
  );

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

        <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(soil-lab)/notifications' as any)}>
          <NotificationIcon size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        {/* Title + subtitle */}
        <Text style={styles.pageTitle}>
          {isHindi ? 'मिट्टी जांच रिक्वेस्ट' : 'Soil test requests'}
        </Text>
        <Text style={styles.pageSubTitle}>
          {isHindi
            ? 'नई, पेंडिंग और पूर्ण सभी request एक जगह देखें.'
            : 'View all new, pending and completed soil requests in one place.'}
        </Text>

        {/* TABS ROW */}
        <View style={{ marginBottom: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
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
                    {labelForTab(tab)}
                  </Text>
                  {tab === 'New' && tabCounts['New'] > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{tabCounts['New']}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#6B7280"
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isHindi
                ? 'किसान, मोबाइल या गांव से खोजें'
                : 'Search by farmer, mobile or village'
            }
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Upload sheet (IN_PROGRESS ke liye) */}
        {uploadingFor && (
          <View style={styles.uploadSheet}>
            <Text style={styles.uploadTitle}>
              {isHindi ? 'रिपोर्ट अपलोड करें' : 'Upload soil report'}
            </Text>
            <Text style={styles.uploadSub}>
              {uploadingFor.farmer?.name} · {uploadingFor.village || 'N/A'}
            </Text>

            <TouchableOpacity
              style={styles.uploadPdfBtn}
              onPress={handlePickPdf}
            >
              <Ionicons
                name="document-attach-outline"
                size={18}
                color="#2563EB"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.uploadPdfText}>
                {uploadedPdfName
                  ? uploadedPdfName
                  : isHindi
                    ? 'PDF चुनें (report)'
                    : 'Choose PDF report'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.uploadNoteInput}
              placeholder={
                isHindi
                  ? 'किसान के लिए नोट लिखें (optional)'
                  : 'Write a note for farmer (optional)'
              }
              placeholderTextColor="#9CA3AF"
              value={reportNote}
              onChangeText={setReportNote}
              multiline
            />

            <View style={styles.uploadActionsRow}>
              <TouchableOpacity
                style={[styles.uploadActionBtn, { backgroundColor: '#E5E7EB' }]}
                onPress={() => {
                  setUploadingFor(null);
                  setUploadedPdfTarget(null);
                  setUploadedPdfName(null);
                  setReportNote('');
                }}
              >
                <Text
                  style={[styles.uploadActionText, { color: '#111827' }]}
                >
                  {isHindi ? 'Cancel' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadActionBtn,
                  {
                    backgroundColor: (uploadedPdfName || (uploadingFor && uploadingFor.reportUrl)) ? '#16A34A' : '#9CA3AF'
                  },
                ]}
                disabled={!uploadedPdfName && !(uploadingFor && uploadingFor.reportUrl)}
                onPress={() => {
                  if (uploadingFor) {
                    moveStatus(uploadingFor, 'Completed');
                  }
                  setUploadingFor(null);
                  setUploadedPdfTarget(null);
                  setUploadedPdfName(null);
                  setReportNote('');
                }}
              >
                <Text
                  style={[styles.uploadActionText, { color: '#FFFFFF' }]}
                >
                  {isHindi ? 'Complete करें' : 'Mark as completed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CARD LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={false}
            data={filteredRequests}
            keyExtractor={item => item._id}
            renderItem={renderRequest}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020'
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E5F4FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoIcon: { width: 28, height: 28, resizeMode: 'contain' },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10
  },

  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  pageSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10
  },

  // tabs row like equipment
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabChip: {
    paddingHorizontal: 14,
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
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    elevation: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0
  },

  listContent: {
    paddingBottom: 20,
    paddingTop: 0
  },

  // card
  reqCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 6,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827'
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EFF6FF'
  },
  datePillText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600'
  },

  reqFarmer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  reqMobile: { fontSize: 13, color: '#4B5563' },
  reqInfoText: { fontSize: 13, color: '#4B5563' },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginLeft: 8,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  cancelledBox: {
    marginTop: 8,
  },
  cancelReasonText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic',
  },

  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  completedText: {
    fontSize: 12,
    color: '#16A34A'
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20
  },
  emptyText: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  // upload sheet
  uploadSheet: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827'
  },
  uploadSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8
  },
  uploadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4
  },
  uploadPdfText: {
    fontSize: 13,
    color: '#1D4ED8'
  },
  uploadNoteInput: {
    marginTop: 10,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    backgroundColor: '#F9FAFB'
  },
  uploadActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  uploadActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: '700'
  },
  completedContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  viewReportBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600'
  },
  advisoryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF'
  },
  advisoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563'
  },
  advisoryText: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 2
  },
  completedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  editReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3C7'
  },
  editReportBtnText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600'
  },

  // Modal
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
