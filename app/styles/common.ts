import { StyleSheet } from "react-native";
import { getColors } from "./colors";

export const getCommonStyles = (isDark: boolean) => {
  const colors = getColors(isDark);
  return StyleSheet.create({
    safeViewContainer: {
      backgroundColor: colors.background,
      flex: 1,
    },
    container: {
      padding: 16,
      zIndex: 1000,
    },
    centered: {
      justifyContent: "center",
      alignItems: "center",
    },
    textCenter: {
      textAlign: "center",
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
    },
  });
};

// Legacy export for backward compatibility
// Note: This uses light theme by default. Components should use getCommonStyles with useTheme hook
export const common = StyleSheet.create({
  safeViewContainer: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  container: {
    padding: 16,
    zIndex: 1000,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  textCenter: {
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E6E8EC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
  },
});
