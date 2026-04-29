import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../api/supabase';

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as Notifications.NotificationBehavior),

});

export const notifications = {
  /**
   * Register for push notifications and get the token
   */
  registerForPushNotificationsAsync: async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3A75F2',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      })).data;
      
      console.log('Expo Push Token:', token);
    } else {
      console.warn('Must use physical device for Push Notifications');
    }

    return token;
  },

  /**
   * Save push token to user profile
   */
  savePushToken: async (userId: string, token: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  },

  /**
   * Setup notification listeners
   */
  setupListeners: (
    onNotification: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ) => {
    const notificationListener = Notifications.addNotificationReceivedListener(onNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  },

  /**
   * Fetch in-app notifications from the database
   */
  getNotifications: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  /**
   * Get notification preferences for a user
   */
  getPreferences: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data?.notification_preferences || {
        dueDates: true,
        newArrivals: true,
        clubMentions: true,
        systemUpdates: true
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return {
        dueDates: true,
        newArrivals: true,
        clubMentions: true,
        systemUpdates: true
      };
    }
  },

  /**
   * Update notification preferences for a user
   */
  updatePreferences: async (userId: string, preferences: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
};

export const notificationService = notifications;
