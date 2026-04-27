import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useLibrary } from '../../src/hooks/useLibrary';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/api/supabase';

const { width } = Dimensions.get('window');

export default function LibrarianDashboard() {
  const user = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const { books, borrows } = useLibrary();
  
  // Real data fetching
  const { data: allBooks } = books.list();
  const { data: allBorrows } = borrows.listAll();

  // Accurate aggregates
  const totalCopies = allBooks?.reduce((sum, b) => sum + (b.total_copies || 0), 0) || 0;
  const activeBorrows = allBorrows?.filter(b => b.status === 'BORROWED').length || 0;
  const pendingApprovals = allBorrows?.filter(b => b.status === 'PENDING').length || 0;
  const [duplicateCount, setDuplicateCount] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    const checkDupes = async () => {
      const { data } = await supabase.rpc('get_duplicate_books');
      if (isMounted) {
        setDuplicateCount(data?.length || 0);
      }
    };
    checkDupes();
    return () => { isMounted = false; };
  }, [allBooks]);

  const stats = [
    { label: 'Tổng số sách', value: totalCopies, icon: 'library', bgColor: '#3A75F2', flex: 1.6 },
    { label: 'Đang mượn', value: activeBorrows, icon: 'book', bgColor: '#10B981', flex: 1.2 },
    { label: 'Chờ duyệt', value: pendingApprovals, icon: 'time', bgColor: '#F59E0B', flex: 0.8 },
  ];

  const actions = [
    { 
      title: 'Quét trả sách', 
      subtitle: 'Trả sách nhanh qua mã ISBN', 
      icon: 'scan-outline', 
      iconBg: '#1C2541',
      iconColor: '#3A75F2',
      onPress: () => router.push('/(librarian)/books')
    },
    { 
      title: 'Duyệt mượn sách', 
      subtitle: 'Xử lý các yêu cầu đang chờ', 
      icon: 'checkmark-circle-outline', 
      iconBg: '#132A24',
      iconColor: '#10B981',
      onPress: () => router.push('/(librarian)/borrows')
    },
    { 
      title: 'Thêm sách mới', 
      subtitle: 'Nhập sách vào kho hệ thống', 
      icon: 'add-circle-outline', 
      iconBg: '#23153A',
      iconColor: '#A855F7',
      onPress: () => router.push('/(librarian)/books')
    },
    { 
      title: 'Báo cáo thống kê', 
      subtitle: 'Xem hiệu suất thư viện', 
      icon: 'stats-chart', 
      iconBg: '#301F0E',
      iconColor: '#F59E0B',
      onPress: () => router.push('/(librarian)/reports')
    },
    { 
      title: 'Dọn dẹp sách trùng', 
      subtitle: 'Tìm và hợp nhất các đầu sách lặp', 
      icon: 'trash-outline', 
      iconBg: '#1A1D2E',
      iconColor: '#FF6B6B',
      onPress: () => router.push('/(librarian)/cleanup')
    },
    { 
      title: 'Nguồn Metadata', 
      subtitle: 'Quản lý các API lấy thông tin sách', 
      icon: 'globe-outline', 
      iconBg: '#1C2541',
      iconColor: '#3A75F2',
      onPress: () => router.push('/(librarian)/sources')
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F121D" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Minimal Header with Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Xin chào, {user?.full_name?.split(' ')[0] || 'Thủ thư'}</Text>
            <Text style={styles.name}>BiblioTech Premium</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* DUPLICATE WARNING BANNER */}
        {duplicateCount > 0 && (
          <TouchableOpacity 
            style={styles.dupeBanner} 
            onPress={() => router.push('/(librarian)/cleanup')}
            activeOpacity={0.9}
          >
            <View style={styles.dupeBannerContent}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.dupeBannerText}>
                Phát hiện {duplicateCount} nhóm sách trùng lặp cần xử lý!
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Row - Exact Visual Match */}
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard, 
                { backgroundColor: stat.bgColor, flex: stat.flex },
                index !== stats.length - 1 && { marginRight: 12 }
              ]}
            >
              <View style={styles.statTop}>
                <Ionicons name={stat.icon as any} size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Hành động nhanh</Text>
        <View style={styles.actionList}>
          {actions.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.actionCard} 
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.iconBg }]}>
                <Ionicons name={action.icon as any} size={24} color={action.iconColor} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2A314A" />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F121D', // Exact background from screenshot
  },
  scroll: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcome: {
    fontSize: 13,
    color: '#8A8F9E',
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    height: 90,
  },
  statCard: {
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Fix vertical alignment
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  actionList: {
    paddingHorizontal: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B2B', // The action card background exact match
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6E768F',
  },
  dupeBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    overflow: 'hidden',
  },
  dupeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  dupeBannerText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '700',
  },
});
