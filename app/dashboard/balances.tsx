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
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";
import { getCommonStyles } from "../styles/common";
import { API_BASE, authenticatedFetch } from "../utils/auth";

type OutstandingBalance = {
  user: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  amount: number;
  direction: "+" | "-";
  groups?: Array<{
    id: number;
    name: string;
  }>;
};

export default function AllBalancesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const [balances, setBalances] = useState<OutstandingBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const styles = getStyles(colors, isDark);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/dashboard`, {
        method: "GET",
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch balances");
      }

      const data = await res.json();
      setBalances(data?.outstanding_balances || []);
    } catch (e: any) {
      console.error("Error fetching balances:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBalances();
    }, [fetchBalances])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  const MySeparator = () => <View style={{ height: 10 }} />;

  // Safely calculate totals with fallbacks
  const totalOwedToMe = Array.isArray(balances)
    ? balances
        .filter((b) => b && b.direction === "+" && typeof b.amount === "number")
        .reduce((sum, b) => sum + (b.amount || 0), 0)
    : 0;
  const totalIOwe = Array.isArray(balances)
    ? balances
        .filter((b) => b && b.direction === "-" && typeof b.amount === "number")
        .reduce((sum, b) => sum + (b.amount || 0), 0)
    : 0;

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading balances...</Text>
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
            <AntDesign name="left" size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Outstanding Balances</Text>
            <Text style={styles.headerSubtitle}>
              {balances.length} {balances.length === 1 ? "balance" : "balances"}
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
          {/* Summary Cards */}
          {(totalOwedToMe > 0 || totalIOwe > 0) && (
            <View style={styles.summaryContainer}>
              {totalOwedToMe > 0 && (
                <View style={[styles.summaryCard, styles.summaryCardGreen]}>
                  <View style={styles.summaryCardContent}>
                    <Ionicons name="arrow-up" size={24} color={colors.green} />
                    <View style={styles.summaryCardText}>
                      <Text style={styles.summaryLabel}>You are owed</Text>
                      <Text style={styles.summaryAmountGreen}>
                        ₹{totalOwedToMe.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              {totalIOwe > 0 && (
                <View style={[styles.summaryCard, styles.summaryCardRed]}>
                  <View style={styles.summaryCardContent}>
                    <Ionicons name="arrow-down" size={24} color={colors.danger} />
                    <View style={styles.summaryCardText}>
                      <Text style={styles.summaryLabel}>You owe</Text>
                      <Text style={styles.summaryAmountRed}>
                        ₹{totalIOwe.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {balances.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="checkmark-circle" size={64} color={colors.green} />
              </View>
              <Text style={styles.emptyStateTitle}>All settled up!</Text>
              <Text style={styles.emptyStateText}>
                No outstanding balances. Everyone is square.
              </Text>
            </View>
          ) : (
            <FlatList
              data={balances}
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
                      router.push("/(tabs)/groups");
                    }
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

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
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
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  summaryCardGreen: {
    backgroundColor: isDark ? "#1A3A2E" : "#F0FDF4",
    borderColor: isDark ? "#2D5A47" : "#B9F8CF",
  },
  summaryCardRed: {
    backgroundColor: isDark ? "#3A1F1F" : "#FEF2F2",
    borderColor: isDark ? "#5A2D2D" : "#FFC9C9",
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
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryAmountGreen: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.green,
  },
  summaryAmountRed: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.danger,
  },
  emptyState: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

