// app/soil-reports.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi, BASE_URL, IMAGE_BASE_URL } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const GREEN_DARK = '#467804ff';
const SHADOW_COLOR = '#00000020';

export default function SoilReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await authApi.getMySoilRequests();
      setReports(res.data);
    } catch (e) {
      console.error('Fetch reports error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const t = {
    headerTitle: hi ? 'मिट्टी जांच रिपोर्ट्स' : 'Soil Test Reports',
    appliedOn: hi ? 'सैंपल दिया' : 'Applied on',
    reportedOn: hi ? 'रिपोर्ट आई' : 'Report on',
    status: hi ? 'स्टेटस' : 'Status',
    statusCompleted: hi ? 'पूरा हो गया' : 'Completed',
    statusPending: hi ? 'पेंडिंग' : 'Pending',
    statusAccepted: hi ? 'स्वीकार किया' : 'Accepted',
    statusInProgress: hi ? 'जांच जारी' : 'In Progress',
    statusCancelled: hi ? 'रद्द' : 'Cancelled',
    viewReport: hi ? 'रिपोर्ट देखें' : 'View report',
    newBadge: hi ? 'नया' : 'NEW',
    noReports: hi ? 'कोई रिपोर्ट नहीं मिली' : 'No reports found',
    detailsTitle: hi ? 'रिपोर्ट डिटेल्स' : 'Report Details',
    labInfo: hi ? 'लैब की जानकारी' : 'Lab Information',
    requestInfo: hi ? 'जांच की जानकारी' : 'Request Information',
    advisory: hi ? 'लैब की सलाह' : 'Lab Advisory',
    callLab: hi ? 'लैब को कॉल करें' : 'Call Lab',
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Completed': return t.statusCompleted;
      case 'Accepted': return t.statusAccepted;
      case 'InProgress': return t.statusInProgress;
      case 'Cancelled': return t.statusCancelled;
      default: return t.statusPending;
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isNewest = index === 0;
    const dateStr = new Date(item.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, isNewest && styles.cardNewest]}
        onPress={() => {
          setSelectedReport(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={GREEN_DARK}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.cardTitle}>
              {item.cropName} – {item.sampleType}
            </Text>
          </View>

          {isNewest && (
            <View style={styles.badgeNew}>
              <Text style={styles.badgeNewText}>{t.newBadge}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.metaText}>
              {t.appliedOn}:{' '}
              <Text style={styles.metaValue}>{dateStr}</Text>
            </Text>
            <Text style={styles.metaText}>
              {hi ? 'लैब' : 'Lab'}:{' '}
              <Text style={styles.metaValue}>{item.lab ? item.lab.businessName || item.lab.name : '-'}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statusText}>
              {t.status}:{' '}
              <Text style={[styles.statusValue, { color: item.status === 'Completed' ? '#10B981' : '#F59E0B' }]}>
                {getStatusText(item.status)}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={{ fontSize: 10, color: '#9CA3AF' }}>ID: {item._id.toString().slice(-6).toUpperCase()}</Text>

          <View style={styles.viewRow}>
            <Text style={styles.viewText}>{t.viewReport}</Text>
            <Ionicons name="chevron-forward" size={14} color={GREEN_DARK} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleOpenReport = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${IMAGE_BASE_URL}${url}`;
    Linking.openURL(fullUrl).catch(err => {
      console.error("Failed to open URL", err);
      showAlert(hi ? "त्रुटि" : "Error", hi ? "रिपोर्ट खोलने में विफल" : "Failed to open report");
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <View style={{ width: 32 }} />
      </View>

      {
        loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GREEN_DARK} />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={reports}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_DARK]} />
            }
            ListEmptyComponent={
              <View style={{ flex: 1, marginTop: 100, alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={60} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 10 }}>{t.noReports}</Text>
              </View>
            }
          />
        )
      }

      {/* DETAIL MODAL */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{t.detailsTitle}</Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.detailCloseBtn}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                {/* STATUS BADGE */}
                <View style={[
                  styles.statusBadgeLarge,
                  { backgroundColor: selectedReport.status === 'Completed' ? '#D1FAE5' : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusBadgeTextLarge,
                    { color: selectedReport.status === 'Completed' ? '#059669' : '#D97706' }
                  ]}>
                    {getStatusText(selectedReport.status)}
                  </Text>
                </View>

                {/* REQUEST INFO */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="information-circle-outline" size={18} color={GREEN_DARK} />
                    <Text style={styles.detailSectionTitle}>{t.requestInfo}</Text>
                  </View>
                  <View style={styles.detailCardInfo}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'फसल' : 'Crop'}:</Text>
                      <Text style={styles.detailValue}>{selectedReport.cropName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'सैंपल' : 'Sample'}:</Text>
                      <Text style={styles.detailValue}>{selectedReport.sampleType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'जांच का प्रकार' : 'Test Type'}:</Text>
                      <Text style={styles.detailValue}>{selectedReport.testType || 'NPK'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'विज़िट' : 'Visit'}:</Text>
                      <Text style={styles.detailValue}>{selectedReport.visitType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'तारीख' : 'Date'}:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedReport.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{hi ? 'आईडी' : 'ID'}:</Text>
                      <Text style={styles.detailValue}>#{selectedReport._id.toString().toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* LAB INFO */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="business-outline" size={18} color={GREEN_DARK} />
                    <Text style={styles.detailSectionTitle}>{t.labInfo}</Text>
                  </View>
                  <View style={styles.detailCardInfo}>
                    <Text style={styles.labNameDetail}>
                      {selectedReport.lab?.businessName || selectedReport.lab?.name}
                    </Text>
                    {selectedReport.lab?.address && (
                      <View style={styles.detailRowSmall}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.labSubInfo}>{selectedReport.lab.address}</Text>
                      </View>
                    )}
                    {selectedReport.lab?.phone && (
                      <TouchableOpacity
                        style={styles.callLabBtn}
                        onPress={() => Linking.openURL(`tel:${selectedReport.lab.phone}`)}
                      >
                        <Ionicons name="call" size={16} color="#FFFFFF" />
                        <Text style={styles.callLabText}>{t.callLab}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* ADVISORY */}
                {selectedReport.advisoryText && (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
                      <Text style={styles.detailSectionTitle}>{t.advisory}</Text>
                    </View>
                    <View style={styles.advisoryCard}>
                      <Text style={styles.advisoryText}>{selectedReport.advisoryText}</Text>
                    </View>
                  </View>
                )}

                {/* VIEW REPORT BUTTON */}
                {selectedReport.status === 'Completed' && selectedReport.reportUrl && (
                  <TouchableOpacity
                    style={styles.mainReportBtn}
                    onPress={() => handleOpenReport(selectedReport.reportUrl)}
                  >
                    <Ionicons name="document-text" size={20} color="#FFFFFF" />
                    <Text style={styles.mainReportBtnText}>{t.viewReport}</Text>
                  </TouchableOpacity>
                )}
                
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardNewest: {
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  badgeNew: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaValue: {
    fontWeight: '700',
    color: '#111827',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusValue: {
    fontWeight: '700',
    color: '#111827',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 11,
    fontWeight: '700',
    color: GREEN_DARK,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    width: '100%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  detailCloseBtn: {
    padding: 4,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusBadgeTextLarge: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  detailCardInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  labNameDetail: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  detailRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  labSubInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  callLabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_DARK,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  callLabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  advisoryCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  advisoryText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
    fontWeight: '600',
  },
  mainReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  mainReportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
});
