import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FormInput from "../components/FormInput";
import Header from "../components/Header";
import { common } from "../styles/common";
export default function ExpensesScreen() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [openGroupDropdown, setOpenGroupDropdown] = useState(false);
  const [group, setGroup] = useState(null);
  const [groups, setGroups] = useState([
    { value: "1", label: "weekend trip" },
    { value: "2", label: "Goa trp" },
  ]);

  const [openPaidByDropdown, setOpenPaidByDropdown] = useState(false);
  const [paidBy, setPaidBy] = useState("");
  const [peoples, setPeoples] = useState([
    { label: "abhishek verma", value: "1" },
    { label: "test", value: "2" },
  ]);

  const handleSubmit = () => {};

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <Header />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={common.container}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text
                style={{
                  fontSize: 16,
                  marginBottom: 16,
                  fontWeight: 500,
                }}
              >
                Add New Expense
              </Text>
            </View>

            <View
              style={[
                common.card,
                {
                  padding: 16,
                  flexDirection: "column",
                  alignItems: "flex-start",
                  marginBottom: 24,
                },
              ]}
            >
              <FormInput
                lable="Title *"
                placeholder="Dinner at Bistro"
                value={title}
                onChangeText={setTitle}
              />
              <FormInput
                lable="Amount *"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 6,
                  color: "#111827",
                }}
              >
                Group *
              </Text>
              <DropDownPicker
                open={openGroupDropdown}
                value={group}
                items={groups}
                setOpen={setOpenGroupDropdown}
                setValue={setGroup}
                setItems={setGroups}
                placeholder="Select a Group"
                listMode="MODAL"
                style={styles.dropdown}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 6,
                  color: "#111827",
                }}
              >
                Paid by
              </Text>
              <DropDownPicker
                open={openPaidByDropdown}
                value={paidBy}
                items={peoples}
                setOpen={setOpenPaidByDropdown}
                setValue={setPaidBy}
                setItems={setPeoples}
                placeholder="Select paid by"
                listMode="MODAL"
                style={styles.dropdown}
              />
              <FormInput
                lable="Notes (Optional)"
                placeholder="Add any additional notes..."
                value={notes}
                onChangeText={setNotes}
              />
            </View>
            <View>
              <Text onPress={handleSubmit} style={styles.btn}>
                <Text style={styles.btnText}>Save Expense</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  muted: { opacity: 0.7, marginBottom: 12 },
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: "100%",
  },
  btnText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  dropdown: {
    borderColor: "#ccc",
    marginBottom: 16,
  },
});
