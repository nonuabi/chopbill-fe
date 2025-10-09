import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const openEdit = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setIsEditOpen(true);
  };
  const normalizeToken = (raw?: string | null) => {
    const t = (raw ?? "").trim().replace(/^"|"$/g, "");
    return t.toLowerCase().startsWith("bearer ")
      ? t.split(" ").slice(1).join(" ")
      : t;
  };

  const buildAuthHeader = (token?: string | null) => {
    const b = normalizeToken(token);
    return b ? `Bearer ${b}` : "";
  };
  const onSubmit = async () => {
    try {
      setSaving(true);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return null;
      }

      const res = await fetch(`${API_BASE}/api/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to update profile");
      }
      const data = await res.json();
      console.log("update proflie res => ", data);
      const updated = data?.data;
      setUser((prev) => ({
        ...(prev || {}),
        ...updated,
      }));
      setIsEditOpen(false);
      Alert.alert("success", "Profile updated successfully");
    } catch (e: any) {
      console.log("update profile error -> ", e);
      Alert.alert("Error", e?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return null;
      }

      const res = await fetch(`${API_BASE}/logout`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
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
          return null;
        }

        const res = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(token),
          },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setUser(data?.data);
      } catch (e: any) {
        console.log("profile error!", e);
      }
    };
    fetchUser();
  }, [user]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        {/* <Header /> */}
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
            <Pressable
              onPress={openEdit}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "rgba(44, 49, 55, 0.13)" : "white",
                },
              ]}
            >
              <FontAwesome name="edit" size={24} color="black" />
            </Pressable>
            <Modal
              visible={isEditOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsEditOpen(false)}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                  <KeyboardAvoidingView
                    style={{ width: "90%" }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
                  >
                    <ScrollView
                      contentContainerStyle={{
                        alignItems: "center",
                        paddingVertical: 12,
                      }}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.card}>
                        <Text style={styles.modalTitle}>Update Profile</Text>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Your name"
                          value={name}
                          onChangeText={setName}
                          editable={!saving}
                          placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="you@example.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={setEmail}
                          editable={!saving}
                          placeholderTextColor="#9CA3AF"
                        />

                        <View style={styles.row}>
                          <Pressable
                            onPress={() => setIsEditOpen(false)}
                            disabled={saving}
                            style={[styles.btn, styles.btnGhost]}
                          >
                            <Text style={styles.btnTextGhost}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={onSubmit}
                            disabled={saving}
                            style={[
                              styles.btn,
                              styles.btnPrimary,
                              saving && { opacity: 0.7 },
                            ]}
                          >
                            <Text style={styles.btnTextPrimary}>
                              {saving ? "Saving..." : "Save"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
          {/* TODO */}
          {/* 
          <Pressable style={[common.card, { padding: 24, marginBottom: 12 }]}>
            <Text>Invite Friends to ShareFare</Text>
          </Pressable> */}

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

  // modal styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  subtitle: { opacity: 0.7, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: "#111827" },
  btnTextPrimary: { color: "#fff", fontWeight: "600" },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnTextGhost: { color: "#111827", fontWeight: "600" },
});
