import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

export default function Toast({
  message,
  type = "info",
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "check-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "alert-triangle";
      default:
        return "info";
    }
  };

  const getToastColors = () => {
    if (isDark) {
      switch (type) {
        case "success":
          return {
            bg: "#1A3A2E",
            border: "#2D5A47",
            icon: colors.green,
            text: colors.green,
          };
        case "error":
          return {
            bg: "#3A1F1F",
            border: "#5A2D2D",
            icon: colors.danger,
            text: colors.danger,
          };
        case "warning":
          return {
            bg: "#3A2F1A",
            border: "#5A4A2D",
            icon: "#FBBF24",
            text: "#FBBF24",
          };
        default:
          return {
            bg: "#1E3A5F",
            border: "#2D4A7F",
            icon: colors.accent,
            text: colors.accent,
          };
      }
    } else {
      switch (type) {
        case "success":
          return {
            bg: "#F0FDF4",
            border: "#B9F8CF",
            icon: colors.green,
            text: "#166534",
          };
        case "error":
          return {
            bg: "#FEF2F2",
            border: "#FECACA",
            icon: colors.danger,
            text: "#991B1B",
          };
        case "warning":
          return {
            bg: "#FFFBEB",
            border: "#FDE68A",
            icon: "#D97706",
            text: "#92400E",
          };
        default:
          return {
            bg: "#EFF6FF",
            border: "#BFDBFE",
            icon: colors.primary,
            text: "#1E40AF",
          };
      }
    }
  };

  const colorsConfig = getToastColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: colorsConfig.bg,
          borderColor: colorsConfig.border,
          shadowOpacity: isDark ? 0.3 : 0.15,
        },
      ]}
    >
      <Feather name={getIcon()} size={20} color={colorsConfig.icon} />
      <Text style={[styles.message, { color: colorsConfig.text }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});

