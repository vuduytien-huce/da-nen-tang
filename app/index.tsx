import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "../src/store/useAuthStore";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0B0F1A", // Match the new premium theme
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#4F8EF7" />
      <Text
        style={{
          color: "#4F8EF7",
          fontSize: 20,
          fontWeight: "800",
          marginTop: 24,
          letterSpacing: 4,
        }}
      >
        THE LIBRARY
      </Text>
      <Text style={{ color: "#5A5F7A", marginTop: 10, fontSize: 12 }}>v2.0 Premium Edition</Text>
    </View>
  );
}
