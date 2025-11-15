import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { API_BASE, authenticatedFetch, handleAuthError, logout as authLogout, TOKEN_KEY } from "../utils/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ 
    id?: number | string;
    name?: string; 
    email?: string; 
    phone_number?: string;
    avatar_url?: string;
    created_at?: string;
    stats?: {
      total_groups?: number;
      owned_groups?: number;
      total_expenses?: number;
      total_spent?: number;
    };
  } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const openEdit = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhoneNumber(user?.phone_number || "");
    setIsEditOpen(true);
  };
  const onSubmit = async () => {
    try {
      setSaving(true);

      const res = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "PATCH",
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim() || null,
          phone_number: phoneNumber.trim() || null
        }),
      });

      if (!res) {
        // Auth error already handled
        return;
      }

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
      await authLogout();
    } catch (e) {
      console.error("Logout error:", e);
      // authLogout handles errors internally, but show user-friendly message
      Alert.alert("Error", "Could not log out, please try again.");
    }
  };

  const fetchUser = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUser(data?.data);
    } catch (e: any) {
      console.log("profile error!", e);
      if (!refreshing) {
        Alert.alert("Error", "Could not load profile data");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser();
  }, [fetchUser]);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser])
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch {
      return "";
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <ScrollView 
          contentContainerStyle={[common.container]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <ProfileAvatar 
                fullName={user?.name || user?.email || ""} 
                email={user?.email}
                avatarUrl={user?.avatar_url}
                userId={user?.id}
                size={100}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.name || "User"}</Text>
                <Text style={styles.profileContact}>
                  {user?.email || user?.phone_number || "No contact info"}
                </Text>
                {user?.created_at && (
                  <Text style={styles.memberSince}>
                    Member since {formatDate(user.created_at)}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={openEdit}
                style={styles.editButton}
                hitSlop={8}
              >
                <Feather name="edit-2" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Stats Section */}
          {user?.stats && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Your Activity</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: "#EEF2FF" }]}>
                    <Feather name="users" size={24} color="#6366F1" />
                  </View>
                  <Text style={styles.statValue}>{user.stats.total_groups || 0}</Text>
                  <Text style={styles.statLabel}>Groups</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: "#F0FDF4" }]}>
                    <Feather name="user-check" size={24} color={colors.green} />
                  </View>
                  <Text style={styles.statValue}>{user.stats.owned_groups || 0}</Text>
                  <Text style={styles.statLabel}>Owned</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Feather name="file-text" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>{user.stats.total_expenses || 0}</Text>
                  <Text style={styles.statLabel}>Expenses</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Feather name="trending-up" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.statValue}>
                    {formatCurrency(user.stats.total_spent || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>
            </View>
          )}

          {/* Account Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Feather name="mail" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user?.email || "Not provided"}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Feather name="phone" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Phone</Text>
                </View>
                <Text style={styles.infoValue}>
                  {user?.phone_number || "Not provided"}
                </Text>
              </View>
              {user?.created_at && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoLeft}>
                      <Feather name="calendar" size={20} color="#6B7280" />
                      <Text style={styles.infoLabel}>Joined</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {formatDate(user.created_at)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Actions Section */}
          <View style={styles.section}>
            <Pressable 
              style={styles.actionCard}
              onPress={openEdit}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: "#F3F4F6" }]}>
                  <Feather name="edit-3" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSubtitle}>Update your name and contact info</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </Pressable>
          </View>

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

                        <Text style={styles.label}>Email (Optional)</Text>
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

                        <Text style={styles.label}>Phone Number (Optional)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="+1234567890"
                          keyboardType="phone-pad"
                          autoCapitalize="none"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
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

          {/* Sign Out */}
          <View style={styles.section}>
            <Pressable 
              style={styles.signOutCard}
              onPress={() => {
                Alert.alert(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign Out", style: "destructive", onPress: logout },
                  ]
                );
              }}
            >
              <Feather name="log-out" size={20} color={colors.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  profileContact: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 16,
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  signOutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.danger,
  },
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
