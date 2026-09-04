// app/(employee)/soil-assign.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

type SoilStatus = 'new' | 'sample-picked' | 'sent-to-lab' | 'reported';

type SoilTask = {
  id: string;
  farmerName: string;
  farmerPhone: string;
  village: string;
  dateLabel: string;
  sampleCount: number;
  status: SoilStatus;
  cropName: string;
  testType: string;
  visitType: string;
};

const STATUS_ORDER: SoilStatus[] = [
  'new',
  'sample-picked',
  'sent-to-lab',
  'reported',
];

const DUMMY_SOIL: SoilTask[] = [
  {
    id: 'S1',
    farmerName: 'Mahesh',
    farmerPhone: '9876543210',
    village: 'Deoria',
    dateLabel: 'Today • 11:30 AM',
    sampleCount: 3,
    status: 'new',
    cropName: 'Wheat',
    testType: 'NPK',
    visitType: 'Field Pickup',
  },
  {
    id: 'S2',
    farmerName: 'Rakesh',
    farmerPhone: '9876543211',
    village: 'Sikandarpur',
    dateLabel: 'Yesterday • 4:00 PM',
    sampleCount: 2,
    status: 'sample-picked',
    cropName: 'Rice',
    testType: 'pH',
    visitType: "I'll visit lab",
  },
  {
    id: 'S3',
    farmerName: 'Suresh',
    farmerPhone: '9876543212',
    village: 'Karnal',
    dateLabel: '2 days ago • 3:15 PM',
    sampleCount: 4,
    status: 'sent-to-lab',
    cropName: 'Sugarcane',
    testType: 'Micro Nutrients',
    visitType: 'Field Pickup',
  },
];

export default function SoilAssignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [tasks, setTasks] = useState<SoilTask[]>([]);
  const [activeTab, setActiveTab] = useState<SoilStatus>('new');

  const fetchTasks = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/employee/soil-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped: SoilTask[] = data.map((r: any) => ({
          id: r._id,
          farmerName: r.farmer?.name || 'Unknown Farmer',
          farmerPhone: r.farmer?.phone || '-',
          village: r.farmer?.address || 'Unknown Village',
          dateLabel: new Date(r.createdAt).toLocaleDateString(),
          sampleCount: r.sampleCount || 1,
          cropName: r.cropName || 'Not specified',
          testType: r.testType || 'NPK',
          visitType: r.visitType || 'I will visit lab',
          status: r.status === 'New' ? 'new'
            : r.status === 'Accepted' ? 'sample-picked'
              : r.status === 'InProgress' ? 'sent-to-lab'
                : r.status === 'Completed' ? 'reported'
                  : 'new' as SoilStatus,
        }));
        setTasks(mapped);
      }
    } catch (e) {
      console.error('Fetch soil tasks error:', e);
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
    header: isHindi ? 'Soil testing assign' : 'Soil testing assign',
    chipNew: isHindi ? 'New' : 'New',
    chipPicked: isHindi ? 'Sample pickup' : 'Sample picked',
    chipLab: isHindi ? 'Lab को भेजा' : 'Sent to lab',
    chipReported: isHindi ? 'Report upload' : 'Report uploaded',
  };

  const statusLabel = (status: SoilStatus) => {
    if (status === 'new') return isHindi ? 'नया soil test request' : 'New soil test request';
    if (status === 'sample-picked')
      return isHindi ? 'Sample pickup हो चुका' : 'Sample picked';
    if (status === 'sent-to-lab')
      return isHindi ? 'Sample lab को भेजा' : 'Sent to lab';
    return isHindi ? 'Report upload हो चुकी' : 'Report uploaded';
  };

  const primaryBtnText = (status: SoilStatus) => {
    if (status === 'new')
      return isHindi ? 'Sample pickup mark करें' : 'Mark sample picked';
    if (status === 'sample-picked')
      return isHindi ? 'Lab को भेज दिया' : 'Mark sent to lab';
    if (status === 'sent-to-lab')
      return isHindi ? 'Report upload करके complete करें' : 'Upload report & mark complete';
    return isHindi ? 'Report already upload है' : 'Report already uploaded';
  };

  const nextStatus = (current: SoilStatus): SoilStatus => {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx === STATUS_ORDER.length - 1) return current;
    return STATUS_ORDER[idx + 1];
  };

  const onPrimaryAction = async (task: SoilTask) => {
    if (task.status === 'reported') return;
    const newStatus = nextStatus(task.status);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      if (newStatus === 'reported') {
        const docRes = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });

        if (docRes.canceled) return;

        const file = docRes.assets[0];
        const formData = new FormData();
        formData.append('status', 'Completed');
        // @ts-ignore
        formData.append('report', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        });

        const res = await fetch(`${API_URL}/soil/requests/${task.id}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            // Do not set Content-Type for FormData
          },
          body: formData,
        });

        if (res.ok) {
          showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'रिपोर्ट अपलोड हो गई' : 'Report uploaded successfully');
          setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
        } else {
          showAlert(isHindi ? 'गलती' : 'Error', isHindi ? 'अपलोड फेल' : 'Upload failed');
        }
      } else {
        // Normal status update
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
        await fetch(`${API_URL}/employee/soil-tasks/${task.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus })
        });
      }
    } catch (e) {
      console.error('Update soil status err:', e);
      showAlert('Error', 'Something went wrong');
    }
  };

  const filteredTasks = useMemo(
    () => tasks.filter(t => (activeTab ? t.status === activeTab : true)),
    [tasks, activeTab],
  );

  const chipLabel = (s: SoilStatus) => {
    if (s === 'new') return t.chipNew;
    if (s === 'sample-picked') return t.chipPicked;
    if (s === 'sent-to-lab') return t.chipLab;
    return t.chipReported;
  };

  const renderChip = (status: SoilStatus) => {
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

  const renderItem = ({ item }: { item: SoilTask }) => {
    const completed = item.status === 'reported';

    return (
      <View style={styles.card}>
        {/* HEADER: STATUS & DATE */}
        <View style={styles.cardTop}>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{statusLabel(item.status)}</Text>
          </View>
          <Text style={styles.dateLabel}>{item.dateLabel}</Text>
        </View>

        {/* MIDDLE: INFO */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="person-outline" size={16} color="#4B5563" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'किसान:' : 'Farmer:'}</Text>
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
            <Text style={styles.infoLabel}>{isHindi ? 'पता:' : 'Addr:'}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{item.village}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="leaf-outline" size={16} color="#16A34A" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'फसल:' : 'Crop:'}</Text>
            <Text style={styles.infoValue}>{item.cropName}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="flask-outline" size={16} color="#2563EB" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'टेस्ट:' : 'Test:'}</Text>
            <Text style={styles.infoValue}>{item.testType} ({item.sampleCount} {isHindi ? 'सैंपल' : 'samples'})</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="car-outline" size={16} color="#9333EA" />
            </View>
            <Text style={styles.infoLabel}>{isHindi ? 'विजिट:' : 'Visit:'}</Text>
            <Text style={styles.infoValue}>{item.visitType}</Text>
          </View>
        </View>

        {/* BOTTOM: ACTIONS */}
        <View style={styles.cardFooter}>

        {!completed ? (
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
                ? 'Soil test report farmer को दिख रही है'
                : 'Soil test report is visible to farmer'}
            </Text>
          </View>
        )}
      </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
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
              {isHindi ? 'इस status में कोई soil test नहीं' : 'No soil tests in this status'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'जब admin नया soil test देगा या status बदलेगा, वो यहां दिखेगा.'
                : 'When admin assigns/updates soil tests, they will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

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

  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#0EA5E9',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardBody: {
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
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  footerInfoText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
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
