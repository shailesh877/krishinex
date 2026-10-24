import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../services/api';
import { useI18n } from '@/context/I18nContext';

export default function MilkIndexScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [sellSub, setSellSub] = useState<any>(null);
  const [buySub, setBuySub] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    // Check cached subscription immediately to eliminate any delay
    AsyncStorage.getItem('cached_milk_sub').then((cached) => {
      if (cached) {
        try {
          const sub = JSON.parse(cached);
          const isPendingCancel = sub && sub.cancellationStatus === 'pending_approval';
          if (sub && (sub.status !== 'cancelled' || isPendingCancel)) {
            if (sub.type === 'sell') {
              router.replace('/milk/sell-history' as any);
              return;
            } else if (sub.type === 'buy') {
              router.replace('/milk/buy-history' as any);
              return;
            }
          }
        } catch {}
      }
    });

    fetchSubscriptions();

    let s: any = null;
    const { initSocket } = require('../../services/socket');
    initSocket().then((sock: any) => {
      s = sock;
      s?.on('milk_event', () => {
        fetchSubscriptions();
      });
    });

    return () => {
      s?.off('milk_event');
    };
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await authApi.getMyMilkSubscription();
      const sub = res.data?.subscription;

      if (res.data?.walletBalance !== undefined) {
        setWalletBalance(res.data.walletBalance);
      }

      // If user has active or pending cancellation: redirect directly to history screen!
      const isPendingCancel = sub && sub.cancellationStatus === 'pending_approval';
      if (sub && (sub.status !== 'cancelled' || isPendingCancel)) {
        await AsyncStorage.setItem('cached_milk_sub', JSON.stringify(sub));
        if (sub.type === 'sell') {
          router.replace('/milk/sell-history' as any);
          return;
        } else if (sub.type === 'buy') {
          router.replace('/milk/buy-history' as any);
          return;
        }
      } else {
        await AsyncStorage.removeItem('cached_milk_sub');
      }

      // If cancelled or rejected or no active sub: show clean selection screen like a fresh user
      const isLiveSub = sub && sub.status !== 'cancelled' && sub.status !== 'rejected';
      setSellSub(isLiveSub && sub.type === 'sell' ? sub : null);
      setBuySub(isLiveSub && sub.type === 'buy' ? sub : null);
    } catch (e) {
      console.error('Fetch subscriptions error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSellPress = () => {
    if (sellSub && (sellSub.status === 'approved' || sellSub.status === 'paused')) {
      router.push('/milk/sell-history');
    } else {
      router.push({ pathname: '/milk/register', params: { type: 'sell' } });
    }
  };

  const handleBuyPress = () => {
    if (buySub && (buySub.status === 'approved' || buySub.status === 'paused')) {
      router.push('/milk/buy-history');
    } else {
      router.push({ pathname: '/milk/register', params: { type: 'buy' } });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0284C7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{hi ? 'दूध सेवा' : 'Milk Services'}</Text>
          <Text style={styles.headerSubtitle}>
            {hi ? 'डेयरी संकलन एवं वितरण' : 'Dairy Collection & Distribution'}
          </Text>
        </View>
        <View style={styles.walletBadge}>
          <Ionicons name="wallet-outline" size={14} color="#0284C7" />
          <Text style={styles.walletBadgeText}>₹{walletBalance}</Text>
        </View>
      </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* BANNER */}
          <LinearGradient
            colors={['#0284C7', '#0369A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="water" size={32} color="#0284C7" />
            </View>
            <Text style={styles.heroTitle}>
              {hi ? 'कृषि नेक्स दूध सेवा' : 'KrishiNex Milk Services'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {hi
                ? 'गाँव के दूध उत्पादक किसानों से सीधा संकलन और घरों तक शुद्ध दूध आपूर्ति। सीधा सुरक्षित वॉलेट भुगतान।'
                : 'Direct collection from village dairy farmers and fresh delivery to households with direct wallet payouts.'}
            </Text>
          </LinearGradient>

          {/* OPTIONS SECTION */}
          <Text style={styles.sectionHeading}>
            {hi ? 'सेवा का चयन करें' : 'Select Service Option'}
          </Text>

          {/* OPTION 1: SELL MILK */}
          <TouchableOpacity
            style={styles.cardContainer}
            activeOpacity={0.9}
            onPress={handleSellPress}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="arrow-up-circle" size={28} color="#059669" />
                </View>
                {sellSub && (
                  <View style={[styles.statusTag, sellSub.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
                    <Text style={styles.statusTagText}>
                      {sellSub.status === 'approved' ? (hi ? 'सक्रिय' : 'Active') : (hi ? 'स्वीकृति लंबित' : 'Pending Approval')}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>{hi ? 'दूध बेचें (Sell Milk)' : 'Sell Milk'}</Text>
              <Text style={styles.cardDesc}>
                {hi
                  ? 'अपनी गाय-भैंस का दूध उचित भाव पर बेचें। सीधा अपने मुख्य वॉलेट में नियमित भुगतान पाएं।'
                  : 'Sell fresh milk at fair market rates. Enjoy regular earnings payouts directly into your main wallet.'}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.cardActionText}>
                  {sellSub && sellSub.status === 'approved'
                    ? (hi ? 'सप्लाई हिस्ट्री और वॉलेट ट्रांसफर देखें ➔' : 'View Supply History & Wallet ➔')
                    : (hi ? 'दूध बेचने हेतु पंजीकरण करें ➔' : 'Register to Sell Milk ➔')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* OPTION 2: BUY MILK */}
          <TouchableOpacity
            style={styles.cardContainer}
            activeOpacity={0.9}
            onPress={handleBuyPress}
          >
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="cart" size={26} color="#1D4ED8" />
                </View>
                {buySub && (
                  <View style={[styles.statusTag, buySub.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
                    <Text style={styles.statusTagText}>
                      {buySub.status === 'approved' ? (hi ? 'सक्रिय' : 'Active') : (hi ? 'स्वीकृति लंबित' : 'Pending Approval')}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>{hi ? 'दूध खरीदें (Buy Milk)' : 'Buy Milk'}</Text>
              <Text style={styles.cardDesc}>
                {hi
                  ? 'घर बैठे शुद्ध, ताज़ा दूध प्राप्त करें। रोज़ाना मुख्य वॉलेट से सुरक्षित व स्वचालित भुगतान।'
                  : 'Receive pure, fresh milk delivered daily to your doorstep. Seamless instant daily deductions from main wallet.'}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.cardActionText}>
                  {buySub && buySub.status === 'approved'
                    ? (hi ? 'खरीद हिस्ट्री और कैलेंडर देखें ➔' : 'View Purchase Calendar ➔')
                    : (hi ? 'दूध खरीदने हेतु पंजीकरण करें ➔' : 'Register to Buy Milk ➔')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* HOW IT WORKS CARD */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#0284C7" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>
                {hi ? 'दूध संकलन व वॉलेट भुगतान कैसे काम करता है?' : 'How does milk collection and payout work?'}
              </Text>
              <Text style={styles.infoText}>
                {hi
                  ? 'दूध संकलन का दैनिक हिसाब-किताब हिस्ट्री पेज पर संचित रहता है। चक्र पूर्ण होते ही "Request Withdrawal to Wallet" बटन सक्रिय हो जाएगा जिससे पूरी राशि तुरंत आपके मुख्य वॉलेट में जुड़ जाएगी।'
                  : 'Daily milk supply earnings accumulate in your dairy ledger. Once eligible, tap "Request Withdrawal to Wallet" on your history screen to instantly deposit all earnings into your main KrishiNex wallet.'}
              </Text>
            </View>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  walletBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#E0F2FE',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cardContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardGradient: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#F0FDF4',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 16,
    fontWeight: '500',
  },
});
