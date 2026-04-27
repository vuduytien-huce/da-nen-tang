import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isEnvValid = !!supabaseUrl && !!supabaseAnonKey;

if (!isEnvValid) {
  console.error(
    `[Supabase] ERROR: Missing required environment variables. ` +
    `Check your .env file for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.`
  );
}

/**
 * ULTRA-ROBUST STORAGE ADAPTER
 * This version uses zero 'require' calls on Web and isolates native storage.
 */
const customStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }

      // Native path: Use SecureStore for enhanced security
      const SecureStore = require("expo-secure-store");
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[Supabase Storage] getItem failed for ${key}:`, e);
      // Fallback to AsyncStorage if SecureStore fails
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        return await AsyncStorage.getItem(key);
      } catch (innerE) {
        return null;
      }
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      const SecureStore = require("expo-secure-store");
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[Supabase Storage] setItem failed for ${key}:`, e);
      // Fallback
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(key, value);
      } catch (innerE) {}
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      const SecureStore = require("expo-secure-store");
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[Supabase Storage] removeItem failed for ${key}:`, e);
      // Fallback
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem(key);
      } catch (innerE) {}
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
