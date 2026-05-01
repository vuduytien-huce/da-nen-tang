import axios from "axios";
import { supabase } from "../../api/supabase";
import { ai } from "../../core/ai";
import {
  AudiobookRecord,
  Book,
  BookMetadata,
  EnrichedAudiobook,
} from "./books.types";

export const booksService = {
  /**
   * Normalizes ISBN by removing dashes, spaces, and 'ISBN:' prefix.
   */
  normalizeIsbn(isbn: string): string {
    return isbn
      .replace(/^ISBN:/i, "")
      .replace(/[-\s]/g, "")
      .trim();
  },

  /** Normalize a Vietnamese title for fuzzy matching */
  normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  },

  // --- Physical Books Metadata ---

  async fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
    const cleanIsbn = this.normalizeIsbn(isbn);

    let googleItem = null;
    let openLibData = null;

    try {
      const googleRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`,
        { timeout: 5000 },
      );
      googleItem = googleRes.data.items?.[0]?.volumeInfo || null;
    } catch (error: any) {
      console.warn(`Google Books API failed for ${cleanIsbn}:`, error.message);
    }

    try {
      const openLibRes = await axios.get(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
        { timeout: 5000 },
      );
      const openLibKey = `ISBN:${cleanIsbn}`;
      openLibData = openLibRes.data[openLibKey] || null;
    } catch (error: any) {
      console.warn(`Open Library API failed for ${cleanIsbn}:`, error.message);
    }

    if (!googleItem && !openLibData) return null;

    return {
      title: googleItem?.title || openLibData?.title || "Unknown Title",
      author:
        googleItem?.authors?.join(", ") ||
        openLibData?.authors?.map((a: any) => a.name).join(", ") ||
        "Unknown Author",
      description:
        googleItem?.description ||
        openLibData?.notes ||
        openLibData?.description ||
        "",
      publisher: googleItem?.publisher || openLibData?.publishers?.[0]?.name,
      publishedDate: googleItem?.publishedDate || openLibData?.publish_date,
      pageCount: googleItem?.pageCount || openLibData?.number_of_pages,
      categories:
        googleItem?.categories ||
        openLibData?.subjects?.map((s: any) => s.name) ||
        [],
      thumbnail:
        openLibData?.cover?.large ||
        openLibData?.cover?.medium ||
        googleItem?.imageLinks?.thumbnail ||
        googleItem?.imageLinks?.smallThumbnail ||
        `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
      isbn: cleanIsbn,
      language: googleItem?.language || "vi",
      averageRating: googleItem?.averageRating,
      ratingsCount: googleItem?.ratingsCount,
      edition:
        googleItem?.contentVersion ||
        openLibData?.identifiers?.openlibrary?.[0],
      syncSource: {
        google: !!googleItem,
        openLib: !!openLibData,
      },
    };
  },

  /**
   * Fetches metadata by title and author when ISBN is not available.
   * Prioritizes Open Library for cover images.
   */
  async fetchMetadataBySearch(
    title: string,
    author: string,
  ): Promise<Partial<BookMetadata> | null> {
    const cleanTitle = this.normalizeTitle(title);
    const cleanAuthor = author ? this.normalizeTitle(author) : "";

    let openLibCover = null;
    let googleMetadata: any = null;

    // 1. Try Open Library Search for Cover
    try {
      const olSearchRes = await axios.get(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(cleanAuthor)}&limit=1`,
        { timeout: 5000 },
      );
      const doc = olSearchRes.data.docs?.[0];
      if (doc?.cover_i) {
        openLibCover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      } else if (doc?.isbn?.[0]) {
        openLibCover = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
      }
    } catch (e) {
      console.warn("OpenLib search failed:", e);
    }

    // 2. Try Google Books for backup and metadata
    try {
      const gRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanTitle)}+inauthor:${encodeURIComponent(cleanAuthor)}&maxResults=1`,
        { timeout: 5000 },
      );
      googleMetadata = gRes.data.items?.[0]?.volumeInfo;
    } catch (e) {
      console.warn("Google Books search failed:", e);
    }

    if (!openLibCover && !googleMetadata) return null;

    return {
      title: googleMetadata?.title || title,
      author: googleMetadata?.authors?.join(", ") || author,
      description: googleMetadata?.description,
      thumbnail:
        openLibCover ||
        googleMetadata?.imageLinks?.thumbnail ||
        googleMetadata?.imageLinks?.smallThumbnail,
      categories: googleMetadata?.categories || [],
    };
  },

  // --- Audiobooks Logic ---

  async enrichWithBookMetadata(
    audiobooks: AudiobookRecord[],
  ): Promise<EnrichedAudiobook[]> {
    if (audiobooks.length === 0) return [];

    const enriched: EnrichedAudiobook[] = [];

    for (const ab of audiobooks) {
      let canonical_author = ab.author;
      let canonical_description = ab.description;
      let canonical_cover_url = ab.cover_url;

      const { data: matchedBooks } = await supabase
        .from("books")
        .select("title, author, description, cover_url, isbn")
        .ilike("title", `%${this.normalizeTitle(ab.title)}%`)
        .limit(1);

      if (matchedBooks && matchedBooks.length > 0) {
        const book = matchedBooks[0];
        canonical_author = book.author || canonical_author;
        canonical_description = canonical_description || book.description;
        canonical_cover_url = canonical_cover_url || book.cover_url;
      } else {
        // If no local match, try external search
        try {
          const external = await this.fetchMetadataBySearch(
            ab.title,
            ab.author || "",
          );
          if (external) {
            canonical_author = external.author || canonical_author || null;
            canonical_description =
              canonical_description || external.description || null;
            canonical_cover_url =
              canonical_cover_url || external.thumbnail || null;
          }
        } catch (e) {
          console.warn(`External enrichment failed for ${ab.title}:`, e);
        }
      }

      if (
        ab.source_platform === "thuviensachnoi" &&
        !matchedBooks?.length &&
        !canonical_author
      ) {
        canonical_author = null;
      }

      enriched.push({
        ...ab,
        canonical_author,
        canonical_description,
        canonical_cover_url: canonical_cover_url || ab.cover_url, // Fallback to original
        duration: this.formatDuration(ab.duration_seconds),
      });
    }

    return enriched;
  },

  async bulkEnrichAudiobooks() {
    const { data: audiobooks, error: fetchError } = await supabase
      .from("audiobook_metadata")
      .select("*");

    if (fetchError) throw fetchError;
    if (!audiobooks || audiobooks.length === 0) return { count: 0 };

    const enriched = await this.enrichWithBookMetadata(audiobooks);

    let updatedCount = 0;
    for (const item of enriched) {
      if (
        item.canonical_author ||
        item.canonical_cover_url ||
        item.canonical_description
      ) {
        const { error: updateError } = await supabase
          .from("audiobook_metadata")
          .update({
            author: item.canonical_author || item.author,
            cover_url: item.canonical_cover_url || item.cover_url,
            description: item.canonical_description || item.description,
            tags: {
              ...(item.tags || {}),
              is_enriched: true,
              enriched_at: new Date().toISOString(),
            },
          } as any)
          .eq("id", item.id);

        if (!updateError) updatedCount++;
      }
    }

    return { total: audiobooks.length, updated: updatedCount };
  },

  async searchAudiobooks(
    query: string,
    limit = 20,
  ): Promise<EnrichedAudiobook[]> {
    const { data, error } = await supabase.rpc("search_audiobooks", {
      query,
      lim: limit,
    });
    if (error || !data) return [];
    return this.enrichWithBookMetadata(data);
  },

  async getAudiobookByISBN(isbn: string): Promise<EnrichedAudiobook | null> {
    const { data, error } = await supabase
      .from("audiobook_metadata")
      .select("*")
      .eq("isbn", isbn)
      .maybeSingle();
    if (error || !data) return null;
    const enriched = await this.enrichWithBookMetadata([data]);
    return enriched[0];
  },

  formatDuration(seconds: number | null): string {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
  },

  getPlaybackUrl(record: AudiobookRecord): string {
    if (record.source_platform === "thuviensachnoi" && record.tags?.r2_path) {
      return `https://biblio-tech-audio.tien2004.workers.dev/${record.tags.r2_path}`;
    }
    return record.preview_url || record.source_url;
  },

  // --- Recommendations ---

  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 5,
  ): Promise<Book[]> {
    try {
      const { data: history, error: historyError } = await supabase
        .from("borrow_records")
        .select("book_id, books(category)")
        .eq("user_id", userId);

      if (historyError) throw historyError;

      const genreCounts: Record<string, number> = {};
      const borrowedIsbns: string[] = [];

      history?.forEach((record: any) => {
        borrowedIsbns.push(record.book_id);
        const category = (record.books as any)?.category;
        if (category && category !== "Uncategorized") {
          genreCounts[category] = (genreCounts[category] || 0) + 1;
        }
      });

      const favoriteGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([genre]) => genre);

      let recommendedBooks: Book[] = [];

      if (favoriteGenres.length > 0) {
        const { data: books, error: bookError } = await supabase
          .from("books")
          .select("*")
          .in("category", favoriteGenres.slice(0, 3))
          .not("isbn", "in", `(${borrowedIsbns.join(",") || '""'})`)
          .order("average_rating", { ascending: false })
          .limit(limit);

        if (!bookError) recommendedBooks = books || [];
      }

      if (recommendedBooks.length < limit) {
        const { data: popularBooks, error: popularError } = await supabase
          .from("books")
          .select("*")
          .not("isbn", "in", `(${borrowedIsbns.join(",") || '""'})`)
          .order("average_rating", { ascending: false })
          .limit(limit - recommendedBooks.length);

        if (!popularError && popularBooks)
          recommendedBooks = [...recommendedBooks, ...popularBooks];
      }

      return recommendedBooks;
    } catch (error) {
      console.error("[booksService] Recommendation error:", error);
      return [];
    }
  },

  async getSemanticRecommendations(
    userId: string,
    limit: number = 5,
  ): Promise<Book[]> {
    try {
      const { data: history, error: historyError } = await supabase
        .from("borrow_records")
        .select("books(title, author, category, description)")
        .eq("user_id", userId)
        .order("borrowed_at", { ascending: false })
        .limit(5);

      if (historyError || !history || history.length === 0) {
        return this.getPersonalizedRecommendations(userId, limit);
      }

      const profileText = history
        .map(
          (h: any) => `${h.books.title} ${h.books.author} ${h.books.category}`,
        )
        .join(" ");

      const profileEmbedding = await ai.generateEmbedding(profileText);

      const { data: recommendations, error: matchError } = await supabase.rpc(
        "match_books",
        {
          query_embedding: profileEmbedding,
          match_threshold: 0.4,
          match_count: limit + 5,
        },
      );

      if (matchError) throw matchError;

      const borrowedTitles = history.map((h: any) => h.books.title);
      return (recommendations || [])
        .filter((b: any) => !borrowedTitles.includes(b.title))
        .slice(0, limit);
    } catch (error) {
      console.error("[booksService] Semantic error:", error);
      return this.getPersonalizedRecommendations(userId, limit);
    }
  },

  async browseAudiobooks(limit = 20): Promise<EnrichedAudiobook[]> {
    const { data, error } = await supabase
      .from("audiobook_metadata")
      .select("*")
      .limit(limit);
    if (error || !data) return [];
    return this.enrichWithBookMetadata(data);
  },

  async getAudiobookBySourceId(
    platform: string,
    sourceId: string,
  ): Promise<EnrichedAudiobook | null> {
    const { data, error } = await supabase
      .from("audiobook_metadata")
      .select("*")
      .eq("source_platform", platform)
      .eq("source_id", sourceId)
      .maybeSingle();
    if (error || !data) return null;
    const enriched = await this.enrichWithBookMetadata([data]);
    return enriched[0];
  },

  async syncBookMetadata(isbn: string) {
    const metadata = await this.fetchBookMetadata(isbn);
    if (!metadata) return null;

    // Check if book exists
    const { data: existing } = await supabase
      .from("books")
      .select("isbn")
      .eq("isbn", isbn)
      .maybeSingle();

    const payload = {
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      cover_url: metadata.thumbnail,
      published_date: metadata.publishedDate,
      category: metadata.categories?.[0] || "Uncategorized",
      language: metadata.language,
      average_rating: metadata.averageRating,
      edition: metadata.edition,
      isbn: metadata.isbn,
    };

    if (existing) {
      const { data, error } = await supabase
        .from("books")
        .update(payload)
        .eq("isbn", isbn)
        .select()
        .single();
      if (error) throw error;
      return { data, isNew: false };
    } else {
      return { data: payload, isNew: true }; // Just return for preview in the form
    }
  },
};
