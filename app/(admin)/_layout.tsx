import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useTabBarStore } from '../../src/store/useTabBarStore';

import { useSegments } from 'expo-router';

export default function AdminLayout() {
  const session = useAuthStore((state) => state.session);
  const { t } = useTranslation();
  const segments = useSegments();
  const isTabBarVisible = useTabBarStore((state) => state.isVisible);

  const isMainScreen = segments.length === 1 || String(segments[segments.length - 1]) === 'index' || (segments.length === 2 && String(segments[1]) === '');

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 8,
            left: 12,
            right: 12,
            backgroundColor: '#0B0F1A',
            borderColor: '#2C354D',
            borderWidth: 1,
            borderRadius: 16,
            overflow: 'hidden',
            height: isMainScreen ? 65 : 65.1,
            paddingBottom: 10,
            transform: isMainScreen || isTabBarVisible ? [{ translateY: 0 }] : [{ translateY: 65 }],
            opacity: isMainScreen || isTabBarVisible ? 1 : 0,
          },
          tabBarItemStyle: {
            borderRightWidth: 0.5,
            borderRightColor: '#1E2540',
            height: '100%',
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
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
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
        <Tabs.Screen
          name="security-logs"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
