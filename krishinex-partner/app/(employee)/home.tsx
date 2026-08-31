// app/(employee)/home.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_URL, BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}`;

const STATUS_GREEN = '#6bb313ff';

type EmployeeModule = 'labour' | 'equipment' | 'soil' | 'doctor';

type EmployeeAccessConfig = {
  modules: EmployeeModule[];
};

const DUMMY_ACCESS: EmployeeAccessConfig = {
  modules: ['labour', 'equipment', 'soil', 'doctor'],
};

export default function EmployeeHome() {
  const router = useRouter();
  const { lang, toggleLang } = useI18n();
  const insets = useSafeAreaInsets();
  const isHindi = lang === 'hi';

  const [employeeName, setEmployeeName] = React.useState('Loading...');
  const [villageText, setVillageText] = React.useState('Loading...');
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  const [overviewStats, setOverviewStats] = React.useState({
    totalAssigned: 0,
    totalPending: 0,
    totalCompleted: 0,
  });

  const [todayStats, setTodayStats] = React.useState({
    todayNew: 0,
    todayPending: 0,
    todayCompleted: 0,
  });
  const [unreadCount, setUnreadCount] = React.useState(0);

  const [modules, setModules] = React.useState<EmployeeModule[]>(['labour', 'equipment', 'soil', 'doctor']);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfileAndDashboard(),
        fetchUnreadCount(),
      ]);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileAndDashboard();
      fetchUnreadCount();
    }, [])
  );

  const loadProfileAndDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Local fast load for Name/Avatar
      const cached = await AsyncStorage.getItem('userData');
      if (cached) {
        const user = JSON.parse(cached);
        setEmployeeName(user.name || 'Employee');
        setVillageText(user.address || 'Unknown Region');
        if (user.profilePhotoUrl) {
          const pfp = user.profilePhotoUrl.startsWith('http')
            ? user.profilePhotoUrl
            : `${BASE_URL}/${user.profilePhotoUrl.replace(/\\/g, '/')}`;
          setAvatarUri(pfp);
        }
        if (user.role) setUserRole(user.role);
      }

      // 1. Fetch live Profile
      const profRes = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setEmployeeName(profData.name || 'Employee');
        setVillageText(profData.address || 'Unknown Region');
        if (profData.profilePhotoUrl) {
          const pfp = profData.profilePhotoUrl.startsWith('http')
            ? profData.profilePhotoUrl
            : `${BASE_URL}/${profData.profilePhotoUrl.replace(/\\/g, '/')}`;
          setAvatarUri(pfp);
        }
        if (profData.role) setUserRole(profData.role);
        await AsyncStorage.setItem('userData', JSON.stringify(profData));
      }

      // 2. Fetch live Dashboard numbers
      const dashRes = await fetch(`${API_URL}/employee/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.overviewStats) setOverviewStats(dashData.overviewStats);
        if (dashData.todayStats) setTodayStats(dashData.todayStats);
        if (dashData.access && dashData.access.modules) setModules(dashData.access.modules);
      }

    } catch (e) {
      console.error('Err fetching employee dashboard:', e);
    }
  };
  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) { }
  };

  const avatarSource = avatarUri ? { uri: avatarUri } : require('../../assets/images/logo.png');
  const access = { modules };

  const goAllTasks = () => router.push('/(employee)/tasks');
  const goLabourTasks = () => router.push('/(employee)/labour-assign');
  const goEquipmentTasks = () => router.push('/(employee)/machine-assign');
  const goSoilTasks = () => router.push('/(employee)/soil-assign');
  const goDoctorTasks = () => router.push('/(employee)/doctor-assign');
  const goProfile = () => router.push('/(employee)/profile');
  const openNotifications = () => router.push('/(employee)/notifications');

  return (
    <View style={styles.root}>
      {/* GREEN STATUS BAR */}
      <StatusBar
        barStyle="light-content"
        backgroundColor={STATUS_GREEN}
      />

      {/* iOS ke liye top strip */}
      {Platform.OS === 'ios' && <View style={styles.statusBg} />}

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* LEFT – PROFILE */}
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.9}
          onPress={goProfile}
        >
          <Image source={avatarSource} style={styles.avatarImg} />
        </TouchableOpacity>

        {/* RIGHT – LANG + BELL */}
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
            <Text style={styles.langPillText}>
              {isHindi ? 'English' : 'हिन्दी'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            activeOpacity={0.8}
            onPress={openNotifications}
          >
            <Ionicons name="notifications-outline" size={18} color="#111827" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[STATUS_GREEN]} tintColor={STATUS_GREEN} />}
      >
        {/* NAME + LOCATION */}
        <View style={styles.nameBlock}>

          <Text style={styles.nameText}>{employeeName}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.villageText}>{villageText}</Text>
          </View>
        </View>

        {/* OVERVIEW – TOTAL WORK */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'कुल work overview' : 'Total work overview'}
        </Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.overviewTitle}>
                {isHindi ? 'कुल assign हुआ काम' : 'All assigned work'}
              </Text>
              <Text style={styles.overviewSub}>
                {isHindi
                  ? 'Admin ने अब तक जितने काम आपको assign किए हैं'
                  : 'All jobs admin has assigned to you so far'}
              </Text>
            </View>
            <View style={styles.overviewIconWrap}>
              <Ionicons name="stats-chart-outline" size={22} color="#1D4ED8" />
            </View>
          </View>

          <View style={styles.overviewMainRow}>
            <View>
              <Text style={styles.overviewBigNumber}>
                {overviewStats.totalAssigned}
              </Text>
              <Text style={styles.overviewBigLabel}>
                {isHindi ? 'Total assigned' : 'Total assigned'}
              </Text>
            </View>
            <View style={styles.overviewRightCol}>
              <View style={styles.overviewSmallRow}>
                <View
                  style={[styles.dot, { backgroundColor: '#F97316' }]}
                />
                <Text style={styles.overviewSmallLabel}>
                  {isHindi ? 'Total pending' : 'Total pending'}
                </Text>
                <Text style={styles.overviewSmallValue}>
                  {overviewStats.totalPending}
                </Text>
              </View>
              <View style={styles.overviewSmallRow}>
                <View
                  style={[styles.dot, { backgroundColor: '#22C55E' }]}
                />
                <Text style={styles.overviewSmallLabel}>
                  {isHindi ? 'Total completed' : 'Total completed'}
                </Text>
                <Text style={styles.overviewSmallValue}>
                  {overviewStats.totalCompleted}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.overviewFooter}
            activeOpacity={0.85}
            onPress={goAllTasks}
          >
            <Ionicons name="list-outline" size={14} color="#2563EB" />
            <Text style={styles.overviewFooterText}>
              {isHindi
                ? 'सभी काम की पूरी list देखें'
                : 'View full list of all jobs'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* TODAY SUMMARY */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'आज का work status' : 'Today’s work status'}
        </Text>
        <View style={styles.todayCard}>
          <View style={styles.todayHeaderRow}>
            <View style={styles.todayIconWrap}>
              <Ionicons name="today-outline" size={18} color="#16A34A" />
            </View>
            <Text style={styles.todayTitle}>
              {isHindi ? 'आज का सारांश' : 'Today summary'}
            </Text>
          </View>
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>
              {isHindi ? 'आज नया assign हुआ' : 'New assigned today'}
            </Text>
            <Text style={styles.todayValue}>{todayStats.todayNew}</Text>
          </View>
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>
              {isHindi ? 'आज pending चल रहा' : 'Pending today'}
            </Text>
            <Text style={styles.todayValue}>{todayStats.todayPending}</Text>
          </View>
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>
              {isHindi ? 'आज पूरा किया' : 'Completed today'}
            </Text>
            <Text style={[styles.todayValue, { color: '#166534' }]}>
              {todayStats.todayCompleted}
            </Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          {isHindi ? 'Quick actions' : 'Quick actions'}
        </Text>

        <View style={styles.actionsRow}>
          {access.modules.includes('labour') && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#F97316' }]}
              activeOpacity={0.9}
              onPress={goLabourTasks}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="people-outline" size={18} color="#FFFBEB" />
              </View>
              <Text style={styles.actionTitle}>
                {isHindi ? 'Labour assign' : 'Labour assign'}
              </Text>
              <Text style={styles.actionSub}>
                {isHindi
                  ? 'मजदूर booking / verification संभालें'
                  : 'Handle labour bookings and verification'}
              </Text>
            </TouchableOpacity>
          )}

          {access.modules.includes('equipment') && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#16A34A' }]}
              activeOpacity={0.9}
              onPress={goEquipmentTasks}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name="construct-outline"
                  size={18}
                  color="#DCFCE7"
                />
              </View>
              <Text style={styles.actionTitle}>
                {isHindi ? 'Machine assign' : 'Machine assign'}
              </Text>
              <Text style={styles.actionSub}>
                {isHindi
                  ? 'Tractor / मशीन booking coordinate करें'
                  : 'Coordinate tractor & equipment jobs'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsRow}>
          {access.modules.includes('soil') && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#0EA5E9' }]}
              activeOpacity={0.9}
              onPress={goSoilTasks}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="flask-outline" size={18} color="#E0F2FE" />
              </View>
              <Text style={styles.actionTitle}>
                {isHindi ? 'Soil testing assign' : 'Soil testing assign'}
              </Text>
              <Text style={styles.actionSub}>
                {isHindi
                  ? 'Sample pickup aur lab रिपोर्ट follow करें'
                  : 'Manage soil sample pickup & lab follow-up'}
              </Text>
            </TouchableOpacity>
          )}

          {access.modules.includes('doctor') && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#F59E0B' }]}
              activeOpacity={0.9}
              onPress={goDoctorTasks}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="headset-outline" size={18} color="#FFFBEB" />
              </View>
              <Text style={styles.actionTitle}>
                {isHindi ? 'Doctor assign' : 'Doctor assign'}
              </Text>
              <Text style={styles.actionSub}>
                {isHindi
                  ? 'Doctor chat / कॉल scheduling देखिए'
                  : 'Handle doctor chat & call scheduling'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FIELD EXECUTIVE SPECIAL ACTIONS */}
        {userRole === 'field_executive' && (
          <>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'Field Executive - विशेष' : 'Field Executive - Special'}
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#6366F1' }]} // Indigo
                activeOpacity={0.9}
                onPress={() => router.push('/(employee)/recharge-farmer')}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="card-outline" size={18} color="#EEF2FF" />
                </View>
                <Text style={styles.actionTitle}>
                  {isHindi ? 'Farmer Wallet Recharge' : 'Farmer Wallet Recharge'}
                </Text>
                <Text style={styles.actionSub}>
                  {isHindi
                    ? 'Card number से किसान का wallet recharge करें'
                    : 'Recharge farmer wallet using card number'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#F43F5E' }]} // Rose
                activeOpacity={0.9}
                onPress={() => router.push('/(employee)/generate-lead')}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="megaphone-outline" size={18} color="#FFF1F2" />
                </View>
                <Text style={styles.actionTitle}>
                  {isHindi ? 'Lead Generate' : 'Lead Generate'}
                </Text>
                <Text style={styles.actionSub}>
                  {isHindi
                    ? 'नये किसान या दुकान की लीड दर्ज करें'
                    : 'Register new farmer or shop leads'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#8B5CF6' }]} // Violet
                activeOpacity={0.9}
                onPress={() => router.push('/(employee)/onboard')}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="person-add-outline" size={18} color="#F5F3FF" />
                </View>
                <Text style={styles.actionTitle}>
                  {isHindi ? 'पंजीयन (Onboarding)' : 'Onboarding / Registration'}
                </Text>
                <Text style={styles.actionSub}>
                  {isHindi
                    ? 'किसान या पार्टनर का पंजीकरण करें'
                    : 'Onboard new farmers or partners'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#0D9488' }]} // Teal
                activeOpacity={0.9}
                onPress={() => router.push('/(employee)/generate-card')}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="id-card-outline" size={18} color="#F0FDFA" />
                </View>
                <Text style={styles.actionTitle}>
                  {isHindi ? 'NexCard आवंटन' : 'NexCard Assignment'}
                </Text>
                <Text style={styles.actionSub}>
                  {isHindi
                    ? 'किसान को नया NexCard आवंटित करें'
                    : 'Assign a new NexCard to a user'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  statusBg: {
    height: 44,
    backgroundColor: STATUS_GREEN,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: STATUS_GREEN,
    justifyContent: 'space-between',
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 8,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 5,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F97316',
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  nameBlock: {
    marginBottom: 10,
  },

  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  villageText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 6,
  },

  overviewCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#00000015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  overviewSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: '90%',
  },
  overviewIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  overviewBigNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  overviewBigLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  overviewRightCol: {
    alignItems: 'flex-start',
  },
  overviewSmallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  overviewSmallLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginRight: 4,
  },
  overviewSmallValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  overviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  overviewFooterText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 4,
    flex: 1,
  },

  todayCard: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  todayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  todayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  todayLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  todayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 10,
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionSub: {
    fontSize: 11,
    color: '#F9FAFB',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
