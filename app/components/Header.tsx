import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";

export default function Header() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = getStyles(colors);

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>ChopBill</Text>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  safeArea: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
    backgroundColor: colors.background,
  },
  header: {
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.white,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 24,
    paddingRight: 24,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
