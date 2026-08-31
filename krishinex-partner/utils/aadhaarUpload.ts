// utils/aadhaarUpload.ts — Shared Aadhaar upload utility for all partner profiles

import * as DocumentPicker from 'expo-document-picker';
import { BASE_API_URL, BASE_URL } from '../constants/api';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${BASE_API_URL}/user`;

/**
 * Opens an existing Aadhaar doc URL, or prompts to upload if none exists.
 */
export async function openAadhaarMenu(
    aadhaarDocUrl: string | null,
    isHindi: boolean,
    onUploadSuccess: (url: string) => void
) {
    if (aadhaarDocUrl) {
        Alert.alert(
            isHindi ? 'आधार डॉक्यूमेंट' : 'Aadhaar Document',
            isHindi ? 'क्या करना है?' : 'What would you like to do?',
            [
                {
                    text: isHindi ? 'देखें' : 'View',
                    onPress: () => viewAadhaar(aadhaarDocUrl)
                },
                {
                    text: isHindi ? 'नया अपलोड करें' : 'Re-upload',
                    onPress: () => pickAndUpload(isHindi, onUploadSuccess)
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    } else {
        pickAndUpload(isHindi, onUploadSuccess);
    }
}

function viewAadhaar(url: string) {
    const formattedUrl = url.startsWith('http')
        ? url
        : `${BASE_URL}/${url.replace(/\\/g, '/')}`;

    Linking.openURL(formattedUrl).catch(() =>
        Alert.alert('Error', 'Cannot open document')
    );
}

async function pickAndUpload(
    isHindi: boolean,
    onSuccess: (url: string) => void
) {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            Alert.alert('Error', 'Not logged in');
            return;
        }

        const formData = new FormData();
        const fileExt = asset.name ? asset.name.split('.').pop() : 'pdf';
        const fileName = `aadhaar_${Date.now()}.${fileExt}`;

        formData.append('aadhaar', {
            uri: asset.uri,
            type: asset.mimeType || `application/${fileExt}`,
            name: fileName,
        } as any);

        const targetUrl = `${API_URL}/upload-aadhaar`;
        console.log(`[DEBUG] Attempting Aadhaar upload to: ${targetUrl}`);
        
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        const data = await res.json();

        if (res.ok) {
            onSuccess(data.url);
            Alert.alert(
                isHindi ? 'सफल!' : 'Success!',
                isHindi ? 'आधार डॉक्यूमेंट अपलोड हो गया' : 'Aadhaar document uploaded successfully'
            );
        } else {
            Alert.alert('Error', data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Aadhaar upload error:', error);
        Alert.alert('Error', 'Failed to upload document');
    }
}

