import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = 260;

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
  { icon: "warning-outline",     label: "Khiếu nại",         route: "/admin-complaints" },
  { icon: "bar-chart-outline",   label: "Báo cáo",           route: "/admin-report" },
  { icon: "settings-outline",    label: "Cài đặt hệ thống", route: "/admin-settings" },
  { icon: "person-outline",      label: "Profile",           route: "/admin-profile" },
];

const BOTTOM_TABS = [
  { icon: "home", label: "Trang chủ", route: "/admin-home" },
  { icon: "map-outline", label: "Tour", route: "/admin-tour-management" },
  { icon: "people-outline", label: "HDV", route: "/admin-guide-management" },
  { icon: "bar-chart-outline", label: "Báo cáo", route: "/admin-report" },
  { icon: "person-outline", label: "Profile", route: "/admin-profile" },
] as const;

const RECENT_ACTIVITIES = [
  {
    icon: "checkmark-circle",
    color: "#22c55e",
    text: "Tour Phú Quốc 4N3Đ đã được duyệt",
    time: "1 giờ trước",
  },
  {
    icon: "person-add",
    color: "#4f7cff",
    text: "HDV mới Lê Minh Tuấn đăng ký",
    time: "3 giờ trước",
  },
  {
    icon: "ticket",
    color: "#f59e0b",
    text: "Voucher SUMMER35 đạt 28 lượt dùng",
    time: "5 giờ trước",
  },
  {
    icon: "star",
    color: "#a855f7",
    text: "Đánh giá 5⭐ mới từ khách hàng",
    time: "Hôm qua",
  },
];

export default function AdminHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const stats = {
    tours: 12,
    guides: 8,
    bookings: 34,
    vouchers: 5,
    revenue: "1.45 tỷ",
    rating: 4.8,
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Main Content ── */}
      <ScrollView
        style={styles.main}
        contentContainerStyle={[
          styles.mainContent,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={24} color="#1f2a58" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Xin chào, Admin 👋</Text>
            <Text style={styles.headTitle}>Hệ thống quản trị</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#4f7cff" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroSmall}>Tháng 3 · 2025</Text>
            <Text style={styles.heroTitle}>
              Doanh thu tháng này{"\n"}đạt 1.45 tỷ đồng!
            </Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push("/admin-report" as any)}
            >
              <Text style={styles.heroBtnText}>Xem báo cáo</Text>
              <Ionicons name="arrow-forward" size={14} color="#4f7cff" />
            </TouchableOpacity>
          </View>
          <MaterialCommunityIcons
            name="chart-line"
            size={80}
            color="rgba(255,255,255,0.18)"
          />
        </View>

        {/* Stat Cards */}
        <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
        <View style={styles.statsGrid}>
          {[
            {
              icon: "map-outline",
              label: "Tour",
              value: stats.tours,
              color: "#4f7cff",
              bg: "#eef2ff",
              route: "/admin-tour-management",
            },
            {
              icon: "people-outline",
              label: "HDV",
              value: stats.guides,
              color: "#22c55e",
              bg: "#f0fdf4",
              route: "/admin-guide-management",
            },
            {
              icon: "receipt-outline",
              label: "Booking",
              value: stats.bookings,
              color: "#f59e0b",
              bg: "#fffbeb",
              route: "/admin-report",
            },
            {
              icon: "ticket-outline",
              label: "Voucher",
              value: stats.vouchers,
              color: "#a855f7",
              bg: "#fdf4ff",
              route: "/admin-voucher-management",
            },
          ].map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.statCard, { backgroundColor: s.bg }]}
              onPress={() => router.push(s.route as any)}
            >
              <View
                style={[styles.statIconCircle, { backgroundColor: s.color }]}
              >
                <Ionicons name={s.icon as any} size={18} color="#fff" />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Row */}
        <Text style={styles.sectionTitle}>Chỉ số nhanh</Text>
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={20}
                color="#4f7cff"
              />
            </View>
            <View>
              <Text style={styles.infoCardLabel}>Doanh thu</Text>
              <Text style={styles.infoCardValue}>{stats.revenue}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: "#fff8e1" }]}>
              <Ionicons name="star" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.infoCardLabel}>Đánh giá TB</Text>
              <Text style={styles.infoCardValue}>{stats.rating} / 5.0</Text>
            </View>
          </View>
        </View>

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
      </View>

      {/* ── Overlay ── */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>
      )}

      {/* ── Drawer ── */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Drawer Header */}
        <View style={[styles.drawerHeader, { paddingTop: insets.top + 24 }]}>
          <View style={styles.drawerAvatar}>
            <Ionicons name="shield-checkmark" size={30} color="#fff" />
          </View>
          <Text style={styles.drawerName}>Trần Quang Admin</Text>
          <View style={styles.drawerBadge}>
            <Text style={styles.drawerBadgeText}>Admin</Text>
          </View>
        </View>

        <ScrollView
          style={styles.drawerNav}
          showsVerticalScrollIndicator={false}
        >
          {DRAWER_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.drawerItem, i === 0 && styles.drawerItemActive]}
              onPress={() => {
                closeDrawer();
                router.push(item.route as any);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.drawerItemIcon,
                  i === 0 && styles.drawerItemIconActive,
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={i === 0 ? "#fff" : "#4f7cff"}
                />
              </View>
              <Text
                style={[
                  styles.drawerItemLabel,
                  i === 0 && styles.drawerItemLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {i === 0 && <View style={styles.drawerActivePill} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.drawerLogout}
          onPress={() => router.push("/login" as any)}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.drawerLogoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3f7ff" },
  main: { flex: 1 },
  mainContent: { padding: 20, paddingTop: 0 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  menuBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerCenter: { flex: 1 },
  greeting: { color: "#7a8cc2", fontSize: 12, fontWeight: "500" },
  headTitle: {
    color: "#1f2a58",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 1,
  },
  notifBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  notifDot: {
    width: 8,
    height: 8,
    backgroundColor: "#ef4444",
    borderRadius: 4,
    position: "absolute",
    top: 9,
    right: 9,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  // Hero
  heroBanner: {
    backgroundColor: "#4f7cff",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  },
  heroTextCol: { flex: 1 },
  heroSmall: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 16,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  heroBtnText: { color: "#4f7cff", fontWeight: "700", fontSize: 13 },

  // Section
  sectionTitle: {
    color: "#1f2a58",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 12,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    width: "47%",
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: "800", marginBottom: 2 },
  statLabel: { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },

  // Info row
  infoCards: { flexDirection: "row", gap: 12, marginBottom: 28 },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    backgroundColor: "#eef2ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardLabel: {
    color: "#7a8cc2",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoCardValue: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },

  // Quick Actions
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "47%",
    gap: 8,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  quickLabel: { fontSize: 13, fontWeight: "700" },

  // Activity
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  activityDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityText: { color: "#1f2a58", fontWeight: "600", fontSize: 13 },
  activityTime: { color: "#7a8cc2", fontSize: 11, marginTop: 2 },

  // Bottom Tab
  tabBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e8eeff",
    shadowColor: "#2a4caf",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: { backgroundColor: "#4f7cff" },
  tabLabel: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  tabLabelActive: { color: "#4f7cff" },

  // Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,18,50,0.45)",
    zIndex: 10,
  },

  // Drawer
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#1f2a58",
    zIndex: 20,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
    paddingBottom: 32,
  },
  drawerHeader: {
    alignItems: "center",
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },
  drawerAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#4f7cff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
  },
  drawerName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },
  drawerBadge: {
    backgroundColor: "#4f7cff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  drawerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  drawerNav: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  drawerItemActive: { backgroundColor: "rgba(79,124,255,0.18)" },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(79,124,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemIconActive: { backgroundColor: "#4f7cff" },
  drawerItemLabel: {
    color: "#94a8d8",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  drawerItemLabelActive: { color: "#fff" },
  drawerActivePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4f7cff",
  },
  drawerLogout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  drawerLogoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
