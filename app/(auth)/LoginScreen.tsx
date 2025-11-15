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
    console.log("login api request: ", login, password);
    console.log("API_BASE: ", API_BASE);
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
      console.log("login api response status: ", res.status);
      console.log("login api response: ", res);
      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || `Login failed (${res.status})`);
      }
      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("Missing token in response");
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      showToast("Welcome back! 🎉", "success", 2000);
      setTimeout(() => router.replace("/home"), 500);
    } catch (e: any) {
      console.error("Login error: ", e);
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
        <ScrollView contentContainerStyle={[common.container]}>
          <Text style={authStyles.brand}>Log in</Text>

          <Text style={styles.label}>Email or Phone Number</Text>
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
              authStyles.input,
              shouldShowError("login") && styles.inputError
            ]}
            textContentType="username"
            placeholderTextColor="#9CA3AF"
          />
          {shouldShowError("login") && <Text style={styles.error}>{errors.login}</Text>}
          {loginType !== "unknown" && login.trim() && (
            <Text style={styles.hint}>
              {loginType === "email" ? "✓ Email" : "✓ Phone number"}
            </Text>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
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
              textContentType="password"
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

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={[styles.cta, !canSubmit && styles.ctaDisabled]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.ctaText}>Log in</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/SignupScreen")}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              New here? Create an account
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginBottom: 6, opacity: 0.8 },
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
  hint: { color: colors.green, marginTop: 4, fontSize: 12 },
});
