/**
 * app/staff-profile.tsx
 * Hồ sơ Staff CSKH - BỔ SUNG: Tính năng chỉnh sửa hồ sơ & Đồng bộ dữ liệu thật
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; // Dùng màng lọc
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const MENU_ITEMS = [
  { icon: "receipt-outline",     label: "Quản lý Booking",        route: "/staff-booking-management",  color: "#2856d6" },
  { icon: "refresh-outline",     label: "Xử lý Hoàn tiền",       route: "/staff-refund-management",   color: "#d97706" },
  { icon: "warning-outline",     label: "Khiếu nại & Tranh chấp", route: "/staff-complaints",          color: "#dc2626" },
  { icon: "chatbubbles-outline", label: "Live Chat Hỗ trợ",      route: "/staff-livechat",            color: "#16a34a" },
  { icon: "ticket-outline",      label: "Cấp phát Voucher",      route: "/staff-voucher-send",        color: "#f59e0b" },
  { icon: "flag-outline",        label: "Kiểm duyệt Review",     route: "/staff-review-moderation",   color: "#7c3aed" },
];

export default function StaffProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState({ name: "Staff CSKH", email: "", phone: "", avatarColor: "#1f2a58" });
  const [logoutModal, setLogoutModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useFocusEffect(useCallback(() => {
    const loadProfile = async () => {
      const rawUser = await AsyncStorage.getItem("@app_current_user");
      const sessionUser = rawUser ? JSON.parse(rawUser) : null;

      const pRaw = await AsyncStorage.getItem("@app_profile");
      const pSaved = pRaw ? JSON.parse(pRaw) : {};

      const currentProfile = {
        name: sessionUser?.name || pSaved.name || "Nhân viên CSKH",
        email: sessionUser?.email || pSaved.email || "",
        phone: sessionUser?.phone || pSaved.phone || "Chưa cập nhật",
        avatarColor: sessionUser?.avatarColor || pSaved.avatarColor || "#1f2a58"
      };

      setProfile(currentProfile);
      setForm(currentProfile);
    };
    loadProfile();
  }, []));

  const handleSaveProfile = async () => {
    if (!form.name.trim()) return Alert.alert("Lỗi", "Vui lòng nhập họ tên.");
    
    // Cập nhật Profile cá nhân
    await AsyncStorage.setItem("@app_profile", JSON.stringify({ ...profile, ...form }));
    
    // Cập nhật ngược lại Session đăng nhập để đồng bộ toàn app
    const rawUser = await AsyncStorage.getItem("@app_current_user");
    if (rawUser) {
      const sessionUser = JSON.parse(rawUser);
      sessionUser.name = form.name;
      sessionUser.phone = form.phone;
      await AsyncStorage.setItem("@app_current_user", JSON.stringify(sessionUser));
    }

    setProfile({ ...profile, ...form });
    setEditModal(false);
    Alert.alert("Thành công", "Đã cập nhật thông tin hồ sơ.");
  };

  const handleLogout = async () => {
    setLogoutModal(false);
    await AsyncStorage.removeItem("@current_user_role");
    router.replace("/login" as any);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Hồ sơ Nhân viên</Text>
          <Text style={s.headerSub}>LocalMate Staff Portal</Text>
        </View>
        <TouchableOpacity style={s.headerLogoutBtn} onPress={() => setLogoutModal(true)}>
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={[s.avatar, { backgroundColor: profile.avatarColor }]}>
            <Text style={s.avatarTxt}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.email}>{profile.email}</Text>
            <Text style={s.phone}>{profile.phone}</Text>
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => { setForm(profile); setEditModal(true); }}>
            <Ionicons name="pencil" size={18} color="#4f7cff" />
          </TouchableOpacity>
        </View>

        <View style={s.menuBox}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity key={idx} style={[s.menuItem, idx === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => router.push(item.route as any)}>
              <View style={[s.menuIconWrap, { backgroundColor: item.color + "15" }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={s.menuTxt}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutModal(true)}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={s.logoutTxt}>Đăng xuất an toàn</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Chỉnh sửa Hồ sơ */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.popupOverlay}>
          <View style={s.editPopup}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chỉnh sửa Hồ sơ</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%' }}>
              <Text style={s.inputLabel}>Họ và tên</Text>
              <TextInput style={s.input} value={form.name} onChangeText={t => setForm({...form, name: t})} />
              
              <Text style={s.inputLabel}>Số điện thoại</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={t => setForm({...form, phone: t})} keyboardType="phone-pad" />
              
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveProfile}>
                <Text style={s.saveBtnTxt}>Lưu thông tin</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Đăng xuất */}
      <Modal visible={logoutModal} animationType="fade" transparent>
        <View style={s.popupOverlay}>
          <View style={s.logoutPopup}>
            <View style={s.logoutPopupIcon}>
              <Ionicons name="log-out" size={32} color="#dc2626" />
            </View>
            <Text style={s.logoutPopupTitle}>Đăng xuất?</Text>
            <Text style={s.logoutPopupSub}>Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Staff này không?</Text>
            <View style={s.logoutPopupBtnRow}>
              <TouchableOpacity style={s.logoutPopupCancel} onPress={() => setLogoutModal(false)}><Text style={s.logoutPopupCancelTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.logoutPopupConfirm} onPress={handleLogout}><Text style={s.logoutPopupConfirmTxt}>Đăng xuất</Text></TouchableOpacity>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1f2a58" },
  headerSub: { fontSize: 12, color: "#7a8cc2", fontWeight: "600", marginTop: 2 },
  headerLogoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 120 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 20, borderRadius: 20, marginBottom: 16, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 16 },
  avatarTxt: { color: "#fff", fontSize: 26, fontWeight: "900" },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  email: { fontSize: 13, color: "#7a8cc2", marginBottom: 2 },
  phone: { fontSize: 13, color: "#7a8cc2" },
  editBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  menuBox: { backgroundColor: "#fff", borderRadius: 20, padding: 10, marginBottom: 16, elevation: 2 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 14 },
  menuTxt: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1f2a58" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fef2f2", padding: 16, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: "#fecaca" },
  logoutTxt: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
  
  popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  editPopup: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2a58' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#1f2a58', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#f8faff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 12, padding: 14, fontSize: 15 },
  saveBtn: { backgroundColor: '#4f7cff', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  logoutPopup: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', elevation: 10 },
  logoutPopupIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoutPopupTitle: { fontSize: 20, fontWeight: '900', color: '#1f2a58', marginBottom: 8 },
  logoutPopupSub: { fontSize: 14, color: '#7a8cc2', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  logoutPopupBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutPopupCancel: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  logoutPopupCancelTxt: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  logoutPopupConfirm: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  logoutPopupConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});