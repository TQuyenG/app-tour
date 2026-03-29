/**
 * components/StaffTabBar.tsx
 * Component Menu Sidebar nổi dành riêng cho Staff (CSKH)
 * Đồng bộ UI/UX 100% với AdminTabBar và GuideTabBar
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

// Phân nhóm chức năng cho Staff CSKH
const STAFF_MENU_GROUPS = [
  {
    title: "Chung",
    items: [
      { icon: "home-outline", iconActive: "home", label: "Tổng quan", route: "staff-home", color: "#f59e0b" },
      { icon: "person-outline", iconActive: "person", label: "Hồ sơ cá nhân", route: "staff-profile", color: "#64748b" },
    ]
  },
  {
    title: "Xử lý & Vận hành",
    items: [
      { icon: "receipt-outline", iconActive: "receipt", label: "Quản lý Booking", route: "staff-booking-management", color: "#2856d6" },
      { icon: "refresh-outline", iconActive: "refresh", label: "Xử lý Hoàn tiền", route: "staff-refund-management", color: "#d97706" },
    ]
  },
  {
    title: "Tương tác khách hàng",
    items: [
      { icon: "chatbubbles-outline", iconActive: "chatbubbles", label: "Live Chat", route: "staff-livechat", color: "#16a34a" },
      { icon: "warning-outline", iconActive: "warning", label: "Khiếu nại & Tranh chấp", route: "staff-complaints", color: "#dc2626" },
    ]
  },
  {
    title: "Kiểm duyệt & Ưu đãi",
    items: [
      { icon: "flag-outline", iconActive: "flag", label: "Kiểm duyệt Review", route: "staff-review-moderation", color: "#7c3aed" },
      { icon: "ticket-outline", iconActive: "ticket", label: "Quản lý Voucher", route: "staff-voucher-management", color: "#ec4899" },
    ]
  }
];

export function StaffTabBar({ activeRoute = "" }: { activeRoute?: string }) {
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
      {/* Nút Floating Action Button (Màu Cam đặc trưng của Staff) */}
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
                <Ionicons name="headset" size={24} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.sidebarTitle}>LocalMate</Text>
                <Text style={styles.sidebarSub}>Staff Workspace</Text>
              </View>
              <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {STAFF_MENU_GROUPS.map((group, gIdx) => (
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
  fab: { position: "absolute", right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, zIndex: 999 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)" },
  sidebarContent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 300, backgroundColor: "#fff", borderTopRightRadius: 28, borderBottomRightRadius: 28, elevation: 10, shadowColor: "#000", shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.1, shadowRadius: 15 },
  sidebarHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  sidebarLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginRight: 12 },
  sidebarTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  sidebarSub: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" },
  closeMenuBtn: { marginLeft: "auto", width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  menuGroup: { marginBottom: 24 },
  groupTitle: { fontSize: 12, fontWeight: "800", color: "#94a8d8", textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 20, marginBottom: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderLeftWidth: 3, borderLeftColor: "transparent" },
  menuItemTxt: { flex: 1, fontSize: 15, fontWeight: "600" },
  activeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 20 },
});