import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getColors } from "./styles/colors";
import { getCommonStyles } from "./styles/common";
import { TOKEN_KEY, validateSession } from "./utils/auth";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  // Use light theme as default since ThemeProvider wraps this later
  const colors = getColors(false);
  const common = getCommonStyles(false);
  const styles = getStyles(colors);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        // First check if token exists - if not, redirect immediately
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        if (!isMounted) return;
        
        if (!token) {
          // No token, redirect to login immediately
          router.replace("/(auth)/LoginScreen");
          setChecking(false);
          return;
        }

        // Token exists, validate it with a 2 second timeout
        const isValid = await validateSession(2000);
        
        if (!isMounted) return;
        
        if (isValid) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(auth)/LoginScreen");
        }
      } catch (e) {
        if (isMounted) {
          router.replace("/(auth)/LoginScreen");
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[common.container, common.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.checkingText}>Checking session...</Text>
      </View>
    );
  }

  return null;
}

const getStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  checkingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
});
