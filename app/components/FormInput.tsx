import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { getColors } from "../styles/colors";

interface FormInputProps {
  lable: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?:
    | "default"
    | "numeric"
    | "email-address"
    | "phone-pad"
    | "number-pad";
  secureTextEntry?: boolean;
}
const FormInput = ({
  lable,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: FormInputProps) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const styles = getStyles(colors);

  return (
    <View style={{ width: "100%", marginBottom: 16 }}>
      <Text style={styles.lable}>{lable}</Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  lable: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
});

export default FormInput;
