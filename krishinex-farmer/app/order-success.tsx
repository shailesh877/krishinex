import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '@/context/I18nContext';

const SHADOW_COLOR = '#00000020';
const KHETIFY_GREEN_DARK = '#467804ff';

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const t = {
    title: hi ? 'ऑर्डर सफल रहा' : 'Order successful',
    sub: hi
      ? 'आपका ऑर्डर सफलतापूर्वक प्लेस हो गया है।'
      : 'Your order has been placed successfully.',
    track: hi ? 'ऑर्डर ट्रैक करें' : 'Track order',
    backToShop: hi ? 'खरीदारी जारी रखें' : 'Continue shopping',
  };

  const goToTrack = () => {
    router.replace('/shop-orders'); // yahi tumhara track/orders screen hai
  };

  const goToShop = () => {
    router.replace('/(tabs)/shop');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* premium top header (simple) */}
      <View style={styles.topShell}>
        <View style={styles.appbar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={goToShop}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.appbarMiddle}>
            <Text style={styles.appbarTitle} numberOfLines={1}>
              {t.title}
            </Text>
            <Text style={styles.appbarSubtitle} numberOfLines={1}>
              {hi ? 'धन्यवाद!' : 'Thank you!'}
            </Text>
          </View>

          <View style={styles.iconBtn}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#16A34A"
            />
          </View>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="checkmark-done"
            size={42}
            color="#22C55E"
          />
        </View>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.sub}>{t.sub}</Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.9}
            onPress={goToShop}
          >
            <Text style={styles.secondaryText}>{t.backToShop}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={goToTrack}
          >
            <Text style={styles.primaryText}>{t.track}</Text>
            <Ionicons
              name="navigate-outline"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 16,
  },

  topShell: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  appbarMiddle: {
    flex: 1,
    marginHorizontal: 8,
  },
  appbarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  appbarSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },

  btnRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: KHETIFY_GREEN_DARK,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
  },
});
