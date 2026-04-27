import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { PaperProvider } from "react-native-paper";
import { useTranslation } from 'react-i18next';
import "react-native-reanimated";
import "react-native-url-polyfill/auto";
import "../global.css";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { supabase, isEnvValid } from "../src/api/supabase";
import { useAuthStore } from "../src/store/useAuthStore";
import "../src/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: any) { console.error("[CRITICAL ERROR]", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#0B0F1A", justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 24 }}>Hệ thống tạm ngưng</Text>
          <Text style={{ color: "#8B8FA3", marginTop: 12, textAlign: 'center', lineHeight: 20 }}>{this.state.error?.message || "Lỗi khởi tạo module"}</Text>
          <TouchableOpacity onPress={() => typeof window !== 'undefined' && window.location.reload()} style={{ backgroundColor: "#4F8EF7", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, marginTop: 40 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootLayoutContent() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();

  const navigationState = useRootNavigationState();

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (isMounted) await useAuthStore.getState().setSession(currentSession);
      } catch (err) {
        useAuthStore.getState().forceInitialize();
      }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) useAuthStore.getState().setSession(nextSession);
    });
    return () => { isMounted = false; subscription?.unsubscribe(); };
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
      const role = profile.role;
      if (role === "ADMIN" && !isAdmin) router.replace("/(admin)");
      else if (role === "LIBRARIAN" && !isLibrarian) router.replace("/(librarian)");
      else if (role === "MEMBER" && !isMember && !isAuth) router.replace("/(member)");
      else if (isAuth) {
        if (role === "ADMIN") router.replace("/(admin)");
        else if (role === "LIBRARIAN") router.replace("/(librarian)");
        else router.replace("/(member)");
      }
    }
  }, [session, profile, segments, initialized]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0F1A", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={{ color: "#8B8FA3", marginTop: 14 }}>BiblioTech v2.0 Initializing...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <View style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(member)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(librarian)" />
          </Stack>
        </View>
      </PaperProvider>
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
