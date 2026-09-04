// app/(buyer)/profile.tsx — profile + edit modal + Aadhaar

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const dummyProfileImageUri: string | null = null;
const defaultAvatar = require('../../assets/images/android-icon-foreground.png');
import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/user`; // User API Base

export default function BuyerProfile() {
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const t = {
    hi: {
      title: 'प्रोफाइल',
      hello: 'नमस्ते,',
      name: 'राजेश जी',
      village: 'कर्नाल, हरियाणा',
      phoneLabel: 'मोबाइल नंबर',
      emailLabel: 'ईमेल पता',
      addressLabel: 'पता',
      aadhaarLabel: 'आधार नंबर',
      aadhaarDoc: 'आधार डॉक्यूमेंट',
      aadhaarDocNotUploaded: 'अभी तक कोई डॉक्यूमेंट अपलोड नहीं किया गया',
      businessLabel: 'व्यवसाय / फर्म का नाम',
      editProfile: 'प्रोफाइल एडिट करें',
      sectionAccount: 'खाता सेटिंग',
      terms: 'नियम व शर्तें',
      help: 'मदद और सपोर्ट',
      logout: 'लॉगआउट',
      modalTitle: 'प्रोफाइल अपडेट करें',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      namePlaceholder: 'नाम',
      phonePlaceholder: 'मोबाइल नंबर',
      emailPlaceholder: 'ईमेल पता',
      addressPlaceholder: 'पूरा पता',
      businessPlaceholder: 'यदि कोई फर्म/कंपनी है तो',
      aadhaarPlaceholder: '12 अंकों का आधार नंबर',
      viewOrUploadAadhaar: 'आधार देखे / अपलोड करें',
      bankSection: 'बैंक विवरण',
      bankHolder: 'खाता धारक का नाम',
      bankName: 'बैंक का नाम',
      accountNumber: 'अकाउंट नंबर',
      ifscCode: 'IFSC कोड',
      bankDoc: 'बैंक पासबुक / चेक',
      verifiedBadge: 'सत्यापित प्रोफाइल',
      unverifiedBadge: 'प्रोफाइल पेंडिंग',
      editNotAllowed: 'सत्यापित प्रोफाइल को एडिट नहीं किया जा सकता।',
      loading: 'लोड हो रहा है...',
    },
    en: {
      title: 'Profile',
      hello: 'Hello,',
      name: 'Rajesh Ji',
      village: 'Karnal, Haryana',
      phoneLabel: 'Mobile number',
      emailLabel: 'Email address',
      addressLabel: 'Address',
      aadhaarLabel: 'Aadhaar number',
      aadhaarDoc: 'Aadhaar document',
      aadhaarDocNotUploaded: 'No Aadhaar document uploaded yet',
      businessLabel: 'Business / Firm name',
      editProfile: 'Edit profile',
      sectionAccount: 'Account settings',
      terms: 'Terms & conditions',
      help: 'Help & support',
      logout: 'Log out',
      modalTitle: 'Update profile',
      save: 'Save',
      cancel: 'Cancel',
      namePlaceholder: 'Name',
      phonePlaceholder: 'Mobile number',
      emailPlaceholder: 'Email address',
      addressPlaceholder: 'Full address',
      businessPlaceholder: 'If you have a firm/company',
      aadhaarPlaceholder: '12 digit Aadhaar number',
      viewOrUploadAadhaar: 'View / Upload Aadhaar',
      bankSection: 'Bank Details',
      bankHolder: 'Account Holder Name',
      bankName: 'Bank Name',
      accountNumber: 'Account Number',
      ifscCode: 'IFSC Code',
      bankDoc: 'Bank Passbook / Check',
      verifiedBadge: 'Verified Profile',
      unverifiedBadge: 'Profile Pending',
      editNotAllowed: 'Verified profile cannot be edited.',
      loading: 'Loading...',
    },
  }[lang];

  // profile state (source of truth from backend)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  // Bank details state
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // temp state for modal (discarded on Cancel)
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [tempBusinessName, setTempBusinessName] = useState('');
  const [tempAadhaar, setTempAadhaar] = useState('');

  // temp bank state
  const [tempBankHolder, setTempBankHolder] = useState('');
  const [tempBankName, setTempBankName] = useState('');
  const [tempAccountNo, setTempAccountNo] = useState('');
  const [tempIfsc, setTempIfsc] = useState('');

  const [editVisible, setEditVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setAddress(profile.address || '');
      setBusinessName(profile.businessName || '');
      setAadhaarNumber(profile.aadhaarNumber || '');
      setStatus(profile.status || 'pending');
      setAadhaarDocName(profile.aadhaarDocUrl ? (isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)') : null);
      setAadhaarDocUrl(profile.aadhaarDocUrl || null);
      setAadhaarBackDocName(profile.aadhaarBackDocUrl ? (isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)') : null);
      setAadhaarBackDocUrl(profile.aadhaarBackDocUrl || null);
      
      if (profile.bankDetails) {
          setBankHolder(profile.bankDetails.holderName || '');
          setBankName(profile.bankDetails.bankName || '');
          setAccountNumber(profile.bankDetails.accountNumber || '');
          setIfscCode(profile.bankDetails.ifscCode || '');
      }
      if (profile.avatarUri) {
        setProfilePhotoUrl(profile.avatarUri);
      } else {
        setProfilePhotoUrl('');
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
      console.error('Error fetching buyer profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push('/(buyer)/home');
  };

  const openEdit = () => {
    // Populate temp fields with current values before opening modal
    setTempName(name);
    setTempEmail(email);
    setTempAddress(address);
    setTempBusinessName(businessName);
    setTempAadhaar(aadhaarNumber);
    setTempBankHolder(bankHolder);
    setTempBankName(bankName);
    setTempAccountNo(accountNumber);
    setTempIfsc(ifscCode);
    setEditVisible(true);
  };
  const closeEdit = () => setEditVisible(false);

  const onSaveProfile = async () => {
    // ── Required fields ──────────────────────────────────────────
    if (!tempName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'नाम आवश्यक है।' : 'Name is required.');
      return;
    }
    if (!tempAddress.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'पता आवश्यक है।' : 'Address is required.');
      return;
    }
    // ── Optional fields — validate only when filled ───────────────
    if (tempEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tempEmail.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही ईमेल पता डालें।' : 'Please enter a valid email address.');
      return;
    }
    if (tempAadhaar.trim() && !/^\d{12}$/.test(tempAadhaar.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'आधार नंबर 12 अंकों का होना चाहिए।' : 'Aadhaar number must be exactly 12 digits.');
      return;
    }
    // ── Bank details — validate only when any bank field is filled ─
    const anyBankFilled = tempBankHolder.trim() || tempBankName.trim() || tempAccountNo.trim() || tempIfsc.trim();
    if (anyBankFilled) {
      if (!tempBankHolder.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'खाताधारक का नाम डालें।' : 'Account holder name is required.');
        return;
      }
      if (!tempBankName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'बैंक का नाम डालें।' : 'Bank name is required.');
        return;
      }
      if (!tempAccountNo.trim() || !/^\d{9,18}$/.test(tempAccountNo.trim())) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही खाता नंबर डालें (9-18 अंक)।' : 'Enter a valid account number (9-18 digits).');
        return;
      }
      if (!tempIfsc.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(tempIfsc.trim().toUpperCase())) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही IFSC कोड डालें (जैसे: SBIN0001234)।' : 'Enter a valid IFSC code (e.g. SBIN0001234).');
        return;
      }
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tempName,
          email: tempEmail,
          address: tempAddress,
          businessName: tempBusinessName,
          aadhaarNumber: tempAadhaar,
          bankDetails: {
              holderName: tempBankHolder,
              bankName: tempBankName,
              accountNumber: tempAccountNo,
              ifscCode: tempIfsc
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert('Success', isHindi ? 'प्रोफाइल अपडेट हो गई!' : 'Profile updated successfully!');
        
        updateUser({
          name: tempName.trim(),
          email: tempEmail.trim(),
          address: tempAddress.trim(),
          businessName: tempBusinessName.trim(),
          aadhaarNumber: tempAadhaar.trim(),
        });
        
        setEditVisible(false);
        fetchProfile(); 
      } else {
        showAlert('Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error', 'Network error while updating profile');
    }
  };

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
        setProfilePhotoUrl(pfp);
        updateUser({ avatarUri: pfp });
        showAlert(
          lang === 'hi' ? 'सफल!' : 'Done!',
          lang === 'hi' ? 'प्रोफाइल फोटो अपडेट हो गई' : 'Profile photo updated'
        );
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not upload photo');
    }
  };

  const onTerms = () => { Linking.openURL('https://krishinex.com/terms'); };
  const onHelp = () => { router.push('/(buyer)/help-support'); };
  const onLogout = () => {
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

  const openAadhaarUpload = async (side: 'front' | 'back' = 'front') => {
    const isBack = side === 'back';
    const docName = isBack ? aadhaarBackDocName : aadhaarDocName;

    if (docName) {
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

      // Build FormData
      const formData = new FormData();
      formData.append('aadhaar', {
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `aadhaar_${Date.now()}`,
      } as any);

      showAlert(lang === 'hi' ? 'अपलोड हो रहा है...' : 'Uploading...', lang === 'hi' ? 'कृपया प्रतीक्षा करें' : 'Please wait');

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
          setAadhaarBackDocName(isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded (Back)');
          setAadhaarBackDocUrl(data.url);
        } else {
          setAadhaarDocName(isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded (Front)');
          setAadhaarDocUrl(data.url);
        }
        showAlert(
          lang === 'hi' ? 'सफल!' : 'Success!',
          lang === 'hi' ? 'आधार डॉक्यूमेंट अपलोड हो गया' : 'Aadhaar document uploaded successfully'
        );
      } else {
        showAlert('Error', data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Aadhaar upload error:', error);
      showAlert('Error', 'Failed to upload document');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backWrap} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.headerBorder} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE CARD */}
        <View style={styles.profileCardOuter}>
          <View style={styles.profileCardInner}>
            <View style={styles.profileTopRow}>
              <TouchableOpacity style={styles.avatarBlock} onPress={pickProfilePhoto} activeOpacity={0.85}>
                <Image
                  source={
                    profilePhotoUrl ? { uri: profilePhotoUrl } : defaultAvatar
                  }
                  style={styles.avatarImg}
                />
                <View style={styles.avatarEditBtn}>
                  <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.profileTextBlock}>
                <Text style={styles.helloText}>
                  {t.hello}{' '}
                  <Text style={styles.nameText}>{name}</Text>
                </Text>

                {/* Address */}
                <View style={styles.row}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaText}>{address}</Text>
                </View>

                {/* Phone */}
                <View style={styles.row}>
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaText}>
                    {t.phoneLabel}: {phone}
                  </Text>
                </View>

                {/* Email */}
                <View style={styles.row}>
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaText}>
                    {t.emailLabel}: {email}
                  </Text>
                </View>

                {/* Aadhaar number */}
                <View style={styles.row}>
                  <Ionicons
                    name="id-card-outline"
                    size={14}
                    color="#6B7280"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaText}>
                    {t.aadhaarLabel}: {aadhaarNumber || '——'}
                  </Text>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: status === 'approved' ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Ionicons 
                        name={status === 'approved' ? 'checkmark-circle' : 'time-outline'} 
                        size={12} 
                        color={status === 'approved' ? '#166534' : '#92400E'} 
                    />
                    <Text style={[styles.statusBadgeText, { color: status === 'approved' ? '#166534' : '#92400E' }]}>
                        {status === 'approved' ? t.verifiedBadge : t.unverifiedBadge}
                    </Text>
                </View>
              </View>
            </View>

            {/* Business Name */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <Ionicons
                name="storefront-outline"
                size={14}
                color="#6B7280"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.metaText}>
                {t.businessLabel}: {businessName || '——'}
              </Text>
            </View>

            {/* Aadhaar Front document row */}
            <TouchableOpacity
              style={styles.aadhaarDocRow}
              activeOpacity={0.85}
              onPress={() => openAadhaarUpload('front')}
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
                  <Text style={styles.aadhaarDocTitle}>{lang === 'hi' ? 'आधार डॉक्यूमेंट (Front)' : 'Aadhaar Document (Front)'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {aadhaarDocName
                      ? aadhaarDocName
                      : (lang === 'hi' ? 'फ्रंट साइड अपलोड नहीं की गई' : 'Front side not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={styles.aadhaarDocAction}>
                {lang === 'hi' ? 'फ्रंट देखें / अपलोड करें' : 'View / Upload Front'}
              </Text>
            </TouchableOpacity>

            {/* Aadhaar Back document row */}
            <TouchableOpacity
              style={[styles.aadhaarDocRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8, paddingTop: 8 }]}
              activeOpacity={0.85}
              onPress={() => openAadhaarUpload('back')}
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
                  <Text style={styles.aadhaarDocTitle}>{lang === 'hi' ? 'आधार डॉक्यूमेंट (Back)' : 'Aadhaar Document (Back)'}</Text>
                  <Text style={styles.aadhaarDocSub} numberOfLines={1}>
                    {aadhaarBackDocName
                      ? aadhaarBackDocName
                      : (lang === 'hi' ? 'बैक साइड अपलोड नहीं की गई' : 'Back side not uploaded yet')}
                  </Text>
                </View>
              </View>
              <Text style={styles.aadhaarDocAction}>
                {lang === 'hi' ? 'बैक देखें / अपलोड करें' : 'View / Upload Back'}
              </Text>
            </TouchableOpacity>

            {/* Bank Details Section */}
            <View style={styles.bankSection}>
                <Text style={styles.bankSectionTitle}>{t.bankSection}</Text>
                <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{t.bankHolder}:</Text>
                    <Text style={styles.bankValue}>{bankHolder || '——'}</Text>
                </View>
                <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{t.bankName}:</Text>
                    <Text style={styles.bankValue}>{bankName || '——'}</Text>
                </View>
                <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{t.accountNumber}:</Text>
                    <Text style={styles.bankValue}>{accountNumber || '——'}</Text>
                </View>
                <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{t.ifscCode}:</Text>
                    <Text style={styles.bankValue}>{ifscCode || '——'}</Text>
                </View>
            </View>

            {status === 'approved' ? (
                <View style={styles.verifiedLockBox}>
                    <Ionicons name="lock-closed" size={16} color="#059669" />
                    <Text style={styles.verifiedLockText}>{t.editNotAllowed}</Text>
                </View>
            ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={openEdit}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.primaryBtnText}>{t.editProfile}</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SETTINGS LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.sectionAccount}</Text>
        </View>

        <View style={styles.listCard}>
          <SettingsRow icon="wallet-outline" label={isHindi ? 'वॉलेट और खर्च' : 'Wallet & Spending'} onPress={() => router.push('/(buyer)/wallet')} />
          <View style={styles.divider} />
          <SettingsRow icon="document-text-outline" label={t.terms} onPress={onTerms} />
          <View style={styles.divider} />
          <SettingsRow icon="help-circle-outline" label={t.help} onPress={onHelp} />
          <View style={styles.divider} />
          <SettingsRow
            icon="log-out-outline"
            label={t.logout}
            danger
            onPress={onLogout}
          />
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent
        visible={editVisible}
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalSheetWrapper}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t.modalTitle}</Text>

              <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
              {/* NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.namePlaceholder}</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder={t.namePlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* PHONE (read-only — phone number should not be changed) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.phonePlaceholder}</Text>
                <View style={[styles.inputField, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={phone}
                    editable={false}
                    keyboardType="phone-pad"
                    placeholder={t.phonePlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={[styles.input, { color: '#9CA3AF' }]}
                  />
                </View>
              </View>

              {/* EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.emailPlaceholder}</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={tempEmail}
                    onChangeText={setTempEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder={t.emailPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* ADDRESS */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.addressPlaceholder}</Text>
                <View style={[styles.inputField, { height: 70, alignItems: 'flex-start' }]}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6, marginTop: 8 }}
                  />
                  <TextInput
                    value={tempAddress}
                    onChangeText={setTempAddress}
                    placeholder={t.addressPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                    multiline
                  />
                </View>
              </View>

              {/* BUSINESS / FIRM NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.businessLabel}</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="storefront-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={tempBusinessName}
                    onChangeText={setTempBusinessName}
                    placeholder={t.businessPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* AADHAAR NUMBER */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.aadhaarLabel}</Text>
                <View style={styles.inputField}>
                  <Ionicons
                    name="id-card-outline"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 6 }}
                  />
                  <TextInput
                    value={tempAadhaar}
                    onChangeText={setTempAadhaar}
                    placeholder={t.aadhaarPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>
              </View>

              {/* BANK DETAILS */}
              <View style={{ marginTop: 10, marginBottom: 5 }}>
                  <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 5 }]}>{t.bankSection}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.bankHolder}</Text>
                <View style={styles.inputField}>
                  <TextInput
                    value={tempBankHolder}
                    onChangeText={setTempBankHolder}
                    placeholder={t.bankHolder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.bankName}</Text>
                <View style={styles.inputField}>
                  <TextInput
                    value={tempBankName}
                    onChangeText={setTempBankName}
                    placeholder={t.bankName}
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>{t.accountNumber}</Text>
                    <View style={styles.inputField}>
                      <TextInput
                        value={tempAccountNo}
                        onChangeText={setTempAccountNo}
                        placeholder={t.accountNumber}
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 0.8 }]}>
                    <Text style={styles.inputLabel}>{t.ifscCode}</Text>
                    <View style={styles.inputField}>
                      <TextInput
                        value={tempIfsc}
                        onChangeText={setTempIfsc}
                        placeholder={t.ifscCode}
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
              </View>
              </ScrollView>

              {/* BUTTONS */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={closeEdit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSaveBtn]}
                  onPress={onSaveProfile}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalSaveText}>{t.save}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
};

function SettingsRow({ icon, label, danger, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.rowItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowIconWrap, danger && { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name={icon} size={18} color={danger ? '#DC2626' : '#4B5563'} />
        </View>
        <Text
          style={[
            styles.rowLabel,
            danger && { color: '#DC2626', fontWeight: '700' },
          ]}
        >
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // HEADER
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  headerBorder: {
    height: 2,
    backgroundColor: '#87D528',
  },

  // PROFILE CARD
  profileCardOuter: {
    marginTop: 16,
    borderRadius: 22,
    padding: 1,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  profileCardInner: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBlock: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5F9ED',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  profileTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  helloText: {
    fontSize: 14,
    color: '#4B5563',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },

  primaryBtn: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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

  // SECTION
  sectionHeader: {
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  // LIST
  listCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 14,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  inputGroup: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  modalSaveBtn: {
    backgroundColor: '#16A34A',
    marginLeft: 8,
  },
  modalCancelText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  modalSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // NEW STYLES
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  bankSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  bankValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedLockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  verifiedLockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 8,
  },
});

