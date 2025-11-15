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
  const cleaned = v.replace(/[\s\-\(\)]/g, "");
  return /^\+?[1-9]\d{9,14}$/.test(cleaned);
};

export default function SignupScreen() {
  const router = useRouter();
  const { showToast } = useToast();
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
        e.email = "Enter a valid email";
      }
      if (phoneNumber.trim() && !isPhoneNumber(phoneNumber)) {
        e.phoneNumber = "Enter a valid phone number";
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
      
      if (email.trim()) userData.email = email.trim();
      if (phoneNumber.trim()) {
        // Clean phone number (remove spaces, dashes, etc.)
        userData.phone_number = phoneNumber.replace(/[\s\-\(\)]/g, "");
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
                  color="#9CA3AF" 
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
                  placeholderTextColor="#9CA3AF"
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
                  color="#9CA3AF" 
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
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {shouldShowError("email") && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.error}>{errors.email}</Text>
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
                  color="#9CA3AF" 
                  style={styles.inputIcon}
                />
                <TextInput
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setTouched((prev) => ({ ...prev, phoneNumber: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                  placeholder="+1234567890"
                  style={[
                    styles.input,
                    shouldShowError("phoneNumber") && styles.inputError
                  ]}
                  textContentType="telephoneNumber"
                  placeholderTextColor="#9CA3AF"
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
                  <Ionicons name="information-circle" size={14} color="#6B7280" />
                  <Text style={styles.hint}>
                    Please provide either email or phone number
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
                  placeholder="Create a password"
                  style={[
                    styles.input,
                    styles.flex,
                    shouldShowError("password") && styles.inputError,
                  ]}
                  textContentType="newPassword"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#9CA3AF" 
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
                  placeholderTextColor="#9CA3AF"
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
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.ctaIcon} />
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
  required: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "700",
  },
  optional: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
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
    color: "#6B7280",
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
