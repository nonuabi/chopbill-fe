import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";
import { getCommonStyles } from "../styles/common";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/toast";
import { API_BASE, buildAuthHeader } from "../utils/auth";

interface EmailVerificationScreenProps {
  email: string;
  token: string;
  onVerified: () => void;
  onSkip?: () => void;
}

const CODE_LENGTH = 6;

export default function EmailVerificationScreen({
  email,
  token,
  onVerified,
  onSkip,
}: EmailVerificationScreenProps) {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const { showToast } = useToast();
  const styles = getStyles(colors, isDark);

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");
    
    if (codeToVerify.length !== CODE_LENGTH) {
      showToast("Please enter the complete 6-digit code", "warning");
      // Haptic feedback for error
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        // Haptics not available, ignore
      }
      return;
    }

    // Haptic feedback on button press
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics not available, ignore
    }
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/email_verifications/verify_code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
        body: JSON.stringify({
          code: codeToVerify,
          email: email,
        }),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response);
        throw new Error(errorMsg || "Invalid verification code. Please try again.");
      }

      // Success haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available, ignore
      }
      showToast("Email verified successfully! 🎉", "success");
      setTimeout(() => {
        onVerified();
      }, 500);
    } catch (error: any) {
      // Error haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {
        // Haptics not available, ignore
      }
      showToast(error?.message || "Verification failed. Please try again.", "error");
      // Clear code on error
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    try {
      const response = await fetch(`${API_BASE}/api/email_verifications/send_code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response);
        throw new Error(errorMsg || "Failed to resend code. Please try again.");
      }

      showToast("Verification code sent! Check your email.", "success");
      setCountdown(60); // 60 second countdown
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      showToast(error?.message || "Failed to resend code. Please try again.", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={48} color={colors.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to
        </Text>
        <Text style={styles.email}>{email}</Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
                loading && styles.codeInputDisabled,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error/Info Message */}
        {loading ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.message}>Verifying your code...</Text>
          </View>
        ) : code.join("").length !== CODE_LENGTH && code.join("").length > 0 ? (
          <View style={styles.messageContainer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.message}>
              Enter all {CODE_LENGTH} digits to verify
            </Text>
          </View>
        ) : null}

        {/* Verify Button */}
        <Pressable
          onPress={() => handleVerify()}
          disabled={loading || code.join("").length !== CODE_LENGTH}
          style={({ pressed }) => [
            styles.verifyButton,
            (loading || code.join("").length !== CODE_LENGTH) &&
              styles.verifyButtonDisabled,
            pressed && !loading && code.join("").length === CODE_LENGTH && styles.verifyButtonPressed,
          ]}
        >
          {loading ? (
            <View style={styles.verifyButtonContent}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={[styles.verifyButtonText, { marginLeft: 12 }]}>
                Verifying...
              </Text>
            </View>
          ) : (
            <View style={styles.verifyButtonContent}>
              <Text style={[
                styles.verifyButtonText,
                (code.join("").length !== CODE_LENGTH) && styles.verifyButtonTextDisabled
              ]}>
                Verify Email
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={(code.join("").length !== CODE_LENGTH) ? colors.textSecondary : colors.white}
                style={styles.verifyButtonIcon}
              />
            </View>
          )}
        </Pressable>

        {/* Resend Code */}
        <Pressable
          onPress={handleResend}
          disabled={resending || countdown > 0 || loading}
          style={({ pressed }) => [
            styles.resendButton,
            (resending || countdown > 0 || loading) && styles.resendButtonDisabled,
            pressed && !resending && countdown === 0 && !loading && styles.resendButtonPressed,
          ]}
        >
          {resending ? (
            <View style={styles.resendButtonContent}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.resendText, { marginLeft: 8 }]}>Sending...</Text>
            </View>
          ) : (
            <Text style={styles.resendText}>
              {countdown > 0
                ? `Resend code in ${countdown}s`
                : "Resend verification code"}
            </Text>
          )}
        </Pressable>

        {/* Skip Option */}
        {onSkip && (
          <Pressable onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const getStyles = (
  colors: ReturnType<typeof getColors>,
  isDark: boolean
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
    },
    iconContainer: {
      alignItems: "center",
      marginBottom: 32,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.borderLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    email: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      textAlign: "center",
      marginBottom: 32,
    },
    codeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    codeInput: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "600",
      color: colors.text,
    },
    codeInputFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.borderLight,
    },
    codeInputDisabled: {
      opacity: 0.5,
    },
    messageContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    message: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.textSecondary,
    },
    resendButton: {
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 8,
      minHeight: 44,
    },
    resendButtonDisabled: {
      opacity: 0.4,
    },
    resendButtonPressed: {
      opacity: 0.7,
    },
    resendButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    resendText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
    verifyButton: {
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      minHeight: 56,
    },
    verifyButtonDisabled: {
      backgroundColor: isDark ? colors.border : colors.textTertiary,
      opacity: 0.8,
    },
    verifyButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    verifyButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    verifyButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 0.3,
    },
    verifyButtonTextDisabled: {
      color: colors.textSecondary,
    },
    verifyButtonIcon: {
      marginLeft: 8,
    },
    skipButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    skipText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

