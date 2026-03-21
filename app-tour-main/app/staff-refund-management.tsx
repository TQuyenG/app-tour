/**
 * app/staff-refund-management.tsx
 * Staff xử lý yêu cầu hủy tour và hoàn tiền — Phiên bản nâng cấp
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
import { StaffTabBar } from "@/components/StaffTabBar";

interface RefundRequest {
  id: string; bookingId: string; tourName: string;
  guestName: string; guestPhone: string;
  amount: number; refundPercent: number; feeAmount: number;
  reason: string; category: string;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string; evidence?: string; priority: "high" | "normal" | "low";
}

const SEED_REFUNDS: RefundRequest[] = [
  { id: "rf001", bookingId: "BK001001", tourName: "Đà Lạt 3N2Đ - Săn mây & Chill",        guestName: "Nguyễn An",     guestPhone: "0901 234 567", amount: 2990000, refundPercent: 100, feeAmount: 0,      reason: "Bận việc đột xuất gia đình, không thể đi được", category: "Bất khả kháng",        status: "pending",    createdAt: new Date(Date.now() - 3600000).toISOString(),   priority: "high",   evidence: "Giấy xác nhận bệnh viện" },
  { id: "rf002", bookingId: "BK001002", tourName: "Phú Quốc 4N3Đ - Resort biển xanh",      guestName: "Trần Văn B",    guestPhone: "0912 345 678", amount: 4690000, refundPercent: 80,  feeAmount: 938000, reason: "HDV không đúng hẹn, đến trễ 2 tiếng so với lịch", category: "Lỗi nhà cung cấp",    status: "pending",    createdAt: new Date(Date.now() - 7200000).toISOString(),   priority: "high" },
  { id: "rf003", bookingId: "BK001003", tourName: "Sapa 3N2Đ - Mùa lúa chín",              guestName: "Lê Thị C",      guestPhone: "0933 111 222", amount: 3590000, refundPercent: 100, feeAmount: 0,      reason: "Tour bị hủy do thời tiết xấu, mưa lớn liên tục", category: "Thiên tai / Thời tiết", status: "approved",   createdAt: new Date(Date.now() - 86400000).toISOString(),  priority: "normal" },
  { id: "rf004", bookingId: "BK001004", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng",        guestName: "Phạm Quốc D",   guestPhone: "0944 222 333", amount: 2300000, refundPercent: 0,   feeAmount: 0,      reason: "Đổi ý không muốn đi nữa, hủy trước 1 ngày", category: "Đổi ý khách",          status: "rejected",   createdAt: new Date(Date.now() - 172800000).toISOString(), priority: "low" },
  { id: "rf005", bookingId: "BK001005", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan",          guestName: "Hoàng Thị E",   guestPhone: "0955 333 444", amount: 3500000, refundPercent: 70,  feeAmount: 1050000,reason: "Dịch vụ không đúng mô tả, thiếu 2 bữa ăn, phòng khách sạn sai loại", category: "Lỗi nhà cung cấp", status: "pending",  createdAt: new Date(Date.now() - 1800000).toISOString(),   priority: "high",  evidence: "Ảnh phòng khách sạn, hóa đơn bữa ăn" },
  { id: "rf006", bookingId: "BK001006", tourName: "Mũi Né 2N1Đ - Đồi cát vàng",           guestName: "Nguyễn Minh F", guestPhone: "0966 444 555", amount: 1900000, refundPercent: 100, feeAmount: 0,      reason: "Xe đón bị trễ 2 tiếng, khách lỡ chuyến bay nối", category: "Lỗi nhà cung cấp",    status: "approved",   createdAt: new Date(Date.now() - 259200000).toISOString(), priority: "normal" },
  { id: "rf007", bookingId: "BK001007", tourName: "Côn Đảo 4N3Đ - Thiên đường",           guestName: "Trần Thanh G",  guestPhone: "0977 555 666", amount: 5300000, refundPercent: 100, feeAmount: 0,      reason: "HDV hủy tour đột ngột không báo trước, Partner vỡ lịch", category: "Lỗi nhà cung cấp", status: "pending",  createdAt: new Date(Date.now() - 900000).toISOString(),    priority: "high",  evidence: "Tin nhắn HDV hủy tour" },
  { id: "rf008", bookingId: "BK001008", tourName: "Đà Nẵng 3N2Đ - Cầu Vàng kỳ vĩ",       guestName: "Bùi Thanh K",   guestPhone: "0922 777 888", amount: 3600000, refundPercent: 50,  feeAmount: 1800000,reason: "Tour cam kết xe Limousine nhưng đón bằng xe 16 chỗ cũ kỹ", category: "Lỗi nhà cung cấp", status: "processing",createdAt: new Date(Date.now() - 43200000).toISOString(),  priority: "high",  evidence: "Ảnh xe 16 chỗ, hợp đồng ghi Limousine" },
  { id: "rf009", bookingId: "BK001009", tourName: "Nha Trang 3N2Đ - Lặn san hô",          guestName: "Võ Minh L",     guestPhone: "0933 888 999", amount: 4200000, refundPercent: 100, feeAmount: 0,      reason: "Khách bị ốm đột ngột, có giấy chứng nhận bệnh viện", category: "Bất khả kháng",       status: "pending",    createdAt: new Date(Date.now() - 5400000).toISOString(),   priority: "normal", evidence: "Giấy ra viện, đơn thuốc bác sĩ" },
  { id: "rf010", bookingId: "BK001010", tourName: "Cần Thơ 2N1Đ - Chợ nổi Cái Răng",      guestName: "Đinh Hải M",    guestPhone: "0944 999 000", amount: 1250000, refundPercent: 30,  feeAmount: 875000, reason: "Hủy trước 48 tiếng theo chính sách", category: "Hủy theo chính sách",      status: "approved",   createdAt: new Date(Date.now() - 345600000).toISOString(), priority: "low" },
];

const CATEGORY_COLOR: Record<string, { color: string; bg: string }> = {
  "Bất khả kháng":        { color: "#7c3aed", bg: "#ede9fe" },
  "Lỗi nhà cung cấp":     { color: "#dc2626", bg: "#fee2e2" },
  "Thiên tai / Thời tiết": { color: "#0284c7", bg: "#e0f2fe" },
  "Đổi ý khách":          { color: "#94a3b8", bg: "#f1f5f9" },
  "Hủy theo chính sách":  { color: "#16a34a", bg: "#dcfce7" },
};

const PRIORITY_META = {
  high:   { label: "Ưu tiên cao", color: "#dc2626", bg: "#fee2e2" },
  normal: { label: "Bình thường", color: "#2856d6", bg: "#eaf0ff" },
  low:    { label: "Thấp",        color: "#94a3b8", bg: "#f1f5f9" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function StaffRefundManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refunds, setRefunds]         = useState<RefundRequest[]>([]);
  const [filter, setFilter]           = useState<"all" | "pending" | "approved" | "rejected" | "processing">("pending");
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<RefundRequest | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [rejectNote, setRejectNote]   = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_refunds").then(raw => {
      if (raw) setRefunds(JSON.parse(raw));
      else {
        setRefunds(SEED_REFUNDS);
        AsyncStorage.setItem("@staff_refunds", JSON.stringify(SEED_REFUNDS)).catch(() => {});
      }
    }).catch(() => setRefunds(SEED_REFUNDS));
  }, []));

  const persist = async (data: RefundRequest[]) => {
    setRefunds(data);
    await AsyncStorage.setItem("@staff_refunds", JSON.stringify(data)).catch(() => {});
  };

  const handleAction = (id: string, action: "approved" | "rejected" | "processing") => {
    const req = refunds.find(r => r.id === id);
    const labels: Record<string, string> = { approved: "Duyệt hoàn tiền", rejected: "Từ chối", processing: "Chuyển kế toán xử lý" };
    Alert.alert(labels[action], `Xác nhận ${labels[action].toLowerCase()} yêu cầu #${id}?\n\nKhách: ${req?.guestName}\nSố tiền hoàn: ${fmt(Math.round((req?.amount || 0) * (req?.refundPercent || 0) / 100))}`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          const updated = refunds.map(r => r.id === id ? { ...r, status: action } : r);
          await persist(updated);
          const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
          const nList = nRaw ? JSON.parse(nRaw) : [];
          const msgs: Record<string, string> = {
            approved:   `✅ Yêu cầu hoàn tiền ${fmt(Math.round((req?.amount || 0) * (req?.refundPercent || 0) / 100))} đã được DUYỆT. Tiền về trong 3-5 ngày làm việc.`,
            rejected:   `❌ Yêu cầu hoàn tiền #${id} đã bị từ chối. Liên hệ CSKH để biết thêm chi tiết.`,
            processing: `⏳ Yêu cầu hoàn tiền #${id} đang được kế toán xử lý. Vui lòng chờ.`,
          };
          nList.unshift({ id: `n${Date.now()}`, message: msgs[action], read: false, createdAt: new Date().toISOString() });
          await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
          setShowModal(false);
          Alert.alert("✅ Thành công", `Đã ${labels[action].toLowerCase()} yêu cầu #${id}`);
        },
      },
    ]);
  };

  const openDetail = (r: RefundRequest) => { setSelected(r); setShowModal(true); setShowRejectInput(false); setRejectNote(""); };

  const filtered = refunds.filter(r => {
    const matchStatus = filter === "all" ? true : r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName.toLowerCase().includes(q) || r.bookingId.toLowerCase().includes(q) || r.tourName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    const priority = { high: 0, normal: 1, low: 2 };
    return (priority[a.priority] || 1) - (priority[b.priority] || 1);
  });

  const pendingCount   = refunds.filter(r => r.status === "pending").length;
  const highPriority   = refunds.filter(r => r.priority === "high" && r.status === "pending").length;
  const totalPending   = refunds.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const totalApproved  = refunds.filter(r => r.status === "approved").reduce((s, r) => s + Math.round(r.amount * r.refundPercent / 100), 0);

  const FILTERS: [string, string][] = [["pending","Chờ duyệt"],["processing","Đang xử lý"],["approved","Đã duyệt"],["rejected","Từ chối"],["all","Tất cả"]];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Xử lý Hoàn tiền</Text>
          <Text style={s.headerSub}>{refunds.length} yêu cầu · {pendingCount} chờ duyệt</Text>
        </View>
        {pendingCount > 0 && (
          <View style={s.pendingBadge}>
            <Ionicons name="time-outline" size={12} color="#d97706" />
            <Text style={s.pendingTxt}>{pendingCount} chờ</Text>
          </View>
        )}
      </View>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCard, { backgroundColor: "#fef9c3", borderColor: "#fde68a" }]}>
          <Text style={[s.kpiValue, { color: "#d97706" }]}>{pendingCount}</Text>
          <Text style={s.kpiLabel}>Chờ duyệt</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#fee2e2", borderColor: "#fecaca" }]}>
          <Text style={[s.kpiValue, { color: "#dc2626" }]}>{highPriority}</Text>
          <Text style={s.kpiLabel}>Ưu tiên cao</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#eaf0ff", borderColor: "#bfcfff", flex: 1.5 }]}>
          <Text style={[s.kpiValue, { color: "#2856d6", fontSize: 14 }]}>{totalPending > 0 ? `${(totalPending / 1e6).toFixed(1)}M` : "—"}</Text>
          <Text style={s.kpiLabel}>Chờ xử lý (đ)</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#dcfce7", borderColor: "#86efac", flex: 1.5 }]}>
          <Text style={[s.kpiValue, { color: "#16a34a", fontSize: 14 }]}>{totalApproved > 0 ? `${(totalApproved / 1e6).toFixed(1)}M` : "—"}</Text>
          <Text style={s.kpiLabel}>Đã hoàn (đ)</Text>
        </View>
      </View>

      {/* ── Search ──────────────────────────────────────────── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#8ea0d6" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm theo tên khách, mã booking, tour..."
            placeholderTextColor="#b0bdd8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#b0bdd8" /></TouchableOpacity>}
        </View>
      </View>

      {/* ── Filters ─────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.filterChip, filter === k && s.filterActive]}
            onPress={() => setFilter(k as any)}
          >
            <Text style={[s.filterTxt, filter === k && s.filterTxtActive]}>{l}</Text>
            <View style={[s.filterCount, filter === k && s.filterCountActive]}>
              <Text style={[s.filterCountTxt, filter === k && { color: "#fff" }]}>
                {refunds.filter(r => k === "all" ? true : r.status === k).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 96 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="refresh-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có yêu cầu nào</Text>
          </View>
        ) : (
          filtered.map(r => {
            const catStyle = CATEGORY_COLOR[r.category] || { color: "#7a8cc2", bg: "#f1f5f9" };
            const priMeta = PRIORITY_META[r.priority] ?? PRIORITY_META.normal;
            const netRefund = Math.round(r.amount * r.refundPercent / 100);
            return (
              <TouchableOpacity key={r.id} style={[s.card, r.priority === "high" && r.status === "pending" && s.cardHighPriority]} onPress={() => openDetail(r)} activeOpacity={0.8}>
                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={s.cardIdRow}>
                      <Text style={s.refundId}>#{r.id}</Text>
                      <Text style={s.bookingId}>→ {r.bookingId}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <View style={[s.priBadge, { backgroundColor: priMeta.bg }]}>
                      <Text style={[s.priBadgeTxt, { color: priMeta.color }]}>{priMeta.label}</Text>
                    </View>
                    <View style={[s.statusBadge, {
                      backgroundColor: r.status === "pending" ? "#fef9c3" : r.status === "approved" ? "#dcfce7" : r.status === "processing" ? "#eaf0ff" : "#fee2e2"
                    }]}>
                      <Text style={[s.statusTxt, {
                        color: r.status === "pending" ? "#d97706" : r.status === "approved" ? "#16a34a" : r.status === "processing" ? "#2856d6" : "#dc2626"
                      }]}>
                        {r.status === "pending" ? "Chờ duyệt" : r.status === "approved" ? "Đã duyệt" : r.status === "processing" ? "Đang xử lý" : "Từ chối"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={s.tourName} numberOfLines={1}>{r.tourName}</Text>

                {/* Customer & Amount */}
                <View style={s.infoRow}>
                  <Ionicons name="person-outline" size={13} color="#7a8cc2" />
                  <Text style={s.infoTxt}>{r.guestName}</Text>
                  <Text style={s.dot}>·</Text>
                  <Ionicons name="call-outline" size={13} color="#7a8cc2" />
                  <Text style={s.infoTxt}>{r.guestPhone}</Text>
                </View>

                {/* Amount Breakdown */}
                <View style={s.amountRow}>
                  <View style={s.amountItem}>
                    <Text style={s.amountLabel}>Giá tour</Text>
                    <Text style={s.amountValue}>{fmt(r.amount)}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color="#c0cbe8" />
                  <View style={s.amountItem}>
                    <Text style={s.amountLabel}>Hoàn {r.refundPercent}%</Text>
                    <Text style={[s.amountValue, { color: "#16a34a", fontWeight: "800" }]}>{fmt(netRefund)}</Text>
                  </View>
                  {r.feeAmount > 0 && (
                    <>
                      <Ionicons name="arrow-forward" size={14} color="#c0cbe8" />
                      <View style={s.amountItem}>
                        <Text style={s.amountLabel}>Phí phạt</Text>
                        <Text style={[s.amountValue, { color: "#dc2626" }]}>{fmt(r.feeAmount)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Category & Reason */}
                <View style={[s.categoryBadge, { backgroundColor: catStyle.bg }]}>
                  <Text style={[s.categoryTxt, { color: catStyle.color }]}>{r.category}</Text>
                </View>
                <View style={s.reasonBox}>
                  <Ionicons name="chatbox-outline" size={13} color="#7a8cc2" />
                  <Text style={s.reasonTxt} numberOfLines={2}>{r.reason}</Text>
                </View>

                {/* Evidence */}
                {r.evidence && (
                  <View style={s.evidenceBox}>
                    <Ionicons name="attach-outline" size={13} color="#2856d6" />
                    <Text style={s.evidenceTxt}>{r.evidence}</Text>
                  </View>
                )}

                {/* Actions */}
                {r.status === "pending" && (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: "#dcfce7", flex: 1 }]}
                      onPress={() => handleAction(r.id, "approved")}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                      <Text style={[s.actionTxt, { color: "#16a34a" }]}>Duyệt hoàn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: "#eaf0ff", flex: 1 }]}
                      onPress={() => handleAction(r.id, "processing")}
                    >
                      <Ionicons name="business-outline" size={16} color="#2856d6" />
                      <Text style={[s.actionTxt, { color: "#2856d6" }]}>Kế toán</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: "#fee2e2", flex: 1 }]}
                      onPress={() => handleAction(r.id, "rejected")}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                      <Text style={[s.actionTxt, { color: "#dc2626" }]}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <StaffTabBar activeRoute="/staff-refund-management" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub:        { fontSize: 11, color: "#7a8cc2", marginTop: 2, fontWeight: "500" },
  pendingBadge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pendingTxt:       { color: "#d97706", fontWeight: "800", fontSize: 11 },
  kpiRow:           { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  kpiCard:          { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center" },
  kpiValue:         { fontWeight: "900", fontSize: 18, letterSpacing: -0.5 },
  kpiLabel:         { color: "#7a8cc2", fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },
  searchWrap:       { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10 },
  searchBox:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:      { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow:        { gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  filterChip:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#f8faff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:     { backgroundColor: "#d97706", borderColor: "#d97706" },
  filterTxt:        { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive:  { color: "#fff" },
  filterCount:      { backgroundColor: "#eaf0ff", borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountActive:{ backgroundColor: "rgba(255,255,255,0.3)" },
  filterCountTxt:   { color: "#2856d6", fontSize: 10, fontWeight: "800" },
  content:          { padding: 14, paddingTop: 10 },
  emptyCard:        { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 40, alignItems: "center", gap: 10 },
  emptyTxt:         { color: "#7a8cc2", fontWeight: "600" },
  card:             { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  cardHighPriority: { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  cardIdRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  refundId:         { color: "#7a8cc2", fontSize: 11, fontWeight: "700" },
  bookingId:        { color: "#2856d6", fontSize: 11, fontWeight: "600" },
  priBadge:         { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  priBadgeTxt:      { fontSize: 10, fontWeight: "700" },
  statusBadge:      { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusTxt:        { fontSize: 10, fontWeight: "700" },
  tourName:         { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 8 },
  infoRow:          { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  infoTxt:          { color: "#7a8cc2", fontSize: 12, fontWeight: "500" },
  dot:              { color: "#c0cbe8" },
  amountRow:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8faff", borderRadius: 12, padding: 12, marginBottom: 10 },
  amountItem:       { flex: 1, alignItems: "center" },
  amountLabel:      { color: "#94a3b8", fontSize: 10, fontWeight: "600", marginBottom: 3 },
  amountValue:      { color: "#1f2a58", fontSize: 13, fontWeight: "700" },
  categoryBadge:    { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  categoryTxt:      { fontSize: 11, fontWeight: "700" },
  reasonBox:        { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#f8faff", borderRadius: 10, padding: 10, marginBottom: 8 },
  reasonTxt:        { color: "#5f73a9", fontSize: 12, flex: 1, lineHeight: 18 },
  evidenceBox:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: "flex-start" },
  evidenceTxt:      { color: "#2856d6", fontSize: 11, fontWeight: "600" },
  actionRow:        { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 10 },
  actionTxt:        { fontSize: 12, fontWeight: "700" },
});