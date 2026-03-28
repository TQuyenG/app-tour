/**
 * app/vneid-login.tsx
 * Trang Xác thực VNeID - Đã thay thế Alert bằng Custom Modal Popup
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VneidLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [connecting, setConnecting] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang thiết lập kết nối an toàn...");

  // Custom Popup State thay cho Alert (mặc dù trang này không cần nhập liệu nhưng đề phòng khi có lỗi kết nối)
  const [alertPopup, setAlertPopup] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });

  const handleVneidAuth = () => {
    // Nếu muốn giả lập lỗi kết nối, bạn có thể gọi setAlertPopup ở đây
    setConnecting(true);
    
    setTimeout(() => setLoadingText("Đang mở ứng dụng VNeID trên thiết bị..."), 1000);
    setTimeout(() => setLoadingText("Đang đồng bộ dữ liệu định danh điện tử..."), 2500);
    
    setTimeout(() => {
      setConnecting(false);
      // Xác thực thành công -> Trở về trang chủ
      router.replace("/" as any);
    }, 4000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#1f2a58" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        
        <View style={styles.vneidBanner}>
          <MaterialCommunityIcons name="shield-check" size={50} color="#dc2626" />
          <Text style={styles.title}>Xác thực Định danh</Text>
          <Text style={styles.subtitle}>Hệ thống sử dụng nền tảng VNeID của Bộ Công An để đảm bảo an toàn tối đa.</Text>
        </View>

        <View style={styles.scannerBox}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          
          <Ionicons name="qr-code-outline" size={100} color="#c0cbe8" style={{ opacity: 0.5 }} />
          <View style={styles.scannerLine} />
        </View>
        <Text style={styles.scannerHint}>Quét mã QR từ ứng dụng VNeID trên điện thoại khác hoặc bấm kết nối trực tiếp bên dưới.</Text>

        <View style={{ flex: 1 }} />

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleVneidAuth}>
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnTxt}>Mở ứng dụng VNeID xác thực</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleVneidAuth}>
            <Ionicons name="card-outline" size={20} color="#1f2a58" />
            <Text style={styles.secondaryBtnTxt}>Quét thẻ CCCD gắn chip (NFC)</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Modal Loading Giả lập SSO */}
      <Modal visible={connecting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color="#dc2626" />
            <Text style={styles.modalTitle}>Cổng Dịch vụ công Quốc gia</Text>
            <Text style={styles.modalText}>{loadingText}</Text>
          </View>
        </View>
      </Modal>

      {/* CUSTOM POPUP ALERT */}
      <Modal visible={alertPopup.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>
            <Text style={styles.alertTitle}>{alertPopup.title}</Text>
            <Text style={styles.alertMessage}>{alertPopup.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertPopup({ ...alertPopup, visible: false })}>
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
  header: { paddingHorizontal: 16, paddingVertical: 10, alignItems: "flex-end" },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
  
  vneidBanner: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: "#1f2a58", marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },

  scannerBox: { alignSelf: "center", width: 220, height: 220, backgroundColor: "#fff", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff", position: "relative" },
  cornerTL: { position: "absolute", top: 10, left: 10, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: "#dc2626", borderTopLeftRadius: 10 },
  cornerTR: { position: "absolute", top: 10, right: 10, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: "#dc2626", borderTopRightRadius: 10 },
  cornerBL: { position: "absolute", bottom: 10, left: 10, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: "#dc2626", borderBottomLeftRadius: 10 },
  cornerBR: { position: "absolute", bottom: 10, right: 10, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: "#dc2626", borderBottomRightRadius: 10 },
  scannerLine: { position: "absolute", top: "50%", width: "80%", height: 2, backgroundColor: "#dc2626", shadowColor: "#dc2626", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  
  scannerHint: { textAlign: "center", color: "#94a8d8", fontSize: 13, marginTop: 20, paddingHorizontal: 20 },

  actionGroup: { gap: 14 },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: "#dc2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#dc2626", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  secondaryBtn: { height: 56, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e4ebff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  secondaryBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.8)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: "#fff", width: "100%", borderRadius: 24, padding: 30, alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginTop: 20, marginBottom: 8, textAlign: "center" },
  modalText: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22 },

  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  alertBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  alertMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  alertBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  alertBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});