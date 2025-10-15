import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../styles/colors";
import { common } from "../styles/common";
import { buildAuthHeader } from "../utils/auth";

const TOKEN_KEY = "sf_token";
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://sharefare-be.onrender.com";

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<
    {
      id: string;
      name: string;
      description?: string;
      member_count: number;
      totalAmount?: number; // sum of expenses in this group
      balanceForMe?: number; // +ve: others owe you; -ve: you owe
    }[]
  >([]);

  const [userList, setUserList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const currentUserEmail = "me@sharefare.app"; // TODO: replace with real auth user email
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState("");
  const [groupdesciption, setGroupDiscription] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<
    { id?: string; email: string; name?: string; newUser?: boolean }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUserGroups = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
          router.replace("/(auth)/LoginScreen");
          return null;
        }
        const res = await fetch(`${API_BASE}/api/groups`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(token),
          },
        });

        if (res.status === 401 || res.status === 400) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          router.replace("/(auth)/LoginScreen");
        }

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to fetch user groups");
        }
        console.log("groups res -> ", res);
        const data = await res.json();
        console.log("groups list -> ", data?.groups);
        setGroups(data?.groups || []);
      } catch (e: any) {
        console.log("Error from fetching group list => ", e);
        Alert.alert("failure", "Error while fetching group list!");
      }
    };
    const fetchUsers = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
          router.replace("/(auth)/LoginScreen");
          return null;
        }
        const res = await fetch(`${API_BASE}/api/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(token),
          },
        });

        if (res.status === 401 || res.status === 400) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          router.replace("/(auth)/LoginScreen");
        }

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to fetch user");
        }
        console.log("users res -> ", res);
        const data = await res.json();
        console.log("users list -> ", data?.users);
        setUserList(data?.users || []);
      } catch (e: any) {
        console.log("Error from fetching users list => ", e);
        Alert.alert("failure", "Error while fetching users list!");
      }
    };
    fetchUserGroups();
    fetchUsers();
  }, []);

  const normalized = (s: string) => s.trim().toLowerCase();
  const emailResults = userList.filter(
    (u) =>
      normalized(u.email).includes(normalized(memberQuery)) ||
      normalized(u.name).includes(normalized(memberQuery))
  );

  const addMemberByEmail = (
    email: string,
    name?: string,
    id?: string,
    newUser = false
  ) => {
    const exists = selectedMembers.some(
      (m) => normalized(m.email) === normalized(email)
    );
    if (exists) return;
    setSelectedMembers((prev) => [...prev, { email, name, id, newUser }]);
    setMemberQuery("");
  };

  const removeMember = (email: string) => {
    setSelectedMembers((prev) =>
      prev.filter((m) => normalized(m.email) !== normalized(email))
    );
  };

  const handleAddGroup = async () => {
    try {
      if (isSaving) return;
      if (!groupName.trim()) {
        Alert.alert("Validation", "Please enter a group name.");
        return;
      }
      if (selectedMembers.length === 0) {
        Alert.alert("Validation", "Please add at least one member.");
        return;
      }
      setIsSaving(true);
      const newGroup = {
        id: "",
        name: groupName.trim(),
        description: groupdesciption.trim() || undefined,
        members: selectedMembers,
        totalAmount: 0,
        balanceForMe: 0,
      } as const;
      console.log("new group => ", newGroup);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace("/(auth)/LoginScreen");
        return null;
      }

      const res = await fetch(`${API_BASE}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(token),
        },
        body: JSON.stringify({ group: newGroup }),
      });

      if (res.status === 401 || res.status === 400) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        router.replace("/(auth)/LoginScreen");
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create a group");
      }
      const data = await res.json();
      console.log("Create group res => ", data?.group);

      setGroups((prev) => [data?.group, ...((prev as any) || [])]);
      setGroupName("");
      setGroupDiscription("");
      setSelectedMembers([]);
      setMemberQuery("");
      setIsModalOpen(false);
    } catch (e: any) {
      console.log("Error while creating group -> ", e);
      Alert.alert("Error", e?.message || "Could not create group!");
    } finally {
      setIsSaving(false);
    }
  };

  const openDetails = (group: any) => {
    setActiveGroup(group);
    setIsDetailsOpen(true);
  };
  const closeDetails = () => {
    setIsDetailsOpen(false);
    setActiveGroup(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        {/* <Header /> */}
        <ScrollView contentContainerStyle={[common.container]}>
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={styles.title}>Your Groups</Text>
              <Pressable
                style={styles.btn}
                onPress={() => {
                  setIsModalOpen(true);
                }}
              >
                <Text style={styles.btnText}>Create Group</Text>
              </Pressable>
            </View>

            {groups?.length === 0 ? (
              <>
                <Text style={[styles.muted, { alignSelf: "center" }]}>
                  No groups yet. Create one to split expenses.
                </Text>
              </>
            ) : (
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => {
                  const total = item.totalAmount ?? 0;
                  const bal = item.balanceForMe ?? 0;
                  const owesLabel =
                    bal > 0 ? `₹ ${Math.abs(bal)}` : `₹ ${Math.abs(bal)}`;

                  return (
                    <Pressable
                      onPress={() => openDetails(item)}
                      android_ripple={{ color: "#E5E7EB" }}
                      style={({ pressed }) => [pressed && styles.itemPressed]}
                    >
                      <View style={styles.item}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 12,
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 16, fontWeight: "600" }}>
                              {item.name}
                            </Text>
                            {item?.description && (
                              <Text style={styles.muted}>
                                {item.description}
                              </Text>
                            )}
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <Text
                              style={[
                                bal > 0
                                  ? styles.OwedCardValue
                                  : styles.OweCardValue,
                              ]}
                            >
                              {owesLabel}
                            </Text>
                            <Text style={styles.cardTitle}>your balance</Text>
                          </View>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Feather name="users" size={13} color="black" />
                            <Text style={[styles.statText, { marginLeft: 5 }]}>
                              {item?.member_count} members
                            </Text>
                          </View>
                          <Text style={styles.statText}>₹ {total} total</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
        </ScrollView>

        <Modal
          visible={isModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
                style={{ width: "100%", alignItems: "center" }}
              >
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Create New Group</Text>
                  <Text style={styles.modalSubtitle}>
                    Create a new group to split expenses with friends and family
                  </Text>
                  <Text style={styles.label}>Group Name *</Text>
                  <TextInput
                    placeholder="Group name"
                    style={styles.input}
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}> Description (Optional)</Text>
                  <TextInput
                    placeholder="Brief description of the group"
                    style={styles.input}
                    value={groupdesciption}
                    onChangeText={setGroupDiscription}
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={[styles.label, { marginTop: 8 }]}>Members</Text>
                  {/* Selected member chips */}
                  {selectedMembers.length > 0 && (
                    <View style={styles.chipsWrap}>
                      {selectedMembers.map((m) => (
                        <View key={m.email} style={styles.chip}>
                          <Text style={styles.chipText}>
                            {m.name ? `${m.name} · ${m.email}` : m.email}
                            {m.newUser ? " (newUser)" : ""}
                          </Text>
                          <Pressable
                            onPress={() => removeMember(m.email)}
                            accessibilityRole="button"
                          >
                            <Text style={styles.chipRemove}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Search box */}
                  <TextInput
                    placeholder="Search by email or name"
                    style={styles.input}
                    value={memberQuery}
                    onChangeText={setMemberQuery}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9CA3AF"
                  />

                  {/* Search results */}
                  {memberQuery.length > 0 && (
                    <View style={styles.resultsBox}>
                      {emailResults.length > 0 ? (
                        emailResults.slice(0, 6).map((u) => (
                          <Pressable
                            key={u.id}
                            onPress={() =>
                              addMemberByEmail(u.email, u.name, u.id)
                            }
                            style={styles.resultRow}
                          >
                            <Text style={styles.resultName}>{u.name}</Text>
                            <Text style={styles.resultEmail}>{u.email}</Text>
                          </Pressable>
                        ))
                      ) : (
                        <View style={styles.resultEmpty}>
                          <Text style={styles.resultEmptyText}>
                            No users found.
                          </Text>
                          {/* Invite CTA if looks like an email */}
                          {memberQuery.includes("@") && (
                            <Pressable
                              onPress={() =>
                                addMemberByEmail(
                                  memberQuery.trim(),
                                  undefined,
                                  undefined,
                                  true
                                )
                              }
                              style={[styles.inviteBtn, styles.btnPrimary]}
                            >
                              <Text style={styles.btnTextPrimary}>
                                Invite {memberQuery.trim()}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.row}>
                    <Pressable
                      onPress={() => setIsModalOpen(false)}
                      style={[styles.modalBtn, styles.btnGhost]}
                    >
                      <Text style={styles.btnTextGhost}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddGroup}
                      disabled={isSaving}
                      style={[
                        styles.modalBtn,
                        styles.btnPrimary,
                        isSaving ? { opacity: 0.6 } : null,
                      ]}
                    >
                      {isSaving ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <ActivityIndicator size="small" />
                          <Text style={styles.btnTextPrimary}>Saving…</Text>
                        </View>
                      ) : (
                        <Text style={styles.btnTextPrimary}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={isDetailsOpen}
          transparent
          animationType="fade"
          onRequestClose={closeDetails}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
                style={{ width: "100%", alignItems: "center" }}
              >
                <View style={[styles.modalCard, { maxHeight: "85%" }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.modalTitle}>
                      {activeGroup?.name || "Group"}
                    </Text>
                    <Pressable onPress={closeDetails}>
                      <AntDesign name="close" size={18} color="black" />
                    </Pressable>
                  </View>
                  {activeGroup?.description ? (
                    <Text style={styles.modalSubtitle}>
                      {activeGroup.description}
                    </Text>
                  ) : null}

                  {/* Balance summary */}
                  <View style={{ marginTop: 6, marginBottom: 12 }}>
                    <Text style={styles.cardTitle}>your balance</Text>
                    <Text
                      style={
                        activeGroup?.balanceForMe > 0
                          ? styles.OwedCardValue
                          : styles.OweCardValue
                      }
                    >
                      ₹ {Math.abs(activeGroup?.balanceForMe ?? 0)}
                    </Text>
                  </View>

                  {/* Totals row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <Text style={styles.statText}>
                      ₹ {activeGroup?.totalAmount ?? 0} total
                    </Text>
                    <Text style={styles.statText}>
                      {Array.isArray(activeGroup?.members)
                        ? activeGroup.members.length
                        : 0}{" "}
                      members
                    </Text>
                  </View>

                  {/* Members list */}
                  <Text style={[styles.label, { marginTop: 4 }]}>Members</Text>
                  <ScrollView
                    style={{ maxHeight: 240 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {Array.isArray(activeGroup?.members) &&
                    activeGroup.members.length > 0 ? (
                      activeGroup.members.map((m: any) => (
                        <View key={m.email} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {(
                                m.name?.[0] ||
                                m.email?.[0] ||
                                "?"
                              ).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ marginLeft: 10 }}>
                            <Text style={styles.resultName}>
                              {m.name || m.email}
                            </Text>
                            {m.name ? (
                              <Text style={styles.resultEmail}>{m.email}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.resultEmptyText}>No members yet</Text>
                    )}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: 500,
  },
  muted: { opacity: 0.7, marginTop: 2 },
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  itemText: { fontSize: 16, fontWeight: "500", color: "#111827" },

  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  modalSubtitle: { opacity: 0.7, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6, color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: "#111827" },
  btnTextPrimary: { color: "#fff", fontWeight: "600" },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnTextGhost: { color: "#111827", fontWeight: "600" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  chipText: { color: "#111827" },
  chipRemove: { marginLeft: 4, color: "#6B7280", fontWeight: "700" },
  resultsBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultName: { fontWeight: "600", color: "#111827" },
  resultEmail: { color: "#6B7280" },
  resultEmpty: { padding: 12, gap: 10 },
  resultEmptyText: { color: "#6B7280" },
  inviteBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  statText: { color: "#0a0a0a", fontSize: 14, fontWeight: "500" },

  cardTitle: {
    fontFamily: "sans-serif",
    color: "#717182",
    fontSize: 14,
  },
  OwedCardValue: {
    color: colors.green,
    fontSize: 16,
  },
  OweCardValue: {
    color: colors.danger,
    fontSize: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontWeight: "700", color: "#111827" },
  itemPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
    backgroundColor: "#F9FAFB",
  },
});
