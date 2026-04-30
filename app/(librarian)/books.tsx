import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/src/api/supabase';
import { useLibrary, Book } from '@/src/hooks/useLibrary';
import { BookItem } from '@/src/features/books/components/BookItem';
import { RatingPicker } from '@/src/features/books/components/RatingPicker';

export default function LibrarianBooks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { useBooks, syncBook } = useLibrary();
  const { data: books, isLoading } = useBooks();

  const [isMounted, setIsMounted] = useState(true);
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    total_copies: '1',
    cover_url: '',
    published_date: '',
    category: '',
    description: '',
    language: '',
    average_rating: '0',
    edition: '',
    appendix: ''
  });

  const resetForm = () => {
    setFormData({ 
      title: '', author: '', isbn: '', total_copies: '1', cover_url: '',
      published_date: '', category: '', description: '',
      language: '', average_rating: '0', edition: '', appendix: ''
    });
    setEditingBook(null);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author || '',
      isbn: book.isbn,
      total_copies: String(book.total_copies),
      cover_url: book.cover_url || '',
      published_date: book.published_date || '',
      category: book.category || '',
      description: book.description || '',
      language: book.language || '',
      average_rating: book.average_rating ? String(book.average_rating) : '0',
      edition: book.edition || '',
      appendix: book.appendix || ''
    });
    setModalVisible(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const total = parseInt(formData.total_copies) || 0;
      const cleanIsbn = formData.isbn.replace(/[- ]/g, "");
      const payload = {
        title: formData.title,
        author: formData.author,
        isbn: cleanIsbn,
        total_copies: total,
        cover_url: formData.cover_url || null,
        published_date: formData.published_date || null,
        category: formData.category || null,
        description: formData.description || null,
        language: formData.language || null,
        average_rating: parseFloat(formData.average_rating) || null,
        edition: formData.edition || null,
        appendix: formData.appendix || null,
      };

      if (editingBook) {
        const diff = total - editingBook.total_copies;
        const { error } = await supabase
          .from('books')
          .update({
            ...payload,
            available_copies: Math.max(0, editingBook.available_copies + diff)
          })
          .eq('isbn', editingBook.isbn);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('books').insert([{
          ...payload,
          available_copies: total
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!isMounted) return;
      Alert.alert(t('common.success'), editingBook ? t('messages.book_updated') || 'Đã cập nhật sách' : t('messages.book_added'));
      setModalVisible(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: any) => {
      if (isMounted) Alert.alert(t('common.error'), err.message);
    }
  });

  const handleSync = async () => {
    if (!formData.isbn) {
      Alert.alert(t('common.error'), 'Vui lòng nhập ISBN để đồng bộ');
      return;
    }
    try {
      const cleanIsbn = formData.isbn.replace(/[- ]/g, "");
      const response = await syncBook.mutateAsync(cleanIsbn);
      if (!isMounted) return;
      if (response && response.data) {
        const { title, author, cover_url } = response.data;
        setFormData({
          ...formData,
          isbn: cleanIsbn,
          title: title || formData.title,
          author: author || formData.author,
          cover_url: cover_url || formData.cover_url,
          published_date: response.data.published_date || formData.published_date,
          category: response.data.category || formData.category,
          description: response.data.description || formData.description,
          language: response.data.language || formData.language,
          average_rating: response.data.average_rating ? String(response.data.average_rating) : formData.average_rating,
          edition: response.data.edition || formData.edition,
          appendix: response.data.appendix || formData.appendix
        });
        Alert.alert(t('common.success'), 'Đã đồng bộ thông tin từ các nguồn dữ liệu');
      }
    } catch (err: any) {
      if (isMounted) Alert.alert(t('common.error'), 'Không tìm thấy sách hoặc lỗi đồng bộ');
    }
  };

  const handleMarc21Import = async () => {
    // Simple MARC21 Regex Parser
    // Tags: 245$a (Title), 100$a (Author), 082$a (DDC), 090$b (Cutter)
    Alert.prompt(
      "Dán nội dung MARC21",
      "Dán văn bản MARC21 (định dạng mnemonic) vào đây để trích xuất metadata.",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Trích xuất", 
          onPress: (text: string | undefined) => {
            if (!text) return;
            const titleMatch = text.match(/245.*\$a\s*([^$|\n|/]+)/);
            const authorMatch = text.match(/100.*\$a\s*([^$|\n]+)/);
            const ddcMatch = text.match(/082.*\$a\s*(\d+\.?\d*)/);
            const cutterMatch = text.match(/090.*\$b\s*([A-Z]\d+)/);

            if (isMounted) {
              setFormData({
                ...formData,
                title: titleMatch ? titleMatch[1].trim() : formData.title,
                author: authorMatch ? authorMatch[1].trim() : formData.author,
                appendix: `DDC: ${ddcMatch ? ddcMatch[1] : 'N/A'}\nCutter: ${cutterMatch ? cutterMatch[1] : 'N/A'}`
              });
              Alert.alert("Thành công", "Đã trích xuất metadata từ MARC21");
            }
          }
        }
      ]
    );
  };

  const adjustCopies = (amount: number) => {
    const current = parseInt(formData.total_copies) || 0;
    setFormData({ ...formData, total_copies: String(Math.max(1, current + amount)) });
  };
  
  const filteredBooks = books?.filter((book: Book) => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.appendix?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('librarian.books_management')}</Text>
          <Text style={styles.headerSubtitle}>{t('librarian.add_book_desc')}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { resetForm(); setModalVisible(true); }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#5A5F7A" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tên, tác giả, tóm tắt..."
            placeholderTextColor="#5A5F7A"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#5A5F7A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
        {isLoading ? (
          <View style={styles.loader}>
            <Text style={styles.loaderText}>{t('messages.loading')}</Text>
          </View>
        ) : (
          filteredBooks?.map((book: Book) => (
            <BookItem 
              key={book.isbn} 
              item={book} 
              showActions 
              onEdit={handleEdit}
              onRatingPress={handleEdit} 
              onDelete={(item: Book) => {
                Alert.alert(t('librarian.delete_confirm'), t('librarian.delete_confirm_msg'), [
                  { text: t('common.cancel') },
                  { text: t('common.confirm'), style: 'destructive', onPress: () => {
                    supabase.from('books').delete().eq('isbn', item.isbn).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['books'] });
                    });
                  }}
                ]);
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBook ? t('common.edit') : t('librarian.add_book')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#8B8FA3" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                {/* ISBN & Sync */}
                <Text style={styles.fieldLabel}>ISBN</Text>
                <View style={styles.isbnRow}>
                  <TextInput
                    value={formData.isbn}
                    onChangeText={(val) => setFormData({ ...formData, isbn: val })}
                    placeholder={t('common.isbn') + '...'}
                    placeholderTextColor="#3D4260"
                    style={[styles.textInput, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={handleSync} style={styles.syncBtn}>
                    <Ionicons name="sync" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleMarc21Import} style={[styles.syncBtn, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="document-text" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Basic Info */}
                <Text style={styles.fieldLabel}>TIÊU ĐỀ SÁCH</Text>
                <TextInput
                  value={formData.title}
                  onChangeText={(val) => setFormData({ ...formData, title: val })}
                  placeholder={t('common.book_title') + '...'}
                  placeholderTextColor="#3D4260"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>TÁC GIẢ</Text>
                <TextInput
                  value={formData.author}
                  onChangeText={(val) => setFormData({ ...formData, author: val })}
                  placeholder={t('common.author') + '...'}
                  placeholderTextColor="#3D4260"
                  style={styles.textInput}
                />

                {/* Quantity Manager */}
                <Text style={styles.fieldLabel}>{t('common.total_copies').toUpperCase()}</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={() => adjustCopies(-1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TextInput
                    value={formData.total_copies}
                    onChangeText={(val) => setFormData({ ...formData, total_copies: val })}
                    keyboardType="numeric"
                    style={styles.qtyInput}
                  />
                  <TouchableOpacity onPress={() => adjustCopies(1)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Rating */}
                <Text style={styles.fieldLabel}>{t('common.status').toUpperCase()}</Text>
                <RatingPicker 
                  rating={parseFloat(formData.average_rating)} 
                  onRatingChange={(r) => setFormData({...formData, average_rating: String(r)})} 
                />

                {/* Advanced Metadata */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>NĂM XUẤT BẢN</Text>
                    <TextInput
                      value={formData.published_date}
                      onChangeText={(val) => setFormData({ ...formData, published_date: val })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#3D4260"
                      style={styles.textInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>NGÔN NGỮ</Text>
                    <TextInput
                      value={formData.language}
                      onChangeText={(val) => setFormData({ ...formData, language: val })}
                      placeholder="vi, en..."
                      placeholderTextColor="#3D4260"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>THỂ LOẠI</Text>
                <TextInput
                  value={formData.category}
                  onChangeText={(val) => setFormData({ ...formData, category: val })}
                  placeholder="Category..."
                  placeholderTextColor="#3D4260"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>BẢN TÓM TẮT</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(val) => setFormData({ ...formData, description: val })}
                  multiline
                  placeholder={t('common.no_description')}
                  placeholderTextColor="#3D4260"
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                />

                <Text style={styles.fieldLabel}>PHỤ LỤC (TABLE OF CONTENTS)</Text>
                <TextInput
                  value={formData.appendix}
                  onChangeText={(val) => setFormData({ ...formData, appendix: val })}
                  multiline
                  placeholder="Chương 1: ..., Chương 2: ..."
                  placeholderTextColor="#3D4260"
                  style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]}
                />

                <TouchableOpacity 
                  disabled={saveMutation.isPending}
                  onPress={() => saveMutation.mutate()}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>
                    {saveMutation.isPending ? t('common.loading') : t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  scrollArea: { paddingHorizontal: 24, paddingBottom: 40 },
  loader: { marginTop: 40, alignItems: 'center' },
  loaderText: { color: '#5A5F7A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#151929', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '92%' },
  modalIndicator: { width: 40, height: 4, backgroundColor: '#2E3654', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E2540', alignItems: 'center', justifyContent: 'center' },
  formContainer: { gap: 16, paddingBottom: 24 },
  fieldLabel: { color: '#5A5F7A', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  textInput: { backgroundColor: '#0B0F1A', borderRadius: 15, padding: 16, color: '#FFFFFF', borderWidth: 1.5, borderColor: '#1E2540', fontSize: 15 },
  isbnRow: { flexDirection: 'row', gap: 10 },
  syncBtn: { width: 55, backgroundColor: '#4F8EF7', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  qtyBtn: { width: 44, height: 44, backgroundColor: '#1E2540', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyInput: { flex: 1, backgroundColor: '#0B0F1A', borderRadius: 12, padding: 12, color: '#FFFFFF', textAlign: 'center', fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 15 },
  submitBtn: { backgroundColor: '#4F8EF7', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151929',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
