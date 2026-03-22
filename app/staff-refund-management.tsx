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
  { id: "rf008", bookingId: "BK001008", tourName: "Đà Nẵng 3N2Đ - Cầu Vàng kỳ vĩ",       guestName: "Bùi Thanh K",   guestPhone: "0922 777 888", amount: 3600000, refundPercent: 50,  feeAmount: 1800000, reason: "Tour cam kết xe Limousine nhưng đón bằng xe 16 chỗ cũ kỹ", category: "Lỗi nhà cung cấp", status: "processing", createdAt: new Date(Date.now() - 43200000).toISOString(),  priority: "high",  evidence: "Ảnh xe 16 chỗ, hợp đồng ghi Limousine" },
  { id: "rf011", bookingId: "BK001011", tourName: "Phong Nha 3N2Đ - Hang động kỳ vĩ",     guestName: "Lý Hoàng N",    guestPhone: "0911 234 567", amount: 4100000, refundPercent: 80,  feeAmount: 820000,  reason: "Khách sạn không đúng hạng sao như cam kết trong hợp đồng", category: "Lỗi nhà cung cấp", status: "processing", createdAt: new Date(Date.now() - 21600000).toISOString(),  priority: "normal", evidence: "Ảnh khách sạn, hợp đồng đặt tour" },
  { id: "rf012", bookingId: "BK001012", tourName: "Huế 2N1Đ - Cố đô hoàng cung",          guestName: "Phan Thị P",    guestPhone: "0988 765 432", amount: 2750000, refundPercent: 60,  feeAmount: 1100000, reason: "Hướng dẫn viên thiếu chuyên nghiệp, không giải thích lịch sử", category: "Lỗi nhà cung cấp", status: "processing", createdAt: new Date(Date.now() - 18000000).toISOString(), priority: "normal", evidence: "Video clip, đánh giá khách đoàn" },
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
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeTarget, setFinanceTarget]       = useState<RefundRequest | null>(null);
  const [financeNote, setFinanceNote]           = useState("");
  const [financeMethod, setFinanceMethod]       = useState<"bank" | "momo" | "zalopay" | "cash">("bank");
  const [financeAccount, setFinanceAccount]     = useState("");
  // ── Confirm Modal (Duyệt hoàn / Từ chối) ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction]       = useState<"approved" | "rejected" | null>(null);
  const [confirmTarget, setConfirmTarget]       = useState<RefundRequest | null>(null);
  const [rejectReason, setRejectReason]         = useState("");
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_refunds").then(raw => {
      if (raw) {
        const saved: RefundRequest[] = JSON.parse(raw);
        // Nếu data cũ không có bản ghi "processing" nào → reset để load seed mới
        const hasProcessing = saved.some(r => r.status === "processing");
        if (!hasProcessing) {
          setRefunds(SEED_REFUNDS);
          AsyncStorage.setItem("@staff_refunds", JSON.stringify(SEED_REFUNDS)).catch(() => {});
        } else {
          setRefunds(saved);
        }
      } else {
        setRefunds(SEED_REFUNDS);
        AsyncStorage.setItem("@staff_refunds", JSON.stringify(SEED_REFUNDS)).catch(() => {});
      }
    }).catch(() => setRefunds(SEED_REFUNDS));
  }, []));

  const persist = async (data: RefundRequest[]) => {
    setRefunds(data);
    await AsyncStorage.setItem("@staff_refunds", JSON.stringify(data)).catch(() => {});
  };

 const execAction = async (id: string, action: "approved" | "rejected" | "processing") => {
    const req = refunds.find(r => r.id === id);
    const refundAmt = fmt(Math.round((req?.amount || 0) * (Number(req?.refundPercent) || 0) / 100));
    const updated = refunds.map(r => r.id === id ? { ...r, status: action } : r);
    await persist(updated);
    const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    const msgs: Record<string, string> = {
      approved:   `✅ Yêu cầu hoàn tiền ${refundAmt} đã được DUYỆT qua Auto-Refund. Tiền về ngay trong 5-15 phút.`,
      rejected:   `❌ Yêu cầu hoàn tiền #${id} đã bị từ chối. Liên hệ CSKH để biết thêm chi tiết.`,
      processing: `⏳ Yêu cầu #${id} đã chuyển Kế toán xử lý. Tiền hoàn về trong 3-5 ngày làm việc.`,
    };
    nList.unshift({ id: `n${Date.now()}`, message: msgs[action], read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});
    setShowModal(false);
    window.alert(action === "approved" ? `✅ Đã duyệt hoàn tự động cho #${id}` : action === "rejected" ? `❌ Đã từ chối yêu cầu #${id}` : `📋 Đã chuyển #${id} sang Kế toán`);
  };

  const handleAction = (id: string, action: "approved" | "rejected" | "processing") => {
    const req = refunds.find(r => r.id === id);
    if (action === "processing") {
      setFinanceTarget(req || null);
      setFinanceNote("");
      setFinanceMethod("bank");
      setFinanceAccount("");
      setShowFinanceModal(true);
      return;
    }
    // Mở Confirm Modal đẹp
    setConfirmTarget(req || null);
    setConfirmAction(action);
    setRejectReason("");
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmTarget || !confirmAction) return;
    if (confirmAction === "rejected" && !rejectReason.trim()) {
      // hiển thị lỗi inline, không dùng alert
      return;
    }
    await execAction(confirmTarget.id, confirmAction);
    setShowConfirmModal(false);
  };

  const handleFinanceSubmit = async () => {
    if (!financeTarget) return;
    if (!financeNote.trim()) { window.alert("⚠️ Vui lòng nhập ghi chú cho Kế toán!"); return; }
    await execAction(financeTarget.id, "processing");
    // Lưu thêm finance note vào notification kế toán
    const fRaw = await AsyncStorage.getItem("@finance_notifications").catch(() => null);
    const fList = fRaw ? JSON.parse(fRaw) : [];
    const methodLabel: Record<string, string> = { bank: "Chuyển khoản ngân hàng", momo: "Ví MoMo", zalopay: "ZaloPay", cash: "Tiền mặt tại quầy" };
    fList.unshift({
      id: `fn${Date.now()}`,
      refundId: financeTarget.id,
      bookingId: financeTarget.bookingId,
      guestName: financeTarget.guestName,
      amount: Math.round((financeTarget.amount || 0) * (Number(financeTarget.refundPercent) || 0) / 100),
      method: financeMethod,
      methodLabel: methodLabel[financeMethod],
      account: financeAccount,
      note: financeNote,
      status: "pending_transfer",
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem("@finance_notifications", JSON.stringify(fList)).catch(() => {});
    setShowFinanceModal(false);
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
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
            const netRefund = Math.round((r.amount || 0) * (Number(r.refundPercent) || 0) / 100);
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
                {(r.status === "pending" || r.status === "processing") && (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: "#dcfce7", flex: 1 }]}
                      onPress={() => handleAction(r.id, "approved")}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                      <Text style={[s.actionTxt, { color: "#16a34a" }]}>Duyệt hoàn</Text>
                    </TouchableOpacity>
                    {r.status === "pending" && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: "#eaf0ff", flex: 1 }]}
                        onPress={() => handleAction(r.id, "processing")}
                      >
                        <Ionicons name="business-outline" size={16} color="#2856d6" />
                        <Text style={[s.actionTxt, { color: "#2856d6" }]}>Kế toán</Text>
                      </TouchableOpacity>
                    )}
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

      {/* ── Confirm Modal (Duyệt hoàn / Từ chối) ───────────── */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={sc.overlay}>
          <View style={sc.card}>

            {/* Icon + Tiêu đề */}
            {confirmAction === "approved" ? (
              <View style={[sc.iconWrap, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
              </View>
            ) : (
              <View style={[sc.iconWrap, { backgroundColor: "#fee2e2" }]}>
                <Ionicons name="close-circle" size={32} color="#dc2626" />
              </View>
            )}

            <Text style={sc.title}>
              {confirmAction === "approved" ? "Xác nhận Duyệt hoàn" : "Xác nhận Từ chối"}
            </Text>
            <Text style={sc.subtitle}>
              {confirmAction === "approved"
                ? "Hệ thống sẽ tự động hoàn tiền về phương thức thanh toán gốc của khách."
                : "Yêu cầu sẽ bị từ chối và khách hàng sẽ nhận thông báo."}
            </Text>

            {/* Thông tin yêu cầu */}
            <View style={sc.infoBox}>
              <View style={sc.infoRow}>
                <Text style={sc.infoLabel}>Yêu cầu</Text>
                <Text style={sc.infoVal}>#{confirmTarget?.id} · {confirmTarget?.bookingId}</Text>
              </View>
              <View style={sc.divider} />
              <View style={sc.infoRow}>
                <Text style={sc.infoLabel}>Khách hàng</Text>
                <Text style={sc.infoVal}>{confirmTarget?.guestName}</Text>
              </View>
              <View style={sc.divider} />
              <View style={sc.infoRow}>
                <Text style={sc.infoLabel}>Tour</Text>
                <Text style={[sc.infoVal, { flex: 1, textAlign: "right" }]} numberOfLines={1}>{confirmTarget?.tourName}</Text>
              </View>
              <View style={sc.divider} />
              <View style={sc.infoRow}>
                <Text style={sc.infoLabel}>Số tiền hoàn</Text>
                <Text style={[sc.infoVal, { color: confirmAction === "approved" ? "#16a34a" : "#dc2626", fontWeight: "800" }]}>
                  {fmt(Math.round((confirmTarget?.amount || 0) * (Number(confirmTarget?.refundPercent) || 0) / 100))}
                </Text>
              </View>
            </View>

            {/* Ô lý do từ chối */}
            {confirmAction === "rejected" && (
              <View style={{ width: "100%", marginBottom: 4 }}>
                <Text style={sc.reasonLabel}>Lý do từ chối <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <TextInput
                  style={[sc.reasonInput, !rejectReason.trim() && showConfirmModal ? sc.reasonInputError : null]}
                  placeholder="VD: Hủy sau 24h không đủ điều kiện hoàn tiền theo chính sách..."
                  placeholderTextColor="#b0bdd8"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={3}
                />
                {!rejectReason.trim() && (
                  <Text style={sc.errorTxt}>Vui lòng nhập lý do từ chối</Text>
                )}
              </View>
            )}

            {/* Buttons */}
            <View style={sc.btnRow}>
              <TouchableOpacity style={sc.cancelBtn} onPress={() => setShowConfirmModal(false)}>
                <Text style={sc.cancelTxt}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sc.confirmBtn, { backgroundColor: confirmAction === "approved" ? "#16a34a" : "#dc2626" }]}
                onPress={handleConfirmSubmit}
              >
                <Ionicons
                  name={confirmAction === "approved" ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={16} color="#fff"
                />
                <Text style={sc.confirmTxt}>
                  {confirmAction === "approved" ? "Duyệt hoàn ngay" : "Xác nhận từ chối"}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ── Finance Modal ────────────────────────────────────── */}
      <Modal visible={showFinanceModal} transparent animationType="slide" onRequestClose={() => setShowFinanceModal(false)}>
        <View style={sf.overlay}>
          <View style={sf.sheet}>
            {/* Header */}
            <View style={sf.header}>
              <View style={sf.headerIcon}>
                <Ionicons name="business-outline" size={20} color="#2856d6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sf.headerTitle}>Chuyển Kế toán xử lý</Text>
                <Text style={sf.headerSub}>#{financeTarget?.id} · {financeTarget?.guestName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFinanceModal(false)} style={sf.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Amount Summary */}
              <View style={sf.amountBox}>
                <View style={sf.amountItem}>
                  <Text style={sf.amountLabel}>Giá tour</Text>
                  <Text style={sf.amountVal}>{fmt(financeTarget?.amount || 0)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#c0cbe8" />
                <View style={sf.amountItem}>
                  <Text style={sf.amountLabel}>Hoàn {financeTarget?.refundPercent}%</Text>
                  <Text style={[sf.amountVal, { color: "#16a34a", fontSize: 16 }]}>
                    {fmt(Math.round((financeTarget?.amount || 0) * (Number(financeTarget?.refundPercent) || 0) / 100))}
                  </Text>
                </View>
              </View>

              {/* Phương thức hoàn */}
              <Text style={sf.sectionLabel}>Phương thức hoàn tiền</Text>
              <View style={sf.methodRow}>
                {([
                  { key: "bank",    icon: "card-outline",       label: "Ngân hàng" },
                  { key: "momo",    icon: "wallet-outline",      label: "MoMo" },
                  { key: "zalopay", icon: "phone-portrait-outline", label: "ZaloPay" },
                  { key: "cash",    icon: "cash-outline",        label: "Tiền mặt" },
                ] as const).map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[sf.methodChip, financeMethod === m.key && sf.methodChipActive]}
                    onPress={() => setFinanceMethod(m.key)}
                  >
                    <Ionicons name={m.icon} size={16} color={financeMethod === m.key ? "#fff" : "#7a8cc2"} />
                    <Text style={[sf.methodTxt, financeMethod === m.key && { color: "#fff" }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Số tài khoản / SĐT */}
              {financeMethod !== "cash" && (
                <>
                  <Text style={sf.sectionLabel}>
                    {financeMethod === "bank" ? "Số tài khoản ngân hàng" : financeMethod === "momo" ? "Số điện thoại MoMo" : "Số điện thoại ZaloPay"}
                  </Text>
                  <TextInput
                    style={sf.input}
                    placeholder={financeMethod === "bank" ? "VD: 0123456789 - Vietcombank - Trần Văn B" : "VD: 0912 345 678"}
                    placeholderTextColor="#b0bdd8"
                    value={financeAccount}
                    onChangeText={setFinanceAccount}
                    keyboardType="default"
                  />
                </>
              )}

              {/* Ghi chú cho Kế toán */}
              <Text style={sf.sectionLabel}>
                Ghi chú cho Kế toán <Text style={{ color: "#dc2626" }}>*</Text>
              </Text>
              <TextInput
                style={[sf.input, sf.inputMulti]}
                placeholder={"VD: Hoàn 100% do lỗi Partner hủy tour\nKhách yêu cầu nhận qua MoMo SĐT: 0912345678"}
                placeholderTextColor="#b0bdd8"
                value={financeNote}
                onChangeText={setFinanceNote}
                multiline
                numberOfLines={3}
              />

              {/* Info box */}
              <View style={sf.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color="#2856d6" />
                <Text style={sf.infoTxt}>
                  Sau khi xác nhận, yêu cầu sẽ chuyển sang tab <Text style={{ fontWeight: "800" }}>Đang xử lý</Text> và Kế toán sẽ nhận thông báo để tiến hành giải ngân.
                </Text>
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={sf.footer}>
              <TouchableOpacity style={sf.cancelBtn} onPress={() => setShowFinanceModal(false)}>
                <Text style={sf.cancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sf.submitBtn} onPress={handleFinanceSubmit}>
                <Ionicons name="business-outline" size={16} color="#fff" />
                <Text style={sf.submitTxt}>Chuyển Kế toán</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  searchWrap:       { backgroundColor: "#fff", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  searchBox:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:      { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterScroll:     { minHeight: 52, flexShrink: 0, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  filterRow:        { gap: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
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

const sf = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: "rgba(15,25,60,0.45)", justifyContent: "flex-end" },
  sheet:            { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  header:           { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  headerIcon:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  headerSub:        { fontSize: 11, color: "#7a8cc2", marginTop: 1 },
  closeBtn:         { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  amountBox:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f3f7ff", borderRadius: 14, margin: 16, padding: 14 },
  amountItem:       { flex: 1, alignItems: "center" },
  amountLabel:      { color: "#94a3b8", fontSize: 10, fontWeight: "600", marginBottom: 4 },
  amountVal:        { color: "#1f2a58", fontSize: 14, fontWeight: "800" },
  sectionLabel:     { color: "#7a8cc2", fontSize: 11, fontWeight: "700", marginHorizontal: 16, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  methodRow:        { flexDirection: "row", gap: 8, paddingHorizontal: 16, flexWrap: "wrap" },
  methodChip:       { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1.5, borderColor: "#dfe7ff", backgroundColor: "#f8faff", paddingHorizontal: 12, paddingVertical: 8 },
  methodChipActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  methodTxt:        { fontSize: 12, fontWeight: "700", color: "#6c7fb7" },
  input:            { marginHorizontal: 16, borderWidth: 1.5, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: "#1f2a58", backgroundColor: "#f8faff" },
  inputMulti:       { minHeight: 80, textAlignVertical: "top", paddingTop: 11, marginTop: 0 },
  infoBox:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#eaf0ff", borderRadius: 12, margin: 16, padding: 12 },
  infoTxt:          { flex: 1, color: "#2856d6", fontSize: 12, lineHeight: 18 },
  footer:           { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  cancelBtn:        { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#dfe7ff", paddingVertical: 13, alignItems: "center" },
  cancelTxt:        { color: "#7a8cc2", fontWeight: "700", fontSize: 14 },
  submitBtn:        { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2856d6", borderRadius: 12, paddingVertical: 13 },
  submitTxt:        { color: "#fff", fontWeight: "800", fontSize: 14 },
});

const sc = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: "rgba(15,25,60,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  card:             { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  iconWrap:         { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title:            { fontSize: 18, fontWeight: "900", color: "#1f2a58", marginBottom: 6, textAlign: "center" },
  subtitle:         { fontSize: 12, color: "#7a8cc2", textAlign: "center", lineHeight: 18, marginBottom: 16, paddingHorizontal: 4 },
  infoBox:          { width: "100%", backgroundColor: "#f8faff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  infoRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  infoLabel:        { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  infoVal:          { color: "#1f2a58", fontSize: 12, fontWeight: "700", maxWidth: "60%" },
  divider:          { height: 1, backgroundColor: "#f0f4ff" },
  reasonLabel:      { color: "#7a8cc2", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  reasonInput:      { borderWidth: 1.5, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: "#1f2a58", backgroundColor: "#f8faff", minHeight: 75, textAlignVertical: "top" },
  reasonInputError: { borderColor: "#fca5a5" },
  errorTxt:         { color: "#dc2626", fontSize: 11, marginTop: 4, marginLeft: 2 },
  btnRow:           { flexDirection: "row", gap: 10, width: "100%", marginTop: 6 },
  cancelBtn:        { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#dfe7ff", paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  cancelTxt:        { color: "#7a8cc2", fontWeight: "700", fontSize: 14 },
  confirmBtn:       { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13 },
  confirmTxt:       { color: "#fff", fontWeight: "800", fontSize: 14 },
});