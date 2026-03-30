/**
 * app/guest_vouchers.tsx
 * Kho voucher của khách: ĐÃ FIX LỌC NGHIÊM NGẶT THEO USER ĐANG ĐĂNG NHẬP
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Voucher {
  id: string; code: string; type: "fixed" | "percent";
  value: number; desc?: string; title?: string;
  used: boolean; source: "system" | "cskh" | "promo" | "loyalty";
  color: string; accountId?: string;
}

export default function GuestVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [customAlert, setCustomAlert] = useState<{visible: boolean, title: string, message: string, type: "success" | "error" | "info"}>({ visible: false, title: "", message: "", type: "info" });
  const [guestId, setGuestId] = useState("");

  const showAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const loadVouchers = async () => {
    const userRaw = await AsyncStorage.getItem("@app_current_user");
    if (!userRaw) return;
    const currentUser = JSON.parse(userRaw);
    const currentGuestId = currentUser.accountId;
    setGuestId(currentGuestId);

    let allVouchers: Voucher[] = [];

    // 1. Voucher tự thu thập (CHỈ HIỂN THỊ CỦA ACCOUNT ĐANG ĐĂNG NHẬP)
    const guestRaw = await AsyncStorage.getItem("@guest_vouchers");
    if (guestRaw) {
      const guestList = JSON.parse(guestRaw);
      guestList.filter((v: any) => v.accountId === currentGuestId).forEach((v: any) => {
        allVouchers.push({ 
            ...v, 
            value: Number(v.value || v.discountValue || 0), 
            used: !!v.used,
            source: v.source || 'promo' 
        });
      });
    }

    // 2. Quà tặng toàn hệ thống
    const adminRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
    if (adminRaw) {
      const adminList = JSON.parse(adminRaw);
      adminList.filter((v: any) => v.isGiftAll && v.status === "active").forEach((v: any) => {
        if (!allVouchers.find(ex => ex.code === v.code)) {
          allVouchers.push({
            id: v.id, code: v.code, type: v.type, value: Number(v.discountValue || v.value || 0),
            title: v.title, desc: "Quà tặng hệ thống", used: false, source: "system", color: v.color || "#2856d6", accountId: currentGuestId
          });
        }
      });
    }

    // 3. Quà CSKH tặng riêng
    const directRaw = await AsyncStorage.getItem("@direct_vouchers");
    if (directRaw) {
      const directList = JSON.parse(directRaw);
      directList.filter((v: any) => v.targetUserId === currentGuestId).forEach((v: any) => {
        if (!allVouchers.find(ex => ex.code === v.code)) {
          allVouchers.push({
            id: v.id, code: v.code, type: v.type, value: Number(v.value || v.discountValue || 0),
            title: "Mã CSKH / Đền bù", desc: v.reason, used: !!v.used, source: "cskh", color: "#f59e0b", accountId: currentGuestId
          });
        }
      });
    }
    setVouchers(allVouchers);
  };

  useFocusEffect(useCallback(() => { loadVouchers(); }, []));

  const formatValue = (val: number, type: string) => {
    if (type === "percent") return `${val}%`;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')}Tr`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `${val}đ`;
  };

  const getSourceLabel = (src: string) => {
    switch(src) {
        case 'system': return 'HỆ THỐNG';
        case 'loyalty': return 'ĐỔI ĐIỂM';
        case 'cskh': return 'QUÀ TẶNG';
        default: return 'KHUYẾN MÃI';
    }
  };

  const handleApplyCode = async () => {
    if (!promoCode.trim()) return showAlert("Thiếu thông tin", "Vui lòng nhập mã Voucher.", "error");
    const codeInput = promoCode.trim().toUpperCase();
    
    const adminRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
    const adminList = adminRaw ? JSON.parse(adminRaw) : [];
    const found = adminList.find((v: any) => v.code.toUpperCase() === codeInput && v.status === "active");

    if (!found) return showAlert("Lỗi", "Mã không tồn tại hoặc hết hạn.", "error");
    if (vouchers.find(v => v.code.toUpperCase() === codeInput)) return showAlert("Thông báo", "Bạn đã lưu mã này rồi.", "info");

    const guestRaw = await AsyncStorage.getItem("@guest_vouchers");
    const guestList = guestRaw ? JSON.parse(guestRaw) : [];
    
    // Gắn thêm accountId để phân biệt chủ sở hữu
    guestList.push({
      id: found.id + "_" + Date.now(), code: found.code, type: found.type,
      value: Number(found.discountValue || found.value || 0), title: found.title,
      desc: "Voucher đã thu thập", used: false, source: "promo", color: found.color || "#10b981",
      accountId: guestId
    });

    await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(guestList));
    setPromoCode("");
    showAlert("Thành công", "Đã thêm mã vào ví của bạn!", "success");
    loadVouchers();
  };

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    showAlert("Đã sao chép", `Mã: ${code}`, "success");
  };

  const displayedVouchers = vouchers.filter(v => activeTab === "active" ? !v.used : v.used);

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Modal visible={customAlert.visible} animationType="fade" transparent>
        <View style={s.alertOverlay}>
          <View style={s.alertBox}>
            <View style={[s.alertIconWrap, { backgroundColor: customAlert.type === "error" ? "#fee2e2" : customAlert.type === "success" ? "#dcfce7" : "#e0f2fe" }]}>
              <Ionicons name={customAlert.type === "error" ? "warning" : customAlert.type === "success" ? "checkmark-circle" : "information-circle"} size={32} color={customAlert.type === "error" ? "#dc2626" : customAlert.type === "success" ? "#16a34a" : "#0284c7"} />
            </View>
            <Text style={s.alertTitle}>{customAlert.title}</Text>
            <Text style={s.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity style={s.alertBtn} onPress={() => setCustomAlert({ ...customAlert, visible: false })}><Text style={s.alertBtnTxt}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Ví Voucher</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.inputContainer}>
        <View style={s.inputBox}>
          <Ionicons name="ticket-outline" size={20} color="#7a8cc2" />
          <TextInput style={s.input} placeholder="Nhập mã voucher..." value={promoCode} onChangeText={setPromoCode} placeholderTextColor="#94a8d8" autoCapitalize="characters" />
        </View>
        <TouchableOpacity style={s.applyBtn} onPress={handleApplyCode}><Text style={s.applyBtnTxt}>Lưu mã</Text></TouchableOpacity>
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabBtn, activeTab === "active" && s.tabActive]} onPress={() => setActiveTab("active")}><Text style={[s.tabTxt, activeTab === "active" && s.tabTxtActive]}>Sẵn sàng dùng</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, activeTab === "history" && s.tabActive]} onPress={() => setActiveTab("history")}><Text style={[s.tabTxt, activeTab === "history" && s.tabTxtActive]}>Lịch sử dùng</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {displayedVouchers.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name={activeTab === "active" ? "sad-outline" : "receipt-outline"} size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>{activeTab === "active" ? "Không có mã khả dụng" : "Chưa có lịch sử"}</Text>
          </View>
        ) : (
          displayedVouchers.map(v => (
            <View key={v.id} style={[s.card, v.used && { opacity: 0.8 }]}>
              <View style={[s.cardLeft, { backgroundColor: v.used ? "#94a8d8" : v.color }]}>
                <Text style={s.valTxt} numberOfLines={1} adjustsFontSizeToFit>{formatValue(v.value, v.type)}</Text>
                <Text style={s.typeTxt}>{v.type === "percent" ? "GIẢM GIÁ" : "TIỀN MẶT"}</Text>
              </View>
              <View style={s.cardRight}>
                <View style={s.cardTop}>
                  <Text style={s.titleTxt} numberOfLines={1}>{v.title}</Text>
                  <View style={[s.srcBadge, { backgroundColor: v.used ? '#f1f5f9' : '#eaf0ff' }]}>
                    <Text style={[s.srcTxt, { color: v.used ? '#94a8d8' : '#2856d6' }]}>{getSourceLabel(v.source)}</Text>
                  </View>
                </View>
                <Text style={s.voucherDesc} numberOfLines={2}>{v.desc}</Text>
                
                <View style={s.cardBottom}>
                  <View style={s.codeRow}>
                    <Ionicons name="qr-code-outline" size={14} color="#7a8cc2" />
                    <Text style={s.code}>{v.code}</Text>
                  </View>
                  {!v.used ? (
                    <TouchableOpacity style={s.copyBtn} onPress={() => copyToClipboard(v.code)}>
                      <Ionicons name="copy-outline" size={14} color="#2856d6" />
                      <Text style={s.copyBtnTxt}>Copy</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.usedBadgeRow}>
                        <Ionicons name="checkmark-done-circle" size={14} color="#10b981" />
                        <Text style={s.usedLabel}>Đã sử dụng</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    header: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingBottom: sz(16), borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
    backBtn: { padding: sz(8), backgroundColor: "#f3f7ff", borderRadius: sz(12) },
    headerTitle: { flex: 1, textAlign: "center", fontSize: sz(18), fontWeight: "800", color: "#1f2a58" },
    inputContainer: { flexDirection: "row", padding: sz(16), gap: sz(10), backgroundColor: "#fff" },
    inputBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f3f7ff", borderRadius: sz(12), paddingHorizontal: sz(14), borderWidth: 1, borderColor: "#e4ebff" },
    input: { flex: 1, height: sz(48), marginLeft: sz(10), fontSize: sz(14), color: "#1f2a58", fontWeight: "700" },
    applyBtn: { backgroundColor: "#2856d6", justifyContent: "center", paddingHorizontal: sz(16), borderRadius: sz(12) },
    applyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: sz(14) },
    tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingBottom: sz(12), borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
    tabBtn: { flex: 1, paddingVertical: sz(10), alignItems: "center", borderRadius: sz(8) },
    tabActive: { backgroundColor: "#eaf0ff" },
    tabTxt: { fontSize: sz(14), fontWeight: "600", color: "#7a8cc2" },
    tabTxtActive: { color: "#2856d6", fontWeight: "800" },
    list: { padding: sz(16), paddingBottom: sz(50) },
    emptyBox: { alignItems: "center", justifyContent: "center", marginTop: sz(60), gap: sz(12) },
    emptyTxt: { color: "#7a8cc2", fontSize: sz(14), fontWeight: "600" },
    card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: sz(16), marginBottom: sz(14), elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: sz(4) }, shadowOpacity: 0.05, shadowRadius: sz(10), overflow: "hidden" },
    cardLeft: { width: sz(95), justifyContent: "center", alignItems: "center", padding: sz(10), borderRightWidth: 1, borderRightColor: "#e4ebff", borderStyle: "dashed" },
    valTxt: { color: "#fff", fontSize: sz(22), fontWeight: "900" },
    typeTxt: { color: "rgba(255,255,255,0.8)", fontSize: sz(9), fontWeight: "800", marginTop: sz(4) },
    cardRight: { flex: 1, padding: sz(14), justifyContent: "center" },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: sz(6), gap: sz(4) },
    titleTxt: { fontWeight: "800", color: "#1f2a58", fontSize: sz(14), flex: 1 },
    srcBadge: { borderRadius: sz(6), paddingHorizontal: sz(8), paddingVertical: sz(3) },
    srcTxt: { fontSize: sz(9), fontWeight: "800" },
    voucherDesc: { color: "#5f73a9", fontSize: sz(12), lineHeight: sz(18), marginBottom: sz(8) },
    cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: sz(4) },
    codeRow: { flexDirection: "row", alignItems: "center", gap: sz(6) },
    code: { color: "#1f2a58", fontWeight: "800", fontSize: sz(14), letterSpacing: 1 },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: sz(4), backgroundColor: "#eaf0ff", paddingHorizontal: sz(12), paddingVertical: sz(6), borderRadius: sz(8) },
    copyBtnTxt: { color: "#2856d6", fontSize: sz(12), fontWeight: "700" },
    usedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    usedLabel: { color: "#10b981", fontSize: sz(12), fontWeight: "700" },
    alertOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "center", alignItems: "center", padding: sz(24) },
    alertBox: { backgroundColor: "#fff", width: "100%", borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
    alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    alertTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
    alertMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
    alertBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
    alertBtnTxt: { color: "#1f2a58", fontSize: sz(15), fontWeight: "700" }
  });
};