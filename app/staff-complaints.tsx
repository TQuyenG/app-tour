/**
 * app/staff-complaints.tsx
 * Staff CSKH xử lý khiếu nại (Tickets) từ khách hàng
 * Không Header Đen - Nút Back Về Home - 100% Data Thực
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

export default function StaffComplaints() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@complaints").then(raw => {
      if (raw) {
        let parsed = JSON.parse(raw);
        parsed = parsed.filter((c: any) => !["cp001", "cp002", "cp003"].includes(c.id));
        parsed.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setComplaints(parsed);
      } else setComplaints([]);
    }).catch(() => setComplaints([]));
  }, []));

  const persist = async (updated: any[]) => {
    setComplaints(updated);
    await AsyncStorage.setItem("@complaints", JSON.stringify(updated)).catch(() => {});
  };

  const handleStatusChange = (req: any, newStatus: string) => {
    Alert.alert("Xác nhận", `Đổi trạng thái Ticket #${req.id} thành "${STATUS_META[newStatus].label}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Đồng ý", onPress: async () => {
          const updated = complaints.map(c => c.id === req.id ? { ...c, status: newStatus, adminNote } : c);
          await persist(updated);
          if (detail?.id === req.id) setDetail({ ...detail, status: newStatus, adminNote });
          if (newStatus === "resolved" || newStatus === "rejected") setShowDetail(false);
      }}
    ]);
  };

  const filtered = complaints.filter(c => {
    const kw = search.toLowerCase();
    const matchSearch = !kw || c.id.toLowerCase().includes(kw) || c.title.toLowerCase().includes(kw) || c.guestName.toLowerCase().includes(kw);
    if (!matchSearch) return false;
    if (filter === "Chờ xử lý") return c.status === "pending";
    if (filter === "Đang điều tra") return c.status === "investigating";
    if (filter === "Đã giải quyết") return c.status === "resolved";
    return true;
  });

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Modal Detail */}
      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View style={{ flex: 1 }}><Text style={s.modalTitle} numberOfLines={1}>{detail.title}</Text><Text style={s.modalSub}>Ticket #{detail.id} · {detail.createdAt?.split('T')[0]}</Text></View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[s.modalStatusBar, { backgroundColor: STATUS_META[detail.status].bg }]}>
                  <Text style={[s.modalStatusTxt, { color: STATUS_META[detail.status].color }]}>{STATUS_META[detail.status].label}</Text>
                  <View style={s.typeBadge}><Text style={s.typeBadgeTxt}>{TYPE_META[detail.type] || "Khác"}</Text></View>
                </View>
                <View style={s.infoSection}>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Khách hàng</Text><Text style={s.detailValue}>{detail.guestName} ({detail.guestEmail})</Text></View>
                  {detail.bookingId && <View style={s.detailRow}><Text style={s.detailLabel}>Mã Booking</Text><Text style={[s.detailValue, { color: "#2856d6" }]}>{detail.bookingId}</Text></View>}
                </View>
                <View style={s.descBox}><Text style={s.descTitle}>Nội dung khiếu nại:</Text><Text style={s.descContent}>{detail.description}</Text></View>
                <View style={s.actionSection}>
                  <Text style={s.actionTitle}>Xử lý nội bộ</Text>
                  <TextInput style={s.noteInput} placeholder="Ghi chú quá trình xử lý..." value={adminNote} onChangeText={setAdminNote} multiline />
                  {detail.status !== "resolved" && detail.status !== "rejected" && (
                    <View style={s.actionBtns}>
                      {detail.status === "pending" && <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#d97706" }]} onPress={() => handleStatusChange(detail, "investigating")}><Text style={s.actionBtnTxt}>Điều tra</Text></TouchableOpacity>}
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#16a34a" }]} onPress={() => handleStatusChange(detail, "resolved")}><Text style={s.actionBtnTxt}>Đã giải quyết</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#7a8cc2" }]} onPress={() => handleStatusChange(detail, "rejected")}><Text style={s.actionBtnTxt}>Đóng Ticket</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/staff-home" as any)} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.headerTitle}>Khiếu nại & Hỗ trợ</Text></View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm mã ticket, tên khách..." value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 60 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map(c => {
          const meta = STATUS_META[c.status] || STATUS_META.pending;
          return (
            <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.8} onPress={() => { setDetail(c); setAdminNote(c.adminNote || ""); setShowDetail(true); }}>
              <View style={s.cardTop}>
                <Text style={s.cardId}>#{c.id}</Text>
                <View style={[s.statusBadge, { backgroundColor: meta.bg }]}><Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text></View>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{c.description}</Text>
              <View style={s.cardBottom}>
                <Text style={s.guestName}><Ionicons name="person-outline"/> {c.guestName}</Text>
                <Text style={s.dateTxt}>{c.createdAt?.split("T")[0]}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <StaffTabBar activeRoute="/staff-complaints" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 12 },
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
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardId: { color: "#7a8cc2", fontWeight: "700", fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  cardTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 4 },
  cardDesc: { color: "#5f73a9", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  guestName: { color: "#1f2a58", fontSize: 12, fontWeight: "600" },
  dateTxt: { color: "#94a8d8", fontSize: 11 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#7a8cc2" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", marginLeft: 10 },
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
  actionTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  noteInput: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: "top", marginBottom: 12 },
  actionBtns: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 }
});