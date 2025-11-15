import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { validateSession } from "../utils/auth";

export default function TabsLayout() {
  const router = useRouter();
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
        tabBarActiveTintColor: "#111827",
        tabBarStyle: { height: 85 },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: "home-outline",
            expenses: "card-outline",
            groups: "people-outline",
            profile: "person-circle-outline",
          };
          const routeBase = route.name.split("/")[0];
          const name = map[routeBase] || "ellipse-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 12, marginBottom: 0 },
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
