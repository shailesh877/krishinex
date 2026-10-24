import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

export default function ApprovalPendingScreen() {
  const router = useRouter();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [checking, setChecking] = useState(false);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        setPartner(JSON.parse(data));
      }
    } catch (e) {
      console.warn('Error reading userData:', e);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const res = await fetch(`${BASE_API_URL}/milk/partner/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        setPartner(data.user);

        if (data.user.status === 'approved') {
          showAlert(
            hi ? 'स्वीकृति मिल गई! 🎉' : 'Account Approved! 🎉',
            hi ? 'आपका मिल्क पार्टनर अकाउंट सक्रिय हो गया है।' : 'Your Milk Partner account is now active.'
          );
          router.replace('/(milk-partner)/home');
        } else if (data.user.status === 'rejected') {
          showAlert(
            hi ? 'अस्वीकृत' : 'Application Rejected',
            hi ? 'आपका आवेदन अस्वीकृत कर दिया गया है। अधिक जानकारी के लिए एडमिन से संपर्क करें।' : 'Your application was rejected. Please contact administration.'
          );
        } else {
          showAlert(
            hi ? 'समीक्षा जारी है' : 'Under Review',
            hi ? 'आपका आवेदन अभी भी एडमिन समीक्षा में है। कृपया कुछ देर बाद पुनः जांचें।' : 'Your application is still under review. Please check back later.'
          );
        }
      } else {
        showAlert(hi ? 'सूचना' : 'Notice', data.error || (hi ? 'स्टेटस जांचने में असमर्थ' : 'Unable to check status'));
      }
    } catch (error: any) {
      showAlert(hi ? 'त्रुटि' : 'Error', hi ? 'इंटरनेट जांचें और पुनः प्रयास करें' : 'Check connection and try again');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Animated Status Icon Header */}
        <View style={styles.iconCircle}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.iconGrad}
          >
            <Ionicons name="time" size={48} color="#D97706" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>
          {hi ? 'आवेदन समीक्षाधीन है' : 'Application Under Review'}
        </Text>
        <Text style={styles.subtitle}>
          {hi
            ? 'आपका मिल्क पार्टनर पंजीकरण एडमिन को प्राप्त हो चुका है। सत्यापन और रूट असाइनमेंट के बाद आपका डैशबोर्ड अनलॉक हो जाएगा।'
            : 'Your Milk Partner registration has been received. Your dashboard will unlock once approved and assigned a delivery route.'}
        </Text>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
            <Text style={styles.cardTitle}>
              {hi ? 'पंजीकृत विवरण' : 'Registered Information'}
            </Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                {hi ? 'लंबित' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{hi ? 'नाम:' : 'Name:'}</Text>
            <Text style={styles.rowVal}>{partner?.name || '-'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{hi ? 'मोबाइल:' : 'Phone:'}</Text>
            <Text style={styles.rowVal}>{partner?.phone || '-'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{hi ? 'रूट / क्षेत्र:' : 'Route:'}</Text>
            <Text style={styles.rowVal}>{partner?.assignedRoute || (hi ? 'एडमिन द्वारा तय होगा' : 'To be assigned')}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{hi ? 'वाहन प्रकार:' : 'Vehicle:'}</Text>
            <Text style={styles.rowVal}>{partner?.vehicleType || 'Motorcycle'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{hi ? 'कैन क्षमता:' : 'Capacity:'}</Text>
            <Text style={styles.rowVal}>{partner?.canisterCapacityLiters || 40} {hi ? 'लीटर' : 'Liters'}</Text>
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>{hi ? 'जांच किट:' : 'Testing Kit:'}</Text>
            <Text style={[styles.rowVal, { color: partner?.hasTestingKit ? '#059669' : '#64748B' }]}>
              {partner?.hasTestingKit ? (hi ? 'उपलब्ध है ✓' : 'Equipped ✓') : (hi ? 'नहीं है' : 'None')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleCheckStatus}
          disabled={checking}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>
                  {hi ? 'स्टेटस जांचें (Refresh)' : 'Check Approval Status'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#64748B" />
          <Text style={styles.logoutText}>
            {hi ? 'लॉगआउट करें / अन्य खाता' : 'Logout / Switch Account'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  iconGrad: {
    flex: 1,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  rowVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  refreshBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 12,
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  logoutText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
