/**
 * app/admin-settings.tsx
 * Admin cấu hình các tính năng lõi của Hệ thống
 * Tích hợp Custom Popup khi lưu cài đặt, Ẩn Header đen, Check an toàn
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
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_app_settings";

interface AppSettings {
  maintenanceMode: boolean;
  autoApproveReview: boolean;
  maxToursPerGuide: string;
  contactEmail: string;
  contactPhone: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  maintenanceMode: false,
  autoApproveReview: true,
  maxToursPerGuide: "5",
  contactEmail: "support@localmate.vn",
  contactPhone: "1900 1000",
};

export default function AdminSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "success" | "error"; title: string; message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(JSON.parse(raw) || DEFAULT_SETTINGS);
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) { setSettings(DEFAULT_SETTINGS); }
  };

  const handleSaveSettings = async () => {
    if (!settings.contactEmail || !settings.maxToursPerGuide) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Vui lòng không để trống các trường cấu hình." });
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Cấu hình hệ thống đã được lưu thành công và sẽ áp dụng ngay." });
    } catch (error) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi hệ thống", message: "Không thể lưu cấu hình lúc này." });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt Hệ thống</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Cấu hình Chung */}
          <Text style={styles.sectionTitle}>Tính năng cốt lõi</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Chế độ bảo trì (Bảo vệ App)</Text>
                <Text style={styles.settingDesc}>Khóa toàn bộ App đối với Khách và HDV.</Text>
              </View>
              <Switch
                trackColor={{ false: "#e4ebff", true: "#d1fae5" }}
                thumbColor={settings.maintenanceMode ? "#10b981" : "#fff"}
                onValueChange={(val) => setSettings(prev => ({ ...prev, maintenanceMode: val }))}
                value={settings.maintenanceMode}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Tự động duyệt Đánh giá</Text>
                <Text style={styles.settingDesc}>Hiển thị đánh giá tour ngay lập tức.</Text>
              </View>
              <Switch
                trackColor={{ false: "#e4ebff", true: "#eaf0ff" }}
                thumbColor={settings.autoApproveReview ? "#4f7cff" : "#fff"}
                onValueChange={(val) => setSettings(prev => ({ ...prev, autoApproveReview: val }))}
                value={settings.autoApproveReview}
              />
            </View>
          </View>

          {/* Cấu hình Giới hạn */}
          <Text style={styles.sectionTitle}>Giới hạn hệ thống</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Giới hạn Tour tối đa (mỗi HDV)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="briefcase-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} value={settings.maxToursPerGuide} keyboardType="numeric" onChangeText={(t) => setSettings(prev => ({ ...prev, maxToursPerGuide: t }))} />
              <Text style={styles.inputSuffix}>Tours</Text>
            </View>
          </View>

          {/* Liên hệ Support */}
          <Text style={styles.sectionTitle}>Trung tâm hỗ trợ (Dành cho Khách)</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Email CSKH</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} value={settings.contactEmail} onChangeText={(t) => setSettings(prev => ({ ...prev, contactEmail: t }))} />
            </View>
            
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Hotline CSKH</Text>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#94a8d8" style={styles.inputIcon} />
              <TextInput style={styles.input} value={settings.contactPhone} keyboardType="phone-pad" onChangeText={(t) => setSettings(prev => ({ ...prev, contactPhone: t }))} />
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings} activeOpacity={0.8}>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveBtnTxt}>Lưu Cài Đặt</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Confirm Popup */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, confirmPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }]}>
              <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={32} color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"} />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
              <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  content: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#94a8d8", marginBottom: 10, marginLeft: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  settingInfo: { flex: 1, paddingRight: 20 },
  settingLabel: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  settingDesc: { fontSize: 13, color: "#7a8cc2", lineHeight: 20 },
  divider: { height: 1, backgroundColor: "#f0f4ff", marginVertical: 8 },

  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: "#1f2a58", fontWeight: "600", height: "100%" },
  inputSuffix: { color: "#94a8d8", fontSize: 13, fontWeight: "700" },

  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

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