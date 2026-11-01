import * as Notifications from "expo-notifications";
import { DefaultTheme, Stack, ThemeProvider, useRouter, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { TourProvider } from "@/components/Tour";
import { COLORS } from "@/constants";
import { registerBackgroundRefresh } from "@/lib/background";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.card,
    text: COLORS.ink,
    border: COLORS.line,
    primary: COLORS.accent,
    notification: COLORS.accent2,
  },
};

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Hiding twice or too early is harmless.
    });
    void registerBackgroundRefresh();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate("/(tabs)" as Href);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <ThemeProvider value={navTheme}>
      <TourProvider>
        <Stack screenOptions={{ contentStyle: { backgroundColor: COLORS.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="opp/[id]"
            options={{
              headerShown: true,
              title: "Opportunity",
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: COLORS.bg },
              headerTintColor: COLORS.ink,
            }}
          />
        </Stack>
      </TourProvider>
    </ThemeProvider>
  );
}
