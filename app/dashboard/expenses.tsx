import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { API_BASE, authenticatedFetch } from "../utils/auth";

type RecentExpense = {
  id: number;
  description: string;
  amount: number;
  paid_by: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
    avatar_url?: string;
  };
  group: {
    id: number;
    name: string;
  };
  created_at: string;
};

export default function AllExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<RecentExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/dashboard`, {
        method: "GET",
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch expenses");
      }

      const data = await res.json();
      setExpenses(data?.recent_expenses || []);
    } catch (e: any) {
      console.error("Error fetching expenses:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [fetchExpenses])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const MySeparator = () => <View style={{ height: 10 }} />;

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
          >
            <AntDesign name="left" size={20} color="#111827" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>All Expenses</Text>
            <Text style={styles.headerSubtitle}>
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={common.container}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Summary Card */}
          {expenses.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardContent}>
                <Ionicons name="receipt" size={24} color={colors.primary} />
                <View style={styles.summaryCardText}>
                  <Text style={styles.summaryLabel}>Total Amount</Text>
                  <Text style={styles.summaryAmount}>
                    ₹{totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
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
              data={expenses}
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
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 4,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCardText: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyState: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#6B7280",
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
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

