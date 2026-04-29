import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../api/supabase";

// Lấy API Key từ biến môi trường (Cần nạp vào .env)
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const ai = {
  /**
   * Trò chuyện với thủ thư ảo BiblioAI
   */
  async askLibrarian(userPrompt: string, bookContext?: string) {
    if (!API_KEY) {
      console.warn("[AiService] Gemini API Key missing. Returning fallback.");
      return "Tôi rất muốn giúp bạn, nhưng hệ thống AI của tôi chưa được cấu hình khóa (API Key). Hãy báo với Admin nhé!";
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Attempt to enrich context with semantic search for recommendation prompts
      let semanticContext = "";
      const lowerPrompt = userPrompt.toLowerCase();
      if (lowerPrompt.includes("gợi ý") || lowerPrompt.includes("tìm") || lowerPrompt.includes("sách nào") || lowerPrompt.includes("muốn đọc")) {
        try {
          const matches = await this.semanticSearch(userPrompt, 0.4, 3);
          if (matches && matches.length > 0) {
            semanticContext = `\nSách hiện có trong thư viện phù hợp với yêu cầu: ${matches.map((m: any) => `"${m.title}" của ${m.author}`).join(", ")}.`;
          }
        } catch (e) {
          console.warn("[AiService] Context enrichment failed:", e);
        }
      }

      const systemPrompt = `Bạn là BiblioAI - thủ thư ảo thông minh và thân thiện của thư viện BiblioTech. 
      Nhiệm vụ của bạn là:
      1. Gợi ý sách hay dựa trên sở thích của người dùng. Ưu tiên gợi ý các sách có sẵn trong danh sách ngữ cảnh được cung cấp.
      2. Giải đáp thắc mắc về nội dung sách (nếu biết).
      3. Hướng dẫn người dùng cách sử dụng thư viện.
      4. Luôn giữ thái độ lịch sự, chuyên nghiệp và truyền cảm hứng đọc sách.
      
      ${bookContext ? `Ngữ cảnh sách hiện tại: ${bookContext}` : ""}
      ${semanticContext ? `Ngữ cảnh sách thực tế trong kho: ${semanticContext}` : ""}
      
      Hãy trả lời bằng tiếng Việt, ngắn gọn và súc tích. Nếu có gợi ý sách thực tế từ kho, hãy nêu tên chúng.`;

      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error("[AiService] Error:", error);
      return "Có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Hãy thử lại sau giây lát!";
    }
  },

  /**
   * Phân tích tóm tắt nhanh về một cuốn sách
   */
  async summarizeBook(title: string, author: string, description: string) {
    if (!API_KEY) return "Vui lòng cấu hình API Key để sử dụng tính năng này.";
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Bạn là BiblioAI, một thủ thư thông minh. Hãy tóm tắt cuốn sách "${title}" của tác giả "${author}" dựa trên mô tả sau: "${description}". 
      Yêu cầu:
      1. Tóm tắt súc tích, dễ hiểu.
      2. Nêu bật 3 giá trị cốt lõi hoặc bài học chính dưới dạng bullet points.
      3. Giọng văn truyền cảm hứng, chuyên nghiệp.
      4. Định dạng bằng Markdown.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('[AiService] Error summarizing book:', error);
      return "Không thể tạo tóm tắt vào lúc này. Vui lòng thử lại sau.";
    }
  },

  /**
   * Lấy tóm tắt sách dựa trên ISBN
   */
  async getBookSummary(isbn: string) {
    try {
      const { data: book, error } = await supabase
        .from('books')
        .select('title, author, description')
        .eq('isbn', isbn)
        .single();
        
      if (error || !book) throw new Error("Không tìm thấy thông tin sách");
      
      return this.summarizeBook(book.title, book.author, book.description || "");
    } catch (error) {
      console.error('[AiService] getBookSummary error:', error);
      throw error;
    }
  },

  /**
   * Tạo vector embedding cho văn bản (768 dimensions)
   */
  async generateEmbedding(text: string) {
    if (!API_KEY) throw new Error("Missing Gemini API Key");
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text);

      return result.embedding.values;
    } catch (error) {
      console.error("[AiService] Embedding error:", error);
      throw error;
    }
  },

  /**
   * Gợi ý sách cá nhân hóa dựa trên lịch sử
   */
  async getPersonalizedRecommendations(history: string[]) {
    if (!API_KEY) return [];
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Dựa trên danh sách các cuốn sách người dùng đã đọc: [${history.join(', ')}]. 
      Hãy gợi ý 5 cuốn sách khác có chủ đề tương tự hoặc phong cách tương đồng. 
      Chỉ trả về danh sách tên sách, mỗi cuốn một dòng.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^\d+\.\s*/, '').trim());
    } catch (error) {
      console.error("[AiService] Recommendation error:", error);
      return [];
    }
  },

  /**
   * Gợi ý sách cá nhân hóa nâng cao (Semantic Discovery)
   */
  async getRecommendationsByProfile(titles: string[], categories: string[]) {
    if (!API_KEY) return [];
    try {
      // Build a profile context from reading history
      const context = `Người dùng thích các thể loại: ${categories.join(', ')}. Các sách đã đọc: ${titles.join(', ')}. Hãy gợi ý các sách tương tự.`;
      return this.semanticSearch(context, 0.3, 10);
    } catch (error) {
      console.error("[AiService] Semantic recommendation error:", error);
      return [];
    }
  },

  /**
   * Khởi tạo phiên trò chuyện với AI
   */
  async startChat(history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
    if (!API_KEY) throw new Error("Missing API Key");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const systemPrompt = `Bạn là BiblioAI - thủ thư ảo thông minh của thư viện BiblioTech. 
    Hãy trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp. 
    Nếu người dùng hỏi về sách, hãy cố gắng gợi ý những đầu sách hay.`;

    return model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Tôi đã sẵn sàng! Tôi là BiblioAI, thủ thư của bạn. Tôi có thể giúp gì cho bạn hôm nay?" }] },
        ...history
      ]
    });
  },

  /**
   * Tìm kiếm sách bằng ngữ nghĩa (Semantic Search)
   */
  async semanticSearch(query: string, threshold = 0.4, count = 5) {
    try {
      const embedding = await this.generateEmbedding(query);
      const { data, error } = await supabase.rpc('match_books', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[AiService] Semantic search error:", error);
      return [];
    }
  },

  /**
   * Xử lý lệnh giọng nói từ người dùng
   */
  async processVoiceCommand(transcription: string) {
    if (!API_KEY) return { text: "AI chưa được cấu hình.", intent: 'chat', books: [] };
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Bạn là thủ thư ảo BiblioAI. Người dùng vừa nói: "${transcription}".
      Hãy phân tích ý định của người dùng và trả về một đối tượng JSON:
      {
        "response": "Câu trả lời thân thiện của bạn (Tiếng Việt)",
        "intent": "search", "chat", hoặc "guide",
        "searchQuery": "Từ khóa tìm kiếm tối ưu nếu intent là search, nếu không thì để trống"
      }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Clean JSON if Gemini adds markdown markers
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      let books: any[] = [];
      if (parsed.intent === 'search' && parsed.searchQuery) {
        books = await this.semanticSearch(parsed.searchQuery, 0.35, 10);
      }

      return {
        text: parsed.response,
        intent: parsed.intent,
        books: books,
        searchQuery: parsed.searchQuery
      };
    } catch (error) {
      console.error("[AiService] Voice process error:", error);
      return { 
        text: `Tôi nghe thấy: "${transcription}". Bạn có muốn tôi tìm kiếm thông tin này không?`, 
        intent: 'chat',
        books: [] 
      };
    }
  },

  /**
   * Phân tích và gợi ý luân chuyển sách giữa các chi nhánh
   */
  async analyzeLogistics(prompt: string): Promise<any[]> {
    if (!API_KEY) return [];
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = (await result.response).text().replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (e) {
      console.error("[ai] analyzeLogistics error:", e);
      return [];
    }
  }
};


