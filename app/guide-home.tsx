/**
 * app/guide-home.tsx
 * Trang chủ Dashboard dành cho Hướng dẫn viên
 * Đã nâng cấp: Đọc dữ liệu Local Storage 100%, Responsive, Không dùng data tĩnh.
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_ACTIONS = [
  { icon: "calendar-outline",      label: "Booking",    route: "/guide-booking-management", color: "#4f7cff", bg: "#eaf0ff" },
  { icon: "map-outline",           label: "Tour",       route: "/guide-tour-management",    color: "#10b981", bg: "#dcfce7" },
  { icon: "cash-outline",          label: "Thu nhập",   route: "/guide-earnings",           color: "#f59e0b", bg: "#fef9c3" },
  { icon: "bar-chart-outline",     label: "Analytics",  route: "/guide-analytics",          color: "#4f7cff", bg: "#eaf0ff" },
  { icon: "chatbubbles-outline",   label: "Chat",       route: "/guide-chat",               color: "#8b5cf6", bg: "#f3e8ff" },
  { icon: "settings-outline",      label: "Cài đặt",    route: "/guide-profile",            color: "#64748b", bg: "#f1f5f9" },
];

export default function GuideHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile, setProfile] = useState({ name: "Hướng dẫn viên", rating: "5.0", status: "Đang hoạt động" });
  const [stats, setStats] = useState({ balance: 0, toursThisMonth: 0 });
  const [upcoming, setUpcoming] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const loadDashboardData = async () => {
        try {
          // 1. Load Profile
          let guideName = "Hướng dẫn viên";
          let guideRating = "5.0";
          const rawProfile = await AsyncStorage.getItem("@guide_profile");
          if (rawProfile) {
            const p = JSON.parse(rawProfile);
            guideName = p.name || guideName;
            guideRating = p.rating ? Number(p.rating).toFixed(1) : "5.0";
            setProfile({ name: guideName, rating: guideRating, status: "Đang hoạt động" });
          }

          // 2. Load Bookings để tính toán Thu nhập và Lịch trình sắp tới
          const rawBookings = await AsyncStorage.getItem("@guest_bookings");
          let totalBalance = 0;
          let totalTours = 0;
          let nextTour = null;

          if (rawBookings) {
            const bookingsList = JSON.parse(rawBookings);
            
            // Lọc ra các booking có tên HDV này
            const myBookings = bookingsList.filter((b: any) => b.guideName === guideName);
            totalTours = myBookings.length;

            // Tính tổng thu nhập (Giả sử chiết khấu 13% phí nền tảng, HDV nhận 87%)
            myBookings.forEach((b: any) => {
              if (["completed", "done"].includes(b.status)) {
                totalBalance += (b.totalAmount * 0.87);
              }
            });

            // Tìm tour sắp tới gần nhất
            const activeBookings = myBookings.filter((b: any) => 
              ["pending", "paid", "accepted", "checked-in", "on-tour"].includes(b.status)
            );
            if (activeBookings.length > 0) {
              // Lấy tour đầu tiên (hoặc có thể sort theo date)
              nextTour = activeBookings[0];
            }
          }

          setStats({ balance: totalBalance, toursThisMonth: totalTours });
          setUpcoming(nextTour);

        } catch (e) {
          console.log("Error loading guide home data:", e);
        }
      };

      loadDashboardData();
    }, [])
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2a58" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER KHỐI XANH */}
      <View style={[s.header, { paddingTop: insets.top + Math.round(20 * scale) }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Xin chào,</Text>
            <Text style={s.guideName}>{profile.name}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => router.push("/guide-notifications" as any)}>
            <Ionicons name="notifications-outline" size={Math.round(22 * scale)} color="#fff" />
            <View style={s.notifDot} />
          </TouchableOpacity>
        </View>

        {/* THẺ TỔNG QUAN THU NHẬP */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Số dư hiện tại (VNĐ)</Text>
          <View style={s.balanceRow}>
            <Text style={s.balanceValue}>{stats.balance > 0 ? stats.balance.toLocaleString("vi-VN") : "0"}</Text>
            <TouchableOpacity style={s.withdrawBtn}>
              <Text style={s.withdrawTxt}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* STATS TRONG THÁNG */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Ionicons name="map-outline" size={Math.round(24 * scale)} color="#4f7cff" style={{ marginBottom: Math.round(6 * scale) }} />
            <Text style={s.statValue}>{stats.toursThisMonth}</Text>
            <Text style={s.statLabel}>Tour tháng này</Text>
          </View>
          <View style={s.statBox}>
            <Ionicons name="star-outline" size={Math.round(24 * scale)} color="#f59e0b" style={{ marginBottom: Math.round(6 * scale) }} />
            <Text style={s.statValue}>{profile.rating}</Text>
            <Text style={s.statLabel}>Đánh giá TB</Text>
          </View>
        </View>

        {/* THÔNG TIN HOẠT ĐỘNG */}
        <View style={s.infoCards}>
          <View style={s.infoCard}>
            <View style={[s.infoIconWrap, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="checkmark-circle" size={Math.round(20 * scale)} color="#10b981" />
            </View>
            <View>
              <Text style={s.infoCardLabel}>Trạng thái</Text>
              <Text style={[s.infoCardValue, { color: "#10b981" }]}>{profile.status}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Công cụ nhanh</Text>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((act, i) => (
            <TouchableOpacity key={i} style={s.quickCard} onPress={() => router.push(act.route as any)}>
              <View style={[s.quickIconBox, { backgroundColor: act.bg }]}>
                <Ionicons name={act.icon as any} size={Math.round(24 * scale)} color={act.color} />
              </View>
              <Text style={s.quickLabel}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>Lịch trình sắp tới</Text>
        <View style={s.activityCard}>
          {upcoming ? (
            <>
              <View style={s.activityHeader}>
                <View style={s.activityBadge}><Text style={s.activityBadgeTxt}>Sắp diễn ra</Text></View>
                <Text style={s.activityDate}>{upcoming.date || "Sắp tới"}</Text>
              </View>
              <Text style={s.activityTitle}>{upcoming.tourName}</Text>
              <Text style={s.activityMeta}><Ionicons name="people-outline" size={Math.round(12 * scale)} /> {upcoming.guests || 1} khách · Mã: #{upcoming.id}</Text>
              <TouchableOpacity style={s.activityBtn} onPress={() => router.push("/guide-booking-management" as any)}>
                <Text style={s.activityBtnTxt}>Xem chi tiết chuyến đi</Text>
              </TouchableOpacity>
            </>
          ) : (
             <View style={{ alignItems: "center", paddingVertical: Math.round(10 * scale) }}>
               <Ionicons name="calendar-clear-outline" size={Math.round(36 * scale)} color="#cbd5e1" style={{ marginBottom: Math.round(10 * scale) }} />
               <Text style={{ color: "#7a8cc2", fontSize: Math.round(13 * scale) }}>Bạn chưa có lịch trình nào sắp tới.</Text>
             </View>
          )}
        </View>

      </ScrollView>

      {/* TÍCH HỢP THANH ĐIỀU HƯỚNG CHUẨN */}
      <GuideTabBar activeRoute="guide-home" />
    </View>
  );
}

// ─────────────────────────────────────────────────────
// RESPONSIVE STYLES
// ─────────────────────────────────────────────────────
const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    header: { backgroundColor: "#1f2a58", paddingHorizontal: sz(20), paddingBottom: sz(24), borderBottomLeftRadius: sz(24), borderBottomRightRadius: sz(24) },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: sz(20) },
    greeting: { color: "#94a8d8", fontSize: sz(13), marginBottom: sz(4) },
    guideName: { color: "#fff", fontSize: sz(20), fontWeight: "900" },
    notifBtn: { width: sz(44), height: sz(44), borderRadius: sz(12), backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", position: "relative" },
    notifDot: { position: "absolute", top: sz(10), right: sz(12), width: sz(8), height: sz(8), borderRadius: sz(4), backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#1f2a58" },
    
    balanceCard: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: sz(16), padding: sz(18), borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
    balanceLabel: { color: "#e4ebff", fontSize: sz(13), fontWeight: "600", marginBottom: sz(8) },
    balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    balanceValue: { color: "#fff", fontSize: sz(28), fontWeight: "900" },
    withdrawBtn: { backgroundColor: "#fff", paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(10) },
    withdrawTxt: { color: "#1f2a58", fontWeight: "800", fontSize: sz(13) },
    
    content: { padding: sz(16), paddingBottom: sz(100) },
    
    statsRow: { flexDirection: "row", gap: sz(12), marginBottom: sz(16) },
    statBox: { flex: 1, backgroundColor: "#fff", borderRadius: sz(16), paddingVertical: sz(16), alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
    statValue: { fontSize: sz(22), fontWeight: "900", color: "#1f2a58", marginBottom: sz(2) },
    statLabel: { color: "#7a8cc2", fontSize: sz(12), fontWeight: "600", textAlign: "center" },
    
    infoCards: { flexDirection: "row", gap: sz(12), marginBottom: sz(20) },
    infoCard: { flex: 1, backgroundColor: "#fff", borderRadius: sz(16), padding: sz(14), flexDirection: "row", alignItems: "center", gap: sz(12), borderWidth: 1, borderColor: "#e4ebff", elevation: 1 },
    infoIconWrap: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: "center", justifyContent: "center" },
    infoCardLabel: { color: "#7a8cc2", fontSize: sz(11), fontWeight: "600", marginBottom: sz(2) },
    infoCardValue: { fontSize: sz(14), fontWeight: "800" },
    
    sectionTitle: { color: "#1f2a58", fontSize: sz(16), fontWeight: "900", marginBottom: sz(12), marginLeft: sz(4) },
    
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: sz(10), marginBottom: sz(24), justifyContent: "space-between" },
    quickCard: { width: "31%", backgroundColor: "#fff", borderRadius: sz(14), paddingVertical: sz(14), alignItems: "center", borderWidth: 1, borderColor: "#e4ebff", elevation: 1 },
    quickIconBox: { width: sz(46), height: sz(46), borderRadius: sz(14), alignItems: "center", justifyContent: "center", marginBottom: sz(8) },
    quickLabel: { color: "#1f2a58", fontSize: sz(11), fontWeight: "700" },
    
    activityCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(16), borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
    activityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: sz(10) },
    activityBadge: { backgroundColor: "#eef2ff", paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(6) },
    activityBadgeTxt: { color: "#4f7cff", fontSize: sz(10), fontWeight: "800" },
    activityDate: { color: "#7a8cc2", fontSize: sz(12), fontWeight: "700" },
    activityTitle: { color: "#1f2a58", fontSize: sz(16), fontWeight: "900", marginBottom: sz(6) },
    activityMeta: { color: "#64748b", fontSize: sz(13), marginBottom: sz(14) },
    activityBtn: { backgroundColor: "#f8fafc", paddingVertical: sz(12), borderRadius: sz(10), alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
    activityBtnTxt: { color: "#4f7cff", fontWeight: "800", fontSize: sz(13) },
  });
};