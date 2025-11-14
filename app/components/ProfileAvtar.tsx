import { StyleSheet, View, Text } from "react-native";
import { Image } from "expo-image";
import { API_BASE } from "../utils/auth";

interface ProfileAvatarProps {
  fullName: string;
  size?: number;
  email?: string;
  avatarUrl?: string;
  userId?: number | string;
}

const ProfileAvatar = ({
  fullName,
  size = 50,
  email,
  avatarUrl,
  userId,
}: ProfileAvatarProps) => {
  // Build avatar URL - use provided URL or generate from backend
  const getAvatarUrl = () => {
    if (avatarUrl) {
      // If it's already a full URL, use it; otherwise prepend API_BASE
      if (avatarUrl.startsWith("http")) {
        return avatarUrl;
      }
      return `${API_BASE}${avatarUrl}`;
    }
    
    // Fallback: generate from backend if we have userId
    if (userId) {
      return `${API_BASE}/avatars/${userId}`;
    }
    
    return null;
  };

  const imageUrl = getAvatarUrl();
  const radius = size / 2;

  if (!imageUrl) {
    // Fallback: show a simple colored circle if no URL available
    return (
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: "#6366F1",
          },
        ]}
      >
        <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "700" }}>
          {fullName?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        },
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
        }}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
});

export default ProfileAvatar;
