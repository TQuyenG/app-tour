/**
 * app/staff-profile.tsx
 * Hồ sơ Staff CSKH - FIX: icon logout header + popup xác nhận + paddingBottom động
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const MENU_ITEMS = [
  { icon: "receipt-outline",     label: "Quản lý Booking",        route: "/staff-booking-management",  color: "#2856d6" },
  { icon: "refresh-outline",     label: "Xử lý Hoàn tiền",       route: "/staff-refund-management",   color: "#d97706" },
  { icon: "warning-outline",     label: "Khiếu nại & Tranh chấp", route: "/staff-complaints",          color: "#dc2626" },
  { icon: "chatbubbles-outline", label: "Live Chat Hỗ trợ",      route: "/staff-livechat",            color: "#16a34a" },
  { icon: "ticket-outline",      label: "Cấp phát Voucher",      route: "/staff-voucher-send",        color: "#f59e0b" },
  { icon: "flag-outline",        label: "Kiểm duyệt Review",     route: "/staff-review-moderation",   color: "#dc2626" },
] as const;

export default function StaffProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>({});
  const [logoutModal, setLogoutModal] = useState(false); // ← MỚI

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_profile").then(raw => {
      if (raw) setProfile(JSON.parse(raw));
      else {
        setProfile({
          name: "Nhân viên CSKH", email: "support@localmate.vn", phone: "1900 1508",
          avatar: "https://ui-avatars.com/api/?name=CSKH&background=f59e0b&color=fff",
          resolvedCases: 128, avgRating: 4.9
        });
      }
    });
  }, []));

  // ← MỚI: xóa đủ cả 2 key
  const doLogout = async () => {
    setLogoutModal(false);
    await AsyncStorage.removeItem('@app_current_user');
    await AsyncStorage.removeItem('@current_user_role');
    router.replace("/login");
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* HEADER với icon logout bên phải */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Hồ sơ nhân viên</Text>
        {/* ← MỚI: icon logout trên header */}
        <TouchableOpacity onPress={() => setLogoutModal(true)} style={s.headerLogoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.profileCard}>
          <Image source={{ uri: profile.avatar }} style={s.avatar} />
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.role}>Chuyên viên Hỗ trợ Khách hàng</Text>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{profile.resolvedCases || 0}</Text>
              <Text style={s.statLbl}>Case đã xử lý</Text>
            </View>
            <View style={s.dividerVert} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{profile.avgRating || "5.0"}★</Text>
              <Text style={s.statLbl}>Đánh giá TB</Text>
            </View>
          </View>
        </View>

        <View style={s.infoBlock}>
          <View style={s.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#7a8cc2" />
            <Text style={s.infoTxt}>{profile.email}</Text>
          </View>
          <View style={s.dividerHorz} />
          <View style={s.infoRow}>
            <Ionicons name="call-outline" size={18} color="#7a8cc2" />
            <Text style={s.infoTxt}>{profile.phone}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Công cụ nghiệp vụ</Text>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={s.menuBtn} onPress={() => router.push(item.route as any)}>
            <View style={[s.menuIconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={s.menuTxt}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
          </TouchableOpacity>
        ))}

        {/* Nút logout cuối trang */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutModal(true)}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={s.logoutTxt}>Đăng xuất khỏi hệ thống</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── POPUP XÁC NHẬN ĐĂNG XUẤT ── */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.logoutPopup}>
            <View style={s.logoutPopupIcon}>
              <Ionicons name="log-out-outline" size={32} color="#ef4444" />
            </View>
            <Text style={s.logoutPopupTitle}>Đăng xuất?</Text>
            <Text style={s.logoutPopupSub}>Bạn có chắc chắn muốn đăng xuất khỏi ca trực không?</Text>
            <View style={s.logoutPopupBtnRow}>
              <TouchableOpacity style={s.logoutPopupCancel} onPress={() => setLogoutModal(false)}>
                <Text style={s.logoutPopupCancelTxt}>Ở lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.logoutPopupConfirm} onPress={doLogout}>
                <Text style={s.logoutPopupConfirmTxt}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StaffTabBar activeRoute="/staff-profile" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 2 },
  headerLogoutBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", elevation: 2 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  content: { padding: 16 },
  profileCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: "#fef3c7" },
  name: { fontSize: 20, fontWeight: "900", color: "#1f2a58", marginBottom: 4 },
  role: { fontSize: 13, color: "#f59e0b", fontWeight: "700", marginBottom: 20 },
  statsRow: { flexDirection: "row", backgroundColor: "#f8faff", borderRadius: 14, padding: 14, width: "100%" },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "900", color: "#2856d6" },
  statLbl: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  dividerVert: { width: 1, backgroundColor: "#e4ebff" },
  infoBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoTxt: { fontSize: 14, color: "#1f2a58", fontWeight: "500" },
  dividerHorz: { height: 1, backgroundColor: "#f0f4ff", marginVertical: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 12, marginLeft: 4 },
  menuBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 16, marginBottom: 10 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  menuTxt: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1f2a58" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fef2f2", padding: 16, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: "#fecaca" },
  logoutTxt: { color: "#dc2626", fontSize: 15, fontWeight: "700" },

  // ── LOGOUT POPUP ──
  popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  logoutPopup: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', elevation: 10 },
  logoutPopupIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoutPopupTitle: { fontSize: 20, fontWeight: '900', color: '#1f2a58', marginBottom: 8 },
  logoutPopupSub: { fontSize: 14, color: '#7a8cc2', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  logoutPopupBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutPopupCancel: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  logoutPopupCancelTxt: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  logoutPopupConfirm: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  logoutPopupConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});