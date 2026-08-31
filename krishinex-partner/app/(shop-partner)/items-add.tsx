// app/shop-tabs/items-add.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../context/I18nContext';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ActivityIndicator } from 'react-native';

import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}/shop`;

type UnitType = 'BAG' | 'QUINTAL' | 'KG';

const CATEGORIES = [
  { id: 'seed', labelHi: 'बीज', labelEn: 'Seeds' },
  { id: 'fert', labelHi: 'खाद', labelEn: 'Fertilizer' },
  { id: 'pest', labelHi: 'कीटनाशक', labelEn: 'Pesticide' },
  { id: 'tool', labelHi: 'उपकरण', labelEn: 'Equipment' },
];

export default function AddItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<UnitType | string>('KG');
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [stockQty, setStockQty] = useState(''); // NEW
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hsnCode, setHsnCode] = useState('');
  const [cgstPercent, setCgstPercent] = useState('');
  const [sgstPercent, setSgstPercent] = useState('');

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
          router.replace('/(shop-partner)/home');
        }
      }
    }
  };

  // VARIANTS STATE
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{ label: string; price: string; stockQty: string }[]>([]);

  const addVariant = () => {
    setVariants([...variants, { label: '', price: '', stockQty: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const handleSubmit = async () => {
    // itemName — required, min 2 chars
    if (!itemName.trim()) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया आइटम का नाम भरें' : 'Please enter item name');
      return;
    }
    if (itemName.trim().length < 2) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नाम कम से कम 2 अक्षर का होना चाहिए' : 'Item name must be at least 2 characters');
      return;
    }
    // category — required
    if (!category) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया कैटेगरी चुनें' : 'Please select a category');
      return;
    }

    if (!hasVariants) {
      // price — required, positive number
      if (!price.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया कीमत भरें' : 'Please enter price');
        return;
      }
      const priceNum = parseFloat(price.trim());
      if (isNaN(priceNum) || priceNum <= 0) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कीमत 0 से अधिक होनी चाहिए' : 'Price must be greater than 0');
        return;
      }
      // stockQty — required, non-negative integer
      if (!stockQty.trim()) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया स्टॉक भरें' : 'Please enter stock quantity');
        return;
      }
      const stockNum = parseInt(stockQty.trim(), 10);
      if (isNaN(stockNum) || stockNum < 0) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'स्टॉक 0 या उससे अधिक होना चाहिए' : 'Stock must be 0 or greater');
        return;
      }
    }

    if (hasVariants && (variants.length === 0 || variants.some(v => !v.label || !v.price || !v.stockQty))) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सभी वेरिएंट विवरण भरें' : 'Please fill all variant details');
      return;
    }
    // Validate each variant price/stockQty if using variants
    if (hasVariants) {
      for (const v of variants) {
        if (v.label.trim().length < 2) {
          showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'वेरिएंट का नाम कम से कम 2 अक्षर का होना चाहिए' : 'Variant label must be at least 2 characters');
          return;
        }
        const vPrice = parseFloat(v.price);
        if (isNaN(vPrice) || vPrice <= 0) {
          showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? `"${v.label}" की कीमत 0 से अधिक होनी चाहिए` : `Price for "${v.label}" must be greater than 0`);
          return;
        }
        const vStock = parseInt(v.stockQty, 10);
        if (isNaN(vStock) || vStock < 0) {
          showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? `"${v.label}" का स्टॉक 0 या अधिक होना चाहिए` : `Stock for "${v.label}" must be 0 or greater`);
          return;
        }
      }
    }

    // description — optional, if filled min 5 chars
    if (description.trim() && description.trim().length < 5) {
      showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'विवरण कम से कम 5 अक्षर का होना चाहिए' : 'Description must be at least 5 characters');
      return;
    }

    // hsnCode — optional, if filled must be 4-8 digits
    if (hsnCode.trim()) {
      const hsnClean = hsnCode.trim().replace(/\D/g, '');
      if (hsnClean.length < 4 || hsnClean.length > 8) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'HSN कोड 4 से 8 अंकों का होना चाहिए' : 'HSN code must be 4 to 8 digits');
        return;
      }
    }

    // cgst/sgst — optional, if filled must be 0–100
    if (cgstPercent.trim()) {
      const cgst = parseFloat(cgstPercent.trim());
      if (isNaN(cgst) || cgst < 0 || cgst > 100) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'CGST 0 से 100 के बीच होना चाहिए' : 'CGST must be between 0 and 100');
        return;
      }
    }
    if (sgstPercent.trim()) {
      const sgst = parseFloat(sgstPercent.trim());
      if (isNaN(sgst) || sgst < 0 || sgst > 100) {
        showAlert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'SGST 0 से 100 के बीच होना चाहिए' : 'SGST must be between 0 and 100');
        return;
      }
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('name', itemName);
      formData.append('category', category);
      if (!hasVariants) {
        formData.append('price', price);
        formData.append('stockQty', stockQty);
      } else {
        // Fallback for required fields with variants
        formData.append('price', '0');
        formData.append('stockQty', '0');
      }
      formData.append('unit', unit);
      formData.append('hasVariants', String(hasVariants));
      if (hasVariants) {
        formData.append('variants', JSON.stringify(variants));
      }
      if (hsnCode) formData.append('hsnCode', hsnCode);
      formData.append('cgstPercent', cgstPercent || '0');
      formData.append('sgstPercent', sgstPercent || '0');
      if (description) formData.append('description', description);

      if (imageUris.length > 0) {
        imageUris.forEach((uri, idx) => {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${idx}-item.${fileExt}`;
          formData.append('images', {
            uri: uri,
            name: fileName,
            type: `image/${fileExt}`
          } as any);
        });
      }

      console.log('--- SUBMITTING ITEM ---');
      for (let [key, value] of (formData as any)._parts) {
        console.log(`${key}:`, value);
      }

      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('Response Status:', res.status);

      if (res.ok) {
        showAlert(isHindi ? 'सफल' : 'Success', isHindi ? 'नया आइटम सफलतापूर्वक जुड़ गया!' : 'New item added successfully!');
        
        // Reset form state
        setItemName('');
        setCategory(null);
        setPrice('');
        setUnit('KG');
        setShowCustomUnit(false);
        setStockQty('');
        setDescription('');
        setImageUris([]);
        setHsnCode('');
        setCgstPercent('');
        setSgstPercent('');
        setHasVariants(false);
        setVariants([]);
        
        router.back();
      } else {
        const err = await res.json();
        showAlert(isHindi ? 'त्रुटि' : 'Error', err.error || 'Failed to add item');
      }
    } catch (e) {
      console.error('Add item error:', e);
      showAlert(isHindi ? 'त्रुटि' : 'Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
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

    if (!pickerResult.canceled && pickerResult.assets.length > 0) {
      try {
        setLoading(true);
        const newUris: string[] = [];
        for (const asset of pickerResult.assets) {
          const manipResult = await manipulateAsync(
            asset.uri,
            [{ resize: { width: 500, height: 500 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          newUris.push(manipResult.uri);
        }
        setImageUris((prev) => [...prev, ...newUris].slice(0, 5));
      } catch (e) {
        console.error('Image manipulation error:', e);
        showAlert('Error', 'Failed to process image');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const renderUnitLabel = (u: string) => {
    if (u === 'BAG') return isHindi ? 'बोरी' : 'Bag';
    if (u === 'QUINTAL') return isHindi ? 'क्विंटल' : 'Quintal';
    if (u === 'KG') return isHindi ? 'किलो' : 'Kg';
    return u;
  };

  const headerTitle = isHindi ? 'नया आइटम' : 'Add item';

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
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* IMAGE UPLOAD */}
        <Text style={styles.sectionLabel}>
          {isHindi ? 'फोटो अपलोड (अधिकतम 5)' : 'Photo upload (Max 5)'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: 10 }}>
          {imageUris.map((uri, idx) => (
            <View key={idx} style={{ marginRight: 10, position: 'relative' }}>
              <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 10 }} />
              <TouchableOpacity
                style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 12 }}
                onPress={() => removeImage(idx)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < 5 && (
            <TouchableOpacity
              style={[styles.imagePlaceholder, { width: 120, height: 120, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }]}
              activeOpacity={0.8}
              onPress={handlePickImage}
            >
              <Ionicons
                name="add-outline"
                size={28}
                color="#9CA3AF"
              />
              <Text style={[styles.imagePlaceholderSub, { fontSize: 10, marginTop: 4 }]}>
                {isHindi ? 'फोटो जोड़ें' : 'Add photo'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ITEM NAME */}
        <Text style={styles.sectionLabel}>
          {isHindi ? 'आइटम विवरण' : 'Item details'}
        </Text>

        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>
            {isHindi ? 'आइटम का नाम' : 'Item name'}
          </Text>
          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder={
              isHindi ? 'जैसे: Hybrid wheat seeds' : 'e.g. Hybrid wheat seeds'
            }
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* CATEGORY SELECT */}
        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>
            {isHindi ? 'कैटेगरी चुनें' : 'Select category'}
          </Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      active && styles.categoryTextActive,
                    ]}
                  >
                    {isHindi ? cat.labelHi : cat.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* VARIANTS SECTION */}
        <View style={styles.variantsHeader}>
          <Text style={styles.sectionLabel}>
            {isHindi ? 'वेरिएंट (जैसे 100ml, 1kg)' : 'Variants (e.g. 100ml, 1kg)'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const newHasVariants = !hasVariants;
              setHasVariants(newHasVariants);
              if (newHasVariants && variants.length === 0) addVariant();
            }}
            style={styles.variantToggle}
          >
            <Ionicons
              name={hasVariants ? "checkbox" : "square-outline"}
              size={20}
              color={hasVariants ? "#16A34A" : "#6B7280"}
            />
            <Text style={[styles.variantToggleText, hasVariants && { color: '#16A34A' }]}>
              {isHindi ? 'वेरिएंट जोड़ें' : 'Add variants'}
            </Text>
          </TouchableOpacity>
        </View>

        {hasVariants ? (
          <View style={styles.variantsList}>
            {variants.map((v, idx) => (
              <View key={idx} style={styles.variantCard}>
                <View style={styles.variantTop}>
                  <Text style={styles.variantTitle}>{isHindi ? `वेरिएंट ${idx + 1}` : `Variant ${idx + 1}`}</Text>
                  <TouchableOpacity onPress={() => removeVariant(idx)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.variantInputRow}>
                  <View style={[styles.variantInputWrap, { flex: 2 }]}>
                    <Text style={styles.variantLabel}>{isHindi ? 'नाम (उदा. 100ml)' : 'Label (e.g. 100ml)'}</Text>
                    <TextInput
                      value={v.label}
                      onChangeText={(val) => updateVariant(idx, 'label', val)}
                      style={styles.variantInput}
                      placeholder="100ml"
                    />
                  </View>
                  <View style={[styles.variantInputWrap, { flex: 1.5 }]}>
                    <Text style={styles.variantLabel}>{isHindi ? 'कीमत' : 'Price'}</Text>
                    <TextInput
                      value={v.price}
                      onChangeText={(val) => updateVariant(idx, 'price', val)}
                      style={styles.variantInput}
                      keyboardType="numeric"
                      placeholder="₹"
                    />
                  </View>
                  <View style={[styles.variantInputWrap, { flex: 1 }]}>
                    <Text style={styles.variantLabel}>{isHindi ? 'स्टॉक' : 'Stock'}</Text>
                    <TextInput
                      value={v.stockQty}
                      onChangeText={(val) => updateVariant(idx, 'stockQty', val)}
                      style={styles.variantInput}
                      keyboardType="numeric"
                      placeholder="10"
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addVariantBtn} onPress={addVariant}>
              <Ionicons name="add-circle-outline" size={20} color="#16A34A" />
              <Text style={styles.addVariantText}>{isHindi ? 'एक और वेरिएंट जोड़ें' : 'Add another variant'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* PRICE + UNIT */}
            <View style={[styles.fieldBox, { marginBottom: 12 }]}>
              <Text style={styles.fieldLabel}>
                {isHindi ? 'कीमत और यूनिट' : 'Price and unit'}
              </Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.pricePrefix}>₹</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder={isHindi ? 'कीमत' : 'Price'}
                    style={styles.priceInput}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.unitRow}>
                  {(['BAG', 'QUINTAL', 'KG'] as UnitType[]).map(u => {
                    const active = unit === u && !showCustomUnit;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitChip,
                          active && styles.unitChipActive,
                        ]}
                        onPress={() => {
                          setUnit(u);
                          setShowCustomUnit(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            active && styles.unitTextActive,
                          ]}
                        >
                          {renderUnitLabel(u)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* PLUS ICON FOR CUSTOM UNIT */}
                  <TouchableOpacity
                    style={[
                      styles.unitChip,
                      showCustomUnit && styles.unitChipActive,
                    ]}
                    onPress={() => {
                      setShowCustomUnit(true);
                      setUnit('');
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={showCustomUnit ? "#166534" : "#4B5563"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showCustomUnit && (
                <View style={styles.customUnitInputWrap}>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder={isHindi ? 'यूनिट का नाम (जैसे: Packet, Box)' : 'Unit name (e.g. Packet, Box)'}
                    style={styles.customUnitInput}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>

            {/* STOCK QTY */}
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>
                {isHindi ? 'स्टॉक (मात्रा)' : 'Stock quantity'}
              </Text>
              <TextInput
                value={stockQty}
                onChangeText={setStockQty}
                keyboardType="numeric"
                placeholder={isHindi ? 'जैसे: 12' : 'e.g. 12'}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.stockHint}>
                {isHindi
                  ? `वही यूनिट में भरे जो ऊपर चुनी है (${renderUnitLabel(unit)})`
                  : `Use same unit as selected above (${renderUnitLabel(unit)})`}
              </Text>
            </View>
          </>
        )}

        {/* DESCRIPTION */}
        {/* GST & HSN DETAILS */}
        <Text style={styles.sectionLabel}>
          {isHindi ? 'GST और HSN विकल्प' : 'GST & HSN details'}
        </Text>

        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>{isHindi ? 'HSN कोड' : 'HSN code'}</Text>
          <TextInput
            value={hsnCode}
            onChangeText={setHsnCode}
            placeholder="e.g. 3101"
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        <View style={{ flexDirection: 'row', columnGap: 10, marginTop: 10 }}>
          <View style={[styles.fieldBox, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{isHindi ? 'CGST %' : 'CGST %'}</Text>
            <TextInput
              value={cgstPercent}
              onChangeText={setCgstPercent}
              placeholder="e.g. 9"
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldBox, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{isHindi ? 'SGST %' : 'SGST %'}</Text>
            <TextInput
              value={sgstPercent}
              onChangeText={setSgstPercent}
              placeholder="e.g. 9"
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={[styles.fieldBox, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>
            {isHindi ? 'डिस्क्रिप्शन' : 'Description'}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              isHindi
                ? 'बीज का type, maturity, कंपनी आदि लिखें'
                : 'Write details like type, brand, usage etc.'
            }
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveText}>
                {isHindi ? 'आइटम सेव करें' : 'Save item'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },

  imagePicker: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  imagePlaceholderSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    paddingHorizontal: 20,
    textAlign: 'center',
  },

  fieldBox: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },
  textArea: {
    minHeight: 90,
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
  categoryText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#0369A1',
  },

  priceRow: {
    flexDirection: 'column',
    marginTop: 4,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pricePrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 4,
  },
  priceInput: {
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
  unitText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  unitTextActive: {
    color: '#166534',
  },

  stockHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  saveBtn: {
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingVertical: 11,
    paddingHorizontal: 16,
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
});
