import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Share, Modal, FlatList, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLibrary, useSocial } from '../../../src/hooks/useLibrary';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { Audio } from 'expo-av';
import { booksService } from '../../../src/features/books/books.service';

const { width: windowWidth } = Dimensions.get('window');
const width = Platform.OS === 'web' ? Math.min(windowWidth, 400) : windowWidth;

export default function AudioPlayerScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { audiobooks } = useLibrary();
  const { data: book } = audiobooks.getById(id as string);

  const getLocalizedTitle = (b: any) => {
    let title = i18n.language === 'en' ? (b.title_en || b.title) : (b.title_vi || b.title);
    if (i18n.language === 'en' && b.language === 'vi') {
      title += ` (${t("audiobooks.audio_vietnamese", "Audio Vietnamese")})`;
    }
    return title;
  };

  const getLocalizedAuthor = (b: any) => {
    if (i18n.language === 'en') {
      return b.author_en || b.canonical_author || b.author || t("common.updating", "Đang cập nhật");
    }
    return b.author_vi || b.canonical_author || b.author || t("common.updating", "Đang cập nhật");
  };

  const getLocalizedNarrator = (b: any) => {
    if (i18n.language === 'en') {
      return b.narrator_en || b.narrator;
    }
    return b.narrator_vi || b.narrator;
  };

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number | null>(null);
  
  const { isLiked, isBookmarked, toggleLike, toggleBookmark } = useSocial(id as string, 'AUDIOBOOK');
  
  const rotation = useSharedValue(0);

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      
      const actualChapterIndex = currentChapterIdx !== null ? currentChapterIdx : (book?.chapters?.[0]?.index || 1);
      
      // Save position every 10 seconds or when finished
      if (status.positionMillis % 10000 < 500 || status.didJustFinish) {
        AsyncStorage.setItem(`audio_pos_${id}_${actualChapterIndex}`, status.positionMillis.toString());
        AsyncStorage.setItem(`audio_chapter_${id}`, actualChapterIndex.toString());
      }

      // Automatically play next chapter if finished
      if (status.didJustFinish && book?.chapters) {
        const sortedChapters = [...book.chapters].sort((a, b) => a.index - b.index);
        const currentIndexInArray = sortedChapters.findIndex(c => c.index === actualChapterIndex);
        if (currentIndexInArray !== -1 && currentIndexInArray < sortedChapters.length - 1) {
           const nextChapter = sortedChapters[currentIndexInArray + 1];
           setCurrentChapterIdx(nextChapter.index);
        }
      }
    }
  };

  useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    let isMounted = true;

    async function loadSound() {
      if (!book) return;

      let actualChapterIndex = currentChapterIdx;
      if (actualChapterIndex === null) {
        const savedChapter = await AsyncStorage.getItem(`audio_chapter_${id}`);
        actualChapterIndex = savedChapter ? parseInt(savedChapter) : (book.chapters?.[0]?.index || 1);
        if (isMounted) {
          setCurrentChapterIdx(actualChapterIndex);
        }
      }

      const audioUrl = booksService.getChapterUrl(book, actualChapterIndex!);
      if (!audioUrl) return;
      
      try {
        // Get saved position and speed
        const savedPos = await AsyncStorage.getItem(`audio_pos_${id}_${actualChapterIndex}`);
        const savedSpeed = await AsyncStorage.getItem(`audio_speed_${id}`);
        const initialPos = savedPos ? parseInt(savedPos) : 0;
        const initialSpeed = savedSpeed ? parseFloat(savedSpeed) : 1.0;

        if (isMounted) {
          setPlaybackSpeed(initialSpeed);
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { 
            shouldPlay: true, 
            rate: initialSpeed, 
            shouldCorrectPitch: true,
            positionMillis: initialPos
          },
          onPlaybackStatusUpdate
        );

        if (!isMounted) {
          await newSound.unloadAsync();
          return;
        }

        currentSound = newSound;
        setSound(newSound);
        setIsLoaded(true);
        setPosition(initialPos);
      } catch (error) {
        console.error('Error loading sound', error);
      }
    }

    if (sound) {
      sound.unloadAsync().then(loadSound);
    } else {
      loadSound();
    }

    return () => {
      isMounted = false;
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [book?.id, currentChapterIdx]);

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
    await AsyncStorage.setItem(`audio_speed_${id}`, nextSpeed.toString());
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
        message: t("audiobooks.sharing_message", `Đang nghe "${book?.title}" trên BiblioTech! 🎧`),
        url: book?.source_url
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (!book) return <SafeAreaView style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1E2540', '#0B0F1A']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("audiobooks.now_playing", "Đang phát")}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.title} numberOfLines={2}>{getLocalizedTitle(book)}</Text>
          <Text style={styles.author}>{getLocalizedAuthor(book)}</Text>
          {getLocalizedNarrator(book) && (
            <Text style={styles.narrator}>
              {t("audiobooks.narrator", "Giọng đọc")}: {getLocalizedNarrator(book)}
            </Text>
          )}
          
          <View style={styles.interactionRow}>
            <TouchableOpacity onPress={toggleLike} style={styles.interactionBtn}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#EF4444" : "#FFFFFF"} />
              <Text style={styles.interactionText}>{isLiked ? t("audiobooks.liked", "Đã thích") : t("audiobooks.like", "Thích")}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleBookmark} style={styles.interactionBtn}>
              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={isBookmarked ? "#3A75F2" : "#FFFFFF"} />
              <Text style={styles.interactionText}>{isBookmarked ? t("audiobooks.saved", "Đã lưu") : t("audiobooks.save", "Lưu lại")}</Text>
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

        </View>
      </ScrollView>

      <View style={styles.footerControls}>
        <TouchableOpacity 
          style={Platform.OS === 'web' ? [styles.footerBtn, { cursor: 'pointer' as any }] : styles.footerBtn}
          onPress={changeSpeed}
        >
          <Text style={styles.speedText}>{playbackSpeed}x</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={Platform.OS === 'web' ? [styles.footerBtn, { cursor: 'pointer' as any }] : styles.footerBtn}
          onPress={() => setShowChaptersModal(true)}
        >
          <Ionicons name="list-outline" size={22} color="#8A8F9E" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={Platform.OS === 'web' ? [styles.footerBtn, sleepTimer !== null && styles.activeFooterBtn, { cursor: 'pointer' as any }] : [styles.footerBtn, sleepTimer !== null && styles.activeFooterBtn]}
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
            <Text style={styles.modalTitle}>{t("audiobooks.sleep_timer", "Hẹn giờ tắt")}</Text>
            {[15, 30, 45, 60].map(mins => (
              <TouchableOpacity 
                key={mins} 
                style={styles.modalOption}
                onPress={() => {
                  setSleepTimer(mins * 60);
                  setShowSleepModal(false);
                }}
              >
                <Text style={styles.optionText}>{mins} {t("audiobooks.minutes_short", "phút")}</Text>
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
              <Text style={[styles.optionText, { color: '#EF4444' }]}>{t("audiobooks.turn_off_timer", "Tắt hẹn giờ")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSleepModal(false)}>
              <Text style={styles.closeModalText}>{t("audiobooks.close", "Đóng")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chapters Modal */}
      <Modal visible={showChaptersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>{t("audiobooks.chapters", "Danh sách chương")}</Text>
            <FlatList
              data={book?.chapters?.length ? [...book.chapters].sort((a,b) => a.index - b.index) : [{ index: 1, title: t("audiobooks.full_book", "Toàn bộ sách"), duration_seconds: null }]}
              keyExtractor={item => item.index.toString()}
              renderItem={({ item }) => {
                const isActive = (currentChapterIdx !== null ? currentChapterIdx : (book?.chapters?.[0]?.index || 1)) === item.index;
                return (
                  <TouchableOpacity 
                    style={[styles.modalOption, isActive && { backgroundColor: 'rgba(58, 117, 242, 0.1)' }]}
                    onPress={async () => {
                      if (!isActive) {
                         setCurrentChapterIdx(item.index);
                      }
                      setShowChaptersModal(false);
                    }}
                  >
                    <Text style={[styles.optionText, isActive && { color: '#3A75F2', fontWeight: 'bold' }]}>{item.title}</Text>
                    {!!item.duration_seconds && <Text style={styles.chapterTime}>{booksService.formatDuration(item.duration_seconds)}</Text>}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowChaptersModal(false)}>
              <Text style={styles.closeModalText}>{t("audiobooks.close", "Đóng")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  scrollContent: { paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
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
  narrator: { color: '#5A5F7A', fontSize: 13, marginTop: 4, fontWeight: '500' },
  interactionRow: { flexDirection: 'row', gap: 24, marginTop: 24 },
  interactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  interactionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  controlsSection: { marginTop: 40, paddingHorizontal: 30 },
  sliderRow: { marginBottom: 30 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  timeText: { color: '#5A5F7A', fontSize: 12, fontWeight: '600' },
  mainControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', marginBottom: 16 },
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
  footerControls: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#1E2540', 
    paddingTop: 16, 
    paddingBottom: Platform.OS === 'web' ? 140 : 40, 
    paddingHorizontal: 60, 
    backgroundColor: '#0B0F1A',
    zIndex: 100
  },
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
