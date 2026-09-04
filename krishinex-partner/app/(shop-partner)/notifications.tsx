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
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function ShopNotifications() {
    const router = useRouter();
  const insets = useSafeAreaInsets();
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
            emptySub: 'नया ऑर्डर या स्टेटस अपडेट आने पर यहाँ दिखेगा',
        },
        en: {
            title: 'Notifications',
            sub: 'All updates for your account',
            markAll: 'Mark all read',
            empty: 'No notifications yet',
            emptySub: 'New orders and status updates will appear here',
        },
    }[lang];

    const getToken = () => AsyncStorage.getItem('userToken');

    const fetchNotifications = useCallback(async (silent = false) => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            }
        } catch (e) {
            console.error('Fetch notifications error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
    useCallback(() => {
      fetchNotifications(false);
      const interval = setInterval(() => fetchNotifications(true), 5000);
      return () => clearInterval(interval);
    }, [fetchNotifications])
  );
    const onRefresh = () => { setRefreshing(true); fetchNotifications(false); };

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
        const { name, color, bg } = typeIcon(item.type);
        const msg = isHindi ? item.messageHi : item.messageEn;
        const timeStr = timeAgo(item.createdAt, isHindi);

        return (
            <TouchableOpacity
                style={[styles.card, item.unread && styles.unreadCard]}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => deleteNotif(item._id)}
            >
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <Ionicons name={name as any} size={24} color={color} />
                    {item.unread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.content}>
                    <Text style={[styles.cardTitle, item.unread && styles.unreadTitle]}>
                        {item.title}
                    </Text>
                    <Text style={styles.cardMsg} numberOfLines={2}>{msg}</Text>
                    <Text style={styles.cardTime}>{timeStr}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <LinearGradient colors={['#16A34A', '#15803D']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.title}>{t.title}</Text>
                        
                    </View>
                    <Text style={styles.subtitle}>{t.sub}</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                        <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </LinearGradient>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#16A34A" />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.centerBox}>
                    <View style={styles.emptyCircle}>
                        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>{t.empty}</Text>
                    <Text style={styles.emptySub}>{t.emptySub}</Text>
                </View>
            ) : (
                <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
                    data={items}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listPad}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
                    }
                    renderItem={renderItem}
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
                                <View style={[styles.iconBox, { backgroundColor: typeIcon(selectedNotif.type).bg, alignSelf: 'center', width: 60, height: 60, borderRadius: 30, marginRight: 0, marginBottom: 16 }]}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 20,

        paddingBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 8,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#E6F4EA',
        marginTop: 4,
    },
    badge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    markAllBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    listPad: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    unreadCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    unreadTitle: {
        color: '#111827',
        fontWeight: '700',
    },
    cardMsg: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 8,
    },
    cardTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
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
        shadowRadius: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalMsg: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalActions: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalBtnPrimary: {
        flex: 1,
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
