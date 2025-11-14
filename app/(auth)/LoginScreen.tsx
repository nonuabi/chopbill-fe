import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const API_BASE = "http://10.0.2.2:3000";
const TOKEN_KEY = "sf_token";

const isEmail = (v: string) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v?.trim());

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!isEmail(email)) e.email = "Enter a valid email";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    return e;
  }, [email, password]);

  const canSubmit = Object.keys(errors).length === 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) {
      const first = Object.values(errors)[0] || "Fix the errors above";
      Alert.alert("Hold up", first);
      return;
    }

    setLoading(true);
    console.log("login api request: ", email, password);
    console.log("API_BASE: ", API_BASE);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { email: email.trim(), password } }),
      });
      console.log("login api response status: ", res.status);
      console.log("login api response: ", res);
      if (!res.ok) {
        const errorText = await res.text();
        console.log("Error response: ", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("Missing token in response");
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      router.replace("/home");
    } catch (e: any) {
      console.error("Login error: ", e);
      Alert.alert("Login failed", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <ScrollView contentContainerStyle={[common.container]}>
          <Text style={authStyles.brand}>Log in</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            style={[
              authStyles.input,
              //  !!errors.email && styles.inputError
            ]}
            textContentType="emailAddress"
            placeholderTextColor="#9CA3AF"
          />
          {/* {!!errors.email && <Text style={styles.error}>{errors.email}</Text>} */}

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <View style={styles.row}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              style={[
                authStyles.input,
                styles.flex,
                // !!errors.password && styles.inputError,
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
          {/* {!!errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )} */}

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
});
