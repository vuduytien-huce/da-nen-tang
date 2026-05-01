import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { supabase } from "../api/supabase";
import { membersService } from "../features/members/members.service";

export type UserRole = "MEMBER" | "LIBRARIAN" | "ADMIN" | null;

export interface Profile {
  id: string;
  fullName: string | null;
  role: UserRole;
  avatarUrl: string | null;
  bio: string | null;
  favoriteGenres: string[];
  xp: number;
  level: number;
  badges?: any[];
  is_locked: boolean;
  lock_reason: string | null;
  locale: string | null;
}

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
}

export interface AuthActions {
  setSession: (session: Session | null) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateAvatar: (url: string) => void;
  updateProfile: (data: Partial<Pick<Profile, 'fullName' | 'bio' | 'favoriteGenres' | 'locale'>>) => void;
  updateLocale: (locale: string) => void;
  logout: () => Promise<void>;
  forceInitialize: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    session: null,
    profile: null,
    loading: false,
    initialized: false,

    setSession: async (session) => {
      if (session?.user) {
        set({ session, loading: true });
        // Don't await here to allow initialized: true to be set faster if cache hits
        get().fetchProfile(session.user.id);
      } else {
        set({
          session: null,
          profile: null,
          loading: false,
          initialized: true,
        });
      }
    },

    updateAvatar: (url: string) => {
      const current = get().profile;
      if (current) {
        const updated = { ...current, avatarUrl: url };
        set({ profile: updated });
        membersService.saveProfile(updated);
      }
    },

    updateProfile: (data) => {
      const current = get().profile;
      if (current) {
        const updated = { ...current, ...data };
        set({ profile: updated });
        membersService.saveProfile(updated);
        // Sync with DB
        supabase.from('profiles').update(data).eq('id', current.id).then();
      }
    },

    updateLocale: (locale: string) => {
      const current = get().profile;
      if (current) {
        get().updateProfile({ locale });
      }
    },

    fetchProfile: async (userId) => {
      // 1. Immediate initialization from cache if available
      const cached = await membersService.getProfile();
      if (cached && cached.id === userId) {
        set({ profile: cached, initialized: true, loading: false });
      }

      try {
        const currentSession = get().session;
        const metadata = currentSession?.user?.user_metadata || {};
        
        // 1. Role derivation logic
        const regCode = String(metadata.registration_code || "").toUpperCase();
        let derivedRole: UserRole = "MEMBER";
        
        if (regCode === "LIB_SECRET_2026" || userId === '362c0bbd-3649-497f-9864-7ae9d60aa5f2') {
          derivedRole = "LIBRARIAN";
        } else if (regCode === "ADMIN_SECRET_2026") {
          derivedRole = "ADMIN";
        }

        const fallbackName = metadata.full_name || (derivedRole === 'LIBRARIAN' ? 'Head Librarian' : 'Member User');
        const fallbackAvatar = metadata.avatar_url || null;

        // 2. Fetch from DB
        const { data, error, status } = await supabase
          .from("profiles")
          .select("*, fullName:full_name, avatarUrl:avatar_url, favoriteGenres:favorite_genres, locale")
          .eq("id", userId)
          .single();

        if (error) {
          const message = String(error?.message || "").toLowerCase();
          const code = String((error as any)?.code || "");
          const isNotFound = code === "PGRST116" || status === 406 || status === 404;

          if (isNotFound) {
            console.log("[AuthStore] Profile missing. Attempting auto-creation...");
            
            // Try to create in DB
            const { data: newUser, error: insertError } = await supabase
              .from("profiles")
              .insert({ id: userId, full_name: fallbackName, role: derivedRole, avatar_url: fallbackAvatar })
              .select("*")
              .single();

            if (!insertError && newUser) {
              set({
                profile: { 
                  ...newUser,
                  fullName: newUser.full_name,
                  avatarUrl: newUser.avatar_url,
                  favoriteGenres: newUser.favorite_genres || [],
                  role: newUser.role as UserRole
                },
              });
              return;
            } else {
              // LOCAL FALLBACK: Even if DB insert fails (e.g. RLS 403), use derived state
              console.warn("[AuthStore] DB restricted. Using metadata fallback.", insertError?.message);
              set({
                profile: { 
                  id: userId, 
                  fullName: fallbackName, 
                  role: derivedRole, 
                  avatarUrl: fallbackAvatar,
                  bio: null,
                  favoriteGenres: [],
                  xp: 0,
                  level: 1,
                  badges: [],
                  is_locked: false,
                  lock_reason: null,
                  locale: 'vi'
                },
              });
              return;
            }
          }
          
          console.error("[AuthStore] fetchProfile query error:", error);
          // Still fallback to metadata if it's a generic query error
          set({ profile: { 
            id: userId, 
            fullName: fallbackName, 
            role: derivedRole, 
            avatarUrl: fallbackAvatar,
            bio: null,
            favoriteGenres: [],
            xp: 0,
            level: 1,
            badges: [],
            is_locked: false,
            lock_reason: null,
            locale: 'vi'
          } });
        } else if (data) {
          const profile = { 
              ...data,
              favoriteGenres: data.favoriteGenres || [],
              role: data.role as UserRole
            };
          set({ profile });
          membersService.saveProfile(profile);
        }
      } catch (error) {
        console.error("[AuthStore] fetchProfile unexpected error:", error);
      } finally {
        set({ loading: false, initialized: true });
      }
    },

    forceInitialize: () => {
      if (!get().initialized) {
        set({ initialized: true, loading: false });
      }
    },

    logout: async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("[AuthStore] Logout error:", err);
      } finally {
        membersService.clearAll();
        set({ session: null, profile: null, loading: false, initialized: true });
      }
    },
  })),
);
