import { type ComponentType } from "react";
import { Tabs, Redirect } from "expo-router";
import { BookOpen, User, Calendar } from "lucide-react-native";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useResponsive } from "@/lib/responsive";

type TabIconGlyphProps = {
  color: string;
  size: number;
  strokeWidth?: number;
};

function TabBarIconBadge({
  Icon,
  color,
  size,
  focused,
}: {
  Icon: ComponentType<TabIconGlyphProps>;
  color: string;
  size: number;
  focused: boolean;
}) {
  const boxWidth = size + 24;
  const boxHeight = size + 16;
  const fill = focused ? "#7c4dcb" : "#4f356f";
  const stroke = focused ? "#b796f0" : "#6f4d98";

  return (
    <View
      style={{
        width: boxWidth,
        height: boxHeight,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: fill,
        borderWidth: 2,
        borderColor: stroke,
      }}
    >
      <Icon color={focused ? "#f7f2ff" : color} size={size} strokeWidth={2.2} />
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { isTabletUp } = useResponsive();
  const titleSize = isTabletUp ? "text-xl" : "text-lg";
  const maxWidth = isTabletUp ? 980 : undefined;
  const iconSize = isTabletUp ? 28 : 24;
  const tabBarBottomOffset = 0;
  const tabBarHeight = isTabletUp ? 64 : 58;

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
            <Text className={`${titleSize} font-extrabold text-foreground`}>Code </Text>
            <Text className={`${titleSize} font-extrabold text-primary`}>Loom</Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          width: "100%",
          height: tabBarHeight,
          maxWidth,
          alignSelf: "center",
          justifyContent: "center",
          position: "absolute",
          bottom: tabBarBottomOffset,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: "transparent" }} />,
        tabBarItemStyle: {
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: -6,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#a173e8",
        tabBarInactiveTintColor: "#a89fb5",
        sceneStyle: { backgroundColor: "#1a1422" },
      }}
    >
      <Tabs.Screen
        name="courses"
        options={{
          title: "Kursy",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconBadge Icon={BookOpen} color={color} size={iconSize ?? size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconBadge Icon={User} color={color} size={iconSize ?? size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Kalendarz",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconBadge Icon={Calendar} color={color} size={iconSize ?? size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
