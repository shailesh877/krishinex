// app/agri-doctor.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '@/components/CustomAlert';

const GREEN_DARK = '#467804ff';
const SHADOW_COLOR = '#00000020';

export default function AgriDoctorContactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cropName, setCropName] = useState('');
  const [issue, setIssue] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStatus, setUserStatus] = useState('pending');

  // For viewing details
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const t = {
    title: hi ? 'डॉक्टर से संपर्क' : 'Connect with Doctor',
    headerSub: hi ? 'विशेषज्ञों से सीधे जुड़ें' : 'Connect directly with experts',
    callBtn: hi ? 'कॉल पर बात करें' : 'Call Doctor',
    whatsappBtn: hi ? 'WhatsApp पर मैसेज करें' : 'Chat on WhatsApp',
    helpNote: hi 
      ? 'फसल की बीमारी, खाद की जानकारी या खेती से जुड़े किसी भी सवाल के लिए संपर्क करें।' 
      : 'Contact for crop diseases, fertilizer info or any farming query.',
    workingHours: hi ? 'समय: सुबह 9:00 - शाम 6:00' : 'Hours: 9:00 AM - 6:00 PM',
    formHeader: hi ? 'सलाह के लिए फॉर्म भरें' : 'Fill form for consultation',
    nameLabel: hi ? 'आपका नाम' : "Your Name",
    phoneLabel: hi ? 'मोबाइल नंबर' : "Phone Number",
    cropLabel: hi ? 'फसल का नाम' : "Crop Name",
    issueLabel: hi ? 'समस्या का विवरण' : "Describe the issue",
    imageBtn: hi ? 'फोटो जोड़ें' : "Add Photo",
    submitBtn: hi ? 'जमा करें' : "Submit Now",
    historyTitle: hi ? 'मेरी पुरानी पूछताछ' : 'My Previous Queries',
    noHistory: hi ? 'कोई पूछताछ नहीं मिली' : 'No previous queries found',
    detailTitle: hi ? 'पूछताछ का विवरण' : 'Query Details',
    close: hi ? 'बंद करें' : 'Close',
    contacted: hi ? 'संपर्क किया गया' : 'Contacted'
  };

  useEffect(() => {
    loadUserData();
    fetchHistory();
    fetchUserStatus();
  }, []);

  const fetchUserStatus = async () => {
    try {
      const profileRes = await authApi.getProfile();
      if (profileRes.data && profileRes.data.status) {
        setUserStatus(profileRes.data.status);
      }
    } catch (err) {
      console.warn('Failed to fetch profile status for doctor:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const user = JSON.parse(storedData);
        setName(user.name || '');
        setPhone(user.phone || '');
      }
    } catch (e) { }
  };

  const fetchHistory = async () => {
    try {
      setFetchingHistory(true);
      const res = await authApi.getMyConsultations();
      setHistory(res.data);
    } catch (e) {
      console.error('Fetch history error', e);
    } finally {
      setFetchingHistory(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleWhatsApp = () => {
    if (userStatus !== 'approved') {
      showAlert(
        hi ? 'वेरिफिकेशन आवश्यक' : 'Verification Required',
        hi 
          ? 'डॉक्टर से संपर्क करने के लिए आपका प्रोफाइल वेरीफाइड होना जरूरी है। कृपया अपनी प्रोफाइल पूरी करें और वेरिफिकेशन का इंतजार करें।' 
          : 'Your profile must be verified to contact a doctor. Please complete your profile and wait for verification.',
        [
          { text: hi ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: hi ? 'प्रोफाइल पर जाएँ' : 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    const helpPhone = '917289978002'; // Verified number from help section
    const text = hi
      ? 'नमस्ते कृषि डॉक्टर, मुझे अपनी फसल के बारे में सवाल पूछना है।'
      : 'Hello Agri Doctor, I have a query about my crop.';
    const url = `https://wa.me/${helpPhone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => { });
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (userStatus !== 'approved') {
      showAlert(
        hi ? 'वेरिफिकेशन आवश्यक' : 'Verification Required',
        hi 
          ? 'डॉक्टर से संपर्क करने के लिए आपका प्रोफाइल वेरीफाइड होना जरूरी है। कृपया अपनी प्रोफाइल पूरी करें और वेरिफिकेशन का इंतजार करें।' 
          : 'Your profile must be verified to contact a doctor. Please complete your profile and wait for verification.',
        [
          { text: hi ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: hi ? 'प्रोफाइल पर जाएँ' : 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    // name — required, min 2 chars
    if (!name.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया नाम भरें' : 'Please enter your name');
      return;
    }
    if (name.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
      return;
    }
    // phone — exactly 10 digits
    const phoneClean = phone.trim().replace(/\D/g, '');
    if (!phoneClean || phoneClean.length !== 10) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    // cropName — required, min 2 chars
    if (!cropName.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया फसल का नाम भरें' : 'Please enter crop name');
      return;
    }
    if (cropName.trim().length < 2) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'फसल का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Crop name must be at least 2 characters');
      return;
    }
    // issue — required, min 5 chars
    if (!issue.trim()) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया अपनी समस्या बताएं' : 'Please describe your issue');
      return;
    }
    if (issue.trim().length < 5) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'समस्या का विवरण कम से कम 5 अक्षर का होना चाहिए' : 'Issue description must be at least 5 characters');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('cropName', cropName);
      formData.append('issue', issue);
      
      if (image) {
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;
        // @ts-ignore
        formData.append('image', { uri: image, name: filename, type });
      }

      await authApi.submitConsultation(formData);
      showAlert(hi ? 'सफल' : 'Success', hi ? 'आपका अनुरोध जमा कर दिया गया है।' : 'Your request has been submitted.');
      
      // Reset form
      setCropName('');
      setIssue('');
      setImage(null);
      fetchHistory();
    } catch (e) {
      console.error('Submit failed', e);
      showAlert('Error', hi ? 'जमा करने में विफल।' : 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSub}>{t.headerSub}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_DARK]} />
          }
        >
          {/* WHATSAPP ACTION (TOP) */}
          <View style={styles.topActions}>
            <TouchableOpacity 
              style={styles.actionBtnWA} 
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
                <Text style={styles.btnText}>{t.whatsappBtn}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t.formHeader}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.nameLabel}</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.phoneLabel}</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.cropLabel}</Text>
              <TextInput style={styles.input} value={cropName} onChangeText={setCropName} placeholder={hi ? "जैसे: गेहूं, धान" : "e.g. Wheat, Rice"} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.issueLabel}</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={issue} 
                onChangeText={setIssue} 
                multiline 
                numberOfLines={4} 
                placeholder={hi ? "विस्तार से बताएं..." : "Describe in detail..."}
              />
            </View>

            <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color={GREEN_DARK} />
                  <Text style={styles.imageBtnText}>{t.imageBtn}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{t.submitBtn}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* HISTORY SECTION */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>{t.historyTitle}</Text>
            {fetchingHistory ? (
              <ActivityIndicator color={GREEN_DARK} />
            ) : history.length === 0 ? (
              <Text style={styles.noHistoryTxt}>{t.noHistory}</Text>
            ) : (
              history.map((item) => (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.historyCard} 
                  activeOpacity={0.7}
                  onPress={() => setSelectedItem(item)}
                >
                  <View style={styles.historyTop}>
                    <Text style={styles.historyCrop}>{item.cropName}</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: item.status === 'Pending' ? '#FEF3C7' : 
                                       item.status === 'Contacted' ? '#DBEAFE' : '#D1FAE5' 
                    }]}>
                       <Text style={[styles.statusText, { 
                         color: item.status === 'Pending' ? '#92400E' : 
                                item.status === 'Contacted' ? '#1E40AF' : '#065F46' 
                       }]}>
                         {hi ? (
                           item.status === 'Pending' ? 'लंबित' : 
                           item.status === 'Contacted' ? 'संपर्क किया गया' : 'हल हो गया'
                         ) : item.status}
                       </Text>
                    </View>
                  </View>
                  <Text style={styles.historyIssue} numberOfLines={2}>{item.issue}</Text>
                  <View style={styles.historyFooter}>
                     <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                     <Text style={styles.viewDetailsTxt}>{hi ? 'विस्तार से देखें' : 'View Details'} →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* DETAIL MODAL */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.detailTitle}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeHeaderBtn}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.detailRow}>
                   <Text style={styles.detailLabel}>{t.cropLabel}:</Text>
                   <Text style={styles.detailValue}>{selectedItem.cropName}</Text>
                </View>

                {selectedItem.imageUrl ? (
                   <View style={styles.detailImageWrapper}>
                      <Image 
                        source={{ uri: selectedItem.imageUrl }} 
                        style={styles.detailImage} 
                        resizeMode="cover"
                      />
                   </View>
                ) : null}

                <View style={styles.detailRow}>
                   <Text style={styles.detailLabel}>{hi ? 'स्थिति' : 'Status'}:</Text>
                   <View style={[styles.statusBadge, { 
                     backgroundColor: selectedItem.status === 'Pending' ? '#FEF3C7' : 
                                      selectedItem.status === 'Contacted' ? '#DBEAFE' : '#D1FAE5' 
                   }]}>
                      <Text style={[styles.statusText, { 
                        color: selectedItem.status === 'Pending' ? '#92400E' : 
                               selectedItem.status === 'Contacted' ? '#1E40AF' : '#065F46' 
                      }]}>
                         {hi ? (
                           selectedItem.status === 'Pending' ? 'लंबित' : 
                           selectedItem.status === 'Contacted' ? 'संपर्क किया गया' : 'हल हो गया'
                         ) : selectedItem.status}
                      </Text>
                   </View>
                </View>

                <View style={styles.detailBox}>
                   <Text style={styles.detailLabel}>{t.issueLabel}:</Text>
                   <Text style={styles.detailFullIssue}>{selectedItem.issue}</Text>
                </View>

                {selectedItem.status === 'Resolved' && selectedItem.resolvedNote ? (
                  <View style={[styles.detailBox, { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1 }]}>
                    <Text style={[styles.detailLabel, { color: '#065F46' }]}>
                      {hi ? 'डॉक्टर की सलाह:' : 'Doctor\'s Advice:'}
                    </Text>
                    <Text style={[styles.detailFullIssue, { backgroundColor: 'transparent', color: '#065F46', fontWeight: '700' }]}>
                      {selectedItem.resolvedNote}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                   <Text style={styles.detailLabel}>{hi ? 'तारीख' : 'Date'}:</Text>
                   <Text style={styles.detailValue}>{new Date(selectedItem.createdAt).toLocaleString()}</Text>
                </View>

                <TouchableOpacity 
                   style={styles.closeBtn} 
                   onPress={() => setSelectedItem(null)}
                >
                   <Text style={styles.closeBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  content: { padding: 16 },
  
  topActions: { marginBottom: 20 },
  actionBtnWA: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  imageUploadBtn: {
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN_DARK,
    marginTop: 8,
  },
  previewImage: { width: '100%', height: '100%', borderRadius: 16 },
  
  submitBtn: {
    height: 54,
    backgroundColor: GREEN_DARK,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  historySection: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
  },
  noHistoryTxt: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCrop: { fontSize: 15, fontWeight: '800', color: '#111827' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  historyIssue: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 8 },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  historyDate: { fontSize: 11, color: '#9CA3AF' },
  viewDetailsTxt: { fontSize: 12, fontWeight: '700', color: GREEN_DARK },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  closeHeaderBtn: {
    padding: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    width: 100,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  detailBox: {
    marginBottom: 20,
  },
  detailFullIssue: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  detailImageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    backgroundColor: '#F3F4F6',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
  },
});
