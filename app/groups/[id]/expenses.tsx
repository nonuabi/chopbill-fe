import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import ListCard from "../../components/ListCard";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../styles/colors";
import { getCommonStyles } from "../../styles/common";
import { API_BASE, authenticatedFetch } from "../../utils/auth";
import { useToast } from "../../contexts/ToastContext";
import { extractErrorMessage } from "../../utils/toast";

type Expense = {
  id: number;
  description: string;
  amount: number;
  paid_by: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  created_at: string;
  notes?: string;
  split_count: number;
};

export default function GroupExpensesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupName, setGroupName] = useState<string>("");
  const styles = getStyles(colors, isDark);

  const fetchExpenses = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/groups/${id}`, {
        method: "GET",
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to fetch expenses");
      }

      const data = await res.json();
      const groupData = data?.group || data;
      
      // Get all expenses from recent_expenses (which should include all expenses)
      // The backend returns recent_expenses which includes all expenses
      const allExpenses = groupData?.recent_expenses || [];
      
      setExpenses(allExpenses);
      setGroupName(groupData?.name || "Group");
    } catch (e: any) {
      console.log("Error fetching expenses =>", e?.message);
      showToast("Could not load expenses. Pull down to refresh.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <View style={styles.loadingWrap}>
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
              onPress={() => router.push(`/(tabs)/groups/${id}`)}
              hitSlop={8}
              style={styles.backBtn}
            >
              <AntDesign name="left" size={20} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                All Expenses
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {groupName}
              </Text>
            </View>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySubtitle}>
                Start tracking expenses for this group
              </Text>
              <Pressable
                style={styles.addExpenseBtn}
                onPress={() =>
                  router.push(`/(tabs)/expenses?group=${id}`)
                }
              >
                <AntDesign name="plus" size={18} color={colors.white} />
                <Text style={styles.addExpenseBtnText}>Add Expense</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Summary Card */}
              <View style={styles.headerInfo}>
                <Text style={styles.totalExpenses}>
                  {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
                </Text>
                <Text style={styles.totalAmount}>
                  Total: {formatCurrency(
                    expenses.reduce((sum, exp) => sum + exp.amount, 0)
                  )}
                </Text>
              </View>

              {/* Expenses List */}
              <View style={styles.cardsContainer}>
                {expenses.map((item, idx) => (
                  <View 
                    key={item.id}
                    style={[
                      styles.cardWrapper,
                      idx < expenses.length - 1 && styles.cardWrapperSpacing
                    ]}
                  >
                    <ListCard
                      variant="expense"
                      name={item.description}
                      amount={item.amount}
                      subtitle={`Paid by ${item.paid_by.name} • ${formatDate(item.created_at)}`}
                      onPress={() => {
                        // Could navigate to expense details in the future
                      }}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
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
    backgroundColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingWrap: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  addExpenseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addExpenseBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  headerInfo: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalExpenses: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardsContainer: {
    // Container for cards with spacing
  },
  cardWrapper: {
    // Wrapper for individual cards
  },
  cardWrapperSpacing: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 16,
  },
});

