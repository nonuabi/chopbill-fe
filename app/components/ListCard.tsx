import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";
import ProfileAvatar from "./ProfileAvtar";

// Format amount to handle large numbers better
// Only abbreviate when necessary to prevent layout issues
const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  
  // For very large amounts (>= 1 Crore), use abbreviated format
  if (absAmount >= 10000000) {
    // 1 Crore or more: show in Crores
    const crores = amount / 10000000;
    return crores.toFixed(crores >= 100 ? 0 : 1) + "Cr";
  } else if (absAmount >= 100000) {
    // 1 Lakh or more: show in Lakhs
    const lakhs = amount / 100000;
    return lakhs.toFixed(lakhs >= 100 ? 0 : 1) + "L";
  }
  
  // For amounts less than 1 Lakh, show full amount with proper formatting
  // Add comma separators for thousands
  const formatted = absAmount.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = amount < 0 ? '-' : '';
  return sign + parts.join('.');
};

type ListCardVariant = "balance" | "expense";

interface ListCardProps {
  variant: ListCardVariant;
  name: string;
  amount: number | string;
  /** For `balance` variant, "+" means they will pay you, "-" means you need to pay */
  direction?: "+" | "-";
  /** For `expense` variant, small muted line under the title */
  subtitle?: string;
  /** Optional email for better avatar color generation */
  email?: string;
  /** Avatar URL from backend */
  avatarUrl?: string;
  /** User ID for avatar generation */
  userId?: number | string;
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
  email,
  avatarUrl,
  userId,
  onPress,
  onLongPress,
  disabled,
}) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const isPositive = direction === "+";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      android_ripple={{ color: isDark ? colors.borderLight : "#E9ECF1", borderless: false }}
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
          <ProfileAvatar 
            fullName={name} 
            email={email} 
            avatarUrl={avatarUrl}
            userId={userId}
          />
        ) : (
          <View style={styles.moneyBadge}>
            <Text style={styles.moneyBadgeText}>₹</Text>
          </View>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
            {name || "—"}
          </Text>
          {variant === "expense" && !!subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1} ellipsizeMode="tail">
              {subtitle}
            </Text>
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
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
        >
          {variant === "balance" && direction ? direction : ""}
          {typeof amount === "number" ? formatAmount(amount) : amount}
        </Text>
        {variant === "balance" && (
          <Text style={styles.metaText} numberOfLines={1}>
            {isPositive ? "will pay you" : "you need to pay"}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const getStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.cardBackground,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1,
    minWidth: 0, // Important for text truncation
    marginRight: 12,
  },
  titleBlock: {
    marginLeft: 10,
    flex: 1,
    flexShrink: 1,
    minWidth: 0, // Important for text truncation
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  subtitleText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rightSection: {
    alignItems: "flex-end",
    flexShrink: 0,
    minWidth: 80, // Ensure minimum width for amount
    maxWidth: "40%", // Prevent taking too much space
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  amountPositive: {
    color: colors.green,
  },
  amountNegative: {
    color: colors.danger,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  moneyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.borderLight,
  },
  moneyBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
});

export default ListCard;
