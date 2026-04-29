import { useMember, useAnnotations, useSocial, useBookClubs } from './library/useMember';
import { useAdmin } from './library/useAdmin';
import { useContent } from './library/useContent';
import { useSystem } from './library/useSystem';

import { Book } from '../features/books/books.types';

export { useMember, useAdmin, useContent, useSystem, useAnnotations, useSocial, useBookClubs };
export type { Book };

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

  return {
    // Member Domain
    ...member,
    
    // Admin Domain (Merging instead of overwriting)
    admin: { ...admin },
    
    // Merge Borrows specifically if they overlap
    borrows: {
      ...member.borrows,
      ...admin.borrows
    },

    // Content Domain
    ...content,
    
    // System Domain
    ...system,

    // Legacy Support / Direct access
    useMember,
    useAdmin,
    useContent,
    useSystem
  };
}
