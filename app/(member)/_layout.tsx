import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";

export default function MemberLayout() {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
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
          title: "Khám phá",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Tìm kiếm",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
