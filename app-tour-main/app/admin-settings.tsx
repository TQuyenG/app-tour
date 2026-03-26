/**
 * app/admin-settings.tsx
 * Admin cấu hình hệ thống: thuế, chính sách, điều khoản, tính năng
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

interface SystemSettings {
  vatRate: string;
  cancelPolicyDays: string;
  cancelRefundPercent: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  appVersion: string;
  maintenanceMode: boolean;
  aiMatchingEnabled: boolean;
  flashSaleEnabled: boolean;
  reviewModEnabled: boolean;
  twoFARequired: boolean;
  maxGuestsPerBooking: string;
  minBookingDays: string;
  platformFeePercent: string;
  payoutSchedule: string;
  termsVersion: string;
  privacyVersion: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  vatRate: "8",
  cancelPolicyDays: "3",
  cancelRefundPercent: "80",
  supportEmail: "support@tourgo.vn",
  supportPhone: "1800 1234",
  supportHours: "08:00 - 22:00 hàng ngày",
  appVersion: "2.1.1",
  maintenanceMode: false,
  aiMatchingEnabled: true,
  flashSaleEnabled: true,
  reviewModEnabled: true,
  twoFARequired: false,
  maxGuestsPerBooking: "20",
  minBookingDays: "1",
  platformFeePercent: "2.5",
  payoutSchedule: "15",
  termsVersion: "3.2",
  privacyVersion: "2.1",
};

export default function AdminSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty]       = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@admin_settings").then(raw => {
      setSettings(raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS);
    }).catch(() => setSettings(DEFAULT_SETTINGS));
  }, []));

  const update = (key: keyof SystemSettings, val: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const saveAll = async () => {
    await AsyncStorage.setItem("@admin_settings", JSON.stringify(settings)).catch(() => {});
    setDirty(false);
    Alert.alert("✅ Đã lưu", "Cài đặt hệ thống đã được cập nhật.");
  };

  const resetDefaults = () => {
    Alert.alert("Khôi phục mặc định", "Đặt lại tất cả cài đặt về giá trị mặc định?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Khôi phục", style: "destructive",
        onPress: async () => {
          setSettings(DEFAULT_SETTINGS);
          await AsyncStorage.setItem("@admin_settings", JSON.stringify(DEFAULT_SETTINGS)).catch(() => {});
          setDirty(false);
          Alert.alert("✅ Đã khôi phục mặc định");
        },
      },
    ]);
  };

  const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <Ionicons name={icon as any} size={16} color="#4f7cff" />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );

  const InputRow = ({ label, settingKey, placeholder, suffix }: { label: string; settingKey: keyof SystemSettings; placeholder?: string; suffix?: string }) => (
    <View style={s.inputRow}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          value={String(settings[settingKey])}
          onChangeText={v => update(settingKey, v)}
          placeholder={placeholder}
          placeholderTextColor="#b0bdd8"
          keyboardType="default"
        />
        {suffix && <Text style={s.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );

  const ToggleRow = ({ label, desc, settingKey }: { label: string; desc: string; settingKey: keyof SystemSettings }) => (
    <View style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleDesc}>{desc}</Text>
      </View>
      <Switch
        value={Boolean(settings[settingKey])}
        onValueChange={v => update(settingKey, v)}
        trackColor={{ false: "#e4ebff", true: "#4f7cff" }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cài đặt hệ thống</Text>
        {dirty && (
          <View style={s.dirtyBadge}>
            <Text style={s.dirtyTxt}>Chưa lưu</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]}>

        {/* App info */}
        <View style={s.appInfoCard}>
          <Ionicons name="airplane" size={28} color="#4f7cff" />
          <View>
            <Text style={s.appName}>TourGo Platform</Text>
            <Text style={s.appVer}>v{settings.appVersion} · Production</Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: settings.maintenanceMode ? "#fee2e2" : "#dcfce7" }]}>
            <View style={[s.statusDot, { backgroundColor: settings.maintenanceMode ? "#dc2626" : "#16a34a" }]} />
            <Text style={[s.statusTxt, { color: settings.maintenanceMode ? "#dc2626" : "#16a34a" }]}>
              {settings.maintenanceMode ? "Bảo trì" : "Online"}
            </Text>
          </View>
        </View>

        {/* Tài chính */}
        <SectionHeader title="Tài chính & Thuế" icon="cash-outline" />
        <View style={s.card}>
          <InputRow label="Thuế VAT"          settingKey="vatRate"            suffix="%" placeholder="8" />
          <View style={s.divider} />
          <InputRow label="Phí nền tảng"      settingKey="platformFeePercent" suffix="%" placeholder="2.5" />
          <View style={s.divider} />
          <InputRow label="Chu kỳ giải ngân"  settingKey="payoutSchedule"    suffix="ngày" placeholder="15" />
        </View>

        {/* Chính sách hủy */}
        <SectionHeader title="Chính sách hủy tour" icon="refresh-outline" />
        <View style={s.card}>
          <InputRow label="Trước bao nhiêu ngày"    settingKey="cancelPolicyDays"    suffix="ngày" placeholder="3" />
          <View style={s.divider} />
          <InputRow label="Hoàn tiền tối đa"         settingKey="cancelRefundPercent" suffix="%" placeholder="80" />
        </View>

        {/* Booking */}
        <SectionHeader title="Quy định đặt tour" icon="calendar-outline" />
        <View style={s.card}>
          <InputRow label="Đặt trước tối thiểu"     settingKey="minBookingDays"      suffix="ngày" placeholder="1" />
          <View style={s.divider} />
          <InputRow label="Số khách tối đa/booking" settingKey="maxGuestsPerBooking" suffix="người" placeholder="20" />
        </View>

        {/* Hỗ trợ */}
        <SectionHeader title="Thông tin hỗ trợ" icon="headset-outline" />
        <View style={s.card}>
          <InputRow label="Email hỗ trợ"   settingKey="supportEmail" placeholder="support@tourgo.vn" />
          <View style={s.divider} />
          <InputRow label="Hotline"         settingKey="supportPhone" placeholder="1800 1234" />
          <View style={s.divider} />
          <InputRow label="Giờ làm việc"   settingKey="supportHours" placeholder="08:00 - 22:00" />
        </View>

        {/* Tính năng */}
        <SectionHeader title="Bật / Tắt tính năng" icon="toggle-outline" />
        <View style={s.card}>
          <ToggleRow label="AI Matching HDV"     desc="Gợi ý HDV thông minh theo sở thích"  settingKey="aiMatchingEnabled" />
          <View style={s.divider} />
          <ToggleRow label="Flash Sale"           desc="Cho phép tạo và hiển thị flash sale" settingKey="flashSaleEnabled" />
          <View style={s.divider} />
          <ToggleRow label="Kiểm duyệt Review"  desc="AI tự động lọc review spam"           settingKey="reviewModEnabled" />
          <View style={s.divider} />
          <ToggleRow label="Bắt buộc 2FA"        desc="Yêu cầu xác thực 2 lớp khi đăng nhập" settingKey="twoFARequired" />
          <View style={s.divider} />
          <ToggleRow label="Chế độ bảo trì"     desc="Tạm ngừng hoạt động để bảo trì"       settingKey="maintenanceMode" />
        </View>

        {/* Pháp lý */}
        <SectionHeader title="Phiên bản pháp lý" icon="document-text-outline" />
        <View style={s.card}>
          <InputRow label="Điều khoản dịch vụ"  settingKey="termsVersion"   placeholder="3.2" />
          <View style={s.divider} />
          <InputRow label="Chính sách riêng tư" settingKey="privacyVersion" placeholder="2.1" />
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.saveBtn} onPress={saveAll}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveBtnTxt}>Lưu tất cả thay đổi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.resetBtn} onPress={resetDefaults}>
          <Ionicons name="refresh-outline" size={16} color="#dc2626" />
          <Text style={s.resetBtnTxt}>Khôi phục mặc định</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdminTabBar role="admin" activeRoute="/admin-settings" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  dirtyBadge:    { backgroundColor: "#fef9c3", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dirtyTxt:      { color: "#d97706", fontWeight: "700", fontSize: 11 },
  content:       { padding: 16 },
  appInfoCard:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 18 },
  appName:       { color: "#1f2a58", fontWeight: "800", fontSize: 15 },
  appVer:        { color: "#7a8cc2", fontSize: 12, marginTop: 2 },
  statusPill:    { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginLeft: "auto" },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusTxt:     { fontSize: 11, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 },
  sectionIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  sectionTitle:  { color: "#1f2a58", fontWeight: "700", fontSize: 14 },
  card:          { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 16, overflow: "hidden" },
  divider:       { height: 1, backgroundColor: "#f0f4ff" },
  inputRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  inputLabel:    { color: "#1f2a58", fontWeight: "600", fontSize: 13, flex: 1 },
  inputWrap:     { flexDirection: "row", alignItems: "center", gap: 6 },
  input:         { width: 110, borderWidth: 1, borderColor: "#e4ebff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, textAlign: "right", color: "#1f2a58", fontWeight: "700", fontSize: 14 },
  inputSuffix:   { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  toggleRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  toggleLabel:   { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  toggleDesc:    { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  saveBtn:       { height: 52, borderRadius: 14, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  saveBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  resetBtn:      { height: 46, borderRadius: 14, borderWidth: 1, borderColor: "#fecaca", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff" },
  resetBtnTxt:   { color: "#dc2626", fontWeight: "700", fontSize: 14 },
});