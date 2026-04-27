import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLibrary, Book } from '../../src/hooks/useLibrary';
import { BookItem } from '../../src/components/BookItem';

export default function SearchPage() {
  const { t } = useTranslation();
  const { books, borrows } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allBooks, isLoading } = books.list();

  const [isMounted, setIsMounted] = useState(true);
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const filteredBooks = allBooks?.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.appendix?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('common.search')}</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8B8FA3" />
          <TextInput
            style={styles.input}
            placeholder={t('common.search_placeholder')}
            placeholderTextColor="#5A5F7A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8B8FA3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#4F8EF7" style={{ marginTop: 40 }} />
        ) : filteredBooks && filteredBooks.length > 0 ? (
          filteredBooks.map((book: Book) => (
            <BookItem 
              key={book.isbn} 
              item={book} 
              onPress={() => {
                if (book.available_copies > 0) {
                  borrows.borrow.mutate(book.isbn, {
                    onSuccess: () => {
                      if (isMounted) Alert.alert(t('common.success'), t('messages.borrow_success'));
                    },
                    onError: (err: any) => {
                      if (isMounted) Alert.alert(t('common.error'), err.message);
                    }
                  });
                }
              }}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={64} color="#1E2540" />
            <Text style={styles.emptyText}>{t('messages.no_results')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151929', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#1E2540' },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#FFFFFF' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  bookCard: { backgroundColor: '#151929', borderRadius: 20, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1E2540' },
  coverContainer: { width: 60, height: 85, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1E2540' },
  cover: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 16 },
  bookTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  author: { color: '#8B8FA3', fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: 'rgba(79, 142, 247, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
  badgeText: { color: '#4F8EF7', fontSize: 10, fontWeight: '800' },
  borrowBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4F8EF7', alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#1E2540' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#3D4260', marginTop: 16, fontSize: 16, fontWeight: '600' }
});

