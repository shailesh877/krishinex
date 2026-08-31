// app/shop-tabs/items-list.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert, ActivityIndicator } from 'react-native';

import { BASE_API_URL, BASE_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/shop`;
 // root url used for images too

type UnitType = 'BAG' | 'QUINTAL' | 'KG' | string;

type ItemRow = {
  id: string;
  name: string;
  category: 'seed' | 'fert' | 'pest' | 'tool';
  price: number;
  unit: UnitType;
  stockQty?: number;
  stockLabel: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  hasVariants?: boolean;
  variants?: { label: string; price: string; stockQty: string }[];
  hsnCode?: string;
  cgstPercent?: number;
  sgstPercent?: number;
};

const INITIAL_ITEMS: ItemRow[] = [];

export default function ItemsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [items, setItems] = useState<ItemRow[]>(INITIAL_ITEMS);
  const [editVisible, setEditVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null);
  const [showEditCustomUnit, setShowEditCustomUnit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [imageEdited, setImageEdited] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>('approved');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
         const user = JSON.parse(userData);
         setProfileStatus(user.status || 'approved');
      }

      const res = await fetch(`${API_URL}/items/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          id: item._id,
          name: item.name,
          category: item.category,
          price: item.price,
          unit: item.unit,
          stockQty: item.stockQty,
          stockLabel: item.stockQty > 0 ? `In stock • ${item.stockQty}` : 'Out of stock',
          description: item.description || '',
          imageUrl: item.imageUrl ? `${BASE_URL}/${item.imageUrl.replace(/\\/g, '/')}` : 'https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg',
          imageUrls: item.imageUrls ? item.imageUrls.map((u: string) => `${BASE_URL}/${u.replace(/\\/g, '/')}`) : [],
          hasVariants: item.hasVariants || false,
          variants: item.variants || [],
          hsnCode: item.hsnCode || '',
          cgstPercent: item.cgstPercent || 0,
          sgstPercent: item.sgstPercent || 0
        }));
        setItems(mapped);
      }
    } catch (e) {
      console.error('Fetch items error', e);
    } finally {
      setLoading(false);
    }
  };

  const renderCategory = (cat: ItemRow['category']) => {
    if (cat === 'seed') return isHindi ? 'बीज' : 'Seeds';
    if (cat === 'fert') return isHindi ? 'खाद' : 'Fertilizer';
    if (cat === 'pest') return isHindi ? 'कीटनाशक' : 'Pesticide';
    return isHindi ? 'उपकरण' : 'Tools';
  };

  const renderUnit = (unit: string) => {
    if (unit === 'BAG') return isHindi ? 'बोरी' : 'bag';
    if (unit === 'QUINTAL') return isHindi ? 'क्विंटल' : 'quintal';
    if (unit === 'KG') return isHindi ? 'किलो' : 'kg';
    return unit;
  };

  const openEdit = (item: ItemRow) => {
    if (profileStatus !== 'approved') {
       showAlert(
         isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
         isHindi ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप आइटम एडिट नहीं कर सकते।' : 'Profile not verified. You cannot edit items.'
       );
       return;
    }
    setEditingItem(item);
    setPreviewImages(item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : (item.imageUrl !== 'https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg' ? [item.imageUrl] : []));
    setImageEdited(false);
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditingItem(null);
    setPreviewImages([]);
    setImageEdited(false);
  };

  const handleDelete = (item: ItemRow) => {
    if (profileStatus !== 'approved') {
       showAlert(
         isHindi ? 'वेरिफिकेशन पेंडिंग' : 'Verification Pending',
         isHindi ? 'आपकी प्रोफाइल वेरिफाय नहीं है। आप आइटम डिलीट नहीं कर सकते।' : 'Profile not verified. You cannot delete items.'
       );
       return;
    }
    showAlert(
      isHindi ? 'कन्फर्म करें' : 'Confirm',
      isHindi ? 'क्या आप इस आइटम को डिलीट करना चाहते हैं?' : 'Are you sure you want to delete this item?',
      [
        { text: isHindi ? 'कैंसल' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'डिलीट' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await fetch(`${API_URL}/items/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchItems();
            } catch (e) {
              console.error('Error deleting item', e);
            }
          }
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('name', editingItem.name);
      formData.append('category', editingItem.category);
      if (!editingItem.hasVariants) {
        formData.append('price', String(editingItem.price));
        const qtyStr = (editingItem as any).stockQty;
        const finalStock = Number(String((editingItem as any).stockLabel).replace(/[^0-9]/g, '')) || qtyStr || 0;
        formData.append('stockQty', String(finalStock));
      }
      
      formData.append('unit', editingItem.unit);
      formData.append('hasVariants', String(editingItem.hasVariants || false));
      
      if (editingItem.hasVariants && editingItem.variants) {
        formData.append('variants', JSON.stringify(editingItem.variants));
      }

      if (editingItem.hsnCode) formData.append('hsnCode', editingItem.hsnCode);
      formData.append('cgstPercent', String(editingItem.cgstPercent || 0));
      formData.append('sgstPercent', String(editingItem.sgstPercent || 0));

      if (editingItem.description) formData.append('description', editingItem.description);

      formData.append('imageEdited', String(imageEdited));
      if (imageEdited) {
        const existingImages = previewImages
          .filter(u => u.startsWith('http'))
          .map(u => u.replace(`${BASE_URL}/`, ''));
        formData.append('existingImages', JSON.stringify(existingImages));

        const newImages = previewImages.filter(u => !u.startsWith('http'));
        newImages.forEach((uri, idx) => {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-edit-${idx}.${fileExt}`;
          formData.append('images', {
            uri,
            name: fileName,
            type: `image/${fileExt}`
          } as any);
        });
      }

      const res = await fetch(`${API_URL}/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchItems();
        closeEdit();
      } else {
        showAlert('Error', 'Failed to update item.');
      }
    } catch (e) {
      console.error('Save edit error', e);
    }
  };

  const handleEditField = (key: keyof ItemRow, value: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      [key]:
        key === 'price'
          ? Number(value || 0)
          : value,
    });
  };

  const handleEditUnit = (unit: string) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, unit: unit as any });
  };

  const handleEditCategory = (category: ItemRow['category']) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, category });
  };

  const addEditVariant = () => {
    if (!editingItem) return;
    const currentVariants = editingItem.variants || [];
    setEditingItem({
      ...editingItem,
      variants: [...currentVariants, { label: '', price: '', stockQty: '' }]
    });
  };

  const removeEditVariant = (idx: number) => {
    if (!editingItem || !editingItem.variants) return;
    setEditingItem({
      ...editingItem,
      variants: editingItem.variants.filter((_, i) => i !== idx)
    });
  };

  const updateEditVariant = (idx: number, field: string, value: string) => {
    if (!editingItem || !editingItem.variants) return;
    const updated = [...editingItem.variants];
    (updated[idx] as any)[field] = value;
    setEditingItem({ ...editingItem, variants: updated });
  };

  const handleChangeImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permResult.granted === false) {
      alert(isHindi ? 'गैलरी की अनुमति आवश्यक है' : 'Permission to access gallery is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const uri = pickerResult.assets[0].uri;
      setPreviewImages(prev => [...prev, uri].slice(0, 5));
      setImageEdited(true);
    }
  };

  const removePreviewImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setImageEdited(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const headerTitle = isHindi ? 'आइटम लिस्ट' : 'Items list';
  const headerSubtitle = isHindi
    ? 'दुकान में मौजूद सभी आइटम यहां दिखेंगे'
    : 'All items currently available in your shop';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER with back + title */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerSub}>{headerSubtitle}</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.itemCountText}>
            {items.length} {isHindi ? 'आइटम' : 'Items'}
          </Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={isHindi ? 'आइटम का नाम खोजें...' : 'Search by item name...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16A34A"]} tintColor="#16A34A" />
        }
        renderItem={({ item }) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <View style={[styles.cardContainer, isExpanded && styles.cardContainerExpanded]}>
              <View style={styles.card}>
            {/* LEFT: image */}
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.productImage}
              />
            </View>

            {/* MIDDLE: name + cat + price + stock + desc */}
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.categoryPill}>
                  <Ionicons
                    name="leaf-outline"
                    size={12}
                    color="#047857"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.categoryText}>
                    {renderCategory(item.category)}
                  </Text>
                </View>

                <Text style={styles.idText}>{item.id}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>
                  {item.hasVariants ? (isHindi ? 'शुरुआती ₹' : 'Starts ₹') : '₹'} {item.hasVariants && item.variants && item.variants.length > 0 ? item.variants[0].price : item.price}
                  {!item.hasVariants && (
                    <Text style={styles.unitText}>
                      / {renderUnit(item.unit)}
                    </Text>
                  )}
                </Text>

                <Text style={styles.stockText}>{item.hasVariants ? (isHindi ? 'वेरिएंट उपलब्ध' : 'Variants available') : item.stockLabel}</Text>
              </View>

              {/* description */}
              <Text style={styles.descText} numberOfLines={2}>
                {item.description}
              </Text>
            </View>

            {/* RIGHT: edit + delete + expand */}
            <View style={styles.actionsCol}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => openEdit(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color="#2563EB"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { marginTop: 6 }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#B91C1C"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { marginTop: 10, backgroundColor: isExpanded ? '#F0FDF4' : '#F3F4F6' }]}
                onPress={() => toggleExpand(item.id)}
              >
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isExpanded ? "#16A34A" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* EXPANDED 360 VIEW SECTION */}
          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={styles.expandedDivider} />
              
              <Text style={styles.expandedTitle}>
                {isHindi ? 'प्रोडक्ट की पूरी जानकारी' : 'Full Product Details'}
              </Text>
              
              {/* Variants Breakdown */}
              {item.hasVariants && item.variants && item.variants.length > 0 ? (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsLabel}>
                    {isHindi ? 'वेरिएंट्स की लिस्ट:' : 'Available Variants:'}
                  </Text>
                  {item.variants.map((v, vIdx) => (
                    <View key={vIdx} style={styles.variantDetailRow}>
                      <View style={styles.variantPoint} />
                      <Text style={styles.variantDetailLabel}>{v.label}</Text>
                      <Text style={styles.variantDetailPrice}>₹{v.price}</Text>
                      <View style={styles.variantDetailStock}>
                        <Text style={styles.variantStockText}>
                          {isHindi ? `स्टॉक: ${v.stockQty}` : `Stock: ${v.stockQty}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsLabel}>
                    {isHindi ? 'कीमत और स्टॉक:' : 'Price and Stock:'}
                  </Text>
                  <View style={styles.variantDetailRow}>
                    <View style={styles.variantPoint} />
                    <Text style={styles.variantDetailLabel}>{renderUnit(item.unit)}</Text>
                    <Text style={styles.variantDetailPrice}>₹{item.price}</Text>
                    <View style={styles.variantDetailStock}>
                      <Text style={styles.variantStockText}>{item.stockLabel}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Full Description */}
              {item.description && (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsLabel}>
                    {isHindi ? 'डिस्क्रिप्शन:' : 'Description:'}
                  </Text>
                  <Text style={styles.fullDescText}>{item.description}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="cube-outline"
              size={26}
              color="#9CA3AF"
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई आइटम नहीं' : 'No items yet'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'Add new item से अपना पहला प्रोडक्ट जोड़ें.'
                : 'Use Add new item to create your first product.'}
            </Text>
          </View>
        }
      />

      {/* EDIT MODAL */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHindi ? 'आइटम एडिट करें' : 'Edit item'}
              </Text>
              <TouchableOpacity onPress={closeEdit}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <ScrollView
                style={{ maxHeight: '78%' }}
                contentContainerStyle={{ paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Image */}
                <Text style={styles.modalLabel}>
                  {isHindi ? 'फोटो (अधिकतम 5)' : 'Photos (Max 5)'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: 10 }}>
                  {previewImages.map((uri, idx) => (
                    <View key={idx} style={{ marginRight: 10, position: 'relative' }}>
                      <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                      <TouchableOpacity
                        style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 12 }}
                        onPress={() => removePreviewImage(idx)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {previewImages.length < 5 && (
                    <TouchableOpacity
                      style={{ width: 100, height: 100, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}
                      activeOpacity={0.8}
                      onPress={handleChangeImage}
                    >
                      <Ionicons name="add-outline" size={28} color="#9CA3AF" />
                      <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                        {isHindi ? 'फोटो जोड़ें' : 'Add photo'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Name */}
                <View style={styles.modalFieldBox}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'आइटम का नाम' : 'Item name'}
                  </Text>
                  <TextInput
                    value={editingItem.name}
                    onChangeText={t => handleEditField('name', t)}
                    style={styles.modalInput}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Category */}
                <View style={styles.modalFieldBox}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'कैटेगरी' : 'Category'}
                  </Text>
                  <View style={styles.categoryRow}>
                    {(['seed', 'fert', 'pest', 'tool'] as ItemRow['category'][]).map(
                      cat => {
                        const active = editingItem.category === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.categoryChip,
                              active && styles.categoryChipActive,
                            ]}
                            onPress={() => handleEditCategory(cat)}
                          >
                            <Text
                              style={[
                                styles.categoryTextChip,
                                active && styles.categoryTextChipActive,
                              ]}
                            >
                              {renderCategory(cat)}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>

                {/* VARIANTS SECTION */}
                <View style={styles.variantsHeader}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'वेरिएंट (जैसे 100ml, 1kg)' : 'Variants (e.g. 100ml, 1kg)'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      const newHas = !editingItem.hasVariants;
                      const currentVariants = editingItem.variants || [];
                      setEditingItem({
                        ...editingItem,
                        hasVariants: newHas,
                        variants: (newHas && currentVariants.length === 0) ? [{ label: '', price: '', stockQty: '' }] : currentVariants
                      });
                    }}
                    style={styles.variantToggle}
                  >
                    <Ionicons 
                      name={editingItem.hasVariants ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={editingItem.hasVariants ? "#16A34A" : "#6B7280"} 
                    />
                    <Text style={[styles.variantToggleText, editingItem.hasVariants && { color: '#16A34A' }]}>
                      {isHindi ? 'वेरिएंट जोड़ें' : 'Add variants'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {editingItem.hasVariants ? (
                  <View style={styles.variantsList}>
                    {(editingItem.variants || []).map((v, idx) => (
                      <View key={idx} style={styles.variantCard}>
                        <View style={styles.variantTop}>
                          <Text style={styles.variantTitle}>{isHindi ? `वेरिएंट ${idx + 1}` : `Variant ${idx + 1}`}</Text>
                          <TouchableOpacity onPress={() => removeEditVariant(idx)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.variantInputRow}>
                          <View style={[styles.variantInputWrap, { flex: 2 }]}>
                            <Text style={styles.variantLabel}>{isHindi ? 'नाम (उदा. 100ml)' : 'Label (e.g. 100ml)'}</Text>
                            <TextInput 
                              value={v.label}
                              onChangeText={(val) => updateEditVariant(idx, 'label', val)}
                              style={styles.variantInput}
                              placeholder="100ml"
                            />
                          </View>
                          <View style={[styles.variantInputWrap, { flex: 1.5 }]}>
                            <Text style={styles.variantLabel}>{isHindi ? 'कीमत' : 'Price'}</Text>
                            <TextInput 
                              value={String(v.price)}
                              onChangeText={(val) => updateEditVariant(idx, 'price', val)}
                              style={styles.variantInput}
                              keyboardType="numeric"
                              placeholder="₹"
                            />
                          </View>
                          <View style={[styles.variantInputWrap, { flex: 1 }]}>
                            <Text style={styles.variantLabel}>{isHindi ? 'स्टॉक' : 'Stock'}</Text>
                            <TextInput 
                              value={String(v.stockQty)}
                              onChangeText={(val) => updateEditVariant(idx, 'stockQty', val)}
                              style={styles.variantInput}
                              keyboardType="numeric"
                              placeholder="10"
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addVariantBtn} onPress={addEditVariant}>
                      <Ionicons name="add-circle-outline" size={20} color="#16A34A" />
                      <Text style={styles.addVariantText}>{isHindi ? 'एक और वेरिएंट जोड़ें' : 'Add another variant'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Price & unit */}
                    <View style={styles.modalFieldBox}>
                      <Text style={styles.modalLabel}>
                        {isHindi ? 'कीमत और यूनिट' : 'Price and unit'}
                      </Text>
                      <View style={styles.modalPriceRow}>
                        <View style={styles.modalPriceInputWrap}>
                          <Text style={styles.pricePrefix}>₹</Text>
                          <TextInput
                            value={String(editingItem.price)}
                            onChangeText={t => handleEditField('price', t)}
                            keyboardType="numeric"
                            style={styles.modalPriceInput}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>

                        <View style={styles.unitRow}>
                          {(['BAG', 'QUINTAL', 'KG'] as UnitType[]).map(u => {
                            const active = editingItem.unit === u && !showEditCustomUnit;
                            return (
                              <TouchableOpacity
                                key={u}
                                style={[
                                  styles.unitChip,
                                  active && styles.unitChipActive,
                                ]}
                                onPress={() => {
                                  handleEditUnit(u);
                                  setShowEditCustomUnit(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.unitTextChip,
                                    active && styles.unitTextChipActive,
                                  ]}
                                >
                                  {renderUnit(u)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          
                          {/* PLUS ICON FOR CUSTOM UNIT */}
                          <TouchableOpacity
                            style={[
                              styles.unitChip,
                              showEditCustomUnit && styles.unitChipActive,
                            ]}
                            onPress={() => {
                              setShowEditCustomUnit(true);
                              handleEditUnit('');
                            }}
                          >
                            <Ionicons 
                              name="add" 
                              size={18} 
                              color={showEditCustomUnit ? "#166534" : "#4B5563"} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {showEditCustomUnit && (
                        <View style={[styles.customUnitInputWrap, { marginBottom: 12 }]}>
                          <TextInput
                            value={editingItem.unit}
                            onChangeText={handleEditUnit}
                            placeholder={isHindi ? 'यूनिट का नाम (उदा: Packet)' : 'Unit name (e.g. Packet)'}
                            style={styles.customUnitInput}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      )}
                    </View>

                    {/* Stock label */}
                    <View style={styles.modalFieldBox}>
                      <Text style={styles.modalLabel}>
                        {isHindi ? 'स्टॉक' : 'Stock'}
                      </Text>
                      <TextInput
                        value={editingItem.stockLabel}
                        onChangeText={t => handleEditField('stockLabel', t)}
                        style={styles.modalInput}
                        placeholder={
                          isHindi ? 'जैसे: In stock • 12' : 'e.g. In stock • 12'
                        }
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </>
                )}

                {/* GST & HSN */}
                <View style={styles.modalFieldBox}>
                  <Text style={styles.modalLabel}>{isHindi ? 'HSN कोड' : 'HSN code'}</Text>
                  <TextInput 
                    value={editingItem.hsnCode}
                    onChangeText={t => handleEditField('hsnCode', t)}
                    style={styles.modalInput}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flexDirection: 'row', columnGap: 10 }}>
                  <View style={[styles.modalFieldBox, { flex: 1 }]}>
                    <Text style={styles.modalLabel}>CGST %</Text>
                    <TextInput 
                      value={String(editingItem.cgstPercent || 0)}
                      onChangeText={t => handleEditField('cgstPercent', t)}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.modalFieldBox, { flex: 1 }]}>
                    <Text style={styles.modalLabel}>SGST %</Text>
                    <TextInput 
                      value={String(editingItem.sgstPercent || 0)}
                      onChangeText={t => handleEditField('sgstPercent', t)}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Description */}
                <View style={styles.modalFieldBox}>
                  <Text style={styles.modalLabel}>
                    {isHindi ? 'डिस्क्रिप्शन' : 'Description'}
                  </Text>
                  <TextInput
                    value={editingItem.description}
                    onChangeText={t => handleEditField('description', t)}
                    style={[styles.modalInput, styles.modalTextArea]}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </ScrollView>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.85}
              onPress={handleSaveEdit}
            >
              <Ionicons
                name="save-outline"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveText}>
                {isHindi ? 'बदलाव सेव करें' : 'Save changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  headerRight: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  header: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCenter: { flex: 1, marginHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 24,
  },

  stockText: {
    fontSize: 11,
    color: '#6B7280',
  },

  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContainerExpanded: {
    borderColor: '#D1FAE5',
    backgroundColor: '#FBFEFB',
  },
  card: {
    flexDirection: 'row',
    padding: 12,
  },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  categoryText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  idText: {
    fontSize: 11,
    color: '#6B7280',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },

  descText: {
    marginTop: 4,
    fontSize: 11,
    color: '#4B5563',
  },

  actionsCol: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  modalImageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  modalImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  modalImageOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: '#111827B3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalImageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  modalFieldBox: {
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  categoryChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  categoryTextChip: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  categoryTextChipActive: {
    color: '#0369A1',
  },

  modalPriceRow: {
    marginTop: 4,
  },
  modalPriceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  pricePrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
  },
  modalPriceInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    backgroundColor: '#F9FAFB',
  },
  unitChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  unitTextChip: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  unitTextChipActive: {
    color: '#166534',
  },

  saveBtn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  variantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  variantToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  variantsList: {
    marginTop: 8,
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  variantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  variantInputRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  variantInputWrap: {
  },
  variantLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  variantInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#16A34A',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 4,
  },
  addVariantText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
    marginLeft: 6,
  },
  customUnitInputWrap: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  customUnitInput: {
    height: 36,
    fontSize: 12,
    color: '#111827',
  },

  expandedSection: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailsBox: {
    marginBottom: 10,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  variantPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  variantDetailLabel: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  variantDetailPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 8,
  },
  variantDetailStock: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  variantStockText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
  },
  fullDescText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 10,
  },
});
