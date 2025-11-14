import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../styles/colors";
import ProfileAvatar from "./ProfileAvtar";

type ListCardVariant = "balance" | "expense";

interface ListCardProps {
  variant: ListCardVariant;
  name: string;
  amount: number | string;
  /** For `balance` variant, "+" means they owe you, "-" means you owe */
  direction?: "+" | "-";
  /** For `expense` variant, small muted line under the title */
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

const ListCard: React.FC<ListCardProps> = ({
  variant,
  name,
  amount,
  direction,
  subtitle,
  onPress,
  onLongPress,
  disabled,
}) => {
  const isPositive = direction === "+";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      android_ripple={{ color: "#E9ECF1", borderless: false }}
      style={({ pressed }) => [
        styles.cardContainer,
        variant === "expense" && styles.cardExpense,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
      hitSlop={6}
    >
      <View style={styles.leftSection}>
        {variant === "balance" ? (
          <ProfileAvatar fullName={name} />
        ) : (
          <View style={styles.moneyBadge}>
            <Text style={styles.moneyBadgeText}>₹</Text>
          </View>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>{name || "—"}</Text>
          {variant === "expense" && !!subtitle && (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text
          style={[
            styles.amountText,
            variant === "balance" &&
              (isPositive ? styles.amountPositive : styles.amountNegative),
          ]}
        >
          {variant === "balance" && direction ? direction : ""}
          {typeof amount === "number" ? amount.toFixed(2) : amount}
        </Text>
        {variant === "balance" && (
          <Text style={styles.metaText}>
            {isPositive ? "owes you" : "you owe"}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.1,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardExpense: {
    backgroundColor: "#FFFFFF",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  titleBlock: {
    marginLeft: 10,
    flexShrink: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subtitleText: {
    marginTop: 2,
    fontSize: 12,
    color: "#717182",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
  },
  amountPositive: {
    color: colors.green,
  },
  amountNegative: {
    color: colors.danger,
  },
  metaText: {
    fontSize: 12,
    color: "#717182",
  },
  moneyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  moneyBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
});

export default ListCard;
