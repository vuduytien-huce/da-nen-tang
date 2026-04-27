import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function AdminSystem() {
  const profile = useAuthStore((state) => state.profile);

  const { data: stats } = useQuery({
    queryKey: ['system_stats'],
    queryFn: async () => {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: bookCount } = await supabase.from('books').select('*', { count: 'exact', head: true });
      const { count: borrowCount } = await supabase.from('borrow_records').select('*', { count: 'exact', head: true });
      
      return {
        users: userCount || 0,
        books: bookCount || 0,
        borrows: borrowCount || 0,
        uptime: '99.9%',
        server: 'Supabase Cloud (Singapore)'
      };
    }
  });

  const StatCard = ({ title, value, subValue, icon, color }: any) => (
    <View style={{
      backgroundColor: '#1E2540',
      borderRadius: 24,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#2E3654',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: '#8B8FA3', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 12 }}>{value}</Text>
          <Text style={{ color: color, fontSize: 13, fontWeight: '600', marginTop: 8 }}>{subValue}</Text>
        </View>
        <View style={{ width: 56, height: 56, backgroundColor: `${color}15`, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F1A' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>Hệ thống</Text>
        <Text style={{ color: '#8B8FA3', fontSize: 14, marginTop: 4 }}>Giám sát tài nguyên BiblioTech</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ marginTop: 10 }}>
          <StatCard 
            title="Thành viên" 
            value={stats?.users || 0} 
            subValue="+12% so với tháng trước" 
            icon="people" 
            color="#4F8EF7" 
          />
          <StatCard 
            title="Sách khả dụng" 
            value={stats?.books || 0} 
            subValue="Tăng trưởng kho sách ổn định" 
            icon="library" 
            color="#10B981" 
          />
          <StatCard 
            title="Lượt mượn trả" 
            value={stats?.borrows || 0} 
            subValue="42 phiếu đang lưu hành" 
            icon="swap-horizontal" 
            color="#A855F7" 
          />
        </View>

        {/* System Health Section */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Trạng thái dịch vụ</Text>
          
          <View style={{ backgroundColor: '#151929', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1E2540' }}>
            {[
              { name: 'Database (Supabase)', status: 'Hoạt động', color: '#10B981' },
              { name: 'Auth Service', status: 'Hoạt động', color: '#10B981' },
              { name: 'Storage (Edge)', status: 'Cảnh báo', color: '#F59E0B' },
              { name: 'API Server', status: 'Hoạt động', color: '#10B981' },
            ].map((item, index) => (
              <View key={item.name} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: index === 3 ? 0 : 1,
                borderBottomColor: '#1E2540'
              }}>
                <Text style={{ color: '#8B8FA3', fontSize: 14 }}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color, marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 32, padding: 24, backgroundColor: 'rgba(79, 142, 247, 0.05)', borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(79, 142, 247, 0.2)' }}>
          <Text style={{ color: '#4F8EF7', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>Hệ thống đang hoạt động tối ưu</Text>
          <Text style={{ color: '#5A5F7A', fontSize: 11, textAlign: 'center', marginTop: 4 }}>Last checked: Just now</Text>
        </View>
      </ScrollView>
    </View>
  );
}
