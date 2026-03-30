/**
 * app/guide-home.tsx
 * Trang chủ Dashboard dành cho Hướng dẫn viên
 * ĐÃ CẬP NHẬT: Tính điểm Đánh giá Trung bình chuẩn xác từ @app_reviews
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
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
  { icon: "chatbubbles-outline",   label: "Chat",       route: "/guide_chat_list",          color: "#8b5cf6", bg: "#f3e8ff" },
  { icon: "settings-outline",      label: "Cài đặt",    route: "/guide-profile",            color: "#64748b", bg: "#f1f5f9" },
];

export default function GuideHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile, setProfile] = useState({ name: "Hướng dẫn viên", rating: "5.0", status: "Đang hoạt động" });
  const [stats, setStats] = useState({ balance: 0, toursThisMonth: 0, unreadNotifs: 0 });
  const [upcoming, setUpcoming] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      const loadDashboardData = async () => {
        try {
          let gId = "";
          let gName = "Hướng dẫn viên";

          const rawProfile = await AsyncStorage.getItem("@guide_profile");
          if (rawProfile) {
            const p = JSON.parse(rawProfile);
            gId = p.guideId || "";
            gName = p.name || gName;
          }

          let totalBalance = 0;
          const wRaw = await AsyncStorage.getItem("@guide_wallet");
          if (wRaw) totalBalance = JSON.parse(wRaw).balance || 0;

          let totalUnread = 0;
          const bRaw = await AsyncStorage.getItem("@guest_bookings");
          const allBookings = bRaw ? JSON.parse(bRaw) : [];
          const myBookings = allBookings.filter((b: any) => b.guideId === gId || b.guideName === gName);
          totalUnread += myBookings.filter((b: any) => ["pending", "paid"].includes(b.status)).length;

          const cRaw = await AsyncStorage.getItem("@chat_sessions");
          if (cRaw) {
            const sessions = JSON.parse(cRaw);
            totalUnread += sessions.filter((s: any) => s.lastSenderRole === 'guest' && (s.unreadCount > 0 || !s.guideRead)).length;
          }

          // --- CẬP NHẬT: TÍNH ĐIỂM TRUNG BÌNH CHUẨN XÁC TỪ @app_reviews ---
          let avgRating = "5.0";
          const rRaw = await AsyncStorage.getItem("@app_reviews");
          if (rRaw) {
            const allReviews = JSON.parse(rRaw);
            // Tìm theo guideId hoặc guideName để không bị sót
            const myReviews = allReviews.filter((r: any) => r.guideId === gId || r.guideName === gName);
            if (myReviews.length > 0) {
              // Ưu tiên lấy điểm HDV (guideRating / overallRating), nếu không có mới lấy rating chung
              const sum = myReviews.reduce((acc: number, curr: any) => acc + Number(curr.guideRating || curr.overallRating || curr.rating || 5), 0);
              avgRating = (sum / myReviews.length).toFixed(1);
            }
          }

          let toursThisMonthCount = 0;
          let nextTour = null;
          let activeStatus = "Đang rảnh";

          if (bRaw) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            toursThisMonthCount = myBookings.filter((b: any) => {
              if (b.status !== "completed" && b.status !== "done" && b.status !== "cancelled") {
                if (!b.startTime) return false;
                const tourDate = new Date(b.startTime);
                return tourDate.getMonth() === currentMonth && tourDate.getFullYear() === currentYear;
              }
              return false;
            }).length;

            const activeBookings = myBookings.filter((b: any) => 
              ["pending", "paid", "accepted", "confirmed", "on-tour"].includes(b.status) &&
              new Date(b.startTime || 0).getTime() > new Date().getTime() - 86400000 // Trong vòng 24h qua và tương lai
            );
            activeBookings.sort((a:any, b:any) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
            
            if (activeBookings.length > 0) {
              nextTour = activeBookings[0];
              activeStatus = nextTour.status === "on-tour" ? "Đang dẫn tour" : "Sắp có tour";
            }
          }

          setProfile({ name: gName, rating: avgRating, status: activeStatus });
          setStats({ balance: totalBalance, toursThisMonth: toursThisMonthCount, unreadNotifs: totalUnread });
          setUpcoming(nextTour);

        } catch (e) { console.log("Error dashboard:", e); }
      };
      loadDashboardData();
    }, [])
  );

  const handleUpcomingAction = () => {
    if (!upcoming) return;
    
    if (upcoming.status === 'on-tour') {
      router.push({ pathname: '/active_tour_tracking', params: { bookingId: upcoming.id } } as any);
      return;
    }

    const timeDiff = new Date(upcoming.startTime).getTime() - new Date().getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff <= 12 && hoursDiff >= -12) {
      router.push({ pathname: '/active_tour_tracking', params: { bookingId: upcoming.id } } as any);
    } else {
      router.push({ pathname: '/shared-booking-detail', params: { bookingId: upcoming.id } } as any);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2a58" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + Math.round(20 * scale) }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Xin chào,</Text>
            <Text style={s.guideName}>{profile.name}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => router.push("/guide-notifications")}>
            <Ionicons name="notifications-outline" size={Math.round(22 * scale)} color="#fff" />
            {stats.unreadNotifs > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeTxt}>{stats.unreadNotifs > 9 ? '9+' : stats.unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Số dư hiện tại (VNĐ)</Text>
          <View style={s.balanceRow}>
            <Text style={s.balanceValue}>{stats.balance.toLocaleString("vi-VN")}</Text>
            <TouchableOpacity style={s.withdrawBtn} onPress={() => router.push("/guide-earnings")}>
              <Text style={s.withdrawTxt}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Ionicons name="map-outline" size={Math.round(24 * scale)} color="#4f7cff" style={{ marginBottom: 6 }} />
            <Text style={s.statValue}>{stats.toursThisMonth}</Text>
            <Text style={s.statLabel}>Tour tháng này</Text>
          </View>
          <View style={s.statBox}>
            <Ionicons name="star-outline" size={Math.round(24 * scale)} color="#f59e0b" style={{ marginBottom: 6 }} />
            <Text style={s.statValue}>{profile.rating}</Text>
            <Text style={s.statLabel}>Đánh giá TB</Text>
          </View>
        </View>

        <View style={s.infoCard}>
          <View style={[s.infoIconWrap, { backgroundColor: profile.status.includes("Đang dẫn") ? "#f3e8ff" : "#dcfce7" }]}>
            <Ionicons name={profile.status.includes("Đang dẫn") ? "play-circle" : "checkmark-circle"} size={20} color={profile.status.includes("Đang dẫn") ? "#a855f7" : "#10b981"} />
          </View>
          <View>
            <Text style={s.infoCardLabel}>Trạng thái hiện tại</Text>
            <Text style={[s.infoCardValue, { color: profile.status.includes("Đang dẫn") ? "#a855f7" : "#10b981" }]}>{profile.status}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Công cụ quản lý</Text>
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

        <Text style={s.sectionTitle}>Lịch trình gần nhất</Text>
        <View style={s.activityCard}>
          {upcoming ? (
            <>
              <View style={s.activityHeader}>
                <View style={[s.activityBadge, upcoming.status === "on-tour" && { backgroundColor: '#f3e8ff' }]}>
                   <Text style={[s.activityBadgeTxt, upcoming.status === "on-tour" && { color: '#a855f7' }]}>
                     {upcoming.status === "on-tour" ? "Đang diễn ra" : "Sắp tới"}
                   </Text>
                </View>
                <Text style={s.activityDate}>
                  {new Date(upcoming.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} · {new Date(upcoming.startTime).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              
              <Text style={s.activityTitle}>{upcoming.tourName}</Text>
              
              <View style={s.guestInfoRow}>
                <Ionicons name="person-circle-outline" size={16} color="#7a8cc2" />
                <Text style={s.guestInfoTxt}>Khách: <Text style={{fontWeight: 'bold', color: '#1f2a58'}}>{upcoming.customerName || upcoming.guestName}</Text> ({upcoming.guests} người)</Text>
              </View>

              <TouchableOpacity 
                 style={[s.activityBtn, 
                   (upcoming.status === 'on-tour' || Math.abs(new Date(upcoming.startTime).getTime() - Date.now()) <= 12*3600000) 
                   ? { backgroundColor: '#4f7cff', borderColor: '#4f7cff' } : {}
                 ]} 
                 onPress={handleUpcomingAction}
              >
                <Text style={[s.activityBtnTxt, 
                   (upcoming.status === 'on-tour' || Math.abs(new Date(upcoming.startTime).getTime() - Date.now()) <= 12*3600000) 
                   ? { color: '#fff' } : {}
                ]}>
                  {upcoming.status === 'on-tour' ? "Tiếp tục Hành trình Live" : 
                  (Math.abs(new Date(upcoming.startTime).getTime() - Date.now()) <= 12*3600000) ? "Điểm danh & Bắt đầu" : 
                  "Xem chi tiết"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
             <View style={{ alignItems: "center", paddingVertical: 20 }}>
               <Ionicons name="calendar-clear-outline" size={40} color="#cbd5e1" />
               <Text style={{ color: "#7a8cc2", fontSize: 13, marginTop: 10 }}>Bạn không có lịch trình nào sắp tới.</Text>
             </View>
          )}
        </View>
      </ScrollView>

      <GuideTabBar activeRoute="guide-home" />
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    header: { backgroundColor: "#1f2a58", paddingHorizontal: sz(20), paddingBottom: sz(24), borderBottomLeftRadius: sz(24), borderBottomRightRadius: sz(24) },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: sz(20) },
    greeting: { color: "#94a8d8", fontSize: sz(13), marginBottom: sz(4) },
    guideName: { color: "#fff", fontSize: sz(20), fontWeight: "900" },
    notifBtn: { width: sz(44), height: sz(44), borderRadius: sz(12), backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", position: "relative" },
    notifBadge: { position: "absolute", top: sz(-4), right: sz(-4), backgroundColor: "#ef4444", minWidth: sz(18), height: sz(18), borderRadius: sz(9), alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1f2a58", paddingHorizontal: 2 },
    notifBadgeTxt: { color: "#fff", fontSize: sz(9), fontWeight: "900" },
    balanceCard: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: sz(16), padding: sz(18), borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
    balanceLabel: { color: "#e4ebff", fontSize: sz(12), fontWeight: "600", marginBottom: sz(8) },
    balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    balanceValue: { color: "#fff", fontSize: sz(26), fontWeight: "900" },
    withdrawBtn: { backgroundColor: "#fff", paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(10) },
    withdrawTxt: { color: "#1f2a58", fontWeight: "800", fontSize: sz(12) },
    content: { padding: sz(16), paddingBottom: sz(100) },
    statsRow: { flexDirection: "row", gap: sz(12), marginBottom: sz(16) },
    statBox: { flex: 1, backgroundColor: "#fff", borderRadius: sz(16), paddingVertical: sz(16), alignItems: "center", justifyContent: "center", elevation: 2 },
    statValue: { fontSize: sz(22), fontWeight: "900", color: "#1f2a58" },
    statLabel: { color: "#7a8cc2", fontSize: sz(11), fontWeight: "600", marginTop: 2 },
    infoCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(14), flexDirection: "row", alignItems: "center", gap: sz(12), marginBottom: sz(20), elevation: 1 },
    infoIconWrap: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: "center", justifyContent: "center" },
    infoCardLabel: { color: "#7a8cc2", fontSize: sz(11), fontWeight: "600" },
    infoCardValue: { fontSize: sz(14), fontWeight: "800" },
    sectionTitle: { color: "#1f2a58", fontSize: sz(16), fontWeight: "900", marginBottom: sz(12), marginLeft: sz(4) },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: sz(10), marginBottom: sz(24), justifyContent: "space-between" },
    quickCard: { width: "31%", backgroundColor: "#fff", borderRadius: sz(14), paddingVertical: sz(14), alignItems: "center", elevation: 1 },
    quickIconBox: { width: sz(44), height: sz(44), borderRadius: sz(14), alignItems: "center", justifyContent: "center", marginBottom: sz(8) },
    quickLabel: { color: "#1f2a58", fontSize: sz(10), fontWeight: "700" },
    
    activityCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(16), elevation: 2 },
    activityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: sz(10) },
    activityBadge: { backgroundColor: "#eef2ff", paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(6) },
    activityBadgeTxt: { color: "#4f7cff", fontSize: sz(10), fontWeight: "800" },
    activityDate: { color: "#4f7cff", fontSize: sz(13), fontWeight: "800" },
    activityTitle: { color: "#1f2a58", fontSize: sz(16), fontWeight: "900", marginBottom: sz(8) },
    guestInfoRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginBottom: sz(16) },
    guestInfoTxt: { color: "#64748b", fontSize: sz(13) },
    activityBtn: { backgroundColor: "#f8fafc", paddingVertical: sz(12), borderRadius: sz(10), alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
    activityBtnTxt: { color: "#4f7cff", fontWeight: "800", fontSize: sz(13) },
  });
};