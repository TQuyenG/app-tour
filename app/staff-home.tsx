import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

export default function StaffHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profileName, setProfileName] = useState("Nhân viên CSKH");
  const [bookings, setBookings] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      try {
        const [pRaw, bRaw, rRaw, revRaw, cRaw, cpRaw] = await Promise.all([
          AsyncStorage.getItem("@staff_profile"),
          AsyncStorage.getItem("@guest_bookings"),
          AsyncStorage.getItem("@staff_refunds"),
          AsyncStorage.getItem("@guide_reviews"),
          AsyncStorage.getItem("@staff_chats_v3").catch(() => AsyncStorage.getItem("@staff_chats")),
          AsyncStorage.getItem("@complaints"),
        ]);

        if (pRaw) setProfileName(JSON.parse(pRaw).name || "Nhân viên CSKH");
        const bList = bRaw ? JSON.parse(bRaw) : [];
        const rList = rRaw ? JSON.parse(rRaw) : [];
        const revList = revRaw ? JSON.parse(revRaw) : [];
        const cList = cRaw ? JSON.parse(cRaw) : [];
        const cpList = cpRaw ? JSON.parse(cpRaw) : [];

        setBookings(bList); setRefunds(rList); setReviews(revList); setChats(cList); setComplaints(cpList);

        let dynActivities: any[] = [];
        bList.forEach((b: any) => {
          if (b.auditLog && Array.isArray(b.auditLog)) {
            b.auditLog.forEach((log: any) => {
              if (log.actor.includes("Staff") || log.actor.includes("Hệ thống")) {
                dynActivities.push({ icon: "receipt", color: "#7c3aed", bg: "#ede9fe", text: `${log.action} (Booking #${b.id})`, time: log.time });
              }
            });
          }
        });
        rList.filter((r: any) => r.status === "approved" || r.status === "processing").forEach((r: any) => {
           dynActivities.push({ icon: "refresh", color: "#16a34a", bg: "#dcfce7", text: `Đã xử lý hoàn tiền: ${r.tourName} (${r.status})`, time: "Gần đây" });
        });
        cpList.filter((c: any) => c.status === "resolved").forEach((c: any) => {
           dynActivities.push({ icon: "warning", color: "#d97706", bg: "#fef9c3", text: `Đã giải quyết khiếu nại #${c.id}`, time: "Gần đây" });
        });
        setActivities(dynActivities.slice(0, 8));
      } catch (error) { console.log(error); }
    };
    loadData();
  }, []));

  const pendingBookings = bookings.filter(b => b.status === "pending" || b.status === "pending_guide").length;
  const pendingRefunds = refunds.filter(r => r.status === "pending").length;
  const pendingComplaints = complaints.filter(c => c.status === "pending" || c.status === "investigating").length;
  const openChats = chats.filter(c => !c.resolved).length;
  const totalWork = pendingBookings + pendingRefunds + pendingComplaints + openChats;
  const resolvedThisMonth = refunds.filter(r => r.status === "approved").length + complaints.filter(c => c.status === "resolved").length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : "5.0";
  const slaAlerts = bookings.filter(b => (b.slaMinutes || 0) > 60 && (b.status === "pending_guide" || b.status === "pending"));
  const highestSla = slaAlerts.length > 0 ? Math.max(...slaAlerts.map(b => b.slaMinutes || 0)) : 0;
  const recentBookings = bookings.slice(0, 5);

  const STATS = [
    { label: "Booking chờ", value: pendingBookings, icon: "receipt-outline", color: "#2856d6", bg: "#eaf0ff", borderColor: "#bfcfff", route: "/staff-booking-management" },
    { label: "Hoàn tiền chờ", value: pendingRefunds, icon: "refresh-outline", color: "#d97706", bg: "#fef9c3", borderColor: "#fde68a", route: "/staff-refund-management" },
    { label: "Khiếu nại chờ", value: pendingComplaints, icon: "warning-outline", color: "#dc2626", bg: "#fee2e2", borderColor: "#fecaca", route: "/staff-complaints" },
    { label: "Chat đang mở", value: openChats, icon: "chatbubbles-outline", color: "#16a34a", bg: "#dcfce7", borderColor: "#86efac", route: "/staff-livechat" },
  ];

  const QUICK_ACTIONS = [
    { icon: "warning-outline", label: "Khiếu nại", sublabel: "Xử lý tranh chấp", color: "#dc2626", route: "/staff-complaints" },
    { icon: "ticket-outline", label: "Gửi Voucher", sublabel: "Bồi thường khách", color: "#f59e0b", route: "/staff-voucher-send" },
    { icon: "chatbubbles-outline", label: "Live Chat", sublabel: "Hỗ trợ trực tuyến",color: "#16a34a", route: "/staff-livechat" },
    { icon: "refresh-outline", label: "Hoàn tiền", sublabel: "Duyệt yêu cầu", color: "#2856d6", route: "/staff-refund-management" },
  ];

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}><Ionicons name="headset" size={22} color="#fff" /></View>
          <View>
            <Text style={s.welcomeTxt}>Xin chào, {profileName.split(' ').pop()}</Text>
            <Text style={s.dateTxt}>Sẵn sàng hỗ trợ khách hàng!</Text>
          </View>
        </View>
        <TouchableOpacity style={s.notiBtn}>
          <Ionicons name="notifications-outline" size={24} color="#1f2a58" />
          {totalWork > 0 && <View style={s.notiBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <MaterialCommunityIcons name="shield-star" size={32} color="rgba(255,255,255,0.9)" />
            <View style={{ marginTop: 10 }}>
              <Text style={s.bannerTitle}>Mục tiêu hôm nay</Text>
              <Text style={s.bannerSub}>{totalWork} việc đang chờ xử lý</Text>
            </View>
          </View>
          <View style={s.bannerRight}>
            <View style={s.bannerKpi}><Text style={s.bannerKpiValue}>{resolvedThisMonth}</Text><Text style={s.bannerKpiLabel}>Đã xử lý</Text></View>
            <View style={s.bannerDivider} />
            <View style={s.bannerKpi}><Text style={s.bannerKpiValue}>{avgRating}★</Text><Text style={s.bannerKpiLabel}>Đánh giá</Text></View>
          </View>
        </View>

        <View style={s.statsGrid}>
          {STATS.map((item, i) => (
            <TouchableOpacity key={i} style={[s.statCard, { backgroundColor: item.bg, borderColor: item.borderColor }]} onPress={() => router.push(item.route as any)}>
              <View style={[s.statIconWrap, { backgroundColor: item.color + "20" }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {slaAlerts.length > 0 && (
          <View style={s.slaAlert}>
            <View style={s.slaIconWrap}><Ionicons name="time-outline" size={18} color="#dc2626" /></View>
            <View style={{ flex: 1 }}><Text style={s.slaTitle}>⚠️ Cảnh báo SLA</Text><Text style={s.slaSub}>{slaAlerts.length} booking chờ xử lý quá hạn (Cao nhất: {highestSla} phút).</Text></View>
            <TouchableOpacity style={s.slaBtn} onPress={() => router.push("/staff-booking-management" as any)}><Text style={s.slaBtnTxt}>Xử lý</Text></TouchableOpacity>
          </View>
        )}

        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Thao tác nhanh</Text></View>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity key={i} style={s.quickCard} onPress={() => router.push(a.route as any)}>
              <View style={[s.quickIcon, { backgroundColor: a.color + "15" }]}><Ionicons name={a.icon as any} size={24} color={a.color} /></View>
              <Text style={s.quickLabel}>{a.label}</Text>
              <Text style={s.quickSublabel}>{a.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Booking gần đây</Text><TouchableOpacity onPress={() => router.push("/staff-booking-management" as any)}><Text style={s.seeAll}>Xem tất cả</Text></TouchableOpacity></View>
        <View style={s.bookingList}>
          {recentBookings.length === 0 ? <View style={s.emptyBox}><Text style={s.emptyTxt}>Chưa có booking nào.</Text></View> : recentBookings.map((b, i) => (
            <TouchableOpacity key={i} style={s.bookingRow} onPress={() => router.push("/staff-booking-management" as any)}>
              <View style={s.bookingIcon}><Ionicons name="airplane-outline" size={16} color="#2856d6" /></View>
              <View style={{ flex: 1 }}><Text style={s.bookingName} numberOfLines={1}>{b.tourName || "Tour đã đặt"}</Text><Text style={s.bookingMeta}>{b.id} · {b.customerName || "Khách"}</Text></View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Nhật ký hoạt động</Text></View>
        <View style={s.activityList}>
          {activities.length === 0 ? <View style={s.emptyBox}><Text style={s.emptyTxt}>Chưa có hoạt động nào.</Text></View> : activities.map((item, i) => (
            <View key={i} style={s.activityRow}>
              <View style={[s.activityIcon, { backgroundColor: item.bg }]}><Ionicons name={item.icon as any} size={15} color={item.color} /></View>
              <View style={{ flex: 1 }}><Text style={s.activityText}>{item.text}</Text><Text style={s.activityTime}>{item.time}</Text></View>
            </View>
          ))}
        </View>
      </ScrollView>
      <StaffTabBar activeRoute="/staff-home" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center" },
  welcomeTxt: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  dateTxt: { fontSize: 12, color: "#7a8cc2" },
  notiBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  notiBadge: { position: "absolute", top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#fff" },
  content: { paddingHorizontal: 16, paddingTop: 6 },
  banner: { backgroundColor: "#f59e0b", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 20 },
  bannerLeft: { flex: 1 },
  bannerTitle: { color: "#fff", fontWeight: "800", fontSize: 17, marginTop: 8 },
  bannerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
  bannerRight: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 14 },
  bannerKpi: { alignItems: "center" },
  bannerKpiValue: { color: "#fff", fontWeight: "900", fontSize: 20 },
  bannerKpiLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 2 },
  bannerDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.3)" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { borderRadius: 18, padding: 14, width: "48%", borderWidth: 1 },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: "900" },
  statLabel: { color: "#5f73a9", fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 16 },
  seeAll: { color: "#2856d6", fontSize: 12, fontWeight: "700" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  quickCard: { width: "48%", backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#e4ebff", padding: 16, alignItems: "center", gap: 6 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  quickSublabel: { color: "#94a3b8", fontSize: 10 },
  slaAlert: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff5f5", borderRadius: 14, borderWidth: 1, borderColor: "#fecaca", padding: 14, marginBottom: 20 },
  slaIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  slaTitle: { color: "#dc2626", fontWeight: "800", fontSize: 13 },
  slaSub: { color: "#ef4444", fontSize: 11, marginTop: 3 },
  slaBtn: { backgroundColor: "#dc2626", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  slaBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  bookingList: { gap: 8, marginBottom: 20 },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 14 },
  bookingIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  bookingName: { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  bookingMeta: { color: "#7a8cc2", fontSize: 11, marginTop: 3 },
  activityList: { gap: 8, marginBottom: 10 },
  activityRow: { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 14 },
  activityIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityText: { color: "#1f2a58", fontSize: 12, fontWeight: "600" },
  activityTime: { color: "#94a3b8", fontSize: 10, marginTop: 3 },
  emptyBox: { padding: 20, alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff" },
  emptyTxt: { color: "#94a3b8", fontSize: 12 }
});