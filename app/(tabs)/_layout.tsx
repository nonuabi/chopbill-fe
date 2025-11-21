import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { validateSession } from "../utils/auth";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  
  useEffect(() => {
    const checkSession = async () => {
      // Only validate session if we're already in the tabs (not on initial mount from auth)
      // The index.tsx already handles initial authentication check
      // This is a secondary check that runs less aggressively
      try {
        const isValid = await validateSession(5000); // Longer timeout for tabs validation
        if (!isValid) {
          router.replace("/(auth)/LoginScreen");
        }
      } catch (error) {
        // On error, don't immediately redirect - let the user stay if they're already here
        // The index.tsx will handle authentication on next app start
        console.error("Tabs layout session check error:", error);
      }
    };
    // Add a small delay to avoid race conditions with initial auth check
    const timeoutId = setTimeout(checkSession, 1000);
    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
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
      <Tabs.Screen
        name="groups/[id]/settle-up"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
