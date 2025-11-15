import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";
import { getCommonStyles } from "../styles/common";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/toast";
import { API_BASE, TOKEN_KEY } from "../utils/auth";

// Enhanced email validation
const isEmail = (v: string) => {
  if (!v || !v.trim()) return false;
  const trimmed = v.trim();
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  // Check basic structure
  if (!emailRegex.test(trimmed)) return false;
  // Check for common invalid patterns
  if (trimmed.includes("..")) return false;
  if (trimmed.startsWith(".") || trimmed.startsWith("@")) return false;
  if (trimmed.includes("@.") || trimmed.includes(".@")) return false;
  // Check domain has at least one dot after @
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  if (!parts[1].includes(".")) return false;
  return true;
};

// Enhanced phone number validation (supports Indian and international formats)
const isPhoneNumber = (v: string) => {
  if (!v || !v.trim()) return false;
  // Remove all non-digit characters except +
  const cleaned = v.replace(/[\s\-\(\)\.]/g, "");
  
  // Check if it starts with + (international format)
  if (cleaned.startsWith("+")) {
    // International: + followed by 10-15 digits
    const digits = cleaned.substring(1);
    if (!/^\d{10,15}$/.test(digits)) return false;
    // Must start with a country code (1-9)
    if (!/^[1-9]/.test(digits)) return false;
    return true;
  }
  
  // Indian format: 10 digits, optionally starting with 0
  // Allow formats: 9876543210, 09876543210, +919876543210
  if (/^0\d{10}$/.test(cleaned)) {
    // Starts with 0 followed by 10 digits (11 total)
    return true;
  }
  
  // Standard 10-digit Indian number
  if (/^\d{10}$/.test(cleaned)) {
    // Must start with 6-9 (valid Indian mobile prefixes)
    return /^[6-9]/.test(cleaned);
  }
  
  return false;
};

export default function SignupScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const styles = getStyles(colors, isDark);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    
    // Name is mandatory
    if (!name.trim()) {
      e.name = "Full name is required";
    }
    
    // At least one of email or phone must be provided (MANDATORY)
    if (!email.trim() && !phoneNumber.trim()) {
      e.contact = "Email or phone number is required";
    } else {
      if (email.trim() && !isEmail(email)) {
        e.email = "Please enter a valid email address (e.g., user@example.com)";
      }
      if (phoneNumber.trim() && !isPhoneNumber(phoneNumber)) {
        e.phoneNumber = "Please enter a valid 10-digit phone number (e.g., 9876543210)";
      }
    }
    
    // Password is mandatory
    if (!password || password.length < 6) e.password = "Password is required (min 6 characters)";
    if (password !== confirm) e.confirm = "Passwords do not match";
    return e;
  }, [name, email, phoneNumber, password, confirm]);

  const canSubmit = Object.keys(errors).length === 0 && !loading && name.trim() && (email.trim() || phoneNumber.trim());

  const shouldShowError = (field: string) => {
    return (touched[field] || submitAttempted) && !!errors[field];
  };

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit) {
      const first = Object.values(errors)[0] || "Please fix the errors above";
      showToast(first, "warning");
      return;
    }

    setLoading(true);
    try {
      const userData: any = { 
        password, 
        name: name.trim()
      };
      
      if (email.trim()) {
        userData.email = email.trim().toLowerCase();
      }
      if (phoneNumber.trim()) {
        // Clean phone number (remove spaces, dashes, parentheses, dots)
        // Keep + for international numbers
        let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");
        // If it's an Indian number starting with 0, remove the leading 0
        if (cleaned.startsWith("0") && cleaned.length === 11) {
          cleaned = cleaned.substring(1);
        }
        userData.phone_number = cleaned;
      }

      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userData }),
      });
      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Sign up failed. Please try again.");
      }
      const data = await res.json().catch((err) => {
        throw new Error("Failed to parse server response. Please try again.");
      });
      const token = data?.token;
      if (!token) {
        throw new Error("Missing token in response. Please try again.");
      }
      // Ensure token is a string
      const tokenString = String(token).trim();
      if (!tokenString) {
        throw new Error("Invalid token format. Please try again.");
      }
      await SecureStore.setItemAsync(TOKEN_KEY, tokenString);
      // Verify token was stored correctly
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken !== tokenString) {
        throw new Error("Failed to store authentication token. Please try again.");
      }
      showToast("Account created successfully! 🎉", "success", 2000);
      setTimeout(() => router.replace("/(tabs)/home"), 500);
    } catch (e: any) {
      showToast(e?.message || "Sign up failed. Please check your information and try again.", "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={[common.container, styles.scrollContent]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="person-add" size={32} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join ChopBill to start splitting expenses</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={colors.textTertiary} 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setTouched((prev) => ({ ...prev, name: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Your full name"
                  style={[
                    styles.input,
                    shouldShowError("name") && styles.inputError
                  ]}
                  textContentType="name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {shouldShowError("name") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.name}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.optional}> (or phone)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={colors.textTertiary} 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setTouched((prev) => ({ ...prev, email: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  style={[
                    styles.input,
                    shouldShowError("email") && styles.inputError
                  ]}
                  textContentType="emailAddress"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {shouldShowError("email") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.email}</Text>
                </View>
              )}
              {email.trim() && !shouldShowError("email") && isEmail(email) && (
                <View style={styles.hintContainer}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={[styles.hint, { color: colors.green }]}>
                    Valid email address
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.optional}> (or email)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="call-outline" 
                  size={20} 
                  color={colors.textTertiary} 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={phoneNumber}
                  onChangeText={(text) => {
                    // Allow only digits, +, spaces, dashes, and parentheses
                    const cleaned = text.replace(/[^\d\+\s\-\(\)]/g, "");
                    setPhoneNumber(cleaned);
                    setTouched((prev) => ({ ...prev, phoneNumber: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                  placeholder="9876543210 or +919876543210"
                  maxLength={15}
                  style={[
                    styles.input,
                    shouldShowError("phoneNumber") && styles.inputError
                  ]}
                  textContentType="telephoneNumber"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {shouldShowError("phoneNumber") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.phoneNumber}</Text>
                </View>
              )}
              {shouldShowError("contact") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.contact}</Text>
                </View>
              )}
              {(!email.trim() && !phoneNumber.trim()) && !shouldShowError("contact") && (
                <View style={styles.hintContainer}>
                  <Ionicons name="information-circle" size={14} color={colors.textSecondary} />
                  <Text style={styles.hint}>
                    Please provide either email or phone number (10-digit Indian number or international format)
                  </Text>
                </View>
              )}
              {phoneNumber.trim() && !shouldShowError("phoneNumber") && isPhoneNumber(phoneNumber) && (
                <View style={styles.hintContainer}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={[styles.hint, { color: colors.green }]}>
                    Valid phone number
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={colors.textTertiary} 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setTouched((prev) => ({ ...prev, password: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  secureTextEntry={!showPassword}
                  placeholder="Create a password"
                  style={[
                    styles.input,
                    styles.flex,
                    shouldShowError("password") && styles.inputError,
                  ]}
                  textContentType="newPassword"
                  placeholderTextColor={colors.textTertiary}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((s) => !s)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </Pressable>
              </View>
              {shouldShowError("password") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.password}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={colors.textTertiary} 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={confirm}
                  onChangeText={(text) => {
                    setConfirm(text);
                    setTouched((prev) => ({ ...prev, confirm: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                  secureTextEntry={!showPassword}
                  placeholder="Confirm your password"
                  style={[
                    styles.input,
                    shouldShowError("confirm") && styles.inputError
                  ]}
                  textContentType="newPassword"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              {shouldShowError("confirm") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.confirm}</Text>
                </View>
              )}
              {!shouldShowError("confirm") && password && confirm && password === confirm && (
                <View style={styles.hintContainer}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={styles.hint}>Passwords match</Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.cta, 
                !canSubmit && styles.ctaDisabled,
                pressed && styles.ctaPressed
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} style={styles.ctaIcon} />
                </>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/LoginScreen")}>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) => StyleSheet.create({
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "700",
  },
  optional: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "400",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
  },
  flex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 4,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: 4,
    fontWeight: "400",
  },
  cta: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    flexDirection: "row",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  ctaIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
