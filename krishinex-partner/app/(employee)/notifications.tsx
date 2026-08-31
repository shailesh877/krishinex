import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}/notifications`;
const STATUS_GREEN = '#6bb313ff';

export default function EmployeeNotifications() {
  const insets = useSafeAreaInsets();
    const { lang } = useI18n();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const res = await fetch(`${API_URL}/read-all`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Update local state to reflect all are read
                setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const renderNotification = ({ item }: { item: any }) => {
        const date = new Date(item.createdAt).toLocaleDateString();
        const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={[styles.card, item.unread && styles.unreadCard]}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={item.type === 'system' ? 'information-circle' : 'notifications'}
                        size={24}
                        color={item.unread ? STATUS_GREEN : '#888'}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message}>
                        {lang === 'hi' ? (item.messageHi || item.messageEn) : (item.messageEn || item.messageHi)}
                    </Text>
                    <Text style={styles.time}>{date} {time}</Text>
                </View>
                {item.unread && <View style={styles.unreadDot} />}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{lang === 'hi' ? 'सूचनाएं' : 'Notifications'}</Text>
                {notifications.some(n => n.unread) && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
                        <Ionicons name="checkmark-done-outline" size={20} color={STATUS_GREEN} />
                        <Text style={styles.markReadText}>{lang === 'hi' ? 'सभी पढ़ें' : 'Mark All Read'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={STATUS_GREEN} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>
                        {lang === 'hi' ? 'कोई नई सूचना नहीं है' : 'No new notifications'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderNotification}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[STATUS_GREEN]} />}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    markReadBtn: { flexDirection: 'row', alignItems: 'center' },
    markReadText: { color: STATUS_GREEN, marginLeft: 5, fontWeight: '600' },
    listContainer: { padding: 15 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: '#f6ffed', // very light green
        borderColor: '#b7eb8f',
        borderWidth: 1,
    },
    iconContainer: {
        marginRight: 15,
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    title: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 4 },
    message: { fontSize: 14, color: '#666', marginBottom: 8 },
    time: { fontSize: 12, color: '#aaa' },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: STATUS_GREEN,
        alignSelf: 'center',
        marginLeft: 10
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#888'
    }
});
