import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';

export default function MetadataSources() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', url: '', is_active: true });

  const [isMounted, setIsMounted] = useState(true);
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const { data: sources, isLoading } = useQuery({
    queryKey: ['metadata_sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metadata_sources').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingSource) {
        const { error } = await supabase.from('metadata_sources').update(formData).eq('id', editingSource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('metadata_sources').insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (isMounted) {
        Alert.alert('Thành công', 'Đã cập nhật nguồn metadata');
        setModalVisible(false);
      }
      queryClient.invalidateQueries({ queryKey: ['metadata_sources'] });
    }
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('metadata_sources').update({ is_active: !current }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['metadata_sources'] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nguồn Metadata</Text>
          <Text style={styles.headerSubtitle}>Quản lý API đồng bộ thông tin sách</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { setEditingSource(null); setFormData({ name: '', url: '', is_active: true }); setModalVisible(true); }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea}>
        {sources?.map((source) => (
          <View key={source.id} style={styles.sourceCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceName}>{source.name}</Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>{source.url}</Text>
            </View>
            <View style={styles.sourceActions}>
              <Switch 
                value={source.is_active} 
                onValueChange={() => toggleActive(source.id, source.is_active)}
                trackColor={{ false: '#1E2540', true: '#4F8EF7' }}
              />
              <TouchableOpacity onPress={() => {
                setEditingSource(source);
                setFormData({ name: source.name, url: source.url, is_active: source.is_active });
                setModalVisible(true);
              }} style={styles.editBtn}>
                <Ionicons name="settings-outline" size={20} color="#8B8FA3" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingSource ? 'Sửa nguồn' : 'Thêm nguồn mới'}</Text>
            <TextInput
              value={formData.name}
              onChangeText={(v) => setFormData({...formData, name: v})}
              placeholder="Tên nguồn (vd: NLV API)"
              placeholderTextColor="#3D4260"
              style={styles.input}
            />
            <TextInput
              value={formData.url}
              onChangeText={(v) => setFormData({...formData, url: v})}
              placeholder="Base URL / API Endpoint"
              placeholderTextColor="#3D4260"
              style={styles.input}
            />
            <TouchableOpacity onPress={() => saveMutation.mutate()} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Lưu cấu hình</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: '#8B8FA3', fontSize: 14, marginTop: 4 },
  addBtn: { width: 44, height: 44, backgroundColor: '#4F8EF7', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scrollArea: { padding: 24 },
  sourceCard: { backgroundColor: '#151929', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1E2540' },
  sourceName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sourceUrl: { color: '#5A5F7A', fontSize: 12, marginTop: 4 },
  sourceActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  editBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#151929', borderRadius: 24, padding: 24, gap: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#0B0F1A', borderRadius: 12, padding: 16, color: '#FFFFFF', borderWidth: 1, borderColor: '#1E2540' },
  saveBtn: { backgroundColor: '#4F8EF7', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800' },
  cancelBtn: { alignItems: 'center', padding: 8 },
  cancelBtnText: { color: '#5A5F7A' }
});
