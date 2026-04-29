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
import { notifications } from "../src/core/notifications";
import "../src/i18n";
import { AiAssistant } from "../src/features/ai/AiAssistant";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { useAccountStatus } from "../src/hooks/useAccountStatus";

const queryClient = new QueryClient();

function RootLayoutContent() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  useAccountStatus();

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
      // Initialize Notifications for Members
      if (profile.role === 'MEMBER') {
        notifications.registerForPushNotificationsAsync().then(token => {
          if (token) notifications.savePushToken(session.user.id, token);
        });

        const cleanup = notifications.setupListeners(
          (notification) => console.log('Notification received:', notification),
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.url) router.push(data.url as any);
          }
        );
        return cleanup;
      }

      const role = profile.role as any;
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
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
            contentStyle: { backgroundColor: '#0B0F1A' }
          }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(member)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(librarian)" />
          </Stack>
          {session && profile?.role === 'MEMBER' && <AiAssistant />}
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
