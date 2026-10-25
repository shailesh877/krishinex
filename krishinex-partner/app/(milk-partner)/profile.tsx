import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import { BASE_API_URL, FILES_BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
import MilkPartnerHeader from '../../components/MilkPartnerHeader';

export default function MilkPartnerProfileScreen() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const { updateUser } = useUser();
  const hi = lang === 'hi';

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${BASE_API_URL}/milk/partner/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setPartner(data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      } else {
        const local = await AsyncStorage.getItem('userData');
        if (local) setPartner(JSON.parse(local));
      }
    } catch (e) {
      const local = await AsyncStorage.getItem('userData');
      if (local) setPartner(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          hi ? 'अनुमति आवश्यक' : 'Permission Required',
          hi ? 'गैलरी एक्सेस की अनुमति दें ताकि आप फोटो चुन सकें।' : 'Please grant camera roll permissions to select a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const selectedAsset = result.assets[0];
      setUploadingPhoto(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('photo', {
        uri: selectedAsset.uri,
        name: `milk_partner_${Date.now()}.jpg`,
        type: selectedAsset.mimeType || 'image/jpeg',
      } as any);

      const uploadRes = await fetch(`${BASE_API_URL}/user/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok && uploadData.url) {
        const freshPhotoUrl = uploadData.url;
        setPartner((prev: any) => ({ ...prev, profilePhotoUrl: freshPhotoUrl }));
        updateUser({
          profilePhotoUrl: freshPhotoUrl,
          avatarUri: freshPhotoUrl.startsWith('http')
            ? freshPhotoUrl
            : `${FILES_BASE_URL}/${freshPhotoUrl.replace(/\\/g, '/')}`,
        });

        showAlert(
          hi ? 'सफलता! 🎉' : 'Success! 🎉',
          hi ? 'आपकी प्रोफ़ाइल फ़ोटो सफलतापूर्वक अपडेट हो गई है। किसान अब आपको पहचान सकेंगे।' : 'Profile photo updated successfully.'
        );
      } else {
        showAlert(hi ? 'त्रुटि' : 'Error', uploadData.error || (hi ? 'फ़ोटो अपलोड नहीं हो सकी' : 'Upload failed'));
      }
    } catch (err: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', err.message || (hi ? 'फ़ोटो अपलोड में समस्या आई' : 'Failed to pick photo'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      hi ? 'लॉगआउट पुष्टि' : 'Confirm Logout',
      hi ? 'क्या आप सचमुच अपने पार्टनर खाते से लॉगआउट करना चाहते हैं?' : 'Are you sure you want to log out of your partner account?',
      [
        { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: hi ? 'लॉगआउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:1800123456');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* KRISHINEX BRANDED HEADER */}
      <MilkPartnerHeader
        partnerName={partner?.name}
        assignedRoute={partner?.assignedRoute}
        onRefresh={loadProfile}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* AVATAR BANNER */}
        <View style={styles.profileBanner}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAndUploadPhoto}
            activeOpacity={0.85}
            disabled={uploadingPhoto}
          >
            {partner?.profilePhotoUrl ? (
              <Image
                source={{
                  uri: partner.profilePhotoUrl.startsWith('http')
                    ? partner.profilePhotoUrl
                    : `${FILES_BASE_URL}/${partner.profilePhotoUrl.replace(/\\/g, '/')}`,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarTxt}>
                  {(partner?.name || 'N').trim()[0].toUpperCase()}
                </Text>
              </View>
            )}

            {/* Camera Edit Badge */}
            <View style={styles.cameraBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.nameTxt}>{partner?.name || 'Milk Partner'}</Text>
          <TouchableOpacity onPress={handlePickAndUploadPhoto} activeOpacity={0.7} style={{ marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
              {hi ? '📸 फ़ोटो बदलें / जोड़ें' : '📸 Change Profile Photo'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.phoneTxt}>+91 {partner?.phone || '-'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeTxt}>{hi ? 'सक्रिय पार्टनर' : 'Active Fleet'}</Text>
            </View>
            <View style={styles.routeBadge}>
              <Ionicons name="location" size={12} color="#059669" />
              <Text style={styles.routeBadgeTxt}>{partner?.assignedRoute || 'Main Route'}</Text>
            </View>
          </View>
        </View>

        {/* FLEET DETAILS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{hi ? 'वाहन व उपकरण विवरण' : 'Vehicle & Equipment'}</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="car-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'वाहन प्रकार' : 'Vehicle Type'}</Text>
              <Text style={styles.infoVal}>{partner?.vehicleType || 'Motorcycle'}</Text>
            </View>
          </View>

          {partner?.vehicleType !== 'Cycle' && (
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text-outline" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{hi ? 'वाहन नंबर' : 'Vehicle Number'}</Text>
                <Text style={styles.infoVal}>{partner?.vehicleNumber || (hi ? 'लागू नहीं' : 'N/A')}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="cube-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'कैन क्षमता (Canister Capacity)' : 'Canister Capacity'}</Text>
              <Text style={styles.infoVal}>{partner?.canisterCapacityLiters || 40} {hi ? 'लीटर' : 'Liters'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconBox}>
              <Ionicons name="flask-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'गुणवत्ता जांच किट (FAT/SNF)' : 'Testing Kit'}</Text>
              <Text style={[styles.infoVal, { color: partner?.hasTestingKit ? '#059669' : '#64748B' }]}>
                {partner?.hasTestingKit ? (hi ? 'उपलब्ध है (Equipped) ✓' : 'Equipped ✓') : (hi ? 'उपलब्ध नहीं' : 'Not Equipped')}
              </Text>
            </View>
          </View>
        </View>

        {/* ADDRESS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{hi ? 'पता व संपर्क' : 'Address & Contact'}</Text>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconBox}>
              <Ionicons name="home-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{hi ? 'पूरा पता' : 'Full Address'}</Text>
              <Text style={styles.infoVal}>{partner?.address || '-'}</Text>
            </View>
          </View>
        </View>

        {/* SETTINGS / PREFERENCES */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>{hi ? 'प्राथमिकताएं व सहायता' : 'Preferences & Support'}</Text>

          <TouchableOpacity style={styles.actionRow} onPress={toggleLang}>
            <View style={styles.iconBox}>
              <Ionicons name="language-outline" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>{hi ? 'ऐप भाषा (Language)' : 'App Language'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'वर्तमान: हिन्दी (बदलने के लिए टैप करें)' : 'Current: English (Tap to toggle)'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleCallSupport}>
            <View style={styles.iconBox}>
              <Ionicons name="headset-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>{hi ? 'सहायता केंद्र / हेल्पडेस्क' : 'Help & Support'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'समस्या होने पर सीधे कॉल करें' : 'Call KrishiNex Support'}</Text>
            </View>
            <Ionicons name="call" size={16} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionRowTitle, { color: '#EF4444' }]}>{hi ? 'लॉगआउट करें' : 'Logout'}</Text>
              <Text style={styles.actionRowSub}>{hi ? 'खाते से बाहर निकलें' : 'Sign out of partner account'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  profileBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#059669',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  avatarTxt: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  nameTxt: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  phoneTxt: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activeBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  routeBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  actionRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
