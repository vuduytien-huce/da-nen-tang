import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useLibrary } from '../../src/hooks/useLibrary';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function MemberHome() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const { books, borrows } = useLibrary();

  const { data: bookList } = books.list();
  const { data: myBorrows } = borrows.list();

  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const categories = ['Tất cả', 'Văn học', 'Khoa học', 'Lịch sử', 'Công nghệ', 'Nghệ thuật'];

  // Real-time stats & Overdue logic
  const activeBorrowedCount = myBorrows?.filter(b => b.status === 'BORROWED').length || 0;
  const totalFine = myBorrows?.reduce((acc, r) => acc + ((r as any).estimated_fine || 0), 0) || 0;
  const hasOverdue = myBorrows?.some(b => b.status === 'BORROWED' && b.due_date && new Date(b.due_date) < new Date());

  const featuredBooks = bookList?.slice(0, 5) || [];

  const stats = [
    { label: 'Đang mượn', value: activeBorrowedCount, icon: 'book', bgColor: '#3A75F2', flex: 1 },
    { label: 'Tổng số sách', value: bookList?.length || 0, icon: 'library', bgColor: '#10B981', flex: 1 },
    { label: 'Hạn mức phí', value: (totalFine > 0 ? (totalFine/1000 + 'k') : '5cuốn'), icon: 'card', bgColor: totalFine > 0 ? '#EF4444' : '#F59E0B', flex: 1 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F121D" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section with Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Xin chào, {profile?.fullName?.split(' ')[0] || 'Độc giả'}</Text>
            <Text style={styles.nameText}>BiblioTech Member</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.push('/(member)/search')} style={styles.iconBtn}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(member)/settings')} style={[styles.iconBtn, { marginLeft: 12 }]}>
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={[styles.iconBtn, { marginLeft: 12, backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* OVERDUE ALERT BANNER */}
        {(hasOverdue || totalFine > 0) && (
          <TouchableOpacity 
            style={styles.overdueBanner} 
            onPress={() => router.push('/(member)/history')}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#FF6B6B', '#EE5253']} style={styles.bannerGradient}>
              <Ionicons name="warning" size={22} color="#FFFFFF" />
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerTitle}>Cảnh báo quá hạn & Phí phạt</Text>
                <Text style={styles.bannerSubtitle}>
                  Bạn có {totalFine.toLocaleString()}đ phí phạt cần xử lý.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Sync Stats Cards - Matching Librarian Classic Layout */}
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard, 
                { backgroundColor: stat.bgColor, flex: stat.flex },
                index !== stats.length - 1 && { marginRight: 10 }
              ]}
            >
              <View style={styles.statTop}>
                <Ionicons name={stat.icon as any} size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Featured Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Khám phá sách hay</Text>
          <TouchableOpacity onPress={() => router.push('/(member)/search')}>
            <Text style={styles.viewAll}>Tất cả</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
          {featuredBooks.map((book) => (
            <TouchableOpacity 
              key={book.id} 
              style={styles.featuredCard}
              onPress={() => router.push(`/(member)/search`)}
            >
              <Image source={{ uri: book.cover_url }} style={styles.featuredImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featuredOverlay}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{book.title}</Text>
                <Text style={styles.featuredAuthor}>{book.author}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Genre Chips */}
        <Text style={styles.sectionTitle}>Chủ đề</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveCategory(cat)}
              style={[styles.categoryChip, activeCategory === cat && styles.activeChip]}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Books Grid */}
        <View style={styles.booksGrid}>
          {bookList?.slice(5, 9).map((book) => (
            <TouchableOpacity 
              key={book.id} 
              style={styles.bookGridItem}
              onPress={() => router.push(`/(member)/search`)}
            >
              <Image source={{ uri: book.cover_url }} style={styles.gridImage} />
              <Text style={styles.gridTitle} numberOfLines={1}>{book.title}</Text>
              <Text style={styles.gridAuthor}>{book.author}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F121D' },
  scrollContent: { paddingBottom: 100 },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  welcomeText: { color: '#8A8F9E', fontSize: 13, marginBottom: 2 },
  nameText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  iconBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#171B2B', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  overdueBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    height: 80,
  },
  statCard: {
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 20, marginBottom: 16 },
  viewAll: { color: '#3A75F2', fontSize: 13, fontWeight: '600' },
  carousel: { paddingLeft: 20, marginBottom: 30 },
  featuredCard: { width: width * 0.7, height: 180, marginRight: 12, borderRadius: 20, overflow: 'hidden' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 16, height: '60%', justifyContent: 'flex-end'
  },
  featuredTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  featuredAuthor: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  categoryScroll: { paddingLeft: 20, marginBottom: 30 },
  categoryChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: '#171B2B', 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  activeChip: { backgroundColor: '#3A75F2', borderColor: '#3A75F2' },
  categoryText: { color: '#6E768F', fontSize: 13, fontWeight: '700' },
  activeCategoryText: { color: '#FFFFFF' },
  booksGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 20, 
    justifyContent: 'space-between' 
  },
  bookGridItem: { width: '47%', marginBottom: 20 },
  gridImage: { width: '100%', height: 210, borderRadius: 16, marginBottom: 10 },
  gridTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  gridAuthor: { color: '#6E768F', fontSize: 11, marginTop: 2 },
});
