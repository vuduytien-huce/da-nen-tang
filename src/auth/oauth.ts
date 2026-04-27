import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "../api/supabase";

export type OAuthProvider = "google" | "github";

/**
 * Gọi hàm này ở đầu màn hình login để hoàn tất phiên WebBrowser trên Web/Android.
 * Phải được gọi BÊN TRONG một React component.
 */
export function completeAuthSession() {
  WebBrowser.maybeCompleteAuthSession();
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider,
): Promise<void> {
  if (Platform.OS === "web") {
    // Trên Web: để Supabase tự redirect — không cần openAuthSessionAsync
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw new Error(error.message);
    // Trang sẽ tự redirect — không cần làm thêm gì
    return;
  }

  // ---- NATIVE (Expo Go / Standalone) ----
  // Expo Go dùng scheme "exp://" — Linking.createURL("/") sẽ trả về đúng URL
  const redirectTo = Linking.createURL("/");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // Mình tự mở browser bên dưới
    },
  });

  if (error) throw new Error(error.message);

  if (!data?.url) {
    throw new Error("Không thể khởi tạo liên kết xác thực OAuth");
  }

  // Mở trình duyệt trong app và chờ callback URL
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Bạn đã hủy quá trình xác thực OAuth");
  }

  if (result.type === "success" && result.url) {
    await handleNativeOAuthCallback(result.url);
  }
}

/**
 * Xử lý URL callback sau khi trình duyệt đóng trên native.
 * Hỗ trợ cả PKCE (code) lẫn Implicit (access_token trong hash).
 */
async function handleNativeOAuthCallback(callbackUrl: string): Promise<void> {
  try {
    // Ưu tiên: thử lấy session mà Supabase đã tự lưu
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) return;

    // Parse URL để lấy token thủ công
    const parsed = new URL(callbackUrl);

    // PKCE flow: ?code=...
    const code = parsed.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw new Error(error.message);
      return;
    }

    // Implicit flow: #access_token=...&refresh_token=...
    const hash = parsed.hash.startsWith("#")
      ? parsed.hash.substring(1)
      : parsed.hash;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw new Error(error.message);
    }
  } catch (err: any) {
    console.warn("[OAuth] handleNativeOAuthCallback error:", err?.message);
    // Không throw — onAuthStateChange trong _layout sẽ bắt session nếu có
  }
}
