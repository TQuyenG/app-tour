/**
 * app/guide-booking-management.tsx
 * Quản lý Booking - Xanh Royal, Bỏ thanh đen, Fix bộ lọc, Sync Data với Admin
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// DÙNG CHUNG KHO DỮ LIỆU VỚI ADMIN ĐỂ ĐỒNG BỘ
const STORAGE_KEY = "@app_bookings_history";

type BookingStatus = "pending" | "accepted" | "ongoing" | "done" | "cancelled" | "confirmed";

interface Booking {
  id: string; customerName: string; customerPhone: string; tourName: string;
  date: string; duration: string; guests: number; price: string; priceRaw?: number;
  status: BookingStatus; note: string; createdAt: string;
}

const SEED: Booking[] = [
  { id: "1", customerName: "Trần Thị B", customerPhone: "0901 111 222", tourName: "Tour Núi Bà Đen", date: "20/03/2025", duration: "1 ngày", guests: 4, price: "1200000", priceRaw: 1200000, status: "pending", note: "Khách cần hướng dẫn tiếng Anh.", createdAt: "5 giờ trước" },
  { id: "2", customerName: "Lê Văn C", customerPhone: "0912 333 444", tourName: "Tour Đà Lạt 2N1Đ", date: "22/03/2025", duration: "2 ngày 1 đêm", guests: 2, price: "2800000", priceRaw: 2800000, status: "accepted", note: "", createdAt: "Hôm qua" },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Chờ xác nhận", color: "#d97706", bg: "#fef9c3" },
  accepted: { label: "Đã nhận", color: "#4f7cff", bg: "#eaf0ff" },
  confirmed: { label: "Đã nhận", color: "#4f7cff", bg: "#eaf0ff" }, // Admin xài confirmed
  ongoing: { label: "Đang dẫn", color: "#a855f7", bg: "#f3e8ff" },
  done: { label: "Hoàn thành", color: "#10b981", bg: "#dcfce7" },
  cancelled: { label: "Đã hủy", color: "#ef4444", bg: "#fee2e2" },
};

const FILTERS = [
  { key: "all", label: "Tất cả" }, { key: "pending", label: "Chờ" },
  { key: "accepted", label: "Đã nhận" }, { key: "ongoing", label: "Đang dẫn" },
  { key: "done", label: "Xong" }, { key: "cancelled", label: "Hủy" },
];

export default function GuideBookingManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<Booking | null>(null);
  const [noteText, setNoteText] = useState("");

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "info" | "confirm"; title: string; message: string; onConfirm?: () => void;
  }>({ visible: false, type: "info", title: "", message: "" });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        // Map dữ liệu từ Admin sang chuẩn của Guide để không bị lỗi trống hiển thị
        const normalized = parsed.map((b: any) => ({
          ...b,
          customerName: b.customerName || "Khách hàng hệ thống",
          customerPhone: b.customerPhone || "09xx xxx xxx",
          tourName: b.tourName || "Tour OTA phân công",
          duration: b.duration || "Theo lịch trình",
          guests: b.guests || 2,
          price: b.price || (b.priceRaw ? b.priceRaw.toString() : "0"),
          status: b.status || "pending",
          note: b.note || "",
          createdAt: b.createdAt || "Hôm nay",
        }));
        setBookings(normalized);
      }
      else { setBookings(SEED); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); }
    }).catch(() => setBookings(SEED));
  }, []);

  const persist = useCallback(async (data: Booking[]) => {
    setBookings(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, []);

  const showPopup = (type: "info" | "confirm", title: string, message: string, onConfirm?: () => void) => {
    setConfirmPopup({ visible: true, type, title, message, onConfirm });
  };

  const updateStatus = (id: string, status: BookingStatus) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const stLabel = STATUS_MAP[status]?.label || "Cập nhật";
    showPopup("confirm", "Xác nhận", `Chuyển booking "${b.customerName}" sang "${stLabel}"?`, () => {
      persist(bookings.map((x) => (x.id === id ? { ...x, status } : x)));
    });
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter || (filter === "accepted" && b.status === "confirmed"));
  const pending = bookings.filter((b) => b.status === "pending").length;
  const totalEarned = bookings.filter((b) => b.status === "done").reduce((s, b) => s + Number(b.price || b.priceRaw || 0), 0);

  return (
    <View style={s.container}>
      {/* FIX THANH ĐEN BẰNG 2 LỆNH NÀY */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Booking</Text>
        {pending > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingTxt}>{pending} mới</Text>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        {[
          { l: "Tổng", v: bookings.length, c: "#1f2a58" },
          { l: "Chờ nhận", v: pending, c: "#d97706" },
          { l: "Đang dẫn", v: bookings.filter((b) => b.status === "ongoing").length, c: "#a855f7" },
          { l: "Thu nhập", v: `${(totalEarned / 1000000).toFixed(1)}tr`, c: "#10b981" },
        ].map((item, i, arr) => (
          <View key={item.l} style={[s.statItem, i < arr.length - 1 && s.statBorder]}>
            <Text style={[s.statNum, { color: item.c }]}>{item.v}</Text>
            <Text style={s.statLbl}>{item.l}</Text>
          </View>
        ))}
      </View>

      {/* ĐÃ FIX BỘ LỌC KHÔNG BỊ ĐÈ ÉP BẰNG flexGrow VÀ minHeight */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={s.filterRow}
        style={{ flexGrow: 0, minHeight: 64, maxHeight: 64 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[s.filterChip, filter === f.key && s.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.resultText}>{filtered.length} booking</Text>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="calendar-outline" size={56} color="#c0cbe8" />
            <Text style={s.emptyText}>Không có booking nào</Text>
          </View>
        )}
        {filtered.map((booking) => {
          const st = STATUS_MAP[booking.status] || STATUS_MAP["pending"];
          const isOpen = expandedId === booking.id;
          return (
            <TouchableOpacity key={booking.id} style={s.card} activeOpacity={0.88} onPress={() => setExpandedId(isOpen ? null : booking.id)}>
              {/* KHÔNG DÙNG DẢI MÀU CỨNG, DÙNG TAG BADGE GÓC TRÊN */}
              <View style={s.cardTopRow}>
                <View style={s.custRow}>
                  <View style={s.custAvatar}><Ionicons name="person" size={14} color="#4f7cff" /></View>
                  <View>
                    <Text style={s.custName}>{booking.customerName}</Text>
                    <Text style={s.custPhone}>{booking.customerPhone}</Text>
                  </View>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeTxt, { color: st.color }]}>{st.label}</Text></View>
              </View>
              
              <Text style={s.tourName}>{booking.tourName}</Text>
              
              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={12} color="#7a8cc2" />
                <Text style={s.metaTxt}>{booking.date}</Text>
                <Text style={s.dot}>·</Text>
                <Ionicons name="people-outline" size={12} color="#7a8cc2" />
                <Text style={s.metaTxt}>{booking.guests} khách</Text>
                <Text style={s.dot}>·</Text>
                <Text style={s.metaTxt}>{booking.duration}</Text>
              </View>
              
              <View style={s.cardBottom}>
                <Text style={s.price}>{Number(booking.price || booking.priceRaw || 0).toLocaleString("vi-VN")}đ</Text>
                <Text style={s.createdAt}>{booking.createdAt}</Text>
              </View>

              {isOpen && (
                <View style={s.expandSection}>
                  {!!booking.note && (
                    <View style={s.noteBox}>
                      <Ionicons name="document-text-outline" size={13} color="#4f7cff" />
                      <Text style={s.noteTxt}>{booking.note}</Text>
                    </View>
                  )}
                  <View style={s.actionRow}>
                    {booking.status === "pending" && (
                      <>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => updateStatus(booking.id, "accepted")}>
                          <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                          <Text style={[s.actionTxt, { color: "#10b981" }]}>Nhận tour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => updateStatus(booking.id, "cancelled")}>
                          <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                          <Text style={[s.actionTxt, { color: "#ef4444" }]}>Từ chối</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {(booking.status === "accepted" || booking.status === "confirmed") && (
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#f3e8ff" }]} onPress={() => updateStatus(booking.id, "ongoing")}>
                        <Ionicons name="play-circle-outline" size={14} color="#a855f7" />
                        <Text style={[s.actionTxt, { color: "#a855f7" }]}>Bắt đầu dẫn</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === "ongoing" && (
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => updateStatus(booking.id, "done")}>
                        <Ionicons name="flag-outline" size={14} color="#10b981" />
                        <Text style={[s.actionTxt, { color: "#10b981" }]}>Hoàn thành</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#eaf0ff" }]} onPress={() => { setNoteText(booking.note); setNoteModal(booking); }}>
                      <Ionicons name="create-outline" size={14} color="#4f7cff" />
                      <Text style={[s.actionTxt, { color: "#4f7cff" }]}>Ghi chú</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff" }]} onPress={() => showPopup("info", "Gọi điện", `${booking.customerName}\n${booking.customerPhone}`)}>
                      <Ionicons name="call-outline" size={14} color="#4f7cff" />
                      <Text style={[s.actionTxt, { color: "#4f7cff" }]}>Gọi khách</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MODAL GHI CHÚ */}
      <Modal visible={!!noteModal} animationType="slide" transparent onRequestClose={() => setNoteModal(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setNoteModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Ghi chú booking</Text>
              <TouchableOpacity onPress={() => setNoteModal(null)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <TextInput
                style={[s.input, { minHeight: 100, paddingTop: 12 }]} value={noteText} onChangeText={setNoteText}
                placeholder="Nhập ghi chú về booking..." multiline numberOfLines={4} placeholderTextColor="#b0bdd8" textAlignVertical="top" autoFocus
              />
              <TouchableOpacity style={s.saveBtn} onPress={() => {
                if (noteModal) { persist(bookings.map((x) => x.id === noteModal.id ? { ...x, note: noteText } : x)); setNoteModal(null); }
              }}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Lưu ghi chú</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CUSTOM POPUP CONFIRM */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <View style={[s.confirmIconWrap, confirmPopup.type === "confirm" && { backgroundColor: "#eaf0ff" }, confirmPopup.type === "info" && { backgroundColor: "#eaf0ff" }]}>
              <Ionicons name={confirmPopup.type === "confirm" ? "help-circle" : "information-circle"} size={32} color="#4f7cff" />
            </View>
            <Text style={s.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={s.confirmMessage}>{confirmPopup.message}</Text>

            {confirmPopup.type === "confirm" ? (
              <View style={s.confirmActionRow}>
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={s.confirmCancelBtnTxt}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmSubmitBtn} onPress={() => { if (confirmPopup.onConfirm) confirmPopup.onConfirm(); setConfirmPopup({ ...confirmPopup, visible: false }); }}>
                  <Text style={s.confirmSubmitBtnTxt}>Đồng ý</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={s.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-booking-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  pendingBadge: { backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pendingTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  statsRow: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#e4ebff" },
  statNum: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  statLbl: { fontSize: 10, color: "#7a8cc2", marginTop: 2, textAlign: "center" },
  
  // FIX BỘ LỌC
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  
  resultText: { color: "#7a8cc2", fontSize: 13, paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#7a8cc2", fontSize: 15, fontWeight: "600" },
  
  // FIX CARD UI (NO STRIPES)
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8 },
  custRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  custAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  custName: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  custPhone: { color: "#7a8cc2", fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  
  tourName: { color: "#4f7cff", fontWeight: "700", fontSize: 14, marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { color: "#7a8cc2", fontSize: 12 },
  dot: { color: "#c0cbe8", fontSize: 12 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  price: { color: "#10b981", fontWeight: "800", fontSize: 15 },
  createdAt: { color: "#94a8d8", fontSize: 11 },
  
  expandSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  noteTxt: { color: "#64748b", fontSize: 13, lineHeight: 20, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionTxt: { fontSize: 13, fontWeight: "700" },
  
  // Modals
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14 },
  saveBtn: { marginTop: 16, backgroundColor: "#4f7cff", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Custom Confirm Popup
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});