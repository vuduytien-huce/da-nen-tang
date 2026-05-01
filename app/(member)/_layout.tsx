import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import ErrorBoundary from "../../src/components/ErrorBoundary";
import { notificationService } from "../../src/core/notifications";
import { BiblioAI } from "../../src/features/ai/BiblioAI";
import { useAuthStore } from "../../src/store/useAuthStore";

import { useSegments } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTabBarStore } from "../../src/store/useTabBarStore";

export default function MemberLayout() {
  const session = useAuthStore((state) => state.session);
  const router = useRouter();
  const { t } = useTranslation();
  const segments = useSegments();
  const isTabBarVisible = useTabBarStore((state) => state.isVisible);

  const isMainScreen =
    segments.length === 1 ||
    String(segments[segments.length - 1]) === "index" ||
    (segments.length === 2 && String(segments[1]) === "");

  useEffect(() => {
    if (session?.user?.id) {
      // 1. Register for push notifications
      notificationService.registerForPushNotificationsAsync().then((token) => {
        if (token) {
          notificationService.savePushToken(session.user.id, token);
        }
      });

      // 2. Setup listeners
      const cleanup = notificationService.setupListeners(
        (notification) => {
          // Handled by Expo when app is in foreground
          console.log("Notification received:", notification);
        },
        (response) => {
          // Handle interaction (tap on notification)
          const data = response.notification.request.content.data;
          if (data?.url) {
            router.push(data.url as any);
          }
        },
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
              position: "absolute",
              bottom: 8,
              left: 12,
              right: 12,
              backgroundColor: "#0B0F1A",
              borderColor: "#2C354D",
              borderWidth: 1,
              borderRadius: 16,
              overflow: "hidden",
              height: isMainScreen ? 65 : 65.1,
              paddingBottom: 10,
              transform:
                isMainScreen || isTabBarVisible
                  ? [{ translateY: 0 }]
                  : [{ translateY: 65 }],
              opacity: isMainScreen || isTabBarVisible ? 1 : 0,
            },
            tabBarItemStyle: {
              borderRightWidth: 0.5,
              borderRightColor: "#1E2540",
              height: "100%",
            },
            tabBarActiveTintColor: "#4F8EF7",
            tabBarInactiveTintColor: "#5A5F7A",
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("tabs.home"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: t("tabs.search"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="search" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="audiobooks"
            options={{
              title: t("tabs.audiobooks"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="headset" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="community"
            options={{
              title: t("tabs.community"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: t("tabs.history"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="time" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("tabs.profile"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" color={color} size={size} />
              ),
            }}
          />

          {/* Hidden screens from Tab Bar */}
          <Tabs.Screen name="achievements" options={{ href: null }} />
          <Tabs.Screen name="ai-chat" options={{ href: null }} />
          <Tabs.Screen name="analytics" options={{ href: null }} />
          <Tabs.Screen name="chat" options={{ href: null }} />
          <Tabs.Screen name="downloads" options={{ href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
          <Tabs.Screen name="book/[isbn]" options={{ href: null }} />
          <Tabs.Screen name="book/index" options={{ href: null }} />
          <Tabs.Screen name="club/index" options={{ href: null }} />
          <Tabs.Screen name="club/[id]" options={{ href: null }} />
        </Tabs>
        <BiblioAI />
      </View>
    </ErrorBoundary>
  );
}
