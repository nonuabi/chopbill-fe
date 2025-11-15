import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { colors } from "../styles/colors";
import { common } from "../styles/common";
import { API_BASE, authenticatedFetch, TOKEN_KEY } from "../utils/auth";

export default function ExpensesScreen() {
  const router = useRouter();
  const { group: groupParam } = useLocalSearchParams<{ group?: string }>();
  
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
  const [splitMembers, setSplitMembers] = useState<string[]>([]);

  // Current user info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Calculate split amount per person
  const splitAmountPerPerson = useMemo(() => {
    if (!amount || splitMembers.length === 0) return 0;
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return 0;
    return (num / splitMembers.length).toFixed(2);
  }, [amount, splitMembers.length]);

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

  // Load groups and current user on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadGroups = async () => {
        try {
          setGroupsLoading(true);

          // Fetch current user info
          const userRes = await authenticatedFetch(`${API_BASE}/api/me`, {
            method: "GET",
          });
          if (userRes?.ok) {
            const userData = await userRes.json();
            if (isActive) {
              setCurrentUserId(String(userData?.data?.id || ""));
            }
          }

          const res = await authenticatedFetch(`${API_BASE}/api/groups`, {
            method: "GET",
          });

          if (!res) {
            // Auth error already handled
            return;
          }

          if (!res.ok) throw new Error(await res.text());

          const data = await res.json();
          const items = (data?.groups ?? []).map(
            (g: { id: number | string; name: string }) => ({
              label: g.name,
              value: String(g.id),
            })
          );
          if (isActive) {
            setGroups(items);
            // Pre-select group from query parameter
            if (groupParam && !group) {
              const groupId = String(groupParam);
              if (items.find((g: { value: string }) => g.value === groupId)) {
                setGroup(groupId);
              }
            }
          }
        } catch (e: any) {
          console.log("Error while fetching groups -> ", e);
          Alert.alert("Error", "Could not load groups");
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
    }, [groupParam])
  );

  // Fetch group members when group is selected
  useEffect(() => {
    if (!group) {
      setPeople([]);
      setPaidBy(null);
      setSplitMembers([]);
      return;
    }

    let isMounted = true;
    const fetchGroupMembers = async () => {
      setPeopleLoading(true);
      try {
        const res = await authenticatedFetch(`${API_BASE}/api/groups/${group}`, {
          method: "GET",
        });

        if (!res) {
          // Auth error already handled
          return;
        }

        if (!res.ok) throw new Error(await res.text());
        
        const data = await res.json();
        console.log("Group data:", data);
        
        // Handle both old and new API response formats
        const members = data?.group?.members || data?.members || data?.group_members || [];
        const items = members.map(
          (m: { id: number | string; name?: string; email?: string }) => {
            const memberId = String(m.id);
            const isCurrentUser = currentUserId && memberId === currentUserId;
            const baseLabel = m.name || m.email || "Unknown";
            return {
              label: isCurrentUser ? `${baseLabel} (YOU)` : baseLabel,
              value: memberId,
            };
          }
        );
        
        if (isMounted) {
          setPeople(items);
          // Default to all members for split
          if (items.length > 0) {
            setSplitMembers(items.map((i: { value: string }) => i.value));
          }
        }
      } catch (e: any) {
        console.log("Error while fetching group members -> ", e);
        Alert.alert("Error", "Could not load group members");
      } finally {
        if (isMounted) {
          setPeopleLoading(false);
        }
      }
    };
    
    fetchGroupMembers();
    return () => {
      isMounted = false;
    };
  }, [group, currentUserId]);

  // Ensure the "paid by" user is included in split members
  useEffect(() => {
    if (paidBy && !splitMembers.includes(paidBy)) {
      setSplitMembers((prev) => [...prev, paidBy]);
    }
  }, [paidBy]);

  const showError = (field: string) =>
    !!errors[field] && (touched[field] || touched.__submit);

  const toggleSplitMember = (id: string) => {
    // Don't allow removing the payer from split
    if (id === paidBy) {
      Alert.alert("Cannot remove", "The person who paid must be included in the split.");
      return;
    }
    setSplitMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
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
        paidBy,
        splitBetween: splitMembers,
        notes: notes.trim() || "",
      };
      console.log("POST /api/groups/${group}/expenses ->", payload);

      const res = await authenticatedFetch(`${API_BASE}/api/groups/${group}/expenses`, {
        method: "POST",
        body: JSON.stringify({ expense: payload }),
      });

      if (!res) {
        // Auth error already handled
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create expense");
      }

      const data = await res.json();
      console.log("Create Expense response => ", data);

      Alert.alert("Success", "Expense added successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setDescription("");
            setAmount("");
            setNotes("");
            setPaidBy(null);
            setSplitMembers([]);
            setTouched({});
            
            // Navigate back if came from group detail page
            if (groupParam) {
              router.back();
            }
          },
        },
      ]);
    } catch (e: any) {
      console.error("Error creating expense:", e);
      Alert.alert("Error", e?.message || "Failed to create expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper for rendering
  const peopleMap = Object.fromEntries(people.map((p) => [p.value, p.label]));

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
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.header}>Add New Expense</Text>
                  <Text style={styles.headerSubtitle}>
                    Track and split expenses with your group
                  </Text>
                </View>
                {groupParam && (
                  <Pressable
                    onPress={() => router.back()}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.card}>
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
                  placeholder="₹ 0.00"
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
                <Text style={styles.label}>Group *</Text>
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
                    disabled={groupsLoading}
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
                <Text style={styles.label}>Paid by *</Text>
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
                    placeholder={
                      peopleLoading
                        ? "Loading members..."
                        : people.length === 0
                          ? "Select a group first"
                          : "Select who paid"
                    }
                    disabled={peopleLoading || people.length === 0}
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
                <Text style={styles.label}>Split between *</Text>
                {people.length === 0 ? (
                  <View style={styles.inputSurface}>
                    <Text style={styles.hintMuted}>
                      Select a group to see members
                    </Text>
                  </View>
                ) : (
                  <>
                    {people.map((p) => {
                      const isSelected = splitMembers.includes(p.value);
                      const isPayer = p.value === paidBy;
                      return (
                        <Pressable
                          onPress={() => toggleSplitMember(p.value)}
                          hitSlop={8}
                          key={p.value}
                          disabled={isPayer}
                        >
                          <View
                            style={[
                              styles.inputSurface,
                              styles.rowBetween,
                              styles.personRow,
                              isPayer && styles.personRowDisabled,
                            ]}
                          >
                            <View style={styles.personInfo}>
                              <Text style={styles.personLabel}>
                                {p.label}
                                {isPayer && (
                                  <Text style={styles.payerBadge}> (Paid)</Text>
                                )}
                              </Text>
                              {isSelected && amount && (
                                <Text style={styles.splitAmount}>
                                  ₹{splitAmountPerPerson} each
                                </Text>
                              )}
                            </View>
                            <View
                              style={[
                                styles.checkCircle,
                                isSelected && styles.checkCircleActive,
                              ]}
                            >
                              {isSelected && (
                                <Text style={styles.checkIcon}>✓</Text>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                    
                    {/* Split summary */}
                    {splitMembers.length > 0 && amount && (
                      <View style={styles.splitSummary}>
                        <Text style={styles.splitSummaryText}>
                          {splitMembers.length} {splitMembers.length === 1 ? "person" : "people"} × ₹{splitAmountPerPerson} = ₹{amount}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                {showError("split") && (
                  <Text style={styles.error}>{errors.split}</Text>
                )}

                {/* Notes */}
                <Text style={[styles.label, { marginTop: 6 }]}>
                  Notes (Optional)
                </Text>
                <View style={[styles.inputSurface, styles.notesInput]}>
                  <TextInput
                    placeholder="Add any additional notes..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.notesText}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
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
                  saving && styles.btnDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Add Expense</Text>
                )}
              </Pressable>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 20,
    color: "#6B7280",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  inputSurface: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  error: {
    color: colors.danger,
    marginTop: -8,
    marginBottom: 8,
    fontSize: 12,
  },
  hintMuted: {
    color: "#6B7280",
    fontSize: 14,
  },
  // Dropdown styles
  dropdown: {
    borderWidth: 0,
    backgroundColor: "#fff",
  },
  dropdownContainer: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownLabel: {
    color: "#111827",
  },
  dropdownSelectedContainer: {
    backgroundColor: "#F3F4F6",
  },
  dropdownSelectedLabel: {
    color: "#111827",
    fontWeight: "600",
  },
  // Person rows
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  personRowDisabled: {
    opacity: 0.7,
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  payerBadge: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  splitAmount: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkIcon: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  splitSummary: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  splitSummaryText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    textAlign: "center",
  },
  notesInput: {
    minHeight: 100,
  },
  notesText: {
    fontSize: 16,
    color: "#111827",
    minHeight: 80,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.05,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
