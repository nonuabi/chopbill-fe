import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Header from "../components/Header";
import { common } from "../styles/common";

const groups = [] as { id: string; name: string }[];

export default function GroupsScreen() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <Header />
        <ScrollView contentContainerStyle={[common.container]}>
          <View style={{ padding: 16 }}>
            <Text style={styles.title}>Groups</Text>
            {groups.length === 0 ? (
              <>
                <Text style={styles.muted}>
                  No groups yet. Create one to split expenses.
                </Text>
                <Pressable
                  style={styles.btn}
                  onPress={() => {
                    // TODO: navigate to create group
                  }}
                >
                  <Text style={styles.btnText}>Create Group</Text>
                </Pressable>
              </>
            ) : (
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <Text>{item.name}</Text>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  muted: { opacity: 0.7, marginBottom: 12 },
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
});
