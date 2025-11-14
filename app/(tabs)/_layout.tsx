import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";

const TOKEN_KEY = "sf_token";
const API_BASE = "http://10.0.2.2:3000";

export default function TabsLayout() {
  const router = useRouter();
  useEffect(() => {
    const checksession = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
          router.replace("/(auth)/LoginScreen");
          return;
        }

        const res = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 400) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          router.replace("/(auth)/LoginScreen");
          return;
        }
      } catch (e: any) {
        console.log("error while checking session!");
      }
    };
    checksession();
  }, []);

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
