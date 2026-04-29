import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Hook to monitor user account status (locked/active)
 * and force logout if account is locked.
 */
export function useAccountStatus() {
  const { session, profile, logout } = useAuthStore();
  const userId = session?.user.id;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!session || !profile || segments[0] === '(auth)') return;

    const checkLockStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_locked, lock_reason')
          .eq('id', userId)
          .single();
        
        if (error) throw error;

        if (data?.is_locked) {
          Alert.alert(
            'Tài khoản bị khóa',
            data.lock_reason || 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            [
              { 
                text: 'Đăng xuất', 
                onPress: async () => { 
                  await logout(); 
                  router.replace('/(auth)/login'); 
                } 
              }
            ],
            { cancelable: false }
          );
        }
      } catch (err) {
        console.error('[useAccountStatus] Error:', err);
      }
    };

    checkLockStatus();

    // Listen for real-time changes to the user's lock status
    const channel = supabase
      .channel(`status_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.is_locked) {
            Alert.alert(
              'Tài khoản bị khóa',
              payload.new.lock_reason || 'Tài khoản của bạn vừa bị khóa.',
              [
                { 
                  text: 'Đăng xuất', 
                  onPress: async () => { 
                    await logout(); 
                    router.replace('/(auth)/login'); 
                  } 
                }
              ],
              { cancelable: false }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, profile, segments]);

  return {
    isLocked: (profile as any)?.is_locked || false,
    lockReason: (profile as any)?.lock_reason || null,
  };
}
