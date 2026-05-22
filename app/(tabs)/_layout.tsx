import { Tabs, Redirect } from "expo-router";
import { BookOpen, User, Calendar } from "lucide-react-native";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useResponsive } from "@/lib/responsive";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { isTabletUp } = useResponsive();
  const titleSize = isTabletUp ? "text-xl" : "text-lg";
  const maxWidth = isTabletUp ? 980 : undefined;
  const iconSize = isTabletUp ? 24 : undefined;
  const labelSize = isTabletUp ? 13 : 12;

  if (loading) return null;
  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#1a1422" },
        headerTintColor: "#f0ecf2",
        headerTitle: () => (
          <View className="flex-row items-baseline">
            <Text className={`${titleSize} font-extrabold text-foreground`}>C++ </Text>
            <Text className={`${titleSize} font-extrabold text-primary`}>Quest</Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "#241b2f",
          borderTopColor: "#3a2f4a",
          width: "100%",
          maxWidth,
          alignSelf: "center",
        },
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: "600",
        },
        tabBarActiveTintColor: "#a173e8",
        tabBarInactiveTintColor: "#a89fb5",
        sceneStyle: { backgroundColor: "#1a1422" },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Kursy",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={iconSize ?? size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User color={color} size={iconSize ?? size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Kalendarz",
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={iconSize ?? size} />,
        }}
      />
    </Tabs>
  );
}
