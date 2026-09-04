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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ActivityIndicator } from 'react-native';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/soil`;

type StatusType = 'New' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

type RequestItem = {
  _id: string; // Updated from id to _id
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
  reportUrl?: string;
  advisoryText?: string;
};

export default function SoilLabRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [activeTab, setActiveTab] = useState<StatusType>('New');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // upload sheet ke liye
  const [uploadingFor, setUploadingFor] = useState<RequestItem | null>(null);
  const [uploadedPdfTarget, setUploadedPdfTarget] = useState<any>(null); // Asset reference
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState('');

  useFocusEffect(
    React.useCallback(() => {
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

  const filteredRequests = useMemo(
    () =>
      requests.filter(r => {
        if (r.status !== activeTab) return false;
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          r.farmer?.name?.toLowerCase().includes(s) ||
          r.farmer?.phone?.includes(s) ||
          (r.village && r.village.toLowerCase().includes(s)) ||
          r._id.toLowerCase().includes(s)
        );
      }),
    [activeTab, search, requests],
  );

  const moveStatus = async (item: RequestItem, explicitNext?: StatusType) => {
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
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        // Optimistic UI update or re-fetch
        fetchRequests();
      } else {
        const d = await res.json();
        showAlert('Error', d.error || 'Failed to update request');
      }
    } catch (e: any) {
      showAlert('Error', 'Network error changing status');
    }
  };

  // ✅ FIXED for new expo-document-picker
  const handlePickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
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
    const showPrimary = item.status !== 'Completed' && item.status !== 'Cancelled';
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
            <View style={styles.smallDot} />
            <Text style={styles.statusText}>
              {isHindi
                ? item.status === 'New'
                  ? 'नया'
                  : item.status === 'Accepted'
                    ? 'पेंडिंग'
                    : item.status === 'InProgress'
                      ? 'जांच जारी'
                      : 'पूर्ण'
                : item.status === 'New'
                  ? 'New'
                  : item.status === 'Accepted'
                    ? 'Pending'
                    : item.status === 'InProgress'
                      ? 'In progress'
                      : 'Completed'}
            </Text>
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
              color={item.status === 'New' ? '#9CA3AF' : '#2563EB'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.reqMobile,
                item.status !== 'New' && { color: '#2563EB', textDecorationLine: 'underline' },
              ]}
            >
              {item.status === 'New'
                ? isHindi
                  ? 'स्वीकार करने के बाद दिखेगा'
                  : 'Hidden until accepted'
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
        {showPrimary ? (
          <View style={styles.actionsRow}>
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
          </View>
        ) : item.status === 'Completed' ? (
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
        ) : (
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
        )}
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

  const tabs: { key: StatusType; labelHi: string; labelEn: string }[] = [
    { key: 'New', labelHi: 'नया', labelEn: 'New' },
    { key: 'Accepted', labelHi: 'स्वीकृत', labelEn: 'Pending' },
    { key: 'InProgress', labelHi: 'जारी', labelEn: 'In progress' },
    { key: 'Completed', labelHi: 'पूर्ण', labelEn: 'Completed' },
  ];

  const logoText = logoTextSource;
  const logoIcon = logoIconSource;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER same style */}
      <View style={[styles.appHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.logoIconWrap}>
          <Image source={logoIcon} style={styles.logoIcon} />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image source={logoText} style={styles.logoTextImage} />
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

        {/* GREEN TABS strip */}
        <View style={styles.tabStripRow}>
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabStripChip, active && styles.tabStripChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabStripText,
                    active && styles.tabStripTextActive,
                  ]}
                >
                  {isHindi ? tab.labelHi : tab.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SEARCH */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isHindi
                  ? 'उपकरण, मालिक या गांव से खोजें'
                  : 'Search by farmer, mobile or village'
              }
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>
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
                    backgroundColor: (uploadedPdfName || (uploadingFor && uploadingFor.reportUrl)) ? '#16A34A' : '#9CA3AF',
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
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

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  pageSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },

  // green tabs (strip)
  tabStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabStripChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  tabStripChipActive: {
    backgroundColor: '#DCFCE7',
  },
  tabStripText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  tabStripTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },

  // search
  searchRow: { marginBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  listContent: {
    paddingBottom: 20,
    paddingTop: 0,
  },

  // big card like equipment
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
    elevation: 4,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  datePillText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },

  reqFarmer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reqMobile: { fontSize: 13, color: '#4B5563' },
  reqInfoText: { fontSize: 13, color: '#4B5563' },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#16A34A',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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
    elevation: 3,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  uploadSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
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
    marginTop: 4,
  },
  uploadPdfText: {
    fontSize: 13,
    color: '#1D4ED8',
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
    backgroundColor: '#F9FAFB',
  },
  uploadActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  uploadActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    alignSelf: 'flex-start',
  },
  viewReportBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  advisoryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  advisoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  advisoryText: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 2,
  },
  completedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3C7',
  },
  editReportBtnText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
});
