import { Alert, Text, TextInput, View } from "react-native";

interface DropdownProps {
  lable: string;
  value: string;
  onChange: (v: string) => void;
  options: { lable: string; value: string }[];
}
const Dropdown = ({ lable, value, onChange, options }: DropdownProps) => {
  return (
    <View>
      <Text>{lable}</Text>
      <TextInput
        value={options.find((o) => o.value === value)?.lable || ""}
        onPress={() =>
          Alert.alert(
            lable,
            "Select an option",
            options.map((o) => ({
              text: o.lable,
              onPress: () => onChange(o.value),
            }))
          )
        }
        placeholder="Select"
        editable={false}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
};
export default Dropdown;
