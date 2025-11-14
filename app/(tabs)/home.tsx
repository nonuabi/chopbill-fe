import FontAwesome from "@expo/vector-icons/FontAwesome";
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
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ListCard from "../components/ListCard";
import { colors } from "../styles/colors";
import { common } from "../styles/common";
import { API_BASE, buildAuthHeader, TOKEN_KEY } from "../utils/auth";

type OutstandingBalance = {
  user: {
    id: number;
    name: string;
    email: string;
  };
  amount: number;
  direction: "+" | "-";
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return;
      }

      const res = await fetch(`${API_BASE}/api/dashboard`, {
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
  }, [router]);

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

  const MySeparator = () => <View style={{ height: 10 }} />;

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <ScrollView
          contentContainerStyle={[common.container]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.owedCard}>
              <View style={styles.iconContainer}>
                <FontAwesome
                  name="angle-double-up"
                  size={24}
                  color={colors.green}
                />
              </View>
              <View>
                <Text style={styles.cardTitle}>You are owed</Text>
                <Text style={styles.owedCardValue}>
                  ₹{data.total_owed_to_me.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.oweCard}>
              <View style={styles.iconContainer}>
                <FontAwesome
                  name="angle-double-down"
                  size={24}
                  color={colors.danger}
                />
              </View>
              <View>
                <Text style={styles.cardTitle}>You owe</Text>
                <Text style={styles.oweCardValue}>
                  ₹{data.total_i_owe.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Outstanding Balances */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Balances</Text>
            {data.outstanding_balances.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  All settled up! No outstanding balances.
                </Text>
              </View>
            ) : (
              <FlatList
                data={data.outstanding_balances}
                keyExtractor={(item) => `${item.user.id}-${item.direction}`}
                ItemSeparatorComponent={MySeparator}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <ListCard
                    variant="balance"
                    name={item.user.name || item.user.email}
                    amount={item.amount}
                    direction={item.direction}
                    onPress={() => {
                      // Could navigate to group or user detail
                    }}
                  />
                )}
              />
            )}
          </View>

          {/* Recent Expenses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {data.recent_expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No expenses yet. Add your first expense!
                </Text>
              </View>
            ) : (
              <FlatList
                data={data.recent_expenses}
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
                      // Could navigate to expense detail or group
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  owedCard: {
    borderWidth: 1,
    borderColor: "#b9f8cf",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#F0FDF4",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  oweCard: {
    borderWidth: 1,
    borderColor: "#ffc9c9",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#FEF2F2",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 12,
  },
  cardTitle: {
    color: "#717182",
    fontSize: 14,
    marginBottom: 4,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyStateText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
