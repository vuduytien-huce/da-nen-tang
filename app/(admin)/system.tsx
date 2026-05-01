import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/src/api/supabase';
import { adminService } from '@/src/features/admin/admin.service';
import { SecurityAuditResult } from '@/src/features/admin/admin.types';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useRouter } from 'expo-router';

export default function AdminSystem() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    email: '',
    password: '',
    fullName: '',
    role: 'MEMBER',
  });

  const [isAuditing, setIsAuditing] = React.useState(false);
  const [auditResult, setAuditResult] =
    React.useState<SecurityAuditResult | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['system_stats'],
    queryFn: async () => {
      const startTime = Date.now();
      // Simple query to measure latency
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const latency = Date.now() - startTime;

      const { count: bookCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      const { count: borrowCount } = await supabase
        .from('borrow_records')
        .select('*', { count: 'exact', head: true });

      // Count books missing embeddings
      const { count: missingEmbeddings } = await supabase
        .from('books')
        .select('*, profiles:changed_by(fullName:full_name, role)', { count: 'exact', head: true })
        .is('embedding', null);

      // In a real app, storage info would come from an edge function or bucket metadata
      return {
        users: userCount || 0,
        books: bookCount || 0,
        missingEmbeddings: missingEmbeddings || 0,
        borrows: borrowCount || 0,
        uptime: '99.99%',
        server: 'Supabase Cloud (SGP)',
        latency: latency,
        storage: {
          used: 1.24, // GB
          total: 5.0, // GB
          percentage: 24.8,
        },
        apiStatus: 'Healthy',
        version: 'v2.0.4-premium',
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      try {
        return await adminService.listUsers();
      } catch (err) {
        console.error('Error fetching users:', err);
        return [];
      }
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      Alert.alert(t('common.error'), t('messages.no_results')); // Or generic message
      return;
    }

    setIsCreating(true);
    try {
      await adminService.createUser(newUser);
      setShowAddModal(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'MEMBER' });
      refetchUsers();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await adminService.updateUser(userId, updates);
      refetchUsers();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminService.deleteUser(userId);
      refetchUsers();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleRunSecurityAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await adminService.runSecurityAudit();
      setAuditResult(result);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleBackfillEmbeddings = async () => {
    try {
      const data = await adminService.backfillEmbeddings();
      Alert.alert(t('common.success'), `${t('common.done')}: ${data.updated}. ${t('common.available')}: ${data.remaining}`);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    }
  };

  const MonitorWidget = ({ label, value, icon, color, progress }: any) => (
    <View style={styles.monitorWidget}>
      <View style={styles.monitorWidgetHeader}>
        <View
          style={[
            styles.monitorWidgetIconContainer,
            { backgroundColor: `${color}15` },
          ]}
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.monitorWidgetLabel}>{label}</Text>
      </View>
      <Text style={styles.monitorWidgetValue}>{value}</Text>
      {typeof progress === 'number' && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color },
            ]}
          />
        </View>
      )}
    </View>
  );

  const StatCard = ({ title, value, subValue, icon, color, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={!onPress}
      style={styles.statCard}
    >
      <View style={styles.statCardContent}>
        <View>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
          <Text style={[styles.statCardSubValue, { color }]}>{subValue}</Text>
        </View>
        <View
          style={[styles.statCardIconContainer, { backgroundColor: `${color}15` }]}
        >
          <Ionicons name={icon} size={28} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title} accessibilityRole="header">
            {t('admin.system')}
          </Text>
          <Text style={styles.subtitle}>
            {t('admin.system_desc')}
          </Text>
        </View>
        <View
          style={styles.statusBadge}
          accessibilityLabel={`${t('admin.status_online')}: OK`}
        >
          <Text style={styles.statusText}>{t('admin.status_online')}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* System Monitor Ops Widgets */}
        <View style={styles.monitorGrid}>
          <MonitorWidget
            label={t('admin.api_status')}
            value={stats?.apiStatus || '---'}
            icon="pulse"
            color="#10B981"
          />
          <MonitorWidget
            label={t('admin.db_latency')}
            value={`${stats?.latency || 0}ms`}
            icon="speedometer"
            color={
              stats?.latency && stats.latency > 500 ? '#EF4444' : '#4F8EF7'
            }
          />
          <MonitorWidget
            label={t('admin.storage')}
            value={`${stats?.storage?.used || 0}GB / ${stats?.storage?.total || 0}GB`}
            icon="cloud-upload"
            color="#A855F7"
            progress={stats?.storage?.percentage}
          />
          <MonitorWidget
            label={t('admin.uptime')}
            value={stats?.uptime || '---'}
            icon="time"
            color="#F59E0B"
          />
          <TouchableOpacity
            onPress={handleBackfillEmbeddings}
            style={styles.aiEmbedButton}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.ai_summary_hint')}
          >
            <View
              style={[
                styles.aiEmbedContent,
                {
                  borderColor:
                    stats?.missingEmbeddings && stats.missingEmbeddings > 0
                      ? '#4F8EF7'
                      : '#1E2540',
                  borderStyle:
                    stats?.missingEmbeddings && stats.missingEmbeddings > 0
                      ? 'dashed'
                      : 'solid',
                },
              ]}
            >
              <View style={styles.aiEmbedLeft}>
                <View style={styles.aiEmbedIconContainer}>
                  <Ionicons name="sparkles" size={20} color="#4F8EF7" />
                </View>
                <View>
                  <Text style={styles.userName}>{t('admin.ai_embeddings')}</Text>
                  <Text style={styles.userRole}>
                    {t('admin.books_missing_embeddings', { count: stats?.missingEmbeddings || 0 })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#5A5F7A" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.logHeader}>
          <StatCard
            title={t('analytics.kpi_members')}
            value={stats?.users || 0}
            subValue={`+12% ${t('common.total_borrows')}`}
            icon="people"
            color="#4F8EF7"
            onPress={() => router.push('/(admin)?scroll=users')}
          />
          <StatCard
            title={t('admin.available_books')}
            value={stats?.books || 0}
            subValue={t('admin.growth_stable')}
            icon="library"
            color="#10B981"
            onPress={() => router.push('/(admin)/inventory')}
          />
        </View>

        {/* User Management Section */}
        <View style={styles.chartContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tabs.users')}</Text>
            <View style={styles.userActions}>
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                style={styles.labelMargin}
              >
                <Ionicons name="add-circle" size={24} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => refetchUsers()}>
                <Ionicons name="refresh" size={20} color="#4F8EF7" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userCardList}>
            {users?.map((user: any, index: number) => (
              <View
                key={user.id}
                style={[
                  styles.userItem,
                  { borderBottomWidth: index === (users?.length || 0) - 1 ? 0 : 1, borderBottomColor: '#1E2540' },
                ]}
              >
                <View style={styles.userItemInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>
                      {user.fullName || user.email}
                    </Text>
                    {user.is_locked && (
                      <View style={styles.lockBadge}>
                        <Text style={styles.lockText}>LOCKED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userRole}>
                    {user.role} • {user.email}
                  </Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    onPress={() =>
                      handleUpdateUser(user.id, { isLocked: !user.is_locked })
                    }
                    style={styles.userActionBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={
                        user.is_locked
                          ? 'lock-open-outline'
                          : 'lock-closed-outline'
                      }
                      size={20}
                      color={user.is_locked ? '#10B981' : '#F59E0B'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user.id)}
                    style={styles.smallPadding}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {(!users || users.length === 0) && (
              <Text style={styles.emptyText}>
                {t('messages.no_results')}
              </Text>
            )}
          </View>
        </View>

        {/* Security Audit Section */}
        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t('admin.security_rls')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('admin.security_desc')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRunSecurityAudit}
              disabled={isAuditing}
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    auditResult?.status === 'RISK' ? '#EF444420' : '#10B98120',
                  borderColor:
                    auditResult?.status === 'RISK' ? '#EF444440' : '#10B98140',
                },
              ]}
            >
              {isAuditing ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text
                  style={[
                    styles.statusText,
                    { color: auditResult?.status === 'RISK' ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {auditResult ? t('common.refresh') : t('admin.run_audit')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {auditResult ? (
            <View style={styles.auditCard}>
              <View style={styles.auditHeader}>
                <View
                  style={[
                    styles.auditIconContainer,
                    {
                      backgroundColor:
                        auditResult.status === 'SECURE'
                          ? '#10B98115'
                          : '#EF444415',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      auditResult.status === 'SECURE'
                        ? 'checkmark-circle'
                        : 'alert-circle'
                    }
                    size={24}
                    color={
                      auditResult.status === 'SECURE' ? '#10B981' : '#EF4444'
                    }
                  />
                </View>
                <View>
                  <Text style={styles.auditTitle}>
                    {auditResult.status === 'SECURE'
                      ? t('admin.secure_system')
                      : t('admin.risk_detected')}
                  </Text>
                  <Text style={styles.auditTimestamp}>
                    {t('admin.audit_timestamp')}:{' '}
                    {new Date(auditResult.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>

              {/* RLS Missing */}
              {auditResult.rls_missing.length > 0 && (
                <View style={styles.mb16}>
                  <Text style={[styles.riskHeader, { color: '#EF4444' }]}>
                    {t('admin.missing_rls')}:
                  </Text>
                  <View style={styles.riskTags}>
                    {auditResult.rls_missing.map((table) => (
                      <View
                        key={table}
                        style={[styles.riskTag, { backgroundColor: '#EF444415' }]}
                      >
                        <Text style={[styles.riskTagText, { color: '#EF4444' }]}>
                          {table}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* IDOR Risks */}
              {auditResult.permissive_policies.length > 0 && (
                <View style={styles.mb16}>
                  <Text style={[styles.riskHeader, { color: '#F59E0B' }]}>
                    {t('admin.idor_risk')}:
                  </Text>
                  {auditResult.permissive_policies.map((p, i) => (
                    <View key={i} style={styles.mb6}>
                      <Text style={styles.itemText}>
                        • <Text style={styles.boldText}>{p.table}</Text>:{' '}
                        {p.policy} ({p.cmd})
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Public Exposure */}
              {auditResult.sensitive_public_read.length > 0 && (
                <View style={styles.mb16}>
                  <Text style={[styles.riskHeader, { color: '#A855F7' }]}>
                    {t('admin.sensitive_public')}:
                  </Text>
                  <View style={styles.riskTags}>
                    {auditResult.sensitive_public_read.map((table) => (
                      <View
                        key={table}
                        style={[styles.riskTag, { backgroundColor: '#A855F715' }]}
                      >
                        <Text style={[styles.riskTagText, { color: '#A855F7' }]}>
                          {table}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {auditResult.status === 'SECURE' && (
                <Text
                  style={{
                    color: '#10B981',
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 10,
                  }}
                >
                  {t('admin.all_secure')}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleRunSecurityAudit}
              style={{
                backgroundColor: '#151929',
                borderRadius: 24,
                padding: 40,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#1E2540',
                borderStyle: 'dashed',
              }}
            >
              <Ionicons
                name="scan-outline"
                size={48}
                color="#4F8EF7"
                style={styles.faded}
              />
              <Text
                style={{
                  color: '#8B8FA3',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                {t('admin.no_audit_data')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{
            marginTop: 32,
            padding: 24,
            backgroundColor: 'rgba(79, 142, 247, 0.05)',
            borderRadius: 24,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: 'rgba(79, 142, 247, 0.2)',
          }}
        >
          <Text
            style={{
              color: '#4F8EF7',
              fontSize: 13,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {t('admin.server_optimized', { server: stats?.server || 'Supabase Singapore' })}
          </Text>
          <Text
            style={{
              color: '#5A5F7A',
              fontSize: 11,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            Version: {stats?.version || 'v2.0'} • {t('admin.audit_timestamp')}:{' '}
            {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#1E2540',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: '#2E3654',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 20,
              }}
            >
              {t('admin.add_member')}
            </Text>

            <TextInput
              placeholder={t('admin.full_name')}
              placeholderTextColor="#5A5F7A"
              style={{
                backgroundColor: '#0B0F1A',
                color: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}
              value={newUser.fullName}
              onChangeText={(text) => setNewUser((p) => ({ ...p, fullName: text }))}
            />
            <TextInput
              placeholder={t('admin.email')}
              placeholderTextColor="#5A5F7A"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: '#0B0F1A',
                color: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}
              value={newUser.email}
              onChangeText={(text) => setNewUser((p) => ({ ...p, email: text }))}
            />
            <TextInput
              placeholder={t('admin.password')}
              placeholderTextColor="#5A5F7A"
              secureTextEntry
              style={{
                backgroundColor: '#0B0F1A',
                color: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}
              value={newUser.password}
              onChangeText={(text) => setNewUser((p) => ({ ...p, password: text }))}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              {['MEMBER', 'LIBRARIAN', 'ADMIN'].map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setNewUser((p) => ({ ...p, role }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      newUser.role === role ? '#4F8EF7' : '#0B0F1A',
                    borderWidth: 1,
                    borderColor: newUser.role === role ? '#4F8EF7' : '#2E3654',
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: newUser.role === role }}
                >
                  <Text
                    style={{
                      color: newUser.role === role ? '#FFFFFF' : '#8B8FA3',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.btnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateUser}
                disabled={isCreating}
                style={{
                  flex: 2,
                  backgroundColor: '#4F8EF7',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>
                    {t('admin.create_user')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8B8FA3',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  monitorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  monitorWidget: {
    backgroundColor: '#151929',
    borderRadius: 20,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 16,
  },
  monitorWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monitorWidgetIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  monitorWidgetLabel: {
    color: '#8B8FA3',
    fontSize: 12,
    fontWeight: '600',
  },
  monitorWidgetValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#1E2540',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  aiEmbedButton: {
    width: '100%',
    marginBottom: 16,
  },
  aiEmbedContent: {
    backgroundColor: '#1E2540',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  aiEmbedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiEmbedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#4F8EF715',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statCard: {
    backgroundColor: '#1E2540',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E3654',
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statCardTitle: {
    color: '#8B8FA3',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  statCardSubValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  statCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#8B8FA3',
    fontSize: 12,
    marginTop: 2,
  },
  userCardList: {
    backgroundColor: '#151929',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userItemInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userRole: {
    color: '#8B8FA3',
    fontSize: 12,
  },
  lockBadge: {
    marginLeft: 8,
    backgroundColor: '#EF444420',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userActionBtn: {
    padding: 8,
    marginRight: 4,
  },
  emptyText: {
    color: '#5A5F7A',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  auditCard: {
    backgroundColor: '#151929',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  auditIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  auditTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  auditTimestamp: {
    color: '#8B8FA3',
    fontSize: 12,
  },
  riskHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  riskTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riskTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E2540',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2E3654',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#8B8FA3',
    fontSize: 14,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0B0F1A',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E2540',
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  roleText: {
    color: '#8B8FA3',
    fontSize: 12,
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#4F8EF7',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  createBtn: {
    flex: 2,
    backgroundColor: '#4F8EF7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mb6: { marginBottom: 6 },
  mb16: { marginBottom: 16 },
  itemText: { color: '#FFFFFF', fontSize: 13 },
  boldText: { fontWeight: '700' },
  faded: { opacity: 0.5 },
  labelMargin: { marginRight: 12 },
  smallPadding: { padding: 4 },
  sectionMargin: { marginTop: 32 },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: '#151929',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 24,
  },
});
