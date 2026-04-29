export interface SystemConfig {
  fine_rate: number;
  member_due_days: number;
  admin_due_days: number;
  max_books: number;
}

export interface BorrowRecord {
  id: string;
  book_id: string;
  user_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: string;
  fine_amount: number;
  book?: any; // Generic to avoid circular dependency with Books feature
  user?: {
    full_name: string;
  };
}

export interface MemberProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  points: number;
  level: number;
  membership_code: string;
}

export interface Annotation {
  id: string;
  book_id: string;
  user_id: string;
  content: string;
  page_number?: number;
  created_at: string;
  is_public: boolean;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}
