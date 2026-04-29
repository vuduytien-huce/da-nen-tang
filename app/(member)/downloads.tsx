import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { downloadService, DownloadInfo } from '../../src/services/downloadService';
import { useLibrary } from '../../src/hooks/useLibrary';
import { LinearGradient } from 'expo-linear-gradient';

export default function DownloadsScreen() {
  const router = useRouter();
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { books } = useLibrary();
  const { data: allBooks } = books.list();

  const loadDownloads = async () => {
    setIsLoading(true);
    const data = await downloadService.getAllDownloads();
    setDownloads(data);
    setIsLoading(false);
  };

  const clearAll = async () => {
    Alert.alert(
      'Xóa tất cả',
      'Bạn có chắc chắn muốn xóa tất cả tệp đã tải xuống? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa tất cả', 
          style: 'destructive',
          onPress: async () => {
            await downloadService.clearAll();
            loadDownloads();
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const handleDelete = (isbn: string) => {
    Alert.alert(
      'Xóa tệp',
      'Bạn có chắc chắn muốn xóa tệp đã tải xuống này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            await downloadService.removeFile(isbn);
            loadDownloads();
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: DownloadInfo }) => {
    const book = allBooks?.find(b => b.isbn === item.isbn);
    
    return (
      <View style={styles.downloadItem}>
        <View style={styles.iconBox}>
          <Ionicons 
            name={item.fileType === 'mp3' ? 'musical-notes' : 'document-text'} 
            size={24} 
            color="#3A75F2" 
          />
        </View>
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{book?.title || item.isbn}</Text>
          <Text style={styles.subtitle}>
            {item.fileType.toUpperCase()} • {new Date(item.downloadedAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        <TouchableOpacity onPress={() => handleDelete(item.isbn)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tệp đã tải xuống</Text>
        {downloads.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Xóa tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3A75F2" />
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.isbn}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="download-outline" size={64} color="#1E2540" />
              <Text style={styles.emptyText}>Chưa có tệp nào được tải xuống</Text>
              <TouchableOpacity 
                style={styles.browseBtn}
                onPress={() => router.push('/(member)/search')}
              >
                <Text style={styles.browseBtnText}>Khám phá sách</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#171B2B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2540'
  },
  backBtn: { marginRight: 15 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1 },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
  list: { padding: 20 },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B2B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: { flex: 1 },
  title: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { color: '#5A5F7A', fontSize: 12 },
  deleteBtn: { padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: '#5A5F7A', fontSize: 16, marginTop: 16, marginBottom: 24 },
  browseBtn: {
    backgroundColor: '#3A75F2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: { color: 'white', fontWeight: 'bold' },
});
