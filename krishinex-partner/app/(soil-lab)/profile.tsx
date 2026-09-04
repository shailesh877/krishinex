import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AVATAR_SIZE = 86;
import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import NotificationIcon from '@/components/NotificationIcon';
const API_URL = `${BASE_API_URL}/user`;

export default function SoilLabProfile() {
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  // state
  const [avatar, setAvatar] = useState(
    'https://via.placeholder.com/200x200/0ea5e9/ffffff?text=Soil+Lab',
  );
  const [labName, setLabName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isVerified, setIsVerified] = useState(false); // true when admin approves

  // Aadhaar fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState<string | null>(null);

  // Bank details
  const [bankDetails, setBankDetails] = useState({ holderName: '', bankName: '', accountNumber: '', ifscCode: '', bankAddress: '' });
  const [bankSaving, setBankSaving] = useState(false);

  // Document uploads
  const [labLicenseDocName, setLabLicenseDocName] = useState<string | null>(null);
  const [cancelChequeDocName, setCancelChequeDocName] = useState<string | null>(null);

  // edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editAvatar, setEditAvatar] = useState(avatar);
  const [editLabName, setEditLabName] = useState(labName);
  const [editOwnerName, setEditOwnerName] = useState(ownerName);
  const [editAadhaarNumber, setEditAadhaarNumber] = useState(aadhaarNumber);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { profile, refreshUser, updateUser } = useUser();

  // Sync profile data to local state for the edit form
  useEffect(() => {
    if (profile) {
      setOwnerName(profile.name || '');
      setLabName(profile.businessName || '');
      setAadhaarNumber(profile.aadhaarNumber || '');
      setAadhaarDocName(profile.aadhaarDocUrl ? (isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)') : null);
      setAadhaarDocUrl(profile.aadhaarDocUrl || null);
      setAadhaarBackDocName(profile.aadhaarBackDocUrl ? (isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)') : null);
      setAadhaarBackDocUrl(profile.aadhaarBackDocUrl || null);
      setIsVerified(profile.status === 'approved');
      if (profile.bankDetails) {
        setBankDetails({
          holderName: profile.bankDetails.holderName || '',
          bankName: profile.bankDetails.bankName || '',
          accountNumber: profile.bankDetails.accountNumber || '',
          ifscCode: profile.bankDetails.ifscCode || '',
          bankAddress: profile.bankDetails.bankAddress || '',
        });
      }
      setLabLicenseDocName(profile.businessLicenseUrl ? profile.businessLicenseUrl : null);
      setCancelChequeDocName(profile.bankDetails?.bankDocUrl ? profile.bankDetails.bankDocUrl : null);
      if (profile.avatarUri) {
        setAvatar(profile.avatarUri);
      }
      
      setLoading(false);
    }
  }, [profile, isHindi]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      await refreshUser();
    } catch (error) {
      console.error('Error fetching soil lab profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const text = {
    aadhaarLabel: isHindi ? 'आधार नंबर' : 'Aadhaar number',
    aadhaarPlaceholder: isHindi
      ? '12 अंकों का आधार नंबर'
      : '12 digit Aadhaar number',
    aadhaarDoc: isHindi ? 'आधार डॉक्यूमेंट' : 'Aadhaar document',
    aadhaarDocNotUploaded: isHindi
      ? 'अभी तक कोई डॉक्यूमेंट अपलोड नहीं किया गया'
      : 'No Aadhaar document uploaded yet',
    viewOrUploadAadhaar: isHindi
      ? 'आधार देखें / अपलोड करें'
      : 'View / Upload Aadhaar',
    loading: isHindi ? 'लोड हो रहा है...' : 'Loading...',
  };

  const openEdit = () => {
    setEditAvatar(avatar);
    setEditLabName(labName);
    setEditOwnerName(ownerName);
    setEditAadhaarNumber(aadhaarNumber);
    setEditVisible(true);
  };

  const closeEdit = () => setEditVisible(false);

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          lang === 'hi' ? 'परमिशन चाहिए' : 'Permission required',
          lang === 'hi' ? 'Gallery access की परमिशन दें' : 'Please allow gallery access'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      } as any);

      const res = await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const pfp = data.url?.startsWith('http')
          ? data.url
          : `${BASE_URL}/${data.url?.replace(/\\/g, '/')}`;
        setAvatar(pfp);
        updateUser({ avatarUri: pfp });
        showAlert(
          lang === 'hi' ? 'सफल!' : 'Done!',
          lang === 'hi' ? 'प्रोफाइल फोटो अपडेट हो गई' : 'Profile photo updated'
        );
      }
 else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload photo');
    }
  };

  const saveEdit = async () => {
    // ── Required fields ──────────────────────────────────────────
    if (!editOwnerName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'मालिक का नाम आवश्यक है।' : 'Owner name is required.');
      return;
    }
    if (!editLabName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'लैब का नाम आवश्यक है।' : 'Lab name is required.');
      return;
    }
    // ── Optional — validate only when filled ─────────────────────
    if (editAadhaarNumber.trim() && !/^\d{12}$/.test(editAadhaarNumber.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'आधार नंबर 12 अंकों का होना चाहिए।' : 'Aadhaar number must be exactly 12 digits.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) return;

      // Note: mapping `ownerName` to backend `name`, and `labName` to `businessName`
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editOwnerName.trim(),
          businessName: editLabName.trim(),
          aadhaarNumber: editAadhaarNumber.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('Success', isHindi ? 'प्रोफाइल अपडेट हो गई!' : 'Profile updated successfully!');
        
        updateUser({
          name: editOwnerName.trim(),
          businessName: editLabName.trim(),
          aadhaarNumber: editAadhaarNumber.trim(),
        });
        
        setEditVisible(false);
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating soil profile:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating profile');
    }
  };

  const goTerms = () => {
    Linking.openURL('https://krishinex.com/terms');
  };
  const goHelp = () => router.push('/(soil-lab)/help');

  const handleLogout = () => {
    showAlert(
      isHindi ? 'लॉगआउट?' : 'Logout?',
      isHindi
        ? 'क्या आप सच में लॉगआउट करना चाहते हैं?'
        : 'Do you really want to logout?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'लॉगआउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/');
          },
        },
      ],
    );
  };

  const toggleAadhaarDoc = async (side: 'front' | 'back' = 'front') => {
    const isBack = side === 'back';
    const docUrl = isBack ? aadhaarBackDocUrl : aadhaarDocUrl;

    if (isVerified) {
      if (docUrl) {
        viewAadhaar(side);
      } else {
        showAlert(
          isHindi ? 'प्रतिबंधित' : 'Restricted',
          isHindi 
            ? 'आपका प्रोफाइल सत्यापित है। नया डॉक्यूमेंट अपलोड नहीं किया जा सकता।' 
            : 'Your profile is verified. You cannot upload new documents.'
        );
      }
      return;
    }

    if (docUrl) {
      showAlert(
        lang === 'hi' 
          ? (isBack ? 'आधार डॉक्यूमेंट (Back)' : 'आधार डॉक्यूमेंट (Front)') 
          : (isBack ? 'Aadhaar Document (Back)' : 'Aadhaar Document (Front)'),
        lang === 'hi' ? 'क्या करना है?' : 'What would you like to do?',
        [
          { text: lang === 'hi' ? 'देखें' : 'View', onPress: () => viewAadhaar(side) },
          { text: lang === 'hi' ? 'नया अपलोड करें' : 'Re-upload', onPress: () => pickAndUploadAadhaar(side) },
          { text: lang === 'hi' ? 'Cancel' : 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      pickAndUploadAadhaar(side);
    }
  };

  const viewAadhaar = (side: 'front' | 'back' = 'front') => {
    const isBack = side === 'back';
    const docUrl = isBack ? aadhaarBackDocUrl : aadhaarDocUrl;

    if (docUrl) {
      const formattedUrl = docUrl.startsWith('http')
        ? docUrl
        : `${BASE_URL}/${docUrl.replace(/\\/g, '/')}`;

      Linking.openURL(formattedUrl).catch(() =>
        showAlert('Error', 'Cannot open document URL')
      );
    } else {
      showAlert(lang === 'hi' ? 'डॉक्यूमेंट नहीं मिला' : 'No document found', lang === 'hi' ? 'पहले अपलोड करें' : 'Please upload first');
    }
  };

  const pickAndUploadAadhaar = async (side: 'front' | 'back' = 'front') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('aadhaar', {
        uri: asset.uri,
        name: asset.name || `aadhaar_${Date.now()}.pdf`,
        type: asset.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${API_URL}/upload-aadhaar?side=${side}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        if (side === 'back') {
          setAadhaarBackDocUrl(data.url);
          setAadhaarBackDocName(isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)');
        } else {
          setAadhaarDocUrl(data.url);
          setAadhaarDocName(isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)');
        }
        showAlert(
          lang === 'hi' ? 'सफल!' : 'Success',
          lang === 'hi' ? 'आधार अपलोड हो गया' : 'Aadhaar uploaded successfully'
        );
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload document');
    }
  };

  const saveBankDetails = async () => {
    const { holderName, bankName, accountNumber, ifscCode } = bankDetails;
    const anyBankFilled = holderName.trim() || bankName.trim() || accountNumber.trim() || ifscCode.trim();
    if (anyBankFilled) {
      if (!holderName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'खाताधारक का नाम आवश्यक है।' : 'Account holder name is required.');
        return;
      }
      if (!bankName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'बैंक का नाम आवश्यक है।' : 'Bank name is required.');
        return;
      }
      if (!accountNumber.trim() || !/^\d{9,18}$/.test(accountNumber.trim())) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही खाता नंबर डालें (9-18 अंक)।' : 'Enter a valid account number (9-18 digits).');
        return;
      }
      if (!ifscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही IFSC कोड डालें (जैसे: SBIN0001234)।' : 'Enter a valid IFSC code (e.g. SBIN0001234).');
        return;
      }
    }
    
    setBankSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/bank-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bankDetails),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(isHindi ? 'सफल!' : 'Saved!', isHindi ? 'बैंक डिटेल्स सेव हो गई' : 'Bank details saved successfully');
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Save failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not save bank details');
    } finally {
      setBankSaving(false);
    }
  };

  const pickAndUploadLabLicense = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const formData = new FormData();
      formData.append('license', { uri: asset.uri, name: asset.name || `license_${Date.now()}.pdf`, type: asset.mimeType || 'application/pdf' } as any);
      const res = await fetch(`${API_URL}/upload-license`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) {
        setLabLicenseDocName(data.url);
        showAlert(isHindi ? 'सफल!' : 'Done!', isHindi ? 'लाइसेंस अपलोड हो गया' : 'Lab license uploaded successfully');
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload license');
    }
  };

  const pickAndUploadCancelCheque = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const formData = new FormData();
      formData.append('bankDoc', { uri: asset.uri, name: asset.name || `cheque_${Date.now()}.pdf`, type: asset.mimeType || 'application/pdf' } as any);
      const res = await fetch(`${API_URL}/upload-bank-doc`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) {
        setCancelChequeDocName(data.url);
        showAlert(isHindi ? 'सफल!' : 'Done!', isHindi ? 'कैंसिल चेक अपलोड हो गया' : 'Cancelled cheque uploaded successfully');
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload cheque');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>{text.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* header */}
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* profile hero card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarBorder}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                  <View style={styles.avatarGlow} />
                  <TouchableOpacity
                    style={styles.avatarEditBadge}
                    onPress={openEdit}
                  >
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.labPill}>
              {isHindi ? 'सॉइल लैब प्रोफाइल' : 'Soil lab profile'}
            </Text>

            <Text style={styles.nameText}>{labName}</Text>

            <View style={styles.ownerChip}>
              <Ionicons
                name="person-outline"
                size={16}
                color="#16A34A"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.ownerChipText}>
                {isHindi ? 'लैब हेड: ' : 'Lab head: '}
                {ownerName}
              </Text>
            </View>

            {/* Aadhaar number chip */}
            <View style={[styles.ownerChip, { marginTop: 6, backgroundColor: '#F3F4F6' }]}>
              <Ionicons
                name="id-card-outline"
                size={16}
                color="#4B5563"
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.ownerChipText, { color: '#111827' }]}>
                {text.aadhaarLabel}: {aadhaarNumber || '——'}
              </Text>
            </View>

            {/* Aadhaar document row (Front) */}
            <TouchableOpacity
              style={styles.aadhaarDocRow}
              activeOpacity={0.85}
              onPress={() => toggleAadhaarDoc('front')}
            >
              <View style={styles.aadhaarDocLeft}>
                <View style={styles.aadhaarDocIconWrap}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color="#166534"
                  />
                </View>
                <View>
                  <Text style={styles.aadhaarDocTitle}>{isHindi ? 'आधार डॉक्यूमेंट (Front)' : 'Aadhaar Document (Front)'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {aadhaarDocName
                      ? aadhaarDocName
                      : (isHindi ? 'फ्रंट साइड अपलोड नहीं की गई' : 'Front side not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={styles.aadhaarDocAction}>
                {isHindi ? 'फ्रंट देखें / अपलोड करें' : 'View / Upload Front'}
              </Text>
            </TouchableOpacity>

            {/* Aadhaar document row (Back) */}
            <TouchableOpacity
              style={[styles.aadhaarDocRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8, paddingTop: 8 }]}
              activeOpacity={0.85}
              onPress={() => toggleAadhaarDoc('back')}
            >
              <View style={styles.aadhaarDocLeft}>
                <View style={styles.aadhaarDocIconWrap}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color="#166534"
                  />
                </View>
                <View>
                  <Text style={styles.aadhaarDocTitle}>{isHindi ? 'आधार डॉक्यूमेंट (Back)' : 'Aadhaar Document (Back)'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {aadhaarBackDocName
                      ? aadhaarBackDocName
                      : (isHindi ? 'बैक साइड अपलोड नहीं की गई' : 'Back side not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={styles.aadhaarDocAction}>
                {isHindi ? 'बैक देखें / अपलोड करें' : 'View / Upload Back'}
              </Text>
            </TouchableOpacity>

            {/* ── BANK DETAILS ── */}
            <View style={styles.docSection}>
              <View style={styles.docSectionHeader}>
                <View style={styles.docSectionIconWrap}>
                  <Ionicons name="business-outline" size={15} color="#1D4ED8" />
                </View>
                <Text style={styles.docSectionTitle}>{isHindi ? 'बैंक डिटेल्स' : 'Bank Details'}</Text>
                {isVerified && (
                  <View style={styles.lockChip}>
                    <Ionicons name="lock-closed" size={10} color="#16A34A" />
                    <Text style={styles.lockChipText}>{isHindi ? 'वेरिफाइड' : 'Verified'}</Text>
                  </View>
                )}
              </View>

              {isVerified ? (
                <View style={styles.verifiedNote}>
                  <Ionicons name="shield-checkmark" size={13} color="#16A34A" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.verifiedNoteText}>
                    {isHindi ? 'बैंक डिटेल्स वेरिफाइड हैं। बदलने के लिए सपोर्ट से संपर्क करें।' : 'Bank details are verified. Contact support to make changes.'}
                  </Text>
                </View>
              ) : null}

              <View style={[{ opacity: isVerified ? 0.75 : 1 }]}>
                {[
                  { label: isHindi ? 'खाताधारक का नाम' : 'Account Holder Name', key: 'holderName', placeholder: isHindi ? 'जैसे: राम कुमार' : 'e.g. Ram Kumar' },
                  { label: isHindi ? 'बैंक का नाम' : 'Bank Name', key: 'bankName', placeholder: isHindi ? 'जैसे: State Bank of India' : 'e.g. State Bank of India' },
                  { label: isHindi ? 'खाता नंबर' : 'Account Number', key: 'accountNumber', keyboard: 'number-pad' as any, placeholder: isHindi ? '12-digit खाता नंबर' : '12-digit account number' },
                  { label: 'IFSC Code', key: 'ifscCode', placeholder: 'e.g. SBIN0001234' },
                  { label: isHindi ? 'शाखा का पता' : 'Branch Address', key: 'bankAddress', placeholder: isHindi ? 'शाखा का पूरा पता' : 'Full branch address' },
                ].map(f => (
                  <View key={f.key} style={styles.bankFieldWrap}>
                    <Text style={styles.bankLabel}>{f.label}</Text>
                    <TextInput
                      value={(bankDetails as any)[f.key]}
                      onChangeText={v => setBankDetails(prev => ({ ...prev, [f.key]: v }))}
                      style={[styles.bankInput, isVerified && styles.bankInputLocked]}
                      editable={!isVerified}
                      keyboardType={f.keyboard || 'default'}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                ))}
                {!isVerified && (
                  <TouchableOpacity
                    style={[styles.saveBankBtn, bankSaving && { opacity: 0.6 }]}
                    onPress={saveBankDetails}
                    disabled={bankSaving}
                    activeOpacity={0.85}
                  >
                    {bankSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.saveBankBtnText}>{isHindi ? 'बैंक डिटेल्स सेव करें' : 'Save Bank Details'}</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── LAB LICENSE ── */}
            <TouchableOpacity
              style={styles.aadhaarDocRow}
              activeOpacity={isVerified ? 1 : 0.85}
              onPress={() => {
                if (isVerified) {
                  if (labLicenseDocName) {
                    const url = labLicenseDocName.startsWith('http') ? labLicenseDocName : `${BASE_URL}/${labLicenseDocName.replace(/\\/g, '/')}`;
                    Linking.openURL(url).catch(() => showAlert('Error', 'Cannot open document'));
                  }
                  return;
                }
                if (labLicenseDocName) {
                  showAlert(
                    isHindi ? 'लैब लाइसेंस' : 'Lab License',
                    isHindi ? 'क्या करना है?' : 'What would you like to do?',
                    [
                      { text: isHindi ? 'देखें' : 'View', onPress: () => { const url = labLicenseDocName.startsWith('http') ? labLicenseDocName : `${BASE_URL}/${labLicenseDocName.replace(/\\/g, '/')}`; Linking.openURL(url); } },
                      { text: isHindi ? 'नया अपलोड' : 'Re-upload', onPress: pickAndUploadLabLicense },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                } else {
                  pickAndUploadLabLicense();
                }
              }}
            >
              <View style={styles.aadhaarDocLeft}>
                <View style={[styles.aadhaarDocIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="ribbon-outline" size={16} color="#1D4ED8" />
                </View>
                <View>
                  <Text style={[styles.aadhaarDocTitle, { color: '#1D4ED8' }]}>{isHindi ? 'लेबोरेटरी लाइसेंस' : 'Laboratory License'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {labLicenseDocName ? (isHindi ? 'अपलोड किया गया' : 'Uploaded') : (isHindi ? 'अभी तक अपलोड नहीं' : 'Not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.aadhaarDocAction, { color: isVerified ? '#9CA3AF' : '#1D4ED8' }]}>
                {isVerified ? (labLicenseDocName ? (isHindi ? 'देखें' : 'View') : '—') : (labLicenseDocName ? (isHindi ? 'देखें/बदलें' : 'View/Change') : (isHindi ? 'अपलोड करें' : 'Upload'))}
              </Text>
            </TouchableOpacity>

            {/* ── CANCELLED CHEQUE ── */}
            <TouchableOpacity
              style={styles.aadhaarDocRow}
              activeOpacity={isVerified ? 1 : 0.85}
              onPress={() => {
                if (isVerified) {
                  if (cancelChequeDocName) {
                    const url = cancelChequeDocName.startsWith('http') ? cancelChequeDocName : `${BASE_URL}/${cancelChequeDocName.replace(/\\/g, '/')}`;
                    Linking.openURL(url).catch(() => showAlert('Error', 'Cannot open document'));
                  }
                  return;
                }
                if (cancelChequeDocName) {
                  showAlert(
                    isHindi ? 'कैंसिल चेक' : 'Cancelled Cheque',
                    isHindi ? 'क्या करना है?' : 'What would you like to do?',
                    [
                      { text: isHindi ? 'देखें' : 'View', onPress: () => { const url = cancelChequeDocName.startsWith('http') ? cancelChequeDocName : `${BASE_URL}/${cancelChequeDocName.replace(/\\/g, '/')}`; Linking.openURL(url); } },
                      { text: isHindi ? 'नया अपलोड' : 'Re-upload', onPress: pickAndUploadCancelCheque },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                } else {
                  pickAndUploadCancelCheque();
                }
              }}
            >
              <View style={styles.aadhaarDocLeft}>
                <View style={[styles.aadhaarDocIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="card-outline" size={16} color="#C2410C" />
                </View>
                <View>
                  <Text style={[styles.aadhaarDocTitle, { color: '#C2410C' }]}>{isHindi ? 'कैंसिल चेक' : 'Cancelled Cheque'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {cancelChequeDocName ? (isHindi ? 'अपलोड किया गया' : 'Uploaded') : (isHindi ? 'अभी तक अपलोड नहीं' : 'Not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.aadhaarDocAction, { color: isVerified ? '#9CA3AF' : '#C2410C' }]}>
                {isVerified ? (cancelChequeDocName ? (isHindi ? 'देखें' : 'View') : '—') : (cancelChequeDocName ? (isHindi ? 'देखें/बदलें' : 'View/Change') : (isHindi ? 'अपलोड करें' : 'Upload'))}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editProfileBtn} onPress={openEdit}>
              <Ionicons
                name="sparkles-outline"
                size={16}
                color="#0369A1"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.editProfileText}>
                {isHindi ? 'प्रोफाइल एडिट करें' : 'Edit profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* account settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'खाता सेटिंग्स' : 'Account settings'}
            </Text>
            <View style={styles.sectionHeaderPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#16A34A"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.sectionHeaderPillText}>
                {isHindi ? 'सुरक्षित' : 'Secure'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/(soil-lab)/wallet')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color="#16A34A"
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>
                  {isHindi ? 'वॉलेट / कमाई' : 'Wallet & Earnings'}
                </Text>
                <Text style={styles.rowSubLabel}>
                  {isHindi ? 'अपनी लैब की कमाई देखें' : 'View your lab earnings'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={goTerms}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#4F46E5"
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>
                  {isHindi ? 'नियम और शर्तें' : 'Terms & Conditions'}
                </Text>
                <Text style={styles.rowSubLabel}>
                  {isHindi
                    ? 'लैब सेवा से जुड़ी शर्तें देखें'
                    : 'View service terms for this lab'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={goHelp}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color="#0369A1"
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>
                  {isHindi ? 'मदद / सपोर्ट' : 'Help & support'}
                </Text>
                <Text style={styles.rowSubLabel}>
                  {isHindi
                    ? 'कोई भी दिक्कत हो तो यहाँ से बताएं'
                    : 'Reach out if you face any issue'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#DC2626"
                />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: '#DC2626' }]}>
                  {isHindi ? 'लॉगआउट' : 'Logout'}
                </Text>
                <Text style={styles.rowSubLabel}>
                  {isHindi
                    ? 'इस डिवाइस से अकाउंट हटाएं'
                    : 'Remove account from this device'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* edit modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {isHindi ? 'प्रोफाइल एडिट करें' : 'Edit profile'}
            </Text>

            <View style={styles.modalAvatarRow}>
              <View style={styles.modalAvatarWrap}>
                <Image source={editAvatar ? { uri: editAvatar } : require('../../assets/images/android-icon-foreground.png')} style={styles.modalAvatar} />
                <TouchableOpacity
                  style={styles.modalAvatarBadge}
                  onPress={pickProfilePhoto}
                >
                  <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalAvatarHint}>
                {isHindi
                  ? 'फोटो बदलने के लिए कैमरा icon दबाएं'
                  : 'Tap camera icon to change photo'}
              </Text>
            </View>

            <Text style={styles.modalLabel}>
              {isHindi ? 'लैब का नाम' : 'Lab name'}
            </Text>
            <TextInput
              value={editLabName}
              onChangeText={setEditLabName}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>
              {isHindi ? 'लैब हेड का नाम' : 'Lab head name'}
            </Text>
            <TextInput
              value={editOwnerName}
              onChangeText={setEditOwnerName}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>
              {text.aadhaarLabel}
            </Text>
            <TextInput
              value={editAadhaarNumber}
              onChangeText={setEditAadhaarNumber}
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={12}
              placeholder={text.aadhaarPlaceholder}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                onPress={closeEdit}
              >
                <Text style={[styles.modalBtnText, { color: '#111827' }]}>
                  {isHindi ? 'Cancel' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#22C55E' }]}
                onPress={saveEdit}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                  {isHindi ? 'Save' : 'Save'}
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

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  profileCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },

  profileTop: {
    alignItems: 'center',
  },

  avatarOuter: {
    padding: 4,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    backgroundColor: '#DBEAFE',
  },
  avatarBorder: {
    padding: 2,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    backgroundColor: '#EFF6FF',
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    resizeMode: 'cover',
  },
  avatarGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },

  labPill: {
    marginTop: 10,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    color: '#16A34A',
    fontWeight: '600',
  },

  nameText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4FF',
  },
  ownerChipText: {
    fontSize: 13,
    color: '#111827',
  },

  // Aadhaar doc row
  aadhaarDocRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aadhaarDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aadhaarDocIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aadhaarDocTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  aadhaarDocSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: 200,
  },
  aadhaarDocAction: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },

  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },

  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
  },
  sectionHeaderPillText: {
    fontSize: 11,
    color: '#16A34A',
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: { fontSize: 14, color: '#111827' },
  rowSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  rowDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalAvatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 10,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: 'cover',
  },
  modalAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  modalAvatarHint: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
  },

  modalLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Bank details & document styles
  docSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  docSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  docSectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  docSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
    flex: 1,
  },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  lockChipText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700',
  },
  verifiedNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedNoteText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
    lineHeight: 18,
  },
  bankInputRow: {
    width: '100%',
  },
  bankFieldWrap: {
    marginBottom: 10,
    width: '100%',
  },
  bankLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  bankInput: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  bankInputLocked: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    borderColor: '#E5E7EB',
  },
  saveBankBtn: {
    marginTop: 4,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    elevation: 2,
  },
  saveBankBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

