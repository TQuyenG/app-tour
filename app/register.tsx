/**
 * app/register.tsx
 * Trang Đăng ký - Đã thay thế Alert bằng Custom Modal Popup
 */
import { registerAccount } from "@/constants/app-accounts";
import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoLocalMate from "../components/LogoLocalMate";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom Popup State thay cho Alert
  const [alertPopup, setAlertPopup] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ visible: false, type: "error", title: "", message: "" });

  const showAlert = (type: "success" | "error", title: string, message: string, onConfirm?: () => void) => {
    setAlertPopup({ visible: true, type, title, message, onConfirm });
  };

  const closeAlert = () => {
    if (alertPopup.onConfirm) alertPopup.onConfirm();
    setAlertPopup({ ...alertPopup, visible: false });
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showAlert("error", "Thiếu thông tin", "Vui lòng điền đầy đủ các trường.");
      return;
    }
    if (password.length < 6) {
      showAlert("error", "Mật khẩu yếu", "Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      showAlert("error", "Lỗi mật khẩu", "Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);
    const res = await registerAccount(name.trim(), email.trim().toLowerCase(), password, phone.trim());
    setLoading(false);

    if (res.ok) {
      // Khi đóng popup thành công sẽ tự động chuyển về trang Đăng nhập
      showAlert("success", "Đăng ký thành công!", "Tài khoản của bạn đã được tạo. Bạn có thể đăng nhập ngay bây giờ.", () => router.replace("/login"));
    } else {
      showAlert("error", "Đăng ký thất bại", res.error || "Có lỗi xảy ra trong quá trình đăng ký.");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.logoWrapper}>
            <View style={styles.logoScaler}>
              <LogoLocalMate />
            </View>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>Bắt đầu hành trình cùng LocalMate</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Họ và tên" placeholderTextColor="#94a8d8" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a8d8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Số điện thoại" placeholderTextColor="#94a8d8" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor="#94a8d8" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color="#94a8d8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Xác nhận mật khẩu" placeholderTextColor="#94a8d8" value={confirm} onChangeText={setConfirm} secureTextEntry={!showPwd} />
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnTxt}>Đăng ký tài khoản</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* CUSTOM POPUP ALERT */}
      <Modal visible={alertPopup.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconWrap, 
              alertPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={alertPopup.type === "success" ? "checkmark-circle" : "warning"} 
                size={32} 
                color={alertPopup.type === "success" ? "#10b981" : "#ef4444"} 
              />
            </View>
            <Text style={styles.alertTitle}>{alertPopup.title}</Text>
            <Text style={styles.alertMessage}>{alertPopup.message}</Text>
            <TouchableOpacity style={[styles.alertBtn, alertPopup.type === "success" && { backgroundColor: "#4f7cff" }]} onPress={closeAlert}>
              <Text style={[styles.alertBtnTxt, alertPopup.type === "success" && { color: "#fff" }]}>
                {alertPopup.type === "success" ? "Đăng nhập ngay" : "Đóng"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  headerNav: { paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  content: { padding: 24, paddingBottom: 40, flexGrow: 1 },
  
  logoWrapper: { height: 100, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 },
  logoScaler: { transform: [{ scale: 0.55 }], marginTop: -20 },

  headerText: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "900", color: "#1f2a58", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#7a8cc2", textAlign: "center" },

  form: { gap: 14 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: "#1f2a58", fontWeight: "500", height: "100%" },
  eyeBtn: { padding: 8, marginRight: -8 },

  registerBtn: { height: 56, borderRadius: 16, backgroundColor: "#4f7cff", justifyContent: "center", alignItems: "center", marginTop: 16, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  registerBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerTxt: { color: "#7a8cc2", fontSize: 14 },
  loginLink: { color: "#4f7cff", fontSize: 14, fontWeight: "800" },

  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  alertBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  alertMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  alertBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  alertBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});