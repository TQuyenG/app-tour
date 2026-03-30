/**
 * app/admin-booking-management.tsx
 * Admin xem, lọc, quản lý Booking toàn hệ thống
 * ĐÃ BỔ SUNG: Hiển thị Đánh giá của Khách hàng trong Modal chi tiết
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookStatus = "pending_guide" | "guide_accepted" | "checked_in" | "on_tour" | "completed" | "cancelled" | "pending" | "accepted" | "rejected" | "paid";

interface AuditLog { actor: string; action: string; time: string; note?: string; }

interface Booking {
  id: string; tourName: string; guideName?: string; guideId?: string;
  guests: number; totalAmount?: number; priceRaw?: number; price?: string | number;
  status: BookStatus; createdAt: string; tourDate?: string; startTime?: string; date?: string;
  customerName?: string; guestName?: string; customerPhone?: string; phone?: string; customerEmail?: string;
  internalNote?: string; slaMinutes?: number; auditLog?: AuditLog[]; image?: string; tourImage?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_guide:  { label: "Chờ HDV",      color: "#d97706", bg: "#fef9c3" },
  pending:        { label: "Chờ xử lý",    color: "#d97706", bg: "#fef9c3" },
  paid:           { label: "Đã thanh toán",color: "#d97706", bg: "#fef9c3" },
  guide_accepted: { label: "HDV đã nhận",  color: "#2856d6", bg: "#eaf0ff" },
  accepted:       { label: "HDV đã nhận",  color: "#2856d6", bg: "#eaf0ff" },
  checked_in:     { label: "Check-in",     color: "#7c3aed", bg: "#ede9fe" },
  on_tour:        { label: "Đang đi",      color: "#0284c7", bg: "#e0f2fe" },
  completed:      { label: "Hoàn tất",     color: "#16a34a", bg: "#dcfce7" },
  cancelled:      { label: "Đã hủy",       color: "#dc2626", bg: "#fee2e2" },
  rejected:       { label: "Từ chối",      color: "#dc2626", bg: "#fee2e2" },
};

const FILTER_MAP: Record<string, (b: Booking) => boolean> = {
  "Tất cả":     () => true,
  "Chờ xử lý": b => ["pending", "pending_guide", "paid"].includes(b.status),
  "Đang đi":    b => ["on_tour", "checked_in", "guide_accepted", "accepted"].includes(b.status),
  "Hoàn tất":   b => b.status === "completed",
  "Đã hủy":     b => ["cancelled", "rejected"].includes(b.status),
};

const FILTERS = Object.keys(FILTER_MAP);
const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const PAGE_SIZE = 10;

export default function AdminBookingManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<any[]>([]); // THÊM STATE REVIEWS
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [editNote, setEditNote] = useState(false);

  useFocusEffect(useCallback(() => {
    // Load Bookings
    AsyncStorage.getItem("@guest_bookings").then(raw => {
      if (raw) {
        let parsed: Booking[] = JSON.parse(raw);
        const fakeIds = ["BK001001", "BK001003", "BK001009"];
        parsed = parsed.filter(b => !fakeIds.includes(b.id));
        parsed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setBookings(parsed);
      }
    }).catch(() => setBookings([]));
    
    // TẢI REVIEWS
    AsyncStorage.getItem("@app_reviews").then(raw => {
      if (raw) setReviews(JSON.parse(raw));
    }).catch(() => setReviews([]));
    
    setPage(1);
  }, []));

  const persist = async (updated: Booking[]) => {
    setBookings(updated);
    await AsyncStorage.setItem("@guest_bookings", JSON.stringify(updated)).catch(() => {});
  };

  const updateStatus = (b: Booking, newStatus: BookStatus) => {
    const label = STATUS_META[newStatus]?.label ?? newStatus;
    Alert.alert(label, `Cập nhật sang "${label}"?`, [
      { text: "Hủy bỏ", style: "cancel" },
      { text: "Xác nhận", style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " · " + now.toLocaleDateString("vi-VN");
          const log: AuditLog = { actor: "Admin", action: `Cập nhật → ${label}`, time: timeStr };
          const updated = bookings.map(x => x.id === b.id ? { ...x, status: newStatus, auditLog: [...(x.auditLog || []), log] } : x);
          await persist(updated);
          if (detail?.id === b.id) setDetail(d => d ? { ...d, status: newStatus, auditLog: [...(d.auditLog || []), log] } : null);
          Alert.alert("✅ Thành công", `Đã cập nhật → ${label}`);
        },
      },
    ]);
  };

  const saveNote = async () => {
    if (!detail) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " · " + now.toLocaleDateString("vi-VN");
    const log: AuditLog = { actor: "Admin", action: "Cập nhật ghi chú nội bộ", time: timeStr, note: noteInput.trim() };
    const updated = bookings.map(x => x.id === detail.id ? { ...x, internalNote: noteInput.trim(), auditLog: [...(x.auditLog || []), log] } : x);
    await persist(updated);
    setDetail(d => d ? { ...d, internalNote: noteInput.trim(), auditLog: [...(d.auditLog || []), log] } : null);
    setEditNote(false);
  };

  const filtered = bookings.filter(b => {
    const kw = search.trim().toLowerCase();
    const cName = (b.customerName || b.guestName || "").toLowerCase();
    const gName = (b.guideName || "").toLowerCase();
    const matchSearch = !kw || b.id.toLowerCase().includes(kw) || (b.tourName || "").toLowerCase().includes(kw) || gName.includes(kw) || cName.includes(kw) || (b.customerPhone || b.phone || "").includes(kw);
    return matchSearch && FILTER_MAP[filter]?.(b);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Quản lý Đơn đặt Tour</Text>
          <Text style={s.headerSub}>Admin Workspace</Text>
        </View>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm mã, tên khách, SĐT..." value={search} onChangeText={v => { setSearch(v); setPage(1); }} placeholderTextColor="#b0bdd8" />
        {!!search && <TouchableOpacity onPress={() => { setSearch(""); setPage(1); }}><Ionicons name="close-circle" size={16} color="#8ea0d6" /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => {
          const count = bookings.filter(FILTER_MAP[f]).length;
          return (
            <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => { setFilter(f); setPage(1); }}>
              <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
              <View style={[s.filterCount, filter === f && s.filterCountActive]}>
                <Text style={[s.filterCountTxt, filter === f && { color: "#f59e0b" }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 }]}>
        <View style={s.summaryRow}>
          {[ { label: "Tổng", value: bookings.length, color: "#1f2a58" }, { label: "Chờ xử lý", value: bookings.filter(b => ["pending", "pending_guide", "paid"].includes(b.status)).length, color: "#d97706" }, { label: "Đang đi", value: bookings.filter(b => ["on_tour", "checked_in", "accepted", "guide_accepted"].includes(b.status)).length, color: "#0284c7" }, { label: "Hoàn tất", value: bookings.filter(b => b.status === "completed").length, color: "#16a34a" } ].map((item, i) => (
            <View key={i} style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {paginated.map(b => {
          const meta   = STATUS_META[b.status] ?? STATUS_META.pending;
          const cName  = b.customerName || b.guestName || "Khách hàng";
          const price  = b.totalAmount || b.priceRaw || Number(b.price) || 0;
          const imgUrl = b.image || b.tourImage || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=500&q=80";

          return (
            <TouchableOpacity key={b.id} style={s.card} onPress={() => { setDetail(b); setNoteInput(b.internalNote || ""); setEditNote(false); setShowDetail(true); }} activeOpacity={0.85}>
              <View style={s.cardImgWrap}>
                <Image source={{ uri: imgUrl }} style={s.cardImg} resizeMode="cover" />
                <View style={s.cardImgOverlay} />
                <View style={[s.statusBadgeFloat, { backgroundColor: meta.bg }]}><View style={[s.statusDot, { backgroundColor: meta.color }]} /><Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text></View>
              </View>
              <Text style={s.tourName} numberOfLines={1}>{b.tourName}</Text>
              <View style={s.infoGrid}>
                {[ { icon: "person-outline", val: cName }, { icon: "compass-outline", val: b.guideName || "Chưa phân bổ" }, { icon: "people-outline", val: `${b.guests || 1} khách` }, { icon: "calendar-outline", val: b.tourDate || b.startTime || "Chưa có ngày" } ].map((item, i) => (
                  <View key={i} style={s.infoItem}><Ionicons name={item.icon as any} size={11} color="#8ea0d6" /><Text style={s.infoTxt} numberOfLines={1}>{item.val}</Text></View>
                ))}
              </View>
              <View style={s.cardFooter}><Text style={s.price}>{fmt(price)}</Text><Text style={s.bookingIdTxt}>#{b.id}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View><Text style={s.modalTitle}>Chi tiết Booking</Text><Text style={s.modalSub}>#{detail?.id}</Text></View>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.infoSection}>
                {[ { icon: "map-outline", label: "Tour", value: detail?.tourName }, { icon: "person-outline", label: "Khách hàng", value: detail?.customerName || detail?.guestName || "Khách hàng" }, { icon: "call-outline", label: "Điện thoại", value: detail?.customerPhone || detail?.phone || "---" }, { icon: "cash-outline", label: "Tổng tiền", value: fmt(detail?.totalAmount || detail?.priceRaw || Number(detail?.price) || 0) } ].map((row, i) => (
                  <View key={i} style={s.detailRow}><View style={s.detailIcon}><Ionicons name={row.icon as any} size={14} color="#7a8cc2" /></View><Text style={s.detailLabel}>{row.label}</Text><Text style={s.detailValue}>{row.value}</Text></View>
                ))}
              </View>

              {/* TÌM VÀ HIỂN THỊ ĐÁNH GIÁ NẾU CÓ */}
              {(() => {
                 const rv = reviews.find(r => String(r.bookingId) === String(detail?.id));
                 if (!rv) return null;
                 return (
                   <View style={s.reviewSection}>
                     <View style={s.reviewHeader}>
                        <Ionicons name="star" size={16} color="#d97706" />
                        <Text style={s.reviewTitle}>Đánh giá từ khách hàng</Text>
                     </View>
                     <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                        <Text style={s.reviewStats}>Tour: <Text style={{fontWeight:'bold'}}>{rv.tourRating || rv.rating || 5}⭐</Text></Text>
                        <Text style={s.reviewStats}>HDV: <Text style={{fontWeight:'bold'}}>{rv.guideRating || rv.overallRating || rv.rating || 5}⭐</Text></Text>
                     </View>
                     <Text style={s.reviewText}>"{rv.reviewText || rv.comment || 'Không có nhận xét'}"</Text>
                     {rv.tipAmount > 0 && <Text style={s.reviewTip}>+ Đã Tip: {fmt(rv.tipAmount)}</Text>}
                   </View>
                 );
              })()}

              <View style={s.noteSection}>
                <View style={s.noteSectionHeader}><Ionicons name="lock-closed-outline" size={13} color="#7c3aed" /><Text style={s.noteSectionTitle}>Ghi chú nội bộ</Text><TouchableOpacity onPress={() => setEditNote(true)}><Text style={s.editNoteTxt}>Sửa</Text></TouchableOpacity></View>
                {editNote ? (
                  <View><TextInput style={s.noteInput} value={noteInput} onChangeText={setNoteInput} multiline /><View style={s.noteActions}><TouchableOpacity style={s.noteSaveBtn} onPress={saveNote}><Text style={s.noteSaveTxt}>Lưu</Text></TouchableOpacity><TouchableOpacity style={s.noteCancelBtn} onPress={() => setEditNote(false)}><Text style={s.noteCancelTxt}>Hủy</Text></TouchableOpacity></View></View>
                ) : (<Text style={s.noteTxt}>{detail?.internalNote || "Chưa có ghi chú..."}</Text>)}
              </View>
              <Text style={s.actionsTitle}>Thao tác hệ thống</Text>
              <View style={s.modalActions}>
                <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => { setShowDetail(false); setTimeout(() => updateStatus(detail!, "completed"), 300); }}><Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" /><Text style={[s.modalActionTxt, { color: "#16a34a" }]}>Hoàn tất</Text></TouchableOpacity>
                <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => { setShowDetail(false); setTimeout(() => updateStatus(detail!, "cancelled"), 300); }}><Ionicons name="close-circle-outline" size={16} color="#dc2626" /><Text style={[s.modalActionTxt, { color: "#dc2626" }]}>Hủy</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-booking-management" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub: { fontSize: 11, color: "#7a8cc2", marginTop: 1 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 14, marginTop: 14, marginBottom: 6 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterScroll: { minHeight: 52, flexShrink: 0 },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, alignItems: "center" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  filterCount: { backgroundColor: "#eaf0ff", borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountActive:{ backgroundColor: "rgba(255,255,255,0.25)" },
  filterCountTxt: { color: "#2856d6", fontSize: 10, fontWeight: "800" },
  content: { padding: 14, paddingTop: 0 },
  summaryRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 14, justifyContent: "space-between" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { fontSize: 18, fontWeight: "900" },
  summaryLabel: { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10, overflow: "hidden" },
  cardImgWrap: { height: 120, position: 'relative', marginHorizontal: -14, marginTop: -14, marginBottom: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%' },
  cardImgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.2)' },
  statusBadgeFloat: { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  tourName: { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 8 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f7ff", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, width: '48%' },
  infoTxt: { color: "#5f73a9", fontSize: 11, fontWeight: "600", flex: 1 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  price: { color: "#16a34a", fontWeight: "800", fontSize: 15 },
  bookingIdTxt: { color: "#94a8d8", fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  modalSub: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  infoSection: { backgroundColor: "#f8faff", borderRadius: 14, marginBottom: 14, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  detailLabel: { color: "#7a8cc2", fontSize: 12, width: 95 },
  detailValue: { flex: 1, color: "#1f2a58", fontWeight: "600", fontSize: 13, textAlign: "right" },
  
  reviewSection: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#fde68a" },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewTitle: { color: "#d97706", fontWeight: "800", fontSize: 13 },
  reviewStats: { color: "#92400e", fontSize: 12 },
  reviewText: { color: "#92400e", fontSize: 13, lineHeight: 20, marginTop: 8, fontStyle: 'italic' },
  reviewTip: { color: "#16a34a", fontSize: 12, fontWeight: "700", marginTop: 6 },

  noteSection: { backgroundColor: "#f5f0ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  noteSectionHeader:{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  noteSectionTitle: { color: "#7c3aed", fontWeight: "700", fontSize: 12, flex: 1 },
  editNoteTxt: { color: "#7c3aed", fontSize: 11, fontWeight: "700" },
  noteTxt: { color: "#5f4b8b", fontSize: 12, lineHeight: 18 },
  noteInput: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#ddd6fe", padding: 10, color: "#1f2a58", fontSize: 13, minHeight: 70, textAlignVertical: "top" },
  noteActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  noteSaveBtn: { flex: 1, backgroundColor: "#7c3aed", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  noteSaveTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  noteCancelBtn: { backgroundColor: "#f3f0ff", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  noteCancelTxt: { color: "#7c3aed", fontWeight: "700", fontSize: 13 },
  actionsTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  modalActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  modalActionTxt: { fontSize: 13, fontWeight: "700" },
});