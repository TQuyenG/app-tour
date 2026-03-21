import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_ITEMS = [
  {
    icon: "map-outline",
    label: "Quản lý Tour",
    route: "/admin-tour-management",
    color: "#4f7cff",
  },
  {
    icon: "people-outline",
    label: "Quản lý HDV",
    route: "/admin-guide-management",
    color: "#22c55e",
  },
  {
    icon: "ticket-outline",
    label: "Quản lý Voucher",
    route: "/admin-voucher-management",
    color: "#f59e0b",
  },
  {
    icon: "bar-chart-outline",
    label: "Báo cáo & Thống kê",
    route: "/admin-report",
    color: "#a855f7",
  },
  {
    icon: "notifications-outline",
    label: "Thông báo hệ thống",
    route: "/notifications",
    color: "#4f7cff",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Bảo mật & Quyền hạn",
    route: "/settings",
    color: "#ef4444",
  },
  {
    icon: "create-outline",
    label: "Cập nhật thông tin",
    route: "/admin-profile-edit",
    color: "#4f7cff",
  },
] as const;

export default function AdminProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = {
    name: "Trần Quang Admin",
    email: "admin@tourapp.vn",
    phone: "0909 123 456",
    role: "Admin",
    joined: "Tham gia từ 01/2023",
    stats: {
      users: 120,
      bookings: 340,
      revenue: "1.45 tỷ",
      satisfaction: "98%",
    },
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: 80 },
        ]}
      >
        <Text style={styles.title}>Tài khoản</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="shield-checkmark" size={28} color="#4f7cff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#4f7cff" />
              <Text style={styles.roleText}>Admin</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/login" as any)}>
            <Ionicons name="log-out-outline" size={22} color="#7a8cc2" />
          </TouchableOpacity>
        </View>

        {/* System Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Thống kê hệ thống</Text>
          <View style={styles.statsGrid}>
            {[
              {
                label: "Người dùng",
                value: profile.stats.users,
                icon: "people-outline",
                color: "#4f7cff",
              },
              {
                label: "Booking",
                value: profile.stats.bookings,
                icon: "receipt-outline",
                color: "#22c55e",
              },
              {
                label: "Doanh thu",
                value: profile.stats.revenue,
                icon: "cash-outline",
                color: "#f59e0b",
              },
              {
                label: "Hài lòng",
                value: profile.stats.satisfaction,
                icon: "happy-outline",
                color: "#a855f7",
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statItem, { backgroundColor: s.color + "15" }]}
              >
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>
                  {s.value}
                </Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={16} color="#4f7cff" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={16} color="#4f7cff" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={16} color="#4f7cff" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ngày tham gia</Text>
              <Text style={styles.infoValue}>{profile.joined}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Chức năng</Text>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <View
              style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}
            >
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => router.push("/login" as any)}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Admin Bottom Tab */}
      <View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        {(
          [
            {
              icon: "home-outline",
              iconA: "home",
              label: "Tổng quan",
              route: "/admin-home",
            },
            {
              icon: "map-outline",
              iconA: "map",
              label: "Tour",
              route: "/admin-tour-management",
            },
            {
              icon: "people-outline",
              iconA: "people",
              label: "HDV",
              route: "/admin-guide-management",
            },
            {
              icon: "bar-chart-outline",
              iconA: "bar-chart",
              label: "Báo cáo",
              route: "/admin-report",
            },
            {
              icon: "person-outline",
              iconA: "person",
              label: "Profile",
              route: "/admin-profile",
            },
          ] as const
        ).map((tab) => {
          const isActive = tab.route === "/admin-profile";
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tabIconWrap,
                  isActive && styles.tabIconWrapActive,
                ]}
              >
                <Ionicons
                  name={isActive ? (tab.iconA as any) : (tab.icon as any)}
                  size={20}
                  color={isActive ? "#fff" : "#94a8d8"}
                />
              </View>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f7ff" },
  scrollView: { flex: 1 },
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
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: { backgroundColor: "#4f7cff" },
  tabLabel: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  tabLabelActive: { color: "#4f7cff" },
  content: { padding: 18, paddingBottom: 26 },
  title: {
    color: "#1f2a58",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 14,
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#edf2ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#dfe7ff",
  },
  profileInfo: { flex: 1 },
  name: { color: "#1f2a58", fontWeight: "700", fontSize: 16 },
  email: { color: "#7a8cc2", marginTop: 3, fontSize: 13 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    backgroundColor: "#edf2ff",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: { color: "#4f7cff", fontSize: 11, fontWeight: "700" },

  // Stats Card
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 16,
    marginBottom: 14,
  },
  statsTitle: {
    color: "#1f2a58",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statItem: {
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    width: "47%",
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ebff",
    marginBottom: 18,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#edf2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  infoValue: {
    color: "#1f2a58",
    fontWeight: "700",
    fontSize: 14,
    marginTop: 2,
  },
  infoDivider: { height: 1, backgroundColor: "#f0f4ff", marginHorizontal: 14 },

  // Section
  sectionTitle: {
    color: "#1f2a58",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 10,
  },

  // Menu Items
  menuItem: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { color: "#1f2a58", fontWeight: "600", flex: 1 },

  // Logout
  logoutBtn: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fee2e2",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});

const tabSt = StyleSheet.create({
  bar: {
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
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#4f7cff" },
  label: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  labelActive: { color: "#4f7cff" },
});
