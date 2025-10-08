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

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://sharefare-be.onrender.com";
const TOKEN_KEY = "sf_token";

const isEmail = (v: string) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v?.trim());

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    console.log("email -> ", email);
    if (!isEmail(email)) e.email = "Enter a valid email";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    return e;
  }, [email, password, confirm]);

  const canSubmit = Object.keys(errors).length === 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) {
      const first = Object.values(errors)[0] || "Fix the errors above";
      Alert.alert("Hold up", first);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { email: email.trim(), password, name } }),
      });
      console.log("sing up api response: ", res);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json().catch(() => ({}));
      let token = data?.token;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <ScrollView contentContainerStyle={[common.container]}>
          <View style={{ padding: 16 }}>
            <Text style={authStyles.brand}>Create account</Text>

            <Text>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Full Name"
              style={[authStyles.input]}
              textContentType="name"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              style={[authStyles.input, !!errors.email && styles.inputError]}
              textContentType="emailAddress"
            />
            {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}

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
                  !!errors.password && styles.inputError,
                ]}
                textContentType="newPassword"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((s) => !s)}
              >
                <Text>{showPassword ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>
            {!!errors.password && (
              <Text style={styles.error}>{errors.password}</Text>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>
              Confirm password
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              style={[authStyles.input, !!errors.confirm && styles.inputError]}
              textContentType="newPassword"
            />
            {!!errors.confirm && (
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
