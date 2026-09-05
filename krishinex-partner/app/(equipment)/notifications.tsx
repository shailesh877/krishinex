import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/notifications`;

type NotifType = 'order' | 'assigned' | 'status' | 'system' | 'payment';

type NotifItem = {
    _id: string;
    title: string;
    messageHi: string;
    messageEn: string;
    type: NotifType;
    refId?: string;
    unread: boolean;
    createdAt: string;
};

function typeIcon(type: NotifType) {
    switch (type) {
        case 'order': return { name: 'cart-outline', color: '#16A34A', bg: '#ECFDF5' };
        case 'assigned': return { name: 'clipboard-outline', color: '#2563EB', bg: '#EFF6FF' };
        case 'status': return { name: 'checkmark-done-outline', color: '#7C3AED', bg: '#F5F3FF' };
        case 'payment': return { name: 'cash-outline', color: '#D97706', bg: '#FFFBEB' };
        default: return { name: 'information-circle-outline', color: '#F97316', bg: '#FFF7ED' };
    }
}

function timeAgo(dateStr: string, isHindi: boolean) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return isHindi ? 'अभी' : 'Just now';
    if (mins < 60) return isHindi ? `${mins} मिनट पहले` : `${mins}m ago`;
    if (hrs < 24) return isHindi ? `${hrs} घंटे पहले` : `${hrs}h ago`;
    return isHindi ? `${days} दिन पहले` : `${days}d ago`;
}

export default function EquipmentNotifications() {
    const router = useRouter();
  
    const { lang } = useI18n();
    const isHindi = lang === 'hi';

    const [items, setItems] = useState<NotifItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const t = {
        hi: {
            title: 'Notifications',
            sub: 'आपके खाते से जुड़ी सूचनाएं',
            markAll: 'सभी पढ़ें',
            empty: 'कोई notification नहीं है',
            emptySub: 'नया ऑर्डर या स्टेटस अपडेट आने पर यहाँ दिखेगा' },
        en: {
            title: 'Notifications',
            sub: 'All updates for your account',
            markAll: 'Mark all read',
            empty: 'No notifications yet',
            emptySub: 'New orders and status updates will appear here' } }[lang];

    const getToken = () => AsyncStorage.getItem('userToken');

    const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
        try {
            // if (length === 0) setLoading(true) removed for silent polling
            const token = await getToken();
            if (!token) return;
            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
                signal
            });
            if (res.ok) {
                const data = await res.json();
                setItems(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('Fetch notifications error:', e);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const abortController = new AbortController();
            fetchNotifications(abortController.signal);

            const interval = setInterval(() => {
                fetchNotifications();
            }, 5000);

            return () => {
                clearInterval(interval);
                abortController.abort();
            };
        }, [fetchNotifications])
    );
    const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

    const markRead = async (id: string) => {
        setItems(prev => prev.map(n => n._id === id ? { ...n, unread: false } : n));
        try {
            const token = await getToken();
            await fetch(`${API_URL}/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) { }
    };

    const markAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, unread: false })));
        try {
            const token = await getToken();
            await fetch(`${API_URL}/read-all`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) { }
    };

    const deleteNotif = async (id: string) => {
        showAlert(
            isHindi ? 'हटाएं?' : 'Delete?',
            isHindi ? 'क्या यह notification हटानी है?' : 'Remove this notification?',
            [
                { text: isHindi ? 'रद्द' : 'Cancel', style: 'cancel' },
                {
                    text: isHindi ? 'हटाएं' : 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setItems(prev => prev.filter(n => n._id !== id));
                        try {
                            const token = await getToken();
                            await fetch(`${API_URL}/${id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                            });
                        } catch (e) { }
                    }
                }
            ]
        );
    };

    const unreadCount = items.filter(n => n.unread).length;

    const [selectedNotif, setSelectedNotif] = useState<NotifItem | null>(null);

    const handleNotificationPress = (item: NotifItem) => {
        if (item.unread) markRead(item._id);
        setSelectedNotif(item);
    };

    const renderItem = ({ item }: { item: NotifItem }) => {
        const icon = typeIcon(item.type);
        const message = isHindi ? item.messageHi : item.messageEn;

        return (
            <TouchableOpacity
                style={[styles.card, item.unread && styles.cardUnread]}
                activeOpacity={0.88}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => deleteNotif(item._id)}
            >
                <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.name as any} size={18} color={icon.color} />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.titleText, item.unread && styles.titleBold]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.timeText}>{timeAgo(item.createdAt, isHindi)}</Text>
                    </View>
                    <Text style={styles.msgText} numberOfLines={3}>{message}</Text>
                </View>

                {item.unread && <View style={styles.dot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#111827" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.headerTitle}>{t.title}</Text>
                        
                    </View>
                    <Text style={styles.headerSub}>{t.sub}</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                        <Text style={styles.markAllText}>{t.markAll}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.headerBorder} />

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />}
                    contentContainerStyle={
                        items.length === 0
                            ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }
                            : { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 8 }
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>{t.empty}</Text>
                            <Text style={styles.emptySub}>{t.emptySub}</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* NOTIFICATION POPUP MODAL */}
            <Modal
                visible={!!selectedNotif}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedNotif(null)}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedNotif(null)}>
                    <View style={styles.modalContent}>
                        {selectedNotif && (
                            <>
                                <View style={[styles.iconWrap, { backgroundColor: typeIcon(selectedNotif.type).bg, alignSelf: 'center', width: 60, height: 60, borderRadius: 30, marginRight: 0, marginBottom: 16 }]}>
                                    <Ionicons name={typeIcon(selectedNotif.type).name as any} size={32} color={typeIcon(selectedNotif.type).color} />
                                </View>
                                <Text style={styles.modalTitle}>{selectedNotif.title}</Text>
                                <Text style={styles.modalMsg}>{isHindi ? (selectedNotif.messageHi || selectedNotif.messageEn) : selectedNotif.messageEn}</Text>
                                
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setSelectedNotif(null)}>
                                        <Text style={styles.modalBtnPrimaryText}>{isHindi ? 'ठीक है' : 'Okay'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F3F4F6' },

    header: {
        flexDirection: 'row', alignItems: 'center',
       paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
        backgroundColor: '#FFFFFF' },
    backBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
    badge: {
        backgroundColor: '#EF4444', borderRadius: 999,
        minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 5 },
    badgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
    markAllBtn: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 999, backgroundColor: '#ECFDF5' },
    markAllText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
    headerBorder: { height: 2, backgroundColor: '#87D528' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    card: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#FFFFFF', borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardUnread: {
        backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    iconWrap: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10, marginTop: 2 },
    titleRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    titleText: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 6 },
    titleBold: { fontWeight: '800' },
    timeText: { fontSize: 10, color: '#9CA3AF' },
    msgText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#16A34A', marginLeft: 6, marginTop: 4 },

    emptyWrap: { alignItems: 'center', gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24 },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12 },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8 },
    modalMsg: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24 },
    modalActions: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center' },
    modalBtnPrimary: {
        flex: 1,
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center' },
    modalBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600' } });
