import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { BASE_API_URL, FILES_BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';

// ── Helper ──────────────────────────────────────────────────────────────────
const formatUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${FILES_BASE_URL}/${url.replace(/\\/g, '/')}`;
};

// ── Component ────────────────────────────────────────────────────────────────
export default function MilkPartnerProfileScreen() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const { updateUser } = useUser();
  const hi = lang === 'hi';

  // Profile data
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAadhaarNum, setEditAadhaarNum] = useState('');
  const [saving, setSaving] = useState(false);

  // Aadhaar doc upload
  const [uploadingAadhaarSide, setUploadingAadhaarSide] = useState<'front' | 'back' | null>(null);

  const isApproved = partner?.status === 'approved';
  const isBlocked = partner?.status === 'blocked';
  const isPending = partner?.status === 'pending';

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadProfile = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_API_URL}/milk/partner/profile`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setPartner(data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      } else {
        const local = await AsyncStorage.getItem('userData');
        if (local) setPartner(JSON.parse(local));
      }
    } catch {
      const local = await AsyncStorage.getItem('userData');
      if (local) setPartner(JSON.parse(local));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = () => { setRefreshing(true); loadProfile(true); };

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = () => {
    setEditName(partner?.name || '');
    setEditAddress(partner?.address || '');
    setEditAadhaarNum(partner?.aadhaarNumber || '');
    setEditVisible(true);
  };

  // ── Save profile edit ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const cleanName = editName.trim();
    const cleanAddress = editAddress.trim();
    const cleanAadhaar = editAadhaarNum.replace(/\s+/g, '');

    if (!cleanName) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'नाम खाली नहीं हो सकता।' : 'Name cannot be empty.');
      return;
    }
    if (cleanAadhaar && !/^\d{12}$/.test(cleanAadhaar)) {
      showAlert(hi ? 'अमान्य आधार' : 'Invalid Aadhaar', hi ? '12 अंकों का आधार नंबर दर्ज करें।' : 'Aadhaar must be exactly 12 digits.');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_API_URL}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: cleanName, address: cleanAddress, aadhaarNumber: cleanAadhaar }),
      });

      const data = await res.json();
      if (res.ok) {
        setPartner((prev: any) => ({ ...prev, name: cleanName, address: cleanAddress, aadhaarNumber: cleanAadhaar }));
        updateUser({ name: cleanName });
        setEditVisible(false);
        showAlert(hi ? 'प्रोफ़ाइल अपडेट हो गई ✓' : 'Profile Updated ✓', hi ? 'आपके बदलाव सफलतापूर्वक सेव हो गए।' : 'Your changes have been saved.');
      } else {
        showAlert(hi ? 'त्रुटि' : 'Error', data.error || (hi ? 'अपडेट नहीं हो सका।' : 'Failed to update profile.'));
      }
    } catch (e: any) {
      showAlert(hi ? 'नेटवर्क त्रुटि' : 'Network Error', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Profile photo upload ──────────────────────────────────────────────────
  const handlePickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(hi ? 'अनुमति आवश्यक' : 'Permission Required', hi ? 'गैलरी एक्सेस की अनुमति दें।' : 'Please allow gallery access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      setUploadingPhoto(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('photo', { uri: asset.uri, name: `photo_${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' } as any);

      const res = await fetch(`${BASE_API_URL}/user/upload-photo`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
      });

      const d = await res.json();
      if (res.ok && d.url) {
        const freshUrl = formatUrl(d.url);
        setPartner((prev: any) => ({ ...prev, profilePhotoUrl: d.url }));
        updateUser({ profilePhotoUrl: d.url, avatarUri: freshUrl });
        showAlert(hi ? 'फ़ोटो अपडेट! 🎉' : 'Photo Updated! 🎉', hi ? 'प्रोफ़ाइल फ़ोटो बदल गई।' : 'Profile photo updated.');
      } else {
        showAlert(hi ? 'त्रुटि' : 'Error', d.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', e?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Aadhaar doc upload ────────────────────────────────────────────────────
  const handleAadhaarDocPress = (side: 'front' | 'back') => {
    const docUrl = side === 'back' ? partner?.aadhaarBackDocUrl : partner?.aadhaarDocUrl;
    const label = side === 'back' ? (hi ? 'बैक साइड' : 'Back') : (hi ? 'फ्रंट साइड' : 'Front');

    if (isApproved) {
      if (docUrl) {
        Linking.openURL(formatUrl(docUrl)).catch(() => showAlert('Error', 'Cannot open URL'));
      } else {
        showAlert(hi ? 'प्रतिबंधित' : 'Restricted', hi ? 'अप्रूव्ड प्रोफ़ाइल में नया दस्तावेज़ अपलोड नहीं होगा।' : 'Cannot upload new docs after approval.');
      }
      return;
    }

    if (docUrl) {
      showAlert(
        hi ? `आधार (${label})` : `Aadhaar (${label})`,
        hi ? 'क्या करना है?' : 'What would you like to do?',
        [
          { text: hi ? 'देखें' : 'View', onPress: () => Linking.openURL(formatUrl(docUrl)).catch(() => {}) },
          { text: hi ? 'नया अपलोड करें' : 'Re-upload', onPress: () => pickAndUploadAadhaar(side) },
          { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      pickAndUploadAadhaar(side);
    }
  };

  const pickAndUploadAadhaar = async (side: 'front' | 'back') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'], copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      setUploadingAadhaarSide(side);

      const formData = new FormData();
      formData.append('aadhaar', { uri: asset.uri, name: asset.name || `aadhaar_${side}_${Date.now()}.pdf`, type: asset.mimeType || 'application/pdf' } as any);

      const res = await fetch(`${BASE_API_URL}/user/upload-aadhaar?side=${side}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
      });

      const d = await res.json();
      if (res.ok && d.url) {
        setPartner((prev: any) => ({
          ...prev,
          ...(side === 'back' ? { aadhaarBackDocUrl: d.url } : { aadhaarDocUrl: d.url }),
        }));
        showAlert(hi ? 'अपलोड सफल! ✓' : 'Uploaded! ✓', hi ? `आधार ${side === 'back' ? 'बैक' : 'फ्रंट'} दस्तावेज़ सेव हो गया।` : `Aadhaar ${side} document saved.`);
      } else {
        showAlert(hi ? 'त्रुटि' : 'Error', d.error || 'Upload failed');
      }
    } catch (e: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', e?.message || 'Could not upload document');
    } finally {
      setUploadingAadhaarSide(null);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    showAlert(
      hi ? 'लॉगआउट?' : 'Logout?',
      hi ? 'क्या आप सचमुच लॉगआउट करना चाहते हैं?' : 'Are you sure you want to log out?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'लॉगआउट' : 'Logout', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  // ── Status colors ─────────────────────────────────────────────────────────
  const statusMeta = isApproved
    ? { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#059669', label: hi ? 'स्वीकृत (Approved)' : 'Approved' }
    : isBlocked
      ? { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', dot: '#DC2626', label: hi ? 'ब्लॉक' : 'Blocked' }
      : { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706', label: hi ? 'समीक्षाधीन' : 'Under Review' };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <MilkPartnerHeader partnerName="" onRefresh={() => {}} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>{hi ? 'प्रोफ़ाइल लोड हो रही है...' : 'Loading profile...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <MilkPartnerHeader partnerName={partner?.name} assignedRoute={partner?.assignedRoute} onRefresh={loadProfile} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >

        {/* ── HERO CARD ───────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAndUploadPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
            {partner?.profilePhotoUrl ? (
              <Image source={{ uri: formatUrl(partner.profilePhotoUrl) }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={['#059669', '#047857']} style={styles.avatarCircle}>
                <Text style={styles.avatarTxt}>{(partner?.name || 'M').trim()[0].toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={13} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.nameText}>{partner?.name || 'Milk Partner'}</Text>
          <Text style={styles.phoneText}>+91 {partner?.phone || '-'}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
            {partner?.assignedRoute ? (
              <View style={styles.routeBadge}>
                <Ionicons name="location" size={11} color="#059669" />
                <Text style={styles.routeBadgeText}>{partner.assignedRoute}</Text>
              </View>
            ) : null}
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editProfileBtn} onPress={openEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={16} color="#059669" />
            <Text style={styles.editProfileBtnText}>{hi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── STATUS NOTICE BANNER ────────────────────────────────────── */}
        {isPending && (
          <View style={styles.noticeBanner}>
            <Ionicons name="time-outline" size={18} color="#D97706" style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.noticeBannerTitle}>{hi ? 'आवेदन समीक्षाधीन है' : 'Application Under Review'}</Text>
              <Text style={styles.noticeBannerDesc}>
                {hi ? 'एडमिन द्वारा अप्रूवल के बाद किसान और रूट असाइन होंगे। प्रोफ़ाइल में आधार अपलोड ज़रूर करें।' : 'Farmers and routes will be assigned after admin approval. Please upload your Aadhaar documents.'}
              </Text>
            </View>
          </View>
        )}
        {isBlocked && (
          <View style={[styles.noticeBanner, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.noticeBannerTitle, { color: '#DC2626' }]}>{hi ? 'अकाउंट ब्लॉक है' : 'Account Blocked'}</Text>
              <Text style={[styles.noticeBannerDesc, { color: '#7F1D1D' }]}>
                {hi ? 'आपका खाता एडमिन द्वारा ब्लॉक किया गया है। सहायता के लिए संपर्क करें।' : 'Your account has been blocked. Please contact support.'}
              </Text>
            </View>
          </View>
        )}

        {/* ── PERSONAL INFO CARD ──────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="person-outline" size={16} color="#2563EB" />
              </View>
              <Text style={styles.cardTitle}>{hi ? 'व्यक्तिगत जानकारी' : 'Personal Info'}</Text>
            </View>
            {!isApproved && (
              <TouchableOpacity style={styles.smallEditBtn} onPress={openEdit}>
                <Ionicons name="pencil" size={13} color="#059669" />
                <Text style={styles.smallEditBtnText}>{hi ? 'संपादित' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="person" size={16} color="#2563EB" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'पूरा नाम' : 'Full Name'}</Text>
              <Text style={styles.infoVal}>{partner?.name || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="call" size={16} color="#059669" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'मोबाइल नंबर' : 'Mobile'}</Text>
              <Text style={styles.infoVal}>+91 {partner?.phone || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconBox}><Ionicons name="home" size={16} color="#7C3AED" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'पता' : 'Address'}</Text>
              <Text style={styles.infoVal}>{partner?.address || (hi ? 'पता उपलब्ध नहीं' : 'Not provided')}</Text>
            </View>
          </View>
        </View>

        {/* ── AADHAAR & IDENTITY CARD ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
              </View>
              <Text style={styles.cardTitle}>{hi ? 'पहचान व आधार' : 'Identity & Aadhaar'}</Text>
            </View>
            {isApproved && (
              <View style={styles.lockedChip}>
                <Ionicons name="lock-closed" size={11} color="#059669" />
                <Text style={styles.lockedChipText}>{hi ? 'लॉक्ड' : 'Locked'}</Text>
              </View>
            )}
          </View>

          {/* Aadhaar Number row */}
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="id-card-outline" size={16} color="#7C3AED" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'आधार नंबर' : 'Aadhaar Number'}</Text>
              <Text style={styles.infoVal}>
                {partner?.aadhaarNumber
                  ? (isApproved ? `XXXX-XXXX-${partner.aadhaarNumber.slice(-4)}` : partner.aadhaarNumber)
                  : (hi ? 'अभी तक नहीं भरा' : 'Not provided')}
              </Text>
            </View>
            {!isApproved && (
              <TouchableOpacity style={styles.smallEditBtn} onPress={openEdit}>
                <Ionicons name="pencil" size={13} color="#059669" />
                <Text style={styles.smallEditBtnText}>{hi ? 'भरें' : 'Fill'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Aadhaar Front */}
          <TouchableOpacity
            style={styles.docRow}
            activeOpacity={0.8}
            onPress={() => handleAadhaarDocPress('front')}
            disabled={uploadingAadhaarSide === 'front'}
          >
            <View style={[styles.iconBox, { backgroundColor: partner?.aadhaarDocUrl ? '#ECFDF5' : '#F1F5F9' }]}>
              <Ionicons name={partner?.aadhaarDocUrl ? 'document-text' : 'document-text-outline'} size={16} color={partner?.aadhaarDocUrl ? '#059669' : '#94A3B8'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'आधार (Front Side)' : 'Aadhaar (Front)'}</Text>
              <Text style={styles.docStatus} numberOfLines={1}>
                {partner?.aadhaarDocUrl ? (hi ? 'अपलोड हो गया ✓' : 'Uploaded ✓') : (hi ? 'अपलोड नहीं हुआ' : 'Not uploaded')}
              </Text>
            </View>
            {uploadingAadhaarSide === 'front'
              ? <ActivityIndicator size="small" color="#059669" />
              : (
                <View style={[styles.docActionBtn, { backgroundColor: partner?.aadhaarDocUrl ? '#ECFDF5' : '#F0FDF4', borderColor: partner?.aadhaarDocUrl ? '#A7F3D0' : '#BBF7D0' }]}>
                  <Text style={styles.docActionBtnText}>
                    {isApproved ? (hi ? 'देखें' : 'View') : partner?.aadhaarDocUrl ? (hi ? 'देखें / बदलें' : 'View/Change') : (hi ? 'अपलोड करें' : 'Upload')}
                  </Text>
                  <Ionicons name={isApproved ? 'eye-outline' : 'cloud-upload-outline'} size={12} color="#059669" />
                </View>
              )}
          </TouchableOpacity>

          {/* Aadhaar Back */}
          <TouchableOpacity
            style={[styles.docRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.8}
            onPress={() => handleAadhaarDocPress('back')}
            disabled={uploadingAadhaarSide === 'back'}
          >
            <View style={[styles.iconBox, { backgroundColor: partner?.aadhaarBackDocUrl ? '#ECFDF5' : '#F1F5F9' }]}>
              <Ionicons name={partner?.aadhaarBackDocUrl ? 'document-text' : 'document-text-outline'} size={16} color={partner?.aadhaarBackDocUrl ? '#059669' : '#94A3B8'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'आधार (Back Side)' : 'Aadhaar (Back)'}</Text>
              <Text style={styles.docStatus} numberOfLines={1}>
                {partner?.aadhaarBackDocUrl ? (hi ? 'अपलोड हो गया ✓' : 'Uploaded ✓') : (hi ? 'अपलोड नहीं हुआ' : 'Not uploaded')}
              </Text>
            </View>
            {uploadingAadhaarSide === 'back'
              ? <ActivityIndicator size="small" color="#059669" />
              : (
                <View style={[styles.docActionBtn, { backgroundColor: partner?.aadhaarBackDocUrl ? '#ECFDF5' : '#F0FDF4', borderColor: partner?.aadhaarBackDocUrl ? '#A7F3D0' : '#BBF7D0' }]}>
                  <Text style={styles.docActionBtnText}>
                    {isApproved ? (hi ? 'देखें' : 'View') : partner?.aadhaarBackDocUrl ? (hi ? 'देखें / बदलें' : 'View/Change') : (hi ? 'अपलोड करें' : 'Upload')}
                  </Text>
                  <Ionicons name={isApproved ? 'eye-outline' : 'cloud-upload-outline'} size={12} color="#059669" />
                </View>
              )}
          </TouchableOpacity>
        </View>

        {/* ── VEHICLE & EQUIPMENT CARD ─────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="car-outline" size={16} color="#EA580C" />
              </View>
              <Text style={styles.cardTitle}>{hi ? 'वाहन व उपकरण' : 'Vehicle & Equipment'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="car-outline" size={16} color="#EA580C" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'वाहन प्रकार' : 'Vehicle Type'}</Text>
              <Text style={styles.infoVal}>{partner?.vehicleType || 'Motorcycle'}</Text>
            </View>
          </View>

          {partner?.vehicleType !== 'Cycle' && (
            <View style={styles.infoRow}>
              <View style={styles.iconBox}><Ionicons name="card-outline" size={16} color="#EA580C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{hi ? 'वाहन नंबर' : 'Vehicle Number'}</Text>
                <Text style={styles.infoVal}>{partner?.vehicleNumber || (hi ? 'लागू नहीं' : 'N/A')}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="cube-outline" size={16} color="#EA580C" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'कैन क्षमता' : 'Canister Capacity'}</Text>
              <Text style={styles.infoVal}>{partner?.canisterCapacityLiters || 40} {hi ? 'लीटर' : 'L'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconBox}><Ionicons name="flask-outline" size={16} color="#EA580C" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'जांच किट (FAT/SNF)' : 'Testing Kit (FAT/SNF)'}</Text>
              <Text style={[styles.infoVal, { color: partner?.hasTestingKit ? '#059669' : '#94A3B8' }]}>
                {partner?.hasTestingKit ? (hi ? 'उपलब्ध है ✓' : 'Equipped ✓') : (hi ? 'उपलब्ध नहीं' : 'Not equipped')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SETTINGS CARD ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="settings-outline" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.cardTitle}>{hi ? 'प्राथमिकताएं व सहायता' : 'Settings & Support'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionRow} onPress={toggleLang}>
            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}><Ionicons name="language-outline" size={16} color="#7C3AED" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>{hi ? 'ऐप भाषा' : 'App Language'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'वर्तमान: हिन्दी — बदलने के लिए टैप करें' : 'Current: English — Tap to toggle'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL('tel:1800123456')}>
            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}><Ionicons name="headset-outline" size={16} color="#059669" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>{hi ? 'हेल्पडेस्क / सहायता' : 'Help & Support'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'KrishiNex सपोर्ट को कॉल करें' : 'Call KrishiNex Support'}</Text>
            </View>
            <Ionicons name="call" size={14} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}><Ionicons name="log-out-outline" size={16} color="#EF4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionRowTitle, { color: '#EF4444' }]}>{hi ? 'लॉगआउट' : 'Logout'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'खाते से बाहर निकलें' : 'Sign out of partner account'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════
          EDIT PROFILE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalDragBar} />
              <Text style={styles.modalTitle}>{hi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Avatar section */}
              <View style={styles.modalAvatarSection}>
                <TouchableOpacity onPress={handlePickAndUploadPhoto} style={styles.modalAvatarWrap} disabled={uploadingPhoto} activeOpacity={0.8}>
                  {partner?.profilePhotoUrl ? (
                    <Image source={{ uri: formatUrl(partner.profilePhotoUrl) }} style={styles.modalAvatarImg} />
                  ) : (
                    <LinearGradient colors={['#059669', '#047857']} style={styles.modalAvatarImg}>
                      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>
                        {(partner?.name || 'M').trim()[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={styles.modalCameraBadge}>
                    {uploadingPhoto
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="camera" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <Text style={styles.modalAvatarHint}>{hi ? 'फ़ोटो बदलने के लिए टैप करें' : 'Tap to change photo'}</Text>
              </View>

              {/* Name field */}
              <Text style={styles.modalFieldLabel}>{hi ? 'पूरा नाम *' : 'Full Name *'}</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder={hi ? 'आपका नाम' : 'Your name'}
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              {/* Address field */}
              <Text style={styles.modalFieldLabel}>{hi ? 'पता' : 'Address'}</Text>
              <TextInput
                style={[styles.modalInput, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder={hi ? 'पूरा पता' : 'Full address'}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />

              {/* Aadhaar Number */}
              {!isApproved ? (
                <>
                  <Text style={styles.modalFieldLabel}>{hi ? 'आधार नंबर' : 'Aadhaar Number'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editAadhaarNum}
                    onChangeText={setEditAadhaarNum}
                    placeholder="12-digit Aadhaar number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  <Text style={styles.modalFieldNote}>
                    {hi ? 'आधार दस्तावेज़ (Front/Back) प्रोफ़ाइल कार्ड से अपलोड करें।' : 'Aadhaar documents (Front/Back) can be uploaded from the profile card below.'}
                  </Text>
                </>
              ) : (
                <View style={styles.modalApprovedNote}>
                  <Ionicons name="lock-closed" size={14} color="#059669" />
                  <Text style={styles.modalApprovedNoteText}>
                    {hi ? 'आधार नंबर अप्रूवल के बाद लॉक होता है। केवल नाम और पता बदल सकते हैं।' : 'Aadhaar is locked after approval. Only name and address can be edited.'}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditVisible(false)} disabled={saving}>
                  <Text style={styles.modalCancelBtnText}>{hi ? 'रद्द करें' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.modalSaveBtnText}>{hi ? 'सेव करें' : 'Save Changes'}</Text>
                      </>
                    )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#059669' },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#A7F3D0' },
  avatarTxt: { color: '#fff', fontSize: 28, fontWeight: '900' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#059669',
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
  },
  nameText: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  phoneText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8, borderWidth: 1, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  routeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0',
  },
  routeBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#A7F3D0',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  editProfileBtnText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  // Notice Banners
  noticeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
    borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 16, padding: 14, marginBottom: 14,
  },
  noticeBannerTitle: { fontSize: 13, fontWeight: '800', color: '#B45309', marginBottom: 3 },
  noticeBannerDesc: { fontSize: 12, fontWeight: '500', color: '#92400E', lineHeight: 17 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  lockedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC',
  },
  lockedChipText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  smallEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0',
  },
  smallEditBtnText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 10,
  },
  iconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  infoVal: { fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 1 },

  // Doc rows
  docRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 10,
  },
  docStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  docActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  docActionBtnText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  // Action rows (Settings)
  actionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 10,
  },
  actionRowTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  actionRowSub: { fontSize: 11, color: '#64748B', marginTop: 1 },

  // MODAL ─────────────────────────────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalDragBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  modalCloseBtn: {
    position: 'absolute', right: 14, top: 14, width: 32, height: 32,
    borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { padding: 20, paddingBottom: 36 },

  // Avatar in modal
  modalAvatarSection: { alignItems: 'center', marginBottom: 20 },
  modalAvatarWrap: { position: 'relative', marginBottom: 8 },
  modalAvatarImg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#059669' },
  modalCameraBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#059669',
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  modalAvatarHint: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  // Form fields
  modalFieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  modalFieldNote: { fontSize: 11, color: '#64748B', marginTop: 6, lineHeight: 16 },
  modalApprovedNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 10, padding: 10, marginTop: 14,
  },
  modalApprovedNoteText: { fontSize: 12, color: '#166534', flex: 1, lineHeight: 17 },

  // Buttons
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  modalSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#059669', paddingVertical: 13, borderRadius: 12,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalSaveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
