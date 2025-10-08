import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { common } from "./styles/common";

const TOKEN_KEY = "sf_token";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        let token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          router.replace("/home");
        } else {
          router.replace("/(auth)/LoginScreen");
        }
      } catch (e) {
        console.log("Auth check failed", e);
        router.replace("/(auth)/LoginScreen");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={[common.container, common.centered]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Checking session...</Text>
      </View>
    );
  }

  return null;
}
