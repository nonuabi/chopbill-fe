import { StyleSheet, Text, TextInput, View } from "react-native";

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
  return (
    <View style={{ width: "100%", marginBottom: 16 }}>
      <Text style={form.lable}>{lable}</Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={form.input}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
};

const form = StyleSheet.create({
  lable: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
export default FormInput;
