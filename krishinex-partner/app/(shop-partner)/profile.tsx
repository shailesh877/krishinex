import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

import { BASE_URL, BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/user`;

export default function ShopProfile() {
  const { lang, toggleLang } = useI18n();
  const isHindi = lang === 'hi';
  const router = useRouter();

  // profile state
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // NEW: Aadhaar & Avatar fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState<string | null>(null);
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState<string | null>(null);
  const [aadhaarBackDocName, setAadhaarBackDocName] = useState<string | null>(null);
  const [aadhaarBackDocUrl, setAadhaarBackDocUrl] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Bank Info
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [bankDocUrl, setBankDocUrl] = useState<string | null>(null);

  const [status, setStatus] = useState('pending');
  const [editVisible, setEditVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const { profile, refreshUser, updateUser } = useUser();

  // Sync profile data to local state for the edit form
  useEffect(() => {
    if (profile) {
      setOwnerName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setAddress(profile.address || '');
      setShopName(profile.businessName || '');
      setGstNumber(profile.gstNumber || '');
      setLicenseNumber(profile.licenseNumber || '');
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
          setBankAddress(profile.bankDetails.bankAddress || '');
          setBankDocUrl(profile.bankDetails.bankDocUrl || null);
      }

      setAvatarUri(profile.avatarUri || null);
      
      // Stop loading once cache is applied
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
      console.error('Error fetching shop profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const openEdit = () => setEditVisible(true);
  const closeEdit = () => setEditVisible(false);

  const onSaveProfile = async () => {
    // ── Required fields ──────────────────────────────────────────
    if (!ownerName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'मालिक का नाम आवश्यक है।' : 'Owner name is required.');
      return;
    }
    if (!shopName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'दुकान का नाम आवश्यक है।' : 'Shop name is required.');
      return;
    }
    if (!address.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'पता आवश्यक है।' : 'Address is required.');
      return;
    }
    // ── Optional fields — validate only when filled ───────────────
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही ईमेल पता डालें।' : 'Please enter a valid email address.');
      return;
    }
    if (gstNumber.trim() && gstNumber.trim().length !== 15) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'GST नंबर 15 अक्षरों का होना चाहिए।' : 'GST number must be 15 characters.');
      return;
    }
    if (aadhaarNumber.trim() && !/^\d{12}$/.test(aadhaarNumber.trim())) {
      showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'आधार नंबर 12 अंकों का होना चाहिए।' : 'Aadhaar number must be exactly 12 digits.');
      return;
    }
    // ── Bank details — validate only when any bank field is filled ─
    const anyBankFilled = bankHolder.trim() || bankName.trim() || accountNumber.trim() || ifscCode.trim();
    if (anyBankFilled) {
      if (!bankHolder.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'खाताधारक का नाम डालें।' : 'Account holder name is required.');
        return;
      }
      if (!bankName.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'बैंक का नाम डालें।' : 'Bank name is required.');
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
          name: ownerName.trim(),
          email: email.trim(),
          address: address.trim(),
          businessName: shopName.trim(),
          aadhaarNumber: aadhaarNumber.trim(),
          gstNumber: gstNumber.trim(),
          licenseNumber: licenseNumber.trim(),
          bankDetails: {
              holderName: bankHolder.trim(),
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              ifscCode: ifscCode.trim().toUpperCase(),
              bankAddress: bankAddress.trim()
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'प्रोफाइल अपडेट हो गई!' : 'Profile updated successfully!');
        
        // Optimistically update context
        updateUser({
          name: ownerName.trim(),
          email: email.trim(),
          address: address.trim(),
          businessName: shopName.trim(),
          aadhaarNumber: aadhaarNumber.trim(),
          gstNumber: gstNumber.trim(),
          licenseNumber: licenseNumber.trim(),
          bankDetails: {
              holderName: bankHolder.trim(),
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              ifscCode: ifscCode.trim().toUpperCase(),
              bankAddress: bankAddress.trim()
          }
        });
        
        closeEdit();
        fetchProfile();
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating shop profile:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error while updating profile');
    }
  };

  const onChangeAvatar = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permResult.granted === false) {
        showAlert(isHindi ? 'अनुमति आवश्यक है' : 'Permission Required', isHindi ? 'गैलरी की अनुमति दें' : 'Allow gallery access to change photo');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const uri = pickerResult.assets[0].uri;
        // API call to update PFP Document
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const formData = new FormData();
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-pfp.${fileExt}`;

        formData.append('photo', {
          uri,
          name: fileName,
          type: `image/${fileExt}`
        } as any);

        const res = await fetch(`${API_URL}/upload-photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const pfp = data.url?.startsWith('http')
            ? data.url
            : `${BASE_URL}/${data.url?.replace(/\\/g, '/')}`;
          setAvatarUri(pfp);
          updateUser({ avatarUri: pfp }); // Update globally
          showAlert(isHindi ? 'सफल!' : 'Done!', isHindi ? 'प्रोफाइल फोटो अपडेट हो गई' : 'Profile photo updated');
        } else {
          showAlert('Error', 'Failed to upload photo');
        }
      }
    } catch (e) {
      console.error('Error uploading avatar:', e);
      showAlert('Error', 'Network error while attempting to upload photo.');
    }
  };

  const handleAadhaarAction = async () => {
    if (status === 'approved') {
      if (aadhaarDocUrl) {
        const formattedUrl = aadhaarDocUrl.startsWith('http')
          ? aadhaarDocUrl
          : `${BASE_URL}/${aadhaarDocUrl.replace(/\\/g, '/')}`;
        Linking.openURL(formattedUrl).catch(() =>
          showAlert('Error', 'Cannot open document')
        );
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

    if (aadhaarDocUrl) {
      const formattedUrl = aadhaarDocUrl.startsWith('http')
        ? aadhaarDocUrl
        : `${BASE_URL}/${aadhaarDocUrl.replace(/\\/g, '/')}`;

      showAlert(
        isHindi ? 'आधार फ्रंट साइड' : 'Aadhaar Front Side',
        isHindi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'देखें (View)' : 'View',
            onPress: () => Linking.openURL(formattedUrl),
          },
          {
            text: isHindi ? 'नया अपलोड करें' : 'Upload New',
            onPress: () => uploadAadhaarDoc('front'),
          },
        ]
      );
    } else {
      uploadAadhaarDoc('front');
    }
  };

  const handleAadhaarBackAction = async () => {
    if (status === 'approved') {
      if (aadhaarBackDocUrl) {
        const formattedUrl = aadhaarBackDocUrl.startsWith('http')
          ? aadhaarBackDocUrl
          : `${BASE_URL}/${aadhaarBackDocUrl.replace(/\\/g, '/')}`;
        Linking.openURL(formattedUrl).catch(() =>
          showAlert('Error', 'Cannot open document')
        );
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

    if (aadhaarBackDocUrl) {
      const formattedUrl = aadhaarBackDocUrl.startsWith('http')
        ? aadhaarBackDocUrl
        : `${BASE_URL}/${aadhaarBackDocUrl.replace(/\\/g, '/')}`;

      showAlert(
        isHindi ? 'आधार बैक साइड' : 'Aadhaar Back Side',
        isHindi ? 'आप क्या करना चाहते हैं?' : 'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'देखें (View)' : 'View',
            onPress: () => Linking.openURL(formattedUrl),
          },
          {
            text: isHindi ? 'नया अपलोड करें' : 'Upload New',
            onPress: () => uploadAadhaarDoc('back'),
          },
        ]
      );
    } else {
      uploadAadhaarDoc('back');
    }
  };

  const uploadAadhaarDoc = async (side: 'front' | 'back' = 'front') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('aadhaar', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const res = await fetch(`${API_URL}/upload-aadhaar?side=${side}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await res.json();
      if (res.ok) {
        if (side === 'back') {
          setAadhaarBackDocName(isHindi ? 'अपलोड किया गया (Back)' : 'Uploaded Document (Back)');
          setAadhaarBackDocUrl(data.url || null);
        } else {
          setAadhaarDocName(isHindi ? 'अपलोड किया गया (Front)' : 'Uploaded Document (Front)');
          setAadhaarDocUrl(data.url || null);
        }
        showAlert(isHindi ? 'सफलता' : 'Success', isHindi ? 'डॉक्यूमेंट अपलोड हो गया' : 'Document uploaded successfully');
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Aadhaar upload error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Something went wrong during upload');
    } finally {
      setLoading(false);
    }
  };

  const goTerms = () => Linking.openURL('https://krishinex.com/terms');
  const goHelp = () => router.push('/(shop-partner)/help');

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
 
  const onUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        showAlert(isHindi ? 'अनुमति आवश्यक' : 'Permission Required', isHindi ? 'कृपया लोकेशन की अनुमति दें' : 'Please allow location access to set shop position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_API_URL}/shop/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'दुकान की लोकेशन अपडेट हो गई' : 'Shop location updated successfully');
      } else {
        showAlert('Error', data.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      showAlert('Error', 'Failed to get location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const onUploadBankDoc = async () => {
      try {
          const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permResult.granted) return;

          const pickerResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
          });

          if (!pickerResult.canceled && pickerResult.assets[0]) {
              const uri = pickerResult.assets[0].uri;
              const token = await AsyncStorage.getItem('userToken');
              if (!token) return;

              const formData = new FormData();
              const fileExt = uri.split('.').pop() || 'jpg';
              formData.append('bankDoc', {
                  uri,
                  name: `bank-doc.${fileExt}`,
                  type: `image/${fileExt}`
              } as any);

              const res = await fetch(`${API_URL}/upload-bank-doc`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData
              });

              if (res.ok) {
                  const data = await res.json();
                  setBankDocUrl(data.url);
                  showAlert(isHindi ? 'सफल!' : 'Done!', isHindi ? 'चेक फोटो अपलोड हो गई' : 'Cheque photo uploaded');
              } else {
                  showAlert('Error', 'Upload failed');
              }
          }
      } catch (e) {
          console.error(e);
      }
  };

  const t = {
      isApproved: status === 'approved',
      statusText: isHindi ? 'वेरिफाइड प्रोफाइल' : 'Verified Profile',
    aadhaarLabel: isHindi ? 'आधार नंबर' : 'Aadhaar number',
    aadhaarPlaceholder: isHindi
      ? '12 अंकों का आधार नंबर'
      : '12 digit Aadhaar number',
    aadhaarDoc: isHindi ? 'आधार डॉक्यूमेंट (Front)' : 'Aadhaar Document (Front)',
    aadhaarBackDoc: isHindi ? 'आधार डॉक्यूमेंट (Back)' : 'Aadhaar Document (Back)',
    aadhaarDocNotUploaded: isHindi
      ? 'फ्रंट साइड अपलोड नहीं की गई'
      : 'Front side not uploaded yet',
    aadhaarBackDocNotUploaded: isHindi
      ? 'बैक साइड अपलोड नहीं की गई'
      : 'Back side not uploaded yet',
    viewOrUploadAadhaar: isHindi
      ? 'फ्रंट देखें / अपलोड करें'
      : 'View / Upload Front',
    viewOrUploadAadhaarBack: isHindi
      ? 'बैक देखें / अपलोड करें'
      : 'View / Upload Back',
    loading: isHindi ? 'लोड हो रहा है...' : 'Loading...',
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

      {/* TOP APP HEADER */}
      <View style={styles.appHeader}>
        <View style={styles.headerLeftRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="person-circle-outline" size={20} color="#16A34A" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>
              {isHindi ? 'प्रोफाइल' : 'Profile'}
            </Text>
            <Text style={styles.headerSub}>
              {isHindi
                ? 'अपनी प्रोफाइल और सेटिंग्स यहां देखें'
                : 'View your profile and settings here'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconCircle} onPress={toggleLang}>
          <Ionicons
            name="language-outline"
            size={18}
            color="#0369A1"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.langText}>{isHindi ? 'English' : 'हिन्दी'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />
        }
      >
        {/* PROFILE PIC + NAME + EDIT BUTTON */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 34 }} />
              ) : (
                <Ionicons
                  name="storefront-outline"
                  size={34}
                  color="#16A34A"
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.avatarEditBtn}
              activeOpacity={0.8}
              onPress={onChangeAvatar}
            >
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.ownerName}>{ownerName}</Text>
            {t.isApproved && (
                <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={styles.verifiedText}>{t.statusText}</Text>
                </View>
            )}
          </View>
        </View>

        {/* Edit Button Profile Section */}
        {!t.isApproved && (
            <TouchableOpacity style={styles.primaryEditBtn} onPress={openEdit}>
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryEditBtnText}>{isHindi ? 'प्रोफाइल बदलें' : 'Edit Profile'}</Text>
            </TouchableOpacity>
        )}
        {t.isApproved && (
             <View style={styles.lockMessageCard}>
                <Ionicons name="lock-closed" size={14} color="#92400E" />
                <Text style={styles.lockMessageText}>
                    {isHindi ? 'वेरिफाइड प्रोफाइल की जानकारी बदली नहीं जा सकती। मदद के लिए सपोर्ट से संपर्क करें।' : 'Verified profile info cannot be changed. Contact support for assistance.'}
                </Text>
             </View>
        )}

        {/* संपर्क */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'संपर्क' : 'Contact'}
        </Text>

        <View style={styles.infoCard}>
          <RowItem
            icon="business-outline"
            label={isHindi ? 'दुकान का नाम' : 'Shop name'}
            value={shopName}
          />
          <RowItem
            icon="location-outline"
            label={isHindi ? 'दुकान का पता' : 'Shop address'}
            value={address}
          />
          <RowItem
            icon="call-outline"
            label={isHindi ? 'मोबाइल नंबर' : 'Mobile number'}
            value={phone}
          />
          <RowItem
            icon="mail-outline"
            label={isHindi ? 'ईमेल' : 'Email'}
            value={email}
          />
          <RowItem
            icon="barcode-outline"
            label={isHindi ? 'GST नंबर' : 'GST number'}
            value={gstNumber || '——'}
          />
          <RowItem
            icon="document-attach-outline"
            label={isHindi ? 'लाइसेंस नंबर' : 'License number'}
            value={licenseNumber || '——'}
          />
          {/* NEW: Aadhaar number row */}
          <RowItem
            icon="id-card-outline"
            label={t.aadhaarLabel}
            value={aadhaarNumber || '——'}
            last
          />
        </View>

        {/* BANKING SECTION */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'बैंक डिटेल्स' : 'Bank Details'}
        </Text>
        <View style={styles.infoCard}>
          <RowItem
            icon="person-outline"
            label={isHindi ? 'खाता धारक' : 'Account Holder'}
            value={bankHolder || '——'}
          />
          <RowItem
            icon="business-outline"
            label={isHindi ? 'बैंक का नाम' : 'Bank Name'}
            value={bankName || '——'}
          />
          <RowItem
            icon="card-outline"
            label={isHindi ? 'खाता नंबर' : 'Account Number'}
            value={accountNumber || '——'}
          />
          <RowItem
            icon="list-outline"
            label={isHindi ? 'IFSC कोड' : 'IFSC Code'}
            value={ifscCode || '——'}
            last
          />
        </View>

        {/* DOCUMENTS SECTION */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'दस्तावेज' : 'Documents'}
        </Text>
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.85}
            onPress={handleAadhaarAction}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.aadhaarDoc}</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {aadhaarDocName || t.aadhaarDocNotUploaded}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {t.isApproved ? (isHindi ? 'देखें' : 'View') : t.viewOrUploadAadhaar}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#F3F4FB', marginTop: 4 }]}
            activeOpacity={0.85}
            onPress={handleAadhaarBackAction}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#166534"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>{t.aadhaarBackDoc}</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {aadhaarBackDocName || t.aadhaarBackDocNotUploaded}
                </Text>
              </View>
            </View>
            <Text style={styles.aadhaarDocAction}>
              {t.isApproved ? (isHindi ? 'देखें' : 'View') : t.viewOrUploadAadhaarBack}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#F3F4FB', marginTop: 4 }]}
            activeOpacity={0.8}
            onPress={onUploadBankDoc}
            disabled={t.isApproved}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#FFF7ED' }]}
              >
                <Ionicons
                  name="image-outline"
                  size={16}
                  color="#9A3412"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>{isHindi ? 'कैंसिल चेक / पासबुक' : 'Cancelled Cheque / Passbook'}</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {bankDocUrl ? (isHindi ? 'डॉक्यूमेंट अपलोड है' : 'Document uploaded') : (isHindi ? 'अपलोड नहीं है' : 'Not uploaded')}
                </Text>
              </View>
            </View>
            {!t.isApproved && (
                <Text style={styles.aadhaarDocAction}>{isHindi ? 'अपलोड करें' : 'Upload'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SHOP LOCATION SECTION */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'दुकान की लोकेशन' : 'Shop Location'}
        </Text>
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={onUpdateLocation}
            disabled={updatingLocation}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#F0F9FF' }]}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color="#0284C7"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'दुकान की लोकेशन अपडेट करें' : 'Update Shop Location'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'अपनी दुकान की वर्तमान GPS स्थिति सेट करें'
                    : 'Set your shop’s current GPS position'}
                </Text>
              </View>
            </View>
            {updatingLocation ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <Ionicons name="refresh-circle" size={24} color="#0284C7" />
            )}
          </TouchableOpacity>
        </View>

        {/* SETTINGS */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'सेटिंग्स' : 'Settings'}
        </Text>

        <View style={styles.infoCard}>
          {/* Wallet */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={() => router.push('/(shop-partner)/wallet')}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#F0FDF4' }]}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color="#16A34A"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'वॉलेट / कमाई' : 'Wallet & Earnings'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'कुल कमाई और लेन-देन देखें'
                    : 'View total earnings and transactions'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={[styles.settingRow, { marginTop: 6 }]}
            activeOpacity={0.8}
            onPress={goTerms}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#92400E"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'नियम और शर्तें' : 'Terms & conditions'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'ऐप उपयोग के नियम और नीतियां'
                    : 'Read app usage terms and policies'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Help */}
          <TouchableOpacity
            style={[styles.settingRow, { marginTop: 6 }]}
            activeOpacity={0.8}
            onPress={goHelp}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#DBEAFE' }]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={16}
                  color="#1D4ED8"
                />
              </View>
              <View>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'मदद / सपोर्ट' : 'Help & support'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'कॉल या व्हाट्सऐप से मदद लें'
                    : 'Get help via call or WhatsApp'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.settingRow, { marginTop: 6 }]}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <View
                style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color="#B91C1C"
                />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: '#B91C1C' }]}>
                  {isHindi ? 'लॉगआउट' : 'Logout'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'वर्तमान अकाउंट से बाहर निकलें'
                    : 'Sign out from this account'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL WITH PROFILE PIC */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHindi ? 'प्रोफाइल edit करें' : 'Edit profile'}
              </Text>
              <TouchableOpacity onPress={closeEdit}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Modal avatar + change button */}
            <View style={styles.modalAvatarWrap}>
              <View style={styles.modalAvatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
                ) : (
                  <Ionicons
                    name="storefront-outline"
                    size={32}
                    color="#16A34A"
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.changePhotoBtn}
                activeOpacity={0.8}
                onPress={onChangeAvatar}
              >
                <Ionicons
                  name="camera-outline"
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.changePhotoText}>
                  {isHindi ? 'फोटो बदलें' : 'Change photo'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
            >
              <EditField
                label={isHindi ? 'नाम' : 'Name'}
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <EditField
                label={isHindi ? 'दुकान का नाम' : 'Shop name'}
                value={shopName}
                onChangeText={setShopName}
              />
              <EditField
                label={isHindi ? 'दुकान का पता' : 'Shop address'}
                value={address}
                multiline
                onChangeText={setAddress}
              />
              <EditField
                label={isHindi ? 'मोबाइल नंबर' : 'Mobile number'}
                value={phone}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                editable={false}
              />
              <EditField
                label={isHindi ? 'ईमेल' : 'Email'}
                value={email}
                keyboardType="email-address"
                onChangeText={setEmail}
              />
              <EditField
                label={isHindi ? 'GST नंबर' : 'GST number'}
                value={gstNumber}
                onChangeText={setGstNumber}
              />
              <EditField
                label={isHindi ? 'लाइसेंस नंबर' : 'License number'}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
              {/* NEW: Aadhaar in edit */}
              <EditField
                label={t.aadhaarLabel}
                value={aadhaarNumber}
                keyboardType="number-pad"
                onChangeText={setAadhaarNumber}
              />

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{isHindi ? 'बैंक डिटेल्स' : 'Bank Details'}</Text>
              <EditField
                label={isHindi ? 'खाता धारक का नाम' : 'Account Holder Name'}
                value={bankHolder}
                onChangeText={setBankHolder}
              />
              <EditField
                label={isHindi ? 'बैंक का नाम' : 'Bank Name'}
                value={bankName}
                onChangeText={setBankName}
              />
              <EditField
                label={isHindi ? 'खाता नंबर' : 'Account Number'}
                value={accountNumber}
                keyboardType="number-pad"
                onChangeText={setAccountNumber}
              />
              <EditField
                label={isHindi ? 'IFSC कोड' : 'IFSC Code'}
                value={ifscCode}
                onChangeText={setIfscCode}
              />
              <EditField
                label={isHindi ? 'बैंक का पता' : 'Bank Address'}
                value={bankAddress}
                onChangeText={setBankAddress}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.9}
              onPress={onSaveProfile}
            >
              <Text style={styles.saveBtnText}>
                {isHindi ? 'सेव करें' : 'Save changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type RowProps = {
  icon: any;
  label: string;
  value: string;
  last?: boolean;
};

function RowItem({ icon, label, value, last }: RowProps) {
  return (
    <View
      style={[
        styles.rowItem,
        !last && { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          <Ionicons name={icon} size={14} color="#4B5563" />
        </View>
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

type EditFieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: any;
  editable?: boolean;
};

function EditField({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  editable,
}: EditFieldProps) {
  return (
    <View style={styles.editFieldWrap}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[
          styles.editInput,
          multiline && { height: 70, textAlignVertical: 'top' },
          editable === false && { color: '#9CA3AF', backgroundColor: '#F3F4F6' }
        ]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
      />
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
    justifyContent: 'space-between',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  iconCircle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
  },
  langText: { fontSize: 12, fontWeight: '600', color: '#0369A1' },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#0000000D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  rowItem: {
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 1,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  settingSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  aadhaarDocAction: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },

  // modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modalAvatarWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editFieldWrap: {
    marginTop: 8,
  },
  editLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: '#16A34A',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  primaryEditBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#16A34A',
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: '#16A34A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 4,
  },
  primaryEditBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 6,
  },
  lockMessageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF3C7',
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#FDE68A',
  },
  lockMessageText: {
      flex: 1,
      fontSize: 11,
      color: '#92400E',
      marginLeft: 8,
      fontWeight: '600',
      lineHeight: 16,
  },
});

