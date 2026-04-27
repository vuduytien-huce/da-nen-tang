import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";

export default function AdminLayout() {
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
          title: "Người dùng",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="system"
        options={{
          title: "Hệ thống",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="server" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: "Cấu hình",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
