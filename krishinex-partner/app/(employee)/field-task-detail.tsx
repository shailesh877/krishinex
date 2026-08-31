import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

const STATUS_GREEN = '#6bb313ff';

export default function FieldTaskDetail() {
    const { id } = useLocalSearchParams();
    const { lang } = useI18n();
    const router = useRouter();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchTaskDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_API_URL}/field/tasks/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setTask(data);
            } else {
                showAlert('Error', data.error || 'Failed to fetch task details');
            }
        } catch (error) {
            console.error('Fetch task details error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_API_URL}/field/tasks/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('Success', `Task marked as ${newStatus}`);
                setTask({ ...task, status: newStatus });
            } else {
                showAlert('Error', data.error || 'Failed to update status');
            }
        } catch (error) {
            showAlert('Error', 'Something went wrong');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={STATUS_GREEN} />
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.center}>
                <Text>Task not found</Text>
            </View>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return '#F97316';
            case 'Accepted': return '#3B82F6';
            case 'Completed': return '#16A34A';
            case 'Cancelled': return '#DC2626';
            default: return '#6B7280';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{lang === 'hi' ? 'कार्य विवरण' : 'Task Details'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statusSection}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                            {task.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.taskId}>{task.taskId}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{lang === 'hi' ? 'कार्य की जानकारी' : 'Task Information'}</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'कार्य प्रकार:' : 'Task Type:'}</Text>
                        <Text style={styles.value}>{task.taskType}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'पार्टनर का नाम:' : 'Partner Name:'}</Text>
                        <Text style={styles.value}>{task.partnerName}</Text>
                    </View>
                    {task.mobileNumber && (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>{lang === 'hi' ? 'मोबाइल नंबर:' : 'Mobile Number:'}</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${task.mobileNumber}`)}>
                                <Text style={[styles.value, { color: '#3B82F6', textDecorationLine: 'underline' }]}>{task.mobileNumber}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'स्थान:' : 'Location:'}</Text>
                        <Text style={styles.value}>{task.location}</Text>
                    </View>
                    {task.amount > 0 && (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>{lang === 'hi' ? 'राशि:' : 'Amount:'}</Text>
                            <Text style={[styles.value, { color: STATUS_GREEN, fontWeight: 'bold' }]}>₹{task.amount}</Text>
                        </View>
                    )}
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'नियत तारीख:' : 'Due Date:'}</Text>
                        <Text style={styles.value}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</Text>
                    </View>
                </View>

                {task.notes && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>{lang === 'hi' ? 'नोट्स:' : 'Notes:'}</Text>
                        <Text style={styles.notesText}>{task.notes}</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    {task.status === 'Pending' && (
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: '#3B82F6' }]} 
                            disabled={updating}
                            onPress={() => updateStatus('Accepted')}
                        >
                            <Text style={styles.buttonText}>{lang === 'hi' ? 'स्वीकार करें (Accept)' : 'Accept Task'}</Text>
                        </TouchableOpacity>
                    )}

                    {(task.status === 'Pending' || task.status === 'Accepted') && (
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: '#16A34A', marginTop: 10 }]} 
                            disabled={updating}
                            onPress={() => updateStatus('Completed')}
                        >
                            <Text style={styles.buttonText}>{lang === 'hi' ? 'पूरा हुआ (Complete)' : 'Mark as Completed'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    scrollContent: { padding: 20 },
    statusSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20
    },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    taskId: { fontSize: 14, color: '#999', fontWeight: 'bold' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { fontSize: 14, color: '#666' },
    value: { fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 10 },
    notesText: { fontSize: 14, color: '#444', lineHeight: 20 },
    actions: { marginTop: 10 },
    button: {
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
