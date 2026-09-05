// app/(equipment)/add-machine.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BASE_API_URL, MACHINES_API_URL } from '../../constants/api';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useI18n } from '../../context/I18nContext'; // <== yahan se lang
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../components/CustomAlert';

export default function AddMachineScreen() {
  
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [machineName, setMachineName] = useState('');
  const [priceDay, setPriceDay] = useState('');
  const [priceHour, setPriceHour] = useState('');
  const [desc, setDesc] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [village, setVillage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [subMachinery, setSubMachinery] = useState<{ name: string; image: string; priceDay: string; priceKattha: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      checkProfileStatus();
    }, [])
  );

  const checkProfileStatus = async () => {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.status !== 'approved') {
        showAlert(
          isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
          isHindi
            ? 'आपकी प्रोफाइल अभी वेरिफाय नहीं हुई है। आप अभी आइटम नहीं जोड़ सकते।'
            : 'Your profile is not verified yet. You cannot add items.'
        );
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(equipment)/home');
        }
      }
    }
  };

  const API_URL = `${BASE_API_URL}/machines`;

  const logoTextSource = isHindi
    ? require('../../assets/images/Khetify_use_under_the_app-Hindi.png')
    : require('../../assets/images/Khetify_use_under_the_app-English.png');
  const logoIconSource = require('../../assets/images/logo.png');

  const askPermissionAndPick = async (fromCamera: boolean) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert(
        isHindi ? 'अनुमति ज़रूरी' : 'Permission needed',
        isHindi
          ? 'कैमरा/गैलरी use करने की अनुमति दें.'
          : 'Please allow camera/gallery access.'
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8 });

    if (!result.canceled && result.assets?.length) {
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImages(prev =>
          prev.length >= 3 ? prev : [...prev, manipulatedImage.uri]
        );
      } catch (error) {
        console.error("Image resize error:", error);
        setImages(prev =>
          prev.length >= 3 ? prev : [...prev, result.assets![0].uri]
        );
      }
    }
  };

  const handleAddImage = () => {
    if (images.length >= 3) return;
    showAlert(
      isHindi ? 'फोटो चुनें' : 'Select photo',
      '',
      [
        {
          text: isHindi ? 'कैमरा' : 'Camera',
          onPress: () => askPermissionAndPick(true) },
        {
          text: isHindi ? 'गैलरी' : 'Gallery',
          onPress: () => askPermissionAndPick(false) },
        { text: isHindi ? 'Cancel' : 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const pickSubMachineryImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(isHindi ? 'अनुमति ज़रूरी' : 'Permission needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7 });

    if (!result.canceled && result.assets?.[0]) {
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const newSub = [...subMachinery];
        newSub[index].image = manipulatedImage.uri;
        setSubMachinery(newSub);
      } catch (error) {
        console.error("Sub machinery image resize error:", error);
        const newSub = [...subMachinery];
        newSub[index].image = result.assets[0].uri;
        setSubMachinery(newSub);
      }
    }
  };

  const addSubMachineryRow = () => {
    if (subMachinery.length >= 5) {
      showAlert(isHindi ? 'सीमा समाप्त' : 'Limit reached', isHindi ? 'आप अधिकतम 5 अटैचमेंट जोड़ सकते हैं' : 'You can add max 5 attachments');
      return;
    }
    setSubMachinery([...subMachinery, { name: '', image: '', priceDay: '0', priceKattha: '0' }]);
  };

  const removeSubMachineryRow = (index: number) => {
    const newSub = [...subMachinery];
    newSub.splice(index, 1);
    setSubMachinery(newSub);
  };

  const updateSubMachineryName = (index: number, name: string) => {
    const newSub = [...subMachinery];
    newSub[index].name = name;
    setSubMachinery(newSub);
  };

  const updateSubMachineryPriceDay = (index: number, val: string) => {
    const newSub = [...subMachinery];
    newSub[index].priceDay = val;
    setSubMachinery(newSub);
  };

  const updateSubMachineryPriceKattha = (index: number, val: string) => {
    const newSub = [...subMachinery];
    newSub[index].priceKattha = val;
    setSubMachinery(newSub);
  };

  const handleSave = async () => {
    if (!machineName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया मशीन का नाम भरें.' : 'Please enter machine name.');
      return;
    }

    if (subMachinery.length === 0) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया कम से कम एक अटैचमेंट और उसका रेट जोड़ें.' : 'Please add at least one attachment and its rate.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      // Capture GPS coordinates
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (locErr) {
        console.log('Location capture failed (non-fatal):', locErr);
      }

      const formData = new FormData();
      const imageConfig: string[] = [];
      const machineFiles: any[] = [];
      const subFiles: any[] = [];

      // 1. Prepare image data
      images.forEach((uri, index) => {
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `main_machine_${Date.now()}_${index}.${fileExt}`;
        imageConfig.push('main');
        machineFiles.push({
          uri,
          name: fileName,
          type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`
        });
      });

      subMachinery.forEach((item, index) => {
        if (item.image) {
          const fileExt = item.image.split('.').pop() || 'jpg';
          const fileName = `sub_attachment_${Date.now()}_${index}.${fileExt}`;
          imageConfig.push('sub');
          subFiles.push({
            uri: item.image,
            name: fileName,
            type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`
          });
        }
      });

      const subMachineryNames = subMachinery.map(item => ({
        name: (item.name || '').trim(),
        hasImage: !!item.image,
        priceDay: String(item.priceDay || '0').trim(),
        priceKattha: String(item.priceKattha || '0').trim()
      }));

      // 2. Append all text/json FIRST
      formData.append('machineName', machineName.trim());
      formData.append('priceDay', '0');
      formData.append('priceHour', '0');
      formData.append('desc', desc.trim());
      formData.append('distanceKm', distanceKm || '0');
      formData.append('village', village.trim());
      if (lat !== null) formData.append('latitude', String(lat));
      if (lng !== null) formData.append('longitude', String(lng));
      formData.append('subMachinery', JSON.stringify(subMachineryNames));
      formData.append('imageConfig', JSON.stringify(imageConfig));

      // 3. Append files LAST
      machineFiles.forEach(f => formData.append('images', f));
      subFiles.forEach(f => formData.append('images', f));

      console.log('--- [DEBUG] Saving New Machine ---');
      console.log('SubMachinery Names:', JSON.stringify(subMachineryNames, null, 2));
      console.log('ImageConfig:', JSON.stringify(imageConfig));

      const res = await fetch(MACHINES_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add machine');

      showAlert(
        isHindi ? 'सफल' : 'Success',
        isHindi ? 'मशीन सफलतापूर्वक जुड़ गई!' : 'Machine added successfully!',
        [{ text: 'OK', onPress: () => {
          setMachineName('');
          setPriceDay('');
          setPriceHour('');
          setDesc('');
          setDistanceKm('');
          setVillage('');
          setImages([]);
          setSubMachinery([]);
          router.back();
        } }]
      );
    } catch (error: any) {
      console.error('Add machine error:', error);
      showAlert(isHindi ? 'त्रुटि' : 'Error', error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'उपकरण जोड़ें' : 'Add equipment'}
          </Text>
        </View>

        <View style={styles.rightPlaceHolder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appNameRow}>
          <Image source={logoIconSource} style={styles.appLogoIcon} />
          <Image source={logoTextSource} style={styles.logoTextImage} />
        </View>

        {/* Machine name */}
        <Text style={styles.label}>
          {isHindi ? 'मशीन का नाम' : 'Machine name'}
        </Text>
        <TextInput
          value={machineName}
          onChangeText={setMachineName}
          placeholder={isHindi ? 'जैसे: Tractor 50 HP' : 'e.g. Tractor 50 HP'}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        {/* Price per day / hour - Commented out as requested */}
        {/* 
        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>
              {isHindi ? 'किराया / दिन (₹)' : 'Price / day (₹)'}
            </Text>
            <TextInput
              value={priceDay}
              onChangeText={setPriceDay}
              keyboardType="numeric"
              placeholder="800"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>
              {isHindi ? 'किराया / घंटा (₹)' : 'Price / hour (₹)'}
            </Text>
            <TextInput
              value={priceHour}
              onChangeText={setPriceHour}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        </View>
        */}

        {/* Distance coverage */}
        <View style={styles.row2}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>
              {isHindi ? 'जाने की दूरी (किमी तक)' : 'Service radius (km)'}
            </Text>
            <TextInput
              value={distanceKm}
              onChangeText={setDistanceKm}
              keyboardType="numeric"
              placeholder={isHindi ? 'जैसे: 15' : 'e.g. 15'}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>
              {isHindi ? 'गांव' : 'Village'}
            </Text>
            <TextInput
              value={village}
              onChangeText={setVillage}
              placeholder={isHindi ? 'जैसे: करनाल' : 'e.g. Karnal'}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        </View>

        {/* Description */}
        <Text style={styles.label}>
          {isHindi ? 'मशीन का विवरण' : 'Description'}
        </Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder={
            isHindi
              ? 'छोटा सा विवरण लिखें (fields के लिए better info)'
              : 'Write a short description'
          }
          placeholderTextColor="#9CA3AF"
          multiline
          style={[styles.input, styles.textArea]}
        />

        {/* Images */}
        <Text style={styles.label}>
          {isHindi ? 'फोटो (अधिकतम 3)' : 'Photos (max 3)'}
        </Text>
        <View style={styles.imageRow}>
          {images.map(uri => (
            <Image
              key={uri}
              source={{ uri }}
              style={styles.imageThumb}
            />
          ))}
          {images.length < 3 && (
            <TouchableOpacity style={styles.imageAdd} onPress={handleAddImage}>
              <Ionicons name="camera-outline" size={22} color="#6B7280" />
              <Text style={styles.imageAddText}>
                {isHindi ? 'फोटो जोड़ें' : 'Add photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-Machinery Section */}
        <View style={styles.sectionDivider} />
        <View style={styles.subMachineryHeader}>
          <Text style={styles.labelBold}>
            {isHindi ? 'अटैचमेंट / सपोर्टिंग मशीनरी (अधिकतम 5)' : 'Attachments / Sub-Machinery (Max 5)'}
          </Text>
          <TouchableOpacity style={styles.addMoreBtn} onPress={addSubMachineryRow}>
            <Ionicons name="add-circle-outline" size={20} color="#22C55E" />
            <Text style={styles.addMoreText}>{isHindi ? 'और जोड़ें' : 'Add More'}</Text>
          </TouchableOpacity>
        </View>

        {subMachinery.map((item, index) => (
          <View key={index} style={styles.subItemCard}>
            <View style={styles.subItemRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={item.name}
                  onChangeText={(val) => updateSubMachineryName(index, val)}
                  placeholder={isHindi ? 'अटैचमेंट का नाम (जैसे: रोटावेटर)' : 'Attachment Name (e.g. Rotavator)'}
                  style={styles.subInput}
                />
              </View>
              <TouchableOpacity
                style={styles.subImagePicker}
                onPress={() => pickSubMachineryImage(index)}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.subImagePreview} />
                ) : (
                  <Ionicons name="image-outline" size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeSubMachineryRow(index)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Price Row for Sub-Machinery */}
            <View style={[styles.subItemRow, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSub}>{isHindi ? 'किराया / दिन (₹)' : 'Price / Day'}</Text>
                <TextInput
                  value={item.priceDay}
                  onChangeText={(val) => updateSubMachineryPriceDay(index, val)}
                  keyboardType="numeric"
                  placeholder="800"
                  style={styles.subInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSub}>{isHindi ? 'किराया / कट्टा (₹)' : 'Price / Kattha'}</Text>
                <TextInput
                  value={item.priceKattha}
                  onChangeText={(val) => updateSubMachineryPriceKattha(index, val)}
                  keyboardType="numeric"
                  placeholder="200"
                  style={styles.subInput}
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.sectionDivider} />

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          <Ionicons
            name="save-outline"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.saveText}>
            {loading ? (isHindi ? 'सेव हो रहा है...' : 'Saving...') : (isHindi ? 'मशीन सेव करें' : 'Save machine')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rightPlaceHolder: {
    width: 34,
    height: 34 },

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8 },
  appLogoIcon: { width: 28, height: 28, resizeMode: 'contain' },
  logoTextImage: { width: 140, height: 28, resizeMode: 'contain' },

  label: { fontSize: 13, color: '#374151', marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 13,
    color: '#111827' },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' },

  row2: { flexDirection: 'row', marginBottom: 4 },

  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16 },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E5E7EB' },
  imageAdd: {
    width: 90,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB' },
  imageAddText: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#22C55E' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  labelBold: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  subMachineryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMoreText: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  subItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB' },
  subItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13 },
  labelSub: {
    fontSize: 11,
    color: '#4B5563',
    marginBottom: 2,
    fontWeight: '500' },
  subImagePicker: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden' },
  subImagePreview: { width: '100%', height: '100%' },
  removeBtn: { padding: 4 } });
