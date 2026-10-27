import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Animated,
  BackHandler,
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../context/I18nContext';
import { initSocket } from '../../services/socket';

export default function MilkPartnerTabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initSocket();
    return () => {
      // Keep socket open or disconnect on layout unmount
    };
  }, []);

  // Handle Android hardware back press when action menu is open
  useEffect(() => {
    if (actionModalVisible) {
      const onBackPress = () => {
        closeActionMenu();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }
  }, [actionModalVisible]);

  const homeLabel = hi ? 'होम' : 'Home';
  const historyLabel = hi ? 'इतिहास' : 'History';
  const walletLabel = hi ? 'वॉलेट' : 'Wallet';
  const profileLabel = hi ? 'प्रोफाइल' : 'Profile';

  const bottomPadding = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  const openActionMenu = () => {
    setActionModalVisible(true);
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 65,
      useNativeDriver: true,
    }).start();
  };

  const closeActionMenu = (callback?: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActionModalVisible(false);
      if (callback) callback();
    });
  };

  const handleSelectAction = (route: string) => {
    closeActionMenu(() => {
      router.push(route as any);
    });
  };

  // Interpolated animation values
  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardsTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const cardsScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <View style={styles.rootContainer}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: '#059669', // Emerald 600
          tabBarInactiveTintColor: '#64748B', // Slate 500
          tabBarStyle: {
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            elevation: 12,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2 },
        }}
      >
        {/* 1. HOME TAB */}
        <Tabs.Screen
          name="home"
          options={{
            title: homeLabel,
            tabBarLabel: homeLabel,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
        />

        {/* 2. HISTORY TAB */}
        <Tabs.Screen
          name="history"
          options={{
            title: historyLabel,
            tabBarLabel: historyLabel,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
            ),
          }}
        />

        {/* 3. CENTER ACTION BUTTON ("दूध सेवा" -> TOGGLES FLOATING POPUP) */}
        <Tabs.Screen
          name="quick-action"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (actionModalVisible) {
                closeActionMenu();
              } else {
                openActionMenu();
              }
            },
          }}
          options={{
            tabBarLabel: hi ? 'दूध सेवा' : 'Service',
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.centerFabWrap}
                onPress={() => {
                  if (actionModalVisible) {
                    closeActionMenu();
                  } else {
                    openActionMenu();
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.centerFabCircle}>
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerFabGradient}
                  >
                    <Ionicons
                      name={actionModalVisible ? "close" : "water"}
                      size={actionModalVisible ? 26 : 24}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.centerFabLabel}>
                  {hi ? 'दूध सेवा' : 'Service'}
                </Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* 4. WALLET TAB */}
        <Tabs.Screen
          name="wallet"
          options={{
            title: walletLabel,
            tabBarLabel: walletLabel,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
            ),
          }}
        />

        {/* 5. PROFILE TAB */}
        <Tabs.Screen
          name="profile"
          options={{
            title: profileLabel,
            tabBarLabel: profileLabel,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            ),
          }}
        />

        {/* HIDDEN SCREENS (NAVIGATED TO DIRECTLY) */}
        <Tabs.Screen
          name="purchase"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="approval-pending"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* FLOATING ACTION CARDS POPUP (ANCHORED DIRECTLY ABOVE THE TABBAR) */}
      {actionModalVisible && (
        <View
          style={[styles.popupOverlay, { bottom: tabHeight }]}
          pointerEvents="box-none"
        >
          {/* SOFT TRANSLUCENT BACKDROP (CLOSES ON TAP) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => closeActionMenu()}
            />
          </Animated.View>

          {/* TWO FLOATING CARDS (SIDE-BY-SIDE DIRECTLY ABOVE TABBAR) */}
          <Animated.View
            style={[
              styles.floatingCardsRow,
              {
                opacity: backdropOpacity,
                transform: [
                  { translateY: cardsTranslateY },
                  { scale: cardsScale },
                ],
              },
            ]}
            pointerEvents="box-none"
          >
            {/* CARD 1: MILK PURCHASE (FROM FARMERS) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleSelectAction('/(milk-partner)/purchase')}
              activeOpacity={0.88}
            >
              <View style={styles.actionCardIconBox}>
                <Ionicons name="water" size={34} color="#059669" />
              </View>
              <Text style={styles.actionCardTitle}>
                {hi ? 'दूध खरीद' : 'Milk\nPurchase'}
              </Text>
            </TouchableOpacity>

            {/* CARD 2: MILK SALES (DELIVERY TO SUBSCRIBERS) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleSelectAction('/(milk-partner)/sales')}
              activeOpacity={0.88}
            >
              <View style={styles.actionCardIconBox}>
                <Ionicons name="bicycle" size={34} color="#059669" />
              </View>
              <Text style={styles.actionCardTitle}>
                {hi ? 'दूध बिक्री' : 'Milk\nSales'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
  },

  // Center Floating Button in Tab Bar
  centerFabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -16,
  },
  centerFabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  centerFabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerFabLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },

  // Popup Overlay (Positioned exactly above the bottom tab bar)
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },

  // Floating Cards Row (Directly above the tab bar)
  floatingCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginBottom: 14,
  },

  // Individual White Rounded Action Card
  actionCard: {
    width: 122,
    height: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderColor: '#E2E8F0',
  },
  actionCardIconBox: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
});
