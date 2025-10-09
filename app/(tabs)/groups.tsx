import { useState } from "react";
import {
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
import { common } from "../styles/common";

export default function GroupsScreen() {
  const [groups, setGroups] = useState<
    { id: string; name: string; description?: string }[]
  >([
    {
      id: "group_1",
      name: "rome",
      description: "des testing",
    },
    {
      id: "group_2",
      name: "rome 2",
      description: "des testing",
    },
    {
      id: "group_3",
      name: "rome 2",
      description: "des testing",
    },
    {
      id: "group_4",
      name: "rome 2",
      description: "des testing",
    },
    {
      id: "group_5",
      name: "rome 2",
      description: "des testing",
    },
    {
      id: "group_6",
      name: "rome 2",
      description: "des testing",
    },
    {
      id: "group_7",
      name: "rome 2",
    },
    {
      id: "group_8",
      name: "rome 2",
    },
    {
      id: "group_9",
      name: "rome 2",
    },
    {
      id: "group_10",
      name: "rome 2",
    },
  ]);

  const [userList, setUserList] = useState<
    { id: string; name: string; email: string }[]
  >([
    {
      id: "1",
      name: "test",
      email: "test@test.com",
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupdesciption, setGroupDiscription] = useState("");

  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<
    { id?: string; email: string; name?: string; newUser?: boolean }[]
  >([]);

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

  const handleAddGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("Validation", "Please enter a group name.");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Validation", "Please add at least one member.");
      return;
    }
    const newGroup = {
      id: Date.now().toString(),
      name: groupName.trim(),
      description: groupdesciption.trim() || undefined,
      members: selectedMembers,
    } as any;
    console.log("new group => ", newGroup);
    setGroups((prev) => [newGroup, ...prev]);
    setGroupName("");
    setGroupDiscription("");
    setSelectedMembers([]);
    setMemberQuery("");
    setIsModalOpen(false);
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

            {groups.length === 0 ? (
              <>
                <Text style={[styles.muted, { alignSelf: "center" }]}>
                  No groups yet. Create one to split expenses.
                </Text>
              </>
            ) : (
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>
                      {item.name}
                    </Text>
                    {item?.description && (
                      <Text style={styles.muted}>{item.description}</Text>
                    )}
                    {Array.isArray((item as any).members) && (
                      <Text style={[styles.muted, { marginTop: 6 }]}>
                        {(item as any).members.length} member
                        {((item as any).members.length || 0) === 1 ? "" : "s"}
                      </Text>
                    )}
                  </View>
                )}
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
                      style={[styles.modalBtn, styles.btnPrimary]}
                    >
                      <Text style={styles.btnTextPrimary}>Save</Text>
                    </Pressable>
                  </View>
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
});
