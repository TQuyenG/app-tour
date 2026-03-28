/**
 * app/admin-commission.tsx
 * Admin cấu hình tỉ lệ hoa hồng hướng dẫn viên theo danh mục tour
 * Phiên bản nâng cấp — đầy đủ logic, UI tối ưu
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

// ─── Types ────────────────────────────────────────────────────
interface CommissionRule {
  id: string;
  category: string;
  icon: string;
  /** Tỉ lệ hiện tại (%) */
  rate: number;
  /** Giới hạn min/max admin cho phép */
  minRate: number;
  maxRate: number;
  color: string;
  /** Tổng hoa hồng đã thu trong tháng này (VNĐ) */
  totalEarned: number;
  /** Tổng booking trong tháng */
  bookingCount: number;
  /** Doanh thu tour gốc (để tính % thực chi) */
  totalRevenue: number;
  /** Số HDV đang hoạt động trong danh mục */
  guideCount: number;
  /** Được kích hoạt hay tắt */
  active: boolean;
}

interface HistoryEntry {
  date: string;
  category: string;
  from: number;
  to: number;
  by: string;
  reason?: string;
}

// ─── Dữ liệu mặc định ─────────────────────────────────────────
const DEFAULT_RULES: CommissionRule[] = [
  {
    id: "c1", category: "Biển đảo",   icon: "water-outline",
    rate: 18, minRate: 10, maxRate: 30, color: "#0284c7",
    totalEarned: 142_000_000, bookingCount: 87, totalRevenue: 789_000_000, guideCount: 24, active: true,
  },
  {
    id: "c2", category: "Núi rừng",   icon: "leaf-outline",
    rate: 15, minRate: 10, maxRate: 25, color: "#16a34a",
    totalEarned: 98_000_000,  bookingCount: 65, totalRevenue: 653_000_000, guideCount: 18, active: true,
  },
  {
    id: "c3", category: "Văn hóa",    icon: "business-outline",
    rate: 20, minRate: 10, maxRate: 30, color: "#d97706",
    totalEarned: 76_000_000,  bookingCount: 48, totalRevenue: 380_000_000, guideCount: 15, active: true,
  },
  {
    id: "c4", category: "Gia đình",   icon: "home-outline",
    rate: 12, minRate: 8,  maxRate: 20, color: "#ec4899",
    totalEarned: 54_000_000,  bookingCount: 39, totalRevenue: 450_000_000, guideCount: 12, active: true,
  },
  {
    id: "c5", category: "Nghỉ dưỡng", icon: "bed-outline",
    rate: 22, minRate: 15, maxRate: 35, color: "#8b5cf6",
    totalEarned: 210_000_000, bookingCount: 112, totalRevenue: 955_000_000, guideCount: 31, active: true,
  },
  {
    id: "c6", category: "Phiêu lưu",  icon: "bicycle-outline",
    rate: 17, minRate: 12, maxRate: 28, color: "#ef4444",
    totalEarned: 67_000_000,  bookingCount: 43, totalRevenue: 394_000_000, guideCount: 14, active: true,
  },
  {
    id: "c7", category: "Ẩm thực",    icon: "restaurant-outline",
    rate: 10, minRate: 8,  maxRate: 18, color: "#f59e0b",
    totalEarned: 32_000_000,  bookingCount: 28, totalRevenue: 320_000_000, guideCount: 9,  active: true,
  },
  {
    id: "c8", category: "Trekking",   icon: "footsteps-outline",
    rate: 16, minRate: 10, maxRate: 25, color: "#14b8a6",
    totalEarned: 45_000_000,  bookingCount: 34, totalRevenue: 281_000_000, guideCount: 11, active: true,
  },
];

const DEFAULT_HISTORY: HistoryEntry[] = [
  { date: "12/03/2026", category: "Nghỉ dưỡng", from: 20, to: 22, by: "Admin Tuấn", reason: "Tăng do mùa cao điểm" },
  { date: "05/03/2026", category: "Biển đảo",   from: 15, to: 18, by: "Admin Tuấn", reason: "Khuyến khích HDV mảng biển" },
  { date: "28/02/2026", category: "Văn hóa",    from: 18, to: 20, by: "Admin Lan",  reason: "Cập nhật theo chính sách Q1" },
  { date: "15/02/2026", category: "Ẩm thực",    from: 12, to: 10, by: "Admin Tuấn", reason: "Điều chỉnh lại mức phù hợp" },
  { date: "01/02/2026", category: "Trekking",   from: 14, to: 16, by: "Admin Lan",  reason: "HDV phản ánh mức cũ thấp" },
  { date: "15/01/2026", category: "Gia đình",   from: 10, to: 12, by: "Admin Tuấn", reason: "Review định kỳ Q4/2025" },
  { date: "10/01/2026", category: "Phiêu lưu",  from: 15, to: 17, by: "Admin Lan",  reason: "Tăng để thu hút HDV mảng này" },
];

// ─── Helpers ──────────────────────────────────────────────────
const fmtM  = (n: number) =>
  n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(1)}tỷ`
    : `${(n / 1_000_000).toFixed(0)}tr`;

const fmtFull = (n: number) =>
  n.toLocaleString("vi-VN") + "đ";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const pct = (val: number, min: number, max: number) =>
  max === min ? 0 : ((val - min) / (max - min)) * 100;

// ─── Component ────────────────────────────────────────────────
export default function AdminCommission() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [rules, setRules]     = useState<CommissionRule[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(DEFAULT_HISTORY);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [editReason, setEditReason] = useState("");
  const [tab, setTab]         = useState<"config" | "history" | "stats">("config");
  const [sortBy, setSortBy]   = useState<"rate" | "earned" | "booking">("rate");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // ── Load / persist ──────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@admin_commission_v2")
      .then(raw => setRules(raw ? JSON.parse(raw) : DEFAULT_RULES))
      .catch(() => setRules(DEFAULT_RULES));
  }, []));

  const persist = async (data: CommissionRule[]) => {
    setRules(data);
    await AsyncStorage.setItem("@admin_commission_v2", JSON.stringify(data)).catch(() => {});
  };

  // ── Edit logic ───────────────────────────────────────────────
  const startEdit = (r: CommissionRule) => {
    setEditing(r.id);
    setEditVal(String(r.rate));
    setEditReason("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditVal("");
    setEditReason("");
  };

  const saveEdit = (r: CommissionRule) => {
    const val = parseFloat(editVal);
    if (isNaN(val)) {
      Alert.alert("Lỗi", "Vui lòng nhập số hợp lệ");
      return;
    }
    const clamped = clamp(parseFloat(val.toFixed(1)), r.minRate, r.maxRate);
    if (clamped === r.rate) {
      cancelEdit();
      return;
    }
    Alert.alert(
      "Xác nhận thay đổi",
      `Cập nhật commission "${r.category}"\n\n` +
      `${r.rate}%  →  ${clamped}%\n` +
      (editReason ? `\nLý do: ${editReason}\n` : "") +
      `\nThay đổi có hiệu lực ngay lập tức và áp dụng cho tất cả ${r.guideCount} HDV đang hoạt động.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            const newRules = rules.map(x =>
              x.id === r.id ? { ...x, rate: clamped } : x
            );
            await persist(newRules);

            // Thêm vào history
            const entry: HistoryEntry = {
              date: new Date().toLocaleDateString("vi-VN"),
              category: r.category,
              from: r.rate,
              to: clamped,
              by: "Admin",
              reason: editReason || "Không có ghi chú",
            };
            setHistory(prev => [entry, ...prev]);

            cancelEdit();
            Alert.alert(
              "✅ Đã cập nhật",
              `Commission "${r.category}" → ${clamped}%\nÁp dụng cho ${r.guideCount} HDV.`
            );
          },
        },
      ]
    );
  };

  // Tăng/giảm nhanh ±1
  const nudgeRate = (r: CommissionRule, delta: number) => {
    const newRate = clamp(
      parseFloat((r.rate + delta).toFixed(1)),
      r.minRate,
      r.maxRate
    );
    if (newRate === r.rate) return;
    const newRules = rules.map(x => x.id === r.id ? { ...x, rate: newRate } : x);
    persist(newRules);
    const entry: HistoryEntry = {
      date: new Date().toLocaleDateString("vi-VN"),
      category: r.category,
      from: r.rate,
      to: newRate,
      by: "Admin",
      reason: `Điều chỉnh nhanh ${delta > 0 ? "+" : ""}${delta}%`,
    };
    setHistory(prev => [entry, ...prev]);
  };

  // Toggle active
  const toggleActive = (r: CommissionRule) => {
    Alert.alert(
      r.active ? "Tắt danh mục" : "Kích hoạt danh mục",
      r.active
        ? `Tắt commission "${r.category}" sẽ không tính hoa hồng cho HDV của danh mục này.`
        : `Kích hoạt lại commission "${r.category}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: r.active ? "destructive" : "default",
          onPress: () => persist(rules.map(x => x.id === r.id ? { ...x, active: !x.active } : x)),
        },
      ]
    );
  };

  // ── Derived stats ────────────────────────────────────────────
  const activeRules = useMemo(() => rules.filter(r => r.active), [rules]);

  const totalEarned  = useMemo(() => rules.reduce((s, r) => s + r.totalEarned, 0), [rules]);
  const totalRevenue = useMemo(() => rules.reduce((s, r) => s + r.totalRevenue, 0), [rules]);
  const totalBooking = useMemo(() => rules.reduce((s, r) => s + r.bookingCount, 0), [rules]);
  const totalGuides  = useMemo(() => rules.reduce((s, r) => s + (r.active ? r.guideCount : 0), 0), [rules]);
  const avgRate      = useMemo(() =>
    activeRules.length > 0
      ? (activeRules.reduce((s, r) => s + r.rate, 0) / activeRules.length).toFixed(1)
      : "0"
  , [activeRules]);

  // Effective rate = totalEarned / totalRevenue * 100
  const effectiveRate = totalRevenue > 0
    ? ((totalEarned / totalRevenue) * 100).toFixed(1)
    : "0";

  // ── Filtered + sorted list ───────────────────────────────────
  const displayRules = useMemo(() => {
    let list = [...rules];
    if (filterActive === "active")   list = list.filter(r => r.active);
    if (filterActive === "inactive") list = list.filter(r => !r.active);
    list.sort((a, b) => {
      if (sortBy === "rate")    return b.rate - a.rate;
      if (sortBy === "earned")  return b.totalEarned - a.totalEarned;
      if (sortBy === "booking") return b.bookingCount - a.bookingCount;
      return 0;
    });
    return list;
  }, [rules, sortBy, filterActive]);

  // ── Top earner ───────────────────────────────────────────────
  const topEarner = useMemo(() =>
    [...rules].sort((a, b) => b.totalEarned - a.totalEarned)[0]
  , [rules]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Commission HDV</Text>
          <Text style={s.headerSub}>Cấu hình tỉ lệ hoa hồng theo danh mục</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>Live</Text>
          </View>
        </View>
      </View>

      {/* ── Hero stats ── */}
      <View style={s.heroWrap}>
        {/* Main stat */}
        <View style={s.heroMain}>
          <Text style={s.heroMainLabel}>Tổng hoa hồng tháng này</Text>
          <Text style={s.heroMainValue}>{fmtFull(totalEarned)}</Text>
          <View style={s.heroMainRow}>
            <View style={[s.heroPill, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="trending-up" size={11} color="#16a34a" />
              <Text style={[s.heroPillTxt, { color: "#16a34a" }]}>+8.2% so với tháng trước</Text>
            </View>
          </View>
        </View>

        {/* Mini stats row */}
        <View style={s.heroMini}>
          <View style={s.heroMiniItem}>
            <Text style={[s.heroMiniVal, { color: "#f59e0b" }]}>{avgRate}%</Text>
            <Text style={s.heroMiniLabel}>TB danh mục</Text>
          </View>
          <View style={s.heroMiniDiv} />
          <View style={s.heroMiniItem}>
            <Text style={[s.heroMiniVal, { color: "#3b82f6" }]}>{effectiveRate}%</Text>
            <Text style={s.heroMiniLabel}>Tỉ lệ thực tế</Text>
          </View>
          <View style={s.heroMiniDiv} />
          <View style={s.heroMiniItem}>
            <Text style={[s.heroMiniVal, { color: "#8b5cf6" }]}>{totalGuides}</Text>
            <Text style={s.heroMiniLabel}>HDV hoạt động</Text>
          </View>
          <View style={s.heroMiniDiv} />
          <View style={s.heroMiniItem}>
            <Text style={[s.heroMiniVal, { color: "#22c55e" }]}>{totalBooking}</Text>
            <Text style={s.heroMiniLabel}>Tổng booking</Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabBar}>
        {([
          { key: "config",  label: "⚙️ Cấu hình" },
          { key: "stats",   label: "📊 Thống kê" },
          { key: "history", label: "📋 Lịch sử" },
        ] as const).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabBtnTxt, tab === key && s.tabBtnTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══════════════ TAB: CẤU HÌNH ══════════════ */}
          {tab === "config" && (
            <>
              {/* Sort + filter row */}
              <View style={s.toolRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, alignItems: "center" }}>
                  {([
                    { key: "rate",    label: "Theo tỉ lệ" },
                    { key: "earned",  label: "Theo thu nhập" },
                    { key: "booking", label: "Theo booking" },
                  ] as const).map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.sortChip, sortBy === key && s.sortChipActive]}
                      onPress={() => setSortBy(key)}
                    >
                      <Text style={[s.sortChipTxt, sortBy === key && s.sortChipTxtActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View style={s.chipDivider} />
                  {([
                    { key: "all",      label: "Tất cả" },
                    { key: "active",   label: "✅ Đang on" },
                    { key: "inactive", label: "⛔ Tắt" },
                  ] as const).map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.sortChip, filterActive === key && s.sortChipActive]}
                      onPress={() => setFilterActive(key)}
                    >
                      <Text style={[s.sortChipTxt, filterActive === key && s.sortChipTxtActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={s.hint}>
                💡 Giữ nút +/– để điều chỉnh nhanh · Nhấn vào % để nhập chính xác
              </Text>

              {displayRules.map(r => {
                const barW = pct(r.rate, r.minRate, r.maxRate);
                const isEditing = editing === r.id;

                return (
                  <View
                    key={r.id}
                    style={[
                      s.card,
                      !r.active && s.cardInactive,
                      isEditing && { borderColor: r.color, borderWidth: 1.5 },
                    ]}
                  >
                    {/* ── Card header row ── */}
                    <View style={s.cardHeader}>
                      {/* Icon */}
                      <View style={[s.catIcon, { backgroundColor: r.color + "18" }]}>
                        <Ionicons name={r.icon as any} size={22} color={r.active ? r.color : "#94a3b8"} />
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={s.catNameRow}>
                          <Text style={[s.catName, !r.active && { color: "#94a3b8" }]}>
                            {r.category}
                          </Text>
                          {!r.active && (
                            <View style={s.inactivePill}>
                              <Text style={s.inactivePillTxt}>Tắt</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.cardMetaRow}>
                          <View style={s.metaChip}>
                            <Ionicons name="people-outline" size={10} color="#64748b" />
                            <Text style={s.cardMeta}>{r.guideCount} HDV</Text>
                          </View>
                          <View style={s.metaChip}>
                            <Ionicons name="bookmark-outline" size={10} color="#64748b" />
                            <Text style={s.cardMeta}>{r.bookingCount} booking</Text>
                          </View>
                          <View style={s.metaChip}>
                            <Ionicons name="cash-outline" size={10} color="#64748b" />
                            <Text style={s.cardMeta}>{fmtM(r.totalEarned)}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Toggle active */}
                      <TouchableOpacity
                        style={[s.toggleBtn, r.active ? s.toggleBtnOn : s.toggleBtnOff]}
                        onPress={() => toggleActive(r)}
                      >
                        <Ionicons
                          name={r.active ? "toggle" : "toggle-outline"}
                          size={22}
                          color={r.active ? "#22c55e" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* ── Rate bar ── */}
                    <View style={s.rateSection}>
                      <View style={s.rateLabelRow}>
                        <Text style={s.rateLimitTxt}>{r.minRate}%</Text>
                        <Text style={s.rateCurrentLabel}>Hiện tại</Text>
                        <Text style={s.rateLimitTxt}>{r.maxRate}%</Text>
                      </View>
                      <View style={s.barTrack}>
                        <View
                          style={[
                            s.barFill,
                            {
                              width: `${barW}%` as any,
                              backgroundColor: r.active ? r.color : "#cbd5e1",
                            },
                          ]}
                        />
                        {/* Current position marker */}
                        <View
                          style={[
                            s.barMarker,
                            {
                              left: `${barW}%` as any,
                              backgroundColor: r.active ? r.color : "#94a3b8",
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* ── Rate controls ── */}
                    {isEditing ? (
                      /* ── Edit mode ── */
                      <View style={s.editBox}>
                        <Text style={s.editLabel}>Nhập tỉ lệ mới ({r.minRate}%–{r.maxRate}%):</Text>
                        <View style={s.editRow}>
                          <TextInput
                            style={[s.editInput, { borderColor: r.color }]}
                            value={editVal}
                            onChangeText={setEditVal}
                            keyboardType="decimal-pad"
                            autoFocus
                            selectTextOnFocus
                            maxLength={4}
                          />
                          <Text style={s.pctSign}>%</Text>
                          <TouchableOpacity
                            style={[s.editActionBtn, { backgroundColor: r.color }]}
                            onPress={() => saveEdit(r)}
                          >
                            <Ionicons name="checkmark" size={17} color="#fff" />
                            <Text style={s.editActionTxt}>Lưu</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.editCancelBtn} onPress={cancelEdit}>
                            <Ionicons name="close" size={17} color="#64748b" />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={s.reasonInput}
                          placeholder="Ghi chú lý do thay đổi (tuỳ chọn)..."
                          placeholderTextColor="#94a3b8"
                          value={editReason}
                          onChangeText={setEditReason}
                          maxLength={100}
                        />
                      </View>
                    ) : (
                      /* ── View mode ── */
                      <View style={s.rateControlRow}>
                        {/* Decrease */}
                        <TouchableOpacity
                          style={[s.nudgeBtn, r.rate <= r.minRate && s.nudgeBtnDisabled]}
                          onPress={() => nudgeRate(r, -1)}
                          disabled={!r.active || r.rate <= r.minRate}
                        >
                          <Ionicons name="remove" size={16} color={r.rate <= r.minRate ? "#cbd5e1" : "#64748b"} />
                        </TouchableOpacity>

                        {/* Rate badge — tap to edit */}
                        <TouchableOpacity
                          style={[s.rateBadge, { backgroundColor: r.active ? r.color : "#94a3b8" }]}
                          onPress={() => r.active && startEdit(r)}
                          activeOpacity={r.active ? 0.75 : 1}
                        >
                          <Text style={s.rateValue}>{r.rate}%</Text>
                          {r.active && (
                            <Ionicons name="pencil" size={10} color="rgba(255,255,255,0.75)" />
                          )}
                        </TouchableOpacity>

                        {/* Increase */}
                        <TouchableOpacity
                          style={[s.nudgeBtn, r.rate >= r.maxRate && s.nudgeBtnDisabled]}
                          onPress={() => nudgeRate(r, +1)}
                          disabled={!r.active || r.rate >= r.maxRate}
                        >
                          <Ionicons name="add" size={16} color={r.rate >= r.maxRate ? "#cbd5e1" : "#64748b"} />
                        </TouchableOpacity>

                        {/* Per booking estimate */}
                        <View style={s.earningEstimate}>
                          <Text style={s.earningEstimateLabel}>TB/booking</Text>
                          <Text style={[s.earningEstimateVal, { color: r.color }]}>
                            {r.bookingCount > 0
                              ? fmtM(Math.round(r.totalEarned / r.bookingCount))
                              : "—"}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ══════════════ TAB: THỐNG KÊ ══════════════ */}
          {tab === "stats" && (
            <>
              {/* Top earner highlight */}
              {topEarner && (
                <View style={[s.topEarnerCard, { borderColor: topEarner.color + "60" }]}>
                  <View style={[s.topEarnerIcon, { backgroundColor: topEarner.color + "18" }]}>
                    <Ionicons name={topEarner.icon as any} size={26} color={topEarner.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.topEarnerLabel}>🏆 Danh mục doanh thu cao nhất</Text>
                    <Text style={[s.topEarnerName, { color: topEarner.color }]}>{topEarner.category}</Text>
                    <Text style={s.topEarnerVal}>{fmtFull(topEarner.totalEarned)}</Text>
                  </View>
                  <View style={[s.bigRateBadge, { backgroundColor: topEarner.color }]}>
                    <Text style={s.bigRateVal}>{topEarner.rate}%</Text>
                  </View>
                </View>
              )}

              {/* Revenue breakdown per category */}
              <Text style={s.sectionTitle}>Phân bổ hoa hồng theo danh mục</Text>
              {[...rules]
                .sort((a, b) => b.totalEarned - a.totalEarned)
                .map((r, i) => {
                  const shareOfTotal = totalEarned > 0
                    ? ((r.totalEarned / totalEarned) * 100).toFixed(1)
                    : "0";
                  const realRate = r.totalRevenue > 0
                    ? ((r.totalEarned / r.totalRevenue) * 100).toFixed(1)
                    : r.rate.toFixed(1);

                  return (
                    <View key={r.id} style={s.statCard}>
                      <View style={s.statRank}>
                        <Text style={[s.statRankTxt, i < 3 && { color: ["#f59e0b","#64748b","#d97706"][i] }]}>
                          #{i + 1}
                        </Text>
                      </View>
                      <View style={[s.statIcon, { backgroundColor: r.color + "15" }]}>
                        <Ionicons name={r.icon as any} size={18} color={r.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.statRow}>
                          <Text style={s.statCatName}>{r.category}</Text>
                          <Text style={[s.statEarned, { color: r.color }]}>
                            {fmtM(r.totalEarned)}
                          </Text>
                        </View>
                        {/* Share bar */}
                        <View style={s.statBarBg}>
                          <View style={[s.statBarFill, {
                            width: `${shareOfTotal}%` as any,
                            backgroundColor: r.color,
                          }]} />
                        </View>
                        <View style={s.statMetaRow}>
                          <Text style={s.statMeta}>{shareOfTotal}% tổng HH</Text>
                          <Text style={s.statMeta}>·</Text>
                          <Text style={s.statMeta}>{r.guideCount} HDV</Text>
                          <Text style={s.statMeta}>·</Text>
                          <Text style={[s.statMeta, { color: r.color, fontWeight: "700" }]}>
                            Thực tế {realRate}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

              {/* Summary table */}
              <Text style={s.sectionTitle}>Tổng hợp</Text>
              <View style={s.summaryTable}>
                {[
                  { label: "Tổng hoa hồng chi trả",     val: fmtFull(totalEarned),  icon: "cash-outline",     color: "#22c55e" },
                  { label: "Tổng doanh thu tour",        val: fmtFull(totalRevenue), icon: "trending-up",      color: "#3b82f6" },
                  { label: "Tỉ lệ commission thực tế",   val: `${effectiveRate}%`,   icon: "analytics-outline",color: "#f59e0b" },
                  { label: "Số danh mục đang hoạt động", val: `${activeRules.length}/${rules.length}`, icon: "layers-outline", color: "#8b5cf6" },
                  { label: "Tổng HDV đang nhận HH",      val: `${totalGuides} người`,icon: "people-outline",   color: "#ec4899" },
                  { label: "Tổng booking trong tháng",   val: `${totalBooking}`,     icon: "bookmark-outline", color: "#14b8a6" },
                ].map((item, i) => (
                  <View key={i} style={s.summaryRow}>
                    <View style={[s.summaryIcon, { backgroundColor: item.color + "15" }]}>
                      <Ionicons name={item.icon as any} size={15} color={item.color} />
                    </View>
                    <Text style={s.summaryLabel}>{item.label}</Text>
                    <Text style={[s.summaryVal, { color: item.color }]}>{item.val}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ══════════════ TAB: LỊCH SỬ ══════════════ */}
          {tab === "history" && (
            <>
              <Text style={s.hint}>
                📋 {history.length} lần thay đổi · Mới nhất hiển thị trước
              </Text>

              {history.map((h, i) => {
                const up = h.to > h.from;
                const diff = Math.abs(h.to - h.from);
                const catRule = rules.find(r => r.category === h.category);
                const color = catRule?.color ?? "#64748b";

                return (
                  <View key={i} style={s.histCard}>
                    {/* Left color strip */}
                    <View style={[s.histStrip, { backgroundColor: color }]} />

                    <View style={{ flex: 1, gap: 6, padding: 12 }}>
                      {/* Header row */}
                      <View style={s.histHeaderRow}>
                        <View style={[s.histCatDot, { backgroundColor: color + "22" }]}>
                          {catRule && (
                            <Ionicons name={catRule.icon as any} size={13} color={color} />
                          )}
                        </View>
                        <Text style={s.histCatName}>{h.category}</Text>
                        <View style={[
                          s.histChangeBadge,
                          { backgroundColor: up ? "#dcfce7" : "#fee2e2" },
                        ]}>
                          <Ionicons
                            name={up ? "trending-up" : "trending-down"}
                            size={11}
                            color={up ? "#16a34a" : "#dc2626"}
                          />
                          <Text style={[
                            s.histChangeTxt,
                            { color: up ? "#16a34a" : "#dc2626" },
                          ]}>
                            {up ? "+" : "-"}{diff}%
                          </Text>
                        </View>
                      </View>

                      {/* Rate arrow */}
                      <View style={s.histRateRow}>
                        <Text style={s.histFrom}>{h.from}%</Text>
                        <View style={s.histArrow}>
                          <View style={s.histArrowLine} />
                          <Ionicons name="arrow-forward" size={12} color="#94a3b8" />
                        </View>
                        <Text style={[s.histTo, { color }]}>{h.to}%</Text>
                      </View>

                      {/* Meta */}
                      <View style={s.histMetaRow}>
                        <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                        <Text style={s.histMeta}>{h.date}</Text>
                        <Text style={s.histMetaDot}>·</Text>
                        <Ionicons name="person-outline" size={11} color="#94a3b8" />
                        <Text style={s.histMeta}>{h.by}</Text>
                        {h.reason && (
                          <>
                            <Text style={s.histMetaDot}>·</Text>
                            <Text style={s.histReason} numberOfLines={1}>{h.reason}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AdminTabBar role="admin" activeRoute="/admin-commission" />
    </View>
  );
}

// ─── Design tokens ────────────────────────────────────────────
const BG     = "#f1f5f9";
const WHITE  = "#ffffff";
const BORDER = "#e2e8f0";
const TXT    = "#0f172a";
const TXT2   = "#475569";
const TXT3   = "#94a3b8";
const ACCENT = "#4f7cff";

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // ── Top bar ──
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: TXT, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: TXT3, marginTop: 1 },
  topBarRight: { flexDirection: "row", gap: 6, alignItems: "center" },
  liveBadge:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#bbf7d0" },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  liveTxt:     { fontSize: 11, fontWeight: "700", color: "#16a34a" },

  // ── Hero ──
  heroWrap:        { backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  heroMain:        { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  heroMainLabel:   { fontSize: 11, color: TXT3, fontWeight: "600", marginBottom: 4 },
  heroMainValue:   { fontSize: 26, fontWeight: "900", color: TXT, letterSpacing: -0.5 },
  heroMainRow:     { flexDirection: "row", marginTop: 6 },
  heroPill:        { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  heroPillTxt:     { fontSize: 11, fontWeight: "700" },
  heroMini:        { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  heroMiniItem:    { flex: 1, alignItems: "center", paddingVertical: 10 },
  heroMiniVal:     { fontSize: 17, fontWeight: "900" },
  heroMiniLabel:   { fontSize: 10, color: TXT3, marginTop: 2, fontWeight: "600" },
  heroMiniDiv:     { width: 1, backgroundColor: BORDER, marginVertical: 8 },

  // ── Tabs ──
  tabBar:         { flexDirection: "row", backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabBtn:         { flex: 1, paddingVertical: 11, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive:   { borderBottomColor: ACCENT },
  tabBtnTxt:      { fontSize: 12, fontWeight: "600", color: TXT3 },
  tabBtnTxtActive:{ color: ACCENT, fontWeight: "700" },

  // ── Content ──
  content: { padding: 14, paddingTop: 10 },
  hint:    { fontSize: 12, color: TXT3, marginBottom: 10, lineHeight: 18 },

  // ── Tool row ──
  toolRow: { marginBottom: 10 },
  sortChip:        { borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE, paddingHorizontal: 11, paddingVertical: 5 },
  sortChipActive:  { backgroundColor: ACCENT, borderColor: ACCENT },
  sortChipTxt:     { fontSize: 12, fontWeight: "600", color: TXT3 },
  sortChipTxtActive: { color: WHITE },
  chipDivider:     { width: 1, height: 20, backgroundColor: BORDER, marginHorizontal: 4 },

  // ── Config card ──
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  cardInactive: { opacity: 0.55 },

  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon:     { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catNameRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  catName:     { fontSize: 14, fontWeight: "800", color: TXT },
  inactivePill:    { backgroundColor: "#fee2e2", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  inactivePillTxt: { fontSize: 10, fontWeight: "700", color: "#ef4444" },

  cardMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" as const },
  metaChip:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f8fafc", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  cardMeta:    { fontSize: 11, color: TXT2 },

  toggleBtn:   { padding: 4 },
  toggleBtnOn: {},
  toggleBtnOff:{},

  // Rate bar
  rateSection:     { gap: 5 },
  rateLabelRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rateLimitTxt:    { fontSize: 10, color: TXT3, fontWeight: "600" },
  rateCurrentLabel:{ fontSize: 10, color: TXT3, fontWeight: "600" },
  barTrack:        { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "visible" as const, position: "relative" },
  barFill:         { height: "100%", borderRadius: 4, position: "absolute", top: 0, left: 0 },
  barMarker:       { position: "absolute", top: -3, width: 14, height: 14, borderRadius: 7, marginLeft: -7, borderWidth: 2, borderColor: WHITE, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  // Rate controls
  rateControlRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nudgeBtn:        { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  nudgeBtnDisabled:{ opacity: 0.4 },
  rateBadge:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8, minWidth: 66, justifyContent: "center" },
  rateValue:       { color: WHITE, fontWeight: "900", fontSize: 16 },
  earningEstimate: { flex: 1, alignItems: "flex-end" },
  earningEstimateLabel: { fontSize: 10, color: TXT3, fontWeight: "600" },
  earningEstimateVal:   { fontSize: 13, fontWeight: "800", marginTop: 1 },

  // Edit box
  editBox:       { gap: 8 },
  editLabel:     { fontSize: 12, color: TXT2, fontWeight: "600" },
  editRow:       { flexDirection: "row", alignItems: "center", gap: 7 },
  editInput:     { width: 56, height: 40, borderWidth: 2, borderRadius: 10, textAlign: "center", fontSize: 16, fontWeight: "700", color: TXT, backgroundColor: "#f8fafc" },
  pctSign:       { fontSize: 16, fontWeight: "700", color: TXT2 },
  editActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  editActionTxt: { color: WHITE, fontWeight: "700", fontSize: 13 },
  editCancelBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  reasonInput:   { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: TXT },

  // ── Stats tab ──
  sectionTitle: { fontSize: 13, fontWeight: "800", color: TXT, marginTop: 4, marginBottom: 8, letterSpacing: -0.2 },

  topEarnerCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 14 },
  topEarnerIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topEarnerLabel:{ fontSize: 11, color: TXT3, fontWeight: "600", marginBottom: 2 },
  topEarnerName: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  topEarnerVal:  { fontSize: 13, fontWeight: "700", color: TXT2 },
  bigRateBadge:  { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  bigRateVal:    { fontSize: 20, fontWeight: "900", color: WHITE },

  statCard:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: WHITE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  statRank:    { width: 24, alignItems: "center" },
  statRankTxt: { fontSize: 12, fontWeight: "700", color: TXT3 },
  statIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  statCatName: { fontSize: 13, fontWeight: "700", color: TXT },
  statEarned:  { fontSize: 13, fontWeight: "800" },
  statBarBg:   { height: 5, backgroundColor: "#f1f5f9", borderRadius: 3, marginBottom: 5, overflow: "hidden" },
  statBarFill: { height: "100%", borderRadius: 3 },
  statMetaRow: { flexDirection: "row", gap: 4, alignItems: "center", flexWrap: "wrap" as const },
  statMeta:    { fontSize: 10, color: TXT3 },

  summaryTable: { backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden", marginBottom: 14 },
  summaryRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  summaryIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  summaryLabel: { flex: 1, fontSize: 12, color: TXT2, fontWeight: "600" },
  summaryVal:   { fontSize: 13, fontWeight: "800" },

  // ── History tab ──
  histCard:       { flexDirection: "row", alignItems: "stretch", backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 8, overflow: "hidden" },
  histStrip:      { width: 4, flexShrink: 0 },
  histHeaderRow:  { flexDirection: "row", alignItems: "center", gap: 7 },
  histCatDot:     { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  histCatName:    { fontSize: 13, fontWeight: "700", color: TXT, flex: 1 },
  histChangeBadge:{ flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  histChangeTxt:  { fontSize: 11, fontWeight: "800" },
  histRateRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  histFrom:       { fontSize: 16, fontWeight: "700", color: TXT3 },
  histArrow:      { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  histArrowLine:  { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  histTo:         { fontSize: 19, fontWeight: "900" },
  histMetaRow:    { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" as const },
  histMeta:       { fontSize: 11, color: TXT3 },
  histMetaDot:    { fontSize: 11, color: TXT3 },
  histReason:     { fontSize: 11, color: TXT2, fontStyle: "italic", flex: 1 },

  // Outer padding for history cards
  // (histCard content is padded via inner view)
});

// Thêm padding cho nội dung trong histCard
// React Native không hỗ trợ padding + overflow:hidden + border cùng lúc,
// nên dùng style inline trên inner View của histCard:
//   <View style={{ flex:1, padding: 12, gap: 5 }}>
// → đã được gộp vào render JSX ở trên