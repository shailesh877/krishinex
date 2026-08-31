import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BASE_API_URL } from '../../constants/api';
const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

export default function EmployeeTasks() {
    const { lang } = useI18n();
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTasks = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const res = await fetch(`${API_URL}/employee/all-tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    const navigateToModule = (module: string, id?: string) => {
        switch (module) {
            case 'labour': router.push('/(employee)/labour-assign'); break;
            case 'equipment': router.push('/(employee)/machine-assign'); break;
            case 'soil': router.push('/(employee)/soil-assign'); break;
            case 'doctor': router.push('/(employee)/doctor-assign'); break;
            case 'doctor_ticket': router.push({ pathname: '/(employee)/doctor-ticket-detail', params: { id } }); break;
            case 'field': router.push({ pathname: '/(employee)/field-task-detail', params: { id } }); break;
        }
    };

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'labour': return 'people';
            case 'equipment': return 'construct';
            case 'soil': return 'leaf';
            case 'doctor': return 'medkit';
            case 'field': return 'list-circle';
            default: return 'briefcase';
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed' || s === 'read' || s === 'ok' || s === 'delivered') return '#16A34A';
        if (s === 'pending' || s === 'new message' || s === 'new' || s === 'accepted' || s === 'in-progress') return '#F97316';
        if (s === 'cancelled' || s === 'remove') return '#DC2626';
        return '#6B7280';
    };

    const renderTask = ({ item }: { item: any }) => {
        const date = new Date(item.date).toLocaleDateString();
        const time = new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isNew = item.status === 'new' || item.status === 'new message';

        return (
            <TouchableOpacity
                style={[styles.card, isNew && styles.newCard]}
                activeOpacity={0.8}
                onPress={() => navigateToModule(item.module, item._id)}
            >
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={getModuleIcon(item.module)}
                        size={24}
                        color={isNew ? STATUS_GREEN : '#666'}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{item.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                    <Text style={styles.time}>{date} {time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.arrowIcon} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{lang === 'hi' ? 'सभी कार्य (Jobs)' : 'All Jobs'}</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={STATUS_GREEN} />
                </View>
            ) : tasks.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="briefcase-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>
                        {lang === 'hi' ? 'कोई कार्य असाइन नहीं है' : 'No jobs assigned'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTask}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    listContainer: { padding: 15 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    newCard: {
        borderLeftWidth: 4,
        borderLeftColor: STATUS_GREEN,
    },
    iconContainer: {
        marginRight: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f9f9f9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    contentContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    title: { fontWeight: 'bold', fontSize: 16, color: '#333', flex: 1 },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8
    },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 4 },
    time: { fontSize: 12, color: '#aaa' },
    arrowIcon: { marginLeft: 10 },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#888'
    }
});
