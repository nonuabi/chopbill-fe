import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const common = StyleSheet.create({
  safeViewContainer: {
    backgroundColor: colors.white,
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
