import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfig } from '@/src/hooks/library/useConfig';

export default function AdminConfig() {
  const { getConfig, updateConfig } = useConfig();
  const { data: config, isLoading } = getConfig();
  const updateMutation = updateConfig;

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState('');
  const [selectedLabel, setSelectedLabel] = React.useState('');
  const [modalValue, setModalValue] = React.useState('');

  const submitValue = async (key: string, label: string, value: string) => {
    try {
      await updateMutation.mutateAsync({ key, value });
      if (Platform.OS === 'web') {
        window.alert(`Đã cập nhật ${label}`);
      } else {
        Alert.alert('Thành công', `Đã cập nhật ${label}`);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err.message);
      } else {
        Alert.alert('Lỗi', err.message);
      }
    }
  };

  const handleUpdate = (key: string, label: string) => {
    setSelectedKey(key);
    setSelectedLabel(label);
    setModalValue(String((config as any)?.[key] || ''));
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F8EF7" />
      </View>
    );
  }

  const configItems = [
    {
      key: 'fine_rate',
      label: 'Phí phạt mỗi ngày',
      unit: 'VNĐ',
      icon: 'cash-outline',
      color: '#F59E0B',
    },
    {
      key: 'member_due_days',
      label: 'Hạn mượn (Độc giả)',
      unit: 'Ngày',
      icon: 'calendar-outline',
      color: '#4F8EF7',
    },
    {
      key: 'admin_due_days',
      label: 'Hạn mượn (Thủ thư/AD)',
      unit: 'Ngày',
      icon: 'time-outline',
      color: '#10B981',
    },
    {
      key: 'max_books',
      label: 'Số sách mượn tối đa',
      unit: 'Cuốn',
      icon: 'book-outline',
      color: '#A855F7',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Cấu hình Hệ thống</Text>
          <Text style={styles.subtitle}>
            Thiết lập các tham số vận hành thư viện
          </Text>
        </View>

        <View style={styles.section}>
          {configItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.configCard}
              onPress={() => handleUpdate(item.key, item.label)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.color + '20' },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={item.color}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>
                  {Number((config as any)?.[item.key]).toLocaleString() || '---'}{' '}
                  {item.unit}
                </Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#5A5F7A" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={20} color="#4F8EF7" />
          <Text style={styles.warningText}>
            Các thay đổi này sẽ áp dụng ngay lập tức cho toàn bộ các giao dịch
            mượn sách mới.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() =>
            Alert.alert(
              'Thông báo',
              'Tính năng đặt lại mặc định đang phát triển',
            )
          }
        >
          <Text style={styles.resetText}>Đặt lại mặc định</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Config Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật {selectedLabel}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5A5F7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.modalInput}
                value={modalValue}
                onChangeText={setModalValue}
                keyboardType="numeric"
                autoFocus
                placeholderTextColor="#5A5F7A"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (modalValue.trim() !== '') {
                    submitValue(selectedKey, selectedLabel, modalValue.trim());
                    setModalVisible(false);
                  }
                }}
                style={[styles.modalBtn, styles.submitBtn]}
              >
                <Text style={styles.submitBtnText}>Cập nhật</Text>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#151929',
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2E3654',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: '#0B0F1A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 24,
  },
  modalInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1E2540',
  },
  cancelBtnText: {
    color: '#8B8FA3',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#4F8EF7',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
