import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Book } from '../hooks/library/types';
import { useMetadataSettings } from '../hooks/useMetadataSettings';

interface BookItemProps {
  item: Book;
  onPress?: (item: Book) => void;
  onEdit?: (item: Book) => void;
  onDelete?: (item: Book) => void;
  onRatingPress?: (item: Book) => void;
  showActions?: boolean;
  visibleFields?: string[]; 
}

export const BookItem: React.FC<BookItemProps> = ({ 
  item, 
  onPress, 
  onEdit, 
  onDelete,
  onRatingPress,
  showActions = false,
  visibleFields 
}) => {
  const { isVisible } = useMetadataSettings();
  const gData = item.google_data || {};
  
  // DATA PRIORITY: Database Column (Manual Edit) > google_data (Cached Sync) > Fallback
  const title = item.title || gData.title || 'Untitled';
  const author = item.author || gData.authors?.join(', ') || 'Unknown Author';
  const pageCount = item.page_count || gData.pageCount;
  const rating = item.average_rating || gData.averageRating || 0;
  const ratingCount = item.ratings_count || gData.ratingsCount;
  const category = item.category || gData.categories?.[0];
  const description = item.description || gData.description;
  const publishedDate = item.published_date || gData.publishedDate;
  const language = item.language || gData.language;
  const appendix = item.appendix;

  // Cover Image Logic: Open Library -> Google Fallback -> Placeholder
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg?default=false`;
  const googleThumbnail = gData.imageLinks?.thumbnail || item.cover_url;
  
  const [imgSrc, setImgSrc] = useState({ uri: openLibraryUrl });
  const [useFallback, setUseFallback] = useState(false);

  const handleImgError = () => {
    if (!useFallback && googleThumbnail) {
      setImgSrc({ uri: googleThumbnail });
      setUseFallback(true);
    } else {
      setImgSrc(require('../../assets/images/icon.png')); // Final Placeholder
    }
  };

  return (
    <TouchableOpacity 
      style={styles.recordCard} 
      onPress={() => onPress?.(item)}
      disabled={!onPress}
    >
      <View style={styles.recordThumbContainer}>
        <Image 
          source={imgSrc} 
          style={styles.recordThumb} 
          onError={handleImgError}
          resizeMode="cover"
        />
      </View>
      
      <View style={styles.recordInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.recordBookTitle} numberOfLines={2}>{title}</Text>
          {(visibleFields ? visibleFields.includes('isbn') : isVisible('isbn')) && (
            <Text style={styles.isbnText}>{item.isbn}</Text>
          )}
        </View>
        <Text style={styles.recordAuthor} numberOfLines={1}>{author}</Text>
        
        <View style={styles.metaBadgeRow}>
          {(visibleFields ? visibleFields.includes('page_count') : isVisible('page_count')) && pageCount ? (
            <View style={styles.metaBadge}>
              <Ionicons name="document-text-outline" size={12} color="#8B8FA3" />
              <Text style={styles.metaText}>{pageCount} pages</Text>
            </View>
          ) : null}

          {(visibleFields ? visibleFields.includes('average_rating') : isVisible('average_rating')) && (
            <TouchableOpacity 
              onPress={() => onRatingPress?.(item)}
              activeOpacity={0.6}
              style={styles.ratingRow}
            >
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'No rating'}</Text>
              {ratingCount && <Text style={styles.ratingCount}>({ratingCount})</Text>}
            </TouchableOpacity>
          )}
        </View>

        {showActions && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.available_copies} / {item.total_copies} AVAILABLE
            </Text>
          </View>
        )}

        {(visibleFields ? (visibleFields.includes('category') || visibleFields.includes('published_date') || visibleFields.includes('language')) : (isVisible('category') || isVisible('published_date') || isVisible('language'))) && (
          <View style={styles.metaRow}>
            {(visibleFields ? visibleFields.includes('category') : isVisible('category')) && category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{category}</Text>
              </View>
            )}
            {(visibleFields ? visibleFields.includes('published_date') : isVisible('published_date')) && publishedDate && (
              <Text style={styles.yearText}>• {publishedDate.substring(0, 4)}</Text>
            )}
            {(visibleFields ? visibleFields.includes('language') : isVisible('language')) && language && (
              <View style={[styles.tag, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={[styles.tagText, { color: '#10B981' }]}>{language.toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}

        {(visibleFields ? visibleFields.includes('description') : isVisible('description')) && description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {(visibleFields ? visibleFields.includes('appendix') : isVisible('appendix')) && appendix && (
          <View style={styles.appendixContainer}>
            <Text style={styles.appendixLabel}>Phụ lục:</Text>
            <Text style={styles.appendixText} numberOfLines={1}>
              {appendix}
            </Text>
          </View>
        )}

        {(visibleFields ? visibleFields.includes('edition') : isVisible('edition')) && item.edition && (
          <Text style={styles.editionText}>Phiên bản: {item.edition}</Text>
        )}
      </View>

      {showActions && (
        <View style={styles.recordActions}>
          <TouchableOpacity onPress={() => onEdit?.(item)} style={styles.actionBtnIcon}>
            <Ionicons name="create-outline" size={18} color="#4F8EF7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete?.(item)} style={[styles.actionBtnIcon, { marginTop: 8 }]}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  recordCard: { 
    backgroundColor: '#151929', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#1E2540', 
    flexDirection: 'row',
    alignItems: 'center'
  },
  recordThumbContainer: { 
    width: 70, 
    height: 100, 
    backgroundColor: '#1E2540', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden',
    elevation: 3
  },
  recordThumb: { 
    width: '100%', 
    height: '100%' 
  },
  recordInfo: { 
    flex: 1, 
    marginLeft: 16, 
    justifyContent: 'center' 
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  isbnText: {
    color: '#3A75F2',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8
  },
  recordBookTitle: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700',
    lineHeight: 20,
    flex: 1
  },
  recordAuthor: { 
    color: '#8B8FA3', 
    fontSize: 13, 
    marginTop: 4 
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    color: '#5A5F7A',
    fontSize: 12,
  },
  badge: { 
    backgroundColor: 'rgba(79, 142, 247, 0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    marginTop: 10, 
    alignSelf: 'flex-start' 
  },
  badgeText: { 
    color: '#4F8EF7', 
    fontSize: 10, 
    fontWeight: '800' 
  },
  recordActions: { 
    justifyContent: 'center', 
    paddingLeft: 12 
  },
  actionBtnIcon: { 
    width: 36, 
    height: 36, 
    backgroundColor: '#1E2540', 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8
  },
  tag: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  yearText: {
    color: '#5A5F7A',
    fontSize: 11,
    fontWeight: '600'
  },
  description: {
    color: '#8B8FA3',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700'
  },
  ratingCount: {
    color: '#5A5F7A',
    fontSize: 11
  },
  editionText: {
    color: '#3D4260',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600'
  },
  appendixContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  appendixLabel: {
    color: '#4F8EF7',
    fontSize: 11,
    fontWeight: '700'
  },
  appendixText: {
    color: '#8B8FA3',
    fontSize: 11,
    flex: 1
  }
});
