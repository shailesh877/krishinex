// app/(employee)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect } from '@react-navigation/native';

import { BASE_URL, FILES_BASE_URL, BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/user`;

const STATUS_GREEN = '#6bb313ff';

type EmployeeModule = 'labour' | 'equipment' | 'soil' | 'doctor';

const DUMMY_PROFILE = {
  nameHi: 'राजेश कुमार',
  nameEn: 'Rajesh Kumar',
  phone: '+91 98765 43210',
  code: 'EMP-1023',
  villageHi: 'करनाल, हरियाणा',
  villageEn: 'Karnal, Haryana',
  joinDate: 'Jan 2025',
  modules: ['labour', 'equipment', 'soil'] as EmployeeModule[] };

export default function EmployeeProfileScreen() {
  const router = useRouter();
  
  const { lang, toggleLang } = useI18n();
  const isHindi = lang === 'hi';

  const [activeProfile, setActiveProfile] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadCachedProfile();
      fetchProfileFromAPI();
    }, [])
  );

  const loadCachedProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        setActiveProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Error reading employee cache', e);
    }
  };

  const fetchProfileFromAPI = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProfile(data);
        AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (e) {
      console.error('Fetch employee profile err:', e);
    }
  };

  const avatarSource = activeProfile?.profilePhotoUrl
    ? {
      uri: activeProfile.profilePhotoUrl.startsWith('http')
        ? activeProfile.profilePhotoUrl
        : `${FILES_BASE_URL}/${activeProfile.profilePhotoUrl.replace(/\\/g, '/')}`
    }
    : require('../../assets/images/logo.png');

  const t = {
    title: isHindi ? 'मेरी प्रोफ़ाइल' : 'My profile',
    role: isHindi ? 'कृषि नेक्स कर्मचारी' : 'KrishiNex employee',
    phone: isHindi ? 'मोबाइल नंबर' : 'Mobile number',
    empCode: isHindi ? 'Employee कोड' : 'Employee code',
    village: isHindi ? 'कार्य क्षेत्र' : 'Working area',
    joined: isHindi ? 'कंपनी में जुड़ने की तारीख' : 'Joined company',
    modulesTitle: isHindi ? 'Admin ने जो access दिया है' : 'Modules assigned by admin',
    moduleLabour: isHindi ? 'Labour / मजदूर काम' : 'Labour tasks',
    moduleEquipment: isHindi ? 'Tractor / Machine काम' : 'Tractor / machine',
    moduleSoil: isHindi ? 'Soil testing काम' : 'Soil testing',
    moduleDoctor: isHindi ? 'Doctor / crop सलाह' : 'Doctor / crop advice',
    editProfile: isHindi ? 'प्रोफ़ाइल बदलें' : 'Edit profile',
    logout: isHindi ? 'Log out' : 'Log out',
    langBtn: isHindi ? 'English' : 'हिन्दी' };

  const handleEdit = () => {
    router.push('/(employee)/edit-profile');
  };

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
          } },
      ],
    );
  };

  const moduleLabel = (m: EmployeeModule) => {
    if (m === 'labour') return t.moduleLabour;
    if (m === 'equipment') return t.moduleEquipment;
    if (m === 'soil') return t.moduleSoil;
    return t.moduleDoctor;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
      {Platform.OS === 'ios' && <View style={styles.statusBg} />}

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t.title}</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langPill}
            activeOpacity={0.8}
            onPress={toggleLang}
          >
            <Ionicons
              name="language-outline"
              size={14}
              color="#047857"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.langPillText}>{t.langBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP CARD – avatar + name */}
        <View style={styles.topCard}>
          <Image source={avatarSource} style={styles.avatarBig} />
          <Text style={styles.nameBig}>
            {activeProfile?.name || (isHindi ? DUMMY_PROFILE.nameHi : DUMMY_PROFILE.nameEn)}
          </Text>
          <Text style={styles.roleText}>{t.role}</Text>
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="call-outline" size={16} color="#047857" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{t.phone}</Text>
              <Text style={styles.infoValue}>{activeProfile?.phone || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="id-card-outline" size={16} color="#1D4ED8" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{t.empCode}</Text>
              <Text style={styles.infoValue}>{activeProfile?.employeeCode || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="location-outline" size={16} color="#DC2626" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{t.village}</Text>
              <Text style={styles.infoValue}>
                {activeProfile?.address || (isHindi ? 'पता उपलब्ध नहीं' : 'Address not available')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{t.joined}</Text>
              <Text style={styles.infoValue}>
                {activeProfile?.createdAt ? new Date(activeProfile.createdAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* MODULE ACCESS CARD */}
        <Text style={styles.sectionTitle}>{t.modulesTitle}</Text>
        <View style={styles.modulesCard}>
          {(activeProfile?.employeeModules?.length ? activeProfile.employeeModules : ['labour', 'equipment', 'soil', 'doctor']).map((m: EmployeeModule) => (
            <View key={m} style={styles.moduleRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#16A34A"
              />
              <Text style={styles.moduleText}>{moduleLabel(m)}</Text>
            </View>
          ))}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.9}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={16} color="#0369A1" />
            <Text style={styles.editBtnText}>{t.editProfile}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.9}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
            <Text style={styles.logoutBtnText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  statusBg: {
    height: 44,
    backgroundColor: STATUS_GREEN },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: STATUS_GREEN },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5BA40F',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8 },
  headerRight: {
    width: 120,
    alignItems: 'flex-end' },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0' },
  langPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857' },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10 },

  topCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB' },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8 },
  nameBig: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827' },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4 },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6 },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10 },
  infoTextWrap: {
    flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280' },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 1 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6 },

  modulesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16 },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4 },
  moduleText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600' },

  buttonsRow: {
    flexDirection: 'row',
    marginTop: 4 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    justifyContent: 'center' },
  editBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1' },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center' },
  logoutBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF' } });
