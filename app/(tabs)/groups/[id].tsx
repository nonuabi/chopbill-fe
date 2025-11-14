import AntDesign from "@expo/vector-icons/AntDesign";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ListCard from "../../components/ListCard";
import ProfileAvatar from "../../components/ProfileAvtar";
import { colors } from "../../styles/colors";
import { common } from "../../styles/common";
import { API_BASE, buildAuthHeader, TOKEN_KEY } from "../../utils/auth";

type GroupMember = { id?: string; name?: string; email: string };
type Expense = {
  id: number;
  description: string;
  amount: number;
  paid_by: { id: number; name: string; email: string };
  created_at: string;
  notes?: string;
  split_count: number;
};
type MemberBalance = {
  user: GroupMember;
  balance: number;
  owes_you: number;
  you_owe: number;
};
type Group = {
  id: string;
  name: string;
  description?: string;
  total_expense?: number;
  balance_for_me?: number;
  member_count?: number;
  members?: GroupMember[];
  member_balances?: MemberBalance[];
  recent_expenses?: Expense[];
  created_at?: string;
};

export default function GroupDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return;
      }
      const res = await fetch(`${API_BASE}/api/groups/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
      });

      if (res.status === 401 || res.status === 400) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        router.replace("/(auth)/LoginScreen");
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch group details");
      }
      const data = await res.json();
      console.log("Group details response:", data);
      setGroup(data?.group || data);
    } catch (e: any) {
      console.log("Group details error =>", e?.message);
      Alert.alert("Error", "Could not load group details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupDetails();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const total = group?.total_expense ?? 0;
  const bal = group?.balance_for_me ?? 0;
  const memberBalances = group?.member_balances || [];
  const recentExpenses = group?.recent_expenses || [];

  // Filter members who owe you or you owe
  const membersWhoOweYou = memberBalances.filter((mb) => mb.owes_you > 0);
  const membersYouOwe = memberBalances.filter((mb) => mb.you_owe > 0);
  const settledMembers = memberBalances.filter(
    (mb) => mb.balance === 0 && mb.user.id !== group?.members?.[0]?.id
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <ScrollView
            style={common.container}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.push("/(tabs)/groups")}
                hitSlop={8}
                style={styles.backBtn}
              >
                <AntDesign name="left" size={20} color="#111827" />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {group?.name || "Group"}
                </Text>
                {group?.description ? (
                  <Text style={styles.headerSubtitle} numberOfLines={2}>
                    {group.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading group details...</Text>
              </View>
            ) : !group ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>Group not found.</Text>
              </View>
            ) : (
              <>
                {/* Balance Summary Card */}
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Your Balance</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      bal > 0 ? styles.balancePositive : styles.balanceNegative,
                    ]}
                  >
                    {bal > 0 ? "+" : ""}₹{Math.abs(bal).toFixed(2)}
                  </Text>
                  <Text style={styles.balanceSubtext}>
                    {bal > 0
                      ? "You are owed"
                      : bal < 0
                        ? "You owe"
                        : "All settled up"}
                  </Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>₹{total.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Spent</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {group.member_count ?? group.members?.length ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Members</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {recentExpenses.length}
                    </Text>
                    <Text style={styles.statLabel}>Expenses</Text>
                  </View>
                </View>

                {/* Members Who Owe You */}
                {membersWhoOweYou.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Members who owe you
                    </Text>
                    <View style={styles.card}>
                      {membersWhoOweYou.map((mb, idx) => (
                        <ListCard
                          key={mb.user.id || mb.user.email || idx}
                          variant="balance"
                          name={mb.user.name || mb.user.email}
                          amount={mb.owes_you}
                          direction="+"
                          onPress={() => {
                            // Could navigate to settle up or member details
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Members You Owe */}
                {membersYouOwe.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>You owe</Text>
                    <View style={styles.card}>
                      {membersYouOwe.map((mb, idx) => (
                        <ListCard
                          key={mb.user.id || mb.user.email || idx}
                          variant="balance"
                          name={mb.user.name || mb.user.email}
                          amount={mb.you_owe}
                          direction="-"
                          onPress={() => {
                            // Could navigate to settle up
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Recent Expenses */}
                {recentExpenses.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recent Expenses</Text>
                      <Pressable
                        onPress={() =>
                          router.push(`/(tabs)/expenses?group=${id}`)
                        }
                      >
                        <Text style={styles.seeAllText}>See all</Text>
                      </Pressable>
                    </View>
                    <View style={styles.card}>
                      {recentExpenses.map((expense, idx) => (
                        <ListCard
                          key={expense.id || idx}
                          variant="expense"
                          name={expense.description}
                          amount={expense.amount}
                          subtitle={`Paid by ${expense.paid_by.name} • ${formatDate(expense.created_at)}`}
                          onPress={() => {
                            // Could navigate to expense details
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* All Members List - Only show settled members */}
                {settledMembers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Members</Text>
                    <View style={styles.card}>
                      {settledMembers.map((member, idx) => (
                        <View
                          key={member.id || member.email || idx}
                          style={[
                            styles.memberRow,
                            idx < settledMembers.length - 1 &&
                              styles.memberRowBorder,
                          ]}
                        >
                          <ProfileAvatar
                            fullName={member.name || member.email}
                            size={40}
                            fontSize={14}
                          />
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>
                              {member.name || member.email}
                            </Text>
                            {member.name ? (
                              <Text style={styles.memberEmail}>
                                {member.email}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={() =>
                      router.push(`/(tabs)/expenses?group=${id}`)
                    }
                  >
                    <AntDesign name="plus" size={18} color="#fff" />
                    <Text style={styles.actionBtnPrimaryText}>
                      Add Expense
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() => {
                      Alert.alert(
                        "Settle Up",
                        "This feature will be available soon!"
                      );
                    }}
                  >
                    <Text style={styles.actionBtnSecondaryText}>
                      Settle Up
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  errorWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  balanceCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  balancePositive: {
    color: colors.green,
  },
  balanceNegative: {
    color: colors.danger,
  },
  balanceSubtext: {
    fontSize: 13,
    color: "#6B7280",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  memberBalance: {
    alignItems: "flex-end",
  },
  memberBalanceText: {
    fontSize: 15,
    fontWeight: "600",
  },
  memberBalancePositive: {
    color: colors.green,
  },
  memberBalanceNegative: {
    color: colors.danger,
  },
  muted: {
    color: "#6B7280",
    fontSize: 14,
    padding: 16,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnSecondary: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionBtnPrimaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  actionBtnSecondaryText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 16,
  },
});
