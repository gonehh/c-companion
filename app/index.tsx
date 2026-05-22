import { View, Text, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#a173e8" />
        <Text className="mt-3 text-muted-foreground">Ładowanie...</Text>
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  return <Redirect href="/(tabs)/courses" />;
}
