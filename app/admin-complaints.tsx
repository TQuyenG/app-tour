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
<<<<<<< Updated upstream
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
=======
  Alert, Image, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
export default function AdminComplaintsScreen() {
=======
const STATUS_META: Record<ComplaintStatus, { label: string; color: string; bg: string }> = {
  pending:       { label: "Chờ xử lý",   color: "#d97706", bg: "#fef9c3" },
  investigating: { label: "Đang điều tra",color: "#2856d6", bg: "#eaf0ff" },
  resolved:      { label: "Đã giải quyết",color: "#16a34a", bg: "#dcfce7" },
  rejected:      { label: "Từ chối",     color: "#dc2626", bg: "#fee2e2" },
};
const TYPE_META: Record<ComplaintType, { label: string; icon: string; color: string }> = {
  guide:   { label: "HDV",       icon: "person-outline",    color: "#8b5cf6" },
  tour:    { label: "Tour",      icon: "map-outline",       color: "#2856d6" },
  payment: { label: "Thanh toán",icon: "card-outline",      color: "#dc2626" },
  app:     { label: "Ứng dụng",  icon: "phone-portrait-outline", color: "#64748b" },
  other:   { label: "Khác",      icon: "help-circle-outline",color: "#94a3b8" },
};
const PRIORITY_META = {
  high:   { label: "Cao",    color: "#dc2626", bg: "#fee2e2" },
  medium: { label: "Trung bình", color: "#d97706", bg: "#fef9c3" },
  low:    { label: "Thấp",   color: "#16a34a", bg: "#dcfce7" },
};

const TYPE_IMAGES: Record<string, string> = {
  "cp001": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "cp002": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80",
  "cp003": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "cp004": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=400&q=80",
  "cp005": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  "cp006": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80",
  "cp007": "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&q=80",
  "cp008": "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80",
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const FILTERS: ComplaintStatus[] = ["pending","investigating","resolved","rejected"];

export default function AdminComplaints() {
>>>>>>> Stashed changes
  const router = useRouter();
  const insets = useSafeAreaInsets();

<<<<<<< Updated upstream
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
=======
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@complaints").then(raw => {
      setComplaints(raw ? JSON.parse(raw) : SEED_COMPLAINTS);
      if (!raw) AsyncStorage.setItem("@complaints", JSON.stringify(SEED_COMPLAINTS)).catch(() => {});
    }).catch(() => setComplaints(SEED_COMPLAINTS));
  }, []));

  const persist = async (data: Complaint[]) => {
    setComplaints(data);
    // Ghi chung 1 key để admin + staff đồng bộ
    await AsyncStorage.setItem("@complaints", JSON.stringify(data)).catch(() => {});
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Khiếu nại & Tranh chấp</Text>
        {pending > 0 && (
          <View style={s.alertBadge}>
            <Text style={s.alertBadgeTxt}>{pending} chờ</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Tổng",       value: complaints.length,                             color: "#2856d6" },
          { label: "Chờ xử lý", value: pending,                                        color: "#d97706" },
          { label: "Ưu tiên cao",value: highPri,                                        color: "#dc2626" },
          { label: "Đã giải quyết",value: complaints.filter(c=>c.status==="resolved").length, color: "#16a34a" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        <TouchableOpacity style={[s.filterChip, filter === "all" && s.filterActive]} onPress={() => setFilter("all")}>
          <Text style={[s.filterTxt, filter === "all" && s.filterTxtActive]}>Tất cả</Text>
        </TouchableOpacity>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{STATUS_META[f].label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {filtered.map(c => {
          const sm = STATUS_META[c.status];
          const tm = TYPE_META[c.type];
          const pm = PRIORITY_META[c.priority];
          return (
            <TouchableOpacity key={c.id} style={[s.card, c.priority === "high" && c.status === "pending" && s.cardUrgent]} onPress={() => openDetail(c)} activeOpacity={0.85}>
              {/* Ảnh nền */}
              <View style={s.cImgWrap}>
                <Image
                  source={{ uri: TYPE_IMAGES[c.id] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80" }}
                  style={s.cImg}
                  resizeMode="cover"
                />
                <View style={s.cImgOverlay} />
                {/* Badge status + type trên ảnh */}
                <View style={s.cImgTop}>
                  <View style={[s.typeIconFloat, { backgroundColor: tm.color }]}>
                    <Ionicons name={tm.icon as any} size={14} color="#fff" />
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                    <Text style={[s.statusTxt, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>
                <View style={s.cImgBottom}>
                  <Text style={s.cImgId}>#{c.id}</Text>
                  <View style={[s.priorityBadge, { backgroundColor: pm.bg }]}>
                    <Text style={[s.priorityTxt, { color: pm.color }]}>Ưu tiên {pm.label}</Text>
                  </View>
                </View>
              </View>
              {/* Nội dung */}
              <View style={s.cBody}>
                <Text style={s.cardTitle} numberOfLines={1}>{c.title}</Text>
                <View style={s.cardGuestRow}>
                  <Ionicons name="person-outline" size={11} color="#7a8cc2" />
                  <Text style={s.cardGuest}>{c.guestName} · {c.createdAt}</Text>
                </View>
                <View style={s.cardMetaRow}>
                  <View style={[s.typeBadge, { backgroundColor: tm.color + "15" }]}>
                    <Text style={[s.typeTxt, { color: tm.color }]}>{tm.label}</Text>
                  </View>
                  {c.amount ? (
                    <View style={s.amountPill}>
                      <Text style={s.amountTxt}>{fmt(c.amount)}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={14} color="#c0cbe8" style={{ marginLeft: "auto" }} />
                </View>
              </View>
>>>>>>> Stashed changes
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-complaints" />
    </View>
  );
}

<<<<<<< Updated upstream
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
=======
const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:    { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  alertBadge:     { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  alertBadgeTxt:  { color: "#dc2626", fontWeight: "800", fontSize: 12 },
  summaryRow:     { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:    { alignItems: "center", flex: 1 },
  summaryValue:   { fontSize: 18, fontWeight: "900" },
  summaryLabel:   { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  filterRow:      { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:     { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:   { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt:      { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive:{ color: "#fff" },
  content:        { padding: 14, paddingTop: 0 },
  card:           { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10, overflow: "hidden", shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },  cardUrgent:     { borderColor: "#fecaca", backgroundColor: "#fffafa" },
  cardLeft:       { alignItems: "center" },
  typeIcon:       { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardTopRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardId:         { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  statusBadge:    { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:      { fontSize: 10, fontWeight: "700" },
  cardTitle:      { color: "#1f2a58", fontWeight: "800", fontSize: 13, marginBottom: 3 },
  cardGuest:      { color: "#7a8cc2", fontSize: 11, marginBottom: 6 },
  cardMetaRow:    { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  typeBadge:      { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeTxt:        { fontSize: 10, fontWeight: "700" },
  priorityBadge:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  priorityTxt:    { fontSize: 10, fontWeight: "700" },
  amountTxt:      { color: "#dc2626", fontWeight: "700", fontSize: 11 },
  emptyCard:      { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:       { color: "#7a8cc2" },
  // Modal
  modalOverlay:   { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  modalSheet:     { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalHandle:    { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:     { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn:       { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:      { padding: 20, paddingBottom: 40 },
  badgeRow:       { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  badge:          { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:       { fontSize: 11, fontWeight: "700" },
  detailRow:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon:     { width: 26, height: 26, borderRadius: 7, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  detailLabel:    { color: "#7a8cc2", fontSize: 12, width: 100 },
  detailValue:    { flex: 1, color: "#1f2a58", fontWeight: "600", fontSize: 12, textAlign: "right" },
  descBox:        { backgroundColor: "#f3f7ff", borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 12 },
  descTitle:      { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  descContent:    { color: "#5f73a9", fontSize: 13, lineHeight: 20 },
  noteLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  noteInput:      { backgroundColor: "#f3f7ff", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 12, paddingVertical: 10, color: "#1f2a58", fontSize: 13, minHeight: 80, marginBottom: 14 },
  actionsTitle:   { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  modalActionsGrid:{ flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  modalActionTxt: { fontSize: 12, fontWeight: "700" },
  // Card có ảnh
  cImgWrap:       { height: 110, marginHorizontal: -14, marginTop: -14, overflow: "hidden" },
  cImg:           { width: "100%", height: "100%" },
  cImgOverlay:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,20,60,0.3)" },
  cImgTop:        { position: "absolute", top: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cImgBottom:     { position: "absolute", bottom: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cImgId:         { color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.9 },
  typeIconFloat:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cBody:          { paddingTop: 10 },
  cardGuestRow:   { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  amountPill:     { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
>>>>>>> Stashed changes
});