import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import ListCard from "../../../components/ListCard";
import ProfileAvatar from "../../../components/ProfileAvtar";
import { useTheme } from "../../../contexts/ThemeContext";
import { getColors } from "../../../styles/colors";
import { getCommonStyles } from "../../../styles/common";
import { API_BASE, authenticatedFetch } from "../../../utils/auth";
import { useToast } from "../../../contexts/ToastContext";
import { extractErrorMessage, getSuccessMessage } from "../../../utils/toast";

type MemberBalance = {
  user: {
    id?: string | number;
    name?: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  balance: number;
  owes_you: number;
  you_owe: number;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  member_balances?: MemberBalance[];
};

export default function SettleUpScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const common = getCommonStyles(isDark);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberBalance | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const styles = getStyles(colors, isDark);

  const fetchGroupDetails = useCallback(async () => {
    if (!id) return;
    
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/groups/${id}`, {
        method: "GET",
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to fetch group details");
      }
      const data = await res.json();
      setGroup(data?.group || data);
    } catch (e: any) {
      console.log("Group details error =>", e?.message);
      showToast("Could not load group details. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        setLoading(true);
        fetchGroupDetails();
      }
    }, [id, fetchGroupDetails])
  );

  const memberBalances = group?.member_balances || [];
  const membersWhoOweYou = memberBalances.filter((mb) => (Number(mb.owes_you) || 0) > 0);
  const membersYouOwe = memberBalances.filter((mb) => (Number(mb.you_owe) || 0) > 0);
  const hasBalances = membersWhoOweYou.length > 0 || membersYouOwe.length > 0;

  const openSettleModal = (member: MemberBalance, isOwingYou: boolean) => {
    console.log("Opening settle modal for:", member.user.name, "isOwingYou:", isOwingYou);
    setSelectedMember(member);
    const amount = isOwingYou ? (Number(member.owes_you) || 0) : (Number(member.you_owe) || 0);
    setSettleAmount(amount.toFixed(2));
    setNotes("");
    setIsModalOpen(true);
  };

  const handleSettleUp = async () => {
    if (!selectedMember || !settleAmount) {
      showToast("Please enter a settlement amount", "warning");
      return;
    }

    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid amount", "warning");
      return;
    }

    // Determine payer and payee
    // If member will pay you, they are payer and you are payee
    // If you need to pay member, you are payer and they are payee
    const owesYou = Number(selectedMember.owes_you) || 0;
    const youOwe = Number(selectedMember.you_owe) || 0;
    const isOwingYou = owesYou > 0;
    const payerId = isOwingYou ? selectedMember.user.id : "current_user";
    const payeeId = isOwingYou ? "current_user" : selectedMember.user.id;

    // Validate amount doesn't exceed balance
    const maxAmount = isOwingYou ? owesYou : youOwe;
    if (amount > maxAmount) {
      Alert.alert(
        "Invalid Amount",
        `Settlement amount cannot exceed ₹${maxAmount.toFixed(2)}`,
        [{ text: "OK" }]
      );
      return;
    }

    setIsSettling(true);
    try {
      // Get current user ID from a profile fetch or use a different approach
      // For now, we'll need to get current user ID - let's fetch it
      const meRes = await authenticatedFetch(`${API_BASE}/api/me`, {
        method: "GET",
      });
      
      if (!meRes || !meRes.ok) {
        throw new Error("Could not fetch user information");
      }

      const meData = await meRes.json();
      const currentUserId = meData?.data?.id;

      if (!currentUserId) {
        throw new Error("Could not determine current user");
      }

      const finalPayerId = payerId === "current_user" ? currentUserId : payerId;
      const finalPayeeId = payeeId === "current_user" ? currentUserId : payeeId;

      const res = await authenticatedFetch(`${API_BASE}/api/groups/${id}/settlements`, {
        method: "POST",
        body: JSON.stringify({
          settlement: {
            payer_id: finalPayerId,
            payee_id: finalPayeeId,
            amount: amount,
            notes: notes.trim() || undefined,
          },
        }),
      });

      if (!res) {
        return;
      }

      if (!res.ok) {
        const errorMsg = await extractErrorMessage(res);
        throw new Error(errorMsg || "Failed to create settlement");
      }

      showToast(getSuccessMessage("settle_up") || "Settled up successfully! 🎉", "success");
      setIsModalOpen(false);
      setSelectedMember(null);
      setSettleAmount("");
      setNotes("");
      
      // Refresh group details
      await fetchGroupDetails();
      
      // Navigate back to group details screen after a short delay
      setTimeout(() => {
        if (id) {
          router.push(`/(tabs)/groups/${id}`);
        } else {
          router.back();
        }
      }, 1000);
    } catch (e: any) {
      console.error("Settle up error:", e);
      showToast(e?.message || "Could not settle up. Please try again.", "error", 4000);
    } finally {
      setIsSettling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[common.safeViewContainer]}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[common.safeViewContainer]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <ScrollView
            style={common.container}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => {
                  if (id) {
                    router.push(`/(tabs)/groups/${id}`);
                  } else {
                    router.back();
                  }
                }}
                hitSlop={8}
                style={styles.backBtn}
              >
                <AntDesign name="left" size={20} color={colors.text} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.headerTitle}>Settle Up</Text>
                <Text style={styles.headerSubtitle}>{group?.name || "Group"}</Text>
              </View>
            </View>

            {!hasBalances ? (
              <View style={styles.emptyContainer}>
                <Feather name="check-circle" size={64} color={colors.green} />
                <Text style={styles.emptyTitle}>All settled up!</Text>
                <Text style={styles.emptySubtitle}>
                  No outstanding balances in this group.
                </Text>
              </View>
            ) : (
              <>
                {/* Members Who Will Pay You */}
                {membersWhoOweYou.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Who will pay you
                    </Text>
                    <View style={styles.cardsContainer}>
                      {membersWhoOweYou.map((mb, idx) => (
                        <View 
                          key={mb.user.id || mb.user.email || mb.user.phone_number || idx}
                          style={[
                            styles.cardWrapper,
                            idx < membersWhoOweYou.length - 1 && styles.cardWrapperSpacing
                          ]}
                        >
                          <ListCard
                            variant="balance"
                            name={mb.user.name || mb.user.email || mb.user.phone_number || "User"}
                            amount={mb.owes_you}
                            direction="+"
                            email={mb.user.email || mb.user.phone_number}
                            avatarUrl={mb.user.avatar_url}
                            userId={mb.user.id}
                            onPress={() => openSettleModal(mb, true)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Members You Need To Pay */}
                {membersYouOwe.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Who you need to pay</Text>
                    <View style={styles.cardsContainer}>
                      {membersYouOwe.map((mb, idx) => (
                        <View 
                          key={mb.user.id || mb.user.email || mb.user.phone_number || idx}
                          style={[
                            styles.cardWrapper,
                            idx < membersYouOwe.length - 1 && styles.cardWrapperSpacing
                          ]}
                        >
                          <ListCard
                            variant="balance"
                            name={mb.user.name || mb.user.email || mb.user.phone_number || "User"}
                            amount={mb.you_owe}
                            direction="-"
                            email={mb.user.email || mb.user.phone_number}
                            avatarUrl={mb.user.avatar_url}
                            userId={mb.user.id}
                            onPress={() => openSettleModal(mb, false)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Settle Up Modal */}
        <Modal
          visible={isModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => !isSettling && setIsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Settle Up</Text>
                <Pressable
                  onPress={() => !isSettling && setIsModalOpen(false)}
                  disabled={isSettling}
                  hitSlop={8}
                >
                  <AntDesign name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              {selectedMember && (
                <>
                  <View style={styles.memberInfo}>
                    <ProfileAvatar
                      fullName={selectedMember.user.name || selectedMember.user.email || selectedMember.user.phone_number || "User"}
                      email={selectedMember.user.email || selectedMember.user.phone_number}
                      avatarUrl={selectedMember.user.avatar_url}
                      userId={selectedMember.user.id}
                      size={60}
                    />
                    <Text style={styles.memberName}>
                      {selectedMember.user.name || selectedMember.user.email || selectedMember.user.phone_number || "User"}
                    </Text>
                    <Text style={styles.balanceInfo}>
                      {(Number(selectedMember.owes_you) || 0) > 0
                        ? `Will pay you ₹${(Number(selectedMember.owes_you) || 0).toFixed(2)}`
                        : `You need to pay ₹${(Number(selectedMember.you_owe) || 0).toFixed(2)}`}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                      style={styles.input}
                      value={settleAmount}
                      onChangeText={(text) => {
                        // Allow only numbers and one decimal point
                        const cleaned = text.replace(/[^0-9.]/g, "");
                        // Ensure only one decimal point
                        const parts = cleaned.split(".");
                        if (parts.length > 2) {
                          setSettleAmount(parts[0] + "." + parts.slice(1).join(""));
                        } else {
                          setSettleAmount(cleaned);
                        }
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textTertiary}
                      editable={!isSettling}
                    />
                    <Text style={styles.hint}>
                      Maximum: ₹
                      {((Number(selectedMember.owes_you) || 0) > 0
                        ? (Number(selectedMember.owes_you) || 0)
                        : (Number(selectedMember.you_owe) || 0)
                      ).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add a note about this settlement..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      editable={!isSettling}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => !isSettling && setIsModalOpen(false)}
                      disabled={isSettling}
                      style={[styles.modalButton, styles.cancelButton]}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSettleUp}
                      disabled={isSettling || !settleAmount || parseFloat(settleAmount) <= 0}
                      style={[
                        styles.modalButton,
                        styles.confirmButton,
                        (isSettling || !settleAmount || parseFloat(settleAmount) <= 0) && styles.buttonDisabled,
                      ]}
                    >
                      {isSettling ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.confirmButtonText}>Settle Up</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>, isDark: boolean) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 24,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      color: colors.textSecondary,
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      minHeight: 400,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardsContainer: {
      // Container for cards with spacing
    },
    cardWrapper: {
      // Wrapper for individual cards
    },
    cardWrapperSpacing: {
      marginBottom: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 40 : 20,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    memberInfo: {
      alignItems: "center",
      marginBottom: 24,
    },
    memberName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    balanceInfo: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    hint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 6,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButton: {
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    confirmButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });

