import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/src/api/supabase';
import { LanguageSelector } from '@/src/components/LanguageSelector';
import { useAuthStore } from '@/src/store/useAuthStore';
import { adminService } from '@/src/features/admin/admin.service';
import { useTranslation } from 'react-i18next';

// Removed unused width constant

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const { t } = useTranslation();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: () => adminService.listUsers(),
  });

  const { data: allBooks } = useQuery({
    queryKey: ['admin_books_count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('total_copies');
      if (error) throw error;
      return data || [];
    },
  });

  const totalCopies =
    allBooks?.reduce((sum, b) => sum + (b.total_copies || 0), 0) || 0;

  const updateRole = useMutation({
    mutationFn: ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: string;
    }) => adminService.updateUser(userId, { role: newRole }),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('messages.book_updated')); // Reusing book_updated for generic update
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('messages.book_deleted')); // Reusing book_deleted for generic delete
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
    },
  });

  const handleRoleChange = (userId: string, currentRole: string) => {
    Alert.alert(
      t('librarian.manage_admins'),
      t('librarian.manage_admins_desc'),
      [
        {
          text: t('roles.member'),
          onPress: () => updateRole.mutate({ userId, newRole: 'MEMBER' }),
        },
        {
          text: t('roles.librarian'),
          onPress: () => updateRole.mutate({ userId, newRole: 'LIBRARIAN' }),
        },
        {
          text: t('roles.admin'),
          onPress: () => updateRole.mutate({ userId, newRole: 'ADMIN' }),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const stats = [
    {
      label: t('analytics.kpi_members'),
      value: users?.length || 0,
      icon: 'people',
      bgColor: '#3A75F2',
      flex: 1,
    },
    {
      label: t('librarian.inventory'),
      value: totalCopies,
      icon: 'library',
      bgColor: '#10B981',
      flex: 1.2,
    },
    {
      label: t('admin.system'),
      value: 'OK',
      icon: 'checkmark-circle',
      bgColor: '#F59E0B',
      flex: 0.8,
      onPress: () => router.push('/(admin)/system'),
    },
  ];

  const handleDeleteUser = (userId: string) => {
    Alert.alert(
      t('librarian.delete_confirm'),
      t('librarian.delete_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('librarian.reject'),
          style: 'destructive',
          onPress: () => deleteUser.mutate(userId),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F121D" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header Section with Logout */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>{t('roles.admin')}</Text>
            <Text style={styles.name}>{profile?.fullName || 'Admin'}</Text>
          </View>
          <View style={styles.headerActions}>
            <LanguageSelector />
            <TouchableOpacity
              onPress={() => Alert.alert(t('common.error'), t('admin.audit_logs_desc'))}
              style={styles.notifBtn}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#3A75F2"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Stats Cards - Matching Librarian Classic Layout */}
        <View style={styles.statsRow}>
          {stats.map((stat: any, index) => (
            <TouchableOpacity
              key={index}
              onPress={stat.onPress}
              disabled={!stat.onPress}
              style={[
                styles.statCard,
                { backgroundColor: stat.bgColor, flex: stat.flex },
                index !== stats.length - 1 && { marginRight: 10 },
              ]}
            >
              <View style={styles.statTop}>
                <Ionicons
                  name={stat.icon as any}
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reports & Security Audit Navigation */}
        <View style={styles.bannersRow}>
          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => router.push('/(admin)/reports')}
          >
            <LinearGradient
              colors={['#1F263B', '#171B2B']}
              style={styles.reportsGradient}
            >
              <View style={styles.reportsIcon}>
                <Ionicons name="bar-chart" size={24} color="#3A75F2" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.reportsTitle}>{t('tabs.reports')}</Text>
                <Text style={styles.reportsSubtitle}>{t('analytics.overview')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => router.push('/(admin)/audit')}
          >
            <LinearGradient
              colors={['#1F263B', '#1A2138']}
              style={styles.reportsGradient}
            >
              <View
                style={[
                  styles.reportsIcon,
                  { backgroundColor: 'rgba(58, 117, 242, 0.15)' },
                ]}
              >
                <Ionicons name="list" size={24} color="#3A75F2" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.reportsTitle}>{t('tabs.audit')}</Text>
                <Text style={styles.reportsSubtitle}>{t('admin.audit_logs')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* User Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('tabs.users')}</Text>
          <TouchableOpacity
            onPress={() =>
              queryClient.invalidateQueries({ queryKey: ['admin_users'] })
            }
          >
            <Ionicons name="refresh" size={18} color="#3A75F2" />
          </TouchableOpacity>
        </View>

        <View style={styles.userList}>
          {isLoading ? (
            <Text style={styles.loadingText}>{t('messages.loading')}</Text>
          ) : Array.isArray(users) && users.length > 0 ? (
            users.map((item: any) => (
              <UserCard
                key={item.id}
                item={item}
                onEdit={() => handleRoleChange(item.id, item.role)}
                onDelete={() => handleDeleteUser(item.id)}
              />
            ))
          ) : (
            <Text style={styles.loadingText}>{t('messages.no_results')}</Text>
          )}
        </View>

        <View style={styles.spacer40} />
      </ScrollView>
    </SafeAreaView>
  );
}

const UserCard = React.memo(({ item, onEdit, onDelete }: { item: any, onEdit: () => void, onDelete: () => void }) => (
  <View style={styles.userCard}>
    <View style={styles.userAvatar}>
      <Text style={styles.avatarText}>
        {item.fullName?.charAt(0) || 'U'}
      </Text>
    </View>
    <View style={styles.userInfo}>
      <Text style={styles.userName}>{item.fullName}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{item.role}</Text>
      </View>
    </View>
    <View style={styles.userCardActions}>
      <TouchableOpacity
        onPress={onEdit}
        style={styles.editBtn}
      >
        <Ionicons name="settings-outline" size={18} color="#3A75F2" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  scroll: { paddingBottom: 20 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcome: { color: '#8A8F9E', fontSize: 13, marginBottom: 2 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
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
    height: '100%',
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
  bannersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  bannerContainer: {
    flex: 1,
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
    backgroundColor: '#151929',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E2540',
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
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: { color: '#3A75F2', fontSize: 10, fontWeight: '700' },
  userCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1F263B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#8A8F9E', textAlign: 'center', marginTop: 20 },
  flex1: { flex: 1 },
  spacer40: { height: 40 },
  reportsBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  reportsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  reportsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reportsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportsSubtitle: {
    color: '#8A8F9E',
    fontSize: 12,
  },
});
