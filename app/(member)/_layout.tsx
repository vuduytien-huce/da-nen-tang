import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";
import ErrorBoundary from "../../src/components/ErrorBoundary";
import { BiblioAI } from "../../src/features/ai/BiblioAI";
import { View, Alert } from "react-native";
import { useEffect } from "react";
import { notificationService } from "../../src/core/notifications";
import * as Notifications from 'expo-notifications';
import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";

export default function MemberLayout() {
  const session = useAuthStore((state) => state.session);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (session?.user?.id) {
      // 1. Register for push notifications
      notificationService.registerForPushNotificationsAsync().then(token => {
        if (token) {
          notificationService.savePushToken(session.user.id, token);
        }
      });

      // 2. Setup listeners
      const cleanup = notificationService.setupListeners(
        (notification) => {
          // Handled by Expo when app is in foreground
          console.log('Notification received:', notification);
        },
        (response) => {
          // Handle interaction (tap on notification)
          const data = response.notification.request.content.data;
          if (data?.url) {
            router.push(data.url as any);
          }
        }
      );

      return cleanup;
    }
  }, [session?.user?.id]);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0B0F1A',
              borderTopColor: '#1E2540',
              height: 65,
              paddingBottom: 10,
            },
            tabBarActiveTintColor: '#4F8EF7',
            tabBarInactiveTintColor: '#5A5F7A',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.explore'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="compass" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: t('tabs.search'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="search" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="audiobooks"
            options={{
              title: t('tabs.audiobooks'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="headset" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="community"
            options={{
              title: t('tabs.community'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: t('tabs.history'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="time" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t('tabs.profile'),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" color={color} size={size} />
              ),
            }}
          />
        </Tabs>
        <BiblioAI />
      </View>
    </ErrorBoundary>
  );
}
