import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
export default function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>ShareFare</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
    backgroundColor: "#ffffff",
  },
  header: {
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#030213",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 24,
    paddingRight: 24,
  },
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
