/**
 * Audiobook Metadata Service
 * Queries the audiobook_metadata table in Supabase
 * Used in BiblioTech app for displaying audiobook details
 */

import { supabase } from '@/src/lib/supabase';

export interface AudiobookRecord {
  id: string;
  source_platform: 'fonos' | 'voizfm';
  source_id: string;
  source_url: string;
  title: string;
  author: string | null;
  narrator: string | null;
  description: string | null;
  publisher: string | null;
  isbn: string | null;
  language: string;
  cover_url: string | null;
  duration_seconds: number | null;
  chapters: Array<{ index: number; title: string; duration_seconds: number | null }>;
  categories: string[];
  tags: string[];
  price: number | null;
  is_free: boolean;
  rating: number | null;
  review_count: number;
  published_at: string | null;
  scraped_at: string;
}

/** Full-text search by title or author, or exact ISBN match */
export async function searchAudiobooks(
  query: string,
  limit = 20
): Promise<AudiobookRecord[]> {
  const { data, error } = await supabase.rpc('search_audiobooks', {
    query,
    lim: limit,
  });
  if (error) {
    console.error('[audiobookMetadataService] search error:', error.message);
    return [];
  }
  return data ?? [];
}

/** Get audiobook by ISBN (cross-platform) */
export async function getAudiobookByISBN(isbn: string): Promise<AudiobookRecord | null> {
  const { data, error } = await supabase
    .from('audiobook_metadata')
    .select('*')
    .eq('isbn', isbn)
    .maybeSingle();
  if (error) {
    console.error('[audiobookMetadataService] ISBN lookup error:', error.message);
    return null;
  }
  return data;
}

/** Get audiobook by source ID (slug for Fonos, numeric ID for VoizFM) */
export async function getAudiobookBySourceId(
  platform: 'fonos' | 'voizfm',
  sourceId: string
): Promise<AudiobookRecord | null> {
  const { data, error } = await supabase
    .from('audiobook_metadata')
    .select('*')
    .eq('source_platform', platform)
    .eq('source_id', sourceId)
    .maybeSingle();
  if (error) {
    console.error('[audiobookMetadataService] source ID lookup error:', error.message);
    return null;
  }
  return data;
}

/** Browse audiobooks with pagination */
export async function browseAudiobooks(opts: {
  platform?: 'fonos' | 'voizfm';
  category?: string;
  page?: number;
  pageSize?: number;
  orderBy?: 'rating' | 'review_count' | 'scraped_at';
}): Promise<{ data: AudiobookRecord[]; count: number }> {
  const { platform, category, page = 1, pageSize = 20, orderBy = 'rating' } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audiobook_metadata')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: false, nullsFirst: false })
    .range(from, to);

  if (platform) query = query.eq('source_platform', platform);
  if (category) query = query.contains('categories', [category]);

  const { data, error, count } = await query;
  if (error) {
    console.error('[audiobookMetadataService] browse error:', error.message);
    return { data: [], count: 0 };
  }
  return { data: data ?? [], count: count ?? 0 };
}

/** Format duration from seconds to human-readable */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}
