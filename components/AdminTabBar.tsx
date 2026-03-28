/**
 * components/AdminTabBar.tsx
 * Bottom tab bar cho Guide VÀ Floating Menu Sidebar dọc cho Admin
 * Đã rà soát kỹ 100% đường dẫn Routing
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── ADMIN MENU GROUPS ─────────────
const ADMIN_MENU_GROUPS = [
  {
    title: "Chung",
    items: [
      { icon: "home-outline", iconActive: "home", label: "Tổng quan (Trang chủ)", route: "admin-home", color: "#1f2a58" },
      { icon: "person-outline", iconActive: "person", label: "Hồ sơ của tôi", route: "admin-profile", color: "#64748b" },
    ]
  },
  {
    title: "Vận hành cốt lõi",
    items: [
      { icon: "map-outline", iconActive: "map", label: "Quản lý Tour", route: "admin-tour-management", color: "#4f7cff" },
      { icon: "people-outline", iconActive: "people", label: "Quản lý HDV", route: "admin-guide-management", color: "#22c55e" },
      { icon: "person-add-outline", iconActive: "person-add", label: "Duyệt đăng ký HDV", route: "admin-guide-requests", color: "#d97706" },
      { icon: "person-circle-outline", iconActive: "person-circle", label: "Quản lý Users", route: "admin-users", color: "#8b5cf6" },
    ]
  },
  {
    title: "Tài chính & Hỗ trợ",
    items: [
      { icon: "bar-chart-outline", iconActive: "bar-chart", label: "Báo cáo Doanh thu", route: "admin-report", color: "#06b6d4" },
      { icon: "wallet-outline", iconActive: "wallet", label: "Duyệt lệnh rút tiền", route: "admin-payout", color: "#10b981" },
      { icon: "cash-outline", iconActive: "cash", label: "Cấu hình Hoa hồng", route: "admin-commission", color: "#eab308" },
      { icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Hỗ trợ & Khiếu nại", route: "admin-complaints", color: "#ef4444" },
    ]
  },
  {
    title: "Marketing & Hệ thống",
    items: [
      { icon: "ticket-outline", iconActive: "ticket", label: "Quản lý Voucher", route: "admin-voucher-management", color: "#f97316" }, // ĐƯỜNG DẪN CHUẨN XÁC
      { icon: "flash-outline", iconActive: "flash", label: "Flash Sale / Deal", route: "admin-flash-sale", color: "#e11d48" },
      { icon: "image-outline", iconActive: "image", label: "Quản lý Banner", route: "admin-banner", color: "#6366f1" },
      { icon: "settings-outline", iconActive: "settings", label: "Cài đặt Hệ thống", route: "admin-settings", color: "#64748b" },
    ]
  }
];

const GUIDE_TABS = [
  { icon: "home-outline",          iconActive: "home",          label: "Tổng quan", route: "guide-home" },
  { icon: "calendar-outline",      iconActive: "calendar",      label: "Lịch trình",route: "guide-schedule-slots" },
  { icon: "chatbubbles-outline",   iconActive: "chatbubbles",   label: "Tin nhắn",  route: "guide-chat" },
  { icon: "notifications-outline", iconActive: "notifications", label: "Thông báo", route: "guide-notifications" },
  { icon: "person-outline",        iconActive: "person",        label: "Cá nhân",   route: "guide-profile" },
];

export function AdminTabBar({ role = "admin", activeRoute = "" }: { role?: "admin" | "guide" | string, activeRoute?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const isRouteActive = (targetRoute: string) => {
    const cleanActive = activeRoute.replace('/', '');
    const cleanTarget = targetRoute.replace('/', '');
    return cleanActive === cleanTarget;
  };

  const handleNavigate = (route: string) => {
    setMenuVisible(false);
    setTimeout(() => {
      // Đảm bảo router push đến đúng địa chỉ
      router.replace(`/${route.replace('/', '')}` as any);
    }, 150);
  };

  if (role === "guide") {
    return (
      <View style={[st.guideTabBar, { paddingBottom: insets.bottom || 12 }]}>
        {GUIDE_TABS.map((tab) => {
          const isActive = isRouteActive(tab.route);
          return (
            <TouchableOpacity key={tab.route} style={st.guideTabItem} onPress={() => handleNavigate(tab.route)} activeOpacity={0.75}>
              <View style={[st.guideTabIconWrap, isActive && st.guideTabIconWrapActive]}>
                <Ionicons name={isActive ? (tab.iconActive as any) : (tab.icon as any)} size={22} color={isActive ? "#fff" : "#94a8d8"} />
              </View>
              <Text style={[st.guideTabLabel, isActive && st.guideTabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={[st.fab, { bottom: (insets.bottom || 12) + 20 }]} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
        <Ionicons name="grid" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[st.sidebarContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={st.sidebarHeader}>
              <View style={st.sidebarLogo}>
                <Ionicons name="shield-checkmark" size={24} color="#4f7cff" />
              </View>
              <View>
                <Text style={st.sidebarTitle}>LocalMate</Text>
                <Text style={st.sidebarSub}>Admin Workspace</Text>
              </View>
              <TouchableOpacity style={st.closeMenuBtn} onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {ADMIN_MENU_GROUPS.map((group, gIdx) => (
                <View key={gIdx} style={st.menuGroup}>
                  <Text style={st.groupTitle}>{group.title}</Text>
                  {group.items.map((item) => {
                    const isActive = isRouteActive(item.route);
                    return (
                      <TouchableOpacity
                        key={item.route}
                        style={[st.menuItem, isActive && { backgroundColor: `${item.color}15`, borderLeftColor: item.color, borderLeftWidth: 3 }]}
                        onPress={() => handleNavigate(item.route)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={isActive ? (item.iconActive as any) : (item.icon as any)} size={22} color={isActive ? item.color : "#7a8cc2"} style={{ marginRight: 14, marginLeft: isActive ? 13 : 16 }} />
                        <Text style={[st.menuItemTxt, isActive ? { color: item.color, fontWeight: "800" } : { color: "#1f2a58" }]}>{item.label}</Text>
                        {isActive && <View style={[st.activeDot, { backgroundColor: item.color }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  fab: { position: "absolute", right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, zIndex: 999 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)" },
  sidebarContent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 300, backgroundColor: "#fff", borderTopRightRadius: 28, borderBottomRightRadius: 28, elevation: 10, shadowColor: "#000", shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.1, shadowRadius: 15 },
  sidebarHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  sidebarLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  sidebarTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  sidebarSub: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" },
  closeMenuBtn: { marginLeft: "auto", width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  menuGroup: { marginBottom: 24 },
  groupTitle: { fontSize: 12, fontWeight: "800", color: "#94a8d8", textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 20, marginBottom: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderLeftWidth: 3, borderLeftColor: "transparent" },
  menuItemTxt: { flex: 1, fontSize: 15, fontWeight: "600" },
  activeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 20 },
  guideTabBar: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e8eeff", shadowColor: "#2a4caf", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 12 },
  guideTabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 4 },
  guideTabIconWrap: { width: 40, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideTabIconWrapActive: { backgroundColor: "#4f7cff" },
  guideTabLabel: { fontSize: 11, fontWeight: "600", color: "#94a8d8" },
  guideTabLabelActive: { color: "#4f7cff", fontWeight: "800" },
});