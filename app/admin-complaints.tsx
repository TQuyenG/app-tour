/**
 * app/admin-complaints.tsx
 * Admin xử lý khiếu nại và tranh chấp
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

type ComplaintStatus = "pending" | "investigating" | "resolved" | "rejected";
type ComplaintType   = "guide" | "tour" | "payment" | "app" | "other";

interface Complaint {
  id: string; guestName: string; guestEmail: string;
  type: ComplaintType; title: string; description: string;
  bookingId?: string; amount?: number;
  status: ComplaintStatus; priority: "low" | "medium" | "high";
  createdAt: string; resolvedAt?: string;
  adminNote?: string; assignedTo?: string;
  voucherSent?: boolean;
}

const SEED_COMPLAINTS: Complaint[] = [
  { id: "cp001", guestName: "Nguyễn An",       guestEmail: "guest1@gmail.com", type: "guide",   title: "HDV đến trễ 2 tiếng",                  description: "Hướng dẫn viên Trần Minh Khoa đến trễ 2 tiếng so với lịch hẹn 08:00, làm tôi lỡ mất buổi tham quan buổi sáng. Rất thất vọng.",                     bookingId: "BK001001", amount: 8970000,  status: "pending",       priority: "high",   createdAt: "12/04/2026" },
  { id: "cp002", guestName: "Trần Văn Bình",   guestEmail: "guest2@gmail.com", type: "payment", title: "Bị tính tiền 2 lần",                    description: "Tôi đặt tour Phú Quốc nhưng thẻ bị trừ tiền 2 lần. Mỗi lần 4.690.000đ, tổng bị trừ 9.380.000đ thay vì 4.690.000đ như bình thường.",         bookingId: "BK001002", amount: 4690000,  status: "investigating", priority: "high",   createdAt: "11/04/2026", assignedTo: "Staff CSKH" },
  { id: "cp003", guestName: "Lê Thị Cúc",      guestEmail: "guest3@gmail.com", type: "tour",    title: "Tour không đúng mô tả",                 description: "Tour Nha Trang quảng cáo có lặn biển ngắm san hô nhưng thực tế không có hoạt động này. Hướng dẫn viên nói do thời tiết nhưng không thông báo trước.",  bookingId: "BK001003", amount: 13160000, status: "resolved",      priority: "medium", createdAt: "10/04/2026", resolvedAt: "11/04/2026", adminNote: "Đã hoàn 30% theo chính sách.", voucherSent: true },
  { id: "cp004", guestName: "Hoàng Thị Emly",  guestEmail: "guest5@gmail.com", type: "guide",   title: "HDV thiếu chuyên nghiệp",               description: "HDV Đỗ Trúc Ly liên tục dùng điện thoại trong suốt chuyến đi, không giải thích địa điểm tham quan, thái độ không nhiệt tình với khách.",        bookingId: "BK001005", amount: 4600000,  status: "pending",       priority: "medium", createdAt: "09/04/2026" },
  { id: "cp005", guestName: "Vũ Minh Phong",   guestEmail: "guest6@gmail.com", type: "payment", title: "Chưa nhận được tiền hoàn",              description: "Tôi đã yêu cầu hủy tour và được thông báo hoàn tiền trong 3-5 ngày từ ngày 01/04 nhưng đến nay đã 11 ngày vẫn chưa nhận được.",               bookingId: "BK001006", amount: 21000000, status: "investigating", priority: "high",   createdAt: "08/04/2026", assignedTo: "Admin" },
  { id: "cp006", guestName: "Đinh Thị Giang",  guestEmail: "guest7@gmail.com", type: "app",     title: "Lỗi ứng dụng không đặt được tour",     description: "Khi tôi cố gắng đặt tour Hạ Long, ứng dụng liên tục báo lỗi 'Không thể kết nối' và không hoàn tất được đặt chỗ. Tôi đã thử 5 lần.",                                          amount: 0,        status: "resolved",      priority: "low",    createdAt: "07/04/2026", resolvedAt: "08/04/2026", adminNote: "Lỗi cache, đã được fix trong version 2.1.1." },
  { id: "cp007", guestName: "Bùi Văn Hào",     guestEmail: "guest8@gmail.com", type: "tour",    title: "Khách sạn không đúng loại đặt",         description: "Tour Sapa đặt phòng khách sạn 3 sao nhưng thực tế xếp vào nhà nghỉ bình dân. Điều kiện vệ sinh không đảm bảo.",                                bookingId: "BK001004", amount: 7180000,  status: "rejected",      priority: "medium", createdAt: "06/04/2026", resolvedAt: "07/04/2026", adminNote: "Khách sạn 3 sao đã đầy, đối tác đã sắp xếp thay thế tương đương." },
  { id: "cp008", guestName: "Phạm Quốc Dũng",  guestEmail: "guest4@gmail.com", type: "other",   title: "Không nhận được email xác nhận",        description: "Sau khi đặt và thanh toán thành công, tôi không nhận được email xác nhận booking. Đã kiểm tra spam nhưng không có.",                           bookingId: "BK001007", amount: 3800000,  status: "pending",       priority: "low",    createdAt: "05/04/2026" },
];

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

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const FILTERS: ComplaintStatus[] = ["pending","investigating","resolved","rejected"];

export default function AdminComplaints() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints]     = useState<Complaint[]>([]);
  const [filter, setFilter]             = useState<"all" | ComplaintStatus>("all");
  const [selected, setSelected]         = useState<Complaint | null>(null);
  const [showDetail, setShowDetail]     = useState(false);
  const [adminNote, setAdminNote]       = useState("");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@admin_complaints").then(raw => {
      setComplaints(raw ? JSON.parse(raw) : SEED_COMPLAINTS);
    }).catch(() => setComplaints(SEED_COMPLAINTS));
  }, []));

  const persist = async (data: Complaint[]) => {
    setComplaints(data);
    await AsyncStorage.setItem("@admin_complaints", JSON.stringify(data)).catch(() => {});
  };

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setAdminNote(c.adminNote || "");
    setShowDetail(true);
  };

  const updateStatus = (id: string, status: ComplaintStatus) => {
    Alert.alert(
      "Cập nhật trạng thái",
      `Chuyển sang "${STATUS_META[status].label}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận", onPress: async () => {
            const updated = complaints.map(c =>
              c.id === id ? { ...c, status, adminNote: adminNote || c.adminNote, resolvedAt: (status === "resolved" || status === "rejected") ? new Date().toLocaleDateString("vi-VN") : undefined } : c
            );
            await persist(updated);
            if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
            // Notify guest
            const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
            const nList = nRaw ? JSON.parse(nRaw) : [];
            nList.unshift({ id: `n${Date.now()}`, message: `Khiếu nại #${id} của bạn đã được cập nhật: ${STATUS_META[status].label}`, read: false, createdAt: new Date().toISOString() });
            await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
            Alert.alert("✅ Đã cập nhật");
          },
        },
      ]
    );
  };

  const sendVoucher = async (c: Complaint) => {
    const updated = complaints.map(x => x.id === c.id ? { ...x, voucherSent: true } : x);
    await persist(updated);
    if (selected?.id === c.id) setSelected(prev => prev ? { ...prev, voucherSent: true } : null);
    const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    nList.unshift({ id: `n${Date.now()}`, message: `🎁 Admin gửi voucher bồi thường cho khiếu nại #${c.id}. Mã: COMP${Date.now().toString().slice(-6)}`, read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
    Alert.alert("✅ Đã gửi voucher", "Thông báo đã được gửi đến khách hàng.");
  };

  const filtered = complaints.filter(c => filter === "all" || c.status === filter);
  const pending  = complaints.filter(c => c.status === "pending").length;
  const highPri  = complaints.filter(c => c.priority === "high" && c.status === "pending").length;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
          {selected && (
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chi tiết khiếu nại</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                {/* Status + Priority */}
                <View style={s.badgeRow}>
                  <View style={[s.badge, { backgroundColor: STATUS_META[selected.status].bg }]}>
                    <Text style={[s.badgeTxt, { color: STATUS_META[selected.status].color }]}>{STATUS_META[selected.status].label}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: PRIORITY_META[selected.priority].bg }]}>
                    <Ionicons name="alert-circle-outline" size={12} color={PRIORITY_META[selected.priority].color} />
                    <Text style={[s.badgeTxt, { color: PRIORITY_META[selected.priority].color }]}>Ưu tiên {PRIORITY_META[selected.priority].label}</Text>
                  </View>
                  {selected.voucherSent && (
                    <View style={[s.badge, { backgroundColor: "#dcfce7" }]}>
                      <Ionicons name="ticket-outline" size={12} color="#16a34a" />
                      <Text style={[s.badgeTxt, { color: "#16a34a" }]}>Đã gửi voucher</Text>
                    </View>
                  )}
                </View>
                {/* Info */}
                {[
                  { icon: "person-outline",  label: "Khách hàng",  value: selected.guestName },
                  { icon: "mail-outline",    label: "Email",       value: selected.guestEmail },
                  { icon: "receipt-outline", label: "Booking",     value: selected.bookingId || "---" },
                  { icon: "cash-outline",    label: "Số tiền",     value: selected.amount ? fmt(selected.amount) : "---", hl: true },
                  { icon: "calendar-outline",label: "Ngày tạo",    value: selected.createdAt },
                  { icon: "person-circle-outline", label: "Xử lý bởi", value: selected.assignedTo || "Chưa phân công" },
                ].map((row, i) => (
                  <View key={i} style={s.detailRow}>
                    <View style={s.detailIcon}>
                      <Ionicons name={row.icon as any} size={14} color="#7a8cc2" />
                    </View>
                    <Text style={s.detailLabel}>{row.label}</Text>
                    <Text style={[s.detailValue, (row as any).hl && { color: "#dc2626", fontWeight: "800" }]}>{row.value}</Text>
                  </View>
                ))}
                {/* Description */}
                <View style={s.descBox}>
                  <Text style={s.descTitle}>Nội dung khiếu nại</Text>
                  <Text style={s.descContent}>{selected.description}</Text>
                </View>
                {/* Admin note */}
                <Text style={s.noteLabel}>Ghi chú xử lý</Text>
                <TextInput
                  style={s.noteInput}
                  value={adminNote}
                  onChangeText={setAdminNote}
                  placeholder="Nhập ghi chú xử lý khiếu nại..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor="#b0bdd8"
                />
                {/* Action buttons */}
                <Text style={s.actionsTitle}>Thao tác</Text>
                <View style={s.modalActionsGrid}>
                  {selected.status !== "investigating" && selected.status !== "resolved" && selected.status !== "rejected" && (
                    <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#eaf0ff" }]} onPress={() => updateStatus(selected.id, "investigating")}>
                      <Ionicons name="search-outline" size={16} color="#2856d6" />
                      <Text style={[s.modalActionTxt, { color: "#2856d6" }]}>Điều tra</Text>
                    </TouchableOpacity>
                  )}
                  {selected.status !== "resolved" && (
                    <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => updateStatus(selected.id, "resolved")}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                      <Text style={[s.modalActionTxt, { color: "#16a34a" }]}>Giải quyết</Text>
                    </TouchableOpacity>
                  )}
                  {selected.status !== "rejected" && (
                    <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => updateStatus(selected.id, "rejected")}>
                      <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                      <Text style={[s.modalActionTxt, { color: "#dc2626" }]}>Từ chối</Text>
                    </TouchableOpacity>
                  )}
                  {!selected.voucherSent && (
                    <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#fef9c3" }]} onPress={() => sendVoucher(selected)}>
                      <Ionicons name="ticket-outline" size={16} color="#d97706" />
                      <Text style={[s.modalActionTxt, { color: "#d97706" }]}>Gửi voucher</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#f3f7ff" }]} onPress={() => { setShowDetail(false); router.push("/staff-livechat" as any); }}>
                    <Ionicons name="chatbubble-outline" size={16} color="#4f7cff" />
                    <Text style={[s.modalActionTxt, { color: "#4f7cff" }]}>Chat khách</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

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
              <View style={s.cardLeft}>
                <View style={[s.typeIcon, { backgroundColor: tm.color + "18" }]}>
                  <Ionicons name={tm.icon as any} size={18} color={tm.color} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardTopRow}>
                  <Text style={s.cardId}>#{c.id}</Text>
                  <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                    <Text style={[s.statusTxt, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={s.cardGuest}>{c.guestName} · {c.createdAt}</Text>
                <View style={s.cardMetaRow}>
                  <View style={[s.typeBadge, { backgroundColor: tm.color + "15" }]}>
                    <Text style={[s.typeTxt, { color: tm.color }]}>{tm.label}</Text>
                  </View>
                  <View style={[s.priorityBadge, { backgroundColor: pm.bg }]}>
                    <Text style={[s.priorityTxt, { color: pm.color }]}>Ưu tiên {pm.label}</Text>
                  </View>
                  {c.amount ? <Text style={s.amountTxt}>{fmt(c.amount)}</Text> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có khiếu nại nào</Text>
          </View>
        )}
      </ScrollView>
      <AdminTabBar role="admin" activeRoute="/admin-complaints" />
    </View>
  );
}

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
  card:           { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 8 },
  cardUrgent:     { borderColor: "#fecaca", backgroundColor: "#fffafa" },
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
});