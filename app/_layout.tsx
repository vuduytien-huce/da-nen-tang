import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View, TouchableOpacity, Platform } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";
import "../global.css";
import { supabase } from "../src/api/supabase";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { notifications } from "../src/core/notifications";
import { AiAssistant } from "../src/features/ai/AiAssistant";
import { useAccountStatus } from "../src/hooks/useAccountStatus";
import "../src/i18n";
import { useAuthStore } from "../src/store/useAuthStore";
import { useTabBarStore } from "../src/store/useTabBarStore";

const queryClient = new QueryClient();

function RootLayoutContent() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  useAccountStatus();
  const lastY = React.useRef(0);

  const navigationState = useRootNavigationState();

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (isMounted) await useAuthStore.getState().setSession(currentSession);
      } catch (err) {
        useAuthStore.getState().forceInitialize();
      }
    };
    initAuth();

    // Safety timeout: Force initialize if still stuck after 8 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !useAuthStore.getState().initialized) {
        console.warn(
          "[RootLayout] Safety timeout reached. Forcing initialization.",
        );
        useAuthStore.getState().forceInitialize();
      }
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) useAuthStore.getState().setSession(nextSession);
    });
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (!initialized || !navigationState?.key) return;
    const segment = segments[0];
    const isAuth = segment === "(auth)";
    const isAdmin = segment === "(admin)";
    const isLibrarian = segment === "(librarian)";
    const isMember = segment === "(member)";

    if (!session) {
      if (!isAuth) router.replace("/(auth)/login");
      return;
    }

    if (session && profile) {
      const role = profile.role as any;
      const segs = segments as string[];
      const isSharedPath =
        segs.includes("notifications") ||
        segs.includes("profile") ||
        segs.includes("settings");

      if (role === "ADMIN") {
        if (!isAdmin && !isSharedPath) router.replace("/(admin)");
      } else if (role === "LIBRARIAN") {
        if (!isLibrarian && !isSharedPath) router.replace("/(librarian)");
      } else if (role === "MEMBER") {
        if (!isMember && !isAuth && !isSharedPath) router.replace("/(member)");
      }

      if (isAuth) {
        if (role === "ADMIN") router.replace("/(admin)");
        else if (role === "LIBRARIAN") router.replace("/(librarian)");
        else router.replace("/(member)");
      }
    }
  }, [session, profile, segments, initialized, router, navigationState?.key]);

  // Sync i18n with profile locale
  const { i18n } = useTranslation();
  useEffect(() => {
    if (profile?.locale && profile.locale !== i18n.language) {
      i18n.changeLanguage(profile.locale);
    }
  }, [profile?.locale]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onScroll = () => {
      useTabBarStore.getState().triggerVisible();
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
    };
  }, []);

  // Separate Effect for Notifications to avoid blocking redirect
  useEffect(() => {
    if (session && profile?.role === "MEMBER") {
      notifications.registerForPushNotificationsAsync().then((token) => {
        if (token) notifications.savePushToken(session.user.id, token);
      });

      const cleanup = notifications.setupListeners(
        (notification) => console.log("Notification received:", notification),
        (response) => {
          const data = response.notification.request.content.data;
          if (data?.url) router.push(data.url as any);
        },
      );
      return cleanup;
    }
  }, [session, profile]);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B0F1A",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={{ color: "#8B8FA3", marginTop: 14 }}>
          BiblioTech v2.0 Initializing...
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider>
          <View 
            onTouchStart={(e) => {
              if (Platform.OS !== 'web') {
                lastY.current = e.nativeEvent.pageY;
              }
            }}
            onTouchMove={(e) => {
              if (Platform.OS !== 'web') {
                const diff = Math.abs(lastY.current - e.nativeEvent.pageY);
                if (diff > 5) {
                  useTabBarStore.getState().triggerVisible();
                }
              }
            }}
            style={{ flex: 1, backgroundColor: "#0B0F1A" }}
          >
            {Platform.OS === 'web' && (
              <style>{`
                ::-webkit-scrollbar {
                  display: none;
                  width: 0px;
                  height: 0px;
                }
                * {
                  scrollbar-width: none !important;
                  -ms-overflow-style: none !important;
                }
                [style*="height: 65.1px"], [style*="height:65.1px"] {
                  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out !important;
                  transform: translateY(52px) !important;
                  opacity: 0.25 !important;
                  overflow: visible !important;
                }
                [style*="height: 65.1px"]::before, [style*="height:65.1px"]::before {
                  content: '';
                  position: absolute;
                  top: -100px;
                  left: 0;
                  right: 0;
                  height: 100px;
                  background: transparent;
                  z-index: 1000;
                }
                [style*="height: 65.1px"]:hover, [style*="height: 65.1px"]:hover {
                  transform: translateY(0px) !important;
                  opacity: 1 !important;
                }
                [style*="height: 65px"], [style*="height:65px"] {
                  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out !important;
                  transform: translateY(0px) !important;
                  opacity: 1 !important;
                }
              `}</style>
            )}
            {session && router.canGoBack() && !(segments.length === 1 || (segments[segments.length - 1] as string) === "index") && (
              <View 
                pointerEvents="box-none"
                style={["inventory", "audit"].includes(segments[segments.length - 1] as string) ? {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  paddingTop: 12,
                  paddingBottom: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  backgroundColor: "transparent",
                  zIndex: 10,
                } : {
                  paddingTop: 12,
                  paddingBottom: 0,
                  marginBottom: -16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  backgroundColor: "transparent",
                  zIndex: 10,
                }}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  style={{
                    padding: 4,
                  }}
                >
                  <Feather name="arrow-left" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                animationDuration: 300,
                contentStyle: { backgroundColor: "#0B0F1A" },
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(member)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(librarian)" />
            </Stack>
            {session && profile?.role === "MEMBER" && <AiAssistant />}
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}
