import { useMember, useAnnotations, useSocial, useBookClubs } from './library/useMember';
import { useClubChat } from './library/useClubChat';
import { useAdmin } from './library/useAdmin';
import { useContent } from './library/useContent';
import { useSystem } from './library/useSystem';
import { useAnalytics } from './library/useAnalytics';

import { Book } from '../features/books/books.types';
import { BorrowRecord, Annotation } from '../features/members/members.types';

export { useMember, useAdmin, useContent, useSystem, useAnnotations, useSocial, useBookClubs, useClubChat };
export type { Book, BorrowRecord, Annotation };

/**
 * BiblioTech Central Gateway Hook
 * Aggregates all domain hooks into a single unified API.
 * Follows the Feature-based Layered Architecture.
 */
export function useLibrary() {
  const member = useMember();
  const admin = useAdmin();
  const content = useContent();
  const system = useSystem();
  const analytics = useAnalytics();

  return {
    // Member Domain
    ...member,
    
    // Admin Domain (Merging instead of overwriting)
    admin: { ...admin },
    
    // Merge Borrows specifically if they overlap
    borrows: {
      ...member.borrows,
      listAll: admin.borrows.listAll,
      approve: admin.borrows.approve,
      reject: admin.borrows.reject,
    },

    // Community & Social
    bookClubs: useBookClubs(),

    // Gamification
    gamification: member.gamification,

    // Content Domain
    ...content,
    useBooks: content.books.list,
    syncBook: content.books.sync,
    
    // System Domain
    ...system,

    // Analytics Domain
    analytics: { ...analytics },

    // Logistics Domain
    logistics: admin.logistics,

    // Legacy Support / Direct access
    useMember,
    useAdmin,
    useContent,
    useSystem,
    useClubChat,
    useBookClubs
  };
}
