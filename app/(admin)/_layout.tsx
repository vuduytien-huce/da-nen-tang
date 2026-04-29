import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function AdminLayout() {
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
            title: t('tabs.users'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="system"
          options={{
            title: t('tabs.system'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="server" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: t('tabs.inventory'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="logistics"
          options={{
            title: t('tabs.logistics'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: t('tabs.reports'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="audit"
          options={{
            title: t('tabs.audit'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="config"
          options={{
            title: t('tabs.config'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
