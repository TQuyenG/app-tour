/**
 * app/staff-home.tsx
 * Dashboard tổng quan cho Staff CSKH — Phiên bản nâng cấp
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

interface StatCard {
  label: string; value: string | number;
  icon: string; color: string; bg: string;
  borderColor: string; route: string; trend?: string;
}

const ACTIVITY_FEED = [
  { icon: "checkmark-circle",  color: "#16a34a", bg: "#dcfce7", text: "Đã duyệt hoàn tiền 2.990.000đ cho Nguyễn An", time: "5 phút trước",   tag: "HOÀN TIỀN" },
  { icon: "chatbubble",        color: "#2856d6", bg: "#eaf0ff", text: "Chat mới từ Trần Văn B — khiếu nại HDV trễ 2 tiếng", time: "12 phút trước",  tag: "CHAT" },
  { icon: "ticket",            color: "#f59e0b", bg: "#fef3c7", text: "Gửi voucher CSKH100000 (100.000đ) cho Lê Thị C", time: "30 phút trước", tag: "VOUCHER" },
  { icon: "flag",              color: "#dc2626", bg: "#fee2e2", text: "Gắn cờ review spam từ tài khoản Fake User 123", time: "1 giờ trước",    tag: "REVIEW" },
  { icon: "close-circle",      color: "#7c3aed", bg: "#ede9fe", text: "Hủy booking BK001005 theo yêu cầu khẩn của khách", time: "2 giờ trước",  tag: "BOOKING" },
  { icon: "shield-checkmark",  color: "#0284c7", bg: "#e0f2fe", text: "Xác minh eKYC thành công cho Phạm Minh Tuấn", time: "3 giờ trước",    tag: "KYC" },
  { icon: "alert-circle",      color: "#d97706", bg: "#fef9c3", text: "SLA cảnh báo: BK001008 chờ HDV xác nhận 90 phút", time: "3 giờ trước",  tag: "SLA" },
];

const TAG_COLOR: Record<string, { bg: string; color: string }> = {
  "HOÀN TIỀN": { bg: "#dcfce7", color: "#16a34a" },
  "CHAT":       { bg: "#eaf0ff", color: "#2856d6" },
  "VOUCHER":    { bg: "#fef3c7", color: "#d97706" },
  "REVIEW":     { bg: "#fee2e2", color: "#dc2626" },
  "BOOKING":    { bg: "#ede9fe", color: "#7c3aed" },
  "KYC":        { bg: "#e0f2fe", color: "#0284c7" },
  "SLA":        { bg: "#fef9c3", color: "#d97706" },
};

export default function StaffHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings,    setBookings]    = useState<any[]>([]);
  const [refunds,     setRefunds]     = useState<any[]>([]);
  const [reviews,     setReviews]     = useState<any[]>([]);
  const [chats,       setChats]       = useState<any[]>([]);
  const [complaints,  setComplaints]  = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    Promise.all([
      AsyncStorage.getItem("@guest_bookings").catch(() => null),
      AsyncStorage.getItem("@staff_refunds").catch(() => null),
      AsyncStorage.getItem("@guide_reviews").catch(() => null),
      AsyncStorage.getItem("@staff_chats").catch(() => null),
      AsyncStorage.getItem("@complaints").catch(() => null),
    ]).then(([bRaw, rRaw, revRaw, cRaw, cpRaw]) => {
      setBookings(bRaw ? JSON.parse(bRaw) : []);
      setRefunds(rRaw ? JSON.parse(rRaw) : []);
      setReviews(revRaw ? JSON.parse(revRaw) : []);
      setChats(cRaw ? JSON.parse(cRaw) : []);
      setComplaints(cpRaw ? JSON.parse(cpRaw) : []);
    });
  }, []));

  const pendingBookings   = bookings.filter(b => b.status === "pending" || b.status === "pending_guide").length;
  const pendingRefunds    = refunds.filter(r => r.status === "pending").length;
  const flaggedReviews    = reviews.filter(r => r.flagged).length;
  const openChats         = chats.filter(c => !c.resolved).length;
  const pendingComplaints = complaints.filter(c => c.status === "pending").length;
  const recentBookings    = bookings.slice(0, 5);

  const STATS: StatCard[] = [
    { label: "Booking chờ xử lý", value: pendingBookings   || 6, icon: "receipt-outline",    color: "#2856d6", bg: "#eaf0ff", borderColor: "#bfcfff", route: "/staff-booking-management", trend: "+2 hôm nay" },
    { label: "Hoàn tiền chờ",     value: pendingRefunds    || 4, icon: "refresh-outline",    color: "#d97706", bg: "#fef9c3", borderColor: "#fde68a", route: "/staff-refund-management",   trend: "3.2M tổng" },
    { label: "Khiếu nại chờ",     value: pendingComplaints || 3, icon: "warning-outline",    color: "#dc2626", bg: "#fee2e2", borderColor: "#fecaca", route: "/staff-complaints",          trend: "Xử lý ngay" },
    { label: "Chat đang mở",      value: openChats         || 3, icon: "chatbubbles-outline", color: "#16a34a", bg: "#dcfce7", borderColor: "#86efac", route: "/staff-livechat",            trend: "2 chưa đọc" },
  ];

  const QUICK_ACTIONS = [
    { icon: "warning-outline",      label: "Khiếu nại",      sublabel: "Xử lý tranh chấp", color: "#dc2626", route: "/staff-complaints" },
    { icon: "ticket-outline",       label: "Gửi Voucher",    sublabel: "Bồi thường khách", color: "#f59e0b", route: "/staff-voucher-send" },
    { icon: "chatbubbles-outline",  label: "Live Chat",      sublabel: "Hỗ trợ trực tuyến",color: "#16a34a", route: "/staff-livechat" },
    { icon: "refresh-outline",      label: "Hoàn tiền",      sublabel: "Duyệt yêu cầu",    color: "#2856d6", route: "/staff-refund-management" },
  ];

  const totalWork = pendingBookings + pendingRefunds;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Xin chào, Lê Thị CSKH 👋</Text>
            <Text style={s.title}>CSKH Dashboard</Text>
          </View>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => router.push("/staff-profile" as any)}
            activeOpacity={0.8}
          >
            <View style={s.avatarCircle}>
              <Ionicons name="headset" size={20} color="#f59e0b" />
            </View>
            <View style={s.onlineDot} />
          </TouchableOpacity>
        </View>

        {/* ── KPI Banner ─────────────────────────────────────── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <MaterialCommunityIcons name="headset" size={32} color="rgba(255,255,255,0.9)" />
            <View style={{ marginTop: 10 }}>
              <Text style={s.bannerTitle}>Hỗ trợ 24/7</Text>
              <Text style={s.bannerSub}>
                {(totalWork || 10)} việc đang chờ xử lý hôm nay
              </Text>
            </View>
          </View>
          <View style={s.bannerRight}>
            <View style={s.bannerKpi}>
              <Text style={s.bannerKpiValue}>128</Text>
              <Text style={s.bannerKpiLabel}>Đã xử lý{"\n"}tháng này</Text>
            </View>
            <View style={s.bannerDivider} />
            <View style={s.bannerKpi}>
              <Text style={s.bannerKpiValue}>4.9★</Text>
              <Text style={s.bannerKpiLabel}>Đánh giá{"\n"}trung bình</Text>
            </View>
          </View>
        </View>

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <View style={s.statsGrid}>
          {STATS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.statCard, { backgroundColor: item.bg, borderColor: item.borderColor }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.statIconWrap, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
              <View style={[s.trendBadge, { backgroundColor: item.color + "15" }]}>
                <Text style={[s.trendTxt, { color: item.color }]}>{item.trend}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick Actions ───────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Thao tác nhanh</Text>
        </View>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={s.quickCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.quickIcon, { backgroundColor: a.color + "15" }]}>
                <Ionicons name={a.icon as any} size={24} color={a.color} />
              </View>
              <Text style={s.quickLabel}>{a.label}</Text>
              <Text style={s.quickSublabel}>{a.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Bookings ─────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Booking gần đây</Text>
          <TouchableOpacity onPress={() => router.push("/staff-booking-management" as any)}>
            <Text style={s.seeAll}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.bookingList}>
          {recentBookings.length === 0
            ? [
                { id: "BK001006", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan",   guests: 6, status: "pending",        customerName: "Nguyễn Minh F" },
                { id: "BK001007", tourName: "Mũi Né 2N1Đ - Đồi cát vàng",    guests: 2, status: "checked_in",    customerName: "Trần Thanh G" },
                { id: "BK001003", tourName: "Nha Trang 3N2Đ - Lặn san hô",   guests: 4, status: "on_tour",       customerName: "Lê Thị C" },
                { id: "BK001004", tourName: "Sapa 3N2Đ - Mùa lúa chín",      guests: 2, status: "completed",     customerName: "Phạm Quốc D" },
                { id: "BK001005", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng", guests: 2, status: "cancelled",    customerName: "Hoàng Thị E" },
              ].map((b, i) => <BookingRow key={i} b={b} router={router} />)
            : recentBookings.map((b, i) => <BookingRow key={i} b={b} router={router} />)
          }
        </View>

        {/* ── SLA Alert ───────────────────────────────────────── */}
        <View style={s.slaAlert}>
          <View style={s.slaIconWrap}>
            <Ionicons name="time-outline" size={18} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.slaTitle}>⚠️ Cảnh báo SLA</Text>
            <Text style={s.slaSub}>BK001008 chờ HDV xác nhận hơn 90 phút. Cần can thiệp ngay!</Text>
          </View>
          <TouchableOpacity
            style={s.slaBtn}
            onPress={() => router.push("/staff-booking-management" as any)}
          >
            <Text style={s.slaBtnTxt}>Xử lý</Text>
          </TouchableOpacity>
        </View>

        {/* ── Activity Feed ───────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Nhật ký hoạt động</Text>
        </View>
        <View style={s.activityList}>
          {ACTIVITY_FEED.map((item, i) => (
            <View key={i} style={s.activityRow}>
              <View style={[s.activityIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={15} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityText}>{item.text}</Text>
                <Text style={s.activityTime}>{item.time}</Text>
              </View>
              <View style={[s.actTag, { backgroundColor: TAG_COLOR[item.tag]?.bg }]}>
                <Text style={[s.actTagTxt, { color: TAG_COLOR[item.tag]?.color }]}>{item.tag}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <StaffTabBar activeRoute="/staff-home" />
    </View>
  );
}

// ── Sub-component ─────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_guide:  { label: "Chờ HDV",   color: "#d97706", bg: "#fef9c3" },
  pending:        { label: "Chờ xử lý", color: "#d97706", bg: "#fef9c3" },
  guide_accepted: { label: "HDV nhận",  color: "#2856d6", bg: "#eaf0ff" },
  checked_in:     { label: "Check-in",  color: "#7c3aed", bg: "#ede9fe" },
  on_tour:        { label: "Đang đi",   color: "#0284c7", bg: "#e0f2fe" },
  completed:      { label: "Hoàn tất",  color: "#16a34a", bg: "#dcfce7" },
  cancelled:      { label: "Đã hủy",    color: "#dc2626", bg: "#fee2e2" },
};

function BookingRow({ b, router }: { b: any; router: any }) {
  const meta = STATUS_META[b.status] || { label: b.status, color: "#7a8cc2", bg: "#f3f7ff" };
  return (
    <TouchableOpacity
      style={s.bookingRow}
      onPress={() => router.push("/staff-booking-management" as any)}
      activeOpacity={0.8}
    >
      <View style={s.bookingIcon}>
        <Ionicons name="airplane-outline" size={16} color="#2856d6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.bookingName} numberOfLines={1}>{b.tourName || "Tour đã đặt"}</Text>
        <Text style={s.bookingMeta}>
          {b.id} · {b.customerName} · {b.guests} khách
        </Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
        <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#f3f7ff" },
  content:        { paddingHorizontal: 18 },

  // Header
  headerRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  greeting:       { color: "#7a8cc2", fontSize: 13, fontWeight: "500" },
  title:          { color: "#1f2a58", fontSize: 26, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
  avatarBtn:      { position: "relative" },
  avatarCircle:   { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fde68a" },
  onlineDot:      { position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#16a34a", borderWidth: 2, borderColor: "#f3f7ff" },

  // Banner
  banner:         { backgroundColor: "#f59e0b", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  bannerLeft:     { flex: 1 },
  bannerTitle:    { color: "#fff", fontWeight: "800", fontSize: 17, marginTop: 8 },
  bannerSub:      { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4, fontWeight: "500" },
  bannerRight:    { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bannerKpi:      { alignItems: "center" },
  bannerKpiValue: { color: "#fff", fontWeight: "900", fontSize: 20, lineHeight: 24 },
  bannerKpiLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600", textAlign: "center", marginTop: 2, lineHeight: 14 },
  bannerDivider:  { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.3)" },

  // Stats
  statsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard:       { borderRadius: 18, padding: 14, width: "47.5%", borderWidth: 1 },
  statIconWrap:   { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue:      { fontSize: 28, fontWeight: "900", lineHeight: 32, letterSpacing: -0.5 },
  statLabel:      { color: "#5f73a9", fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 16 },
  trendBadge:     { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  trendTxt:       { fontSize: 10, fontWeight: "700" },

  // Section
  sectionHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle:   { color: "#1f2a58", fontWeight: "700", fontSize: 15 },
  seeAll:         { color: "#2856d6", fontSize: 12, fontWeight: "700" },

  // Quick actions
  quickGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  quickCard:      { width: "47.5%", backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#e4ebff", padding: 16, alignItems: "center", gap: 6 },
  quickIcon:      { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  quickLabel:     { color: "#1f2a58", fontWeight: "700", fontSize: 13, textAlign: "center" },
  quickSublabel:  { color: "#94a3b8", fontSize: 10, textAlign: "center", fontWeight: "500" },

  // Booking list
  bookingList:    { gap: 8, marginBottom: 20 },
  bookingRow:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 12 },
  bookingIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bookingName:    { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  bookingMeta:    { color: "#7a8cc2", fontSize: 11, marginTop: 3, fontWeight: "500" },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, flexShrink: 0 },
  statusTxt:      { fontSize: 10, fontWeight: "700" },

  // SLA Alert
  slaAlert:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffbeb", borderRadius: 14, borderWidth: 1, borderColor: "#fde68a", padding: 14, marginBottom: 20 },
  slaIconWrap:    { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fef9c3", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  slaTitle:       { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  slaSub:         { color: "#7a8cc2", fontSize: 11, marginTop: 3, lineHeight: 16 },
  slaBtn:         { backgroundColor: "#d97706", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0 },
  slaBtnTxt:      { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Activity
  activityList:   { gap: 8, marginBottom: 10 },
  activityRow:    { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 12 },
  activityIcon:   { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  activityText:   { color: "#1f2a58", fontSize: 12, fontWeight: "600", lineHeight: 18, flex: 1 },
  activityTime:   { color: "#94a3b8", fontSize: 10, marginTop: 3, fontWeight: "500" },
  actTag:         { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, flexShrink: 0, alignSelf: "flex-start" },
  actTagTxt:      { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
});