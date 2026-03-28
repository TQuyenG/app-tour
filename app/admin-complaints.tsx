/**
 * app/admin-complaints.tsx
 * Admin xử lý khiếu nại của khách hàng
 * Fix lỗi nút Back, chuẩn UI Xanh Dương, Custom Popup
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_complaints";

interface Complaint {
  id: string; userName: string; tourName: string; date: string;
  issue: string; status: "pending" | "resolved"; reply?: string;
}

const SEED: Complaint[] = [
  { id: "cp-1", userName: "Nguyễn An", tourName: "Đà Lạt 3N2Đ", date: "28/03/2026", issue: "HDV đến trễ 30 phút so với giờ hẹn, thái độ không tốt.", status: "pending" },
  { id: "cp-2", userName: "Lê Cúc", tourName: "Phú Quốc 4N3Đ", date: "25/03/2026", issue: "Phòng khách sạn không giống như trong hình quảng cáo.", status: "resolved", reply: "Chúng tôi đã làm việc với đối tác khách sạn và hoàn lại 20% chi phí cho quý khách." }
];

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState("");

  const [confirmPopup, setConfirmPopup] = useState<{ visible: boolean; type: "success"|"error"; title: string; message: string; }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setComplaints(JSON.parse(raw) || []);
      else { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); setComplaints(SEED); }
    } catch (e) { setComplaints([]); }
  };

  const handleResolve = async () => {
    if (!selected) return;
    if (!replyText.trim()) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Vui lòng nhập nội dung phản hồi cho khách hàng." });
      return;
    }
    try {
      const updated = complaints.map(c => c.id === selected.id ? { ...c, status: "resolved" as const, reply: replyText } : c);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setComplaints(updated);
      setSelected(null);
      setReplyText("");
      setConfirmPopup({ visible: true, type: "success", title: "Đã xử lý", message: "Khiếu nại đã được đánh dấu là Đã xử lý." });
    } catch (error) {}
  };

  const filtered = complaints.filter(c => filter === "all" || c.status === filter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        {/* FIX LỖI: Trở về đúng trang admin-home */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ & Khiếu nại</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filtersWrapper}>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterBtn, filter === "pending" && styles.filterBtnActive]} onPress={() => setFilter("pending")}>
            <Text style={[styles.filterTxt, filter === "pending" && styles.filterTxtActive]}>Chờ xử lý</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, filter === "resolved" && styles.filterBtnActive]} onPress={() => setFilter("resolved")}>
            <Text style={[styles.filterTxt, filter === "resolved" && styles.filterTxtActive]}>Đã xử lý</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, filter === "all" && styles.filterBtnActive]} onPress={() => setFilter("all")}>
            <Text style={[styles.filterTxt, filter === "all" && styles.filterTxtActive]}>Tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#c0cbe8" />
            <Text style={styles.emptyTxt}>Tuyệt vời! Không có khiếu nại nào.</Text>
          </View>
        ) : (
          filtered.map(item => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => { setSelected(item); setReplyText(item.reply || ""); }} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                  <Ionicons name="person-circle" size={20} color="#4f7cff" />
                  <Text style={styles.userName}>{item.userName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === "resolved" ? "#d1fae5" : "#fee2e2" }]}>
                  <Text style={[styles.statusTxt, { color: item.status === "resolved" ? "#059669" : "#dc2626" }]}>
                    {item.status === "resolved" ? "Đã xử lý" : "Chờ xử lý"}
                  </Text>
                </View>
              </View>
              <Text style={styles.tourName}>Tour: {item.tourName}</Text>
              <Text style={styles.issueTxt} numberOfLines={2}>"{item.issue}"</Text>
              <Text style={styles.dateTxt}>{item.date}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal Phản hồi */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết Khiếu nại</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={24} color="#1f2a58" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.issueBox}>
                    <Text style={styles.issueBoxLabel}>Khách hàng: {selected.userName}</Text>
                    <Text style={styles.issueBoxTour}>{selected.tourName}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.issueContent}>"{selected.issue}"</Text>
                  </View>

                  <Text style={styles.inputLabel}>Phản hồi / Hướng xử lý</Text>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Nhập nội dung xử lý để báo lại cho khách..."
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    editable={selected.status === "pending"}
                  />

                  {selected.status === "pending" ? (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleResolve}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.saveBtnTxt}>Đánh dấu Đã xử lý</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.resolvedNote}>
                      <Ionicons name="shield-checkmark" size={18} color="#059669" />
                      <Text style={styles.resolvedNoteTxt}>Khiếu nại này đã được đóng.</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, { backgroundColor: confirmPopup.type === "success" ? "#d1fae5" : "#fee2e2" }]}>
              <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={32} color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"} />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
              <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-complaints" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  filtersWrapper: { paddingHorizontal: 16, paddingBottom: 10 },
  filterRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  filterBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  filterBtnActive: { backgroundColor: "#eaf0ff" },
  filterTxt: { fontSize: 13, fontWeight: "600", color: "#94a8d8" },
  filterTxtActive: { color: "#4f7cff", fontWeight: "800" },

  content: { padding: 16, paddingBottom: 100 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyTxt: { color: "#94a8d8", marginTop: 10, fontSize: 14 },
  
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  tourName: { fontSize: 13, color: "#4f7cff", fontWeight: "600", marginBottom: 8 },
  issueTxt: { fontSize: 14, color: "#64748b", fontStyle: "italic", marginBottom: 10, lineHeight: 20 },
  dateTxt: { fontSize: 11, color: "#94a8d8", textAlign: "right" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  issueBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#fecaca" },
  issueBoxLabel: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
  issueBoxTour: { color: "#b91c1c", fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#fca5a5", marginVertical: 10 },
  issueContent: { color: "#7f1d1d", fontSize: 15, fontStyle: "italic", lineHeight: 22 },
  
  inputLabel: { fontSize: 14, fontWeight: "800", color: "#1f2a58", marginBottom: 8 },
  replyInput: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, height: 120, textAlignVertical: "top", color: "#1f2a58", fontSize: 14 },
  
  saveBtn: { backgroundColor: "#10b981", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  resolvedNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, padding: 16, backgroundColor: "#d1fae5", borderRadius: 12 },
  resolvedNoteTxt: { color: "#059669", fontWeight: "700" },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center" },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});