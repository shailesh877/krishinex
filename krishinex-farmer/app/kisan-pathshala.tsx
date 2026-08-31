// app/kisan-pathshala.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useI18n } from '@/context/I18nContext';
import { BASE_URL } from '../services/api';
import YoutubePlayer from 'react-native-youtube-iframe';
import { showAlert } from '@/components/CustomAlert';


const GREEN_DARK = '#467804ff';

type YoutubeVideo = {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
};

export default function KisanPathshalaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useI18n();
  const hi = language === 'hi';

  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);

  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const loadVideos = async () => {
    try {
      const response = await fetch(`${BASE_URL}/videos`);
      const data = await response.json();
      
      const mapped: YoutubeVideo[] = data.map((v: any) => {
        const cleanId = extractYoutubeId(v.youtubeId);
        return {
          id: v._id,
          youtubeId: cleanId,
          title: hi ? v.titleHi : v.titleEn,
          thumbnail: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
        };
      });
      
      setVideos(mapped);
    } catch (e) {
      showAlert(
        hi ? 'वीडियो नहीं मिल पाए' : 'Unable to load videos',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [hi]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {hi ? 'किसान पाठशाला' : 'Kisan Pathshala'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* PLAYER (selected video) */}
      {selectedVideo && (
        <View style={styles.playerContainer}>
          <Text style={styles.nowPlaying}>
            {hi ? 'अभी चल रहा है' : 'Now Playing'}
          </Text>
          <Text style={styles.playingTitle} numberOfLines={2}>
            {selectedVideo.title} (ID: {selectedVideo.youtubeId})
          </Text>
          <View style={styles.playerBox}>
            <YoutubePlayer
              height={210}
              videoId={selectedVideo.youtubeId}
              play={true}
              onChangeState={(state: string) => console.log('YT State:', state)}
              onError={(e: any) => console.log('YT Error:', e)}
              onReady={() => console.log('YT Ready')}
              webViewProps={{
                androidLayerType: 'hardware',
              }}
            />
          </View>
        </View>
      )}

      {/* LIST */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 20 }}
            size="small"
            color={GREEN_DARK}
          />
        ) : (
          videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoRow}
              activeOpacity={0.85}
              onPress={() => setSelectedVideo(video)}
            >
              <Image
                source={{ uri: video.thumbnail }}
                style={styles.thumb}
              />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text
                  style={styles.videoTitle}
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
                <Text style={styles.videoMeta}>
                  {hi ? 'YouTube वीडियो' : 'YouTube video'}
                </Text>
              </View>
              <Ionicons
                name="play-circle-outline"
                size={26}
                color={GREEN_DARK}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    paddingBottom: 10,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  playerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  nowPlaying: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  playingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  playerBox: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    marginBottom: 10,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  thumb: {
    width: 96,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  videoMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
});
