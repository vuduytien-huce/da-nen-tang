import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../src/store/useAuthStore";
import ErrorBoundary from "../../src/components/ErrorBoundary";
import { useTranslation } from "react-i18next";

export default function LibrarianLayout() {
  const session = useAuthStore((state) => state.session);
  const { t } = useTranslation();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ErrorBoundary>
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
            title: t('tabs.dashboard'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="borrows"
          options={{
            title: t('tabs.borrows'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="books"
          options={{
            title: t('tabs.inventory'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: t('tabs.reports'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: t('tabs.insights'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
