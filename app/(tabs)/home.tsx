import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ListCard from "../components/ListCard";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";
import { getCommonStyles } from "../styles/common";
import { API_BASE, authenticatedFetch, TOKEN_KEY } from "../utils/auth";

type OutstandingBalance = {
  user: {
    id: number;
    name: string;
    email: string;
  };
  amount: number;
  direction: "+" | "-";
  groups?: Array<{
    id: number;
    name: string;
  }>;
};

type RecentExpense = {
  id: number;
  description: string;
  amount: number;
  paid_by: {
    id: number;
    name: string;
    email: string;
  };
  group: {
    id: number;
    name: string;
  };
  created_at: string;
};

type DashboardData = {
  total_owed_to_me: number;
  total_i_owe: number;
  outstanding_balances: OutstandingBalance[];
  recent_expenses: RecentExpense[];
};

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>("");

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch user info for greeting
      const userRes = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "GET",
      });
      if (userRes?.ok) {
        const userData = await userRes.json();
        setUserName(userData?.data?.name || "");
      }

      const res = await authenticatedFetch(`${API_BASE}/api/dashboard`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch dashboard data");
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (e: any) {
      console.error("Error fetching dashboard:", e);
      setDashboardData({
        total_owed_to_me: 0,
        total_i_owe: 0,
        outstanding_balances: [],
        recent_expenses: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const MySeparator = () => <View style={{ height: 10 }} />;

  const styles = getStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const data = dashboardData || {
    total_owed_to_me: 0,
    total_i_owe: 0,
    outstanding_balances: [],
    recent_expenses: [],
  };

  // Ensure values are numbers (handle undefined/null from API)
  const totalOwedToMe = Number(data.total_owed_to_me) || 0;
  const totalIOwe = Number(data.total_i_owe) || 0;
  const netBalance = totalOwedToMe - totalIOwe;

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
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.welcomeName}>
                {userName ? `${userName.split(" ")[0]}!` : "Welcome!"}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/expenses")}
              style={styles.fabButton}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Net Balance Card */}
          {netBalance !== 0 && (
            <View
              style={[
                styles.netBalanceCard,
                netBalance > 0 ? styles.netBalancePositive : styles.netBalanceNegative,
              ]}
            >
              <View style={styles.netBalanceContent}>
                <Ionicons
                  name={netBalance > 0 ? "trending-up" : "trending-down"}
                  size={24}
                  color={netBalance > 0 ? colors.green : colors.danger}
                />
                <View style={styles.netBalanceText}>
                  <Text style={styles.netBalanceLabel}>
                    {netBalance > 0 ? "Net you'll receive" : "Net you need to pay"}
                  </Text>
                  <Text
                    style={[
                      styles.netBalanceAmount,
                      netBalance > 0
                        ? styles.netBalanceAmountPositive
                        : styles.netBalanceAmountNegative,
                    ]}
                  >
                    ₹{Math.abs(netBalance).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <Pressable
              style={[styles.statCard, styles.owedCard]}
              onPress={() => {
                if (data.outstanding_balances.filter((b) => b.direction === "+").length > 0) {
                  // Scroll to balances or navigate
                }
              }}
            >
              <View style={styles.statCardContent}>
                <View style={[styles.iconCircle, styles.iconCircleGreen]}>
                  <FontAwesome name="arrow-up" size={18} color={colors.green} />
                </View>
                <View style={styles.statCardText}>
                  <Text style={styles.cardTitle}>You will receive</Text>
                  <Text style={styles.owedCardValue}>
                    ₹{totalOwedToMe.toFixed(2)}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable
              style={[styles.statCard, styles.oweCard]}
              onPress={() => {
                if (data.outstanding_balances.filter((b) => b.direction === "-").length > 0) {
                  // Scroll to balances or navigate
                }
              }}
            >
              <View style={styles.statCardContent}>
                <View style={[styles.iconCircle, styles.iconCircleRed]}>
                  <FontAwesome name="arrow-down" size={18} color={colors.danger} />
                </View>
                <View style={styles.statCardText}>
                  <Text style={styles.cardTitle}>You need to pay</Text>
                  <Text style={styles.oweCardValue}>
                    ₹{totalIOwe.toFixed(2)}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/groups")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="people" size={20} color={colors.accent} />
              </View>
              <Text style={styles.quickActionText}>Groups</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/expenses")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="receipt" size={20} color={colors.green} />
              </View>
              <Text style={styles.quickActionText}>Add Expense</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/groups?create=true")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="add-circle" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionText}>New Group</Text>
            </Pressable>
          </View>

          {/* Outstanding Balances */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Outstanding Balances</Text>
              {data.outstanding_balances.length > 0 && (
                <Pressable onPress={() => router.push("/dashboard/balances")}>
                  <Text style={styles.seeAllText}>View all</Text>
                </Pressable>
              )}
            </View>
            {data.outstanding_balances.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.green} />
                </View>
                <Text style={styles.emptyStateTitle}>All settled up!</Text>
                <Text style={styles.emptyStateText}>
                  No outstanding balances. Everyone is square.
                </Text>
              </View>
            ) : (
              <FlatList
                data={data.outstanding_balances.slice(0, 5)}
                keyExtractor={(item) => `${item.user.id}-${item.direction}`}
                ItemSeparatorComponent={MySeparator}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <ListCard
                    variant="balance"
                    name={item.user.name || item.user.email || item.user.phone_number || "User"}
                    amount={item.amount}
                    direction={item.direction}
                    email={item.user.email || item.user.phone_number}
                    avatarUrl={item.user.avatar_url}
                    userId={item.user.id}
                    onPress={() => {
                      // Navigate to the first group where there's a balance with this user
                      if (item.groups && item.groups.length > 0) {
                        router.push(`/(tabs)/groups/${item.groups[0].id}`);
                      } else {
                        // Fallback to groups list if no group info available
                        router.push("/(tabs)/groups");
                      }
                    }}
                  />
                )}
              />
            )}
          </View>

          {/* Recent Expenses */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              {data.recent_expenses.length > 0 && (
                <Pressable onPress={() => router.push("/dashboard/expenses")}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              )}
            </View>
            {data.recent_expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyStateTitle}>No expenses yet</Text>
                <Text style={styles.emptyStateText}>
                  Start tracking your expenses by adding your first one!
                </Text>
                <Pressable
                  style={styles.emptyStateButton}
                  onPress={() => router.push("/(tabs)/expenses")}
                >
                  <Text style={styles.emptyStateButtonText}>Add Expense</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={data.recent_expenses.slice(0, 5)}
                keyExtractor={(item) => String(item.id)}
                ItemSeparatorComponent={MySeparator}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <ListCard
                    variant="expense"
                    name={item.description}
                    amount={item.amount}
                    subtitle={`${item.paid_by.name} • ${item.group.name} • ${formatDate(item.created_at)}`}
                    onPress={() => {
                      router.push(`/(tabs)/groups/${item.group.id}`);
                    }}
                  />
                )}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? colors.accent : colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  netBalanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  netBalancePositive: {
    backgroundColor: isDark ? "#1A3A2E" : "#F0FDF4",
    borderWidth: 1,
    borderColor: isDark ? "#2D5A47" : "#B9F8CF",
  },
  netBalanceNegative: {
    backgroundColor: isDark ? "#3A1F1F" : "#FEF2F2",
    borderWidth: 1,
    borderColor: isDark ? "#5A2D2D" : "#FFC9C9",
  },
  netBalanceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  netBalanceText: {
    marginLeft: 12,
  },
  netBalanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  netBalanceAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  netBalanceAmountPositive: {
    color: colors.green,
  },
  netBalanceAmountNegative: {
    color: colors.danger,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconCircleGreen: {
    backgroundColor: isDark ? "#1A3A2E" : "#D1FAE5",
  },
  iconCircleRed: {
    backgroundColor: isDark ? "#3A1F1F" : "#FEE2E2",
  },
  statCardText: {
    flex: 1,
  },
  owedCard: {
    backgroundColor: isDark ? "#1A3A2E" : "#F0FDF4",
    borderWidth: 1,
    borderColor: isDark ? "#2D5A47" : "#B9F8CF",
  },
  oweCard: {
    backgroundColor: isDark ? "#3A1F1F" : "#FEF2F2",
    borderWidth: 1,
    borderColor: isDark ? "#5A2D2D" : "#FFC9C9",
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  owedCardValue: {
    color: colors.green,
    fontSize: 20,
    fontWeight: "700",
  },
  oweCardValue: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
});
