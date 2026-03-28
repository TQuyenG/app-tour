/**
 * app/staff-complaints.tsx
 * Staff CSKH xử lý khiếu nại — đồng bộ key @complaints với admin
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Image, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

type ComplaintStatus = "pending" | "investigating" | "resolved" | "rejected";
type ComplaintType   = "guide" | "tour" | "payment" | "app" | "other";

interface Complaint {
  id: string; guestName: string; guestEmail: string;
  type: ComplaintType; title: string; description: string;
  bookingId?: string; amount?: number;
  status: ComplaintStatus; priority: "low" | "medium" | "high";
  createdAt: string; resolvedAt?: string;
  adminNote?: string; assignedTo?: string; voucherSent?: boolean;
}

const SEED_COMPLAINTS: Complaint[] = [
  { id: "cp001", guestName: "Nguyễn An",      guestEmail: "guest1@gmail.com", type: "guide",   title: "HDV đến trễ 2 tiếng",       description: "Hướng dẫn viên Trần Minh Khoa đến trễ 2 tiếng so với lịch hẹn 08:00, làm tôi lỡ mất buổi tham quan buổi sáng.", bookingId: "BK001001", amount: 8970000,  status: "pending",       priority: "high",   createdAt: "12/04/2026" },
  { id: "cp002", guestName: "Trần Văn Bình",  guestEmail: "guest2@gmail.com", type: "payment", title: "Bị tính tiền 2 lần",         description: "Tôi đặt tour Phú Quốc nhưng thẻ bị trừ tiền 2 lần. Mỗi lần 4.690.000đ.", bookingId: "BK001002", amount: 4690000,  status: "investigating", priority: "high",   createdAt: "11/04/2026", assignedTo: "Staff CSKH" },
  { id: "cp003", guestName: "Lê Thị Cúc",     guestEmail: "guest3@gmail.com", type: "tour",    title: "Tour không đúng mô tả",      description: "Tour Nha Trang quảng cáo có lặn biển ngắm san hô nhưng thực tế không có.", bookingId: "BK001003", amount: 13160000, status: "resolved",      priority: "medium", createdAt: "10/04/2026", resolvedAt: "11/04/2026", adminNote: "Đã hoàn 30% theo chính sách.", voucherSent: true },
  { id: "cp004", guestName: "Hoàng Thị Emly", guestEmail: "guest5@gmail.com", type: "guide",   title: "HDV thiếu chuyên nghiệp",    description: "HDV liên tục dùng điện thoại, không giải thích địa điểm tham quan.", bookingId: "BK001005", amount: 4600000,  status: "pending",       priority: "medium", createdAt: "09/04/2026" },
  { id: "cp005", guestName: "Vũ Minh Phong",  guestEmail: "guest6@gmail.com", type: "payment", title: "Chưa nhận được tiền hoàn",   description: "Đã yêu cầu hủy tour và được thông báo hoàn tiền trong 3-5 ngày nhưng đã 11 ngày vẫn chưa nhận.", bookingId: "BK001006", amount: 21000000, status: "investigating", priority: "high",   createdAt: "08/04/2026", assignedTo: "Admin" },
];

const TYPE_IMAGES: Record<string, string> = {
  "cp001": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "cp002": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80",
  "cp003": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "cp004": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=400&q=80",
  "cp005": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
};

const STATUS_META: Record<ComplaintStatus, { label: string; color: string; bg: string }> = {
  pending:       { label: "Chờ xử lý",    color: "#d97706", bg: "#fef9c3" },
  investigating: { label: "Đang điều tra",color: "#2856d6", bg: "#eaf0ff" },
  resolved:      { label: "Đã giải quyết",color: "#16a34a", bg: "#dcfce7" },
  rejected:      { label: "Từ chối",      color: "#dc2626", bg: "#fee2e2" },
};
const TYPE_META: Record<ComplaintType, { label: string; icon: string; color: string }> = {
  guide:   { label: "HDV",        icon: "person-outline",         color: "#8b5cf6" },
  tour:    { label: "Tour",       icon: "map-outline",            color: "#2856d6" },
  payment: { label: "Thanh toán", icon: "card-outline",           color: "#dc2626" },
  app:     { label: "Ứng dụng",   icon: "phone-portrait-outline", color: "#64748b" },
  other:   { label: "Khác",       icon: "help-circle-outline",    color: "#94a3b8" },
};
const PRIORITY_META = {
  high:   { label: "Cao",       color: "#dc2626", bg: "#fee2e2" },
  medium: { label: "Trung bình",color: "#d97706", bg: "#fef9c3" },
  low:    { label: "Thấp",      color: "#16a34a", bg: "#dcfce7" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function StaffComplaints() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter]         = useState<"all" | ComplaintStatus>("all");
  const [selected, setSelected]     = useState<Complaint | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [staffNote, setStaffNote]   = useState("");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@complaints").then(raw => {
      setComplaints(raw ? JSON.parse(raw) : SEED_COMPLAINTS);
      if (!raw) AsyncStorage.setItem("@complaints", JSON.stringify(SEED_COMPLAINTS)).catch(() => {});
    }).catch(() => setComplaints(SEED_COMPLAINTS));
  }, []));

  const persist = async (data: Complaint[]) => {
    setComplaints(data);
    await AsyncStorage.setItem("@complaints", JSON.stringify(data)).catch(() => {});
  };

  const updateStatus = (id: string, status: ComplaintStatus) => {
    Alert.alert("Cập nhật", `Chuyển sang "${STATUS_META[status].label}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận", onPress: async () => {
          const updated = complaints.map(c =>
            c.id === id ? {
              ...c, status,
              adminNote: staffNote || c.adminNote,
              assignedTo: "Staff CSKH",
              resolvedAt: (status === "resolved" || status === "rejected") ? new Date().toLocaleDateString("vi-VN") : undefined,
            } : c
          );
          await persist(updated);
          if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
          // Notify guest
          const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
          const nList = nRaw ? JSON.parse(nRaw) : [];
          nList.unshift({ id: `n${Date.now()}`, message: `Khiếu nại #${id} đã được cập nhật: ${STATUS_META[status].label}`, read: false, createdAt: new Date().toISOString() });
          await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
          Alert.alert("✅ Đã cập nhật");
        },
      },
    ]);
  };

  const sendVoucher = async (c: Complaint) => {
    const updated = complaints.map(x => x.id === c.id ? { ...x, voucherSent: true } : x);
    await persist(updated);
    if (selected?.id === c.id) setSelected(prev => prev ? { ...prev, voucherSent: true } : null);
    const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    nList.unshift({ id: `n${Date.now()}`, message: `🎁 Staff gửi voucher bồi thường cho khiếu nại #${c.id}. Mã: COMP${Date.now().toString().slice(-6)}`, read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
    Alert.alert("✅ Đã gửi voucher", "Thông báo đã được gửi đến khách hàng.");
  };

  const filtered = complaints.filter(c => filter === "all" || c.status === filter);
  const pending  = complaints.filter(c => c.status === "pending").length;

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
              {/* Modal ảnh header */}
              <View style={s.modalImgWrap}>
                <Image source={{ uri: TYPE_IMAGES[selected.id] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80" }} style={s.modalImg} resizeMode="cover" />
                <View style={s.modalImgOverlay} />
              </View>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle} numberOfLines={1}>{selected.title}</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={s.badgeRow}>
                  <View style={[s.badge, { backgroundColor: STATUS_META[selected.status].bg }]}>
                    <Text style={[s.badgeTxt, { color: STATUS_META[selected.status].color }]}>{STATUS_META[selected.status].label}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: PRIORITY_META[selected.priority].bg }]}>
                    <Text style={[s.badgeTxt, { color: PRIORITY_META[selected.priority].color }]}>Ưu tiên {PRIORITY_META[selected.priority].label}</Text>
                  </View>
                  {selected.voucherSent && (
                    <View style={[s.badge, { backgroundColor: "#dcfce7" }]}>
                      <Ionicons name="ticket-outline" size={12} color="#16a34a" />
                      <Text style={[s.badgeTxt, { color: "#16a34a" }]}>Đã gửi voucher</Text>
                    </View>
                  )}
                </View>
                {[
                  { icon: "person-outline",  label: "Khách hàng", value: selected.guestName },
                  { icon: "mail-outline",    label: "Email",      value: selected.guestEmail },
                  { icon: "receipt-outline", label: "Booking",    value: selected.bookingId || "---" },
                  { icon: "cash-outline",    label: "Số tiền",    value: selected.amount ? fmt(selected.amount) : "---", hl: true },
                  { icon: "calendar-outline",label: "Ngày tạo",   value: selected.createdAt },
                ].map((row, i) => (
                  <View key={i} style={s.detailRow}>
                    <View style={s.detailIcon}><Ionicons name={row.icon as any} size={14} color="#7a8cc2" /></View>
                    <Text style={s.detailLabel}>{row.label}</Text>
                    <Text style={[s.detailValue, (row as any).hl && { color: "#dc2626", fontWeight: "800" }]}>{row.value}</Text>
                  </View>
                ))}
                <View style={s.descBox}>
                  <Text style={s.descTitle}>Nội dung khiếu nại</Text>
                  <Text style={s.descContent}>{selected.description}</Text>
                </View>
                <Text style={s.noteLabel}>Ghi chú xử lý (Staff)</Text>
                <TextInput
                  style={s.noteInput}
                  value={staffNote}
                  onChangeText={setStaffNote}
                  placeholder="Nhập ghi chú xử lý..."
                  multiline numberOfLines={3} textAlignVertical="top"
                  placeholderTextColor="#b0bdd8"
                />
                <Text style={s.actionsTitle}>Thao tác</Text>
                <View style={s.modalActionsGrid}>
                  {selected.status === "pending" && (
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
          <View style={s.alertBadge}><Text style={s.alertBadgeTxt}>{pending} chờ</Text></View>
        )}
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Tổng",        value: complaints.length,                                   color: "#2856d6" },
          { label: "Chờ xử lý",  value: pending,                                              color: "#d97706" },
          { label: "Ưu tiên cao", value: complaints.filter(c => c.priority === "high" && c.status === "pending").length, color: "#dc2626" },
          { label: "Đã giải quyết", value: complaints.filter(c => c.status === "resolved").length, color: "#16a34a" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {(["all","pending","investigating","resolved","rejected"] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "all" ? "Tất cả" : STATUS_META[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {filtered.map(c => {
          const sm = STATUS_META[c.status];
          const tm = TYPE_META[c.type];
          const pm = PRIORITY_META[c.priority];
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.card, c.priority === "high" && c.status === "pending" && s.cardUrgent]}
              onPress={() => { setSelected(c); setStaffNote(c.adminNote || ""); setShowDetail(true); }}
              activeOpacity={0.85}
            >
              <View style={s.cImgWrap}>
                <Image
                  source={{ uri: TYPE_IMAGES[c.id] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80" }}
                  style={s.cImg} resizeMode="cover"
                />
                <View style={s.cImgOverlay} />
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
      <StaffTabBar activeRoute="/staff-complaints" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  alertBadge:       { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  alertBadgeTxt:    { color: "#dc2626", fontWeight: "800", fontSize: 12 },
  summaryRow:       { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:      { alignItems: "center", flex: 1 },
  summaryValue:     { fontSize: 18, fontWeight: "900" },
  summaryLabel:     { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  filterRow:        { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:       { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:     { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  filterTxt:        { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive:  { color: "#fff" },
  content:          { padding: 14, paddingTop: 0 },
  card:             { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 10, overflow: "hidden", shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardUrgent:       { borderColor: "#fecaca", backgroundColor: "#fffafa" },
  cImgWrap:         { height: 110, position: "relative" },
  cImg:             { width: "100%", height: "100%" },
  cImgOverlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,20,60,0.3)" },
  cImgTop:          { position: "absolute", top: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cImgBottom:       { position: "absolute", bottom: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cImgId:           { color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.9 },
  typeIconFloat:    { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statusBadge:      { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:        { fontSize: 10, fontWeight: "700" },
  priorityBadge:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  priorityTxt:      { fontSize: 10, fontWeight: "700" },
  cBody:            { padding: 12 },
  cardTitle:        { color: "#1f2a58", fontWeight: "800", fontSize: 13, marginBottom: 3 },
  cardGuestRow:     { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  cardGuest:        { color: "#7a8cc2", fontSize: 11 },
  cardMetaRow:      { flexDirection: "row", gap: 5, flexWrap: "wrap", alignItems: "center" },
  typeBadge:        { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeTxt:          { fontSize: 10, fontWeight: "700" },
  amountPill:       { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  amountTxt:        { color: "#dc2626", fontWeight: "700", fontSize: 11 },
  emptyCard:        { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:         { color: "#7a8cc2" },
  // Modal
  modalOverlay:     { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  modalSheet:       { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", overflow: "hidden" },
  modalHandle:      { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalImgWrap:     { height: 150 },
  modalImg:         { width: "100%", height: "100%" },
  modalImgOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,25,60,0.25)" },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:       { fontSize: 16, fontWeight: "800", color: "#1f2a58", flex: 1 },
  closeBtn:         { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:        { padding: 20, paddingBottom: 40 },
  badgeRow:         { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  badge:            { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:         { fontSize: 11, fontWeight: "700" },
  detailRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon:       { width: 26, height: 26, borderRadius: 7, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  detailLabel:      { color: "#7a8cc2", fontSize: 12, width: 100 },
  detailValue:      { flex: 1, color: "#1f2a58", fontWeight: "600", fontSize: 12, textAlign: "right" },
  descBox:          { backgroundColor: "#f3f7ff", borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 12 },
  descTitle:        { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  descContent:      { color: "#5f73a9", fontSize: 13, lineHeight: 20 },
  noteLabel:        { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  noteInput:        { backgroundColor: "#f3f7ff", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 12, paddingVertical: 10, color: "#1f2a58", fontSize: 13, minHeight: 80, marginBottom: 14 },
  actionsTitle:     { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  modalActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActionBtn:   { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  modalActionTxt:   { fontSize: 12, fontWeight: "700" },
});