/**
 * components/GuideTabBar.tsx
 * Component Menu Sidebar nổi dành riêng cho Hướng dẫn viên
 * Giao diện và hiệu ứng đồng bộ 100% với AdminTabBar
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

const GUIDE_MENU_GROUPS = [
  {
    title: "Chung",
    items: [
      { icon: "home-outline", iconActive: "home", label: "Tổng quan", route: "guide-home", color: "#1f2a58" },
      { icon: "person-outline", iconActive: "person", label: "Hồ sơ cá nhân", route: "guide-profile", color: "#64748b" },
      { icon: "shield-checkmark-outline", iconActive: "shield-checkmark", label: "Hồ sơ & Giấy phép", route: "guide-onboarding", color: "#10b981" },
    ]
  },
  {
    title: "Công việc",
    items: [
      { icon: "calendar-outline", iconActive: "calendar", label: "Quản lý Booking", route: "guide-booking-management", color: "#4f7cff" },
      { icon: "map-outline", iconActive: "map", label: "Tour của tôi", route: "guide-tour-management", color: "#10b981" },
      { icon: "time-outline", iconActive: "time", label: "Lịch làm việc", route: "guide-schedule-management", color: "#d97706" },
      { icon: "grid-outline", iconActive: "grid", label: "Cấu hình Slot & Giá", route: "guide-schedule-slots", color: "#8b5cf6" },
    ]
  },
  {
    title: "Tương tác & Thống kê",
    items: [
      { icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Chat với khách", route: "guide_chat_list", color: "#06b6d4" },
      { icon: "notifications-outline", iconActive: "notifications", label: "Thông báo", route: "guide-notifications", color: "#ef4444" },
      { icon: "cash-outline", iconActive: "cash", label: "Thu nhập", route: "guide-earnings", color: "#f59e0b" },
      { icon: "bar-chart-outline", iconActive: "bar-chart", label: "Analytics", route: "guide-analytics", color: "#6366f1" },
      { icon: "star-outline", iconActive: "star", label: "Đánh giá", route: "guide-reviews", color: "#a855f7" },
    ]
  },
  {
    title: "Dịch vụ",
    items: [
      { icon: "megaphone-outline", iconActive: "megaphone", label: "Quảng cáo Sponsored", route: "guide-sponsored", color: "#ec4899" },
    ]
  }
];

export function GuideTabBar({ activeRoute = "" }: { activeRoute?: string }) {
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
      router.replace(`/${route.replace('/', '')}` as any);
    }, 150);
  };

  return (
    <>
      {/* Nút Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: (insets.bottom || 12) + 20 }]} 
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="grid" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Modal Overlay Sidebar */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={[styles.sidebarContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogo}>
                <Ionicons name="compass" size={24} color="#4f7cff" />
              </View>
              <View>
                <Text style={styles.sidebarTitle}>LocalMate</Text>
                <Text style={styles.sidebarSub}>Guide Workspace</Text>
              </View>
              <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {GUIDE_MENU_GROUPS.map((group, gIdx) => (
                <View key={gIdx} style={styles.menuGroup}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.items.map((item) => {
                    const isActive = isRouteActive(item.route);
                    return (
                      <TouchableOpacity
                        key={item.route}
                        style={[
                          styles.menuItem,
                          isActive && { backgroundColor: `${item.color}15`, borderLeftColor: item.color, borderLeftWidth: 3 }
                        ]}
                        onPress={() => handleNavigate(item.route)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={isActive ? (item.iconActive as any) : (item.icon as any)} 
                          size={22} 
                          color={isActive ? item.color : "#7a8cc2"} 
                          style={{ marginRight: 14, marginLeft: isActive ? 13 : 16 }} 
                        />
                        <Text style={[styles.menuItemTxt, isActive ? { color: item.color, fontWeight: "800" } : { color: "#1f2a58" }]}>
                          {item.label}
                        </Text>
                        {isActive && <View style={[styles.activeDot, { backgroundColor: item.color }]} />}
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

const styles = StyleSheet.create({
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
});