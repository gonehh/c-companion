import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { AuthProvider } from "@/lib/auth";
import { ResponsiveProvider } from "@/lib/responsive";
import { Toast } from "@/components/ui/toast";
import { setPendingSnoozeRequestFromNotification } from "@/lib/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const [client] = useState(() => new QueryClient());
  const lastHandledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleNotificationResponse = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const notificationId = response.notification.request.identifier;
      if (lastHandledNotificationIdRef.current === notificationId) return;
      lastHandledNotificationIdRef.current = notificationId;

      await setPendingSnoozeRequestFromNotification(response);
      router.push("/(tabs)/calendar");
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationResponse(response).catch((error) => {
        console.error("Nie udalo sie obsluzyc ostatniego klikniecia powiadomienia", error);
      });
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response).catch((error) => {
        console.error("Nie udalo sie obsluzyc klikniecia powiadomienia", error);
      });
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <ResponsiveProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#1a1422" } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
              </Stack>
              <Toast />
            </AuthProvider>
          </ResponsiveProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
