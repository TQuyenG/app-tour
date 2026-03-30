/**
 * app/staff-complaints.tsx
 * Staff CSKH xử lý khiếu nại (Tickets) từ khách hàng
 * ĐÃ FIX: Tự động hứng từ khóa search từ màn hình khác
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; 
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:       { label: "Mới (Chờ xử lý)", color: "#dc2626", bg: "#fee2e2" },
  investigating: { label: "Đang điều tra",   color: "#d97706", bg: "#fef9c3" },
  resolved:      { label: "Đã giải quyết",   color: "#16a34a", bg: "#dcfce7" },
  rejected:      { label: "Đã đóng",         color: "#7a8cc2", bg: "#f3f7ff" },
};

const TYPE_META: Record<string, string> = {
  guide: "Hướng dẫn viên", tour: "Chất lượng Tour", payment: "Thanh toán", app: "Lỗi ứng dụng", other: "Khác"
};

const FILTERS = ["Tất cả", "Chờ xử lý", "Đang điều tra", "Đã giải quyết"];

export default function StaffComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { search: initialSearch } = useLocalSearchParams();
  
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState((initialSearch as string) || "");
  
  const [detail, setDetail] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch as string);
  }, [initialSearch]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@app_complaints").then(raw => {
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.sort((a:any, b:any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setComplaints(parsed);
      } else {
        setComplaints([]);
      }
    }).catch(() => setComplaints([]));
  }, []));

  const persist = async (updated: any[]) => {
    setComplaints(updated);
    await AsyncStorage.setItem("@app_complaints", JSON.stringify(updated)).catch(() => {});
  };

  const handleUpdateStatus = (ticket: any, newStatus: string) => {
    Alert.alert("Xác nhận", `Cập nhật ticket #${ticket.id} sang "${STATUS_META[newStatus]?.label}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Cập nhật", style: newStatus === "rejected" ? "destructive" : "default", onPress: async () => {
        const updated = complaints.map(c => c.id === ticket.id ? { ...c, status: newStatus } : c);
        await persist(updated);
        setDetail({ ...detail, status: newStatus });
      }}
    ]);
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim() || !detail) return;
    const newNoteObj = { time: new Date().toLocaleString("vi-VN"), text: noteInput.trim() };
    const updated = complaints.map(c => {
      if (c.id === detail.id) {
        const oldNotes = c.adminNotes || [];
        return { ...c, adminNotes: [newNoteObj, ...oldNotes] };
      }
      return c;
    });
    await persist(updated);
    setDetail({ ...detail, adminNotes: [newNoteObj, ...(detail.adminNotes || [])] });
    setNoteInput("");
    Alert.alert("Thành công", "Đã thêm tiến độ xử lý.");
  };

  const filtered = complaints.filter(c => {
    const kw = search.toLowerCase();
    const matchSearch = !kw || c.id.toLowerCase().includes(kw) || (c.senderName || "").toLowerCase().includes(kw) || (c.bookingId || "").toLowerCase().includes(kw);
    if (!matchSearch) return false;
    if (filter === "Tất cả") return true;
    if (filter === "Chờ xử lý") return c.status === "pending";
    if (filter === "Đang điều tra") return c.status === "investigating";
    if (filter === "Đã giải quyết") return c.status === "resolved";
    return true;
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Xử lý Khiếu nại</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm mã ticket, người gửi, mã booking..." value={search} onChangeText={setSearch} />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#8ea0d6" /></TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 60 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{alignItems: 'center', marginTop: 50}}>
             <Ionicons name="shield-checkmark-outline" size={60} color="#cbd5e1" />
             <Text style={{color: '#94a3b8', marginTop: 10}}>Chưa có khiếu nại nào phù hợp.</Text>
          </View>
        ) : (
          filtered.map(c => {
            const meta = STATUS_META[c.status] || STATUS_META.pending;
            return (
              <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.8} onPress={() => { setDetail(c); setNoteInput(""); setShowDetail(true); }}>
                <View style={s.cardHeader}>
                  <Text style={s.ticketId}>#{c.id}</Text>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={s.ticketTitle} numberOfLines={1}>{c.title || "Vấn đề dịch vụ"}</Text>
                <Text style={s.ticketDesc} numberOfLines={2}>{c.description}</Text>
                <View style={s.cardFooter}>
                  <View style={s.footerItem}><Ionicons name="person" size={11} color="#7a8cc2" /><Text style={s.footerTxt}>{c.senderName || "Khách hàng"}</Text></View>
                  <Text style={s.dateTxt}>{c.createdAt}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* Modal Chi tiết */}
      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Chi tiết Ticket</Text>
                  <Text style={s.modalSub}>#{detail.id} · Booking: {detail.bookingId || "Không có"}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[s.modalStatusBar, { backgroundColor: STATUS_META[detail.status].bg }]}>
                  <Text style={[s.modalStatusTxt, { color: STATUS_META[detail.status].color }]}>Trạng thái: {STATUS_META[detail.status].label}</Text>
                  <View style={s.typeBadge}><Text style={s.typeBadgeTxt}>{TYPE_META[detail.type] || "Khác"}</Text></View>
                </View>

                {detail.bookingId && (
                  <TouchableOpacity 
                    style={[s.actionBtn, { backgroundColor: "#eaf0ff", marginBottom: 16, flexDirection: 'row', justifyContent: 'center' }]} 
                    onPress={() => {
                      setShowDetail(false);
                      router.push({ pathname: '/shared-booking-detail', params: { bookingId: detail.bookingId } } as any);
                    }}>
                    <Ionicons name="receipt-outline" size={16} color="#2856d6" />
                    <Text style={[s.actionBtnTxt, { color: "#2856d6", marginLeft: 8 }]}>Tra cứu Đơn đặt Tour này</Text>
                  </TouchableOpacity>
                )}

                <View style={s.infoSection}>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Người gửi</Text><Text style={s.detailValue}>{detail.senderName}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Liên hệ</Text><Text style={s.detailValue}>{detail.senderPhone || detail.senderEmail || "---"}</Text></View>
                </View>

                <View style={s.descBox}>
                  <Text style={s.descTitle}>Nội dung khiếu nại</Text>
                  <Text style={s.descContent}>{detail.description}</Text>
                </View>

                <View style={s.actionSection}>
                  <Text style={s.actionTitle}>Tiến độ xử lý nội bộ</Text>
                  <View style={s.noteInputBox}>
                    <TextInput style={s.noteInput} placeholder="Ghi lại tiến độ làm việc..." value={noteInput} onChangeText={setNoteInput} multiline />
                    <TouchableOpacity style={s.sendNoteBtn} onPress={handleSaveNote}><Ionicons name="send" size={16} color="#fff" /></TouchableOpacity>
                  </View>
                  
                  {detail.adminNotes?.map((note: any, idx: number) => (
                    <View key={idx} style={s.noteItem}>
                       <Text style={s.noteTime}>{note.time}</Text>
                       <Text style={s.noteText}>{note.text}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.actionSection}>
                  <Text style={s.actionTitle}>Cập nhật Trạng thái</Text>
                  <View style={s.actionBtns}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#d97706" }]} onPress={() => handleUpdateStatus(detail, "investigating")}><Text style={s.actionBtnTxt}>Đang điều tra</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#16a34a" }]} onPress={() => handleUpdateStatus(detail, "resolved")}><Text style={s.actionBtnTxt}>Đã giải quyết</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#f3f7ff", marginTop: 8 }]} onPress={() => handleUpdateStatus(detail, "rejected")}><Text style={[s.actionBtnTxt, { color: "#7a8cc2" }]}>Đóng Ticket</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <StaffTabBar activeRoute="/staff-complaints" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ticketId: { color: "#1f2a58", fontWeight: "900", fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  ticketTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  ticketDesc: { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  dateTxt: { color: "#94a8d8", fontSize: 11 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  modalSub: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStatusBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 16 },
  modalStatusTxt: { fontWeight: "800", fontSize: 14 },
  typeBadge: { backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, opacity: 0.8 },
  typeBadgeTxt: { color: "#1f2a58", fontSize: 10, fontWeight: "700" },
  infoSection: { backgroundColor: "#f8faff", borderRadius: 12, padding: 14, gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#7a8cc2", fontSize: 12 },
  detailValue: { color: "#1f2a58", fontSize: 13, fontWeight: "700" },
  descBox: { backgroundColor: "#fff9f9", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#ffe4e6", marginTop: 16 },
  descTitle: { color: "#dc2626", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  descContent: { color: "#1f2a58", fontSize: 13, lineHeight: 20 },
  
  actionSection: { marginTop: 20 },
  actionTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 10 },
  actionBtns: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  
  noteInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingRight: 6, marginBottom: 14 },
  noteInput: { flex: 1, minHeight: 45, paddingHorizontal: 12, color: '#1f2a58' },
  sendNoteBtn: { backgroundColor: '#4f7cff', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noteItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 10, padding: 12, marginBottom: 8 },
  noteTime: { fontSize: 10, color: '#94a8d8', marginBottom: 4 },
  noteText: { fontSize: 13, color: '#1f2a58', lineHeight: 18 }
});