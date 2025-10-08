import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Header from "../components/Header";
import ProfileAvatar from "../components/ProfileAvtar";
import { colors } from "../styles/colors";
import { common } from "../styles/common";

const TOKEN_KEY = "sf_token";
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://sharefare-be.onrender.com";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null
  );

  const logout = async () => {
    console.log("logout");
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log("token ", token);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return;
      }
      const res = await fetch(`${API_BASE}/logout`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("logout res => ", res);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      router.replace("/(auth)/LoginScreen");
    } catch (e) {
      Alert.alert("Error", "Could not log out, please try again.");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
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
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setUser(data?.data);
        console.log("user data => ", data);
      } catch (e: any) {
        console.log("profile error!", e);
      }
    };
    fetchUser();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <Header />
        <ScrollView contentContainerStyle={[common.container]}>
          <View style={[common.card, { padding: 24, marginBottom: 24 }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <ProfileAvatar fullName={user?.name || ""} />
              <View
                style={{
                  marginLeft: 10,
                }}
              >
                <Text style={styles.title}>{user?.name || "User"}</Text>
                <Text style={styles.muted}>{user?.email || ""}</Text>
              </View>
            </View>
            <Pressable>
              <Text>Edit</Text>
            </Pressable>
          </View>

          <Pressable style={[common.card, { padding: 24, marginBottom: 12 }]}>
            <Text>Invite Friends to ShareFare</Text>
          </Pressable>

          <Pressable style={[common.card, { padding: 24 }]} onPress={logout}>
            <Text
              style={{
                color: colors.danger,
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "600" },
  muted: { opacity: 0.7 },
});
