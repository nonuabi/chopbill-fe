export const lightColors = {
  primary: "#111827",
  accent: "#2563eb",
  danger: "#E7000B",
  grayLight: "#f2f2f2",
  gray: "#ccc",
  white: "#fff",
  black: "#000",
  green: "#00A63E",
  // Additional theme colors
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  cardBackground: "#FFFFFF",
  shadow: "#000000",
};

export const darkColors = {
  primary: "#F9FAFB",
  accent: "#60A5FA",
  danger: "#F87171",
  grayLight: "#374151",
  gray: "#6B7280",
  white: "#111827",
  black: "#F9FAFB",
  green: "#34D399",
  // Additional theme colors
  background: "#111827",
  surface: "#1F2937",
  text: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textTertiary: "#9CA3AF",
  border: "#374151",
  borderLight: "#4B5563",
  cardBackground: "#1F2937",
  shadow: "#000000",
};

// Legacy export for backward compatibility (will be deprecated)
export const colors = lightColors;

// Theme-aware color getter
export const getColors = (isDark: boolean) => {
  return isDark ? darkColors : lightColors;
};
