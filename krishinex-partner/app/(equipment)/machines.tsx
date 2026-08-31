import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const CARD_H_MARGIN = 8;
const CARD_WIDTH = (width - 16 * 2 - CARD_H_MARGIN * 2) / 2;
const IMAGE_HEIGHT = 110;
import { BASE_API_URL, BASE_URL, MACHINES_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_BASE_URL = BASE_URL;

type Machine = {
  _id: string;
  id: string;
  name: string;
  village: string;
  distanceKm: number;
  priceDay: number;
  priceHour: number;
  desc: string;
  addedAt: string;
  images: string[];
  subMachinery?: { name: string; image: string; priceDay?: number; priceKattha?: number }[];
};

const INITIAL_MACHINES: Machine[] = [];

export default function MachinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [search, setSearch] = useState('');
  const [activeIndexById, setActiveIndexById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>('approved');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchMachines();
    setRefreshing(false);
  }, []);

  // Fetch machines on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMachines();
    }, [])
  );

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setProfileStatus(user.status || 'approved');
      }

      const res = await fetch(`${MACHINES_API_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map backend _id to id, and format image urls if needed
        const mapped = data.map((m: any) => {
          console.log('[DEBUG] RAW Machine from Server:', m.name, 'SubMachinery:', JSON.stringify(m.subMachinery));
          const imgs: string[] = (m.images || []).map((img: string) =>
            img.startsWith('http') ? img : `${BASE_URL}/${img.replace(/^\//, '')}`
          );
          // Format sub-machinery image URLs
          const sub = (m.subMachinery || []).map((s: any) => ({
            name: s.name || 'Attachment',
            image: s.image ? (s.image.startsWith('http') ? s.image : `${BASE_URL}/${s.image.replace(/^\//, '')}`) : '',
            priceDay: s.priceDay || 0,
            priceKattha: s.priceKattha || 0
          }));
          return {
            ...m,
            id: m._id,
            addedAt: m.createdAt,
            images: imgs,
            subMachinery: sub,
          };
        });
        setMachines(mapped);
      }
    } catch (error) {
      console.error('Fetch machines error', error);
    } finally {
      setLoading(false);
    }
  };

  // edit modal state
  const [editing, setEditing] = useState<Machine | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriceDay, setEditPriceDay] = useState('');
  const [editPriceHour, setEditPriceHour] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDistanceKm, setEditDistanceKm] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSubMachinery, setEditSubMachinery] = useState<{
    name: string;
    image: string;
    isNewImage?: boolean;
    priceDay: string;
    priceKattha: string
  }[]>([]);

  const openEdit = (m: Machine) => {
    if (profileStatus !== 'approved') {
      showAlert(
        isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
        isHindi ? 'आपकी प्रोफाइल अभी वेरिफाय नहीं हुई है। आप अभी आइटम एडिट नहीं कर सकते।' : 'Your profile is not verified yet. You cannot edit items.'
      );
      return;
    }
    console.log('[DEBUG] Opening Edit for Machine Card Data:', JSON.stringify(m, null, 2));
    console.log('[DEBUG] Opening Edit for Machine:', m.name, 'SubMachinery Count:', m.subMachinery?.length || 0);
    setEditing(m);
    setEditName(m.name);
    setEditPriceDay(String(m.priceDay));
    setEditPriceHour(String(m.priceHour));
    setEditDesc(m.desc);
    setEditDistanceKm(String(m.distanceKm));
    setEditVillage(m.village);
    setEditImages(m.images);
    // Initialize sub-machinery from item
    const formattedSub = (m.subMachinery || []).map(item => ({
      ...item,
      image: item.image ? (item.image.startsWith('http') ? item.image : `${BASE_URL}/${item.image.replace(/^\//, '')}`) : '',
      priceDay: String(item.priceDay ?? '0'),
      priceKattha: String(item.priceKattha ?? '0')
    }));
    setEditSubMachinery(formattedSub);
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('userToken');

      // Auto-capture GPS
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
      // 1. Core Fields FIRST
      const imageConfig: string[] = [];
      const mainFiles: any[] = [];
      const subFiles: any[] = [];
      const existingImagesList: string[] = [];

      // 1. Prepare data
      editImages.forEach((uri, index) => {
        if (uri.startsWith('http')) {
          existingImagesList.push(uri.replace(BASE_URL, '').replace(/^\//, ''));
        } else {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `main_edit_machine_${Date.now()}_${index}.${fileExt}`;
          imageConfig.push('main');
          mainFiles.push({
            uri,
            name: fileName,
            type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`
          });
        }
      });

      const subMachineryMeta = editSubMachinery.map(item => ({
        name: (item.name || '').trim(),
        image: item.isNewImage ? '' : item.image.replace(BASE_URL, '').replace(/^\//, ''),
        isNewImage: !!item.isNewImage,
        priceDay: String(item.priceDay || '0').trim(),
        priceKattha: String(item.priceKattha || '0').trim()
      }));

      editSubMachinery.forEach((item, index) => {
        if (item.isNewImage && item.image) {
          const fileExt = item.image.split('.').pop() || 'jpg';
          const fileName = `sub_edit_attachment_${Date.now()}_${index}.${fileExt}`;
          imageConfig.push('sub');
          subFiles.push({
            uri: item.image,
            name: fileName,
            type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`
          });
        }
      });

      // 2. Append all text/json FIRST
      formData.append('name', editName.trim());
      formData.append('priceDay', '0');
      formData.append('priceHour', '0');
      formData.append('desc', editDesc.trim());
      formData.append('distanceKm', editDistanceKm || '0');
      formData.append('village', editVillage.trim());
      if (lat !== null) formData.append('latitude', String(lat));
      if (lng !== null) formData.append('longitude', String(lng));

      existingImagesList.forEach(uri => formData.append('existingImages', uri));
      formData.append('subMachinery', JSON.stringify(subMachineryMeta));
      formData.append('imageConfig', JSON.stringify(imageConfig));

      // 3. Append files LAST
      mainFiles.forEach(f => formData.append('images', f));
      subFiles.forEach(f => formData.append('images', f));

      console.log('--- [DEBUG] PRE-FETCH INSPECTION ---');
      console.log('SubMachinery Meta Payload:', JSON.stringify(subMachineryMeta, null, 2));
      console.log('ImageConfig Payload:', JSON.stringify(imageConfig));
      console.log('Main Files Count:', mainFiles.length);
      console.log('Sub Files Count:', subFiles.length);
      subFiles.forEach((f, i) => console.log(`Sub File ${i} Name:`, f.name));

      const res = await fetch(`${MACHINES_API_URL}/${editing._id || editing.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const resultData = await res.json();
        console.log('[DEBUG] Save Edit Success. Returned Machine SubMachinery:', JSON.stringify(resultData.machine.subMachinery, null, 2));
        fetchMachines();
        closeEdit();
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'मशीन अपडेट हो गई' : 'Machine updated');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMachine = (id: string) => {
    if (profileStatus !== 'approved') {
      showAlert(
        isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
        isHindi ? 'आपकी प्रोफाइल अभी वेरिफाय नहीं हुई है। आप अभी आइटम डिलीट नहीं कर सकते।' : 'Your profile is not verified yet. You cannot delete items.'
      );
      return;
    }
    const backendId = machines.find(m => m.id === id)?._id || id;
    showAlert(
      isHindi ? 'पक्का हटाना है?' : 'Delete machine?',
      isHindi
        ? 'ये machine list से हट जाएगी.'
        : 'This machine will be removed from list.',
      [
        {
          text: isHindi ? 'Cancel' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isHindi ? 'Delete' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${MACHINES_API_URL}/${backendId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                setMachines(prev => prev.filter(m => m.id !== id));
              } else {
                throw new Error('Could not delete');
              }
            } catch (error) {
              console.error('Delete flow error', error);
              showAlert('Error', 'Failed to delete machine');
            }
          },
        },
      ],
    );
  };

  const addEditPhoto = async () => {
    if (editImages.length >= 3) return;

    showAlert(
      isHindi ? 'फोटो चुनें' : 'Select photo',
      '',
      [
        {
          text: isHindi ? 'कैमरा' : 'Camera',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== 'granted') return;
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
            if (!result.canceled && result.assets?.length) {
              try {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                  result.assets[0].uri,
                  [{ resize: { width: 500, height: 500 } }],
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                setEditImages(prev => [...prev, manipulatedImage.uri]);
              } catch (error) {
                console.error("Image resize error:", error);
                setEditImages(prev => [...prev, result.assets![0].uri]);
              }
            }
          },
        },
        {
          text: isHindi ? 'गैलरी' : 'Gallery',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
            if (!result.canceled && result.assets?.length) {
              try {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                  result.assets[0].uri,
                  [{ resize: { width: 500, height: 500 } }],
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                setEditImages(prev => [...prev, manipulatedImage.uri]);
              } catch (error) {
                console.error("Image resize error:", error);
                setEditImages(prev => [...prev, result.assets![0].uri]);
              }
            }
          },
        },
        { text: isHindi ? 'Cancel' : 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeEditPhoto = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  // --- Sub-Machinery Helpers for Edit ---
  const addEditSub = () => {
    if (editSubMachinery.length >= 5) {
      showAlert(isHindi ? 'सीमा' : 'Limit', isHindi ? 'अधिकतम 5 ही जोड़ सकते हैं' : 'Max 5 allowed');
      return;
    }
    setEditSubMachinery(prev => [...prev, { name: '', image: '', priceDay: '0', priceKattha: '0' }]);
  };

  const removeEditSub = (idx: number) => {
    setEditSubMachinery(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSubName = (idx: number, txt: string) => {
    const updated = [...editSubMachinery];
    updated[idx].name = txt;
    setEditSubMachinery(updated);
  };

  const updateSubPriceDay = (idx: number, val: string) => {
    const updated = [...editSubMachinery];
    updated[idx].priceDay = val;
    setEditSubMachinery(updated);
  };

  const updateSubPriceKattha = (idx: number, val: string) => {
    const updated = [...editSubMachinery];
    updated[idx].priceKattha = val;
    setEditSubMachinery(updated);
  };

  const pickSubImage = async (idx: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const updated = [...editSubMachinery];
        updated[idx].image = manipulatedImage.uri;
        updated[idx].isNewImage = true; // Mark as new image for backend
        setEditSubMachinery(updated);
      } catch (error) {
        console.error("Sub machinery image resize error:", error);
        const updated = [...editSubMachinery];
        updated[idx].image = result.assets[0].uri;
        updated[idx].isNewImage = true;
        setEditSubMachinery(updated);
      }
    }
  };

  const filtered = machines.filter(m => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.village.toLowerCase().includes(q)
    );
  });

  const onImageScroll = (machineId: string, event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_WIDTH - 16));
    setActiveIndexById(prev => ({ ...prev, [machineId]: idx }));
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return value;
    }
  };

  const renderMachine = ({ item }: { item: Machine }) => {
    const activeIdx = activeIndexById[item.id] ?? 0;

    return (
      <View style={styles.card}>
        {/* photos */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageCarousel}
          onScroll={e => onImageScroll(item.id, e)}
          scrollEventThrottle={16}
        >
          {(item.images.length > 0 ? item.images : ['placeholder']).map((uri, idx) => (
            <Image
              key={idx}
              source={uri === 'placeholder' ? require('../../assets/images/logo.png') : { uri }}
              style={styles.image}
              resizeMode={uri === 'placeholder' ? 'contain' : 'cover'}
            />
          ))}
        </ScrollView>

        {/* dots */}
        {item.images.length > 1 && (
          <View style={styles.dotsRow}>
            {item.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* info */}
        <Text style={styles.nameText} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.row}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color="#6B7280"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {isHindi ? 'जोड़ा गया:' : 'Added:'} {formatDate(item.addedAt)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons
            name="home-outline"
            size={12}
            color="#6B7280"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.village}
          </Text>
        </View>

        {item.subMachinery && item.subMachinery.length > 0 && (
          <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            <View style={[styles.row, { marginBottom: 4 }]}>
              <Ionicons name="link-outline" size={12} color="#2563EB" style={{ marginRight: 3 }} />
              <Text style={[styles.metaText, { color: '#2563EB', fontWeight: '600' }]}>
                {item.subMachinery.length} {isHindi ? 'अटैचमेंट / सब-मशीनरी' : 'Attachments'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {item.subMachinery.map((sub, idx) => (
                <View key={idx} style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, marginBottom: 4, width: '100%' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    {sub.image ? (
                      <Image source={{ uri: sub.image }} style={{ width: 16, height: 16, borderRadius: 4, marginRight: 4, backgroundColor: '#DBEAFE' }} />
                    ) : (
                      <Ionicons name="construct" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                    )}
                    <Text style={{ fontSize: 10, color: '#1E3A8A', fontWeight: '600' }}>{sub.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 9, color: '#16A34A', fontWeight: '500' }}>₹{sub.priceDay}/दिन</Text>
                    <Text style={{ fontSize: 9, color: '#2563EB', fontWeight: '500' }}>₹{sub.priceKattha}/कट्टा</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <Ionicons
            name="location-outline"
            size={12}
            color="#6B7280"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.metaText}>
            {isHindi ? 'दूरी:' : 'Distance:'} {item.distanceKm.toFixed(1)} km
          </Text>
        </View>

        {/* Price hidden from card as it's now attachment-specific */}
        {/*
        <View style={styles.row}>
          <Ionicons
            name="pricetag-outline"
            size={12}
            color="#16A34A"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.priceText}>
            ₹{item.priceDay}{' '}
            <Text style={styles.priceUnit}>
              {isHindi ? '/दिन' : '/day'}
            </Text>
            {'   '}
            ₹{item.priceHour}{' '}
            <Text style={styles.priceUnit}>
              {isHindi ? '/घंटा' : '/hour'}
            </Text>
          </Text>
        </View>
        */}

        <Text style={styles.descText} numberOfLines={3}>
          {item.desc}
        </Text>

        {/* actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#E0F2FE' }]}
            onPress={() => openEdit(item)}
          >
            <Ionicons
              name="create-outline"
              size={14}
              color="#0369A1"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.actionText, { color: '#0369A1' }]}>
              {isHindi ? 'Edit' : 'Edit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={() => deleteMachine(item.id)}
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color="#B91C1C"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.actionText, { color: '#B91C1C' }]}>
              {isHindi ? 'Delete' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.appHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'मशीन' : 'Machines'}
          </Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* search */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color="#9CA3AF"
          style={{ marginRight: 6 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            isHindi
              ? 'मशीन या गांव का नाम खोजें'
              : 'Search machine or village'
          }
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {/* grid */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderMachine}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#16A34A']}
            tintColor="#16A34A"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="construct-outline"
              size={28}
              color="#9CA3AF"
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.emptyText}>
              {isHindi
                ? 'अभी कोई मशीन add नहीं है'
                : 'No machines added yet'}
            </Text>
          </View>
        }
      />

      {/* Edit modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                {isHindi ? 'मशीन एडिट करें' : 'Edit machine'}
              </Text>
              <TouchableOpacity onPress={closeEdit} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* photos edit */}
              <Text style={styles.modalLabel}>
                {isHindi ? 'फोटो (अधिकतम 3)' : 'Photos (max 3)'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modalImageRow}
              >
                {editImages.map((uri, index) => (
                  <View key={uri} style={styles.modalImageWrap}>
                    <Image source={{ uri }} style={styles.modalImage} />
                    <TouchableOpacity
                      style={styles.modalImageDelete}
                      onPress={() => removeEditPhoto(index)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {editImages.length < 3 && (
                  <TouchableOpacity
                    style={styles.modalAddImage}
                    onPress={addEditPhoto}
                  >
                    <Ionicons name="camera-outline" size={20} color="#6B7280" />
                    <Text style={styles.modalAddImageText}>
                      {isHindi ? 'फोटो जोड़ें' : 'Add photo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              <Text style={styles.modalLabel}>
                {isHindi ? 'नाम' : 'Name'}
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>
                {isHindi ? 'गांव' : 'Village'}
              </Text>
              <TextInput
                value={editVillage}
                onChangeText={setEditVillage}
                style={styles.modalInput}
              />

              {/* Price row commented out in edit modal */}
              {/* 
              <View style={styles.modalRow2}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'किराया / दिन (₹)' : 'Price / day (₹)'}
                  </Text>
                  <TextInput
                    value={editPriceDay}
                    onChangeText={setEditPriceDay}
                    keyboardType="numeric"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'किराया / घंटा (₹)' : 'Price / hour (₹)'}
                  </Text>
                  <TextInput
                    value={editPriceHour}
                    onChangeText={setEditPriceHour}
                    keyboardType="numeric"
                    style={styles.modalInput}
                  />
                </View>
              </View>
              */}

              <Text style={styles.modalLabel}>
                {isHindi ? 'दूरी (किमी में)' : 'Distance (km)'}
              </Text>
              <TextInput
                value={editDistanceKm}
                onChangeText={setEditDistanceKm}
                keyboardType="numeric"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>
                {isHindi ? 'विवरण' : 'Description'}
              </Text>
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                style={[styles.modalInput, { height: 70 }]}
                multiline
              />

              {/* Sub-Machinery Section */}
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, paddingBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
                      {isHindi ? 'अटैचमेंट / सब-मशीनरी' : 'Attachments / Sub-Machinery'}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Debug: {editSubMachinery.length} found</Text>
                  </View>
                  <TouchableOpacity onPress={addEditSub} style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '600' }}>+ {isHindi ? 'नया' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>

                {editSubMachinery.map((item, idx) => (
                  <View key={idx} style={{ backgroundColor: '#F9FAFB', padding: 8, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => pickSubImage(idx)} style={{ width: 45, height: 45, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={{ width: 45, height: 45 }} />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="camera" size={16} color="#9CA3AF" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TextInput
                        placeholder={isHindi ? 'नाम (उदा. ट्रॉली)' : 'Name (e.g. Trolley)'}
                        value={item.name}
                        onChangeText={(t) => updateSubName(idx, t)}
                        style={{ flex: 1, height: 45, marginHorizontal: 8, fontSize: 13, color: '#1F2937' }}
                      />
                      <TouchableOpacity onPress={() => removeEditSub(idx)}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Price inputs for Edit Attachment */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>{isHindi ? 'किराया / दिन' : 'Price / Day'}</Text>
                        <TextInput
                          value={item.priceDay}
                          onChangeText={(v) => updateSubPriceDay(idx, v)}
                          keyboardType="numeric"
                          placeholder="800"
                          style={{ backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>{isHindi ? 'किराया / कट्टा' : 'Price / Kattha'}</Text>
                        <TextInput
                          value={item.priceKattha}
                          onChangeText={(v) => updateSubPriceKattha(idx, v)}
                          keyboardType="numeric"
                          placeholder="200"
                          style={{ backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                onPress={closeEdit}
              >
                <Text style={[styles.modalBtnText, { color: '#111827' }]}>
                  {isHindi ? 'Cancel' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#22C55E' }]}
                onPress={saveEdit}
                disabled={isSaving}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                  {isSaving ? (isHindi ? 'सेव हो रहा है...' : 'Saving...') : (isHindi ? 'Save' : 'Save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00000020',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerRight: { width: 34, height: 34 },

  searchWrap: {
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 8,
    shadowColor: '#00000010',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },

  imageCarousel: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 4,
  },
  image: {
    width: CARD_WIDTH - 16,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },
  dotActive: {
    backgroundColor: '#16A34A',
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { fontSize: 11, color: '#6B7280' },

  priceText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  priceUnit: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },

  descText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    marginHorizontal: 2,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '94%',
    maxHeight: '90%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },
  modalRow2: {
    flexDirection: 'row',
    marginTop: 2,
  },

  modalImageRow: {
    marginBottom: 4,
  },
  modalImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalImageDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddImage: {
    width: 80,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalAddImageText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
