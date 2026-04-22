import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { type Language } from "@/constants/translations";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { recordActivity } = useApp();
  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => {
        recordActivity();
        return false;
      }}
    >
      {children}
    </View>
  );
}

/** Listens for notification taps and routes wellbeing prompts to the assistant screen. */
function WellbeingNotificationHandler() {
  const { receiveWellbeingPrompt, language } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Handle tap on a wellbeing notification (app was backgrounded or closed)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as Record<string, unknown>;
        if (data?.wellbeing && typeof data.promptType === "string") {
          const lang = (typeof data.lang === "string" ? data.lang : language) as Language;
          receiveWellbeingPrompt(data.promptType, lang);
          // Small delay so context state settles before navigation
          setTimeout(() => router.push("/assistant"), 80);
        }
      } catch {}
    });

    return () => {
      responseSub.remove();
    };
  }, [receiveWellbeingPrompt, router, language]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <WellbeingNotificationHandler />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="assistant" />
        <Stack.Screen name="contacts" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="caregiver" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <ActivityTracker>
                  <RootLayoutNav />
                </ActivityTracker>
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
