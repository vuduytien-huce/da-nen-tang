import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useLibrary } from '../../src/hooks/useLibrary';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/api/supabase';
import { BranchMap } from '../../src/features/admin/components/BranchMap';
import { logisticsService, RedistributionSuggestion } from '../../src/services/logisticsService';

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
  
  // Làn 3: Operational Excellence & Logistics 2.0
  const [suggestions, setSuggestions] = React.useState<RedistributionSuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const fetchAiSuggestions = async () => {
    setIsAiLoading(true);
    try {
      const recs = await logisticsService.getAIRedistributionSuggestions();
      setSuggestions(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const highDemandBooks = allBooks?.filter(book => {
    const borrowCount = allBorrows?.filter(b => b.isbn === book.isbn).length || 0;
    return borrowCount >= 3; // Simple heuristic: 3+ borrows = High Demand
  }).slice(0, 3) || [];
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

  const handleSendReminders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-reminders');
      if (error) throw error;
      
      const count = data?.count || 0;
      if (count > 0) {
        Alert.alert('Thành công', `Đã gửi ${count} thông báo nhắc nhở!`);
      } else {
        Alert.alert('Thông báo', data?.message || 'Không có người dùng nào cần gửi nhắc nhở.');
      }
    } catch (err: any) {
      console.error('Error sending reminders:', err);
      Alert.alert('Lỗi', err.message || 'Không thể gửi thông báo.');
    }
  };

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
      title: t('analytics.deep_analytics'), 
      subtitle: t('analytics.staff_intelligence'), 
      icon: 'analytics', 
      iconBg: '#1C2541',
      iconColor: '#3A75F2',
      onPress: () => router.push('/(librarian)/insights')
    },
    { 
      title: t('librarian.reports_stats') || 'Báo cáo thống kê', 
      subtitle: 'Xem hiệu suất thư viện', 
      icon: 'stats-chart', 
      iconBg: '#301F0E',
      iconColor: '#F59E0B',
      onPress: () => router.push('/(librarian)/reports')
    },
    { 
      title: 'Dự báo nhu cầu AI', 
      subtitle: 'Phân tích & Dự báo tồn kho thông minh', 
      icon: 'analytics-outline', 
      iconBg: '#132A24',
      iconColor: '#10B981',
      onPress: () => router.push('/(librarian)/demand-prediction')
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
    { 
      title: 'Gửi nhắc nhở (Push)', 
      subtitle: 'Thông báo quá hạn & nợ phí', 
      icon: 'notifications-outline', 
      iconBg: '#301F0E', 
      iconColor: '#F59E0B', 
      onPress: handleSendReminders
    },
    { 
      title: 'Thông báo toàn hệ thống', 
      subtitle: 'Gửi tin tức, sự kiện (Realtime)', 
      icon: 'megaphone-outline', 
      iconBg: '#1C2541',
      iconColor: '#3A75F2',
      onPress: () => router.push('/(librarian)/broadcast')
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => router.push('/(member)/notifications' as any)} 
              style={[styles.logoutBtn, { marginRight: 12, backgroundColor: 'rgba(58, 117, 242, 0.1)' }]}
            >
              <Ionicons name="notifications-outline" size={20} color="#3A75F2" />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
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

        {/* Làn 3: Trend Analysis / Intelligence Section */}
        <Text style={styles.sectionTitle}>Bản đồ chi nhánh & Tồn kho</Text>
        <View style={styles.mapWrapper}>
          <BranchMap />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Điều phối Logistics AI</Text>
          <TouchableOpacity 
            style={styles.aiActionBtn} 
            onPress={fetchAiSuggestions}
            disabled={isAiLoading}
          >
            {isAiLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.aiActionText}>Chạy phân tích AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.intelligenceRow}>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, idx) => (
              <View key={idx} style={styles.intelligenceCard}>
                <View style={styles.intelHeader}>
                  <Ionicons name="swap-horizontal" size={16} color="#10B981" />
                  <Text style={styles.intelBadge}>GỢI Ý ĐIỀU CHUYỂN</Text>
                  <Text style={styles.confidenceText}>{Math.round(suggestion.confidence * 100)}% Match</Text>
                </View>
                <Text style={styles.intelTitle} numberOfLines={1}>{suggestion.book_title}</Text>
                <View style={styles.transferPath}>
                  <Text style={styles.pathBranch}>{suggestion.from_branch_name}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#3A75F2" />
                  <Text style={styles.pathBranch}>{suggestion.to_branch_name}</Text>
                </View>
                <Text style={styles.intelHint}>SL: {suggestion.quantity} cuốn - {suggestion.reason}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyIntel}>
              <Ionicons name="analytics-outline" size={32} color="#1F263B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyIntelText}>Nhấn nút phía trên để nhận gợi ý điều phối từ AI</Text>
            </View>
          )}
        </View>

        {/* Lane 20: Predictive Intelligence Section */}
        <Text style={styles.sectionTitle}>{t('analytics.ai_intelligence')}</Text>
        <View style={styles.intelligenceRow}>
          <TouchableOpacity 
            style={[styles.intelligenceCard, { borderColor: 'rgba(58, 117, 242, 0.2)', backgroundColor: '#1A2138' }]}
            onPress={() => router.push('/(librarian)/demand-prediction')}
          >
            <View style={styles.intelHeader}>
              <Ionicons name="sparkles" size={16} color="#3A75F2" />
              <Text style={[styles.intelBadge, { color: '#3A75F2' }]}>{t('analytics.demand_forecast').toUpperCase()}</Text>
              <Ionicons name="chevron-forward" size={14} color="#3A75F2" style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.intelTitle}>{t('analytics.demand_forecast')}</Text>
            <Text style={styles.intelHint}>Phân tích xu hướng 90 ngày và gợi ý nhập kho.</Text>
          </TouchableOpacity>
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
  intelligenceRow: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  intelligenceCard: {
    backgroundColor: '#171B2B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  intelBadge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  intelTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  intelHint: {
    color: '#8A8F9E',
    fontSize: 11,
  },
  emptyIntel: {
    backgroundColor: '#171B2B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  emptyIntelText: {
    color: '#5A5F7A',
    fontSize: 13,
    textAlign: 'center',
  },
  mapWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A75F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  aiActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  transferPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  pathBranch: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  confidenceText: {
    marginLeft: 'auto',
    color: '#8B8FA3',
    fontSize: 10,
    fontWeight: '600',
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
