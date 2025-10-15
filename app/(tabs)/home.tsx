import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ListCard from "../components/ListCard";
import { colors } from "../styles/colors";
import { common } from "../styles/common";

export default function HomeScreen() {
  const outstandingList: {
    id: string;
    avtar: string;
    name: string;
    amount: number;
    amountDirection: string;
  }[] = [];

  const recentExpenses: {
    id: string;
    name: string;
    groupName: string;
    amount: number;
  }[] = [];

  const MySeparator = () => <View style={{ height: 10 }} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        {/* <Header /> */}
        <ScrollView contentContainerStyle={[common.container]}>
          <View style={styles.statsContainer}>
            <View style={styles.owedCard}>
              <View
                style={{
                  marginRight: 10,
                }}
              >
                <FontAwesome
                  name="angle-double-up"
                  size={24}
                  color={colors.green}
                />
              </View>
              <View>
                <Text style={styles.cardTitle}>You are owed</Text>
                <Text style={styles.OwedCardValue}>₹780</Text>
              </View>
            </View>
            <View style={styles.OweCard}>
              <View
                style={{
                  marginRight: 10,
                }}
              >
                <FontAwesome
                  name="angle-double-down"
                  size={24}
                  color={colors.danger}
                />
              </View>
              <View>
                <Text style={styles.cardTitle}>You owe</Text>
                <Text style={styles.OweCardValue}>₹230</Text>
              </View>
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Outstanding Balances
            </Text>

            <FlatList
              data={outstandingList}
              keyExtractor={(i) => i.id}
              ItemSeparatorComponent={MySeparator}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <ListCard
                  variant="balance"
                  name={item.name}
                  amount={item.amount}
                  direction={item.amountDirection as "+" | "-"}
                  onPress={() => {}}
                />
              )}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Recent Expenses
            </Text>
            <FlatList
              data={recentExpenses}
              ItemSeparatorComponent={MySeparator}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <ListCard
                  variant="expense"
                  name={item.name}
                  amount={item.amount}
                  subtitle={item.groupName}
                  onPress={() => {}}
                />
              )}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  owedCard: {
    borderWidth: 1,
    borderColor: "#b9f8cf",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#F0FDF4",
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
  },
  OweCard: {
    borderWidth: 1,
    borderColor: "#ffc9c9",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#FEF2F2",
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: "sans-serif",
    color: "#717182",
    fontSize: 14,
  },
  OwedCardValue: {
    color: colors.green,
    fontSize: 16,
  },
  OweCardValue: {
    color: colors.danger,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E8EC",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  primaryButton: {
    borderColor: "#b9f8cf",
    backgroundColor: "#F0FDF4",
  },
  secondaryButton: {
    borderColor: "#ffc9c9",
    backgroundColor: "#FEF2F2",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    marginTop: -2,
  },
});
