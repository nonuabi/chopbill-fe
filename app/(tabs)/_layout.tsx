import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { validateSession } from "../utils/auth";
import { colors } from "../styles/colors";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    const checkSession = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        router.replace("/(auth)/LoginScreen");
      }
    };
    checkSession();
  }, [router]);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 4),
          height: 56 + Math.max(insets.bottom, 4),
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconMap: Record<
            string,
            { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
          > = {
            home: { outline: "home-outline", filled: "home" },
            expenses: { outline: "receipt-outline", filled: "receipt" },
            groups: { outline: "people-outline", filled: "people" },
            profile: { outline: "person-outline", filled: "person" },
          };
          const routeBase = route.name.split("/")[0];
          const icons = iconMap[routeBase] || { outline: "ellipse-outline", filled: "ellipse" };
          const iconName = focused ? icons.filled : icons.outline;
          return <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}
      initialRouteName="home"
    >
      <Tabs.Screen name="home" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="groups/index" options={{ title: "Groups" }} />
      <Tabs.Screen
        name="groups/[id]"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
