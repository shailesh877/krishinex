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
    Alert,
    SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// Use same API base as other files
import { authApi, BASE_URL } from '../services/api';
import { showAlert } from '@/components/CustomAlert';
// Fallback if authApi doesn't have a direct notification method or for explicit fetch
const API_URL = `${BASE_URL}/notifications`;

type NotifType = 'order' | 'assigned' | 'status' | 'system' | 'payment' | 'soil_test';

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

const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';

function typeIcon(type: NotifType) {
    switch (type) {
        case 'order': return { name: 'cart-outline', color: '#16A34A', bg: '#ECFDF5' };
        case 'assigned': return { name: 'clipboard-outline', color: '#2563EB', bg: '#EFF6FF' };
        case 'soil_test': return { name: 'flask-outline', color: '#7C3AED', bg: '#F5F3FF' };
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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
    const router = useRouter();
    const { language, t } = useI18n();
    const isHindi = language === 'hi';

    const [items, setItems] = useState<NotifItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const labels = {
        title: isHindi ? 'सूचनाएं' : 'Notifications',
        sub: isHindi ? 'आपके खाते से जुड़ी सभी अपडेट' : 'All updates for your account',
        markAll: isHindi ? 'सभी पढ़ें' : 'Mark all read',
        empty: isHindi ? 'कोई सूचना नहीं' : 'No notifications yet',
        emptySub: isHindi ? 'नया ऑर्डर या स्टेटस अपडेट यहाँ दिखेगा' : 'New orders and status updates will appear here',
    };

    const getToken = () => AsyncStorage.getItem('userToken');

    const fetchNotifications = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (e) {
            console.error('Fetch notifications error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
    const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

    const markRead = async (id: string) => {
        const item = items.find(n => n._id === id);
        if (!item || !item.unread) return;

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
            isHindi ? 'क्या यह सूचना हटानी है?' : 'Remove this notification?',
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

    const handleNotificationPress = async (item: NotifItem) => {
        // 1. Mark as read in UI and backend (if unread)
        if (item.unread) {
            markRead(item._id);
        }

        // 2. Navigate based on type
        const { type, refId } = item;
        
        switch (type) {
            case 'status':
            case 'order':
                if (refId) {
                    router.push({ pathname: '/track-order', params: { id: refId } });
                }
                break;
            case 'assigned':
                router.push('/my-bookings');
                break;
            case 'soil_test':
                router.push('/soil-reports');
                break;
            case 'payment':
                router.push('/wallet');
                break;
            default:
                // For 'system' or others, we just stay here or maybe go to home?
                // For now, just mark read is enough.
                break;
        }
    };

    const unreadCount = items.filter(n => n.unread).length;

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
                    <View style={styles.cardFooter}>
                        <Text style={styles.cardTime}>{timeStr}</Text>
                        {item.unread && <Text style={styles.unreadTag}>{isHindi ? 'नया' : 'NEW'}</Text>}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

            <LinearGradient colors={[GREEN, GREEN_DARK]} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.title}>{labels.title}</Text>
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>{labels.sub}</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                        <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </LinearGradient>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={GREEN_DARK} />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.centerBox}>
                    <View style={styles.emptyCircle}>
                        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>{labels.empty}</Text>
                    <Text style={styles.emptySub}>{labels.emptySub}</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listPad}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_DARK]} />
                    }
                    renderItem={renderItem}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
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
        color: '#F0FDF4',
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
        borderWidth: 1,
        borderColor: '#FFFFFF',
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
        backgroundColor: '#F7FEE7',
        borderLeftWidth: 4,
        borderLeftColor: GREEN,
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
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    unreadTag: {
        fontSize: 10,
        fontWeight: '700',
        color: GREEN_DARK,
        backgroundColor: '#ECFCCB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    }
});
