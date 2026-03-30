/**
 * app/guide-booking-management.tsx
 * Quản lý Booking - Xanh Royal, Dữ liệu thực 100%
 * ĐÃ BỔ SUNG: Hiển thị Đánh giá từ Khách hàng trong thẻ thông tin mở rộng (nếu tour đã hoàn thành)
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@guest_bookings";
const PROFILE_KEY = "@guide_profile";

type BookingStatus = "pending" | "paid" | "accepted" | "on-tour" | "completed" | "cancelled" | "rejected" | "confirmed";

interface Booking {
  id: string; customerName: string; customerPhone: string; tourName: string; tourId?: string;
  date: string; duration: string; guests: number; price: string; priceRaw?: number;
  status: BookingStatus; note: string; createdAt: string; startTime?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Sắp khởi hành", color: "#4f7cff", bg: "#eaf0ff" },
  paid: { label: "Sắp khởi hành", color: "#4f7cff", bg: "#eaf0ff" },
  accepted: { label: "Sắp khởi hành", color: "#4f7cff", bg: "#eaf0ff" },
  confirmed: { label: "Sắp khởi hành", color: "#4f7cff", bg: "#eaf0ff" }, 
  "on-tour": { label: "Đang dẫn", color: "#a855f7", bg: "#f3e8ff" },
  completed: { label: "Hoàn thành", color: "#10b981", bg: "#dcfce7" },
  cancelled: { label: "Đã hủy", color: "#ef4444", bg: "#fee2e2" },
  rejected: { label: "Đã hủy", color: "#ef4444", bg: "#fee2e2" },
};

const FILTERS = [
  { key: "all", label: "Tất cả" }, { key: "upcoming", label: "Sắp tới" }, { key: "on-tour", label: "Đang dẫn" },
  { key: "completed", label: "Xong" }, { key: "cancelled", label: "Hủy" },
];

export default function GuideBookingManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<any[]>([]); // THÊM STATE REVIEWS
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<Booking | null>(null);
  const [noteText, setNoteText] = useState("");

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "info" | "confirm"; title: string; message: string; onConfirm?: () => void;
  }>({ visible: false, type: "info", title: "", message: "" });

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      try {
        let gId = ""; let gName = "";
        const pRaw = await AsyncStorage.getItem(PROFILE_KEY);
        if (pRaw) {
          const p = JSON.parse(pRaw);
          gId = p.guideId || ""; gName = p.name || "";
        }

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const allBookings = JSON.parse(raw);
          const myBookings = allBookings.filter((b: any) => b.guideId === gId || b.guideName === gName);
          
          const normalized = myBookings.map((b: any) => ({
            ...b,
            customerName: b.customerName || b.guestName || "Khách hàng",
            customerPhone: b.customerPhone || b.phone || "09xx xxx xxx",
            tourName: b.tourName || "Tour chưa rõ",
            duration: b.duration || "Theo lịch trình",
            guests: b.guests || 1,
            price: b.totalAmount ? b.totalAmount.toString() : (b.price || (b.priceRaw ? b.priceRaw.toString() : "0")),
            status: b.status || "pending",
            note: b.note || "",
            createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : "Hôm nay",
            date: b.startTime ? new Date(b.startTime).toLocaleString('vi-VN') : (b.date || "Chưa xác định"),
          }));
          normalized.sort((a:any, b:any) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
          setBookings(normalized);
        } else { setBookings([]); }

        // TẢI DANH SÁCH ĐÁNH GIÁ (REVIEWS) TỪ CƠ SỞ DỮ LIỆU
        const rRaw = await AsyncStorage.getItem('@app_reviews');
        if (rRaw) setReviews(JSON.parse(rRaw));

      } catch (e) { console.error("Error loading bookings:", e); }
    };
    loadData();
  }, []));

  const showPopup = (type: "info" | "confirm", title: string, message: string, onConfirm?: () => void) => {
    setConfirmPopup({ visible: true, type, title, message, onConfirm });
  };

  const updateStatus = async (id: string, status: BookingStatus) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const stLabel = STATUS_MAP[status]?.label || "Cập nhật";
    
    showPopup("confirm", "Xác nhận", `Chuyển booking "${b.customerName}" sang "${stLabel}"?`, async () => {
      setBookings(prev => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
         const allBookings = JSON.parse(raw);
         const updatedAll = allBookings.map((x: any) => x.id === id ? { ...x, status } : x);
         await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll));
      }
    });
  };

  const saveNote = async () => {
    if (noteModal) { 
      setBookings(prev => prev.map((x) => x.id === noteModal.id ? { ...x, note: noteText } : x));
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
         const allBookings = JSON.parse(raw);
         const updatedAll = allBookings.map((x: any) => x.id === noteModal.id ? { ...x, note: noteText } : x);
         await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll));
      }
      setNoteModal(null); 
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return ["pending", "paid", "accepted", "confirmed"].includes(b.status);
    if (filter === "cancelled") return ["cancelled", "rejected"].includes(b.status);
    return b.status === filter;
  });

  const upcomingCount = bookings.filter((b) => ["pending", "paid", "accepted", "confirmed"].includes(b.status)).length;
  const totalEarned = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.price || b.priceRaw || 0), 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Lịch hẹn</Text>
        {upcomingCount > 0 && <View style={s.pendingBadge}><Text style={s.pendingTxt}>{upcomingCount} sắp tới</Text></View>}
      </View>

      <View style={s.statsRow}>
        {[
          { l: "Tổng", v: bookings.length, c: "#1f2a58" },
          { l: "Sắp tới", v: upcomingCount, c: "#4f7cff" },
          { l: "Đang dẫn", v: bookings.filter((b) => b.status === "on-tour").length, c: "#a855f7" },
          { l: "Thu nhập", v: `${(totalEarned / 1000000).toFixed(1)}tr`, c: "#10b981" },
        ].map((item, i, arr) => (
          <View key={item.l} style={[s.statItem, i < arr.length - 1 && s.statBorder]}><Text style={[s.statNum, { color: item.c }]}>{item.v}</Text><Text style={s.statLbl}>{item.l}</Text></View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 64, maxHeight: 64 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[s.filterChip, filter === f.key && s.filterActive]} onPress={() => setFilter(f.key)}>
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.resultText}>{filtered.length} booking</Text>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}><Ionicons name="calendar-outline" size={56} color="#c0cbe8" /><Text style={s.emptyText}>Chưa có booking nào</Text></View>
        )}
        {filtered.map((booking) => {
          const st = STATUS_MAP[booking.status] || STATUS_MAP["pending"];
          const isOpen = expandedId === booking.id;
          
          return (
            <TouchableOpacity key={booking.id} style={s.card} activeOpacity={0.88} onPress={() => setExpandedId(isOpen ? null : booking.id)}>
              <View style={s.cardTopRow}>
                <View style={s.custRow}>
                  <View style={s.custAvatar}><Ionicons name="person" size={14} color="#4f7cff" /></View>
                  <View><Text style={s.custName}>{booking.customerName}</Text><Text style={s.custPhone}>{booking.customerPhone}</Text></View>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeTxt, { color: st.color }]}>{st.label}</Text></View>
              </View>
              
              <TouchableOpacity onPress={() => router.push({ pathname: '/tour/[id]', params: { id: booking.tourId || '' } } as any)}>
                <Text style={s.tourName}>{booking.tourName} <Ionicons name="open-outline" size={12} /></Text>
              </TouchableOpacity>
              
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
                  
                  {/* TÌM VÀ HIỂN THỊ ĐÁNH GIÁ CỦA KHÁCH NẾU CÓ */}
                  {(() => {
                     const rv = reviews.find(r => String(r.bookingId) === String(booking.id));
                     if (!rv) return null;
                     return (
                       <View style={s.reviewSection}>
                         <View style={s.reviewHeader}>
                            <Ionicons name="star" size={14} color="#d97706" />
                            <Text style={s.reviewTitle}>Khách đã đánh giá</Text>
                         </View>
                         <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                            <Text style={s.reviewStats}>Tour: <Text style={{fontWeight:'bold'}}>{Number(rv.tourRating || 5).toFixed(1)}</Text></Text>
                            <Text style={s.reviewStats}>Phục vụ: <Text style={{fontWeight:'bold'}}>{Number(rv.guideRating || rv.overallRating || rv.rating || 5).toFixed(1)}</Text></Text>
                         </View>
                         <Text style={s.reviewText}>"{rv.reviewText || rv.comment || 'Không có nhận xét'}"</Text>
                         {rv.tipAmount > 0 && <Text style={s.reviewTip}>+ Tiền Tip: {Number(rv.tipAmount).toLocaleString("vi-VN")}đ</Text>}
                       </View>
                     );
                  })()}

                  {!!booking.note && (
                    <View style={s.noteBox}><Ionicons name="document-text-outline" size={13} color="#4f7cff" /><Text style={s.noteTxt}>{booking.note}</Text></View>
                  )}
                  
                  <TouchableOpacity style={s.detailBtn} onPress={() => router.push({ pathname: '/shared-booking-detail', params: { bookingId: booking.id } } as any)}>
                    <Text style={s.detailBtnTxt}>Xem chi tiết & Cập nhật lộ trình</Text>
                  </TouchableOpacity>

                  <View style={s.actionRow}>
                    {["pending", "paid", "accepted", "confirmed"].includes(booking.status) && (
                      <>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#f3e8ff" }]} onPress={() => updateStatus(booking.id, "on-tour")}><Ionicons name="play-circle-outline" size={14} color="#a855f7" /><Text style={[s.actionTxt, { color: "#a855f7" }]}>Bắt đầu dẫn</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => updateStatus(booking.id, "cancelled")}><Ionicons name="close-circle-outline" size={14} color="#ef4444" /><Text style={[s.actionTxt, { color: "#ef4444" }]}>Hủy tour</Text></TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" }]} onPress={() => router.push('/guide_chat_list' as any)}><Ionicons name="chatbubbles-outline" size={14} color="#4f7cff" /><Text style={[s.actionTxt, { color: "#4f7cff" }]}>Chat ngay</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" }]} onPress={() => showPopup("info", "Gọi điện", `${booking.customerName}\n${booking.customerPhone}`)}><Ionicons name="call-outline" size={14} color="#4f7cff" /><Text style={[s.actionTxt, { color: "#4f7cff" }]}>Gọi khách</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={!!noteModal} animationType="slide" transparent onRequestClose={() => setNoteModal(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setNoteModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Ghi chú booking</Text>
              <TouchableOpacity onPress={() => setNoteModal(null)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <TextInput style={[s.input, { minHeight: 100, paddingTop: 12 }]} value={noteText} onChangeText={setNoteText} placeholder="Nhập ghi chú về booking..." multiline numberOfLines={4} placeholderTextColor="#b0bdd8" textAlignVertical="top" autoFocus />
              <TouchableOpacity style={s.saveBtn} onPress={saveNote}><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.saveBtnTxt}>Lưu ghi chú</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={s.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={s.confirmSubmitBtn} onPress={() => { if (confirmPopup.onConfirm) confirmPopup.onConfirm(); setConfirmPopup({ ...confirmPopup, visible: false }); }}><Text style={s.confirmSubmitBtnTxt}>Đồng ý</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={s.confirmSingleBtnTxt}>Đóng</Text></TouchableOpacity>
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
  pendingBadge: { backgroundColor: "#eaf0ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pendingTxt: { color: "#4f7cff", fontWeight: "800", fontSize: 12 },
  statsRow: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#e4ebff" },
  statNum: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  statLbl: { fontSize: 10, color: "#7a8cc2", marginTop: 2, textAlign: "center" },
  
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  
  resultText: { color: "#7a8cc2", fontSize: 13, paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#7a8cc2", fontSize: 15, fontWeight: "600" },
  
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8 },
  custRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  custAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  custName: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  custPhone: { color: "#7a8cc2", fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  
  tourName: { color: "#4f7cff", fontWeight: "800", fontSize: 15, marginBottom: 8, textDecorationLine: "underline" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { color: "#7a8cc2", fontSize: 12 },
  dot: { color: "#c0cbe8", fontSize: 12 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  price: { color: "#10b981", fontWeight: "800", fontSize: 15 },
  createdAt: { color: "#94a8d8", fontSize: 11 },
  
  expandSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f4ff" },

  reviewSection: { backgroundColor: "#fffbeb", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#fde68a" },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  reviewTitle: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  reviewStats: { color: "#92400e", fontSize: 11 },
  reviewText: { color: "#92400e", fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' },
  reviewTip: { color: "#16a34a", fontSize: 11, fontWeight: "700", marginTop: 4 },

  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  noteTxt: { color: "#64748b", fontSize: 13, lineHeight: 20, flex: 1 },
  detailBtn: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e4ebff' },
  detailBtnTxt: { color: '#1f2a58', fontWeight: '800', fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionTxt: { fontSize: 13, fontWeight: "700" },
  
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.5)" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14 },
  saveBtn: { marginTop: 16, backgroundColor: "#4f7cff", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

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