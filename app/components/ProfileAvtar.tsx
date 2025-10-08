import { StyleSheet, Text, View } from "react-native";

interface ProfileAvatarProps {
  fullName: string;
  size?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
}
const ProfileAvatar = ({
  fullName,
  size = 50,
  fontSize = 14,
  backgroundColor = "#ECECF0",
  textColor = "#0A0A0A",
}: ProfileAvatarProps) => {
  const getInitials = (fullName: string) => {
    if (!fullName) return "??";
    const first = fullName.split(" ")[0];
    const last = fullName.split(" ")[1];
    const firstInitial = first ? first.charAt(0).toUpperCase() : "";
    const lastInitial = last ? last.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  const initials = getInitials(fullName);

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      <Text
        style={[styles.avatarText, { fontSize: fontSize, color: textColor }]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "bold",
  },
});

export default ProfileAvatar;
