// app/(employee)/doctor-chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableNativeFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useI18n } from '../../context/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_GREEN = '#6bb313ff';
import { BASE_API_URL } from '../../constants/api';
import { showAlert } from '../../components/CustomAlert';
const API_URL = `${BASE_API_URL}`;
const POLL_INTERVAL = 5000; // 5 seconds

type Message = {
  id: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  audioDuration?: number;  // seconds
  createdAt: string;
  fromDoctor: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    text: 'Doctor साहब, पत्तों पर पीला दाग आ रहा है।',
    createdAt: '2:10 PM',
    fromDoctor: false,
  },
  {
    id: 'm2',
    text: 'कौन सी फसल है और कितनी उम्र हो गई है?',
    createdAt: '2:11 PM',
    fromDoctor: true,
  },
];

export default function DoctorChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const isHindi = lang === 'hi';

  const params = useLocalSearchParams<{
    chatId?: string;
    name?: string;
    phone?: string;
    village?: string;
    cropName?: string;
    isBlocked?: string;
  }>();

  const chatId = params.chatId ?? '';
  const farmerName = params.name ?? (isHindi ? 'किसान' : 'Farmer');
  const farmerPhone = params.phone ?? '';
  const village = params.village ?? '';
  const cropName = params.cropName ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playSeconds, setPlaySeconds] = useState(0);
  const [isBlocked, setIsBlocked] = useState(params.isBlocked === '1');
  const flatListRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordTimerRef = useRef<any>(null);
  const playTimerRef = useRef<any>(null);
  const recordSecondsRef = useRef(0); // avoids stale closure in stopRecording
  const [recordSeconds, setRecordSeconds] = useState(0);
  const lastMsgCountRef = useRef(0); // track message count for new message detection

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !chatId) return;
      const res = await fetch(`${API_URL}/employee/doctor-chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped: Message[] = data.map((m: any) => ({
          id: m._id,
          text: m.text,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fromDoctor: m.fromDoctor,
          audioDuration: m.audioDuration || 0,
        }));

        // Check for new farmer messages to play a local sound or update UI
        const newFarmerMsgs = mapped.filter(m => !m.fromDoctor);
        if (lastMsgCountRef.current > 0 && newFarmerMsgs.length > lastMsgCountRef.current) {
          const latest = newFarmerMsgs[newFarmerMsgs.length - 1];
          const msgText = latest.mediaType === 'image' ? '📷 Image received' : latest.mediaType === 'audio' ? '🎤 Voice message received' : latest.text;
          if (Platform.OS === 'android') {
            ToastAndroid.show(`🌾 ${farmerName}: ${msgText}`, ToastAndroid.SHORT);
          }
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/sounds/notification.mp3')
            );
            await sound.playAsync();
          } catch (e) { }
        }
        lastMsgCountRef.current = newFarmerMsgs.length;

        setMessages(mapped);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
  };

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
  }, [chatId]);

  const t = {
    placeholder: isHindi ? 'यहां message लिखें…' : 'Type a message…',
    actionBlock: isHindi ? 'Block करें' : 'Block farmer',
    actionClear: isHindi ? 'Chat clear करें' : 'Clear chat',
    actionCancel: isHindi ? 'Cancel' : 'Cancel',
  };

  const sendMessage = async () => {
    const textTrim = input.trim();
    if (!textTrim || !chatId) return;
    setInput('');

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      text: textTrim,
      createdAt: 'Now',
      fromDoctor: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/employee/doctor-chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: textTrim })
      });
    } catch (e) {
      console.error('Send message error:', e);
    }
  };

  const onPressMore = () => {
    showAlert(
      farmerName,
      isHindi ? 'इस किसान के बारे में क्या करना है?' : 'What to do with this farmer?',
      [
        {
          text: isBlocked
            ? (isHindi ? '✅ Unblock करें' : '✅ Unblock farmer')
            : (isHindi ? '🚫 Block करें' : '🚫 Block farmer'),
          style: isBlocked ? 'default' : 'destructive',
          onPress: () => toggleBlock(!isBlocked)
        },
        { text: isHindi ? 'Cancel' : 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const toggleBlock = async (block: boolean) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/employee/doctor-chats/${chatId}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ block })
      });
      const data = await res.json();
      if (res.ok) {
        setIsBlocked(data.isBlocked);
        showAlert(
          block ? (isHindi ? '🚫 Block किया' : '🚫 Farmer Blocked') : (isHindi ? '✅ Unblock किया' : '✅ Farmer Unblocked'),
          block
            ? (isHindi ? `${farmerName} को block कर दिया। Chat input band हो गया।` : `${farmerName} has been blocked. Chat input is now hidden.`)
            : (isHindi ? `${farmerName} को unblock कर दिया। अब फिर से chat हो सकती है।` : `${farmerName} has been unblocked. Chat is restored.`)
        );
      }
    } catch (e) {
      console.error('Toggle block error:', e);
    }
  };

  // Upload media helper — uploads image/audio and sends as message
  const uploadAndSendMedia = async (uri: string, type: 'image' | 'audio', duration?: number) => {
    setIsSendingMedia(true);
    const token = await AsyncStorage.getItem('userToken');
    try {
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        text: type === 'image' ? '📷 Image' : '🎤 Voice message',
        mediaUrl: uri,
        mediaType: type,
        audioDuration: duration,
        createdAt: 'Now',
        fromDoctor: true,
      };
      setMessages(prev => [...prev, optimistic]);

      const form = new FormData();
      form.append('file', { uri, name: type === 'image' ? 'photo.jpg' : 'audio.m4a', type: type === 'image' ? 'image/jpeg' : 'audio/m4a' } as any);
      const uploadRes = await fetch(`${API_URL}/employee/upload-chat-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url || uri;

      await fetch(`${API_URL}/employee/doctor-chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: type === 'image' ? '📷 Image' : '🎤 Voice message', mediaUrl, mediaType: type, audioDuration: duration })
      });
    } catch (e) {
      console.error('Upload media error:', e);
    } finally {
      setIsSendingMedia(false);
    }
  };

  // Gallery image picker — now uploads to backend
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert(isHindi ? 'Permission चाहिए' : 'Permission needed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled) {
      await uploadAndSendMedia(result.assets[0].uri, 'image');
    }
  };

  // Camera — captures and uploads
  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert(isHindi ? 'Permission चाहिए' : 'Permission needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      await uploadAndSendMedia(result.assets[0].uri, 'image');
    }
  };

  // Audio Recording — WhatsApp-like press & hold
  const startRecording = async () => {
    try {
      // Stop any playing sound first
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
      }
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { showAlert(isHindi ? 'Mic permission चाहिए' : 'Mic permission needed'); return; }
      // Always reset audio mode before recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch (e) {
      console.error('Start recording error:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      clearInterval(recordTimerRef.current);
      const dur = recordSecondsRef.current;  // Read from ref, not stale state
      setIsRecording(false);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      if (!recordingRef.current) return;
      const rec = recordingRef.current;
      recordingRef.current = null;  // Clear immediately to prevent double-stop
      await rec.stopAndUnloadAsync();
      // Reset audio mode back to playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const uri = rec.getURI();
      if (uri) await uploadAndSendMedia(uri, 'audio', dur);
    } catch (e) {
      console.error('Stop recording error:', e);
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  // Play / stop an audio message
  const playAudio = async (msgId: string, url: string) => {
    try {
      // If same message is playing, stop it
      if (playingId === msgId && soundRef.current) {
        clearInterval(playTimerRef.current);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
        setPlaySeconds(0);
        return;
      }
      // Stop any other playing sound
      if (soundRef.current) {
        clearInterval(playTimerRef.current);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setPlaySeconds(0);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(msgId);
      // Start live counter
      playTimerRef.current = setInterval(() => setPlaySeconds(s => s + 1), 1000);
      sound.setOnPlaybackStatusUpdate(status => {
        if ((status as any).didJustFinish) {
          clearInterval(playTimerRef.current);
          soundRef.current = null;
          setPlayingId(null);
          setPlaySeconds(0);
        }
      });
    } catch (e) {
      console.error('Audio playback error:', e);
      clearInterval(playTimerRef.current);
      setPlayingId(null);
      setPlaySeconds(0);
    }
  };

  const fmtSec = (s?: number) => {
    const total = s || 0;
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isOwn = item.fromDoctor;
    return (
      <View style={[styles.bubbleRow, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {item.mediaType === 'image' && item.mediaUrl ? (
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
          ) : item.mediaType === 'audio' && item.mediaUrl ? (
            <TouchableOpacity style={styles.audioMsg} onPress={() => playAudio(item.id, item.mediaUrl!)} activeOpacity={0.8}>
              <View style={[styles.playBtn, isOwn && styles.playBtnOwn]}>
                <Ionicons
                  name={playingId === item.id ? 'pause' : 'play'}
                  size={14}
                  color={isOwn ? '#16A34A' : '#374151'}
                />
              </View>
              <View style={{ marginLeft: 6 }}>
                <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                  {isHindi ? 'Voice message' : 'Voice message'}
                </Text>
                <Text style={[styles.audioDuration, isOwn && { color: '#DCFCE7' }]}>
                  {playingId === item.id ? fmtSec(playSeconds) : fmtSec(item.audioDuration)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.text}</Text>
          )}
          <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>{item.createdAt}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeRoot}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <StatusBar barStyle="light-content" backgroundColor={STATUS_GREEN} />

        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerMid}>
            <Text style={styles.nameText}>{farmerName}</Text>
            <View style={styles.subRow}>
              <Ionicons name="call-outline" size={12} color="#E5E7EB" />
              <Text style={styles.subText}>{farmerPhone}</Text>
              {!!village && (
                <>
                  <View style={styles.dotSmall} />
                  <Ionicons name="location-outline" size={12} color="#E5E7EB" />
                  <Text style={styles.subText}>{village}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="call-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconCircle, { marginLeft: 6 }]}
              onPress={onPressMore}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* CHAT LIST */}
        <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={false}
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* INPUT BAR or BLOCKED BANNER */}
        {isBlocked ? (
          <View style={styles.blockedBanner}>
            <Ionicons name="ban" size={18} color="#DC2626" />
            <Text style={styles.blockedText}>
              {isHindi ? `${farmerName} को block किया है` : `${farmerName} is blocked`}
            </Text>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => toggleBlock(false)} activeOpacity={0.8}>
              <Text style={styles.unblockBtnText}>{isHindi ? 'Unblock करें' : 'Unblock'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputBar}>
            {isRecording ? (
              <>
                <View style={styles.recordingPill}>
                  <Ionicons name="radio-button-on" size={16} color="#DC2626" />
                  <Text style={styles.recordingText}>
                    {isHindi ? 'रिकॉर्डिंग...' : 'Recording...'} {recordSeconds}s
                  </Text>
                </View>
                <Text style={styles.releaseHint}>{isHindi ? 'छोड़ें भेजने के लिए' : 'Release to send'}</Text>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.iconSmall} onPress={pickFromGallery}>
                  <Ionicons name="image-outline" size={22} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconSmall} onPress={openCamera}>
                  <Ionicons name="camera-outline" size={22} color="#6B7280" />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder={t.placeholder}
                  placeholderTextColor="#9CA3AF"
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
              </>
            )}
            {isSendingMedia ? (
              <ActivityIndicator size="small" color="#16A34A" style={{ marginLeft: 8 }} />
            ) : input.trim().length === 0 ? (
              <TouchableOpacity
                style={styles.iconCircleSmall}
                onLongPress={startRecording}
                onPressOut={isRecording ? stopRecording : undefined}
                delayLongPress={200}
              >
                <Ionicons name={isRecording ? 'stop' : 'mic-outline'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.iconCircleSmall} onPress={sendMessage} activeOpacity={0.8}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: '#E5E7EB' },
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: STATUS_GREEN,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5BA40F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: {
    flex: 1,
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subText: {
    fontSize: 11,
    color: '#E5E7EB',
    marginLeft: 2,
  },
  dotSmall: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleOwn: {
    backgroundColor: '#16A34A',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    color: '#111827',
  },
  bubbleTextOwn: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeTextOwn: {
    color: '#DCFCE7',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  iconSmall: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    fontSize: 13,
    color: '#111827',
    marginHorizontal: 4,
  },
  iconCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  mediaImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 2,
  },
  audioMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    minWidth: 140,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnOwn: {
    backgroundColor: '#FFFFFF',
  },
  audioDuration: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  recordingPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
    marginHorizontal: 4,
  },
  recordingText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  releaseHint: {
    fontSize: 11,
    color: '#6B7280',
    marginRight: 4,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  blockedText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  unblockBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  unblockBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
