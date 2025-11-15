import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../styles/colors";
import { common } from "../styles/common";
import { authStyles } from "./styles";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/toast";

const API_BASE = "http://10.0.2.2:3000";
const TOKEN_KEY = "sf_token";

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
        <ScrollView contentContainerStyle={[common.container]}>
          <View>
            <Text style={authStyles.brand}>Create account</Text>

            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                setTouched((prev) => ({ ...prev, name: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Your name"
              style={[
                authStyles.input,
                shouldShowError("name") && styles.inputError
              ]}
              textContentType="name"
              placeholderTextColor="#9CA3AF"
            />
            {shouldShowError("name") && <Text style={styles.error}>{errors.name}</Text>}

            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
              <Text style={styles.optional}> (or phone)</Text>
            </Text>
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
                authStyles.input,
                shouldShowError("email") && styles.inputError
              ]}
              textContentType="emailAddress"
              placeholderTextColor="#9CA3AF"
            />
            {shouldShowError("email") && <Text style={styles.error}>{errors.email}</Text>}

            <Text style={[styles.label, { marginTop: 12 }]}>
              Phone Number <Text style={styles.required}>*</Text>
              <Text style={styles.optional}> (or email)</Text>
            </Text>
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
                authStyles.input,
                shouldShowError("phoneNumber") && styles.inputError
              ]}
              textContentType="telephoneNumber"
              placeholderTextColor="#9CA3AF"
            />
            {shouldShowError("phoneNumber") && <Text style={styles.error}>{errors.phoneNumber}</Text>}
            {shouldShowError("contact") && <Text style={styles.error}>{errors.contact}</Text>}
            {(!email.trim() && !phoneNumber.trim()) && (
              <Text style={styles.hint}>
                * Please provide either email or phone number
              </Text>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.row}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setTouched((prev) => ({ ...prev, password: true }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                style={[
                  authStyles.input,
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
                <Text>{showPassword ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>
            {shouldShowError("password") && (
              <Text style={styles.error}>{errors.password}</Text>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>
              Confirm password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                setTouched((prev) => ({ ...prev, confirm: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              style={[
                authStyles.input,
                shouldShowError("confirm") && styles.inputError
              ]}
              textContentType="newPassword"
              placeholderTextColor="#9CA3AF"
            />
            {shouldShowError("confirm") && (
              <Text style={styles.error}>{errors.confirm}</Text>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.ctaText}>Create account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/LoginScreen")}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                Already have an account? Log in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginBottom: 6, opacity: 0.8 },
  optional: { fontSize: 12, opacity: 0.6, fontWeight: "normal" },
  required: { fontSize: 14, color: colors.danger, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  eyeBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: colors.danger, borderWidth: 1, borderRadius: 10 },
  cta: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondary: { marginTop: 12, alignItems: "center" },
  secondaryText: { textDecorationLine: "underline", opacity: 0.8 },
  error: { color: colors.danger, marginTop: 4, fontSize: 13, marginBottom: 2 },
  hint: { color: "#6B7280", marginTop: 4, fontSize: 12, fontStyle: "italic" },
});
