import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView,
    TouchableOpacity,
    Platform,
    TextInput,
    Image,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../context/I18nContext';
import { useUser } from '../../context/UserContext';
import * as ImagePicker from 'expo-image-picker';

import { BASE_URL, FILES_BASE_URL, BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}`;
const STATUS_GREEN = '#6bb313ff';

export default function EmployeeEditProfileScreen() {
    const router = useRouter();
  
    const { lang } = useI18n();
    const isHindi = lang === 'hi';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form Fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    const { profile, refreshUser, updateUser } = useUser();

    // Sync profile data to local state
    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setAddress(profile.address || '');
            if (profile.avatarUri) {
                setAvatarUri(profile.avatarUri);
            } else {
                setAvatarUri(null);
            }
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            await refreshUser();
        } catch (e) {
            console.error('Fetch edit profile error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert(isHindi ? 'फ़ोटो चुनने के लिए अनुमति चाहिए।' : 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8 });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setAvatarUri(result.assets[0].uri);
            await uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri: string) => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const formData = new FormData();
            formData.append('photo', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: 'photo.jpg',
                type: 'image/jpeg' } as any);

            const res = await fetch(`${API_URL}/user/upload-photo`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}` },
                body: formData });

            if (!res.ok) throw new Error('Photo upload failed');
            
            const data = await res.json();
            if (data.url) {
                const pfp = data.url?.startsWith('http')
                    ? data.url
                    : `${FILES_BASE_URL}/${data.url?.replace(/\\/g, '/')}`;
                setAvatarUri(pfp);
                updateUser({ avatarUri: pfp });
            }
        } catch (e) {
            showAlert('Error', 'Failed to upload photo');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        // ── Required fields ──────────────────────────────────────────
        if (!name.trim()) {
            showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'नाम आवश्यक है।' : 'Name is required.');
            return;
        }
        if (!address.trim()) {
            showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'पता आवश्यक है।' : 'Address is required.');
            return;
        }
        // ── Optional fields — validate only when filled ───────────────
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'सही ईमेल पता डालें।' : 'Please enter a valid email address.');
            return;
        }
        if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
            showAlert(isHindi ? 'त्रुटि' : 'Validation Error', isHindi ? 'मोबाइल नंबर 10 अंकों का होना चाहिए।' : 'Phone number must be exactly 10 digits.');
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, email, phone, address }) });

            if (res.ok) {
                updateUser({ name, email, phone, address });
                showAlert(
                    isHindi ? 'सफल' : 'Success',
                    isHindi ? 'प्रोफ़ाइल अपडेट हो गई।' : 'Profile updated successfully.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                throw new Error('Update failed');
            }
        } catch (e) {
            showAlert('Error', 'Failed to update profile');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const t = {
        title: isHindi ? 'प्रोफ़ाइल बदलें' : 'Edit Profile',
        save: isHindi ? 'सुरक्षित करें' : 'Save',
        changePhoto: isHindi ? 'फ़ोटो बदलें' : 'Change Photo',
        name: isHindi ? 'पूरा नाम' : 'Full Name',
        email: isHindi ? 'ईमेल आईडी' : 'Email ID',
        phone: isHindi ? 'मोबाइल नंबर' : 'Phone Number',
        address: isHindi ? 'पता (गाँव/शहर)' : 'Address (Village/City)' };

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={STATUS_GREEN} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />
            {Platform.OS === 'ios' && <View style={styles.statusBg} />}

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.title}</Text>
                <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.headerSaveText}>{t.save}</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* AVATAR EDIT */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrap} activeOpacity={0.8}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                            <Image source={require('../../assets/images/logo.png')} style={styles.avatarImg} />
                        )}
                        <View style={styles.avatarCamera}>
                            <Ionicons name="camera" size={16} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText}>{t.changePhoto}</Text>
                </View>

                {/* INPUTS */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.name}</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder={isHindi ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.email}</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder={isHindi ? 'अपना ईमेल दर्ज करें' : 'Enter your email'}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.phone}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                        value={phone}
                        editable={false} // Phone should generally not be editable 
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t.address}</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                        value={address}
                        onChangeText={setAddress}
                        multiline
                        placeholder={isHindi ? 'गाँव, शहर, राज्य...' : 'Village, City, State...'}
                    />
                </View>

                {/* LARGE SAVE BUTTON */}
                <TouchableOpacity style={styles.saveActionBtn} onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveActionText}>{t.save}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F9FAFB' },
    statusBg: { height: 44, backgroundColor: STATUS_GREEN },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
            paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: STATUS_GREEN,
        justifyContent: 'space-between' },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#5BA40F',
        alignItems: 'center',
        justifyContent: 'center' },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF' },
    headerSaveBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#047857',
        borderRadius: 8 },
    headerSaveText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13 },
    body: { flex: 1, padding: 20 },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30 },
    avatarWrap: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative' },
    avatarImg: {
        width: 90,
        height: 90,
        borderRadius: 45 },
    avatarCamera: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        backgroundColor: '#16A34A',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F9FAFB' },
    changePhotoText: {
        marginTop: 10,
        fontSize: 14,
        color: '#16A34A',
        fontWeight: '600' },
    inputGroup: {
        marginBottom: 16 },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6 },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827' },
    saveActionBtn: {
        backgroundColor: '#16A34A',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20,
        elevation: 2,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8 },
    saveActionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold' } });
