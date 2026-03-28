/**
 * app/guest_refund.tsx
 * Khách yêu cầu hoàn tiền và theo dõi trạng thái
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Booking {
  id: string; tourName: string; totalAmount: number;
  status: string; tourDate: string; guideName?: string;
}
interface RefundRequest {
  id: string; bookingId: string; tourName: string;
  amount: number; reason: string; reasonType: string;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string; resolvedAt?: string; note?: string;
}

const REASON_TYPES = [
  { id: "cancel",   label: "Tôi muốn hủy tour",          icon: "close-circle-outline",  color: "#dc2626" },
  { id: "guide",    label: "Vấn đề với HDV",              icon: "person-outline",        color: "#8b5cf6" },
  { id: "quality",  label: "Chất lượng không đúng mô tả", icon: "alert-circle-outline",  color: "#f59e0b" },
  { id: "payment",  label: "Lỗi thanh toán / tính 2 lần", icon: "card-outline",          color: "#ef4444" },
  { id: "weather",  label: "Tour bị hủy do thời tiết",    icon: "thunderstorm-outline",  color: "#06b6d4" },
  { id: "other",    label: "Lý do khác",                  icon: "help-circle-outline",   color: "#64748b" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: "Chờ duyệt",    color: "#d97706", bg: "#fef9c3", icon: "time-outline" },
  approved:   { label: "Đã duyệt",     color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  rejected:   { label: "Từ chối",      color: "#dc2626", bg: "#fee2e2", icon: "close-circle-outline" },
  processing: { label: "Đang xử lý",  color: "#2856d6", bg: "#eaf0ff", icon: "refresh-outline" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

const SEED_REFUNDS: RefundRequest[] = [
  { id: "rf001", bookingId: "BK001005", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng",  amount: 4600000,  reason: "Gia đình có việc đột xuất không đi được",          reasonType: "cancel",  status: "approved",   createdAt: "05/04/2026", resolvedAt: "07/04/2026", note: "Đã duyệt hoàn 80% theo chính sách hủy trước 3 ngày." },
  { id: "rf002", bookingId: "BK001003", tourName: "Nha Trang 3N2Đ - Lặn san hô",    amount: 13160000, reason: "HDV không đúng hẹn, chất lượng tour kém hơn mô tả", reasonType: "guide",   status: "pending",    createdAt: "12/04/2026" },
  { id: "rf003", bookingId: "BK001002", tourName: "Phú Quốc 4N3Đ - Resort biển xanh",amount: 9380000, reason: "Thẻ bị tính tiền 2 lần, cần hoàn 1 lần",            reasonType: "payment", status: "processing", createdAt: "10/04/2026" },
];

export default function GuestRefund() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab]               = useState<"request" | "history">("history");
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [refunds, setRefunds]       = useState<RefundRequest[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedReason, setSelectedReason]   = useState("");
  const [reasonText, setReasonText]           = useState("");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guest_bookings").then(raw => {
      if (raw) {
        const all: Booking[] = JSON.parse(raw);
        setBookings(all.filter(b => ["completed","cancelled","on_tour","paid","guide_accepted"].includes(b.status)));
      }
    }).catch(() => {});
    AsyncStorage.getItem("@guest_refunds").then(raw => {
      setRefunds(raw ? JSON.parse(raw) : SEED_REFUNDS);
    }).catch(() => setRefunds(SEED_REFUNDS));
  }, []));

  const submitRefund = async () => {
    if (!selectedBooking) { Alert.alert("Thiếu", "Vui lòng chọn booking cần hoàn tiền."); return; }
    if (!selectedReason)  { Alert.alert("Thiếu", "Vui lòng chọn lý do."); return; }
    if (!reasonText.trim()){ Alert.alert("Thiếu", "Vui lòng mô tả chi tiết lý do."); return; }

    Alert.alert(
      "Xác nhận yêu cầu hoàn tiền",
      `Tour: ${selectedBooking.tourName}\nSố tiền: ${fmt(selectedBooking.totalAmount)}\nLý do: ${REASON_TYPES.find(r=>r.id===selectedReason)?.label}\n\nYêu cầu sẽ được CSKH xem xét trong 1-3 ngày làm việc.`,
      [
        { text: "Hủy bỏ", style: "cancel" },
        {
          text: "Gửi yêu cầu", onPress: async () => {
            const newRefund: RefundRequest = {
              id: `rf${Date.now()}`,
              bookingId: selectedBooking.id,
              tourName: selectedBooking.tourName,
              amount: selectedBooking.totalAmount,
              reason: reasonText.trim(),
              reasonType: selectedReason,
              status: "pending",
              createdAt: new Date().toLocaleDateString("vi-VN"),
            };
            const updated = [newRefund, ...refunds];
            setRefunds(updated);
            await AsyncStorage.setItem("@guest_refunds", JSON.stringify(updated)).catch(() => {});
            // Ghi vào staff refunds
            const sRaw = await AsyncStorage.getItem("@staff_refunds").catch(() => null);
            const sList = sRaw ? JSON.parse(sRaw) : [];
            sList.unshift({ ...newRefund, guestName: "Khách hàng" });
            await AsyncStorage.setItem("@staff_refunds", JSON.stringify(sList)).catch(() => {});
            // Notification
            const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
            const nList = nRaw ? JSON.parse(nRaw) : [];
            nList.unshift({ id: `n${Date.now()}`, message: `✅ Yêu cầu hoàn tiền #${newRefund.id} đã được gửi. CSKH sẽ phản hồi trong 1-3 ngày.`, read: false, createdAt: new Date().toISOString() });
            await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
            setSelectedBooking(null);
            setSelectedReason("");
            setReasonText("");
            setTab("history");
            Alert.alert("✅ Đã gửi yêu cầu", "CSKH sẽ liên hệ bạn trong 1-3 ngày làm việc.");
          },
        },
      ]
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Yêu cầu Hoàn tiền</Text>
        {refunds.filter(r => r.status === "pending").length > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingBadgeTxt}>{refunds.filter(r=>r.status==="pending").length} chờ</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Tổng yêu cầu", value: refunds.length,                                  color: "#2856d6" },
          { label: "Chờ duyệt",    value: refunds.filter(r=>r.status==="pending").length,   color: "#d97706" },
          { label: "Đã duyệt",     value: refunds.filter(r=>r.status==="approved").length,  color: "#16a34a" },
          { label: "Tổng hoàn",    value: `${(refunds.filter(r=>r.status==="approved").reduce((s,r)=>s+r.amount,0)/1000000).toFixed(1)}tr`, color: "#4f7cff" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")}>
          <Text style={[s.tabBtnTxt, tab === "history" && s.tabBtnTxtActive]}>Lịch sử ({refunds.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "request" && s.tabBtnActive]} onPress={() => setTab("request")}>
          <Ionicons name="add-circle-outline" size={14} color={tab === "request" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabBtnTxt, tab === "request" && s.tabBtnTxtActive]}>Tạo yêu cầu mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        {tab === "history" ? (
          <>
            {refunds.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="refresh-outline" size={48} color="#c0cbe8" />
                <Text style={s.emptyTxt}>Chưa có yêu cầu hoàn tiền nào</Text>
                <TouchableOpacity style={s.newBtn} onPress={() => setTab("request")}>
                  <Text style={s.newBtnTxt}>Tạo yêu cầu mới</Text>
                </TouchableOpacity>
              </View>
            )}
            {refunds.map(r => {
              const meta = STATUS_META[r.status];
              const reasonMeta = REASON_TYPES.find(x => x.id === r.reasonType);
              return (
                <View key={r.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardId}>#{r.id}</Text>
                    <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={s.tourName}>{r.tourName}</Text>
                  <Text style={s.amount}>{fmt(r.amount)}</Text>
                  {reasonMeta && (
                    <View style={s.reasonRow}>
                      <Ionicons name={reasonMeta.icon as any} size={13} color={reasonMeta.color} />
                      <Text style={s.reasonTxt}>{reasonMeta.label}</Text>
                    </View>
                  )}
                  <Text style={s.descTxt} numberOfLines={2}>{r.reason}</Text>
                  {r.note && (
                    <View style={s.noteBox}>
                      <Ionicons name="information-circle-outline" size={13} color="#2856d6" />
                      <Text style={s.noteTxt}>{r.note}</Text>
                    </View>
                  )}
                  <View style={s.dateRow}>
                    <Text style={s.dateTxt}>Gửi: {r.createdAt}</Text>
                    {r.resolvedAt && <Text style={s.dateTxt}>Giải quyết: {r.resolvedAt}</Text>}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            {/* Bước 1: Chọn booking */}
            <Text style={s.stepTitle}>1. Chọn booking cần hoàn tiền</Text>
            {bookings.length === 0 ? (
              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color="#4f7cff" />
                <Text style={s.hintTxt}>Không tìm thấy booking phù hợp. Hãy đặt tour trước.</Text>
              </View>
            ) : (
              bookings.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[s.bookingPick, selectedBooking?.id === b.id && s.bookingPickActive]}
                  onPress={() => setSelectedBooking(b)}
                >
                  <View style={s.bookingPickIcon}>
                    <Ionicons name="airplane-outline" size={18} color={selectedBooking?.id === b.id ? "#fff" : "#4f7cff"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bookingPickName, selectedBooking?.id === b.id && { color: "#fff" }]} numberOfLines={1}>{b.tourName}</Text>
                    <Text style={[s.bookingPickMeta, selectedBooking?.id === b.id && { color: "rgba(255,255,255,0.8)" }]}>#{b.id} · {fmt(b.totalAmount)}</Text>
                  </View>
                  {selectedBooking?.id === b.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              ))
            )}

            {/* Bước 2: Chọn lý do */}
            <Text style={s.stepTitle}>2. Lý do hoàn tiền</Text>
            <View style={s.reasonGrid}>
              {REASON_TYPES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.reasonCard, selectedReason === r.id && s.reasonCardActive, selectedReason === r.id && { borderColor: r.color }]}
                  onPress={() => setSelectedReason(r.id)}
                >
                  <Ionicons name={r.icon as any} size={20} color={selectedReason === r.id ? r.color : "#94a3b8"} />
                  <Text style={[s.reasonLabel, selectedReason === r.id && { color: r.color, fontWeight: "700" }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bước 3: Mô tả chi tiết */}
            <Text style={s.stepTitle}>3. Mô tả chi tiết</Text>
            <TextInput
              style={s.reasonInput}
              value={reasonText}
              onChangeText={setReasonText}
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải để CSKH xử lý nhanh hơn..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#b0bdd8"
            />

            <View style={s.policyBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" />
              <Text style={s.policyTxt}>Hủy trước 3 ngày: hoàn 80% · Hủy trước 1 ngày: hoàn 50% · Hủy cùng ngày: hoàn 20%</Text>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, (!selectedBooking || !selectedReason || !reasonText.trim()) && s.submitBtnOff]}
              onPress={submitRefund}
              disabled={!selectedBooking || !selectedReason || !reasonText.trim()}
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={s.submitBtnTxt}>Gửi yêu cầu hoàn tiền</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  pendingBadge:    { backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  summaryRow:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:     { alignItems: "center", flex: 1 },
  summaryValue:    { fontSize: 16, fontWeight: "900" },
  summaryLabel:    { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  tabRow:          { flexDirection: "row", margin: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabBtnActive:    { backgroundColor: "#4f7cff" },
  tabBtnTxt:       { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  tabBtnTxtActive: { color: "#fff" },
  content:         { padding: 14, paddingTop: 0 },
  emptyCard:       { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:        { color: "#7a8cc2" },
  newBtn:          { backgroundColor: "#4f7cff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  newBtnTxt:       { color: "#fff", fontWeight: "700" },
  card:            { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardId:          { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  statusBadge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt:       { fontSize: 11, fontWeight: "700" },
  tourName:        { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 3 },
  amount:          { color: "#dc2626", fontWeight: "900", fontSize: 16, marginBottom: 6 },
  reasonRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  reasonTxt:       { color: "#5f73a9", fontSize: 12, fontWeight: "600" },
  descTxt:         { color: "#7a8cc2", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  noteBox:         { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#eaf0ff", borderRadius: 8, padding: 8, marginBottom: 6 },
  noteTxt:         { flex: 1, color: "#2856d6", fontSize: 11, lineHeight: 16 },
  dateRow:         { flexDirection: "row", justifyContent: "space-between" },
  dateTxt:         { color: "#94a3b8", fontSize: 11 },
  stepTitle:       { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 10, marginTop: 6 },
  hintBox:         { flexDirection: "row", gap: 8, backgroundColor: "#edf2ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  hintTxt:         { flex: 1, color: "#4f7cff", fontSize: 13 },
  bookingPick:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  bookingPickActive:{ backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  bookingPickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  bookingPickName: { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  bookingPickMeta: { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  reasonGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  reasonCard:      { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e4ebff", padding: 10 },
  reasonCardActive:{ backgroundColor: "#f8faff" },
  reasonLabel:     { flex: 1, color: "#7a8cc2", fontSize: 11, lineHeight: 16 },
  reasonInput:     { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 14, minHeight: 110, marginBottom: 12 },
  policyBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, marginBottom: 14 },
  policyTxt:       { flex: 1, color: "#166534", fontSize: 12, lineHeight: 18 },
  submitBtn:       { height: 52, borderRadius: 14, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  submitBtnOff:    { backgroundColor: "#c0cbe8", elevation: 0, shadowOpacity: 0 },
  submitBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 15 },
});