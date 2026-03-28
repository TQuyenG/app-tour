/**
 * app/login.tsx
 * Trang Đăng nhập & Quên mật khẩu - Đã thay thế Alert bằng Custom Modal Popup
 * ĐÃ FIX LỖI: Nhấn giữ Logo mở Dev Mode (Sử dụng pointerEvents="box-only")
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoLocalMate from "../components/LogoLocalMate";

const QUICK = [
  { type: "guest", email: "guest1@gmail.com", pw: "123456", label: "Khách", color: "#3b82f6", bg: "#eff6ff" },
  { type: "admin", email: "admin1@gmail.com", pw: "123456", label: "Admin", color: "#ef4444", bg: "#fef2f2" },
  { type: "guide", email: "guide1@gmail.com", pw: "123456", label: "HDV", color: "#10b981", bg: "#ecfdf5" },
  { type: "staff", email: "staff1@gmail.com", pw: "123456", label: "Staff", color: "#f59e0b", bg: "#fffbeb" },
];

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const [forgotModal, setForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const [alertPopup, setAlertPopup] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ visible: false, type: "error", title: "", message: "" });

  const showAlert = (type: "success" | "error" | "info", title: string, message: string, onConfirm?: () => void) => {
    setAlertPopup({ visible: true, type, title, message, onConfirm });
  };

  const closeAlert = () => {
    if (alertPopup.onConfirm) alertPopup.onConfirm();
    setAlertPopup({ ...alertPopup, visible: false });
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert("error", "Lỗi nhập liệu", "Vui lòng nhập địa chỉ email và mật khẩu.");
      return;
    }
    
    setLoading(true);
    
    try {
      let role = "guest"; 
      const emailLower = email.trim().toLowerCase();

      if (emailLower.includes("admin")) {
        role = "admin";
      } else if (emailLower.includes("guide")) {
        role = "guide";
      } else if (emailLower.includes("staff")) {
        role = "staff";
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      await AsyncStorage.setItem("@current_user_role", role);

      if (role === "admin") {
        router.replace("/admin-home");
      } else if (role === "guide") {
        router.replace("/guide-home");
      } else if (role === "staff") {
        router.replace("/staff-home" as any);
      } else {
        router.replace("/");
      }

    } catch (error) {
      showAlert("error", "Đăng nhập thất bại", "Đã có lỗi xảy ra trong quá trình đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setDevMode(false);
  };

  const handleSendOTP = async () => {
    if (!forgotEmail.trim()) {
      showAlert("error", "Lỗi nhập liệu", "Vui lòng nhập địa chỉ email của bạn.");
      return;
    }
    try {
      const raw = await AsyncStorage.getItem("@app_accounts");
      const accounts = raw ? JSON.parse(raw) : [];
      const userExists = accounts.some((a: any) => a.email.toLowerCase() === forgotEmail.trim().toLowerCase());
      
      if (!userExists) {
        showAlert("error", "Không tìm thấy", "Email này chưa được đăng ký trong hệ thống.");
        return;
      }
      
      showAlert("success", "Gửi mã thành công", "Mã xác thực OTP (Giả lập) của bạn là: 123456\nVui lòng kiểm tra email.", () => setForgotStep(2));
    } catch (e) {
      showAlert("error", "Lỗi hệ thống", "Hệ thống đang bận.");
    }
  };

  const handleResetPassword = async () => {
    if (otp !== "123456") {
      showAlert("error", "Mã OTP không hợp lệ", "Mã xác thực không đúng. Vui lòng nhập '123456'.");
      return;
    }
    if (newPwd.length < 6) {
      showAlert("error", "Mật khẩu yếu", "Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      const raw = await AsyncStorage.getItem("@app_accounts");
      let accounts = raw ? JSON.parse(raw) : [];
      const userIndex = accounts.findIndex((a: any) => a.email.toLowerCase() === forgotEmail.trim().toLowerCase());

      if (userIndex !== -1) {
        accounts[userIndex].password = newPwd;
        await AsyncStorage.setItem("@app_accounts", JSON.stringify(accounts));
        
        showAlert("success", "Thành công", "Đã đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.", () => closeForgotModal());
      }
    } catch (e) {
      showAlert("error", "Lỗi", "Không thể đặt lại mật khẩu.");
    }
  };

  const closeForgotModal = () => {
    setForgotModal(false);
    setTimeout(() => {
      setForgotStep(1);
      setForgotEmail("");
      setOtp("");
      setNewPwd("");
    }, 300);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* ĐÃ FIX: Chuyển TouchableWithoutFeedback thành TouchableOpacity + pointerEvents */}
          <TouchableOpacity 
            activeOpacity={1} 
            onLongPress={() => setDevMode(!devMode)} 
            delayLongPress={1000}
          >
            <View style={styles.logoWrapper} pointerEvents="box-only">
              <View style={styles.logoScaler}>
                <LogoLocalMate />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục trải nghiệm LocalMate</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Địa chỉ Email" placeholderTextColor="#94a8d8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor="#94a8d8" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color="#94a8d8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPwd} onPress={() => setForgotModal(true)}>
              <Text style={styles.forgotPwdTxt}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnTxt}>Đăng nhập</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerBox}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerTxt}>Hoặc đăng nhập bảo mật bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.vneidBtn} onPress={() => router.push("/vneid-login" as any)}>
            <View style={styles.vneidIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <Text style={styles.vneidTxt}>Định danh điện tử VNeID</Text>
          </TouchableOpacity>

          {devMode && (
            <View style={styles.quickLoginBox}>
              <Text style={styles.quickLoginLabel}>Dev Mode - Truy cập nhanh:</Text>
              <View style={styles.quickLoginRow}>
                {QUICK.map((q) => (
                  <TouchableOpacity key={q.type} style={[styles.quickBtn, { backgroundColor: q.bg, borderColor: q.color }]} onPress={() => handleQuickLogin(q.email, q.pw)}>
                    <Text style={[styles.quickBtnTxt, { color: q.color }]}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push("/register" as any)}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL QUÊN MẬT KHẨU */}
      <Modal visible={forgotModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Quên mật khẩu</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={closeForgotModal}>
                  <Ionicons name="close" size={24} color="#1f2a58" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {forgotStep === 1 ? (
                  <>
                    <Text style={styles.modalDesc}>Vui lòng nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi mã xác thực (OTP) để bạn khôi phục mật khẩu.</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="mail-outline" size={20} color="#94a8d8" style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Nhập email của bạn" placeholderTextColor="#94a8d8" value={forgotEmail} onChangeText={setForgotEmail} keyboardType="email-address" autoCapitalize="none" />
                    </View>
                    <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSendOTP}>
                      <Text style={styles.modalSubmitBtnTxt}>Gửi mã OTP</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalDesc}>Mã xác nhận đã được gửi đến email <Text style={{ fontWeight: "700" }}>{forgotEmail}</Text>. Vui lòng kiểm tra hộp thư.</Text>
                    <Text style={styles.inputLabel}>Mã OTP (Nhập 123456 để test)</Text>
                    <View style={[styles.inputBox, { marginBottom: 16 }]}>
                      <Ionicons name="keypad-outline" size={20} color="#94a8d8" style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Nhập mã 6 chữ số" placeholderTextColor="#94a8d8" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                    </View>
                    <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="lock-closed-outline" size={20} color="#94a8d8" style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Tối thiểu 6 ký tự" placeholderTextColor="#94a8d8" value={newPwd} onChangeText={setNewPwd} secureTextEntry={true} />
                    </View>
                    <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleResetPassword}>
                      <Text style={styles.modalSubmitBtnTxt}>Đặt lại mật khẩu</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CUSTOM POPUP ALERT */}
      <Modal visible={alertPopup.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconWrap, 
              alertPopup.type === "success" ? { backgroundColor: "#d1fae5" } : 
              alertPopup.type === "info" ? { backgroundColor: "#eaf0ff" } : { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={alertPopup.type === "success" ? "checkmark-circle" : alertPopup.type === "info" ? "information-circle" : "warning"} 
                size={32} 
                color={alertPopup.type === "success" ? "#10b981" : alertPopup.type === "info" ? "#4f7cff" : "#ef4444"} 
              />
            </View>
            <Text style={styles.alertTitle}>{alertPopup.title}</Text>
            <Text style={styles.alertMessage}>{alertPopup.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={closeAlert}>
              <Text style={styles.alertBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  content: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: "center" },
  
  logoWrapper: { height: 120, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 },
  logoScaler: { transform: [{ scale: 0.65 }], marginTop: -20 },

  headerText: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 26, fontWeight: "900", color: "#1f2a58", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#7a8cc2", textAlign: "center" },

  form: { gap: 14 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 16, height: 56, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: "#1f2a58", fontWeight: "500", height: "100%" },
  eyeBtn: { padding: 8, marginRight: -8 },
  
  forgotPwd: { alignSelf: "flex-end", paddingVertical: 4 },
  forgotPwdTxt: { color: "#4f7cff", fontSize: 13, fontWeight: "700" },

  loginBtn: { height: 56, borderRadius: 16, backgroundColor: "#4f7cff", justifyContent: "center", alignItems: "center", marginTop: 10, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  loginBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  dividerBox: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e4ebff" },
  dividerTxt: { marginHorizontal: 14, color: "#94a8d8", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },

  vneidBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: "#dc2626", gap: 10, borderStyle: "dashed" },
  vneidIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  vneidTxt: { color: "#dc2626", fontSize: 15, fontWeight: "800" },

  quickLoginBox: { marginTop: 20, backgroundColor: "#fefce8", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#fde68a" },
  quickLoginLabel: { fontSize: 12, color: "#d97706", fontWeight: "800", marginBottom: 12, textAlign: "center", textTransform: "uppercase" },
  quickLoginRow: { flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickBtnTxt: { fontSize: 12, fontWeight: "800" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerTxt: { color: "#7a8cc2", fontSize: 14 },
  registerLink: { color: "#4f7cff", fontSize: 14, fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 350 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 24, paddingBottom: 40 },
  modalDesc: { fontSize: 14, color: "#5f73a9", lineHeight: 22, marginBottom: 20, textAlign: "center" },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginLeft: 4 },
  modalSubmitBtn: { height: 56, borderRadius: 16, backgroundColor: "#1f2a58", justifyContent: "center", alignItems: "center", marginTop: 24 },
  modalSubmitBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  alertBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  alertMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  alertBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  alertBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});