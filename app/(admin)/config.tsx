import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConfig } from '../../src/hooks/library/useConfig';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminConfig() {
  const { getConfig, updateConfig } = useConfig();
  const { data: config, isLoading } = getConfig();
  const updateMutation = updateConfig;

  const handleUpdate = (key: string, label: string) => {
    Alert.prompt(
      'Cập nhật',
      `Nhập giá trị mới cho ${label}:`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Lưu', 
          onPress: async (value) => {
            if (!value) return;
            try {
              await updateMutation.mutateAsync({ key, value });
              Alert.alert('Thành công', `Đã cập nhật ${label}`);
            } catch (err: any) {
              Alert.alert('Lỗi', err.message);
            }
          } 
        }
      ],
      'plain-text',
      config?.[key] || ''
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F8EF7" />
      </View>
    );
  }

  const configItems = [
    { key: 'fine_rate', label: 'Phí phạt mỗi ngày', unit: 'VNĐ', icon: 'cash-outline', color: '#F59E0B' },
    { key: 'member_due_days', label: 'Hạn mượn (Độc giả)', unit: 'Ngày', icon: 'calendar-outline', color: '#4F8EF7' },
    { key: 'admin_due_days', label: 'Hạn mượn (Thủ thư/AD)', unit: 'Ngày', icon: 'time-outline', color: '#10B981' },
    { key: 'max_books', label: 'Số sách mượn tối đa', unit: 'Cuốn', icon: 'book-outline', color: '#A855F7' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Cấu hình Hệ thống</Text>
          <Text style={styles.subtitle}>Thiết lập các tham số vận hành thư viện</Text>
        </View>

        <View style={styles.section}>
          {configItems.map((item) => (
            <TouchableOpacity 
              key={item.key} 
              style={styles.configCard}
              onPress={() => handleUpdate(item.key, item.label)}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>
                  {Number(config?.[item.key]).toLocaleString() || '---'} {item.unit}
                </Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#5A5F7A" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={20} color="#4F8EF7" />
          <Text style={styles.warningText}>
            Các thay đổi này sẽ áp dụng ngay lập tức cho toàn bộ các giao dịch mượn sách mới.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đặt lại mặc định đang phát triển')}>
          <Text style={styles.resetText}>Đặt lại mặc định</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A5F7A',
  },
  section: {
    marginBottom: 24,
  },
  configCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151929',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#5A5F7A',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 142, 247, 0.1)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  warningText: {
    flex: 1,
    color: '#4F8EF7',
    fontSize: 13,
    marginLeft: 10,
    lineHeight: 20,
  },
  resetBtn: {
    alignItems: 'center',
    padding: 16,
  },
  resetText: {
    color: '#5A5F7A',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  }
});
