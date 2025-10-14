import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FormInput from "../components/FormInput";
import { common } from "../styles/common";
import { API_BASE, buildAuthHeader, TOKEN_KEY } from "../utils/auth";

export default function ExpensesScreen() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Group dropdown
  const [openGroupDropdown, setOpenGroupDropdown] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ label: string; value: string }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Paid by dropdown
  const [openPaidByDropdown, setOpenPaidByDropdown] = useState(false);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [people, setPeople] = useState<{ label: string; value: string }[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Split between
  const [newMemberText, setNewMemberText] = useState("");
  const [splitMembers, setSplitMembers] = useState<string[]>([]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = "Please enter a description.";
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0)
      e.amount = "Enter a valid amount.";
    if (!group) e.group = "Select a group.";
    if (!paidBy) e.paidBy = "Select who paid.";
    if (splitMembers.length === 0)
      e.split = "Choose at least one member to split with.";
    return e;
  }, [description, amount, group, paidBy, splitMembers]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadGroups = async () => {
        try {
          setGroupsLoading(true);
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (!token) {
            router.replace("/(auth)/LoginScreen");
            return;
          }

          const res = await fetch(`${API_BASE}/api/groups`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: buildAuthHeader(token),
            },
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          console.log("data from groups -> ", data);

          const items = (data?.groups ?? []).map(
            (g: { id: number | string; name: string }) => ({
              label: g.name,
              value: String(g.id),
            })
          );
          if (isActive) {
            setGroups(items);
          }
        } catch (e: any) {
          console.log("Error while fetching groups -> ", e);
          Alert.alert("error", "could not load groups");
        } finally {
          if (isActive) {
            setGroupsLoading(false);
          }
        }
      };

      loadGroups();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    console.log("set group value , call api -> ", group);
    if (!group) return;
    let isMounted = true;
    const fetchGoupMembers = async () => {
      setPeopleLoading(true);
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return null;
      }

      const res = await fetch(`${API_BASE}/api/groups/${group}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      console.log("data from group members api -> ", data);

      const items = (data?.group_members ?? []).map(
        (m: { id: number | string; name: string }) => ({
          label: m.name,
          value: String(m.id),
        })
      );
      setPeople(items);
      // If user hasn't chosen any split members yet, default to all members
      setSplitMembers((prev) =>
        prev.length === 0 ? items.map((i) => i.value) : prev
      );
      try {
      } catch (e: any) {
        console.log("Error while fetching group members -> ", e);
        Alert.alert("error", "could not load group members");
      } finally {
        if (isMounted) {
          setPeopleLoading(false);
        }
      }
    };
    fetchGoupMembers();
    return () => {
      isMounted = false;
    };
  }, [group]);

  // Ensure the "paid by" user is shown in the "Split equally between" chips
  useEffect(() => {
    if (paidBy) {
      setSplitMembers((prev) =>
        prev.includes(paidBy) ? prev : [...prev, paidBy]
      );
    }
  }, [paidBy]);

  const showError = (field: string) =>
    !!errors[field] && (touched[field] || touched.__submit);

  const toggleSplitMember = (id: string) => {
    setSplitMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const addNewSplitMember = () => {
    const label = newMemberText.trim();
    if (!label) return;
    // create a synthetic value key
    const key = label.toLowerCase().replace(/\s+/g, "_");
    if (!people.find((p) => p.value === key)) {
      setPeople((p) => [...p, { label, value: key }]);
    }
    if (!splitMembers.includes(key)) setSplitMembers((s) => [...s, key]);
    setNewMemberText("");
  };

  const handleSubmit = async () => {
    setTouched((t) => ({ ...t, __submit: true }));
    if (Object.keys(errors).length > 0) {
      const first =
        errors.description ||
        errors.amount ||
        errors.group ||
        errors.paidBy ||
        errors.split;
      Alert.alert("Fix the form", first ?? "Please check the fields");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        description: description.trim(),
        amount: Number(amount),
        groupId: group,
        paidBy,
        splitBetween: splitMembers,
        notes: notes.trim() || undefined,
      };
      console.log("POST /api/expenses ->", payload);
      Alert.alert("Success", "Expense created.");
      // reset
      setDescription("");
      setAmount("");
      setGroup(null);
      setPaidBy(null);
      setSplitMembers([]);
      setNotes("");
      setTouched({});
    } finally {
      setSaving(false);
    }
  };

  // helpers for rendering
  const peopleMap = Object.fromEntries(people.map((p) => [p.value, p.label]));
  const selectedChips = splitMembers.map((id) => peopleMap[id]).filter(Boolean);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <ScrollView
              style={common.container}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.header}>Add New Expense</Text>

              <View style={[common.card, styles.card]}>
                <FormInput
                  placeholder="e.g., Dinner at restaurant"
                  lable="Description *"
                  value={description}
                  onChangeText={(v) => {
                    setDescription(v);
                    if (!touched.description)
                      setTouched((t) => ({ ...t, description: true }));
                  }}
                />
                {showError("description") && (
                  <Text style={styles.error}>{errors.description}</Text>
                )}

                <FormInput
                  lable="Amount *"
                  placeholder="$ 0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/[^0-9.]/g, "");
                    setAmount(cleaned);
                    if (!touched.amount)
                      setTouched((t) => ({ ...t, amount: true }));
                  }}
                />
                {showError("amount") && (
                  <Text style={styles.error}>{errors.amount}</Text>
                )}

                {/* Group */}
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
                <View style={{ zIndex: 30, width: "100%" }}>
                  <DropDownPicker
                    open={openGroupDropdown}
                    value={group}
                    items={groups}
                    setOpen={(o) => {
                      const next =
                        typeof o === "function" ? o(openGroupDropdown) : o;
                      if (next) setOpenPaidByDropdown(false);
                      setOpenGroupDropdown(next);
                    }}
                    setValue={setGroup}
                    setItems={setGroups}
                    placeholder={
                      groupsLoading ? "Loading groups..." : "Select a group"
                    }
                    listMode="SCROLLVIEW"
                    style={[styles.dropdown, styles.inputSurface]}
                    dropDownContainerStyle={[styles.dropdownContainer]}
                    labelStyle={styles.dropdownLabel}
                    selectedItemContainerStyle={
                      styles.dropdownSelectedContainer
                    }
                    selectedItemLabelStyle={styles.dropdownSelectedLabel}
                    ArrowUpIconComponent={() => (
                      <Text style={{ color: "#6B7280" }}>▲</Text>
                    )}
                    ArrowDownIconComponent={() => (
                      <Text style={{ color: "#6B7280" }}>▼</Text>
                    )}
                  />
                </View>
                {showError("group") && (
                  <Text style={styles.error}>{errors.group}</Text>
                )}

                {/* Paid by */}
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
                <View style={{ zIndex: 20, width: "100%" }}>
                  <DropDownPicker
                    open={openPaidByDropdown}
                    value={paidBy}
                    items={people}
                    setOpen={(o) => {
                      const next =
                        typeof o === "function" ? o(openPaidByDropdown) : o;
                      if (next) setOpenGroupDropdown(false);
                      setOpenPaidByDropdown(next);
                    }}
                    setValue={setPaidBy}
                    setItems={setPeople}
                    placeholder="Select"
                    listMode="SCROLLVIEW"
                    style={[styles.dropdown, styles.inputSurface]}
                    dropDownContainerStyle={[styles.dropdownContainer]}
                    labelStyle={styles.dropdownLabel}
                    selectedItemContainerStyle={
                      styles.dropdownSelectedContainer
                    }
                    selectedItemLabelStyle={styles.dropdownSelectedLabel}
                    ArrowUpIconComponent={() => (
                      <Text style={{ color: "#6B7280" }}>▲</Text>
                    )}
                    ArrowDownIconComponent={() => (
                      <Text style={{ color: "#6B7280" }}>▼</Text>
                    )}
                  />
                </View>
                {showError("paidBy") && (
                  <Text style={styles.error}>{errors.paidBy}</Text>
                )}

                {/* Split between */}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 6,
                    color: "#111827",
                  }}
                >
                  Split between
                </Text>

                {/* Static people rows to match design */}
                {people
                  .filter((p) => p.value !== paidBy)
                  .map((p) => (
                    <Pressable
                      onPress={() => toggleSplitMember(p.value)}
                      hitSlop={8}
                      key={p.value}
                    >
                      <View
                        style={[
                          styles.inputSurface,
                          styles.rowBetween,
                          styles.personRow,
                        ]}
                      >
                        <Text style={styles.personLabel}>{p.label}</Text>

                        <View
                          style={[
                            styles.checkCircle,
                            splitMembers.includes(p.value) &&
                              styles.checkCircleActive,
                          ]}
                        >
                          {splitMembers.includes(p.value) && (
                            <Text style={styles.checkIcon}>✓</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}

                {/* Split equally chips */}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 6,
                    color: "#111827",
                  }}
                >
                  Split equally between:
                </Text>
                <View style={styles.chipsWrap}>
                  {selectedChips.length === 0 ? (
                    <Text style={[styles.hintMuted, { marginBottom: 6 }]}>
                      No one selected yet
                    </Text>
                  ) : (
                    selectedChips.map((name) => (
                      <View key={name} style={styles.chip}>
                        <Text style={styles.chipText}>{name}</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Notes */}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 6,
                    marginTop: 6,
                    color: "#111827",
                  }}
                >
                  Notes (Optional)
                </Text>
                <View style={[styles.inputSurface, { minHeight: 84 }]}>
                  <TextInput
                    placeholder="Add any additional notes..."
                    placeholderTextColor="#9CA3AF"
                    style={[
                      styles.inputPlain,
                      { height: 84, textAlignVertical: "top" },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={saving}
                android_ripple={{ color: "#E5E7EB" }}
                style={({ pressed }) => [
                  styles.btn,
                  pressed && styles.btnPressed,
                  saving && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.btnText}>
                  {saving ? "Saving..." : "Add Expense"}
                </Text>
              </Pressable>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  card: {
    padding: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 16,
    borderRadius: 16,
  },
  labelMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    opacity: 0.7,
    marginBottom: 6,
  },
  inputSurface: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    width: "100%",
  },
  inputPlain: {
    fontSize: 16,
    color: "#111827",
  },
  currencyPrefix: { fontSize: 16, color: "#6B7280", marginRight: 8 },
  error: { color: "#DC2626", marginTop: -4, marginBottom: 6, fontSize: 12 },

  // Dropdown restyle to match design
  dropdown: {
    borderWidth: 0,
    backgroundColor: "#F3F4F6",
  },
  dropdownContainer: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  dropdownLabel: { color: "#111827" },
  dropdownSelectedContainer: { backgroundColor: "#F3F4F6" },
  dropdownSelectedLabel: { color: "#111827", fontWeight: "600" },

  // People rows
  row: { flexDirection: "row" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personRow: { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  personLabel: { fontSize: 16, color: "#111827" },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  checkCircleActive: { backgroundColor: "#111827" },
  checkIcon: { color: "#fff", fontWeight: "700" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: { color: "#111827", fontWeight: "600" },
  hintMuted: { color: "#6B7280" },

  btn: {
    backgroundColor: "#6B7280",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  btnPressed: { opacity: 0.96, transform: [{ scale: 0.997 }] },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
