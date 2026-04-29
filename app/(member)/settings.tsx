import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { notificationService } from '../../src/core/notifications';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [notifPrefs, setNotifPrefs] = useState({
    dueDates: true,
    newArrivals: true,
    clubMentions: true,
    systemUpdates: true
  });
  const [isSaving, setIsSaving] = useState(false);

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

        // Load notification preferences
        if (profile?.id) {
          const prefs = await notificationService.getPreferences(profile.id);
          if (isMounted) setNotifPrefs(prefs);
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

  const toggleNotif = async (key: string) => {
    if (!profile?.id) return;
    
    const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key as keyof typeof notifPrefs] };
    setNotifPrefs(newPrefs);
    
    setIsSaving(true);
    await notificationService.updatePreferences(profile.id, newPrefs);
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{t('common.settings', 'Cài đặt hệ thống')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngôn ngữ hệ thống</Text>
          <Text style={styles.sectionDesc}>
            Thay đổi ngôn ngữ giao diện của ứng dụng.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity 
              style={[styles.bulkBtn, i18n.language === 'vi' && { backgroundColor: '#3A75F2', borderColor: '#3A75F2' }]} 
              onPress={() => i18n.changeLanguage('vi')}
              accessibilityRole="button"
              accessibilityLabel="Chọn Tiếng Việt"
              accessibilityState={{ selected: i18n.language === 'vi' }}
            >
              <Text style={[styles.bulkBtnText, i18n.language === 'vi' && { color: '#FFF' }]}>Tiếng Việt</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bulkBtn, i18n.language === 'en' && { backgroundColor: '#3A75F2', borderColor: '#3A75F2' }]} 
              onPress={() => i18n.changeLanguage('en')}
              accessibilityRole="button"
              accessibilityLabel="Select English"
              accessibilityState={{ selected: i18n.language === 'en' }}
            >
              <Text style={[styles.bulkBtnText, i18n.language === 'en' && { color: '#FFF' }]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: '#1F263B', paddingTop: 24 }]}>
          <Text style={styles.sectionTitle}>Cấu hình hiển thị sách</Text>
          <Text style={styles.sectionDesc}>
            Tùy chỉnh thông tin chi tiết bạn muốn xem khi xem danh sách sách. Tên sách và tác giả luôn được hiển thị.
          </Text>
        </View>

        <View style={styles.bulkActions}>
          <TouchableOpacity 
            onPress={() => toggleAll(true)} 
            style={styles.bulkBtn}
            accessibilityRole="button"
            accessibilityLabel="Hiện tất cả các trường thông tin"
          >
            <Text style={styles.bulkBtnText}>Hiện tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => toggleAll(false)} 
            style={styles.bulkBtn}
            accessibilityRole="button"
            accessibilityLabel="Ẩn tất cả các trường thông tin"
          >
            <Text style={[styles.bulkBtnText, { color: '#FF6B6B' }]}>Ẩn tất cả</Text>
          </TouchableOpacity>
        </View>

        {METADATA_FIELDS.map((field) => (
          <View key={field.id} style={styles.settingRow}>
            <View style={styles.fieldInfo}>
              <View style={styles.iconContainer} importantForAccessibility="no-hide-descendants">
                <Ionicons name={field.icon as any} size={20} color="#3A75F2" />
              </View>
              <Text style={styles.fieldLabel}>{field.label}</Text>
            </View>
            <Switch
              value={visibleFields[field.id] ?? true}
              onValueChange={() => toggleField(field.id)}
              trackColor={{ false: '#1F263B', true: '#3A75F2' }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Hiển thị ${field.label}`}
            />
          </View>
        ))}

        {/* Notification Section */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: '#1F263B', paddingTop: 24, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>{t('member.notification_settings')}</Text>
            {isSaving && <ActivityIndicator size="small" color="#3A75F2" />}
          </View>
          <Text style={styles.sectionDesc}>
            {t('member.notification_desc')}
          </Text>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.fieldInfo}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.fieldLabel}>{t('member.due_date_reminders')}</Text>
          </View>
          <Switch
            value={notifPrefs.dueDates}
            onValueChange={() => toggleNotif('dueDates')}
            trackColor={{ false: '#1F263B', true: '#F59E0B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.fieldInfo}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="sparkles-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.fieldLabel}>{t('member.new_arrival_alerts')}</Text>
          </View>
          <Switch
            value={notifPrefs.newArrivals}
            onValueChange={() => toggleNotif('newArrivals')}
            trackColor={{ false: '#1F263B', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.fieldInfo}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="people-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.fieldLabel}>{t('member.club_mention_pings')}</Text>
          </View>
          <Switch
            value={notifPrefs.clubMentions}
            onValueChange={() => toggleNotif('clubMentions')}
            trackColor={{ false: '#1F263B', true: '#8B5CF6' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: '#1F263B', paddingTop: 24, marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Quản lý dữ liệu & Offline</Text>
          <Text style={styles.sectionDesc}>
            Quản lý các tệp sách và âm thanh đã tải về máy của bạn.
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { marginTop: 12 }]}
            onPress={() => router.push('/(member)/downloads' as any)}
          >
            <View style={styles.fieldInfo}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="download-outline" size={20} color="#10B981" />
              </View>
              <Text style={styles.fieldLabel}>Tệp đã tải xuống</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#5A5F7A" />
          </TouchableOpacity>
        </View>
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
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
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
