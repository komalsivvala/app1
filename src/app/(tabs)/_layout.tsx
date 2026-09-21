import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { useTheme } from '@/design/theme';
import { FONT_FAMILY } from '@/design/typography';
import { useI18n } from '@/i18n/use-i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; key: 'home' | 'learn' | 'signs' | 'progress'; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', key: 'home', icon: 'home-outline', iconActive: 'home' },
  { name: 'learn', key: 'learn', icon: 'book-outline', iconActive: 'book' },
  { name: 'signs', key: 'signs', icon: 'warning-outline', iconActive: 'warning' },
  { name: 'progress', key: 'progress', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
];

export default function TabsLayout() {
  const { palette } = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent.fill,
        tabBarInactiveTintColor: palette.text.secondary,
        tabBarStyle: { backgroundColor: palette.bg, borderTopColor: palette.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: FONT_FAMILY.latin['500'], fontSize: 12 },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarAccessibilityLabel: t(`tabs.${tab.key}`),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
