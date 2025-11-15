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
import { colors } from "../styles/colors";
import { common } from "../styles/common";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/toast";
import { API_BASE, TOKEN_KEY } from "../utils/auth";

const isEmail = (v: string) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v?.trim());

const isPhoneNumber = (v: string) => {
  // Remove spaces, dashes, and parentheses
  const cleaned = v.replace(/[\s\-\(\)]/g, "");
  // Check if it's a valid phone number (10-15 digits, optionally starting with +)
  return /^\+?[1-9]\d{9,14}$/.test(cleaned);
};

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [login, setLogin] = useState(""); // Can be email or phone
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const loginType = useMemo(() => {
    if (isEmail(login)) return "email";
    if (isPhoneNumber(login)) return "phone";
    return "unknown";
  }, [login]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!login.trim()) {
      e.login = "Enter email or phone number";
    } else if (loginType === "unknown") {
      e.login = "Enter a valid email or phone number";
    }
    if (!password || password.length < 6) e.password = "Min 6 characters";
    return e;
  }, [login, password, loginType]);

  const canSubmit = Object.keys(errors).length === 0 && !loading;

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
      // Send as 'login' field - backend will handle both email and phone
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user: { 
            login: login.trim(), 
            password 
          } 
        }),
      });
      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || `Login failed (${res.status})`);
      }
      const data = await res.json();
      const token = data?.token;
      if (!token) {
        throw new Error("Missing token in response");
      }
      // Ensure token is a string and trim it
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
      showToast("Welcome back! 🎉", "success", 2000);
      setTimeout(() => router.replace("/(tabs)/home"), 500);
    } catch (e: any) {
      showToast(e?.message || "Login failed. Please check your credentials and try again.", "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    if (loginType === "email") return "you@example.com";
    if (loginType === "phone") return "+1234567890";
    return "Email or phone number";
  };

  const getKeyboardType = () => {
    if (loginType === "email") return "email-address";
    if (loginType === "phone") return "phone-pad";
    return "default";
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
                <Ionicons name="receipt" size={32} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue managing your expenses</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email or Phone Number
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name={loginType === "email" ? "mail-outline" : loginType === "phone" ? "call-outline" : "person-outline"} 
                  size={20} 
                  color="#9CA3AF" 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={login}
                  onChangeText={(text) => {
                    setLogin(text);
                    setTouched((prev) => ({ ...prev, login: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, login: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={getKeyboardType()}
                  placeholder={getPlaceholder()}
                  style={[
                    styles.input,
                    shouldShowError("login") && styles.inputError
                  ]}
                  textContentType="username"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {shouldShowError("login") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.login}</Text>
                </View>
              )}
              {loginType !== "unknown" && login.trim() && !shouldShowError("login") && (
                <View style={styles.hintContainer}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                  <Text style={styles.hint}>
                    {loginType === "email" ? "Valid email" : "Valid phone number"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#9CA3AF" 
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
                  placeholder="Enter your password"
                  style={[
                    styles.input,
                    styles.flex,
                    shouldShowError("password") && styles.inputError,
                  ]}
                  textContentType="password"
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((s) => !s)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6B7280" 
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
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Log in</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.ctaIcon} />
                </>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/SignupScreen")}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
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
    color: colors.green,
    fontSize: 13,
    marginLeft: 4,
    fontWeight: "500",
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
    color: "#fff",
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
    color: "#6B7280",
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
