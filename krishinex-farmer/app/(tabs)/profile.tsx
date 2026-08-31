// app/(tabs)/profile.tsx — KHETIFY PROFILE (PROFILE + BANK + AADHAAR)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authApi, IMAGE_BASE_URL } from '../../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '@/context/I18nContext';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN = '#98cd06ff';
const KHETIFY_GREEN_DARK = '#467804ff';
const KHETIFY_GREEN_LIGHT = '#a3d546ff';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const hi = language === 'hi';
  const router = useRouter();

  // main profile state
  const [name, setName] = useState('किसान साथी');
  const [phone, setPhone] = useState('N/A');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('N/A');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState<string | null>(null);
  const [aadhaarBackPhotoUrl, setAadhaarBackPhotoUrl] = useState<string | null>(null);
  const [viewAadhaarVisible, setViewAadhaarVisible] = useState(false);
  const [viewAadhaarBackVisible, setViewAadhaarBackVisible] = useState(false);

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authApi.getProfile();
      const user = res.data;
      if (user) {
        setName(user.name);
        setPhone(user.phone);
        setEmail(user.email || '');
        setAddress(user.address || (hi ? 'पता नहीं' : 'N/A'));
        if (user.profilePhotoUrl) {
          const pfp = user.profilePhotoUrl.startsWith('http')
            ? user.profilePhotoUrl
            : `${IMAGE_BASE_URL}/${user.profilePhotoUrl.replace(/\\/g, '/')}`;
          setAvatarUrl(pfp);
        }
        if (user.aadhaarDocUrl) setAadhaarPhotoUrl(user.aadhaarDocUrl);
        if (user.aadhaarBackDocUrl) setAadhaarBackPhotoUrl(user.aadhaarBackDocUrl);

        // Aadhaar & Bank
        setAadhaarNumber(user.aadhaarNumber || '');
        setAadhaarDocName(user.aadhaarDocUrl ? 'Aadhaar_Front.jpg' : null);
        setAadhaarBackDocName(user.aadhaarBackDocUrl ? 'Aadhaar_Back.jpg' : null);

        if (user.bankDetails) {
          setBankHolder(user.bankDetails.holderName || '');
          setBankName(user.bankDetails.bankName || '');
          setAccountNumber(user.bankDetails.accountNumber || '');
          setIfsc(user.bankDetails.ifscCode || '');
          setBankAddress(user.bankDetails.bankAddress || '');
        }
        if (user.status) setStatus(user.status);

        // Keep local cache fresh
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aadhaar state (number + uploaded doc info)
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');

  // bank details state
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankAddress, setBankAddress] = useState('');

  // edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeEditSection, setActiveEditSection] =
    useState<'profile' | 'bank' | 'aadhaar'>('profile');

  // local draft fields for modal
  const [draftName, setDraftName] = useState(name);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftAddress, setDraftAddress] = useState(address);
  const [draftAvatar, setDraftAvatar] = useState(avatarUrl);

  const [draftBankHolder, setDraftBankHolder] = useState(bankHolder);
  const [draftBankName, setDraftBankName] = useState(bankName);
  const [draftAccountNumber, setDraftAccountNumber] =
    useState(accountNumber);
  const [draftIfsc, setDraftIfsc] = useState(ifsc);
  const [draftBankAddress, setDraftBankAddress] =
    useState(bankAddress);

  const [draftAadhaarNumber, setDraftAadhaarNumber] =
    useState(aadhaarNumber);

  const mainLogo = hi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');

  const profileAvatar = require('../../assets/images/logo.png');

  const openProfileEdit = () => {
    setActiveEditSection('profile');
    setDraftName(name);
    setDraftPhone(phone);
    setDraftEmail(email);
    setDraftAddress(address);
    setDraftAvatar(avatarUrl);
    setEditModalVisible(true);
  };

  const openBankEdit = () => {
    setActiveEditSection('bank');
    setDraftBankHolder(bankHolder);
    setDraftBankName(bankName);
    setDraftAccountNumber(accountNumber);
    setDraftIfsc(ifsc);
    setDraftBankAddress(bankAddress);
    setEditModalVisible(true);
  };

  const openAadhaarEdit = () => {
    setActiveEditSection('aadhaar');
    setDraftAadhaarNumber(aadhaarNumber);
    setEditModalVisible(true);
  };

  // image picker for profile photo
  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        hi ? 'परमिशन चाहिए' : 'Permission needed',
        hi
          ? 'फोटो बदलने के लिए गैलरी की अनुमति दें'
          : 'Please allow gallery access to change photo'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      try {
        setSaving(true);
        const formData = new FormData();
        // @ts-ignore
        formData.append('photo', {
          uri,
          name: `profile_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        const res = await authApi.uploadProfilePhoto(formData);
        if (res.url) {
          const pfp = res.url.startsWith('http')
            ? res.url
            : `${IMAGE_BASE_URL}/${res.url.replace(/\\/g, '/')}`;
          setAvatarUrl(pfp);
          setDraftAvatar(pfp);
          fetchProfile(); // Refresh local data
        }
      } catch (e) {
        showAlert('Error', hi ? 'फोटो अपलोड करने में विफल' : 'Failed to upload photo');
      } finally {
        setSaving(false);
      }
    }
  };

  const saveEdit = async () => {
    // Validations based on active section
    if (activeEditSection === 'profile') {
      if (!draftName.trim() || draftName.trim().length < 2) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Name must be at least 2 characters');
        return;
      }
      if (!draftAddress.trim() || draftAddress.trim().length < 5) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'पता कम से कम 5 अक्षर का होना चाहिए' : 'Address must be at least 5 characters');
        return;
      }
      if (draftEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(draftEmail.trim())) {
          showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही ईमेल पता भरें' : 'Please enter a valid email address');
          return;
        }
      }
    } else if (activeEditSection === 'bank') {
      if (!draftBankHolder.trim() || draftBankHolder.trim().length < 2) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'खाताधारक का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Account holder name must be at least 2 characters');
        return;
      }
      if (!draftBankName.trim()) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया बैंक का नाम भरें' : 'Please enter bank name');
        return;
      }
      const accClean = draftAccountNumber.trim().replace(/\D/g, '');
      if (!accClean || accClean.length < 9 || accClean.length > 18) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'खाता नंबर 9 से 18 अंकों का होना चाहिए' : 'Account number must be 9 to 18 digits');
        return;
      }
      const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
      if (!draftIfsc.trim() || !ifscRegex.test(draftIfsc.trim())) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'कृपया सही IFSC कोड भरें (जैसे: SBIN0001234)' : 'Please enter a valid IFSC code (e.g. SBIN0001234)');
        return;
      }
    } else if (activeEditSection === 'aadhaar') {
      const aadhaarClean = draftAadhaarNumber.trim().replace(/\D/g, '');
      if (!aadhaarClean || aadhaarClean.length !== 12) {
        showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'आधार नंबर 12 अंकों का होना चाहिए' : 'Aadhaar number must be exactly 12 digits');
        return;
      }
    }

    try {
      setSaving(true);
      let payload: any = {};

      if (activeEditSection === 'profile') {
        payload = {
          name: draftName,
          email: draftEmail,
          address: draftAddress
        };
        await authApi.updateProfile(payload);
      } else if (activeEditSection === 'bank') {
        payload = {
          holderName: draftBankHolder,
          bankName: draftBankName,
          accountNumber: draftAccountNumber,
          ifscCode: draftIfsc,
          bankAddress: draftBankAddress
        };
        await authApi.updateBankDetails(payload);
      } else if (activeEditSection === 'aadhaar') {
        payload = {
          aadhaarNumber: draftAadhaarNumber
        };
        await authApi.updateProfile(payload);
      }

      await fetchProfile(); // Refresh logic
      setEditModalVisible(false);
    } catch (e: any) {
      console.error('Save Edit Error:', e);
      if (e.response) {
        console.error('Error Data:', e.response.data);
      }
      showAlert('Error', hi ? 'सेव करने में विफल' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      hi ? 'लॉगआउट?' : 'Logout?',
      hi
        ? 'क्या आप सच में लॉगआउट करना चाहते हैं?'
        : 'Do you really want to logout?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'लॉगआउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userToken', 'userData']);
              router.replace('/(auth)/login' as any);
            } catch (error) {
              console.error('Logout error:', error);
              router.replace('/(auth)/login' as any);
            }
          },
        },
      ],
    );
  };

  // navigation handlers
  const goToWallet = () => {
    router.push('/wallet');
  };

  const goToMyBookings = () => {
    // Navigate to Orders tab with 'booking' category if possible, or just the tab
    router.push('/(tabs)/orders');
  };

  const openHelp = () => {
    router.push('/help');
  };

  const openTerms = () => {
    Linking.openURL('https://www.krishinex.com/terms').catch(() => {
      showAlert('Error', hi ? 'लिंक खोलने में विफल' : 'Failed to open link');
    });
  };

  const goToLeadGeneration = () => {
    router.push('../lead-generation');
  };

  const goToKisanPathshala = () => {
    router.push('../kisan-pathshala');
  };

  const pickFromCamera = async (side: 'front' | 'back') => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        showAlert(
          hi ? 'परमिशन चाहिए' : 'Permission needed',
          hi ? 'कैमरा खोलने के लिए अनुमति दें' : 'Please allow camera access to take a photo'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAadhaarFile(asset.uri, `aadhaar_${side}_${Date.now()}.jpg`, 'image/jpeg', side);
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', hi ? 'फोटो खींचने में विफल' : 'Failed to take photo');
    }
  };

  const pickFromGallery = async (side: 'front' | 'back') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      let ext = '.jpg';
      if (asset.mimeType === 'application/pdf') {
        ext = '.pdf';
      } else if (asset.mimeType === 'image/png') {
        ext = '.png';
      } else if (asset.mimeType === 'image/jpeg') {
        ext = '.jpeg';
      } else {
        const matches = asset.name?.match(/\.[a-zA-Z0-9]+$/);
        if (matches) ext = matches[0];
      }

      let filename = asset.name || `aadhaar_${side}${ext}`;
      if (!filename.toLowerCase().endsWith('.jpg') && 
          !filename.toLowerCase().endsWith('.jpeg') && 
          !filename.toLowerCase().endsWith('.png') && 
          !filename.toLowerCase().endsWith('.pdf')) {
        filename = filename + ext;
      }

      await uploadAadhaarFile(
        asset.uri,
        filename,
        asset.mimeType || 'application/pdf',
        side
      );
    } catch (e) {
      console.error(e);
      showAlert('Error', hi ? 'फ़ाइल चुनने में विफल' : 'Failed to pick file');
    }
  };

  const uploadAadhaarFile = async (uri: string, name: string, type: string, side: 'front' | 'back') => {
    try {
      setSaving(true);
      const formData = new FormData();
      
      // @ts-ignore
      formData.append('aadhaar', {
        uri,
        name,
        type,
      });

      const res = await authApi.uploadAadhaarDoc(formData, side);
      if (res.url) {
        showAlert(
          hi ? 'सफलता' : 'Success',
          hi ? 'आधार डॉक्यूमेंट सफलतापूर्वक अपलोड हो गया।' : 'Aadhaar document uploaded successfully.'
        );
        fetchProfile();
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', hi ? 'अपलोड करने में विफल' : 'Failed to upload file');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAadhaarDoc = (side: 'front' | 'back') => {
    showAlert(
      hi ? 'फ़ाइल अपलोड करें' : 'Upload File',
      hi ? 'आप फ़ोटो कहाँ से चुनना चाहते हैं?' : 'Where do you want to choose the photo from?',
      [
        {
          text: hi ? 'कैमरा (फोटो खींचें)' : 'Camera (Take Photo)',
          onPress: () => pickFromCamera(side)
        },
        {
          text: hi ? 'गैलरी (फ़ाइल चुनें)' : 'Gallery (Choose File)',
          onPress: () => pickFromGallery(side)
        },
        {
          text: hi ? 'रद्द करें' : 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleAadhaarDocPress = (side: 'front' | 'back') => {
    const isFront = side === 'front';
    const photoUrl = isFront ? aadhaarPhotoUrl : aadhaarBackPhotoUrl;
    const setVisible = isFront ? setViewAadhaarVisible : setViewAadhaarBackVisible;

    if (status === 'approved') {
      if (photoUrl) {
        setVisible(true);
      }
      return;
    }

    const options = [];
    if (photoUrl) {
      options.push({
        text: hi ? 'डॉक्यूमेंट देखें' : 'View Document',
        onPress: () => setVisible(true),
      });
    }
    options.push({
      text: hi ? 'डॉक्यूमेंट अपलोड करें / बदलें' : 'Upload / Change Document',
      onPress: () => handlePickAadhaarDoc(side),
    });
    options.push({ text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' as const });

    showAlert(
      hi ? (isFront ? 'आधार फ्रंट डॉक्यूमेंट' : 'आधार बैक डॉक्यूमेंट') : (isFront ? 'Aadhaar Front Document' : 'Aadhaar Back Document'),
      hi ? 'आप क्या करना चाहते हैं?' : 'What do you want to do?',
      options
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8}>
          <Image source={profileAvatar} style={styles.avatarImage} />
        </TouchableOpacity>

        <Image source={mainLogo} style={styles.logo} resizeMode="contain" />

        <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={KHETIFY_GREEN_DARK}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={KHETIFY_GREEN} />
          <Text style={{ marginTop: 10, color: KHETIFY_GREEN_DARK }}>
            {hi ? 'जानकारी लोड की जा रही है...' : 'Loading profile...'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <Image source={{ uri: avatarUrl }} style={styles.profileImage} />

              <TouchableOpacity
                style={[styles.editBtn, status === 'approved' && { backgroundColor: '#9CA3AF' }]}
                onPress={status === 'approved' ? () => showAlert(hi ? 'सत्यापित' : 'Verified', hi ? 'सत्यापित प्रोफाइल को बदला नहीं जा सकता।' : 'Verified profile cannot be changed.') : openProfileEdit}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>{name}</Text>
            <Text style={styles.phone}>{phone}</Text>
            <Text style={styles.email}>{email}</Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location"
                size={16}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.locationText}>{address}</Text>
            </View>

            <View style={[styles.verifiedBadge, status !== 'approved' && { backgroundColor: '#FEF3C7' }]}>
              <Ionicons
                name={status === 'approved' ? "checkmark-circle" : "time-outline"}
                size={16}
                color={status === 'approved' ? KHETIFY_GREEN : '#D97706'}
              />
              <Text style={[styles.verifiedText, status !== 'approved' && { color: '#D97706' }]}>
                {status === 'approved'
                  ? hi ? 'सत्यापित किसान' : 'Verified Farmer'
                  : hi ? 'सत्यापन लंबित' : 'Verification Pending'}
              </Text>
            </View>
          </View>

          {/* AADHAAR CARD */}
          <View style={styles.aadhaarCard}>
            <View style={styles.bankHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankTitle}>
                  {hi ? 'आधार विवरण' : 'Aadhaar Details'}
                </Text>
                <Text style={styles.bankSub}>
                  {hi
                    ? 'सिर्फ आपकी पहचान के लिए सुरक्षित रूप से सेव्ड'
                    : 'Securely stored only for verification'}
                </Text>
              </View>
              {status !== 'approved' && (
                <TouchableOpacity
                  style={styles.bankEditBtn}
                  onPress={openAadhaarEdit}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={KHETIFY_GREEN_DARK}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>
                {hi ? 'आधार नंबर' : 'Aadhaar Number'}
              </Text>
              <Text style={styles.bankValue}>
                {aadhaarNumber || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>

            {/* Aadhaar Front */}
            <TouchableOpacity
              style={styles.aadhaarDocRow}
              activeOpacity={0.9}
              onPress={() => handleAadhaarDocPress('front')}
            >
              <View style={styles.aadhaarDocLeft}>
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={KHETIFY_GREEN_DARK}
                />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.docTitle}>
                    {hi ? 'आधार कार्ड - सामने का हिस्सा (Front)' : 'Aadhaar Card - Front Side'}
                  </Text>
                  <Text style={styles.docSub} numberOfLines={1}>
                    {aadhaarDocName
                      ? aadhaarDocName
                      : hi
                        ? 'अभी तक कोई फ़ाइल अपलोड नहीं की गई'
                        : 'No file uploaded yet'}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Aadhaar Back */}
            <TouchableOpacity
              style={[styles.aadhaarDocRow, { marginTop: 14 }]}
              activeOpacity={0.9}
              onPress={() => handleAadhaarDocPress('back')}
            >
              <View style={styles.aadhaarDocLeft}>
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={KHETIFY_GREEN_DARK}
                />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.docTitle}>
                    {hi ? 'आधार कार्ड - पीछे का हिस्सा (Back)' : 'Aadhaar Card - Back Side'}
                  </Text>
                  <Text style={styles.docSub} numberOfLines={1}>
                    {aadhaarBackDocName
                      ? aadhaarBackDocName
                      : hi
                        ? 'अभी तक कोई फ़ाइल अपलोड नहीं की गई'
                        : 'No file uploaded yet'}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* BANK DETAILS CARD */}
          <View style={styles.bankCard}>
            <View style={styles.bankHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankTitle}>
                  {hi ? 'बैंक विवरण' : 'Bank Details'}
                </Text>
                <Text style={styles.bankSub}>
                  {hi
                    ? 'भुगतान के लिए सुरक्षित रूप से सेव्ड'
                    : 'Securely saved for payouts'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.bankEditBtn, status === 'approved' && { backgroundColor: '#E5E7EB' }]}
                onPress={status === 'approved' ? () => showAlert(hi ? 'सत्यापित' : 'Verified', hi ? 'सत्यापित बैंक विवरण को बदला नहीं जा सकता।' : 'Verified bank details cannot be changed.') : openBankEdit}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={KHETIFY_GREEN_DARK}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>
                {hi ? 'होल्डर नाम' : 'Holder Name'}
              </Text>
              <Text style={styles.bankValue}>
                {bankHolder || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>
                {hi ? 'बैंक का नाम' : 'Bank'}
              </Text>
              <Text style={styles.bankValue}>
                {bankName || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>
                {hi ? 'खाता संख्या' : 'Account'}
              </Text>
              <Text style={styles.bankValue}>
                {accountNumber || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>IFSC</Text>
              <Text style={styles.bankValue}>
                {ifsc || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>
                {hi ? 'ब्रांच पता' : 'Bank Address'}
              </Text>
              <Text style={styles.bankValue}>
                {bankAddress || (hi ? 'सेट नहीं है' : 'Not set')}
              </Text>
            </View>
          </View>

          {/* MENU BUTTONS */}
          <View style={styles.menuContainer}>
            {/* Wallet */}
            <TouchableOpacity style={styles.menuItem} onPress={goToWallet}>
              <Ionicons
                name="wallet-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'वॉलेट' : 'Wallet'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Nex Credit */}
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/nex-credit' as any)}>
              <Ionicons
                name="card-outline"
                size={22}
                color="#2563EB"
              />
              <Text style={styles.menuText}>
                {hi ? 'नेक्स क्रेडिट / शॉप क्रेडिट' : 'Nex Credit / Shop Credit'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* My Booking */}
            <TouchableOpacity style={styles.menuItem} onPress={goToMyBookings}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'मेरी बुकिंग' : 'My Booking'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Lead Generation for Loan */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={goToLeadGeneration}
            >
              <Ionicons
                name="trending-up-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'ऋण के लिए आवेदन' : 'Application for Loan'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Kisan Pathshala */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={goToKisanPathshala}
            >
              <Ionicons
                name="school-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'किसान पाठशाला' : 'Kisan Pathshala'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Help */}
            <TouchableOpacity style={styles.menuItem} onPress={openHelp}>
              <Ionicons
                name="help-circle-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'सहायता' : 'Help & Support'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Terms & Conditions */}
            <TouchableOpacity style={styles.menuItem} onPress={openTerms}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={KHETIFY_GREEN_DARK}
              />
              <Text style={styles.menuText}>
                {hi ? 'नियम व शर्तें' : 'Terms & Conditions'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#EF4444"
              />
              <Text style={styles.logoutText}>
                {hi ? 'लॉगआउट' : 'Logout'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="#FCA5A5"
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* AADHAAR PREVIEW MODAL */}
      <Modal
        visible={viewAadhaarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewAadhaarVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setViewAadhaarVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.previewContainer}>
            {aadhaarPhotoUrl?.toLowerCase().endsWith('.pdf') ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#FFFFFF" />
                <Text style={styles.pdfText}>
                  {hi ? 'आधार कार्ड PDF फॉर्मेट में है' : 'Aadhaar Card is in PDF format'}
                </Text>
                <Text style={styles.pdfSubText}>
                  {hi ? 'इसे यहाँ नहीं देखा जा सकता' : 'It cannot be viewed here'}
                </Text>
              </View>
            ) : (
              <Image
                source={{
                  uri: aadhaarPhotoUrl?.startsWith('http') 
                    ? aadhaarPhotoUrl 
                    : `${IMAGE_BASE_URL}/${aadhaarPhotoUrl?.replace(/\\/g, '/')}`
                }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* AADHAAR BACK PREVIEW MODAL */}
      <Modal
        visible={viewAadhaarBackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewAadhaarBackVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setViewAadhaarBackVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.previewContainer}>
            {aadhaarBackPhotoUrl?.toLowerCase().endsWith('.pdf') ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#FFFFFF" />
                <Text style={styles.pdfText}>
                  {hi ? 'आधार कार्ड PDF फॉर्मेट में है' : 'Aadhaar Card is in PDF format'}
                </Text>
                <Text style={styles.pdfSubText}>
                  {hi ? 'इसे यहाँ नहीं देखा जा सकता' : 'It cannot be viewed here'}
                </Text>
              </View>
            ) : (
              <Image
                source={{
                  uri: aadhaarBackPhotoUrl?.startsWith('http') 
                    ? aadhaarBackPhotoUrl 
                    : `${IMAGE_BASE_URL}/${aadhaarBackPhotoUrl?.replace(/\\/g, '/')}`
                }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {activeEditSection === 'profile'
                ? hi
                  ? 'प्रोफ़ाइल संपादित करें'
                  : 'Edit Profile'
                : activeEditSection === 'bank'
                  ? hi
                    ? 'बैंक विवरण संपादित करें'
                    : 'Edit Bank Details'
                  : hi
                    ? 'आधार विवरण संपादित करें'
                    : 'Edit Aadhaar Details'}
            </Text>

            <ScrollView
              style={{ maxHeight: 450, marginTop: 10 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {activeEditSection === 'profile' ? (
                <>
                  {/* Photo picker */}
                  <View style={styles.photoRow}>
                    <Image
                      source={{ uri: draftAvatar }}
                      style={styles.photoPreview}
                    />
                    <TouchableOpacity
                      style={styles.photoBtn}
                      onPress={pickImage}
                    >
                      <Ionicons
                        name="image-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.photoBtnText}>
                        {hi ? 'फोटो बदलें' : 'Change Photo'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>
                    {hi ? 'नाम' : 'Name'}
                  </Text>
                  <TextInput
                    style={[styles.input, status === 'approved' && { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                    value={draftName}
                    onChangeText={setDraftName}
                    editable={status !== 'approved'}
                    placeholder={hi ? 'अपना नाम' : 'Your name'}
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>
                    {hi ? 'मोबाइल' : 'Phone'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={draftPhone}
                    onChangeText={setDraftPhone}
                    keyboardType="phone-pad"
                    placeholder="+91 ..."
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={draftEmail}
                    onChangeText={setDraftEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>
                    {hi ? 'पता' : 'Address'}
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 70 }, status === 'approved' && { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                    value={draftAddress}
                    onChangeText={setDraftAddress}
                    multiline
                    editable={status !== 'approved'}
                    placeholder={
                      hi ? 'पूरा पता' : 'Full address'
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              ) : activeEditSection === 'bank' ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {hi ? 'होल्डर नाम' : 'Holder Name'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={draftBankHolder}
                    onChangeText={setDraftBankHolder}
                    placeholder={
                      hi ? 'खाते का नाम' : 'Name as per bank'
                    }
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>
                    {hi ? 'बैंक का नाम' : 'Bank Name'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={draftBankName}
                    onChangeText={setDraftBankName}
                    placeholder={
                      hi ? 'जैसे: SBI' : 'e.g. State Bank of India'
                    }
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>
                    {hi ? 'खाता संख्या' : 'Account Number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={draftAccountNumber}
                    onChangeText={setDraftAccountNumber}
                    keyboardType="number-pad"
                    placeholder="XXXXXXXX1234"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>IFSC</Text>
                  <TextInput
                    style={styles.input}
                    value={draftIfsc}
                    onChangeText={setDraftIfsc}
                    autoCapitalize="characters"
                    placeholder="SBIN0000001"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.fieldLabel}>
                    {hi ? 'ब्रांच पता' : 'Bank Address'}
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    value={draftBankAddress}
                    onChangeText={setDraftBankAddress}
                    multiline
                    placeholder={
                      hi ? 'ब्रांच का पूरा पता' : 'Full branch address'
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>
                    {hi ? 'आधार नंबर' : 'Aadhaar Number'}
                  </Text>
                  <TextInput
                    style={[styles.input, status === 'approved' && { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                    value={draftAadhaarNumber}
                    onChangeText={setDraftAadhaarNumber}
                    keyboardType="number-pad"
                    maxLength={12}
                    editable={status !== 'approved'}
                    placeholder={
                      hi ? '12 अंकों का आधार नंबर' : '12 digit Aadhaar number'
                    }
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={[styles.fieldLabel, { marginTop: 6 }]}>
                    {hi
                      ? 'आधार डॉक्यूमेंट सिर्फ Aadhaar upload स्क्रीन से बदला जा सकता है।'
                      : 'Aadhaar document can be updated from Aadhaar upload screen only.'}
                  </Text>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              activeOpacity={0.9}
              onPress={saveEdit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>
                  {hi ? 'सेव करें' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelText}>
                {hi ? 'रद्द' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomColor: KHETIFY_GREEN_LIGHT,
    borderBottomWidth: 1.2,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImage: { width: '100%', height: '100%' },
  logo: { height: 28, width: 150 },

  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
  },
  profileTop: { position: 'relative' },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: KHETIFY_GREEN_LIGHT,
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: KHETIFY_GREEN,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  phone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  email: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 10,
  },
  verifiedText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: KHETIFY_GREEN_DARK,
  },

  aadhaarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  bankSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bankEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  bankRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bankLabel: {
    width: 110,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  bankValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },

  aadhaarDocRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.7,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aadhaarDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  docSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: 220,
  },

  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    marginTop: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.7,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C1C',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    minHeight: 450,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreview: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '95%',
    height: '70%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  pdfSubText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  fieldLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  input: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoPreview: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 10,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KHETIFY_GREEN_DARK,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  photoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  saveBtn: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: KHETIFY_GREEN_DARK,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 12,
  },
});
