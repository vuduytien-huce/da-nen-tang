import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Share, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLibrary, useSocial } from '../../../src/hooks/useLibrary';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

import { Audio } from 'expo-av';
import { booksService } from '../../../src/features/books/books.service';

const { width } = Dimensions.get('window');

export default function AudioPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { audiobooks } = useLibrary();
  const { data: book } = audiobooks.getById(id as string);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { isLiked, isBookmarked, toggleLike, toggleBookmark } = useSocial(id as string, 'AUDIOBOOK');
  
  const rotation = useSharedValue(0);

  async function loadSound() {
    const audioUrl = book ? booksService.getPlaybackUrl(book) : null;
    if (!audioUrl) return;
    
    try {
      // Get saved position
      const savedPos = await AsyncStorage.getItem(`audio_pos_${id}`);
      const initialPos = savedPos ? parseInt(savedPos) : 0;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { 
          shouldPlay: false, 
          rate: playbackSpeed, 
          shouldCorrectPitch: true,
          positionMillis: initialPos
        },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsLoaded(true);
      setPosition(initialPos);
    } catch (error) {
      console.error('Error loading sound', error);
    }
  }

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      
      // Save position every 10 seconds or when finished
      if (status.positionMillis % 10000 < 500 || status.didJustFinish) {
        AsyncStorage.setItem(`audio_pos_${id}`, status.positionMillis.toString());
      }
    }
  };

  useEffect(() => {
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [book?.id]);

  const togglePlayback = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value * duration);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const changeSpeed = async () => {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (sound) {
      await sound.setRateAsync(nextSpeed, true);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sleepTimer !== null && isPlaying) {
      interval = setInterval(() => {
        setSleepTimer(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            sound?.pauseAsync();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sleepTimer, isPlaying, sound]);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = rotation.value; // Keep current rotation
    }
  }, [isPlaying]);

  const animatedDiskStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Đang nghe "${book?.title}" trên BiblioTech! 🎧`,
        url: book?.source_url
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (!book) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E2540', '#0B0F1A']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đang phát</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.diskSection}>
        <Animated.View style={[styles.diskWrapper, animatedDiskStyle]}>
          <Image 
            source={(book.canonical_cover_url || book.cover_url) ? { uri: (book.canonical_cover_url || book.cover_url)! } : undefined} 
            style={styles.diskImage} 
          />
          <View style={styles.diskCenter} />
        </Animated.View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.canonical_author || book.author || 'Đang cập nhật'}</Text>
        
        <View style={styles.interactionRow}>
          <TouchableOpacity onPress={toggleLike} style={styles.interactionBtn}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#EF4444" : "#FFFFFF"} />
            <Text style={styles.interactionText}>{isLiked ? 'Đã thích' : 'Thích'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleBookmark} style={styles.interactionBtn}>
            <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={isBookmarked ? "#3A75F2" : "#FFFFFF"} />
            <Text style={styles.interactionText}>{isBookmarked ? 'Đã lưu' : 'Lưu lại'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlsSection}>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={duration > 0 ? position / duration : 0}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#3A75F2"
            maximumTrackTintColor="#1E2540"
            thumbTintColor="#FFFFFF"
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.mainControls}>
          <TouchableOpacity 
            style={styles.subControl}
            onPress={async () => sound && await sound.setPositionAsync(Math.max(0, position - 15000))}
          >
            <Ionicons name="play-back" size={28} color="#8A8F9E" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.playBtn} 
            onPress={togglePlayback}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.subControl}
            onPress={async () => sound && await sound.setPositionAsync(Math.min(duration, position + 15000))}
          >
            <Ionicons name="play-forward" size={28} color="#8A8F9E" />
          </TouchableOpacity>
        </View>

        <View style={styles.footerControls}>
          <TouchableOpacity 
            style={styles.footerBtn}
            onPress={changeSpeed}
          >
            <Text style={styles.speedText}>{playbackSpeed}x</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.footerBtn}
            onPress={() => setShowChaptersModal(true)}
          >
            <Ionicons name="list-outline" size={22} color="#8A8F9E" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.footerBtn, sleepTimer !== null && styles.activeFooterBtn]}
            onPress={() => setShowSleepModal(true)}
          >
            <Ionicons name="moon-outline" size={20} color={sleepTimer !== null ? "#F59E0B" : "#8A8F9E"} />
            {sleepTimer !== null && (
              <Text style={styles.timerText}>{Math.floor(sleepTimer / 60)}m</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sleep Timer Modal */}
        <Modal visible={showSleepModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <Text style={styles.modalTitle}>Hẹn giờ tắt</Text>
              {[15, 30, 45, 60].map(mins => (
                <TouchableOpacity 
                  key={mins} 
                  style={styles.modalOption}
                  onPress={() => {
                    setSleepTimer(mins * 60);
                    setShowSleepModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{mins} phút</Text>
                  {sleepTimer === mins * 60 && <Ionicons name="checkmark" size={20} color="#3A75F2" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.modalOption, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setSleepTimer(null);
                  setShowSleepModal(false);
                }}
              >
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Tắt hẹn giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSleepModal(false)}>
                <Text style={styles.closeModalText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Chapters Modal */}
        <Modal visible={showChaptersModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <Text style={styles.modalTitle}>Danh sách chương</Text>
              <FlatList
                data={[
                  { id: '1', title: 'Chương 1: Khởi đầu', time: 0 },
                  { id: '2', title: 'Chương 2: Thử thách', time: 600000 },
                  { id: '3', title: 'Chương 3: Kết thúc', time: 1800000 },
                ]}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalOption}
                    onPress={async () => {
                      if (sound) {
                        await sound.setPositionAsync(item.time);
                        setShowChaptersModal(false);
                      }
                    }}
                  >
                    <Text style={styles.optionText}>{item.title}</Text>
                    <Text style={styles.chapterTime}>{formatTime(item.time)}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowChaptersModal(false)}>
                <Text style={styles.closeModalText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 60,
    zIndex: 10
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#8A8F9E', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  diskSection: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    height: width * 0.8
  },
  diskWrapper: { 
    width: width * 0.75, 
    height: width * 0.75, 
    borderRadius: (width * 0.75) / 2, 
    borderWidth: 10, 
    borderColor: '#151929',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  diskImage: { width: '100%', height: '100%' },
  diskCenter: { 
    position: 'absolute', 
    top: '40%', 
    left: '40%', 
    width: '20%', 
    height: '20%', 
    borderRadius: 100, 
    backgroundColor: '#0B0F1A',
    borderWidth: 2,
    borderColor: '#1E2540'
  },
  infoSection: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  author: { color: '#8A8F9E', fontSize: 16, marginTop: 8, fontWeight: '500' },
  interactionRow: { flexDirection: 'row', gap: 24, marginTop: 24 },
  interactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  interactionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  controlsSection: { marginTop: 40, paddingHorizontal: 30 },
  sliderRow: { marginBottom: 30 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { color: '#5A5F7A', fontSize: 12, fontWeight: '600' },
  mainControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', marginBottom: 40 },
  playBtn: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#3A75F2', 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12
  },
  subControl: { padding: 10 },
  footerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1E2540', paddingTop: 24 },
  footerBtn: { 
    paddingHorizontal: 16, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#151929', 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6
  },
  activeFooterBtn: {
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
  },
  speedText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  timerText: { color: '#F59E0B', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#151929', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  optionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  chapterTime: { color: '#8A8F9E', fontSize: 14 },
  closeModalBtn: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeModalText: { color: '#8A8F9E', fontSize: 16, fontWeight: '600' }
});
