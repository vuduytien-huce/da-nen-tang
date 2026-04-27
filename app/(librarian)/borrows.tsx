import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLibrary } from '../../src/hooks/useLibrary';
import { LinearGradient } from 'expo-linear-gradient';

export default function LibrarianBorrows() {
  const { borrows } = useLibrary();
  const { data: allBorrows, isLoading, refetch } = borrows.listAll();
  const approveMutation = borrows.approve;
  const rejectMutation = borrows.reject;

  const [isMounted, setIsMounted] = useState(true);
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const [filter, setFilter] = useState('PENDING');

  const filteredData = allBorrows?.filter(b => b.status === filter) || [];

  const handleApprove = (id: string) => {
    Alert.alert('Xác nhận', 'Duyệt yêu cầu mượn sách này?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Duyệt', 
        onPress: async () => {
          try {
            await approveMutation.mutateAsync(id);
            if (isMounted) Alert.alert('Thành công', 'Đã duyệt phiếu mượn');
          } catch (err: any) {
            if (isMounted) Alert.alert('Lỗi', err.message);
          }
        } 
      }
    ]);
  };

  const handleReject = (id: string) => {
    Alert.prompt('Từ chối', 'Lý do từ chối:', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async (reason) => {
          try {
            await rejectMutation.mutateAsync({ recordId: id, reason: reason || 'Không đủ điều kiện' });
            if (isMounted) Alert.alert('Thành công', 'Đã từ chối phiếu mượn');
          } catch (err: any) {
            if (isMounted) Alert.alert('Lỗi', err.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{item.book?.title}</Text>
          <Text style={styles.userInfo}>Người mượn: {item.profiles?.full_name || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color="#5A5F7A" />
          <Text style={styles.dateText}>
            Ngày yêu cầu: {new Date(item.borrowed_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        
        {item.status === 'PENDING' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]} 
              onPress={() => handleReject(item.id)}
            >
              <Ionicons name="close" size={20} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.approveBtn]} 
              onPress={() => handleApprove(item.id)}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#F59E0B';
      case 'BORROWED': return '#4F8EF7';
      case 'RETURNED': return '#10B981';
      case 'REJECTED': return '#EF4444';
      default: return '#5A5F7A';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Phiếu mượn</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color="#4F8EF7" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        {['PENDING', 'BORROWED', 'RETURNED', 'REJECTED'].map(f => (
          <TouchableOpacity 
            key={f}
            style={[styles.filterItem, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'PENDING' ? 'Chờ' : f === 'BORROWED' ? 'Đang mượn' : f === 'RETURNED' ? 'Đã trả' : 'Từ chối'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4F8EF7" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={60} color="#1E2540" />
              <Text style={styles.emptyText}>Không có phiếu mượn nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshBtn: {
    padding: 5,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#151929',
    marginRight: 10,
  },
  filterActive: {
    backgroundColor: '#4F8EF7',
  },
  filterText: {
    color: '#5A5F7A',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#151929',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 13,
    color: '#5A5F7A',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    height: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E2540',
    paddingTop: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#5A5F7A',
    fontSize: 12,
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#5A5F7A',
    marginTop: 10,
    fontSize: 16,
  }
});
