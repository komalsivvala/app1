import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DatabaseProvider } from '@/db/provider';
import { ThemeProvider, useTheme } from '@/design/theme';
import { useReduceMotion } from '@/design/use-reduce-motion';
import { PrefsProvider } from '@/state/prefs';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Inter is bundled — never a system font. Noto Sans Telugu joins at v1.1.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PrefsProvider>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </PrefsProvider>
  );
}

function Navigation() {
  const { scheme, palette } = useTheme();
  const reduceMotion = useReduceMotion();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent.fill,
      background: palette.bg,
      card: palette.bg,
      text: palette.text.primary,
      border: palette.border,
      notification: palette.danger.fill,
    },
  };
  return (
    <NavigationThemeProvider value={navTheme}>
      <DatabaseProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
            animation: reduceMotion ? 'fade' : 'default',
            animationDuration: 220,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="language" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="exam/intro" />
          {/* Forward-only: no swipe-back, no header back. Exit goes through a confirm dialog (M3). */}
          <Stack.Screen name="exam/session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="exam/result" options={{ gestureEnabled: false }} />
          <Stack.Screen name="exam/review/[attemptId]" />
          <Stack.Screen name="learn/[topic]" />
          <Stack.Screen name="learn/flashcards" />
          <Stack.Screen name="learn/search" />
          <Stack.Screen name="question/[id]" />
          <Stack.Screen name="signs/[signId]" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="about" options={{ presentation: 'modal' }} />
          <Stack.Screen name="guide/index" options={{ presentation: 'modal' }} />
        </Stack>
      </DatabaseProvider>
    </NavigationThemeProvider>
  );
}
