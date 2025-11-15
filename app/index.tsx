import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { common } from "./styles/common";
import { validateSession } from "./utils/auth";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const isValid = await validateSession();
        if (isValid) {
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
  }, [router]);

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
