import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "../styles/colors";

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

  const getColors = () => {
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
  };

  const colorsConfig = getColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: colorsConfig.bg,
          borderColor: colorsConfig.border,
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
    shadowOpacity: 0.15,
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

