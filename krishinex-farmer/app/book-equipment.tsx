// app/book-equipment.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi, IMAGE_BASE_URL } from '../services/api';
import * as Location from 'expo-location';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { showAlert } from '@/components/CustomAlert';

const SHADOW_COLOR = '#00000020';
const GREEN = '#98cd06ff';
const GREEN_DARK = '#467804ff';
const GREEN_LIGHT = '#b7e46bff';

type Equipment = {
  id: number;
  name: string;
  img: string;
  rating: number;
  reviews: number;
  distance: number;
  owner: string;
  hourlyPrice: number;
  dailyPrice: number;
  katthaPrice?: number;
  description: string;
  availability: {
    [key: string]: boolean;
  };
  subMachinery?: { name: string; image: string; priceDay?: number; priceKattha?: number }[];
};

const TRACTOR_DATA: Record<'hi' | 'en', Equipment[]> = {
  hi: [
    {
      id: 1,
      name: 'ट्रैक्टर 50 HP',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.8,
      reviews: 245,
      distance: 2.5,
      owner: 'राजेश सिंह',
      hourlyPrice: 100,
      dailyPrice: 800,
      description: 'शक्तिशाली ट्रैक्टर सभी खेती कामों के लिए',
      availability: {
        today: true,
        tomorrow: true,
        day3: false,
        day4: true,
      },
    },
    {
      id: 2,
      name: 'कंबाइन हार्वेस्टर',
      img: 'https://i.ibb.co/Qd2Zx5K/harvester.png',
      rating: 4.9,
      reviews: 189,
      distance: 5.2,
      owner: 'प्रमोद कुमार',
      hourlyPrice: 300,
      dailyPrice: 2500,
      description: 'गेहूं और धान की कटाई के लिए सर्वश्रेष्ठ',
      availability: {
        today: false,
        tomorrow: true,
        day3: true,
        day4: true,
      },
    },
    {
      id: 3,
      name: 'पावर स्प्रेयर 20L',
      img: 'https://i.ibb.co/kX8Qj9P/sprayer.png',
      rating: 4.6,
      reviews: 312,
      distance: 1.2,
      owner: 'विजय पटेल',
      hourlyPrice: 20,
      dailyPrice: 150,
      description: 'दवाई का छिड़काव आसान और सुरक्षित',
      availability: {
        today: true,
        tomorrow: true,
        day3: true,
        day4: true,
      },
    },
    {
      id: 4,
      name: 'डीजल पंप सेट 2HP',
      img: 'https://i.ibb.co/m5Pq3rT/pump.png',
      rating: 4.7,
      reviews: 428,
      distance: 3.8,
      owner: 'अरुण शर्मा',
      hourlyPrice: 40,
      dailyPrice: 300,
      description: 'मजबूत पंप सेट सिंचाई के लिए',
      availability: {
        today: true,
        tomorrow: false,
        day3: true,
        day4: true,
      },
    },
  ],
  en: [
    {
      id: 1,
      name: 'Tractor 50 HP',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.8,
      reviews: 245,
      distance: 2.5,
      owner: 'Rajesh Singh',
      hourlyPrice: 100,
      dailyPrice: 800,
      description: 'Powerful tractor for all farm work',
      availability: {
        today: true,
        tomorrow: true,
        day3: false,
        day4: true,
      },
    },
    {
      id: 2,
      name: 'Combine Harvester',
      img: 'https://i.ibb.co/Qd2Zx5K/harvester.png',
      rating: 4.9,
      reviews: 189,
      distance: 5.2,
      owner: 'Pramod Kumar',
      hourlyPrice: 300,
      dailyPrice: 2500,
      description: 'Best for wheat and rice harvesting',
      availability: {
        today: false,
        tomorrow: true,
        day3: true,
        day4: true,
      },
    },
    {
      id: 3,
      name: 'Power Sprayer 20L',
      img: 'https://i.ibb.co/kX8Qj9P/sprayer.png',
      rating: 4.6,
      reviews: 312,
      distance: 1.2,
      owner: 'Vijay Patel',
      hourlyPrice: 20,
      dailyPrice: 150,
      description: 'Easy and safe pesticide spraying',
      availability: {
        today: true,
        tomorrow: true,
        day3: true,
        day4: true,
      },
    },
    {
      id: 4,
      name: 'Diesel Pump Set 2HP',
      img: 'https://i.ibb.co/m5Pq3rT/pump.png',
      rating: 4.7,
      reviews: 428,
      distance: 3.8,
      owner: 'Arun Sharma',
      hourlyPrice: 40,
      dailyPrice: 300,
      description: 'Sturdy pump set for irrigation',
      availability: {
        today: true,
        tomorrow: false,
        day3: true,
        day4: true,
      },
    },
  ],
};

const LABOUR_DATA: Record<'hi' | 'en', Equipment[]> = {
  hi: [
    {
      id: 1,
      name: 'कृषि मजदूर',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.5,
      reviews: 120,
      distance: 1.5,
      owner: 'रामू यादव',
      hourlyPrice: 80,
      dailyPrice: 500,
      description: 'खेत की निराई, गुड़ाई और कटाई का काम',
      availability: {
        today: true,
        tomorrow: true,
        day3: true,
        day4: false,
      },
    },
    {
      id: 2,
      name: 'लोडिंग मजदूर',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.6,
      reviews: 90,
      distance: 2.0,
      owner: 'शिवा',
      hourlyPrice: 90,
      dailyPrice: 550,
      description: 'अनाज, खाद, बीज आदि लोडिंग–अनलोडिंग',
      availability: {
        today: true,
        tomorrow: false,
        day3: true,
        day4: true,
      },
    },
  ],
  en: [
    {
      id: 1,
      name: 'Farm Labour',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.5,
      reviews: 120,
      distance: 1.5,
      owner: 'Ramu Yadav',
      hourlyPrice: 80,
      dailyPrice: 500,
      description: 'Field work like weeding, harvesting etc.',
      availability: {
        today: true,
        tomorrow: true,
        day3: true,
        day4: false,
      },
    },
    {
      id: 2,
      name: 'Loading Worker',
      img: 'https://i.ibb.co/9rQk7Xy/tractor.png',
      rating: 4.6,
      reviews: 90,
      distance: 2.0,
      owner: 'Shiva',
      hourlyPrice: 90,
      dailyPrice: 550,
      description: 'Loading and unloading grains, fertilizer, seeds etc.',
      availability: {
        today: true,
        tomorrow: false,
        day3: true,
        day4: true,
      },
    },
  ],
};

const DAYS = [
  { key: 'today', hi: 'आज', en: 'Today' },
  { key: 'tomorrow', hi: 'कल', en: 'Tomorrow' },
  { key: 'day3', hi: '+2 दिन', en: '+2 Days' },
  { key: 'day4', hi: '+3 दिन', en: '+3 Days' },
];

type BookingData = {
  equipment: Equipment;
  priceType: 'hourly' | 'daily';
  selectedDay: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BookEquipmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [mode, setMode] = useState<'tractor' | 'labour'>('tractor');

  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(1);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [priceType, setPriceType] = useState<'hourly' | 'daily' | 'kattha'>('kattha');
  const [selectedDay, setSelectedDay] = useState('today');
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any | null>(null);
  const [searchText, setSearchText] = useState('');
  const [distanceDropdownOpen, setDistanceDropdownOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(10);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEquipmentForDetails, setSelectedEquipmentForDetails] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userStatus, setUserStatus] = useState('pending');
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  
  // Real Date/Time Picker States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(new Date());
  const [hours, setHours] = useState(1);
  const [daysCount, setDaysCount] = useState(1);
  const [katthaCount, setKatthaCount] = useState(1);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet'>('wallet');
  const [walletInfo, setWalletInfo] = useState({ walletBalance: 0, discountPercentage: 0 });

  // Voice Search States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();
  }, [mode, searchText, maxDistance, selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user status for verification
      try {
        const profileRes = await authApi.getProfile();
        if (profileRes.data && profileRes.data.status) {
          setUserStatus(profileRes.data.status);
        }
      } catch (err) {
        console.warn('Failed to fetch profile status for booking:', err);
      }

      const categoryMap: { [key: number]: string } = mode === 'tractor' ? {
        1: 'all',
        2: 'tractor',
        3: 'harvester',
        4: 'pump',
      } : {
        1: 'all',
        2: 'Labour',
        3: 'Harvest',
        4: 'Spray',
        5: 'Load',
      };

      const params: any = {
        search: searchText,
        maxDistance: maxDistance || undefined,
        category: categoryMap[selectedCategory || 1],
      };

      try {
        console.log('[DEBUG] Checking location permissions...');
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const permissionRes = await Location.requestForegroundPermissionsAsync();
          status = permissionRes.status;
        }

        if (status === 'granted') {
          console.log('[DEBUG] Location granted, checking if enabled...');
          const enabled = await Location.hasServicesEnabledAsync();
          if (!enabled) {
            showAlert('Location Off', 'Please turn on your GPS/Location to find nearby services.');
          }

          console.log('[DEBUG] Fetching position...');
          // Try last known first for speed
          const lastLoc = await Location.getLastKnownPositionAsync({});
          if (lastLoc) {
            params.userLat = lastLoc.coords.latitude;
            params.userLng = lastLoc.coords.longitude;
            console.log('[DEBUG] Used last known position:', params.userLat, params.userLng);
          }

          // Still try to get fresh position with a longer timeout (10s)
          const locPromise = Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 10000));
          
          try {
            const loc: any = await Promise.race([locPromise, timeoutPromise]);
            params.userLat = loc.coords.latitude;
            params.userLng = loc.coords.longitude;
            console.log('[DEBUG] Fresh location fetched:', params.userLat, params.userLng);
          } catch (tErr) {
            if (!params.userLat || !params.userLng) {
               console.warn('[DEBUG] Fresh location timeout and no last known position available.');
            } else {
               console.log('[DEBUG] Fresh location timeout, using previous last known position.');
            }
          }
        } else {
          console.log('[DEBUG] Location denied');
          if (maxDistance) {
            showAlert('Permission Denied', 'Distance filter requires location access.');
          }
        }
      } catch (locErr: any) {
        console.warn('[DEBUG] User location fetch failed:', locErr);
      }

      if (maxDistance && (!params.userLat || !params.userLng)) {
        console.warn('[DEBUG] Distance filter set but user location is missing.');
      }

      let res;
      try {
        if (mode === 'tractor') {
          res = await authApi.getMachines(params);
        } else {
          res = await authApi.getLabours(params);
        }
      } catch (apiErr: any) {
        console.error('API Fetch failed:', apiErr);
        throw apiErr;
      }
      
      if (!res.data || !Array.isArray(res.data)) {
        setEquipmentList([]);
        return;
      }

      if (res.data.length === 0) {
        console.log('Zero items returned for params:', params);
      }

      // Map backend data to frontend Equipment type if needed
      const mapped = res.data.map((item: any) => {
        try {
          let displayImg = 'https://i.ibb.co/9rQk7Xy/tractor.png';
          let allImages: string[] = [];

          if (mode === 'tractor') {
            if (item.images && item.images.length > 0) {
              allImages = item.images.map((img: string) => {
                const imgPath = img.replace(/\\/g, '/');
                return imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE_URL}/${imgPath.startsWith('/') ? imgPath.slice(1) : imgPath}`;
              });
              displayImg = allImages[0];
            } else {
              allImages = [displayImg];
            }
          } else {
            // Labour mode - check profilePhotoUrl
            if (item.profilePhotoUrl) {
              const imgPath = item.profilePhotoUrl.replace(/\\/g, '/');
              displayImg = imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE_URL}/${imgPath.startsWith('/') ? imgPath.slice(1) : imgPath}`;
              allImages = [displayImg];
            } else {
              displayImg = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; // Fallback labour icon
              allImages = [displayImg];
            }
          }

          const mappedItem: any = {
            id: item._id,
            name: item.name || 'Unknown',
            img: displayImg,
            allImages: allImages,
            distance: item.distanceKm !== undefined ? Number(item.distanceKm).toFixed(1) : (item.maxDistanceKm || 5),
            owner: item.owner?.name || item.businessName || item.name || 'N/A',
            hourlyPrice: (Number(item.priceHour || item.ratePerHour) || 0),
            dailyPrice: (Number(item.priceDay || item.ratePerDay) || 0),
            description: item.desc || (item.labourDetails?.skills ? (Array.isArray(item.labourDetails.skills) ? item.labourDetails.skills.join(', ') : item.labourDetails.skills) : '') || 'Powerful service for your farm',
            skillDescription: item.labourDetails?.skillDescription || '',
            availability: {
              today: true,
              tomorrow: true,
              day3: true,
              day4: true,
            },
            subMachinery: (item.subMachinery || []).map((s: any) => ({
              ...s,
              priceDay: Number(s.priceDay) || 0,
              priceKattha: Number(s.priceKattha) || 0
            })),
            originalItem: item
          };

          if (mode === 'tractor') {
            // Find minimum Daily Price for Equipment
            const dailyPrices = [mappedItem.dailyPrice];
            mappedItem.subMachinery.forEach((s: any) => {
              if (s.priceDay > 0) dailyPrices.push(s.priceDay);
            });
            const validDaily = dailyPrices.filter(p => p > 0);
            mappedItem.dailyPrice = validDaily.length > 0 ? Math.min(...validDaily) : 0;

            // Find minimum Kattha Price for Equipment
            const katthaPrices = mappedItem.subMachinery.map((s: any) => s.priceKattha).filter(p => p > 0);
            mappedItem.katthaPrice = katthaPrices.length > 0 ? Math.min(...katthaPrices) : 0;
            
            // For tractor, we hide hourly as per request (replace with kattha)
            mappedItem.hourlyPrice = 0;
          } else {
            // Labour mode: Keep hourly and daily as is. No kattha.
            mappedItem.katthaPrice = 0;
          }

          return mappedItem;
        } catch (mapErr) {
          console.error('Item mapping error', mapErr);
          return null;
        }
      }).filter((i: any) => i !== null);

      setEquipmentList(mapped);
    } catch (e) {
      console.error('Fetch booking data error', e);
    } finally {
      setLoading(false);
    }
  };

  // =============== VOICE SEARCH LOGIC ===============
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSpeech = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsListening(true);
        setShowVoiceModal(true);
        startPulse();
      } else {
        showAlert('Permission Denied', 'Mic access is required for voice search.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopSpeech = async () => {
    setIsListening(false);
    pulseAnim.setValue(1);
    if (!recording) {
      setShowVoiceModal(false);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      // Simulate STT transcription
      handleVoiceSearch();
    } catch (err) {
      console.error('Failed to stop recording', err);
      setShowVoiceModal(false);
    }
  };

  const handleVoiceSearch = () => {
    // Smart Simulation: Pick keywords based on current mode
    const machineKeys = hi ? ['Tractor', 'Harvester', 'Pump', 'Khet'] : ['Tractor', 'Harvester', 'Pump', 'Farm'];
    const labourKeys = hi ? ['Labour', 'Worker', 'Majdur', 'Helper'] : ['Labour', 'Worker', 'Person', 'Helper'];

    const keywords = mode === 'tractor' ? machineKeys : labourKeys;
    const randomKey = keywords[Math.floor(Math.random() * keywords.length)];

    console.log(`[Voice Simulation] Transcribed: ${randomKey}`);

    setTimeout(() => {
      setSearchText(randomKey);
      setShowVoiceModal(false);
    }, 1000);
  };

  const categories =
      mode === 'tractor'
        ? [
          { id: 1, name: hi ? 'सभी' : 'All', icon: 'grid-outline' },
          { id: 2, name: hi ? 'ट्रैक्टर' : 'Tractor', icon: 'car-outline' },
          { id: 3, name: hi ? 'हार्वेस्टर' : 'Harvester', icon: 'leaf-outline' },
          { id: 4, name: hi ? 'पंप' : 'Pump', icon: 'water-outline' },
        ]
        : [
          { id: 1, name: hi ? 'सभी' : 'All', icon: 'grid-outline' },
          { id: 2, name: hi ? 'मजदूर' : 'Labour', icon: 'people-outline' },
          { id: 3, name: hi ? 'कटाई' : 'Harvesting', icon: 'cut-outline' },
          { id: 4, name: hi ? 'छिड़काव' : 'Spraying', icon: 'color-filter-outline' },
          { id: 5, name: hi ? 'लोडिंग' : 'Loading', icon: 'cube-outline' },
        ];

  const distanceOptions = Array.from({ length: 15 }, (_, i) => (i + 1) * 2);

  const t = {
    title: hi
      ? 'उपकरण / लेबर'
      : 'Equipment / Labor',
    categories: hi ? 'श्रेणियाँ' : 'Categories',
    available: hi ? 'उपलब्ध' : 'Available',
    notAvailable: hi ? 'बुक है' : 'Booked',
    distance: hi ? 'दूरी' : 'Distance',
    owner: hi ? 'पता' : 'Address',
    perKattha: hi ? '₹/कट्ठा' : '₹/Kattha',
    perHour: hi ? '₹/घंटा' : '₹/Hour',
    perDay: hi ? '₹/दिन' : '₹/Day',
    selectDate: hi ? 'तारीख चुनें' : 'Select Date',
    selectPrice: hi ? 'मूल्य प्रकार' : 'Price Type',
    bookNow: hi ? 'बुक करें' : 'Book Now',
    successTitle: hi ? 'बुकिंग कन्फर्म!' : 'Booking Confirmed!',
    bookingDetails: hi ? 'बुकिंग डिटेल्स' : 'Booking Details',
    date: hi ? 'तारीख' : 'Date',
    type: hi ? 'प्रकार' : 'Type',
    totalPrice: hi ? 'कुल मूल्य' : 'Total Price',
    closeBtn: hi ? 'ठीक है' : 'Okay',
    searchPlaceholder: hi
      ? mode === 'tractor'
        ? 'उपकरण या मालिक से खोजें'
        : 'मजदूर या नाम से खोजें'
      : mode === 'tractor'
        ? 'Search equipment or owner'
        : 'Search labour or name',
    distanceFilterLabel: hi ? 'दूरी चुनें' : 'Select Distance',
    anyDistance: hi ? 'कोई भी दूरी' : 'Any distance',
  };

  const checkAvailability = async () => {
    if (!selectedEquipment) return;
    
    try {
      const from = new Date(selectedDate);
      from.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      
      const to = new Date(from);
      if (priceType === 'kattha') {
        to.setDate(to.getDate() + 1); // standard 1 day for kattha work
      } else if (priceType === 'hourly') {
        to.setHours(to.getHours() + hours);
      } else {
        to.setDate(to.getDate() + daysCount);
      }
      
      let res;
      if (mode === 'tractor') {
        res = await authApi.checkMachineAvailability(selectedEquipment.id, from.toISOString(), to.toISOString(), priceType);
      } else {
        res = await authApi.checkLabourAvailability(selectedEquipment.id, from.toISOString(), to.toISOString());
      }
      
      setIsAvailable(res.data.available);
      setBookedSlots(res.data.bookedSlots || []);
    } catch (err) {
      console.error('Check availability error:', err);
    }
  };

  useEffect(() => {
    if (showDateModal) {
      checkAvailability();
    }
  }, [selectedDate, startTime, hours, daysCount, priceType, showDateModal]);

  const getPrice = () => {
    if (!selectedEquipment) return 0;
    
    const orig = selectedEquipment.originalItem || {};
    let basePrice = 0;

    if (priceType === 'daily') {
      basePrice = (Number(orig.priceDay || orig.ratePerDay) || 0);
    } else if (priceType === 'kattha') {
      basePrice = (Number(orig.priceKattha) || 0);
    } else {
      basePrice = (Number(orig.priceHour || orig.ratePerHour) || 0);
    }
    
    // Add selected sub-machinery price
    if (selectedAttachments.length > 0) {
      const selectedSubName = selectedAttachments[0];
      const sub = selectedEquipment.subMachinery?.find((s: any) => s.name === selectedSubName);
      if (sub) {
        if (priceType === 'daily') {
           basePrice += (Number(sub.priceDay) || 0);
        } else if (priceType === 'kattha') {
           basePrice += (Number(sub.priceKattha) || 0);
        } else {
           // Hourly estimate for sub-machinery if none provided explicitly
           basePrice += Math.round(Number(sub.priceDay || 0) / 8);
        }
      }
    }
    
    if (priceType === 'daily') return Math.round(basePrice * daysCount);
    if (priceType === 'kattha') return Math.round(basePrice * katthaCount);
    return Math.round(basePrice * hours);
  };

  const handleBook = (equipment: any) => {
    setSelectedEquipment(equipment);
    // Retain selectedAttachments from detail modal if any
    if (selectedEquipmentForDetails?.id !== equipment.id) {
       setSelectedAttachments([]);
    }
    // Set default priceType based on current mode
    if (mode === 'tractor') {
      setPriceType('kattha');
    } else {
      setPriceType('daily');
    }
    setIsAvailable(null);
    setPaymentMethod('wallet');
    authApi.getShopWalletConfig().then(res => setWalletInfo(res.data)).catch(console.error);
    setShowDateModal(true);
  };

  const handleViewDetails = (equipment: any) => {
    setSelectedEquipmentForDetails(equipment);
    setSelectedAttachments([]);
    setCurrentImageIndex(0);
    setShowDetailModal(true);
  };

  const confirmBooking = async () => {
    if (userStatus !== 'approved') {
      showAlert(
        hi ? 'वेरिफिकेशन आवश्यक' : 'Verification Required',
        hi 
          ? 'बुकिंग के लिए आपका प्रोफाइल वेरीफाइड होना जरूरी है। कृपया अपनी प्रोफाइल पूरी करें और वेरिफिकेशन का इंतजार करें।' 
          : 'Your profile must be verified to book equipment/labour. Please complete your profile and wait for verification.',
        [
          { text: hi ? 'रद्द' : 'Cancel', style: 'cancel' },
          { text: hi ? 'प्रोफाइल पर जाएँ' : 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    if (!bookingPurpose.trim()) {
      alert(hi ? 'कृपया बुकिंग का उद्देश्य बताएं' : 'Please provide the purpose of booking');
      return;
    }

    if (selectedEquipment) {
      try {
        setBookingLoading(true);
        const finalPrice = getPrice();

        if (paymentMethod === 'wallet' && (walletInfo.walletBalance || 0) < finalPrice) {
          alert(hi ? `वॉलेट में पर्याप्त बैलेंस नहीं है। जरूरत: ₹${finalPrice}, उपलब्ध: ₹${walletInfo.walletBalance || 0}` : `Insufficient wallet balance. Need: ₹${finalPrice}`);
          setBookingLoading(false);
          return;
        }

        const from = new Date(selectedDate);
        from.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        
        const to = new Date(from);
        if (priceType === 'daily') {
          to.setDate(to.getDate() + daysCount);
        } else {
          to.setDate(to.getDate() + 1);
        }

        if (mode === 'tractor') {
          await authApi.bookMachine({
            machineId: selectedEquipment.id,
            fromDate: from.toISOString(),
            toDate: to.toISOString(),
            priceType: priceType,
            amount: finalPrice,
            hours: 0,
            days: priceType === 'daily' ? daysCount : 0,
            kattha: priceType === 'kattha' ? katthaCount : 0,
            purpose: bookingPurpose,
            paymentMode: paymentMethod.toUpperCase(),
            selectedSubMachinery: (selectedEquipment.subMachinery || [])
              .filter((sub: any) => selectedAttachments.includes(sub.name))
          });
        } else {
          await authApi.bookLabour({
            labourId: selectedEquipment.id,
            workType: selectedEquipment.name,
            fromDate: from.toISOString(),
            toDate: to.toISOString(),
            priceType: priceType,
            amount: finalPrice,
            hours: 0,
            days: priceType === 'daily' ? daysCount : 0,
            kattha: priceType === 'kattha' ? katthaCount : 0,
            purpose: bookingPurpose,
            paymentMethod: paymentMethod // Reverting to paymentMethod for labour
          });
        }

        const formatTime = (date: Date) => {
          let h = date.getHours();
          const m = date.getMinutes();
          const p = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${m.toString().padStart(2, '0')} ${p}`;
        };

        const booking: any = {
          equipment: selectedEquipment,
          priceType,
          selectedDate: from.toISOString(),
          startTime: formatTime(from),
          duration: priceType === 'daily' ? daysCount : katthaCount,
          totalPrice: finalPrice,
          paymentMode: paymentMethod
        };
        setBookingData(booking);
        setShowSuccess(true);
        setShowDateModal(false);
        setSelectedEquipment(null);
        setBookingPurpose('');
      } catch (e: any) {
        console.log('Booking failed:', e.response?.data?.error || e.message);
        alert(hi ? `बुकिंग विफल रही: ${e.response?.data?.error || ''}` : `Booking failed: ${e.response?.data?.error || ''}`);
      } finally {
        setBookingLoading(false);
      }
    }
  };

  const getAvailabilityStatus = (equipment: any) => {
    // We now use real-time check in the modal. 
    // For the list, we can show "Check Availability" or a general "Active" status.
    return t.available; 
  };

  const getAvailabilityColor = (equipment: any) => {
    return GREEN_DARK;
  };

  const distanceLabelText = maxDistance ? `${maxDistance} km` : t.anyDistance;

  const rows: any[][] = [];
  for (let i = 0; i < equipmentList.length; i += 2) {
    rows.push(equipmentList.slice(i, i + 2));
  }


  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent={false}
      />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* MODE TOGGLE */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          onPress={() => {
            setMode('tractor');
            setSelectedCategory(1);
          }}
          activeOpacity={0.9}
          style={[
            styles.modeChip,
            mode === 'tractor' && styles.modeChipActive,
          ]}
        >
          <Text
            style={[
              styles.modeChipText,
              mode === 'tractor' && styles.modeChipTextActive,
            ]}
          >
            {hi ? 'उपकरण बुकिंग' : 'Equipment Booking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setMode('labour');
            setSelectedCategory(1);
          }}
          activeOpacity={0.9}
          style={[
            styles.modeChip,
            styles.modeChipRight,
            mode === 'labour' && styles.modeChipActive,
          ]}
        >
          <Text
            style={[
              styles.modeChipText,
              mode === 'labour' && styles.modeChipTextActive,
            ]}
          >
            {hi ? 'लेबर बुकिंग' : 'Labour Booking'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH ROW */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.micBtn}
            activeOpacity={0.7}
            onPress={startSpeech}
          >
            <Ionicons name="mic-outline" size={18} color={GREEN_DARK} />
          </TouchableOpacity>
        </View>
      </View>

      {/* DISTANCE DROPDOWN */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.dropdownBtn}
          onPress={() => setDistanceDropdownOpen((prev) => !prev)}
        >
          <Ionicons
            name="navigate-outline"
            size={16}
            color={GREEN_DARK}
          />
          <Text style={styles.dropdownBtnText}>
            {distanceLabelText}
          </Text>
          <Ionicons
            name={distanceDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#6B7280"
          />
        </TouchableOpacity>

        {distanceDropdownOpen && (
          <View style={styles.dropdownList}>
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: 220 }}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setMaxDistance(null);
                  setDistanceDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>
                  {t.anyDistance}
                </Text>
              </TouchableOpacity>

              {distanceOptions.map((km) => (
                <TouchableOpacity
                  key={km}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setMaxDistance(km);
                    setDistanceDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>
                    {km} km
                  </Text>
                  {maxDistance === km && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={GREEN_DARK}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* CATEGORIES */}
      <View style={styles.categorySection}>
        <Text style={styles.categoryLabel}>{t.categories}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                ]}
                onPress={() => {
                  console.log('Category pressed:', cat.id, cat.name);
                  setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id,
                  )
                }}
                activeOpacity={0.9}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={active ? '#FFFFFF' : GREEN_DARK}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* LIST – 2 cards per row, equal height */}
      <LinearGradient
        colors={['#F2FCEB', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GREEN_DARK} />
          </View>
        ) : (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((equipment) => (
                    <TouchableOpacity
                      key={equipment.id}
                      style={styles.equipmentCardWrapper}
                      activeOpacity={0.9}
                      onPress={() => handleViewDetails(equipment)}
                    >
                      <View style={styles.equipmentCard}>
                        {/* IMAGE & AVAILABILITY */}
                        <View style={styles.imageWrapper}>
                          <Image
                            source={{ uri: equipment.img }}
                            style={styles.cardImage}
                          />
                          <View style={styles.availabilityPill}>
                            <View
                              style={[
                                styles.availabilityDot,
                                {
                                  backgroundColor:
                                    getAvailabilityColor(
                                      equipment,
                                    ),
                                },
                              ]}
                            />
                            <Text style={styles.availabilityText}>
                              {getAvailabilityStatus(
                                equipment,
                              )}
                            </Text>
                          </View>
                        </View>

                        {/* CONTENT */}
                        <View style={styles.cardContent}>
                          <View>
                            <Text
                              style={styles.cardName}
                              numberOfLines={1}
                            >
                              {equipment.name}
                            </Text>
                            <Text
                              style={styles.ownerText}
                              numberOfLines={1}
                            >
                              <Ionicons
                                name={
                                  mode === 'tractor'
                                    ? 'person-outline'
                                    : 'home-outline'
                                }
                                size={12}
                                color="#9CA3AF"
                              />{' '}
                              {equipment.owner}
                            </Text>

                            <Text
                              style={styles.cardDesc}
                              numberOfLines={2}
                            >
                              {equipment.description}
                            </Text>

                            <View style={styles.metaRow}>
                              <View style={styles.metaItem}>
                                <Ionicons
                                  name="location-outline"
                                  size={12}
                                  color="#6B7280"
                                />
                                <Text
                                  style={styles.metaText}
                                >
                                  {equipment.distance} km
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View>
                            <View style={styles.priceRow}>
                              <View>
                                <Text style={styles.priceLabel}>
                                  {mode === 'tractor' ? t.perKattha : t.perHour}
                                </Text>
                                <Text style={styles.priceValue}>
                                  ₹{mode === 'tractor' ? equipment.katthaPrice : equipment.hourlyPrice}
                                </Text>
                              </View>
                              <View>
                                <Text style={styles.priceLabel}>
                                  {t.perDay}
                                </Text>
                                <Text style={styles.priceValue}>
                                  ₹{equipment.dailyPrice}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.cardFooter}>
                              <TouchableOpacity
                                style={styles.calendarBtn}
                                onPress={() =>
                                  handleBook(equipment)
                                }
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name="calendar-outline"
                                  size={14}
                                  color={GREEN_DARK}
                                />
                                <Text
                                  style={
                                    styles.calendarBtnText
                                  }
                                >
                                  {t.selectDate}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.bookBtn}
                                onPress={() =>
                                  handleBook(equipment)
                                }
                                activeOpacity={0.9}
                              >
                                <Text style={styles.bookBtnText}>
                                  {t.bookNow}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {row.length === 1 && (
                    <View style={styles.equipmentCardWrapper}>
                      {/* Spacer empty card-size view for symmetry */}
                      <View style={[styles.equipmentCard, { opacity: 0 }]} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </LinearGradient>

      {/* DATE & PRICE MODAL */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView 
            style={{ width: '100%' }}
            contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.bookingDetails}</Text>

            {/* CALENDAR */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.date}</Text>
              <Calendar
                current={selectedDate}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: GREEN_DARK }
                }}
                theme={{
                  todayTextColor: GREEN_DARK,
                  arrowColor: GREEN_DARK,
                  selectedDayBackgroundColor: GREEN_DARK,
                }}
              />
            </View>

            {/* PRICE TYPE moved or integrated below */}

            {/* TIME & DURATION */}
            <View style={styles.section}>
              <View style={[styles.timeSection, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                {/* Header Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                  <Text style={[styles.sectionLabel, { marginTop: 0 }]}>{hi ? 'समय और अवधि' : 'Time & Duration'}</Text>
                  <View style={{ width: 130 }}>
                    {mode === 'tractor' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 2 }}>
                        <TouchableOpacity 
                          onPress={() => setPriceType('kattha')}
                          style={{ flex: 1, paddingVertical: 4, alignItems: 'center', borderRadius: 18, backgroundColor: priceType === 'kattha' ? GREEN_DARK : 'transparent' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: priceType === 'kattha' ? '#fff' : '#6B7280' }}>{hi ? 'कट्ठा' : 'Kattha'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setPriceType('daily')}
                          style={{ flex: 1, paddingVertical: 4, alignItems: 'center', borderRadius: 18, backgroundColor: priceType === 'daily' ? GREEN_DARK : 'transparent' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: priceType === 'daily' ? '#fff' : '#6B7280' }}>{hi ? 'दिन' : 'Days'}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 2 }}>
                        <TouchableOpacity 
                          onPress={() => setPriceType('hourly')}
                          style={{ flex: 1, paddingVertical: 4, alignItems: 'center', borderRadius: 18, backgroundColor: priceType === 'hourly' ? GREEN_DARK : 'transparent' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: priceType === 'hourly' ? '#fff' : '#6B7280' }}>{hi ? 'घंटा' : 'Hour'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setPriceType('daily')}
                          style={{ flex: 1, paddingVertical: 4, alignItems: 'center', borderRadius: 18, backgroundColor: priceType === 'daily' ? GREEN_DARK : 'transparent' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: priceType === 'daily' ? '#fff' : '#6B7280' }}>{hi ? 'दिन' : 'Days'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Main Content Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                  {(priceType === 'hourly' || (mode === 'labour' && priceType === 'daily')) ? (
                    <View style={{ flex: 1.2 }}>
                      <TouchableOpacity 
                        style={[styles.timePickerBtn, { marginTop: 0 }]}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Ionicons name="time-outline" size={20} color={GREEN_DARK} />
                        <Text style={styles.timePickerText}>
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flex: 1.2 }} />
                  )}
                
                  <View style={{ flex: 1, marginLeft: 12 }}>
                  
                    <View style={[styles.counterRow, { marginTop: 0 }]}>
                    <TouchableOpacity onPress={() => {
                      if (priceType === 'kattha') setKatthaCount(Math.max(1, katthaCount - 1));
                      else if (priceType === 'hourly') setHours(Math.max(1, hours - 1));
                      else setDaysCount(Math.max(1, daysCount - 1));
                    }}>
                      <Ionicons name="remove-circle-outline" size={28} color={GREEN_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>
                      {priceType === 'kattha' ? katthaCount : priceType === 'hourly' ? hours : daysCount}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      if (priceType === 'kattha') setKatthaCount(katthaCount + 1);
                      else if (priceType === 'hourly') setHours(hours + 1);
                      else setDaysCount(daysCount + 1);
                    }}>
                      <Ionicons name="add-circle-outline" size={28} color={GREEN_DARK} />
                    </TouchableOpacity>
                  </View>
                  {priceType === 'kattha' && (
                    <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                      {hi ? `कुल: ${katthaCount} कट्ठा` : `Total: ${katthaCount} Kattha`}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

            {showTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setStartTime(date);
                }}
              />
            )}

            {/* AVAILABILITY STATUS */}
            <View style={[
              styles.availabilityStatusBox, 
              { backgroundColor: isAvailable === true ? '#F0FDF4' : isAvailable === false ? '#FEF2F2' : '#F3F4F6' }
            ]}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: isAvailable === true ? GREEN_DARK : isAvailable === false ? '#EF4444' : '#9CA3AF' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: isAvailable === true ? '#166534' : isAvailable === false ? '#991B1B' : '#4B5563' }
              ]}>
                {isAvailable === true 
                  ? (hi ? 'उपलब्ध है' : 'Available') 
                  : isAvailable === false 
                    ? (hi ? 'बुक है' : 'Already Booked') 
                    : (hi ? 'जांच रहे हैं...' : 'Checking...')}
              </Text>
            </View>
            
            {/* ATTACHMENTS SELECTION */}
            {selectedEquipment && selectedEquipment.subMachinery && selectedEquipment.subMachinery.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{hi ? 'अटैचमेंट जोड़ें' : 'Select Attachments'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {selectedEquipment.subMachinery.map((sub: any, idx: number) => {
                    const isSelected = selectedAttachments.includes(sub.name);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.attachmentChip,
                          isSelected && styles.attachmentChipActive
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedAttachments([]);
                          } else {
                            setSelectedAttachments([sub.name]);
                          }
                        }}
                      >
                        {sub.image ? (
                          <Image
                            source={{ uri: sub.image.startsWith('http') ? sub.image : `${IMAGE_BASE_URL}/${sub.image.replace(/^\//, '')}` }}
                            style={styles.attachmentImg}
                          />
                        ) : (
                          <Ionicons name="cog-outline" size={14} color={isSelected ? '#fff' : '#6B7280'} />
                        )}
                        <Text style={[styles.attachmentText, isSelected && { color: '#fff' }]}>
                          {sub.name} {sub.priceDay > 0 ? `(₹${sub.priceDay})` : ''}
                        </Text>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={16}
                          color={isSelected ? '#fff' : '#9CA3AF'}
                          style={{ marginLeft: 4 }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* PURPOSE INPUT */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{hi ? 'बुकिंग का उद्देश्य *' : 'Purpose of Booking *'}</Text>
              <TextInput
                style={styles.purposeInput}
                value={bookingPurpose}
                onChangeText={setBookingPurpose}
                placeholder={hi ? 'यहाँ लिखें कि आप इसे क्यों बुक कर रहे हैं...' : 'Write why you are booking this...'}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                maxLength={200}
              />
            </View>

            {/* PAYMENT METHOD */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{hi ? 'भुगतान का तरीका (केवल वॉलेट)' : 'Payment Method (Wallet Only)'}</Text>
              <View style={styles.paymentMethodRow}>
                <View
                  style={[styles.paymentMethodBox, styles.paymentMethodBoxActive]}
                >
                  <Ionicons name="wallet-outline" size={24} color={GREEN_DARK} />
                  <Text style={[styles.paymentMethodText, { color: GREEN_DARK }]}>
                    {hi ? 'वॉलेट' : 'Wallet'}
                  </Text>
                </View>
              </View>
              <Text style={styles.walletBalanceText}>
                {hi ? `उपलब्ध वॉलेट बैलेंस: ` : `Available Wallet Balance: `} 
                <Text style={{ fontWeight: 'bold' }}>₹{walletInfo.walletBalance || 0}</Text>
              </Text>
            </View>

            {/* TOTAL AND BUTTON */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>
                  {t.totalPrice} ({priceType === 'kattha' ? `${katthaCount} ${hi ? 'कट्ठा' : 'kattha'}` : priceType === 'hourly' ? `${hours} ${hi ? 'घंटे' : 'hrs'}` : `${daysCount} ${hi ? 'दिन' : 'days'}`})
                </Text>
                <Text style={styles.totalValue}>₹{getPrice()}</Text>
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, bookingLoading && { opacity: 0.7 }]}
                onPress={confirmBooking}
                activeOpacity={0.9}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {t.bookNow}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDateModal(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={GREEN_DARK}
            />
            <Text style={styles.successTitle}>{t.successTitle}</Text>
            {bookingData && (
              <>
                <Text style={styles.successMessage}>
                  {hi
                    ? 'आपकी बुकिंग सफल रही।'
                    : 'Your booking was successful.'}
                </Text>
                <View style={styles.successDetailsBox}>
                  <Text style={styles.successDetailLine}>
                    {t.date}: {new Date(bookingData.selectedDate).getDate()} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(bookingData.selectedDate).getMonth()]} {new Date(bookingData.selectedDate).getFullYear()}
                  </Text>
                  <Text style={styles.successDetailLine}>
                    {hi ? 'शुरुआत का समय' : 'Start Time'}: {bookingData.startTime}
                  </Text>
                  <Text style={styles.successDetailLine}>
                    {hi ? 'अवधि' : 'Duration'}: {bookingData.duration} {bookingData.priceType === 'kattha' ? (hi ? 'कट्ठा' : 'kattha') : bookingData.priceType === 'hourly' ? (hi ? 'घंटे' : 'hrs') : (hi ? 'दिन' : 'days')}
                  </Text>
                  <Text style={styles.successDetailLine}>
                    {t.totalPrice}: <Text style={{ color: GREEN_DARK, fontWeight: '900' }}>₹{bookingData.totalPrice}</Text>
                  </Text>
                </View>
              </>
            )}
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setShowSuccess(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.successBtnText}>{t.closeBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* VOICE SEARCH MODAL */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="fade"
      >
        <View style={styles.voiceModalOverlay}>
          <TouchableOpacity
            style={styles.voiceCloseTop}
            onPress={() => setShowVoiceModal(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <View style={styles.voiceContent}>
            <Text style={styles.voiceTitle}>
              {hi ? 'हम सुन रहे हैं...' : 'Listening...'}
            </Text>
            <Text style={styles.voiceSubTitle}>
              {hi ? 'उपकरण या मालिक का नाम बोलें' : 'Speak equipment or owner name'}
            </Text>

            <View style={styles.pulseWrapper}>
              <Animated.View
                style={[
                  styles.pulseCircle,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              />
              <TouchableOpacity
                onPress={stopSpeech}
                style={styles.micLargeBtn}
              >
                <Ionicons name="mic" size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.voiceStopBtn}
              onPress={stopSpeech}
            >
              <Text style={styles.voiceStopText}>
                {hi ? 'खोजें' : 'Search Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EQUIPMENT/LABOUR DETAILS MODAL */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedEquipmentForDetails && (
                <>
                  <View style={styles.detailImageWrapper}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{ width: '100%', height: '100%' }}
                      onMomentumScrollEnd={(e) => {
                        const contentOffset = e.nativeEvent.contentOffset.x;
                        const index = Math.round(contentOffset / SCREEN_WIDTH);
                        setCurrentImageIndex(index);
                      }}
                    >
                      {selectedEquipmentForDetails.allImages?.map((imageUri: string, index: number) => (
                        <Image
                          key={index}
                          source={{ uri: imageUri }}
                          style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                    
                    {/* Image Counter Overlay */}
                    {selectedEquipmentForDetails.allImages?.length > 1 && (
                      <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                          {currentImageIndex + 1} / {selectedEquipmentForDetails.allImages.length}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.detailCloseBtn}
                      onPress={() => setShowDetailModal(false)}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailBody}>
                    <View style={styles.detailHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailName}>
                          {selectedEquipmentForDetails.name}
                        </Text>
                        <View style={styles.detailOwnerRow}>
                          <Ionicons
                            name={mode === 'tractor' ? 'person-outline' : 'business-outline'}
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.detailOwnerName}>
                            {selectedEquipmentForDetails.owner}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailDivider} />

                    {selectedEquipmentForDetails.subMachinery && selectedEquipmentForDetails.subMachinery.length > 0 && (
                      <View style={{ marginBottom: 20 }}>
                        <Text style={styles.detailSectionTitle}>
                          {hi ? 'मशीन का विवरण (अटैचमेंट चुनें)' : 'Machine Details (Select Attachments)'}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {selectedEquipmentForDetails.subMachinery.map((sub: any, idx: number) => {
                            const isSelected = selectedAttachments.includes(sub.name);
                            return (
                               <View key={idx} style={{ width: 70, alignItems: 'center', marginBottom: 10 }}>
                                 <TouchableOpacity
                                   onPress={() => {
                                     if (isSelected) {
                                       setSelectedAttachments([]);
                                     } else {
                                       setSelectedAttachments([sub.name]);
                                     }
                                   }}
                                   activeOpacity={0.8}
                                   style={{
                                     width: 70,
                                     height: 70,
                                     borderWidth: isSelected ? 3 : 2,
                                     borderColor: isSelected ? GREEN_DARK : '#000000',
                                     borderRadius: 8,
                                     backgroundColor: '#fff',
                                     overflow: 'hidden',
                                     justifyContent: 'center',
                                     alignItems: 'center',
                                     padding: 2
                                   }}
                                 >
                                   {sub.image ? (
                                     <Image
                                       source={{ uri: sub.image.startsWith('http') ? sub.image : `${IMAGE_BASE_URL}/${sub.image.replace(/^\//, '')}` }}
                                       style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                     />
                                   ) : (
                                     <Ionicons name="construct" size={24} color="#9CA3AF" />
                                   )}
                                   <View style={{ position: 'absolute', bottom: 2, backgroundColor: isSelected ? GREEN_DARK : 'rgba(0,0,0,0.6)', paddingHorizontal: 4, borderRadius: 4 }}>
                                     <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>₹{sub.priceDay}</Text>
                                   </View>
                                   {isSelected && (
                                     <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: GREEN_DARK, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                                       <Ionicons name="checkmark" size={12} color="#fff" />
                                     </View>
                                   )}
                                 </TouchableOpacity>
                                 <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2, fontWeight: '600' }} numberOfLines={1}>{sub.name}</Text>
                               </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <Text style={styles.detailSectionTitle}>
                      {hi ? 'विवरण' : 'Description'}
                    </Text>
                    <Text style={styles.detailDescription}>
                      {selectedEquipmentForDetails.description}
                    </Text>

                    {(() => {
                      const orig = selectedEquipmentForDetails.originalItem || {};
                      let dPrice = Number(orig.priceDay || orig.ratePerDay) || 0;
                      let kPrice = Number(orig.priceKattha) || 0;
                      let hPrice = Number(orig.priceHour || orig.ratePerHour) || 0;

                      if (selectedAttachments.length > 0) {
                        const sub = selectedEquipmentForDetails.subMachinery?.find((s: any) => s.name === selectedAttachments[0]);
                        if (sub) {
                          dPrice += (Number(sub.priceDay) || 0);
                          kPrice += (Number(sub.priceKattha) || 0);
                          hPrice += Math.round(Number(sub.priceDay || 0) / 8);
                        }
                      }

                      return (
                        <View style={styles.detailPricingCard}>
                          <Text style={styles.detailPricingTitle}>{hi ? 'किराया विवरण' : 'Pricing Details'}</Text>
                          <View style={styles.detailPriceRow}>
                            <View style={styles.detailPriceItem}>
                              <Text style={styles.detailPriceLabel}>{mode === 'tractor' ? (hi ? 'कट्ठा' : 'Kattha') : (hi ? 'घंटा' : 'Hour')}</Text>
                              <Text style={styles.detailPriceValue}>₹{mode === 'tractor' ? kPrice : hPrice}</Text>
                            </View>
                            <View style={styles.detailPriceVerticalDivider} />
                            <View style={styles.detailPriceItem}>
                              <Text style={styles.detailPriceLabel}>{hi ? 'दिन' : 'Day'}</Text>
                              <Text style={styles.detailPriceValue}>₹{dPrice}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {selectedEquipmentForDetails.skillDescription ? (
                      <>
                        <Text style={[styles.detailSectionTitle, { marginTop: 12 }]}>
                          {hi ? 'कौशल विवरण' : 'Skill Description'}
                        </Text>
                        <Text style={[styles.detailDescription, { fontStyle: 'italic', color: '#4B5563' }]}>
                          "{selectedEquipmentForDetails.skillDescription}"
                        </Text>
                      </>
                    ) : null}

                    <View style={styles.detailSpecsGrid}>
                      <View style={styles.detailSpecItem}>
                        <Ionicons name="location-outline" size={18} color={GREEN_DARK} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.detailSpecLabel}>{hi ? 'दूरी' : 'Distance'}</Text>
                          <Text style={styles.detailSpecValue}>{selectedEquipmentForDetails.distance} km</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={{ height: 20 }} />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.detailBookBtn}
                onPress={() => {
                  if (selectedEquipmentForDetails.subMachinery?.length > 0 && selectedAttachments.length === 0) {
                    alert(hi ? 'कृपया बुकिंग के लिए कम से कम एक सब-मशीनरी (अटैचमेंट) चुनें!' : 'Please select at least one sub-machinery (attachment) for booking!');
                    return;
                  }
                  setShowDetailModal(false);
                  handleBook(selectedEquipmentForDetails);
                }}
              >
                <Text style={styles.detailBookBtnText}>{t.bookNow}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Detail Modal Styles
  detailModalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  detailImageWrapper: {
    width: '100%',
    height: SCREEN_WIDTH,
    backgroundColor: '#E5E7EB',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBody: {
    padding: 20,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  detailOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailOwnerName: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '600',
  },
  detailRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  detailRatingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 4,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  detailSpecsGrid: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  detailSpecItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailSpecLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailSpecValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  detailPricingCard: {
    marginTop: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  detailPricingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 12,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailPriceItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailPriceLabel: {
    fontSize: 12,
    color: '#166534',
    opacity: 0.8,
  },
  detailPriceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#166534',
    marginTop: 2,
  },
  detailPriceVerticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#DCFCE7',
  },
  detailFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: GREEN_DARK,
    marginRight: 10,
  },
  detailCallBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN_DARK,
    marginLeft: 8,
  },
  detailBookBtn: {
    flex: 1,
    backgroundColor: GREEN_DARK,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  detailBookBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  modeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#F9FAFB',
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modeChipRight: {
    marginRight: 0,
    marginLeft: 8,
  },
  modeChipActive: {
    backgroundColor: GREEN_DARK,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  micBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5F4D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  dropdownContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownBtnText: {
    flex: 1,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#00000030',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#111827',
  },

  categorySection: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: GREEN_DARK,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  scroll: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  equipmentCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  equipmentCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 220, // equal height for all cards
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#ECFDF3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    minHeight: 120,
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  availabilityPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
  },

  cardContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  ownerText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  metaText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 3,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E5F4D8',
  },
  calendarBtnText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
    color: GREEN_DARK,
  },
  bookBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: GREEN_DARK,
  },
  bookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContent: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 6,
  },
  dayChipActive: {
    backgroundColor: GREEN_DARK,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },

  priceTypeRow: {
    flexDirection: 'row',
  },
  priceTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginRight: 8,
  },
  priceTypeChipActive: {
    backgroundColor: GREEN_DARK,
  },
  priceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  priceTypeTextActive: {
    color: '#FFFFFF',
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GREEN_DARK,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentChipActive: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  attachmentImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: '#E5E7EB',
  },
  attachmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  successContainer: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDetailsBox: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginBottom: 12,
  },
  successDetailLine: {
    fontSize: 12,
    color: '#111827',
    marginBottom: 4,
  },
  successBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GREEN_DARK,
  },
  successBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // VOICE MODAL STYLES
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCloseTop: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  voiceContent: {
    alignItems: 'center',
    width: '100%',
  },
  voiceTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  voiceSubTitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 60,
  },
  pulseWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(152, 205, 6, 0.3)',
  },
  micLargeBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  voiceStopBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
  },
  voiceStopText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // New Booking Overhaul Styles
  timeSection: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  timePickerText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  purposeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 60,
    marginTop: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paymentMethodBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F9FAFB',
    position: 'relative'
  },
  paymentMethodBoxActive: {
    borderColor: GREEN_DARK,
    backgroundColor: '#ECFDF5',
  },
  paymentMethodText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  walletBalanceText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  counterText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginHorizontal: 12,
  },
  availabilityStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
