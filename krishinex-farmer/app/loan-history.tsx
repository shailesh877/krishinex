// app/loan-history.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { authApi } from '../services/api';
import { showAlert } from '@/components/CustomAlert';

const GREEN_DARK = '#467804ff';

type LoanLead = {
  _id: string;
  farmerName: string;
  fatherName?: string;
  mobile: string;
  aadhaar: string;
  pan?: string;
  fullAddress: string;
  landSize: string;
  landType: string;
  crops?: string;
  khatauni?: string;
  loanAmount: number;
  loanPurpose: string;
  otherPurpose?: string;
  farmingMonthlyIncome?: string;
  familyMonthlyIncome?: string;
  hasExistingLoan: string;
  existingLoanDetails?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export default function LoanHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [leads, setLeads] = useState<LoanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<LoanLead | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await authApi.getMyLoanLeads();
      setLeads(res.data);
    } catch (e) {
      console.error('Fetch loan history error:', e);
      showAlert(hi ? 'इतिहास लोड करने में विफल' : 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const statusLabel = (status: string) => {
    if (hi) {
      if (status === 'pending') return 'पेंडिंग';
      if (status === 'approved') return 'स्वीकृत';
      if (status === 'rejected') return 'अस्वीकृत';
    }
    return status.toUpperCase();
  };

  const statusColor = (status: string) => {
    if (status === 'approved') return '#10B981';
    if (status === 'rejected') return '#EF4444';
    return '#F59E0B';
  };

  const openDetails = (lead: LoanLead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };

  const DetailRow = ({ label, value }: { label: string; value?: string | number }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {hi ? 'लोन आवेदन इतिहास' : 'Loan Application History'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            size="small"
            color={GREEN_DARK}
          />
        ) : leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyText}>
              {hi ? 'कोई आवेदन नहीं मिला' : 'No applications found'}
            </Text>
          </View>
        ) : (
          leads.map((lead) => (
            <TouchableOpacity 
              key={lead._id} 
              style={styles.leadCard}
              onPress={() => openDetails(lead)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.purposeText}>
                    {lead.loanPurpose.toUpperCase()}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(lead.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(lead.status) + '15', borderColor: statusColor(lead.status) },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor(lead.status) }]}>
                    {statusLabel(lead.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{hi ? 'राशि' : 'Amount'}</Text>
                  <Text style={styles.infoValue}>₹{lead.loanAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                  <Text style={styles.infoLabel}>{hi ? 'देखें' : 'View Details'}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* DETAILS MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{hi ? 'आवेदन का विवरण' : 'Application Details'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedLead && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{hi ? 'व्यक्तिगत जानकारी' : 'Personal Info'}</Text>
                    <DetailRow label={hi ? 'नाम' : 'Name'} value={selectedLead.farmerName} />
                    <DetailRow label={hi ? 'पिता/पति' : 'Father/Husband'} value={selectedLead.fatherName} />
                    <DetailRow label={hi ? 'मोबाइल' : 'Mobile'} value={selectedLead.mobile} />
                    <DetailRow label={hi ? 'आधार' : 'Aadhaar'} value={selectedLead.aadhaar} />
                    <DetailRow label={hi ? 'पैन' : 'PAN'} value={selectedLead.pan} />
                    <DetailRow label={hi ? 'पता' : 'Address'} value={selectedLead.fullAddress} />
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{hi ? 'खेती और जमीन' : 'Land & Farming'}</Text>
                    <DetailRow label={hi ? 'जमीन का साइज' : 'Land Size'} value={selectedLead.landSize} />
                    <DetailRow label={hi ? 'जमीन का प्रकार' : 'Land Type'} value={selectedLead.landType} />
                    <DetailRow label={hi ? 'फसलें' : 'Crops'} value={selectedLead.crops} />
                    <DetailRow label={hi ? 'खतौनी नंबर' : 'Khatauni No.'} value={selectedLead.khatauni} />
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{hi ? 'लोन की जानकारी' : 'Loan Info'}</Text>
                    <DetailRow label={hi ? 'उद्देश्य' : 'Purpose'} value={selectedLead.loanPurpose} />
                    {selectedLead.otherPurpose && (
                      <DetailRow label={hi ? 'विवरण' : 'Details'} value={selectedLead.otherPurpose} />
                    )}
                    <DetailRow label={hi ? 'राशि' : 'Amount'} value={`₹${selectedLead.loanAmount.toLocaleString()}`} />
                    <DetailRow label={hi ? 'पुराना लोन?' : 'Existing Loan?'} value={selectedLead.hasExistingLoan} />
                    {selectedLead.existingLoanDetails && (
                      <DetailRow label={hi ? 'पुराना लोन विवरण' : 'Old Loan Info'} value={selectedLead.existingLoanDetails} />
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{hi ? 'आय का विवरण' : 'Income Details'}</Text>
                    <DetailRow label={hi ? 'खेती से आय' : 'Farming Income'} value={selectedLead.farmingMonthlyIncome} />
                    <DetailRow label={hi ? 'पारिवारिक आय' : 'Family Income'} value={selectedLead.familyMonthlyIncome} />
                  </View>

                  <View style={[styles.section, { borderBottomWidth: 0 }]}>
                    <Text style={styles.sectionHeader}>{hi ? 'आवेदन की स्थिति' : 'Application Status'}</Text>
                    <View style={styles.statusBox}>
                      <Text style={[styles.statusBoxText, { color: statusColor(selectedLead.status) }]}>
                        {statusLabel(selectedLead.status)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  dateText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN_DARK,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1.5,
    textAlign: 'right',
  },
  statusBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusBoxText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
