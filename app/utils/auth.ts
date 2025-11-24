import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const normalizeToken = (raw?: string | null) => {
  const t = (raw ?? "").trim().replace(/^"|"$/g, "");
  return t.toLowerCase().startsWith("bearer ")
    ? t.split(" ").slice(1).join(" ")
    : t;
};

export const buildAuthHeader = (token?: string | null) => {
  if (!token) {
    return "";
  }
  
  // Remove any quotes and trim whitespace
  let cleanToken = token.trim().replace(/^["']|["']$/g, "");
  
  // If it already starts with "Bearer ", remove it (we'll add it back)
  if (cleanToken.toLowerCase().startsWith("bearer ")) {
    cleanToken = cleanToken.substring(7).trim();
  }
  
  return cleanToken ? `Bearer ${cleanToken}` : "";
};

export const TOKEN_KEY = "sf_token";

export const API_BASE = "http://10.0.2.2:3000";
// export const API_BASE = "https://chopbill-be.onrender.com";

/**
 * Checks if a response status indicates an authentication error
 */
export const isAuthError = (status: number): boolean => {
  return status === 401 || status === 400;
};

/**
 * Handles authentication errors by clearing token and redirecting to login
 * Returns true if it was an auth error, false otherwise
 */
export const handleAuthError = async (status: number): Promise<boolean> => {
  if (isAuthError(status)) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      // Use replace to prevent going back to the previous screen
      router.replace("/(auth)/LoginScreen");
      return true;
    } catch (error) {
      console.error("Error clearing token:", error);
      // Still redirect even if clearing token fails
      router.replace("/(auth)/LoginScreen");
      return true;
    }
  }
  return false;
};

/**
 * Validates the current session by checking if the token is still valid
 * Returns true if session is valid, false otherwise
 */
export const validateSession = async (timeoutMs: number = 3000): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      return false;
    }

    const authHeader = buildAuthHeader(token);
    if (!authHeader) {
      return false;
    }

    // Use AbortController for proper fetch cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (isAuthError(res.status)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        return false;
      }

      return res.ok;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Check if it was aborted (timeout)
      if (fetchError.name === 'AbortError') {
        throw new Error("Session validation timeout");
      }
      
      // Re-throw other errors
      throw fetchError;
    }
  } catch (error) {
    // On timeout or network error, assume invalid session
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      // Ignore errors when clearing token
    }
    return false;
  }
};

/**
 * Safely performs a fetch request with automatic auth error handling
 * Returns the response if successful, null if auth error occurred
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | null> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      await handleAuthError(401);
      return null;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(token),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle auth errors automatically
    if (isAuthError(response.status)) {
      await handleAuthError(response.status);
      return null;
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    // Network errors don't necessarily mean auth failure
    throw error;
  }
};

/**
 * Logs out the user by revoking the token on the server and clearing local storage
 */
export const logout = async (): Promise<void> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    
    // Try to revoke token on server, but don't fail if it doesn't work
    if (token) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(token),
          },
        });
      } catch (error) {
        console.error("Logout API error (non-critical):", error);
        // Continue with local logout even if server call fails
      }
    }

    // Always clear local token
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    router.replace("/(auth)/LoginScreen");
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, try to clear token and redirect
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      router.replace("/(auth)/LoginScreen");
    } catch (clearError) {
      console.error("Failed to clear token:", clearError);
    }
  }
};
