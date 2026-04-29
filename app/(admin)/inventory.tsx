import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { logisticsService } from '../../src/services/logisticsService';
import { Alert } from 'react-native';

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // 1. Fetch Branches
  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['admin_branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch AI Suggestions
  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ['inventory_suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_suggestions')
        .select('*, branch:branches(name), book:books(title)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // 3. Fetch Global Inventory Stats
  const { data: stats } = useQuery({
    queryKey: ['inventory_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_inventory').select('total_copies, available_copies');
      if (error) throw error;
      
      const total = data.reduce((acc, curr) => acc + curr.total_copies, 0);
      const available = data.reduce((acc, curr) => acc + curr.available_copies, 0);
      return { total, available, outOfStock: data.filter(i => i.available_copies === 0).length };
    }
  });

  // 4. Run AI Intelligence Mutation
  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-intelligence');
      if (error) throw error;
      refetchSuggestions();
    } catch (err: any) {
      Alert.alert('Lỗi', 'AI Analysis failed: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 5. Execute Transfer
  const { mutate: executeTransfer, isPending: isTransferring } = useMutation({
    mutationFn: async (suggestion: any) => {
      const { book_isbn, metadata } = suggestion;
      if (!metadata?.from_branch_id || !metadata?.to_branch_id) {
        throw new Error('Thiếu thông tin chi nhánh điều phối');
      }
      
      const userId = useAuthStore.getState().profile?.id;
      if (!userId) throw new Error('Unauthorized');

      return await logisticsService.executeTransfer(
        book_isbn,
        metadata.from_branch_id,
        metadata.to_branch_id,
        metadata.quantity || 1,
        userId
      );
    },
    onSuccess: (data: any) => {
      if (data.success) {
        Alert.alert('Thành công', 'Đã điều phối sách thành công!');
        queryClient.invalidateQueries({ queryKey: ['inventory_stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin_branches'] });
        refetchSuggestions();
      } else {
        Alert.alert('Lỗi', data.error || 'Điều phối thất bại');
      }
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.message);
    }
  });

  const SuggestionCard = ({ item }: any) => (
    <View style={{
      backgroundColor: '#1E2540',
      borderRadius: 20,
      padding: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#2E3654',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ backgroundColor: '#4F8EF720', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ color: '#4F8EF7', fontSize: 10, fontWeight: '800' }}>AI SUGGESTION</Text>
        </View>
        <Text style={{ color: '#5A5F7A', fontSize: 11 }}>{new Date(item.created_at).toLocaleTimeString()}</Text>
      </View>
      
      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', lineHeight: 22 }}>
        {item.suggestion_text}
      </Text>

      {item.metadata?.quantity && (
        <View style={{ flexDirection: 'row', marginTop: 16, alignItems: 'center' }}>
          <View style={{ flex: 1, backgroundColor: '#0B0F1A', padding: 12, borderRadius: 12, marginRight: 8 }}>
            <Text style={{ color: '#8B8FA3', fontSize: 10, textTransform: 'uppercase' }}>From</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{item.metadata.from_branch}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#4F8EF7" />
          <View style={{ flex: 1, backgroundColor: '#0B0F1A', padding: 12, borderRadius: 12, marginLeft: 8 }}>
            <Text style={{ color: '#8B8FA3', fontSize: 10, textTransform: 'uppercase' }}>To</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{item.metadata.to_branch}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => {
          Alert.alert(
            'Xác nhận điều phối',
            `Bạn có chắc chắn muốn chuyển ${item.metadata?.quantity || 1} cuốn "${item.book?.title || item.book_isbn}" từ ${item.metadata?.from_branch} sang ${item.metadata?.to_branch}?`,
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Xác nhận', onPress: () => executeTransfer(item) }
            ]
          );
        }}
        disabled={isTransferring}
        style={{ 
          backgroundColor: isTransferring ? '#2E3654' : '#4F8EF7', 
          paddingVertical: 12, 
          borderRadius: 12, 
          alignItems: 'center', 
          marginTop: 16,
          shadowColor: '#4F8EF7',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          opacity: isTransferring ? 0.6 : 1
        }}
      >
        {isTransferring ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Điều phối ngay</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F1A' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>Kho & Điều phối</Text>
          <Text style={{ color: '#8B8FA3', fontSize: 14, marginTop: 4 }}>AI-Powered Inventory Intelligence</Text>
        </View>
        <TouchableOpacity 
          onPress={runAIAnalysis}
          disabled={isAnalyzing}
          style={{ width: 48, height: 48, backgroundColor: '#4F8EF720', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4F8EF740' }}
        >
          {isAnalyzing ? <ActivityIndicator size="small" color="#4F8EF7" /> : <Ionicons name="sparkles" size={24} color="#4F8EF7" />}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { queryClient.invalidateQueries(); }} tintColor="#4F8EF7" />}
      >
        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ backgroundColor: '#151929', borderRadius: 20, padding: 16, width: '48%', borderWidth: 1, borderColor: '#1E2540' }}>
            <Text style={{ color: '#8B8FA3', fontSize: 12, fontWeight: '600' }}>Tổng số bản sao</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 8 }}>{stats?.total || 0}</Text>
          </View>
          <View style={{ backgroundColor: '#151929', borderRadius: 20, padding: 16, width: '48%', borderWidth: 1, borderColor: '#1E2540' }}>
            <Text style={{ color: '#8B8FA3', fontSize: 12, fontWeight: '600' }}>Khả dụng</Text>
            <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '800', marginTop: 8 }}>{stats?.available || 0}</Text>
          </View>
        </View>

        {/* AI Suggestions Section */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Đề xuất từ AI</Text>
            <Text style={{ color: '#4F8EF7', fontSize: 13, fontWeight: '600' }}>Xem tất cả</Text>
          </View>
          
          {suggestions?.map((item: any) => (
            <SuggestionCard key={item.id} item={item} />
          ))}
          
          {(!suggestions || suggestions.length === 0) && (
            <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#151929', borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#2E3654' }}>
              <Ionicons name="analytics-outline" size={32} color="#5A5F7A" />
              <Text style={{ color: '#5A5F7A', fontSize: 14, textAlign: 'center', marginTop: 12 }}>Chưa có đề xuất điều phối nào. Nhấn biểu tượng ⚡ để AI phân tích.</Text>
            </View>
          )}
        </View>

        {/* Branches Section */}
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Danh sách Chi nhánh</Text>
          {branches?.map((branch: any) => (
            <View key={branch.id} style={{ 
              backgroundColor: '#151929', 
              borderRadius: 20, 
              padding: 16, 
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#1E2540'
            }}>
              <View style={{ width: 48, height: 48, backgroundColor: '#4F8EF715', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="business" size={24} color="#4F8EF7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{branch.name}</Text>
                <Text style={{ color: '#8B8FA3', fontSize: 12, marginTop: 2 }}>{branch.location}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#5A5F7A" />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
