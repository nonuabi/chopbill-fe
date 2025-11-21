import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ProfileAvatar from "../components/ProfileAvtar";
import { getColors } from "../styles/colors";
import { getCommonStyles } from "../styles/common";
import { API_BASE, authenticatedFetch, handleAuthError, logout as authLogout, TOKEN_KEY } from "../utils/auth";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage, getSuccessMessage } from "../utils/toast";
import { useTheme } from "../contexts/ThemeContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [personalInviteUrl, setPersonalInviteUrl] = useState<string>("");
  const [sharingInvite, setSharingInvite] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to update profile");
      }
      const data = await res.json();
      console.log("update proflie res => ", data);
      setIsEditOpen(false);
      showToast(getSuccessMessage("update_profile"), "success");
      // Refresh user data from server to ensure we have the latest data
      await fetchUser();
    } catch (e: any) {
      console.log("update profile error -> ", e);
      showToast(e?.message || "Could not update profile. Please try again.", "error", 4000);
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
      showToast("Could not log out. Please try again.", "error");
    }
  };

  const deleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const res = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "DELETE",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        const errorMsg = errorData?.message || errorData?.error || "Failed to delete account";
        throw new Error(errorMsg);
      }

      // Account deleted successfully, logout and redirect to login
      await authLogout();
      showToast("Your account has been deleted successfully.", "success", 3000);
      setTimeout(() => {
        router.replace("/(auth)/LoginScreen");
      }, 1000);
    } catch (e: any) {
      console.error("Delete account error:", e);
      showToast(e?.message || "Could not delete account. Please try again.", "error", 4000);
    } finally {
      setDeletingAccount(false);
    }
  };

  const fetchUser = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      const res = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to load profile");
      }
      const data = await res.json();
      setUser(data?.data);
    } catch (e: any) {
      console.log("profile error!", e);
      if (!refreshing) {
        showToast(e?.message || "Could not load profile data. Pull down to refresh.", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser();
    fetchPersonalInvite();
  }, [fetchUser]);

  const fetchPersonalInvite = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/invites/personal`, {
        method: "GET",
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        console.error("Failed to fetch personal invite");
        return;
      }

      const data = await res.json();
      setPersonalInviteUrl(data?.invite_url || "");
    } catch (e: any) {
      console.log("Error fetching personal invite:", e);
    }
  }, []);

  const sharePersonalInvite = async () => {
    try {
      if (!personalInviteUrl) {
        await fetchPersonalInvite();
        // Wait a bit for state to update
        setTimeout(() => sharePersonalInvite(), 100);
        return;
      }

      setSharingInvite(true);
      const message = `Join me on ChopBill! Split expenses with friends easily. Sign up here: ${personalInviteUrl}`;
      
      try {
        const result = await Share.share({
          message: message,
          title: "Invite friends to ChopBill",
        });

        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // Shared with activity type of result.activityType
            console.log("Shared with activity type:", result.activityType);
          } else {
            // Shared
            console.log("Shared successfully");
          }
        } else if (result.action === Share.dismissedAction) {
          // Dismissed
          console.log("Share dismissed");
        }
      } catch (error: any) {
        showToast(error.message || "Could not share invite. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error sharing invite:", error);
      showToast("Could not share invite. Please try again.", "error");
    } finally {
      setSharingInvite(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchPersonalInvite();
    }, [fetchUser, fetchPersonalInvite])
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

  // Loading skeleton component with shimmer effect
  const SkeletonBox = ({ width, height, style }: { width?: number | string; height: number; style?: any }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0.8],
    });

    return (
      <Animated.View style={[styles.skeletonBox, { width: width || "100%", height, opacity }, style]} />
    );
  };

  const styles = getStyles(colors, isDark);

  if (loading && !user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <ScrollView 
            contentContainerStyle={[common.container]}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header Skeleton */}
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[styles.skeletonCircle, { width: 100, height: 100, borderRadius: 50 }]} />
                <View style={[styles.profileInfo, { flex: 1 }]}>
                  <SkeletonBox width="70%" height={28} style={{ marginBottom: 8 }} />
                  <SkeletonBox width="60%" height={18} style={{ marginBottom: 4 }} />
                  <SkeletonBox width="50%" height={14} />
                </View>
                <View style={[styles.skeletonBox, { width: 36, height: 36, borderRadius: 8 }]} />
              </View>
            </View>

            {/* Stats Section Skeleton */}
            <View style={styles.statsSection}>
              <SkeletonBox width="40%" height={22} style={{ marginBottom: 12 }} />
              <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.statCard}>
                    <View style={[styles.skeletonCircle, { width: 48, height: 48, borderRadius: 24, marginBottom: 8 }]} />
                    <SkeletonBox width="60%" height={20} style={{ marginBottom: 4 }} />
                    <SkeletonBox width="40%" height={16} />
                  </View>
                ))}
              </View>
            </View>

            {/* Account Info Skeleton */}
            <View style={styles.section}>
              <SkeletonBox width="45%" height={22} style={{ marginBottom: 12 }} />
              <View style={styles.infoCard}>
                {[1, 2, 3].map((i) => (
                  <View key={i}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <View style={[styles.skeletonBox, { width: 20, height: 20, borderRadius: 4 }]} />
                        <SkeletonBox width={60} height={16} />
                      </View>
                      <SkeletonBox width="40%" height={16} />
                    </View>
                    {i < 3 && <View style={styles.infoDivider} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Actions Skeleton */}
            <View style={styles.section}>
              {[1, 2].map((i) => (
                <View key={i} style={[styles.actionCard, { marginBottom: 12 }]}>
                  <View style={styles.actionLeft}>
                    <View style={[styles.skeletonCircle, { width: 40, height: 40, borderRadius: 20 }]} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <SkeletonBox width="50%" height={18} style={{ marginBottom: 4 }} />
                      <SkeletonBox width="70%" height={14} />
                    </View>
                  </View>
                  <View style={[styles.skeletonBox, { width: 20, height: 20, borderRadius: 4 }]} />
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
                <View style={[styles.actionIcon, { backgroundColor: colors.borderLight }]}>
                  <Feather name="edit-3" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSubtitle}>Update your name and contact info</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textTertiary} />
            </Pressable>

            {/* Invite Friends */}
            <Pressable 
              style={styles.actionCard}
              onPress={sharePersonalInvite}
              disabled={sharingInvite}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? "#1E3A8A" : "#EEF2FF" }]}>
                  <Feather name="share-2" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Invite Friends</Text>
                  <Text style={styles.actionSubtitle}>Share ChopBill with your contacts</Text>
                </View>
              </View>
              {sharingInvite ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
              )}
            </Pressable>

            {/* Theme Settings */}
            <Pressable 
              style={styles.actionCard}
              onPress={() => {
                Alert.alert(
                  "Theme",
                  "Choose your preferred theme",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Light",
                      onPress: () => setThemeMode("light"),
                      style: themeMode === "light" ? "default" : undefined,
                    },
                    {
                      text: "Dark",
                      onPress: () => setThemeMode("dark"),
                      style: themeMode === "dark" ? "default" : undefined,
                    },
                    {
                      text: "System",
                      onPress: () => setThemeMode("system"),
                      style: themeMode === "system" ? "default" : undefined,
                    },
                  ]
                );
              }}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: isDark ? "#1F2937" : "#FEF3C7" }]}>
                  <Feather name={isDark ? "moon" : "sun"} size={20} color={isDark ? "#FBBF24" : "#F59E0B"} />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Theme</Text>
                  <Text style={styles.actionSubtitle}>
                    {themeMode === "system" 
                      ? "System default" 
                      : themeMode === "dark" 
                      ? "Dark mode" 
                      : "Light mode"}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textTertiary} />
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

          {/* Delete Account */}
          <View style={styles.section}>
            <Pressable 
              style={[styles.deleteAccountCard, deletingAccount && { opacity: 0.7 }]}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Are you sure you want to delete your account? This action cannot be undone. You cannot delete your account if you own any groups.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Delete Account", 
                      style: "destructive", 
                      onPress: () => {
                        Alert.alert(
                          "Final Confirmation",
                          "This will permanently delete your account and all associated data. This action cannot be undone. Are you absolutely sure?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { 
                              text: "Yes, Delete My Account", 
                              style: "destructive", 
                              onPress: deleteAccount 
                            },
                          ]
                        );
                      }
                    },
                  ]
                );
              }}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Feather name="trash-2" size={20} color={colors.danger} />
              )}
              <Text style={styles.deleteAccountText}>
                {deletingAccount ? "Deleting Account..." : "Delete Account"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
  profileCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
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
    color: colors.text,
    marginBottom: 4,
  },
  profileContact: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 4,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
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
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 16,
  },
  actionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  signOutCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? "#7F1D1D" : "#FEE2E2",
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
  deleteAccountCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? "#7F1D1D" : "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.danger,
  },
  title: { fontSize: 20, fontWeight: "600" },
  muted: { opacity: 0.7 },

  // modal styles
  overlay: {
    flex: 1,
    backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16, color: colors.text },
  subtitle: { opacity: 0.7, marginBottom: 16, color: colors.textSecondary },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: colors.primary },
  btnTextPrimary: { color: colors.white, fontWeight: "600" },
  btnGhost: { backgroundColor: colors.borderLight },
  btnTextGhost: { color: colors.text, fontWeight: "600" },
  skeletonBox: {
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  skeletonCircle: {
    backgroundColor: colors.border,
  },
});
