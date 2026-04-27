import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert, StyleSheet, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSelector } from '../../src/components/LanguageSelector';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allBooks } = useQuery({
    queryKey: ['admin_books_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('total_copies');
      if (error) throw error;
      return data || [];
    }
  });

  const totalCopies = allBooks?.reduce((sum, b) => sum + (b.total_copies || 0), 0) || 0;

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string, newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Thành công', 'Đã cập nhật quyền người dùng');
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    }
  });

  const handleRoleChange = (userId: string, currentRole: string) => {
    Alert.alert(
      'Phân quyền người dùng',
      'Chọn vai trò mới cho người dùng này:',
      [
        { text: 'Member', onPress: () => updateRole.mutate({ userId, newRole: 'MEMBER' }) },
        { text: 'Librarian', onPress: () => updateRole.mutate({ userId, newRole: 'LIBRARIAN' }) },
        { text: 'Admin', onPress: () => updateRole.mutate({ userId, newRole: 'ADMIN' }) },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const stats = [
    { label: 'Thành viên', value: users?.length || 0, icon: 'people', bgColor: '#3A75F2', flex: 1 },
    { label: 'Tổng số sách', value: totalCopies, icon: 'library', bgColor: '#10B981', flex: 1.2 },
    { label: 'Hệ thống', value: 'OK', icon: 'shield-checkmark', bgColor: '#F59E0B', flex: 0.8 },
  ];

  const UserCard = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{item.full_name?.charAt(0) || 'U'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => handleRoleChange(item.id, item.role)}
        style={styles.editBtn}
      >
        <Ionicons name="settings-outline" size={18} color="#3A75F2" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F121D" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Header Section with Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Quản trị viên</Text>
            <Text style={styles.name}>{profile?.fullName || 'Admin'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <LanguageSelector />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

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

        {/* User Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quản lý người dùng</Text>
          <TouchableOpacity onPress={() => queryClient.invalidateQueries({ queryKey: ['admin_users'] })}>
            <Ionicons name="refresh" size={18} color="#3A75F2" />
          </TouchableOpacity>
        </View>

        <View style={styles.userList}>
          {isLoading ? (
            <Text style={styles.loadingText}>Đang tải danh sách...</Text>
          ) : (
            users?.map((item: any) => (
              <UserCard key={item.id} item={item} />
            ))
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F121D' },
  scroll: { paddingBottom: 20 },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  welcome: { color: '#8A8F9E', fontSize: 13, marginBottom: 2 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255, 107, 107, 0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
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
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  userList: { paddingHorizontal: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B2B',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F263B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#3A75F2', fontWeight: 'bold', fontSize: 16 },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  roleBadge: {
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: { color: '#3A75F2', fontSize: 10, fontWeight: '700' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1F263B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#8A8F9E', textAlign: 'center', marginTop: 20 },
});
