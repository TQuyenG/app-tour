/**
 * app/admin-refund-management.tsx
 * Admin xem toàn bộ + duyệt/từ chối hoàn tiền — đồng bộ với staff & guest
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

interface RefundRequest {
  id: string; bookingId: string; tourName: string;
  guestName: string; guestPhone: string;
  amount: number; refundPercent: number; feeAmount: number;
  reason: string; category: string;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string; evidence?: string; priority: "high" | "normal" | "low";
  note?: string; resolvedAt?: string;
}

const TOUR_IMAGES: Record<string, string> = {
  "rf001": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=400&q=80",
  "rf002": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80",
  "rf003": "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&q=80",
  "rf004": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "rf005": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
  "rf006": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "rf007": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  "rf008": "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&q=80",
  "rf009": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "rf010": "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80",
  "rf011": "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400&q=80",
  "rf012": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
};

function getTourImg(id: string, tourName: string): string {
  if (TOUR_IMAGES[id]) return TOUR_IMAGES[id];
  const n = tourName.toLowerCase();
  if (n.includes("hội an"))    return "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80";
  if (n.includes("nha trang")) return "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80";
  if (n.includes("phú quốc"))  return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80";
  if (n.includes("đà nẵng"))   return "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80";
  if (n.includes("sapa"))      return "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&q=80";
  if (n.includes("hạ long"))   return "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80";
  return "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80";
}

const SEED_REFUNDS: RefundRequest[] = [
  { id: "rf001", bookingId: "BK001001", tourName: "Đà Lạt 3N2Đ - Thành phố ngàn hoa",      guestName: "Nguyễn Văn A",  guestPhone: "0901 234 567", amount: 2990000, refundPercent: 50,  feeAmount: 1495000, reason: "Khách bị sốt cao, có giấy chứng nhận bệnh viện",                    category: "Bất khả kháng",        status: "pending",    createdAt: new Date(Date.now()-3600000).toISOString(),   priority: "normal", evidence: "Giấy ra viện, đơn thuốc bác sĩ" },
  { id: "rf002", bookingId: "BK001002", tourName: "Phú Quốc 4N3Đ - Resort biển xanh",       guestName: "Trần Văn B",    guestPhone: "0912 345 678", amount: 4690000, refundPercent: 80,  feeAmount: 938000,  reason: "HDV không đúng hẹn, đến trễ 2 tiếng so với lịch",                  category: "Lỗi nhà cung cấp",     status: "pending",    createdAt: new Date(Date.now()-7200000).toISOString(),   priority: "high" },
  { id: "rf003", bookingId: "BK001003", tourName: "Sapa 3N2Đ - Mùa lúa chín",               guestName: "Lê Thị C",      guestPhone: "0933 111 222", amount: 3590000, refundPercent: 100, feeAmount: 0,       reason: "Tour bị hủy do thời tiết xấu, mưa lớn liên tục",                   category: "Thiên tai / Thời tiết",status: "approved",   createdAt: new Date(Date.now()-86400000).toISOString(),  priority: "normal" },
  { id: "rf004", bookingId: "BK001004", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng",         guestName: "Phạm Quốc D",   guestPhone: "0944 222 333", amount: 2300000, refundPercent: 0,   feeAmount: 0,       reason: "Đổi ý không muốn đi nữa, hủy trước 1 ngày",                        category: "Đổi ý khách",          status: "rejected",   createdAt: new Date(Date.now()-172800000).toISOString(), priority: "low",   note: "Không đủ điều kiện hoàn theo chính sách hủy muộn." },
  { id: "rf005", bookingId: "BK001005", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan",           guestName: "Hoàng Thị E",   guestPhone: "0955 333 444", amount: 3500000, refundPercent: 70,  feeAmount: 1050000, reason: "Dịch vụ không đúng mô tả, thiếu 2 bữa ăn, phòng sai loại",         category: "Lỗi nhà cung cấp",     status: "pending",    createdAt: new Date(Date.now()-1800000).toISOString(),   priority: "high",  evidence: "Ảnh phòng khách sạn, hóa đơn bữa ăn" },
  { id: "rf006", bookingId: "BK001006", tourName: "Mũi Né 2N1Đ - Đồi cát vàng",            guestName: "Nguyễn Minh F", guestPhone: "0966 444 555", amount: 1900000, refundPercent: 100, feeAmount: 0,       reason: "Xe đón bị trễ 2 tiếng, khách lỡ chuyến bay nối",                   category: "Lỗi nhà cung cấp",     status: "approved",   createdAt: new Date(Date.now()-259200000).toISOString(), priority: "normal" },
  { id: "rf007", bookingId: "BK001007", tourName: "Côn Đảo 4N3Đ - Thiên đường",            guestName: "Trần Thanh G",  guestPhone: "0977 555 666", amount: 5300000, refundPercent: 100, feeAmount: 0,       reason: "HDV hủy tour đột ngột không báo trước, Partner vỡ lịch",            category: "Lỗi nhà cung cấp",     status: "pending",    createdAt: new Date(Date.now()-900000).toISOString(),    priority: "high",  evidence: "Tin nhắn HDV hủy tour" },
  { id: "rf008", bookingId: "BK001008", tourName: "Đà Nẵng 3N2Đ - Cầu Vàng kỳ vĩ",        guestName: "Bùi Thanh K",   guestPhone: "0922 777 888", amount: 3600000, refundPercent: 50,  feeAmount: 1800000, reason: "Tour cam kết xe Limousine nhưng đón bằng xe 16 chỗ cũ kỹ",          category: "Lỗi nhà cung cấp",     status: "processing", createdAt: new Date(Date.now()-43200000).toISOString(),  priority: "high",  evidence: "Ảnh xe 16 chỗ, hợp đồng ghi Limousine" },
];

const STATUS_META = {
  pending:    { label: "Chờ duyệt",    color: "#d97706", bg: "#fef9c3", icon: "time-outline" },
  approved:   { label: "Đã duyệt",     color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  rejected:   { label: "Từ chối",      color: "#dc2626", bg: "#fee2e2", icon: "close-circle-outline" },
  processing: { label: "Đang xử lý",   color: "#2856d6", bg: "#eaf0ff", icon: "refresh-outline" },
} as const;

const PRIORITY_META = {
  high:   { label: "Ưu tiên cao", color: "#dc2626", bg: "#fee2e2" },
  normal: { label: "Bình thường", color: "#2856d6", bg: "#eaf0ff" },
  low:    { label: "Thấp",        color: "#94a3b8", bg: "#f1f5f9" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function AdminRefundManagement() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [refunds, setRefunds]       = useState<RefundRequest[]>([]);
  const [filter, setFilter]         = useState<"all"|"pending"|"approved"|"rejected"|"processing">("pending");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<RefundRequest | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showConfirm, setShowConfirm]   = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approved"|"rejected"|null>(null);
  const [confirmTarget, setConfirmTarget] = useState<RefundRequest|null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_refunds").then(raw => {
      if (raw) {
        const list: RefundRequest[] = JSON.parse(raw);
        setRefunds(list.length > 0 ? list : SEED_REFUNDS);
      } else {
        setRefunds(SEED_REFUNDS);
        AsyncStorage.setItem("@staff_refunds", JSON.stringify(SEED_REFUNDS)).catch(() => {});
      }
    }).catch(() => setRefunds(SEED_REFUNDS));
  }, []));

  const persist = async (data: RefundRequest[]) => {
    setRefunds(data);
    // Ghi vào cả staff_refunds lẫn admin_refunds để đồng bộ
    await AsyncStorage.setItem("@staff_refunds", JSON.stringify(data)).catch(() => {});
    await AsyncStorage.setItem("@admin_refunds", JSON.stringify(data)).catch(() => {});
  };

  const execAction = async (id: string, action: "approved"|"rejected"|"processing", note?: string) => {
    const req = refunds.find(r => r.id === id);
    const refundAmt = fmt(Math.round((req?.amount||0) * (Number(req?.refundPercent)||0) / 100));
    const now = new Date().toLocaleDateString("vi-VN");
    const updated = refunds.map(r =>
      r.id === id ? { ...r, status: action, note: note || r.note, resolvedAt: action !== "processing" ? now : undefined } : r
    );
    await persist(updated);

    // Đồng bộ ngược về guest_refunds
    const gRaw = await AsyncStorage.getItem("@guest_refunds").catch(() => null);
    const gList = gRaw ? JSON.parse(gRaw) : [];
    const gUpdated = gList.map((r: any) =>
      r.id === id ? { ...r, status: action, note: note || r.note, resolvedAt: action !== "processing" ? now : undefined } : r
    );
    await AsyncStorage.setItem("@guest_refunds", JSON.stringify(gUpdated)).catch(() => {});

    // Push notification cho guest
    const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    const msgs: Record<string, string> = {
      approved:   `✅ [Admin] Yêu cầu hoàn tiền ${refundAmt} đã được DUYỆT. Tiền về trong 5-15 phút.`,
      rejected:   `❌ [Admin] Yêu cầu hoàn tiền #${id} đã bị từ chối. Lý do: ${note || "Không đủ điều kiện."}`,
      processing: `⏳ [Admin] Yêu cầu #${id} đã chuyển Kế toán xử lý. Tiền hoàn về trong 3-5 ngày.`,
    };
    nList.unshift({ id: `n${Date.now()}`, message: msgs[action], read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});

    setShowModal(false);
    setShowConfirm(false);
  };

  const openDetail = (r: RefundRequest) => {
    setSelected(r);
    setShowModal(true);
    setRejectReason("");
  };

  const openConfirm = (action: "approved"|"rejected") => {
    setConfirmAction(action);
    setConfirmTarget(selected);
    setShowConfirm(true);
  };

  const filtered = refunds.filter(r => {
    const matchStatus = filter === "all" ? true : r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName.toLowerCase().includes(q) || r.bookingId.toLowerCase().includes(q) || r.tourName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    const p = { high: 0, normal: 1, low: 2 };
    return (p[a.priority]||1) - (p[b.priority]||1);
  });

  const pendingCount  = refunds.filter(r => r.status === "pending").length;
  const highPriority  = refunds.filter(r => r.priority === "high" && r.status === "pending").length;
  const totalApproved = refunds.filter(r => r.status === "approved").reduce((s,r) => s + Math.round(r.amount*r.refundPercent/100), 0);
  const totalPending  = refunds.filter(r => r.status === "pending").reduce((s,r) => s + r.amount, 0);

  const FILTERS: [string,string][] = [["pending","Chờ duyệt"],["processing","Đang xử lý"],["approved","Đã duyệt"],["rejected","Từ chối"],["all","Tất cả"]];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Quản lý Hoàn tiền</Text>
          <Text style={s.headerSub}>{refunds.length} yêu cầu · {pendingCount} chờ duyệt · quyền Admin</Text>
        </View>
        {pendingCount > 0 && (
          <View style={s.pendingBadge}>
            <Ionicons name="time-outline" size={12} color="#d97706" />
            <Text style={s.pendingTxt}>{pendingCount} chờ</Text>
          </View>
        )}
      </View>

      {/* KPI Row */}
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
          <Text style={[s.kpiValue, { color: "#2856d6", fontSize: 14 }]}>{totalPending > 0 ? `${(totalPending/1e6).toFixed(1)}M` : "—"}</Text>
          <Text style={s.kpiLabel}>Chờ xử lý</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#dcfce7", borderColor: "#86efac", flex: 1.5 }]}>
          <Text style={[s.kpiValue, { color: "#16a34a", fontSize: 14 }]}>{totalApproved > 0 ? `${(totalApproved/1e6).toFixed(1)}M` : "—"}</Text>
          <Text style={s.kpiLabel}>Đã hoàn</Text>
        </View>
      </View>

      {/* Search */}
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

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {FILTERS.map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.filterChip, filter === k && s.filterActive]} onPress={() => setFilter(k as any)}>
            <Text style={[s.filterTxt, filter === k && s.filterTxtActive]}>{l}</Text>
            <View style={[s.filterCount, filter === k && s.filterCountActive]}>
              <Text style={[s.filterCountTxt, filter === k && { color: "#fff" }]}>
                {refunds.filter(r => k === "all" ? true : r.status === k).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="refresh-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có yêu cầu nào</Text>
          </View>
        ) : (
          filtered.map(r => {
            const meta     = STATUS_META[r.status];
            const priMeta  = PRIORITY_META[r.priority] ?? PRIORITY_META.normal;
            const netRefund = Math.round((r.amount||0) * (Number(r.refundPercent)||0) / 100);
            return (
              <TouchableOpacity key={r.id} style={[s.card, r.priority === "high" && r.status === "pending" && s.cardHighPriority]} onPress={() => openDetail(r)} activeOpacity={0.8}>
                {/* Ảnh */}
                <View style={s.cardImgWrap}>
                  <Image source={{ uri: getTourImg(r.id, r.tourName) }} style={s.cardImg} resizeMode="cover" />
                  <View style={s.cardImgOverlay} />
                  <View style={s.cardImgBadgeRow}>
                    <View style={[s.priBadgeFloat, { backgroundColor: priMeta.bg }]}>
                      <Text style={[s.priBadgeTxt, { color: priMeta.color }]}>{priMeta.label}</Text>
                    </View>
                    <View style={[s.statusBadgeFloat, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={s.cardImgId}>#{r.id} · {r.bookingId}</Text>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.tourName} numberOfLines={1}>{r.tourName}</Text>
                  <Text style={s.guestName}><Ionicons name="person-outline" size={11} /> {r.guestName} · {r.guestPhone}</Text>

                  <View style={s.amountRow}>
                    <View>
                      <Text style={s.amountLabelSm}>Yêu cầu</Text>
                      <Text style={s.amount}>{fmt(r.amount)}</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={s.amountLabelSm}>Tỉ lệ</Text>
                      <Text style={[s.amount, { color: "#f59e0b", fontSize: 14 }]}>{r.refundPercent}%</Text>
                    </View>
                    <View style={s.netRefundBox}>
                      <Text style={s.netRefundLabel}>Thực hoàn</Text>
                      <Text style={s.netRefund}>{fmt(netRefund)}</Text>
                    </View>
                  </View>

                  <Text style={s.reasonTxt} numberOfLines={2}>{r.reason}</Text>

                  {r.evidence && (
                    <View style={s.evidenceRow}>
                      <Ionicons name="attach-outline" size={12} color="#8b5cf6" />
                      <Text style={s.evidenceTxt}>{r.evidence}</Text>
                    </View>
                  )}

                  {r.note && (
                    <View style={s.noteBox}>
                      <Ionicons name="information-circle-outline" size={12} color="#2856d6" />
                      <Text style={s.noteTxt}>{r.note}</Text>
                    </View>
                  )}

                  <View style={s.dateRow}>
                    <Text style={s.dateTxt}>
                      <Ionicons name="calendar-outline" size={10} /> {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </Text>
                    {r.status === "pending" && (
                      <View style={s.actionRow}>
                        <TouchableOpacity style={s.approveBtn} onPress={() => { openDetail(r); }}>
                          <Ionicons name="checkmark-outline" size={13} color="#fff" />
                          <Text style={s.approveBtnTxt}>Xử lý</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selected && (() => {
              const meta    = STATUS_META[selected.status];
              const netRef  = Math.round((selected.amount||0) * (Number(selected.refundPercent)||0) / 100);
              const imgUrl  = getTourImg(selected.id, selected.tourName);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Ảnh */}
                  <View style={s.modalImgWrap}>
                    <Image source={{ uri: imgUrl }} style={s.modalImg} resizeMode="cover" />
                    <View style={s.modalImgOverlay} />
                    <View style={[s.statusBadgeFloat, { backgroundColor: meta.bg, top: 14, right: 14 }]}>
                      <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>

                  <View style={{ padding: 18 }}>
                    <Text style={s.modalTitle}>{selected.tourName}</Text>
                    <Text style={s.modalSub}>#{selected.id} · {selected.bookingId}</Text>

                    {/* Guest info */}
                    <View style={s.infoBlock}>
                      <View style={s.infoRow}>
                        <Ionicons name="person-outline" size={14} color="#7a8cc2" />
                        <Text style={s.infoLabel}>Khách hàng</Text>
                        <Text style={s.infoValue}>{selected.guestName}</Text>
                      </View>
                      <View style={s.infoRow}>
                        <Ionicons name="call-outline" size={14} color="#7a8cc2" />
                        <Text style={s.infoLabel}>Điện thoại</Text>
                        <Text style={s.infoValue}>{selected.guestPhone || "—"}</Text>
                      </View>
                      <View style={s.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#7a8cc2" />
                        <Text style={s.infoLabel}>Ngày gửi</Text>
                        <Text style={s.infoValue}>{new Date(selected.createdAt).toLocaleDateString("vi-VN")}</Text>
                      </View>
                    </View>

                    {/* Tài chính */}
                    <View style={s.financeBlock}>
                      <View style={s.financeRow}>
                        <Text style={s.financeLabel}>Giá trị booking</Text>
                        <Text style={s.financeValue}>{fmt(selected.amount)}</Text>
                      </View>
                      <View style={s.financeRow}>
                        <Text style={s.financeLabel}>Tỉ lệ hoàn</Text>
                        <Text style={[s.financeValue, { color: "#f59e0b" }]}>{selected.refundPercent}%</Text>
                      </View>
                      <View style={s.financeRow}>
                        <Text style={s.financeLabel}>Phí xử lý</Text>
                        <Text style={[s.financeValue, { color: "#dc2626" }]}>-{fmt(selected.feeAmount)}</Text>
                      </View>
                      <View style={[s.financeRow, s.financeTotal]}>
                        <Text style={s.financeTotalLabel}>Thực hoàn khách</Text>
                        <Text style={s.financeTotalValue}>{fmt(netRef)}</Text>
                      </View>
                    </View>

                    {/* Lý do */}
                    <Text style={s.sectionLabel}>Lý do yêu cầu</Text>
                    <View style={s.reasonBlock}>
                      <Text style={s.reasonBlockTxt}>{selected.reason}</Text>
                    </View>

                    {/* Bằng chứng */}
                    {selected.evidence && (
                      <>
                        <Text style={s.sectionLabel}>Bằng chứng đính kèm</Text>
                        <View style={s.evidenceBlock}>
                          <Ionicons name="attach-outline" size={16} color="#8b5cf6" />
                          <Text style={s.evidenceBlockTxt}>{selected.evidence}</Text>
                        </View>
                      </>
                    )}

                    {/* Ghi chú cũ */}
                    {selected.note && (
                      <>
                        <Text style={s.sectionLabel}>Ghi chú xử lý</Text>
                        <View style={s.noteBlockFull}>
                          <Text style={s.noteBlockTxt}>{selected.note}</Text>
                        </View>
                      </>
                    )}

                    {/* Nhập lý do từ chối (nếu đang nhập) */}
                    {showConfirm && confirmAction === "rejected" && (
                      <>
                        <Text style={s.sectionLabel}>Lý do từ chối *</Text>
                        <TextInput
                          style={s.rejectInput}
                          value={rejectReason}
                          onChangeText={setRejectReason}
                          placeholder="Nhập lý do từ chối để thông báo cho khách..."
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          placeholderTextColor="#b0bdd8"
                        />
                      </>
                    )}

                    {/* Action buttons (chỉ hiện nếu pending) */}
                    {selected.status === "pending" && !showConfirm && (
                      <View style={s.modalActions}>
                        <TouchableOpacity style={s.rejectBtn} onPress={() => openConfirm("rejected")}>
                          <Ionicons name="close-outline" size={18} color="#dc2626" />
                          <Text style={s.rejectBtnTxt}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.processBtn} onPress={() => execAction(selected.id, "processing")}>
                          <Ionicons name="swap-horizontal-outline" size={18} color="#2856d6" />
                          <Text style={s.processBtnTxt}>Chuyển KT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.approveFullBtn} onPress={() => openConfirm("approved")}>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={s.approveFullBtnTxt}>Duyệt hoàn</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Confirm row */}
                    {showConfirm && (
                      <View style={s.confirmRow}>
                        <TouchableOpacity style={s.cancelConfirmBtn} onPress={() => setShowConfirm(false)}>
                          <Text style={s.cancelConfirmTxt}>Huỷ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.doConfirmBtn, confirmAction === "approved" ? s.doApprove : s.doReject]}
                          onPress={() => {
                            if (confirmAction === "rejected" && !rejectReason.trim()) {
                              Alert.alert("Thiếu", "Vui lòng nhập lý do từ chối.");
                              return;
                            }
                            execAction(selected.id, confirmAction!, confirmAction === "rejected" ? rejectReason : undefined);
                          }}
                        >
                          <Ionicons name={confirmAction === "approved" ? "checkmark-circle-outline" : "close-circle-outline"} size={16} color="#fff" />
                          <Text style={s.doConfirmTxt}>{confirmAction === "approved" ? "Xác nhận duyệt" : "Xác nhận từ chối"}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity style={s.closeBtn} onPress={() => { setShowModal(false); setShowConfirm(false); }}>
                      <Text style={s.closeBtnTxt}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  headerSub:      { fontSize: 11, color: "#7a8cc2", marginTop: 1 },
  pendingBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pendingTxt:     { color: "#d97706", fontWeight: "800", fontSize: 11 },
  kpiRow:         { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  kpiCard:        { flex: 1, borderRadius: 10, borderWidth: 1, padding: 8, alignItems: "center" },
  kpiValue:       { fontSize: 18, fontWeight: "900" },
  kpiLabel:       { fontSize: 10, color: "#7a8cc2", fontWeight: "600", marginTop: 2, textAlign: "center" },
  searchWrap:     { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#fff" },
  searchBox:      { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f7ff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput:    { flex: 1, color: "#1f2a58", fontSize: 13 },
  filterScroll:   { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  filterRow:      { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  filterChip:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f3f7ff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },  filterActive:   { backgroundColor: "#4f7cff" },
  filterTxt:      { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  filterTxtActive:{ color: "#fff" },
  filterCount:    { backgroundColor: "#e4ebff", borderRadius: 8, minWidth: 20, alignItems: "center", paddingHorizontal: 4 },
  filterCountActive:{ backgroundColor: "rgba(255,255,255,0.3)" },
  filterCountTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "700" },
  content:        { padding: 12 },
  emptyCard:      { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTxt:       { color: "#7a8cc2" },
  card:           { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden", marginBottom: 12, shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  cardHighPriority:{ borderColor: "#fca5a5", borderWidth: 1.5 },
  cardImgWrap:    { height: 130, position: "relative" },
  cardImg:        { width: "100%", height: "100%" },
  cardImgOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 55, backgroundColor: "rgba(15,25,60,0.38)" },
  cardImgBadgeRow:{ position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between" },
  priBadgeFloat:  { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  priBadgeTxt:    { fontSize: 10, fontWeight: "700" },
  statusBadgeFloat:{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt:      { fontSize: 11, fontWeight: "700" },
  cardImgId:      { position: "absolute", bottom: 8, left: 12, color: "#fff", fontSize: 10, fontWeight: "700", opacity: 0.9 },
  cardBody:       { padding: 12 },
  tourName:       { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 2 },
  guestName:      { color: "#7a8cc2", fontSize: 11, marginBottom: 8 },
  amountRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  amountLabelSm:  { color: "#94a3b8", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  amount:         { color: "#dc2626", fontWeight: "900", fontSize: 15 },
  netRefundBox:   { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: "flex-end" },
  netRefundLabel: { color: "#16a34a", fontSize: 9, fontWeight: "600" },
  netRefund:      { color: "#16a34a", fontWeight: "900", fontSize: 13 },
  reasonTxt:      { color: "#5f73a9", fontSize: 12, marginBottom: 6, lineHeight: 17 },
  evidenceRow:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f5f3ff", borderRadius: 7, padding: 6, marginBottom: 6 },
  evidenceTxt:    { color: "#8b5cf6", fontSize: 11, fontWeight: "600", flex: 1 },
  noteBox:        { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#eaf0ff", borderRadius: 8, padding: 8, marginBottom: 6 },
  noteTxt:        { flex: 1, color: "#2856d6", fontSize: 11, lineHeight: 16 },
  dateRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  dateTxt:        { color: "#94a3b8", fontSize: 11 },
  actionRow:      { flexDirection: "row", gap: 6 },
  approveBtn:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4f7cff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  approveBtnTxt:  { color: "#fff", fontSize: 11, fontWeight: "700" },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", overflow: "hidden" },
  modalHandle:    { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalImgWrap:   { height: 160, position: "relative" },
  modalImg:       { width: "100%", height: "100%" },
  modalImgOverlay:{ position: "absolute", inset: 0, backgroundColor: "rgba(15,25,60,0.25)" },
  modalTitle:     { color: "#1f2a58", fontWeight: "800", fontSize: 17, marginBottom: 4 },
  modalSub:       { color: "#7a8cc2", fontSize: 12, marginBottom: 14 },
  infoBlock:      { backgroundColor: "#f8faff", borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  infoRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel:      { color: "#7a8cc2", fontSize: 12, width: 90 },
  infoValue:      { color: "#1f2a58", fontWeight: "700", fontSize: 12, flex: 1 },
  financeBlock:   { backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, marginBottom: 14 },
  financeRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  financeLabel:   { color: "#5f73a9", fontSize: 12 },
  financeValue:   { color: "#1f2a58", fontWeight: "700", fontSize: 12 },
  financeTotal:   { borderTopWidth: 1, borderTopColor: "#bbf7d0", paddingTop: 8, marginTop: 4 },
  financeTotalLabel:{ color: "#15803d", fontWeight: "700", fontSize: 13 },
  financeTotalValue:{ color: "#15803d", fontWeight: "900", fontSize: 16 },
  sectionLabel:   { color: "#1f2a58", fontWeight: "800", fontSize: 13, marginBottom: 6, marginTop: 4 },
  reasonBlock:    { backgroundColor: "#fff8e1", borderRadius: 10, padding: 10, marginBottom: 12 },
  reasonBlockTxt: { color: "#78350f", fontSize: 13, lineHeight: 19 },
  evidenceBlock:  { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f5f3ff", borderRadius: 10, padding: 10, marginBottom: 12 },
  evidenceBlockTxt:{ color: "#7c3aed", fontSize: 12, flex: 1, lineHeight: 18 },
  noteBlockFull:  { backgroundColor: "#eaf0ff", borderRadius: 10, padding: 10, marginBottom: 12 },
  noteBlockTxt:   { color: "#2856d6", fontSize: 12, lineHeight: 18 },
  rejectInput:    { backgroundColor: "#f8faff", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", padding: 12, color: "#1f2a58", fontSize: 13, minHeight: 80, marginBottom: 12 },
  modalActions:   { flexDirection: "row", gap: 10, marginBottom: 10 },
  rejectBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#fee2e2", borderRadius: 12, paddingVertical: 12 },
  rejectBtnTxt:   { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  processBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#eaf0ff", borderRadius: 12, paddingVertical: 12 },
  processBtnTxt:  { color: "#2856d6", fontWeight: "700", fontSize: 13 },
  approveFullBtn: { flex: 1.2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 12 },
  approveFullBtnTxt:{ color: "#fff", fontWeight: "700", fontSize: 13 },
  confirmRow:     { flexDirection: "row", gap: 10, marginBottom: 10 },
  cancelConfirmBtn:{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelConfirmTxt:{ color: "#64748b", fontWeight: "700" },
  doConfirmBtn:   { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
  doApprove:      { backgroundColor: "#16a34a" },
  doReject:       { backgroundColor: "#dc2626" },
  doConfirmTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  closeBtn:       { backgroundColor: "#f3f7ff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4, marginBottom: 8 },
  closeBtnTxt:    { color: "#7a8cc2", fontWeight: "600", fontSize: 14 },
});