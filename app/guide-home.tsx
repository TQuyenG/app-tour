/**
 * app/guide-home.tsx
 * Trang chủ Dashboard dành cho Hướng dẫn viên
 * Đã nâng cấp UI Xanh Royal, Ẩn Header đen, tích hợp GuideTabBar chuẩn
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_ACTIONS = [
  { icon: "calendar-outline",      label: "Booking",    route: "/guide-booking-management", color: "#4f7cff", bg: "#eaf0ff" },
  { icon: "map-outline",           label: "Tour",       route: "/guide-tour-management",    color: "#10b981", bg: "#dcfce7" },
  { icon: "cash-outline",          label: "Thu nhập",   route: "/guide-earnings",           color: "#f59e0b", bg: "#fef9c3" },
  { icon: "bar-chart-outline",     label: "Analytics",  route: "/guide-analytics",          color: "#4f7cff", bg: "#eaf0ff" },
  { icon: "chatbubbles-outline",   label: "Chat",       route: "/guide-chat",               color: "#06b6d4", bg: "#ecfeff" },
  { icon: "megaphone-outline",     label: "Quảng cáo", route: "/guide-sponsored",          color: "#ec4899", bg: "#fce7f3" },
  { icon: "grid-outline",          label: "Slots",      route: "/guide-schedule-slots",     color: "#8b5cf6", bg: "#ede9fe" },
  { icon: "star-outline",          label: "Đánh giá",  route: "/guide-reviews",            color: "#a855f7", bg: "#f3e8ff" },
];

const RECENT_ACTIVITIES = [
  { icon: "checkmark-circle", color: "#10b981", text: "Tour Núi Bà Đen hoàn thành", time: "2 giờ trước" },
  { icon: "calendar", color: "#4f7cff", text: "Booking mới từ Trần Thị B", time: "5 giờ trước" },
  { icon: "star", color: "#f59e0b", text: "Nhận đánh giá 5⭐ từ khách", time: "Hôm qua" },
  { icon: "cash", color: "#10b981", text: "Thanh toán 3.600.000đ nhận được", time: "2 ngày trước" },
];

export default function GuideHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);

  const stats = {
    rating: 4.8,
    experience: "5 năm",
    name: "Trần Minh Khoa",
    totalTours: 142,
  };

  useEffect(() => {
    AsyncStorage.getItem("@guide_bookings").then((raw) => {
      if (raw) {
        const data = JSON.parse(raw);
        setPendingBookings(data.filter((b: any) => b.status === "pending").length);
      }
    }).catch(() => {});
    
    AsyncStorage.getItem("@guide_notifications").then((raw) => {
      if (raw) {
        const data = JSON.parse(raw);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    }).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="compass" size={24} color="#fff" />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Xin chào, {stats.name} 👋</Text>
            <Text style={styles.headTitle}>Dashboard HDV</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push("/guide-notifications")}>
            <Ionicons name="notifications-outline" size={22} color="#1f2a58" />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroSmall}>Hôm nay là ngày tuyệt vời</Text>
            <Text style={styles.heroTitle}>
              {pendingBookings > 0
                ? `Bạn có ${pendingBookings} booking\nchờ xác nhận!`
                : "Sẵn sàng đón khách\nvà trải nghiệm tour mới."}
            </Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push("/guide-booking-management")}>
              <Text style={styles.heroBtnText}>Quản lý ngay</Text>
              <Ionicons name="arrow-forward" size={14} color="#1f2a58" />
            </TouchableOpacity>
          </View>
          <Ionicons name="map" size={80} color="rgba(255,255,255,0.2)" style={{ position: "absolute", right: -10, bottom: -10 }} />
        </View>

        {/* Tổng quan */}
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: "calendar-outline", label: "Chờ xác nhận", value: pendingBookings, color: "#4f7cff", bg: "#eaf0ff", route: "/guide-booking-management" },
            { icon: "time-outline", label: "Sự kiện hôm nay", value: 2, color: "#10b981", bg: "#dcfce7", route: "/guide-schedule-management" },
            { icon: "cash-outline", label: "Thu nhập (tr)", value: "5.4", color: "#f59e0b", bg: "#fef3c7", route: "/guide-earnings" },
            { icon: "compass-outline", label: "Tours xong", value: stats.totalTours, color: "#a855f7", bg: "#f3e8ff", route: "/guide-reviews" },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.statCard, { borderColor: "#e4ebff", borderWidth: 1 }]} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
              <View style={[styles.statIconCircle, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.statValue, { color: "#1f2a58" }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Thông tin cá nhân */}
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}><Ionicons name="briefcase-outline" size={20} color="#4f7cff" /></View>
            <View>
              <Text style={styles.infoCardLabel}>Kinh nghiệm</Text>
              <Text style={styles.infoCardValue}>{stats.experience}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: "#fef3c7" }]}><Ionicons name="star" size={20} color="#f59e0b" /></View>
            <View>
              <Text style={styles.infoCardLabel}>Đánh giá</Text>
              <Text style={styles.infoCardValue}>{stats.rating} / 5.0</Text>
            </View>
          </View>
        </View>

        {/* Thao tác nhanh */}
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((qa, i) => (
            <TouchableOpacity key={i} style={[styles.quickCard, { backgroundColor: qa.bg }]} onPress={() => router.push(qa.route as any)} activeOpacity={0.7}>
              <Ionicons name={qa.icon as any} size={22} color={qa.color} />
              <Text style={[styles.quickLabel, { color: qa.color }]}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hoạt động gần đây */}
        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
        <View style={styles.activityCard}>
          {RECENT_ACTIVITIES.map((a, i) => (
            <View key={i} style={[styles.activityRow, i < RECENT_ACTIVITIES.length - 1 && styles.activityBorder]}>
              <View style={[styles.activityDot, { backgroundColor: a.color + "15" }]}>
                <Ionicons name={a.icon as any} size={16} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{a.text}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Guide Floating TabBar */}
      <GuideTabBar activeRoute="guide-home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3f7ff" },
  mainContent: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  logoBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerCenter: { flex: 1 },
  greeting: { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },
  headTitle: { color: "#1f2a58", fontSize: 18, fontWeight: "800", marginTop: 2 },
  notifBtn: { width: 44, height: 44, backgroundColor: "#fff", borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  notifDot: { width: 10, height: 10, backgroundColor: "#ef4444", borderRadius: 5, position: "absolute", top: 10, right: 12, borderWidth: 2, borderColor: "#fff" },
  
  heroBanner: { backgroundColor: "#1f2a58", borderRadius: 20, padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, overflow: "hidden", elevation: 6, shadowColor: "#1f2a58", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
  heroTextCol: { flex: 1, zIndex: 2 },
  heroSmall: { color: "#94a8d8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 26, marginBottom: 16 },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" },
  heroBtnText: { color: "#1f2a58", fontWeight: "800", fontSize: 13 },
  
  sectionTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 16, marginBottom: 12, marginLeft: 4 },
  
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: { borderRadius: 16, padding: 14, alignItems: "center", width: "48%", backgroundColor: "#fff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLabel: { color: "#7a8cc2", fontSize: 12, fontWeight: "600", textAlign: "center" },
  
  infoCards: { flexDirection: "row", gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e4ebff" },
  infoIconWrap: { width: 40, height: 40, backgroundColor: "#eaf0ff", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoCardLabel: { color: "#7a8cc2", fontSize: 11, fontWeight: "600", marginBottom: 2 },
  infoCardValue: { color: "#1f2a58", fontSize: 14, fontWeight: "800" },
  
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  quickCard: { borderRadius: 14, padding: 14, alignItems: "center", width: "22%", gap: 8 },
  quickLabel: { fontSize: 11, fontWeight: "700" },
  
  activityCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e4ebff" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  activityDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityText: { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 2 },
  activityTime: { color: "#7a8cc2", fontSize: 11 },
});