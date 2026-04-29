import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedWrapper } from '../../src/components/AnimatedWrapper';
import { AudioPlayer } from '../../src/components/AudioPlayer';
import { browseAudiobooks, AudiobookRecord, EnrichedAudiobook, enrichWithBookMetadata, getPlaybackUrl, formatDuration } from '../../src/services/audiobookMetadataService';

export default function AudiobooksScreen() {
  const [audiobooks, setAudiobooks] = useState<EnrichedAudiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<EnrichedAudiobook | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  useEffect(() => {
    loadAudiobooks();
  }, []);

  const loadAudiobooks = async () => {
    setLoading(true);
    try {
      const { data } = await browseAudiobooks({ page: 1, pageSize: 20 });
      setAudiobooks(data);
    } catch (error) {
      console.error("Failed to load audiobooks", error);
    } finally {
      setLoading(false);
    }
  };

  const openPlayer = (book: EnrichedAudiobook) => {
    const playbackUrl = getPlaybackUrl(book);
    setSelectedBook({ ...book, preview_url: playbackUrl });
    setPlayerVisible(true);
  };

  const renderBookItem = ({ item, index }: { item: EnrichedAudiobook, index: number }) => (
    <AnimatedWrapper delay={index * 100}>
      <TouchableOpacity 
        style={styles.bookCard}
        onPress={() => openPlayer(item)}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.canonical_cover_url || item.cover_url || 'https://via.placeholder.com/150' }} 
            style={styles.coverImage} 
          />
          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>{item.source_platform.toUpperCase()}</Text>
          </View>
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.canonical_author || 'Đang cập nhật'}
          </Text>
          {item.narrator && (
            <View style={styles.narratorRow}>
              <Ionicons name="mic-outline" size={11} color="#6E45E2" />
              <Text style={styles.narratorText} numberOfLines={1}>{item.narrator}</Text>
            </View>
          )}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.durationText}>
               {item.duration_seconds ? formatDuration(item.duration_seconds) : '3 giờ 20p'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedWrapper>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0F121D', '#1A1F32']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Khám phá</Text>
          <Text style={styles.headerTitle}>Sách nói</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3A75F2" />
        </View>
      ) : (
        <FlatList
          data={audiobooks}
          renderItem={renderBookItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['Tất cả', 'Phát triển bản thân', 'Kinh tế', 'Văn học', 'Tâm lý'].map((cat, i) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryTab, i === 0 && styles.activeTab]}
                  >
                    <Text style={[styles.categoryText, i === 0 && styles.activeTabText]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
        />
      )}

      <Modal
        visible={playerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedBook && (
          <AudioPlayer 
            url={selectedBook.preview_url || selectedBook.source_url}
            title={selectedBook.title}
            author={selectedBook.canonical_author || selectedBook.author || 'Tác giả ẩn danh'}
            narrator={selectedBook.narrator}
            coverUrl={selectedBook.canonical_cover_url || selectedBook.cover_url || ''}
            onClose={() => setPlayerVisible(false)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerSubtitle: {
    color: '#8A8F9E',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
  },
  activeTab: {
    backgroundColor: '#3A75F2',
  },
  categoryText: {
    color: '#8A8F9E',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  bookCard: {
    flex: 1,
    margin: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  platformBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  playIconOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A75F2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#3A75F2',
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookAuthor: {
    color: '#8A8F9E',
    fontSize: 12,
    marginBottom: 2,
  },
  narratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  narratorText: {
    color: '#6E45E2',
    fontSize: 10,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dot: {
    color: '#8A8F9E',
    marginHorizontal: 6,
  },
  durationText: {
    color: '#8A8F9E',
    fontSize: 11,
  }
});
