/**
 * app/admin-profile.tsx
 * Trang Hồ sơ cá nhân của Admin - Chuyên dùng để cập nhật thông tin & đổi mật khẩu
 * Tích hợp lưu thẳng vào Database @app_accounts để có thể Đăng nhập bằng thông tin mới
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_ITEMS = [
  { icon: "map-outline",               label: "Quản lý Tour",        route: "/admin-tour-management",   color: "#4f7cff" },
  { icon: "people-outline",            label: "Quản lý HDV",         route: "/admin-guide-management",  color: "#22c55e" },
  { icon: "person-add-outline",        label: "Duyệt đăng ký HDV",  route: "/admin-guide-requests",    color: "#d97706" },
  { icon: "person-circle-outline",     label: "Quản lý Users",       route: "/admin-users",             color: "#06b6d4" },
  { icon: "ticket-outline",            label: "Quản lý Voucher",     route: "/admin-voucher-management",color: "#f59e0b" },
  { icon: "flash-outline",             label: "Flash Sale / Deal",   route: "/admin-flash-sale",        color: "#ef4444" },
  { icon: "image-outline",             label: "Quản lý Banner",      route: "/admin-banner",            color: "#8b5cf6" },
  { icon: "cash-outline",              label: "Cấu hình Commission", route: "/admin-commission",        color: "#16a34a" },
  { icon: "warning-outline",           label: "Khiếu nại & Tranh chấp",route: "/admin-complaints",     color: "#dc2626" },
  { icon: "return-down-back-outline",  label: "Quản lý Hoàn tiền",   route: "/admin-refund-management", color: "#0ea5e9" },
  { icon: "chatbubble-ellipses-outline", label: "Giám sát Live Chat", route: "/admin-livechat-monitor", color: "#f59e0b" },
  { icon: "bar-chart-outline",         label: "Báo cáo & Thống kê", route: "/admin-report",            color: "#a855f7" },
  { icon: "settings-outline",          label: "Cài đặt hệ thống",   route: "/admin-settings",          color: "#64748b" },
] as const;


export default function AdminProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State Thông tin cá nhân
  const [profile, setProfile] = useState({
    name: "Super Admin",
    email: "admin@localmate.vn",
    phone: "0901234567",
    role: "Toàn quyền hệ thống"
  });

  // State Đổi mật khẩu
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  
  // States để ẩn/hiện mật khẩu cho từng ô riêng biệt
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);

  // Modal States
  const [logoutModal, setLogoutModal] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  // Load data từ Storage
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const rawUser = await AsyncStorage.getItem("@app_current_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setProfile({
          name: user.name || "Super Admin",
          email: user.email || "admin@localmate.vn",
          phone: user.phone || "0901234567",
          role: "Toàn quyền hệ thống"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Logic lưu thông tin đồng bộ cả Session hiện tại và Database gốc
  const handleSaveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim() || !profile.phone.trim()) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu thông tin", message: "Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại." });
      return;
    }

    try {
      // 1. Lấy thông tin user đang đăng nhập
      const rawCurrentUser = await AsyncStorage.getItem("@app_current_user");
      if (!rawCurrentUser) return;
      let currentUser = JSON.parse(rawCurrentUser);

      // 2. Mở Database gốc lấy toàn bộ tài khoản
      const rawAccounts = await AsyncStorage.getItem("@app_accounts");
      let allAccounts = rawAccounts ? JSON.parse(rawAccounts) : [];
      
      // Tìm vị trí của Admin hiện tại trong Database
      const userIndex = allAccounts.findIndex((a: any) => a.id === currentUser.id);

      if (userIndex !== -1) {
        // 3. Xử lý đổi mật khẩu (nếu có nhập)
        if (passwords.current || passwords.new || passwords.confirm) {
          if (allAccounts[userIndex].password !== passwords.current) {
            setConfirmPopup({ visible: true, type: "error", title: "Sai mật khẩu", message: "Mật khẩu hiện tại không chính xác." });
            return;
          }
          if (passwords.new !== passwords.confirm) {
            setConfirmPopup({ visible: true, type: "error", title: "Lỗi mật khẩu", message: "Mật khẩu xác nhận không khớp." });
            return;
          }
          if (passwords.new.length < 6) {
            setConfirmPopup({ visible: true, type: "error", title: "Mật khẩu yếu", message: "Mật khẩu mới phải có tối thiểu 6 ký tự." });
            return;
          }
          // Cập nhật mật khẩu mới vào DB
          allAccounts[userIndex].password = passwords.new;
          currentUser.password = passwords.new;
        }

        // 4. Kiểm tra trùng Email
        const isEmailExists = allAccounts.some((a: any) => a.email === profile.email && a.id !== currentUser.id);
        if (isEmailExists) {
          setConfirmPopup({ visible: true, type: "error", title: "Email đã tồn tại", message: "Email này đã được sử dụng bởi một tài khoản khác." });
          return;
        }

        // 5. Cập nhật thông tin mới
        allAccounts[userIndex].name = profile.name;
        allAccounts[userIndex].email = profile.email;
        allAccounts[userIndex].phone = profile.phone;

        currentUser.name = profile.name;
        currentUser.email = profile.email;
        currentUser.phone = profile.phone;

        // Lưu đồng thời
        await AsyncStorage.setItem("@app_accounts", JSON.stringify(allAccounts));
        await AsyncStorage.setItem("@app_current_user", JSON.stringify(currentUser));
        
        // Reset form mật khẩu
        setPasswords({ current: "", new: "", confirm: "" });
        setShowPwdCurrent(false);
        setShowPwdNew(false);
        setShowPwdConfirm(false);
        
        setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã cập nhật thông tin và mật khẩu. Lần đăng nhập sau hãy dùng thông tin mới." });
      }
    } catch (error) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi hệ thống", message: "Không thể lưu thông tin vào lúc này." });
    }
  };

  const executeLogout = async () => {
    setLogoutModal(false);
    await AsyncStorage.removeItem("@app_current_user");
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#4f7cff" />
      
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.profileHeader}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{profile.name.charAt(0).toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.adminName}>{profile.name}</Text>
              <View style={styles.roleTag}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.roleTagTxt}>{profile.role}</Text>
              </View>
            </View>
          </View>

          {/* Thông tin liên hệ */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Họ và tên hiển thị</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={profile.name}
                  onChangeText={(val) => setProfile({...profile, name: val})}
                  placeholder="Nhập họ và tên..."
                />
              </View>

              <Text style={styles.inputLabel}>Địa chỉ Email</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={profile.email}
                  keyboardType="email-address"
                  onChangeText={(val) => setProfile({...profile, email: val})}
                  placeholder="admin@localmate.vn"
                />
              </View>

              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={profile.phone}
                  keyboardType="phone-pad"
                  onChangeText={(val) => setProfile({...profile, phone: val})}
                  placeholder="09..."
                />
              </View>
            </View>
          </View>

          {/* Đổi mật khẩu với nút bật/tắt từng ô */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Bảo mật & Mật khẩu</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={passwords.current}
                  secureTextEntry={!showPwdCurrent}
                  onChangeText={(val) => setPasswords({...passwords, current: val})}
                  placeholder="••••••••"
                />
                <TouchableOpacity onPress={() => setShowPwdCurrent(!showPwdCurrent)} style={styles.eyeBtn}>
                  <Ionicons name={showPwdCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#94a8d8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <View style={styles.inputBox}>
                <Ionicons name="shield-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={passwords.new}
                  secureTextEntry={!showPwdNew}
                  onChangeText={(val) => setPasswords({...passwords, new: val})}
                  placeholder="Nhập mật khẩu mới"
                />
                <TouchableOpacity onPress={() => setShowPwdNew(!showPwdNew)} style={styles.eyeBtn}>
                  <Ionicons name={showPwdNew ? "eye-off-outline" : "eye-outline"} size={20} color="#94a8d8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Nhập lại mật khẩu mới</Text>
              <View style={styles.inputBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={passwords.confirm}
                  secureTextEntry={!showPwdConfirm}
                  onChangeText={(val) => setPasswords({...passwords, confirm: val})}
                  placeholder="Xác nhận lại mật khẩu"
                />
                <TouchableOpacity onPress={() => setShowPwdConfirm(!showPwdConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showPwdConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#94a8d8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Nút thao tác */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveBtnTxt}>Lưu thay đổi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModal(true)} activeOpacity={0.7}>
              <Ionicons name="log-out" size={20} color="#ef4444" />
              <Text style={styles.logoutTxt}>Đăng xuất khỏi thiết bị</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CUSTOM POPUP KẾT QUẢ */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={confirmPopup.type === "success" ? "checkmark-circle" : "warning"} 
                size={32} 
                color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"} 
              />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
              <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM POPUP LOGOUT */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="log-out" size={32} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Đăng xuất</Text>
            <Text style={styles.confirmMessage}>Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc quản trị này không?</Text>
            <View style={styles.confirmActionRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setLogoutModal(false)}>
                <Text style={styles.confirmCancelBtnTxt}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeLogout}>
                <Text style={styles.confirmSubmitBtnTxt}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  content: { paddingBottom: 100 },
  
  profileHeader: { backgroundColor: "#4f7cff", paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  
  avatarSection: { alignItems: "center" },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 30, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  avatarTxt: { fontSize: 40, fontWeight: "900", color: "#4f7cff" },
  editAvatarBtn: { position: "absolute", bottom: -5, right: -5, width: 32, height: 32, borderRadius: 16, backgroundColor: "#1f2a58", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#4f7cff" },
  
  adminName: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 6 },
  roleTag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleTagTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  formSection: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#94a8d8", marginBottom: 10, marginLeft: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 12 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: "#1f2a58", fontWeight: "600", height: "100%" },
  eyeBtn: { padding: 8, marginRight: -8 }, // Icon con mắt

  actionSection: { paddingHorizontal: 16, marginTop: 30, marginBottom: 20, gap: 14 },
  saveBtn: { height: 56, borderRadius: 16, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  
  logoutBtn: { height: 56, borderRadius: 16, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  logoutTxt: { color: "#dc2626", fontSize: 15, fontWeight: "800" },

  // Popups
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});