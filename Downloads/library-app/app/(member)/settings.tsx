import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const METADATA_FIELDS = [
  { id: 'isbn', label: 'ISBN', icon: 'barcode-outline' },
  { id: 'published_date', label: 'Ngày xuất bản', icon: 'calendar-outline' },
  { id: 'category', label: 'Thể loại', icon: 'list-outline' },
  { id: 'description', label: 'Tóm tắt nội dung', icon: 'document-text-outline' },
  { id: 'appendix', label: 'Phụ lục', icon: 'attach-outline' },
  { id: 'page_count', label: 'Số trang', icon: 'layers-outline' },
  { id: 'language', label: 'Ngôn ngữ', icon: 'language-outline' },
  { id: 'average_rating', label: 'Xếp hạng', icon: 'star-outline' },
  { id: 'edition', label: 'Lần tái bản', icon: 'copy-outline' },
];

export default function MetadataSettings() {
  const router = useRouter();
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('metadata_display_settings');
        if (isMounted) {
          if (saved) {
            setVisibleFields(JSON.parse(saved));
          } else {
            const defaults = METADATA_FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: true }), {});
            setVisibleFields(defaults);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const toggleField = async (id: string) => {
    const newSettings = { ...visibleFields, [id]: !visibleFields[id] };
    setVisibleFields(newSettings);
    await AsyncStorage.setItem('metadata_display_settings', JSON.stringify(newSettings));
  };

  const toggleAll = async (value: boolean) => {
    const newSettings = METADATA_FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: value }), {});
    setVisibleFields(newSettings);
    await AsyncStorage.setItem('metadata_display_settings', JSON.stringify(newSettings));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Cấu hình hiển thị</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            Tùy chỉnh thông tin chi tiết bạn muốn xem khi xem danh sách sách. Tên sách và tác giả luôn được hiển thị.
          </Text>
        </View>

        <View style={styles.bulkActions}>
          <TouchableOpacity onPress={() => toggleAll(true)} style={styles.bulkBtn}>
            <Text style={styles.bulkBtnText}>Hiện tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleAll(false)} style={styles.bulkBtn}>
            <Text style={[styles.bulkBtnText, { color: '#FF6B6B' }]}>Ẩn tất cả</Text>
          </TouchableOpacity>
        </View>

        {METADATA_FIELDS.map((field) => (
          <View key={field.id} style={styles.settingRow}>
            <View style={styles.fieldInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name={field.icon as any} size={20} color="#3A75F2" />
              </View>
              <Text style={styles.fieldLabel}>{field.label}</Text>
            </View>
            <Switch
              value={visibleFields[field.id] ?? true}
              onValueChange={() => toggleField(field.id)}
              trackColor={{ false: '#1F263B', true: '#3A75F2' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F121D' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F263B'
  },
  backBtn: { marginRight: 16 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionDesc: { color: '#8A8F9E', fontSize: 14, lineHeight: 20 },
  bulkActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 20 
  },
  bulkBtn: { 
    backgroundColor: '#171B2B', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  bulkBtnText: { color: '#3A75F2', fontSize: 13, fontWeight: '600' },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#171B2B',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  fieldInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: 'rgba(58, 117, 242, 0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 12
  },
  fieldLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});
