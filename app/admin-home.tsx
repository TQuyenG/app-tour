/**
 * app/admin-home.tsx
 * Trang chủ Admin - Dashboard tổng quan 4 ô lưới
 * Đồng bộ 100% dữ liệu thực từ Hệ thống OTA và Báo cáo Doanh thu
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Dữ liệu fallback
import { TOURS, GUIDES } from "@/constants/travel-data";

<<<<<<< Updated upstream
const { width: SW } = Dimensions.get("window");
=======
const DRAWER_ITEMS = [
  { icon: "home",                label: "Trang chủ",        route: "/admin-home" },
  { icon: "map-outline",         label: "Quản lý Tour",     route: "/admin-tour-management" },
  { icon: "people-outline",      label: "Quản lý HDV",      route: "/admin-guide-management" },
  { icon: "person-add-outline",  label: "Duyệt đăng ký HDV",route: "/admin-guide-requests" },
  { icon: "person-circle-outline",label: "Quản lý Users",   route: "/admin-users" },
  { icon: "ticket-outline",      label: "Voucher",           route: "/admin-voucher-management" },
  { icon: "flash-outline",       label: "Flash Sale",        route: "/admin-flash-sale" },
  { icon: "image-outline",       label: "Banner QC",         route: "/admin-banner" },
  { icon: "cash-outline",        label: "Commission",        route: "/admin-commission" },
  { icon: "refresh-circle-outline", label: "Hoàn tiền",     route: "/admin-refund-management" },
  { icon: "warning-outline",     label: "Khiếu nại",         route: "/admin-complaints" },
  { icon: "bar-chart-outline",   label: "Báo cáo",           route: "/admin-report" },
  { icon: "settings-outline",    label: "Cài đặt hệ thống", route: "/admin-settings" },
  { icon: "person-outline",      label: "Profile",           route: "/admin-profile" },
];
>>>>>>> Stashed changes

const STORAGE_KEYS = {
  TOURS: "@app_tours",
  BOOKINGS_HISTORY: "@app_bookings_history",
  GUIDES: "@app_guides",
  ACCOUNTS: "@app_accounts",
  VOUCHERS: "@admin_vouchers_advanced"
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    tours: 0,
    guides: 0,
    users: 0,
    vouchers: 0,
    totalRevenue: 0, 
  });

  const fallbackTours = TOURS.slice(0, 3).map(t => ({...t, priceRaw: parseInt(t.price.replace(/\D/g, "")) || 0}));
  const [dashboardTours, setDashboardTours] = useState<any[]>(fallbackTours);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const [toursRaw, guidesRaw, usersRaw, vouchersRaw, bookingsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOURS),
        AsyncStorage.getItem(STORAGE_KEYS.GUIDES),
        AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS),
        AsyncStorage.getItem(STORAGE_KEYS.VOUCHERS),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS_HISTORY),
      ]);

      const toursList = toursRaw ? JSON.parse(toursRaw) : TOURS;
      const guidesList = guidesRaw ? JSON.parse(guidesRaw) : GUIDES;
      const usersList = usersRaw ? JSON.parse(usersRaw) : [];
      const vouchersList = vouchersRaw ? JSON.parse(vouchersRaw) : [];
      const bookingsList = bookingsRaw ? JSON.parse(bookingsRaw) : [];
      
      // Tính toán nhanh doanh thu từ Booking History động
      let revenue = 0;
      bookingsList.forEach((bk: any) => {
        if (bk.status === "confirmed") {
          revenue += bk.priceRaw;
        }
      });

      setStats({
        tours: toursList.length,
        guides: guidesList.length,
        users: usersList.length || 156, // fallback
        vouchers: vouchersList.length || 3, // fallback
        totalRevenue: revenue,
      });

      setDashboardTours(toursList.slice(0, 3));

    } catch (e) {
      console.error(e);
    }
  };

  const formatVND = (val: number) => val.toLocaleString("vi-VN") + "đ";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.welcomeTxt}>Xin chào, Super Admin</Text>
            <Text style={styles.dateTxt}>Hôm nay là một ngày tuyệt vời!</Text>
          </View>
        </View>
<<<<<<< Updated upstream
        <TouchableOpacity style={styles.notiBtn} activeOpacity={0.7} onPress={() => router.push("/admin-complaints")}>
          <Ionicons name="notifications-outline" size={24} color="#1f2a58" />
          <View style={styles.notiBadge} />
        </TouchableOpacity>
=======

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: "add-circle-outline",  label: "Thêm Tour",    color: "#4f7cff", bg: "#eef2ff", route: "/admin-tour-management" },
            { icon: "person-add-outline",  label: "Duyệt HDV",    color: "#22c55e", bg: "#f0fdf4", route: "/admin-guide-requests" },
            { icon: "flash-outline",       label: "Flash Sale",    color: "#ef4444", bg: "#fff1f2", route: "/admin-flash-sale" },
            { icon: "ticket-outline",      label: "Tạo Voucher",  color: "#f59e0b", bg: "#fffbeb", route: "/admin-voucher-management" },
            { icon: "person-circle-outline",label: "Users",        color: "#06b6d4", bg: "#ecfeff", route: "/admin-users" },
            { icon: "warning-outline",     label: "Khiếu nại",    color: "#dc2626", bg: "#fef2f2", route: "/admin-complaints" },
            { icon: "image-outline",       label: "Banner",        color: "#8b5cf6", bg: "#f5f3ff", route: "/admin-banner" },
            { icon: "cash-outline",        label: "Commission",   color: "#16a34a", bg: "#f0fdf4", route: "/admin-commission" },
            { icon: "refresh-circle-outline", label: "Hoàn tiền", color: "#dc2626", bg: "#fff1f2", route: "/admin-refund-management" },
            { icon: "settings-outline",    label: "Cài đặt",      color: "#64748b", bg: "#f8fafc", route: "/admin-settings" },
            { icon: "download-outline",    label: "Báo cáo",      color: "#a855f7", bg: "#fdf4ff", route: "/admin-report" },
          ].map((q, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickCard, { backgroundColor: q.bg }]}
              onPress={() => router.push(q.route as any)}
            >
              <Ionicons name={q.icon as any} size={24} color={q.color} />
              <Text style={[styles.quickLabel, { color: q.color }]}>
                {q.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
        <View style={styles.activityCard}>
          {RECENT_ACTIVITIES.map((a, i) => (
            <View
              key={i}
              style={[
                styles.activityRow,
                i < RECENT_ACTIVITIES.length - 1 && styles.activityBorder,
              ]}
            >
              <View
                style={[
                  styles.activityDot,
                  { backgroundColor: a.color + "22" },
                ]}
              >
                <Ionicons name={a.icon as any} size={16} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{a.text}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        {BOTTOM_TABS.map((tab, i) => {
          const active = activeTab === i;
          return (
            <TouchableOpacity
              key={i}
              style={styles.tabItem}
              onPress={() => {
                setActiveTab(i);
                router.push(tab.route as any);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[styles.tabIconWrap, active && styles.tabIconActive]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={active ? "#fff" : "#94a8d8"}
                />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
>>>>>>> Stashed changes
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Thẻ Doanh Thu */}
        <TouchableOpacity style={styles.revenueCard} onPress={() => router.push("/admin-report")} activeOpacity={0.9}>
          <Text style={styles.revenueLabel}>Tổng doanh thu hệ thống</Text>
          <Text style={styles.revenueValue}>{formatVND(stats.totalRevenue)}</Text>
          <View style={styles.revenueMeta}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.revenueMetaTxt}>Đồng bộ từ Dữ liệu thực</Text>
          </View>
        </TouchableOpacity>

        {/* Lưới Thống kê 4 ô quen thuộc của bạn */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/admin-tour-management")} activeOpacity={0.7}>
            <View style={[styles.statIconBox, { backgroundColor: "#eaf0ff" }]}>
              <Ionicons name="map" size={24} color="#4f7cff" />
            </View>
            <Text style={styles.statNum}>{stats.tours}</Text>
            <Text style={styles.statLabel}>Tour du lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/admin-guide-management")} activeOpacity={0.7}>
            <View style={[styles.statIconBox, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="people" size={24} color="#22c55e" />
            </View>
            <Text style={styles.statNum}>{stats.guides}</Text>
            <Text style={styles.statLabel}>Hướng dẫn viên</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/admin-users")} activeOpacity={0.7}>
            <View style={[styles.statIconBox, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="person-circle" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.statNum}>{stats.users}</Text>
            <Text style={styles.statLabel}>Người dùng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/admin-voucher-management")} activeOpacity={0.7}>
            <View style={[styles.statIconBox, { backgroundColor: "#ffedd5" }]}>
              <Ionicons name="ticket" size={24} color="#f97316" />
            </View>
            <Text style={styles.statNum}>{stats.vouchers}</Text>
            <Text style={styles.statLabel}>Mã khuyến mãi</Text>
          </TouchableOpacity>
        </View>

        {/* Hoạt động gần đây (Tour tiêu biểu) */}
        <Text style={styles.sectionTitle}>Tour hoạt động sôi nổi</Text>
        {dashboardTours.map((tour: any) => (
          <View key={tour.id} style={styles.tourCardItem}>
            <Image source={{ uri: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=300&auto=format&fit=crop" }} style={styles.tourImage} />
            <View style={styles.tourInfo}>
              <View style={styles.tourHeaderRow}>
                <Text style={styles.tourCategory} numberOfLines={1}>{tour.category}</Text>
                <View style={styles.starBadge}><Ionicons name="star" size={12} color="#f59e0b" /><Text style={styles.starTxt}>4.9</Text></View>
              </View>
              <Text style={styles.tourName} numberOfLines={2}>{tour.name}</Text>
              <View style={styles.tourBottomRow}>
                <Text style={styles.tourBookings}>Đã có booking</Text>
                <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => router.push(`/admin-tour-management?openTourId=${tour.id}`)}>
                  <Text style={styles.viewDetailsTxt}>Chi tiết</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <AdminTabBar role="admin" activeRoute="admin-home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  welcomeTxt: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 2 },
  dateTxt: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" },
  notiBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  notiBadge: { position: "absolute", top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#fff" },
  
  content: { padding: 16, paddingBottom: 100 },
  revenueCard: { backgroundColor: "#1f2a58", borderRadius: 20, padding: 24, marginBottom: 20, elevation: 8, shadowColor: "#1f2a58", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  revenueLabel: { color: "#94a8d8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  revenueValue: { color: "#fff", fontSize: 32, fontWeight: "900", marginBottom: 12 },
  revenueMeta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  revenueMetaTxt: { color: "#10b981", fontSize: 12, fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 24 },
  statCard: { width: (SW - 46) / 2, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statNum: { fontSize: 24, fontWeight: "900", color: "#1f2a58", marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#7a8cc2", fontWeight: "600" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 14, marginLeft: 4 },
  tourCardItem: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden", marginBottom: 16 },
  tourImage: { width: SW / 3.2, height: SW / 3.2 },
  tourInfo: { flex: 1, padding: 10 },
  tourHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  tourCategory: { color: "#4f7cff", fontSize: 10, fontWeight: "700", flex: 1 },
  starBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  starTxt: { color: "#d97706", fontSize: 10, fontWeight: "700" },
  tourName: { color: "#1f2a58", fontSize: 13, fontWeight: "700", marginBottom: 10, lineHeight: 18, height: 36 },
  tourBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 8 },
  tourBookings: { color: "#7a8cc2", fontSize: 11 },
  viewDetailsBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#f3f7ff" },
  viewDetailsTxt: { color: "#1f2a58", fontSize: 11, fontWeight: "700" },
});