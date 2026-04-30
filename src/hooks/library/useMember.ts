import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../api/supabase";
import { membersService } from "../../features/members/members.service";
import { Annotation, BorrowRecord } from "../../features/members/members.types";
import { useAuthStore } from "../../store/useAuthStore";

export function useMember() {
  const queryClient = useQueryClient();
  const { session, profile, logout } = useAuthStore();
  const userId = session?.user.id;
  const segments = useSegments();
  const router = useRouter();

  // --- Account Status & Security ---
  useEffect(() => {
    if (!session || !profile || segments[0] === "(auth)") return;

    const checkLockStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_locked, lock_reason")
        .eq("id", userId)
        .single();
      if (data?.is_locked) {
        Alert.alert(
          "Tài khoản bị khóa",
          data.lock_reason || "Tài khoản của bạn đã bị khóa.",
          [
            {
              text: "Đăng xuất",
              onPress: async () => {
                await logout();
                router.replace("/(auth)/login");
              },
            },
          ],
          { cancelable: false },
        );
      }
    };
    checkLockStatus();
  }, [session, profile, segments]);

  // --- Borrows ---
  const getMyBorrows = () =>
    useQuery<BorrowRecord[]>({
      queryKey: ["my-borrows", userId],
      enabled: !!userId,
      queryFn: () => membersService.getMyBorrows(userId!),
    });

  const borrowBook = useMutation({
    mutationFn: ({ isbn, branchId }: { isbn: string; branchId: string }) =>
      membersService.borrowBook(isbn, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-borrows"] });
    },
  });

  const returnBook = useMutation({
    mutationFn: async (isbn: string) => {
      const { data, error } = await supabase.rpc("return_book_v2", {
        p_isbn: isbn,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-borrows"] });
    },
  });

  const payFine = useMutation({
    mutationFn: ({ recordId, method }: { recordId: string; method: string }) =>
      membersService.payFine(recordId, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-borrows"] });
    },
  });

  // --- Gamification ---
  const getBadges = () =>
    useQuery({
      queryKey: ["badges"],
      queryFn: () => membersService.getAllBadges(),
    });

  const getMyBadges = () =>
    useQuery({
      queryKey: ["user_badges", userId],
      enabled: !!userId,
      queryFn: () => membersService.getMyBadges(),
    });

  const getLeaderboard = (limit = 50) =>
    useQuery({
      queryKey: ["leaderboard", limit],
      queryFn: () => membersService.getLeaderboard(limit),
    });

  // --- Feed & Notifications ---
  const getCommunityFeed = () =>
    useQuery({
      queryKey: ["community_feed"],
      queryFn: async () => {
        const { data: borrows } = await supabase
          .from("borrow_records")
          .select(
            "id, borrowed_at, book_id, profiles:user_id(fullName:full_name, avatarUrl:avatar_url), book:books(title, isbn)",
          )
          .order("borrowed_at", { ascending: false })
          .limit(10);
        const { data: reviews } = await supabase
          .from("reviews")
          .select(
            "id, created_at, book_isbn, rating, profiles:user_id(fullName:full_name, avatarUrl:avatar_url), book:books(title)",
          )
          .order("created_at", { ascending: false })
          .limit(10);

        const activities = [
          ...(borrows || []).map((b: any) => ({
            id: b.id,
            type: "BORROW",
            userName: b.profiles?.fullName,
            bookTitle: b.book?.title,
            bookIsbn: b.book?.isbn,
            timestamp: b.borrowed_at,
            avatarUrl: b.profiles?.avatarUrl,
          })),
          ...(reviews || []).map((r: any) => ({
            id: r.id,
            type: "REVIEW",
            userName: r.profiles?.fullName,
            bookTitle: r.book?.title,
            bookIsbn: r.book_isbn,
            timestamp: r.created_at,
            rating: r.rating,
            avatarUrl: r.profiles?.avatarUrl,
          })),
        ];
        return activities
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .slice(0, 15);
      },
    });

  const getNotifications = () =>
    useQuery({
      queryKey: ["notifications", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return data || [];
      },
    });

  // --- Analytics ---
  const getGenres = (userId?: string) =>
    useQuery({
      queryKey: ["analytics_genres", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_member_genres", {
          p_user_id: userId,
        });
        if (error) throw error;
        return data || [];
      },
    });

  const getActivity = (userId?: string) =>
    useQuery({
      queryKey: ["analytics_activity", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_member_activity", {
          p_user_id: userId,
        });
        if (error) throw error;
        return data || [];
      },
    });

  const getMonthly = (userId?: string) =>
    useQuery({
      queryKey: ["analytics_monthly", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_member_monthly", {
          p_user_id: userId,
        });
        if (error) throw error;
        return {
          labels: (data || []).map((d: any) => d.month),
          datasets: [{ data: (data || []).map((d: any) => d.count) }],
        };
      },
    });

  return {
    borrows: {
      list: getMyBorrows,
      borrow: borrowBook,
      return: returnBook,
      pay: payFine,
    },
    gamification: { getBadges, getMyBadges, getLeaderboard },
    feed: { getCommunityFeed, getNotifications },
    analytics: { getGenres, getActivity, getMonthly },
  };
}

export function useAnnotations(isbn: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    try {
      const data = await membersService.getAnnotationsByBook(isbn);
      setAnnotations(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isbn) fetch();
    const channelId = `ann_${isbn}_${Math.random().toString(36).substring(7)}`;
    const sub = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "annotations",
          filter: `book_isbn=eq.${isbn}`,
        },
        () => fetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [isbn]);

  return {
    annotations,
    isLoading,
    addAnnotation: (
      content: string,
      selection?: string,
      metadata?: any,
      color?: string,
      isPublic?: boolean,
    ) =>
      membersService.createAnnotation({
        book_isbn: isbn,
        content,
        selection,
        page_number: metadata?.page,
        color,
        is_public: isPublic,
      }),
    removeAnnotation: (id: string) => membersService.deleteAnnotation(id),
    refresh: fetch,
  };
}

export function useSocial(itemId: string, itemType: "BOOK" | "AUDIOBOOK") {
  const { profile } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (profile?.id && itemId) {
      membersService
        .getInteractions(profile.id, itemId, itemType)
        .then((data) => {
          setIsLiked(data.some((i: any) => i.interaction_type === "LIKE"));
          setIsBookmarked(
            data.some((i: any) => i.interaction_type === "BOOKMARK"),
          );
        });
    }
  }, [profile?.id, itemId]);

  const toggle = async (type: "LIKE" | "BOOKMARK") => {
    if (!profile?.id) return;
    const current = type === "LIKE" ? isLiked : isBookmarked;
    const setter = type === "LIKE" ? setIsLiked : setIsBookmarked;
    setter(!current);
    try {
      await membersService.toggleInteraction(
        profile.id,
        itemId,
        itemType,
        type,
        current,
      );
    } catch (e) {
      setter(current);
    }
  };

  return {
    isLiked,
    isBookmarked,
    toggleLike: () => toggle("LIKE"),
    toggleBookmark: () => toggle("BOOKMARK"),
  };
}

export function useBookClubs() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  const list = () =>
    useQuery({
      queryKey: ["book_clubs"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("book_clubs")
          .select("*, book_club_members(count)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map((club) => ({
          ...club,
          member_count: (club.book_club_members as any)[0]?.count || 0,
        }));
      },
    });

  const getMyClubs = () =>
    useQuery({
      queryKey: ["my_book_clubs", profile?.id],
      enabled: !!profile,
      queryFn: async () => {
        const { data } = await supabase
          .from("book_club_members")
          .select("book_clubs(*)")
          .eq("user_id", profile!.id);
        return (data || []).map((item) => item.book_clubs);
      },
    });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("book_clubs")
        .insert({ name, description, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      
      // Auto-join creator
      await supabase.from("book_club_members").insert({ club_id: data.id, user_id: profile?.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book_clubs"] });
      queryClient.invalidateQueries({ queryKey: ["my_book_clubs"] });
    },
  });

  const join = useMutation({
    mutationFn: async (clubId: string) => {
      const { error } = await supabase
        .from("book_club_members")
        .insert({ club_id: clubId, user_id: profile?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book_clubs"] });
      queryClient.invalidateQueries({ queryKey: ["my_book_clubs"] });
    },
  });

  return { list, getMyClubs, create, join };
}
