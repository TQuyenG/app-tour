/**
 * app/staff-profile.tsx
 * Profile màn hình Staff CSKH
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const MENU_ITEMS = [
  { icon: "receipt-outline",     label: "Quản lý Booking",        route: "/staff-booking-management",  color: "#2856d6" },
  { icon: "refresh-outline",     label: "Xử lý Hoàn tiền",       route: "/staff-refund-management",   color: "#d97706" },
  { icon: "warning-outline",     label: "Khiếu nại & Tranh chấp", route: "/staff-complaints",          color: "#dc2626" },
  { icon: "chatbubbles-outline", label: "Live Chat",               route: "/staff-livechat",            color: "#16a34a" },
  { icon: "ticket-outline",      label: "Gửi Voucher",             route: "/staff-voucher-send",        color: "#f59e0b" },
  { icon: "flag-outline",        label: "Kiểm duyệt Review",      route: "/staff-review-moderation",  color: "#dc2626" },
] as const;

export default function StaffProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = {
    name: "Lê Thị CSKH", email: "staff1@gmail.com",
    phone: "0911 000 111", joined: "Tham gia từ 01/2025",
    stats: { handled: 128, refunds: 34, vouchers: 52, rating: "4.9★" },
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 14, paddingBottom: 80 }]}
      >
        <Text style={s.title}>Hồ sơ</Text>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Ionicons name="headset" size={26} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.email}>{profile.email}</Text>
            <View style={s.roleBadge}>
              <Ionicons name="headset" size={11} color="#f59e0b" />
              <Text style={s.roleText}>CSKH Staff</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.replace("/login" as any)}>
            <Ionicons name="log-out-outline" size={22} color="#7a8cc2" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <Text style={s.statsTitle}>Thống kê cá nhân</Text>
          <View style={s.statsGrid}>
            {[
              { label: "Đã xử lý",  value: profile.stats.handled,  icon: "checkmark-circle-outline", color: "#2856d6" },
              { label: "Hoàn tiền", value: profile.stats.refunds,   icon: "refresh-outline",          color: "#d97706" },
              { label: "Voucher",   value: profile.stats.vouchers,  icon: "ticket-outline",           color: "#f59e0b" },
              { label: "Đánh giá",  value: profile.stats.rating,    icon: "star-outline",             color: "#16a34a" },
            ].map((s2, i) => (
              <View key={i} style={[s.statItem, { backgroundColor: s2.color + "15" }]}>
                <Ionicons name={s2.icon as any} size={18} color={s2.color} />
                <Text style={[s.statValue, { color: s2.color }]}>{s2.value}</Text>
                <Text style={s.statLabel}>{s2.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          {[
            { icon: "call-outline", label: "Điện thoại", value: profile.phone },
            { icon: "mail-outline", label: "Email",       value: profile.email },
            { icon: "calendar-outline", label: "Ngày tham gia", value: profile.joined },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={s.infoRow}>
                <View style={s.infoIcon}>
                  <Ionicons name={item.icon as any} size={15} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{item.label}</Text>
                  <Text style={s.infoValue}>{item.value}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>

        {/* Menu */}
        <Text style={s.sectionTitle}>Chức năng</Text>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={s.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <View style={[s.menuIcon, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={s.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() => router.replace("/login" as any)}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={s.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
      <StaffTabBar activeRoute="/staff-profile" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f7ff" },
  content: { padding: 18 },
  title: { color: "#1f2a58", fontSize: 26, fontWeight: "700", marginBottom: 14 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fde68a" },
  name: { color: "#1f2a58", fontWeight: "700", fontSize: 16 },
  email: { color: "#7a8cc2", marginTop: 3, fontSize: 13 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, backgroundColor: "#fef9c3", alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { color: "#d97706", fontSize: 11, fontWeight: "700" },
  statsCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 14 },
  statsTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statItem: { borderRadius: 14, padding: 12, alignItems: "center", width: "47%", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 18 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fef9c3", alignItems: "center", justifyContent: "center" },
  infoLabel: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  infoValue: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f0f4ff", marginHorizontal: 14 },
  sectionTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  menuItem: { marginBottom: 10, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuText: { color: "#1f2a58", fontWeight: "600", flex: 1 },
  logoutBtn: { marginTop: 6, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#fee2e2", padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});