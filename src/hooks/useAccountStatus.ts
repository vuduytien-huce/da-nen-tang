import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../api/supabase';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Hook to monitor user account status (locked/active)
 * and force logout if account is locked.
 */
export function useAccountStatus() {
  const { session, profile, logout } = useAuthStore();
  const { t } = useTranslation();
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
            t('common.account_locked_title') || 'Tài khoản bị khóa',
            data.lock_reason || t('common.account_locked_msg') || 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            [
              { 
                text: t('common.logout') || 'Đăng xuất', 
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
    if (!userId) return;

    const channelId = `account_status_${userId}_${Math.random().toString(36).substring(7)}`;
    
    const channel = supabase.channel(channelId);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useAccountStatus] Lock status change detected:', payload.new.is_locked);
          if (payload.new.is_locked) {
            Alert.alert(
              t('common.account_locked_title') || 'Tài khoản bị khóa',
              payload.new.lock_reason || t('common.account_locked_msg') || 'Tài khoản của bạn vừa bị khóa.',
              [
                { 
                  text: t('common.logout') || 'Đăng xuất', 
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[useAccountStatus] Subscribed to channel: ${channelId}`);
        }
      });

    return () => {
      console.log(`[useAccountStatus] Cleaning up channel: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [session, profile, segments]);

  return {
    isLocked: (profile as any)?.is_locked || false,
    lockReason: (profile as any)?.lock_reason || null,
  };
}
