import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLibrary } from '../../../src/hooks/useLibrary';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function AudiobookCatalog() {
  const router = useRouter();
  const { audiobooks } = useLibrary();
  const { data: books, isLoading } = audiobooks.list();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = books?.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Audiobooks</Text>
          <Text style={styles.subtitle}>Nghe sách mọi lúc, mọi nơi</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#5A5F7A" style={{ marginLeft: 16 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm sách nói..."
          placeholderTextColor="#5A5F7A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3A75F2" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.grid}>
            {filteredBooks?.map((book, index) => (
              <Animated.View 
                key={book.id} 
                entering={FadeInDown.delay(index * 50).duration(500)}
                style={styles.cardWrapper}
              >
                <TouchableOpacity 
                  style={styles.card}
                  onPress={() => router.push(`/(member)/audiobooks/${book.id}` as any)}
                >
                  <Image source={book.cover_url ? { uri: book.cover_url } : undefined} style={styles.cover} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.overlay}>
                    <View style={styles.playIcon}>
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                      <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
                      <View style={styles.durationRow}>
                        <Ionicons name="time-outline" size={12} color="#8A8F9E" />
                        <Text style={styles.durationText}>{book.duration || '24:00'}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#171B2B', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#8A8F9E', fontSize: 13, marginTop: 2 },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#151929', 
    marginHorizontal: 24, 
    borderRadius: 16, 
    height: 52, 
    borderWidth: 1, 
    borderColor: '#1E2540',
    marginBottom: 20
  },
  searchInput: { flex: 1, marginLeft: 12, color: '#FFFFFF', fontSize: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardWrapper: { width: '48%', marginBottom: 16 },
  card: { height: 260, borderRadius: 20, overflow: 'hidden', backgroundColor: '#171B2B' },
  cover: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', padding: 12, justifyContent: 'flex-end' },
  playIcon: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#3A75F2', 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  info: {},
  bookTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  author: { color: '#8A8F9E', fontSize: 11, marginTop: 2 },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  durationText: { color: '#8A8F9E', fontSize: 10, fontWeight: '600' }
});
