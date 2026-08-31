import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';

const STATUS_GREEN = '#6bb313ff';

export default function DoctorTicketDetail() {
    const { id } = useLocalSearchParams();
    const { lang } = useI18n();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchTicketDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_API_URL}/doctor/admin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setTicket(data);
            } else {
                showAlert('Error', data.error || 'Failed to fetch ticket details');
            }
        } catch (error) {
            console.error('Fetch ticket details error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketDetails();
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${BASE_API_URL}/doctor/admin/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('Success', `Status updated to ${newStatus}`);
                setTicket({ ...ticket, status: newStatus });
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

    if (!ticket) {
        return (
            <View style={styles.center}>
                <Text>Ticket not found</Text>
            </View>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return '#F97316';
            case 'Contacted': return '#3B82F6';
            case 'Resolved': return '#16A34A';
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
                <Text style={styles.headerTitle}>{lang === 'hi' ? 'परामर्श विवरण' : 'Consultation Details'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statusSection}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                            {ticket.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.ticketId}>#{ticket._id.slice(-6).toUpperCase()}</Text>
                </View>

                {ticket.imageUrl ? (
                    <View style={styles.imageCard}>
                        <Image source={{ uri: ticket.imageUrl }} style={styles.issueImage} resizeMode="cover" />
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{lang === 'hi' ? 'परामर्श की जानकारी' : 'Consultation Info'}</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'फसल:' : 'Crop:'}</Text>
                        <Text style={styles.value}>{ticket.cropName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'समस्या:' : 'Problem:'}</Text>
                        <Text style={styles.value}>{ticket.issue}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'किसान:' : 'Farmer:'}</Text>
                        <Text style={styles.value}>{ticket.name || ticket.farmer?.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'मोबाइल:' : 'Mobile:'}</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${ticket.phone || ticket.farmer?.phone}`)}>
                            <Text style={[styles.value, { color: '#3B82F6', textDecorationLine: 'underline' }]}>{ticket.phone || ticket.farmer?.phone}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{lang === 'hi' ? 'तारीख:' : 'Date:'}</Text>
                        <Text style={styles.value}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    {ticket.status === 'Pending' && (
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: '#3B82F6' }]} 
                            disabled={updating}
                            onPress={() => updateStatus('Contacted')}
                        >
                            <Text style={styles.buttonText}>{lang === 'hi' ? 'संपर्क किया (Contacted)' : 'Mark as Contacted'}</Text>
                        </TouchableOpacity>
                    )}

                    {(ticket.status === 'Pending' || ticket.status === 'Contacted') && (
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: '#16A34A', marginTop: 10 }]} 
                            disabled={updating}
                            onPress={() => updateStatus('Resolved')}
                        >
                            <Text style={styles.buttonText}>{lang === 'hi' ? 'सुलझ गया (Resolved)' : 'Mark as Resolved'}</Text>
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
    ticketId: { fontSize: 14, color: '#999', fontWeight: 'bold' },
    imageCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    issueImage: {
        width: '100%',
        height: 250,
    },
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
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { fontSize: 14, color: '#666', width: 80 },
    value: { fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 10 },
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
