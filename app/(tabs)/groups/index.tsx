import Feather from "@expo/vector-icons/Feather";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../styles/colors";
import { getCommonStyles } from "../../styles/common";
import { API_BASE, authenticatedFetch, TOKEN_KEY } from "../../utils/auth";
import { useToast } from "../../contexts/ToastContext";
import { extractErrorMessage, getSuccessMessage } from "../../utils/toast";
import ProfileAvatar from "../../components/ProfileAvtar";

// Currency formatter helper
const formatCurrency = (amount: number): string => {
  return `₹${Math.abs(amount).toFixed(2)}`;
};

// Get group initials (first 2 letters)
const getGroupInitials = (name: string): string => {
  if (!name) return "GR";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
};

// Generate a consistent color for a group based on its name
const getGroupColor = (name: string): string => {
  if (!name) return colors.primary;
  
  // Simple hash function to generate consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a color from the hash (using a nice color palette)
  const colors_palette = [
    "#6366F1", // Indigo
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#84CC16", // Lime
    "#14B8A6", // Teal
    "#A855F7", // Violet
  ];
  
  const index = Math.abs(hash) % colors_palette.length;
  return colors_palette[index];
};

// Format date helper
const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? "week" : "weeks"} ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

export default function GroupsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const styles = getStyles(colors, isDark);
  const params = useLocalSearchParams<{ create?: string }>();
  const [groups, setGroups] = useState<
    {
      id: string;
      name: string;
      description?: string;
      member_count: number;
      totalAmount?: number; // sum of expenses in this group
      balanceForMe?: number; // +ve: others will pay you; -ve: you need to pay
      expense_count?: number;
      last_expense_date?: string;
      member_avatars?: Array<{
        id: number | string;
        name: string;
        avatar_url: string;
      }>;
      recent_expenses_summary?: Array<{
        id: number | string;
        description: string;
        amount: number;
        paid_by: {
          id: number | string;
          name: string;
          avatar_url: string;
        };
        created_at: string;
      }>;
    }[]
  >([]);

  const [userList, setUserList] = useState<
    { id: string; name: string; email?: string; phone_number?: string }[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupdesciption, setGroupDiscription] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<
    { id?: string; email?: string; phone_number?: string; name?: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUserGroups = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/groups`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to fetch user groups");
      }
      const data = await res.json();
      setGroups(data?.groups || []);
    } catch (e: any) {
      console.log("Error from fetching group list => ", e);
      if (!refreshing) {
        showToast(e?.message || "Could not load groups. Pull down to refresh.", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/users`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch user");
      }
      const data = await res.json();
      setUserList(data?.users || []);
    } catch (e: any) {
      console.log("Error from fetching users list => ", e);
      if (!refreshing) {
        showToast("Could not load users. Please try again.", "error");
      }
    }
  }, [refreshing]);

  // Open modal if create parameter is present
  useEffect(() => {
    if (params.create === "true") {
      setIsModalOpen(true);
      // Clear the parameter from URL
      router.setParams({ create: undefined });
    }
  }, [params.create]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchUserGroups();
      fetchUsers();
    }, [fetchUserGroups, fetchUsers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserGroups();
    fetchUsers();
  }, [fetchUserGroups, fetchUsers]);

  const normalized = (s: string | null | undefined) => (s || "").trim().toLowerCase();
  
  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = normalized(searchQuery);
    return groups.filter(
      (g) =>
        normalized(g.name).includes(query) ||
        normalized(g.description).includes(query)
    );
  }, [groups, searchQuery]);

  const emailResults = useMemo(() => {
    // Get identifiers of already selected members
    const selectedIdentifiers = new Set(
      selectedMembers.map((m) => 
        normalized(m.email || m.phone_number)
      )
    );
    
    return userList.filter(
      (u) => {
        // Check if user matches search query
        const matchesQuery = 
          normalized(u.email || u.phone_number).includes(normalized(memberQuery)) ||
          normalized(u.name).includes(normalized(memberQuery));
        
        // Check if user is already selected
        const userIdentifier = normalized(u.email || u.phone_number);
        const isAlreadySelected = selectedIdentifiers.has(userIdentifier);
        
        // Show only if matches query AND not already selected
        return matchesQuery && !isAlreadySelected;
      }
    );
  }, [userList, memberQuery, selectedMembers]);

  const addMemberByEmail = (
    email?: string,
    name?: string,
    id?: string,
    phone_number?: string
  ) => {
    const identifier = email || phone_number || "";
    const exists = selectedMembers.some(
      (m) => normalized(m.email || m.phone_number) === normalized(identifier)
    );
    if (exists) return;
    setSelectedMembers((prev) => [...prev, { email, phone_number, name, id }]);
    setMemberQuery("");
  };

  const removeMember = (identifier: string) => {
    setSelectedMembers((prev) =>
      prev.filter((m) => normalized(m.email || m.phone_number) !== normalized(identifier))
    );
  };

  const handleAddGroup = async () => {
    try {
      if (isSaving) return;
      if (!groupName.trim()) {
        showToast("Please enter a group name", "warning");
        return;
      }
      if (selectedMembers.length === 0) {
        showToast("Please add at least one member to create a group", "warning");
        return;
      }
      setIsSaving(true);
      const newGroup = {
        id: "",
        name: groupName.trim(),
        description: groupdesciption.trim() || undefined,
        members: selectedMembers,
        totalAmount: 0,
        balanceForMe: 0,
      } as const;
      console.log("new group => ", newGroup);

      const res = await authenticatedFetch(`${API_BASE}/api/groups`, {
        method: "POST",
        body: JSON.stringify({ group: newGroup }),
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to create a group");
      }
      const data = await res.json();
      console.log("Create group res => ", data?.group);

      // Refresh groups list
      await fetchUserGroups();
      setGroupName("");
      setGroupDiscription("");
      setSelectedMembers([]);
      setMemberQuery("");
      setIsModalOpen(false);
      showToast(getSuccessMessage("create_group"), "success");
    } catch (e: any) {
      console.log("Error while creating group -> ", e);
      showToast(e?.message || "Could not create group. Please try again.", "error", 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer, { flex: 1 }]}>
        <View style={[common.container, { flex: 1 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Your Groups</Text>
              <Text style={styles.subtitle}>
                {filteredGroups.length} {filteredGroups.length === 1 ? "group" : "groups"}
                {searchQuery && ` of ${groups.length}`}
              </Text>
            </View>
            <Pressable
              style={styles.btn}
              onPress={() => setIsModalOpen(true)}
              android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            >
              <Feather name="plus" size={18} color={colors.white} />
              <Text style={styles.btnText}>Create</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          {groups.length > 0 && (
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search groups by name or description..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          )}

          {/* Groups List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
          ) : filteredGroups?.length === 0 ? (
            searchQuery ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color={colors.border} />
                  <Text style={styles.emptyStateTitle}>No groups found</Text>
                  <Text style={styles.emptyStateText}>
                    No groups match "{searchQuery}". Try a different search term.
                  </Text>
                  <Pressable
                    style={styles.emptyStateButton}
                    onPress={() => setSearchQuery("")}
                  >
                    <Text style={styles.emptyStateButtonText}>Clear Search</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Feather name="users" size={64} color={colors.border} />
                  </View>
                  <Text style={styles.emptyStateTitle}>No groups yet</Text>
                  <Text style={styles.emptyStateText}>
                    Create your first group to start splitting expenses with friends and family.
                  </Text>
                  <Pressable
                    style={styles.emptyStateButton}
                    onPress={() => setIsModalOpen(true)}
                  >
                    <Feather name="plus" size={18} color={colors.white} />
                    <Text style={styles.emptyStateButtonText}>Create Group</Text>
                  </Pressable>
                </View>
              </View>
            )
          ) : (
            <FlatList
              data={filteredGroups}
              keyExtractor={(g) => g.id}
              renderItem={({ item }) => {
                const total = item.totalAmount ?? 0;
                const bal = item.balanceForMe ?? 0;
                const expenseCount = item.expense_count || 0;
                const hasExpenses = expenseCount > 0;
                // A group is only "settled" if it has expenses AND balance is 0
                // New groups with no expenses should not show as settled
                const isSettled = hasExpenses && bal === 0;
                const isPositive = bal > 0;
                const isNegative = bal < 0;
                const memberAvatars = item.member_avatars || [];
                const recentExpenses = item.recent_expenses_summary || [];

                return (
                  <Pressable
                    onPress={() => router.push(`/(tabs)/groups/${item.id}`)}
                    android_ripple={{ color: isDark ? colors.borderLight : "#E5E7EB" }}
                    style={({ pressed }) => [
                      styles.item,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View style={styles.itemContent}>
                      {/* Header Section */}
                      <View style={styles.itemHeader}>
                        <View style={styles.itemLeft}>
                          <View style={[
                            styles.groupInitials,
                            isPositive && { backgroundColor: colors.green, borderColor: colors.green },
                            isNegative && { backgroundColor: colors.danger, borderColor: colors.danger },
                            !isPositive && !isNegative && { backgroundColor: getGroupColor(item.name) },
                          ]}>
                            <Text style={styles.groupInitialsText}>
                              {getGroupInitials(item.name)}
                            </Text>
                          </View>
                          <View style={styles.itemTextContainer}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            {item?.description ? (
                              <Text style={styles.itemDescription} numberOfLines={1}>
                                {item.description}
                              </Text>
                            ) : (
                              <Text style={styles.itemDescription}>
                                {item?.member_count || 0} {item?.member_count === 1 ? "member" : "members"}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.balanceContainer}>
                          {isSettled ? (
                            <>
                              <View style={styles.settledBadge}>
                                <Feather name="check-circle" size={16} color={colors.green} />
                                <Text style={styles.settledText}>Settled</Text>
                              </View>
                            </>
                          ) : hasExpenses ? (
                            <>
                              <Text
                                style={[
                                  styles.balanceAmount,
                                  isPositive ? styles.balancePositive : styles.balanceNegative,
                                ]}
                              >
                                {isPositive ? "+" : "-"}{formatCurrency(bal)}
                              </Text>
                              <Text style={styles.balanceLabel}>
                                {isPositive ? "will pay you" : "you need to pay"}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.balanceLabel}>
                                No expenses yet
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Members Avatars Section - Always show for consistent height */}
                      <View style={styles.membersSection}>
                        {memberAvatars.length > 0 ? (
                          <>
                            <View style={styles.membersAvatars}>
                              {memberAvatars.slice(0, 4).map((member, idx) => (
                                <View
                                  key={member.id}
                                  style={[
                                    styles.avatarWrapper,
                                    idx > 0 && { marginLeft: -8 },
                                  ]}
                                >
                                  <ProfileAvatar
                                    fullName={member.name}
                                    size={32}
                                    avatarUrl={member.avatar_url}
                                    userId={member.id}
                                  />
                                </View>
                              ))}
                              {item.member_count > 4 && (
                                <View style={[styles.avatarWrapper, styles.avatarOverflow, { marginLeft: -8 }]}>
                                  <Text style={styles.avatarOverflowText}>
                                    +{item.member_count - 4}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </>
                        ) : (
                          <View style={styles.membersAvatars}>
                            <Text style={styles.emptyMembersText}>
                              {item?.member_count || 0} {item?.member_count === 1 ? "member" : "members"}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Footer Section */}
                      <View style={styles.itemFooter}>
                        <View style={styles.statItem}>
                          <Feather name="users" size={14} color={colors.textSecondary} />
                          <Text style={styles.statText}>
                            {item?.member_count || 0} {item?.member_count === 1 ? "member" : "members"}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Feather name="file-text" size={14} color={colors.textSecondary} />
                          <Text style={styles.statText}>
                            {expenseCount} {expenseCount === 1 ? "expense" : "expenses"}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Feather name="trending-up" size={14} color={colors.textSecondary} />
                          <Text style={styles.statText}>
                            {formatCurrency(total)} total
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              scrollEnabled={true}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            />
          )}
        </View>

        <Modal
          visible={isModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
                style={{ width: "100%", alignItems: "center" }}
              >
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Create New Group</Text>
                  <Text style={styles.modalSubtitle}>
                    Create a new group to split expenses with friends and family
                  </Text>
                  <Text style={styles.label}>Group Name *</Text>
                  <TextInput
                    placeholder="Group name"
                    style={styles.input}
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={styles.label}> Description (Optional)</Text>
                  <TextInput
                    placeholder="Brief description of the group"
                    style={styles.input}
                    value={groupdesciption}
                    onChangeText={setGroupDiscription}
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.label, { marginTop: 8 }]}>Members</Text>
                  
                  {/* Helper text */}
                  <View style={styles.helperContainer}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.helperText}>
                      Search and tap on a user to add them to the group
                    </Text>
                  </View>

                  {/* Selected member chips */}
                  {selectedMembers.length > 0 && (
                    <View style={styles.chipsWrap}>
                      {selectedMembers.map((m, idx) => {
                        const identifier = m.email || m.phone_number || `member-${idx}`;
                        const displayText = m.email || m.phone_number || "Unknown";
                        return (
                          <View key={identifier} style={styles.chip}>
                            <Text style={styles.chipText}>
                              {m.name ? `${m.name} · ${displayText}` : displayText}
                            </Text>
                            <Pressable
                              onPress={() => removeMember(identifier)}
                              accessibilityRole="button"
                            >
                              <Text style={styles.chipRemove}>✕</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Search box */}
                  <TextInput
                    placeholder="Search by email or name"
                    style={styles.input}
                    value={memberQuery}
                    onChangeText={setMemberQuery}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={colors.textTertiary}
                  />

                  {/* Search results */}
                  {memberQuery.length > 0 && (
                    <View style={styles.resultsBox}>
                      {emailResults.length > 0 ? (
                        <>
                          <View style={styles.resultsHeader}>
                            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                            <Text style={styles.resultsHeaderText}>
                              Tap to add ({emailResults.length})
                            </Text>
                          </View>
                          {emailResults.slice(0, 6).map((u) => (
                            <Pressable
                              key={u.id}
                              onPress={() =>
                                addMemberByEmail(u.email, u.name, u.id, u.phone_number)
                              }
                              style={({ pressed }) => [
                                styles.resultRow,
                                pressed && styles.resultRowPressed,
                              ]}
                            >
                              <View style={styles.resultRowContent}>
                                <View style={styles.resultRowLeft}>
                                  <View style={styles.resultAvatar}>
                                    <Text style={styles.resultAvatarText}>
                                      {u.name ? u.name.charAt(0).toUpperCase() : (u.email || u.phone_number || "?").charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                  <View style={styles.resultRowText}>
                                    <Text style={styles.resultName}>{u.name || "User"}</Text>
                                    <Text style={styles.resultEmail}>{u.email || u.phone_number || "No contact"}</Text>
                                  </View>
                                </View>
                                <View style={styles.addButton}>
                                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </>
                      ) : (
                        <View style={styles.resultEmpty}>
                          <Ionicons name="search-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                          <Text style={styles.resultEmptyText}>
                            No users found. Only existing ChopBill users can be added to groups.
                          </Text>
                          <Text style={styles.hintText}>
                            Share the app with your friends so they can join your groups!
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.row}>
                    <Pressable
                      onPress={() => setIsModalOpen(false)}
                      style={[styles.modalBtn, styles.btnGhost]}
                    >
                      <Text style={styles.btnTextGhost}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddGroup}
                      disabled={isSaving}
                      style={[
                        styles.modalBtn,
                        styles.btnPrimary,
                        isSaving ? { opacity: 0.6 } : null,
                      ]}
                    >
                      {isSaving ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <ActivityIndicator size="small" />
                          <Text style={styles.btnTextPrimary}>Saving…</Text>
                        </View>
                      ) : (
                        <Text style={styles.btnTextPrimary}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "500",
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    minHeight: 48,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.1 : 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
    fontWeight: "400",
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  separator: {
    height: 14,
  },
  item: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  itemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.borderLight,
    borderColor: colors.primary,
    shadowOpacity: isDark ? 0.3 : 0.12,
  },
  itemContent: {
    padding: 14,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 12,
  },
  groupInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  groupInitialsText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  groupIconPositive: {
    backgroundColor: "#F0FDF4",
    borderColor: colors.green,
  },
  groupIconNegative: {
    backgroundColor: "#FEF2F2",
    borderColor: colors.danger,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  balanceContainer: {
    alignItems: "flex-end",
    minWidth: 100,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  balancePositive: {
    color: colors.green,
  },
  balanceNegative: {
    color: colors.danger,
  },
  balanceNeutral: {
    color: colors.textSecondary,
  },
  balanceLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: isDark ? "#1A3A2E" : "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green,
  },
  settledText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: "600",
  },
  membersSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    minHeight: 32, // Consistent height without last expense text
  },
  emptyMembersText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  membersAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: colors.cardBackground,
    borderRadius: 18,
    overflow: "hidden",
  },
  avatarOverflow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  avatarOverflowText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  lastExpenseContainer: {
    minHeight: 16, // Consistent height for last expense text area
    marginTop: 3,
  },
  lastExpenseText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  recentExpensesSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  recentExpensesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  recentExpensesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recentExpenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingVertical: 4,
  },
  recentExpenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  recentExpenseDesc: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  recentExpenseAmount: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  moreExpensesText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontStyle: "italic",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexWrap: "wrap",
    gap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  emptyStateContainer: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    marginBottom: 24,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },

  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4, color: colors.text },
  modalSubtitle: { opacity: 0.7, marginBottom: 16, color: colors.textSecondary },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    marginBottom: 12,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: colors.primary },
  btnTextPrimary: { color: colors.white, fontWeight: "600" },
  btnGhost: { backgroundColor: colors.borderLight },
  btnTextGhost: { color: colors.text, fontWeight: "600" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  chipText: { color: colors.text },
  chipRemove: { marginLeft: 4, color: colors.textSecondary, fontWeight: "700" },
  resultsBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: colors.cardBackground,
  },
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  resultsHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  resultRow: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultRowPressed: {
    backgroundColor: colors.borderLight,
  },
  resultRowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  resultRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  resultRowText: {
    flex: 1,
  },
  resultName: { 
    fontWeight: "600", 
    color: colors.text,
    fontSize: 15,
    marginBottom: 2,
  },
  resultEmail: { 
    color: colors.textSecondary,
    fontSize: 13,
  },
  addButton: {
    padding: 4,
  },
  resultEmpty: { padding: 12, gap: 10 },
  resultEmptyText: { color: colors.textSecondary, marginBottom: 8 },
  hintText: { 
    color: colors.textTertiary, 
    fontSize: 12, 
    fontStyle: "italic",
    textAlign: "center"
  },
  inviteBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
});
