import axios from 'axios';

export interface BookMetadata {
  title: string;
  author: string;
  description?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  thumbnail?: string;
  isbn?: string;
  language?: string;
}

export const fetchBookMetadata = async (isbn: string): Promise<BookMetadata | null> => {
  try {
    const cleanIsbn = isbn.replace(/[- ]/g, "");
    
    // 1. Fetch from Google Books API
    const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    const googleItem = googleRes.data.items?.[0]?.volumeInfo;

    // 2. Fetch from Open Library API (fallback/supplement)
    const openLibRes = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
    const openLibKey = `ISBN:${cleanIsbn}`;
    const openLibData = openLibRes.data[openLibKey];

    if (!googleItem && !openLibData) return null;

    // Merge data - Google prioritized for content, OpenLib for high-res covers
    return {
      title: googleItem?.title || openLibData?.title || "Unknown Title",
      author: googleItem?.authors?.[0] || openLibData?.authors?.[0]?.name || "Unknown Author",
      description: googleItem?.description || openLibData?.notes || "",
      publisher: googleItem?.publisher || openLibData?.publishers?.[0]?.name,
      publishedDate: googleItem?.publishedDate || openLibData?.publish_date,
      pageCount: googleItem?.pageCount || openLibData?.number_of_pages,
      categories: googleItem?.categories || [],
      // Priority: OpenLib Large -> OpenLib Medium -> Google Thumbnail
      thumbnail: openLibData?.cover?.large || openLibData?.cover?.medium || googleItem?.imageLinks?.thumbnail,
      isbn: cleanIsbn,
      language: googleItem?.language || "vi"
    };
  } catch (error) {
    console.error("Error fetching book metadata:", error);
    return null;
  }
};
