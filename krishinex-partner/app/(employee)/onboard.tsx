import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { API_URL } from '../../constants/api';
import * as Location from 'expo-location';
import { showAlert } from '../../components/CustomAlert';

const STATUS_GREEN = '#6bb313ff';

type Role = 'farmer' | 'shop' | 'ksp' | 'soil' | 'equipment' | 'labour';

export default function OnboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [role, setRole] = useState<Role>('farmer');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);

  const rolesList: { value: Role; labelEn: string; labelHi: string; icon: string }[] = [
    { value: 'farmer', labelEn: 'Farmer', labelHi: 'किसान', icon: 'leaf-outline' },
    { value: 'shop', labelEn: 'Shop Partner', labelHi: 'दुकानदार', icon: 'storefront-outline' },
    { value: 'ksp', labelEn: 'KSP Partner', labelHi: 'KSP पार्टनर', icon: 'people-outline' },
    { value: 'soil', labelEn: 'Soil Lab', labelHi: 'मिट्टी लैब', icon: 'flask-outline' },
    { value: 'equipment', labelEn: 'Tractor Partner', labelHi: 'ट्रैक्टर पार्टनर', icon: 'construct-outline' },
    { value: 'labour', labelEn: 'Labour Partner', labelHi: 'लेबर पार्टनर', icon: 'hammer-outline' },
  ];

  const texts = {
    title: isHindi ? 'नया पंजीयन (ऑनबोर्डिंग)' : 'New User Onboarding',
    subtitle: isHindi ? 'किसान या पार्टनर का विवरण भरें' : 'Enter details of the farmer or business partner',
    roleLabel: isHindi ? 'यूज़र रोल चुनें *' : 'Select User Role *',
    nameLabel: isHindi ? 'पूरा नाम *' : 'Full Name *',
    namePlaceholder: isHindi ? 'जैसे: मोहन सिंह' : 'e.g. Mohan Singh',
    businessLabel: (() => {
      if (role === 'soil') return isHindi ? 'लैब का नाम *' : 'Lab Name *';
      if (role === 'shop') return isHindi ? 'दुकान का नाम *' : 'Shop Name *';
      if (role === 'equipment') return isHindi ? 'किराया फर्म / व्यवसाय का नाम *' : 'Rental Firm / Business Name *';
      if (role === 'ksp') return isHindi ? 'व्यवसाय का नाम (वैकल्पिक)' : 'Business Name (Optional)';
      return isHindi ? 'व्यवसाय / फर्म का नाम (वैकल्पिक)' : 'Business / Firm name (Optional)';
    })(),
    businessPlaceholder: (() => {
      if (role === 'soil') return isHindi ? 'जैसे: ग्रीन लैब' : 'e.g. Green Lab';
      if (role === 'shop') return isHindi ? 'जैसे: किसान खाद भंडार' : 'e.g. Kisan Fertilizers';
      return isHindi ? 'व्यवसाय का नाम' : 'Enter business name';
    })(),
    phoneLabel: isHindi ? 'मोबाइल नंबर *' : 'Mobile Number *',
    phonePlaceholder: isHindi ? '10 अंकों का मोबाइल नंबर' : '10 digit mobile number',
    emailLabel: isHindi ? 'ईमेल (वैकल्पिक)' : 'Email (Optional)',
    emailPlaceholder: isHindi ? 'example@domain.com' : 'example@domain.com',
    villageLabel: isHindi ? 'गांव का नाम *' : 'Village Name *',
    villagePlaceholder: isHindi ? 'गांव का नाम दर्ज करें' : 'Enter village name',
    districtLabel: isHindi ? 'जिला *' : 'District *',
    districtPlaceholder: isHindi ? 'जिले का नाम दर्ज करें' : 'Enter district name',
    stateLabel: isHindi ? 'राज्य *' : 'State *',
    statePlaceholder: isHindi ? 'राज्य का नाम दर्ज करें' : 'Enter state name',
    pincodeLabel: isHindi ? 'पिनकोड *' : 'Pincode *',
    pincodePlaceholder: isHindi ? '6 अंकों का पिनकोड' : '6 digit pincode',
    submitBtn: isHindi ? 'रजिस्टर करें' : 'Register User',
    submitSub: isHindi ? 'सफल होने पर नया अकाउंट बनेगा' : 'Account will be created on success',
    validationAlert: isHindi ? 'कृपया सभी ज़रूरी जानकारी भरें' : 'Please fill all required fields',
    phoneAlert: isHindi ? 'कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number',
    pincodeAlert: isHindi ? 'कृपया वैध 6-अंकीय पिनकोड दर्ज करें' : 'Please enter a valid 6-digit pincode',
  };

  const handleRegister = async () => {
    // Basic validation
    if (
      !name.trim() ||
      !phone.trim() ||
      !village.trim() ||
      !district.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', texts.validationAlert);
      return;
    }

    // Role-specific business name check (required for shop, soil, equipment)
    if (['shop', 'soil', 'equipment'].includes(role) && !businessName.trim()) {
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'व्यवसाय/दुकान/लैब का नाम आवश्यक है' : 'Business/Shop/Lab name is required'
      );
      return;
    }

    if (phone.trim().length !== 10 || isNaN(Number(phone))) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', texts.phoneAlert);
      return;
    }

    if (pincode.trim().length !== 6 || isNaN(Number(pincode))) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', texts.pincodeAlert);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('name', name.trim());
      formData.append('businessName', businessName.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());

      const fullAddress = `${village.trim()}, ${district.trim()}, ${state.trim()} - ${pincode.trim()}`;
      formData.append('address', fullAddress);

      // Try fetching location coordinates
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          formData.append('lat', loc.coords.latitude.toString());
          formData.append('lng', loc.coords.longitude.toString());
        }
      } catch (locErr) {
        console.warn('Location lookup failed:', locErr);
      }

      const REGISTER_URL = `${API_URL}/register`;
      const response = await fetch(REGISTER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        showAlert(
          isHindi ? 'सफलता' : 'Success',
          isHindi ? 'यूज़र का पंजीयन सफलतापूर्वक हो गया है!' : 'User registered successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear state
                setName('');
                setBusinessName('');
                setEmail('');
                setPhone('');
                setVillage('');
                setDistrict('');
                setState('');
                setPincode('');
                router.back();
              },
            },
          ]
        );
      } else {
        showAlert(isHindi ? 'त्रुटि' : 'Error', data.error || (isHindi ? 'पंजीयन विफल रहा' : 'Registration failed'));
      }
    } catch (err) {
      console.error('FE Onboarding Error:', err);
      showAlert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'सर्वर से कनेक्ट होने में समस्या आई' : 'Could not connect to server'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* ROLE SELECTION */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{texts.roleLabel}</Text>
          <View style={styles.roleGrid}>
            {rolesList.map((item) => {
              const active = role === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.rolePill, active && styles.rolePillActive]}
                  onPress={() => setRole(item.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={16}
                    color={active ? '#FFFFFF' : '#4B5563'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.rolePillText, active && styles.rolePillTextActive]}>
                    {isHindi ? item.labelHi : item.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* DETAILS FORM */}
        <View style={styles.card}>
          {/* Name */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.nameLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.namePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Business Name (Conditional) */}
          {(['shop', 'soil', 'equipment', 'ksp'].includes(role)) && (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{texts.businessLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={texts.businessPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
            </View>
          )}

          {/* Phone */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.phoneLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.phonePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.emailLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.emailPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Village */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.villageLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="home-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.villagePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={village}
                onChangeText={setVillage}
              />
            </View>
          </View>

          {/* District */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.districtLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="navigate-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.districtPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={district}
                onChangeText={setDistrict}
              />
            </View>
          </View>

          {/* State */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.stateLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="map-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.statePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          {/* Pincode */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{texts.pincodeLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="pin-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={texts.pincodePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabledBtn]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.submitBtnText}>{texts.submitBtn}</Text>
                <Text style={styles.submitBtnSub}>{texts.submitSub}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: STATUS_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  rolePillActive: {
    backgroundColor: STATUS_GREEN,
    borderColor: STATUS_GREEN,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  rolePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: STATUS_GREEN,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STATUS_GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  submitBtnSub: {
    color: '#DCFCE7',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
