/**
 * app/staff-voucher-management.tsx
 * FIX:
 * 1. Import AsyncStorage → @/constants/storage-helper (đồng bộ với guest_vouchers.tsx)
 * 2. Giới hạn tặng voucher: tối đa 1 voucher/template/khách (có thể config)
 * 3. Hiển thị đã tặng bao nhiêu lần trong lịch sử
 */
import { StaffTabBar } from "@/components/StaffTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; // ✅ FIX: đồng bộ với guest_vouchers.tsx
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Giới hạn số lần tặng mỗi template cho 1 khách
const MAX_SEND_PER_USER = 2;

const VOUCHER_TEMPLATES = [
  { label: "Bồi thường 50k",     sublabel: "Sự cố nhỏ",          value: 50000,  type: "fixed"   as const, reason: "Xin lỗi vì sự cố nhỏ",   icon: "ribbon-outline",   color: "#94a3b8" },
  { label: "Bồi thường 100k",    sublabel: "HDV trễ / thiếu",    value: 100000, type: "fixed"   as const, reason: "Bồi thường HDV đến trễ",  icon: "alert-circle",     color: "#f59e0b" },
  { label: "Giảm 10% Tour",      sublabel: "Khách phàn nàn",     value: 10,     type: "percent" as const, reason: "Mã giảm giá chăm sóc",    icon: "pricetag-outline", color: "#2856d6" },
  { label: "Bồi thường 500k",    sublabel: "Sự cố nghiêm trọng", value: 500000, type: "fixed"   as const, reason: "Sự cố nghiêm trọng",      icon: "warning",          color: "#dc2626" },
];

export default function StaffVoucherManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"system" | "direct">("system");

  const [customAlert, setCustomAlert] = useState<{visible: boolean, title: string, message: string, type: "success" | "error" | "info"}>({ visible: false, title: "", message: "", type: "info" });
  const showAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const [systemVouchers, setSystemVouchers] = useState<any[]>([]);
  const [directVouchers, setDirectVouchers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      const sysRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      setSystemVouchers(sysRaw ? JSON.parse(sysRaw).filter((v: any) => v.status === "active") : []);
      const dirRaw = await AsyncStorage.getItem("@direct_vouchers");
      setDirectVouchers(dirRaw ? JSON.parse(dirRaw) : []);
      const accRaw = await AsyncStorage.getItem("@app_accounts");
      if (accRaw) setUsers(JSON.parse(accRaw).filter((u: any) => u.roles?.includes("guest")));
    };
    loadData();
  }, []));

  const handleSendDirect = async () => {
    if (!selectedUser || !selectedTemplate) {
      return showAlert("Thiếu thông tin", "Vui lòng chọn khách hàng và mức bồi thường!", "error");
    }

    // ✅ KIỂM TRA GIỚI HẠN: đếm số lần đã tặng template này cho user này
    const alreadySent = directVouchers.filter(
      v => v.targetUserId === selectedUser.id && v.templateLabel === selectedTemplate.label
    ).length;

    if (alreadySent >= MAX_SEND_PER_USER) {
      return showAlert(
        "Đã đạt giới hạn",
        `Bạn đã tặng "${selectedTemplate.label}" cho ${selectedUser.name} ${alreadySent}/${MAX_SEND_PER_USER} lần. Không thể tặng thêm.`,
        "error"
      );
    }

    const newVoucher = {
      id: Date.now().toString(),
      code: `CSKH${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      value: selectedTemplate.value,
      type: selectedTemplate.type,
      templateLabel: selectedTemplate.label, // ✅ Lưu để kiểm tra giới hạn sau này
      targetUserId: selectedUser.id,
      targetUserName: selectedUser.name,
      targetUserPhone: selectedUser.phone,
      reason: customReason || selectedTemplate.reason,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      used: false,
    };

    const updated = [newVoucher, ...directVouchers];
    setDirectVouchers(updated);
    await AsyncStorage.setItem("@direct_vouchers", JSON.stringify(updated));
    setSelectedUser(null); setSelectedTemplate(null); setCustomReason("");
    showAlert("Thành công", `Đã gửi "${selectedTemplate.label}" cho ${selectedUser.name}. (Lần ${alreadySent + 1}/${MAX_SEND_PER_USER})`, "success");
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch)
  );

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} animationType="fade" transparent>
        <View style={s.alertOverlay}>
          <View style={s.alertBox}>
            <View style={[s.alertIconWrap, {
              backgroundColor: customAlert.type === "error" ? "#fee2e2" : customAlert.type === "success" ? "#dcfce7" : "#e0f2fe"
            }]}>
              <Ionicons
                name={customAlert.type === "error" ? "warning" : customAlert.type === "success" ? "checkmark-circle" : "information-circle"}
                size={32}
                color={customAlert.type === "error" ? "#dc2626" : customAlert.type === "success" ? "#16a34a" : "#0284c7"}
              />
            </View>
            <Text style={s.alertTitle}>{customAlert.title}</Text>
            <Text style={s.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity style={s.alertBtn} onPress={() => setCustomAlert({ ...customAlert, visible: false })}>
              <Text style={s.alertBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal User Selection */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={s.userModalOverlay}>
          <View style={s.sheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chọn Khách hàng</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <TextInput style={s.input} placeholder="Tìm tên hoặc SĐT..." value={userSearch} onChangeText={setUserSearch} />
              <FlatList
                data={filteredUsers}
                keyExtractor={item => item.id}
                style={{ maxHeight: 400, marginTop: 10 }}
                renderItem={({ item }) => {
                  // Hiển thị số lần đã tặng cho từng template nếu có selectedTemplate
                  const sentCount = selectedTemplate
                    ? directVouchers.filter(v => v.targetUserId === item.id && v.templateLabel === selectedTemplate.label).length
                    : 0;
                  return (
                    <TouchableOpacity style={s.userItem} onPress={() => { setSelectedUser(item); setShowUserModal(false); }}>
                      <View style={s.userAvatar}><Ionicons name="person" size={18} color="#2856d6" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userName}>{item.name}</Text>
                        <Text style={s.userPhone}>{item.phone || item.email}</Text>
                      </View>
                      {selectedTemplate && sentCount > 0 && (
                        <View style={{ backgroundColor: sentCount >= MAX_SEND_PER_USER ? '#fee2e2' : '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: sentCount >= MAX_SEND_PER_USER ? '#dc2626' : '#d97706' }}>
                            {sentCount >= MAX_SEND_PER_USER ? 'Hết lượt' : `${sentCount}/${MAX_SEND_PER_USER}`}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/staff-home" as any)} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Voucher</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabBtn, activeTab === "system" && s.tabActive]} onPress={() => setActiveTab("system")}>
          <Text style={[s.tabTxt, activeTab === "system" && s.tabTxtActive]}>Mã Hệ thống</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, activeTab === "direct" && s.tabActive]} onPress={() => setActiveTab("direct")}>
          <Text style={[s.tabTxt, activeTab === "direct" && s.tabTxtActive]}>Tặng cá nhân</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "system" ? (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {systemVouchers.length === 0 ? (
            <Text style={s.emptyTxt}>Chưa có mã hệ thống nào.</Text>
          ) : systemVouchers.map(v => (
            <View key={v.id} style={s.sysCard}>
              <View style={s.sysCardTop}>
                <Text style={s.sysTitle}>{v.title}</Text>
                <View style={[s.sysBadge, { backgroundColor: v.color }]}>
                  <Text style={s.sysBadgeTxt}>{v.code}</Text>
                </View>
              </View>
              <Text style={s.sysSub}>Giảm {v.type === "percent" ? v.discountValue + "%" : v.discountValue.toLocaleString() + "đ"} {v.maxDiscount > 0 ? `(Tối đa ${v.maxDiscount.toLocaleString()}đ)` : ""}</Text>
              <Text style={s.sysSubMin}>Đơn tối thiểu: {v.minOrderValue > 0 ? v.minOrderValue.toLocaleString() + "đ" : "0đ"}</Text>
              {v.group === "loyalty" && (
                <View style={s.pointsBox}>
                  <Ionicons name="star" size={14} color="#d97706" />
                  <Text style={s.pointsTxt}>Đổi bằng: {v.pointsCost} điểm</Text>
                </View>
              )}
              <View style={s.usageBar}>
                <View style={[s.usageFill, { width: `${Math.min((v.usedCount / v.usageLimit) * 100, 100)}%`, backgroundColor: v.color }]} />
              </View>
              <Text style={s.sysUsage}>Đã dùng: {v.usedCount} / {v.usageLimit}</Text>
            </View>
          ))}
          <Text style={{ textAlign: "center", color: "#7a8cc2", marginTop: 20, fontSize: 12 }}>* Tính năng chỉnh sửa mã hệ thống chỉ dành cho Admin.</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <View style={s.formCard}>
            <Text style={s.sectionTitle}>1. Chọn Mức Bồi Thường</Text>
            <View style={s.templateGrid}>
              {VOUCHER_TEMPLATES.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.templateCard, selectedTemplate?.label === t.label && { borderColor: t.color, backgroundColor: t.color + "10" }]}
                  onPress={() => setSelectedTemplate(t)}
                >
                  <Ionicons name={t.icon as any} size={24} color={t.color} />
                  <Text style={s.tLabel}>{t.label}</Text>
                  <Text style={s.tSub}>{t.sublabel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.sectionTitle, { marginTop: 16 }]}>2. Chọn Khách hàng nhận</Text>
            <TouchableOpacity style={s.selectUserBtn} onPress={() => setShowUserModal(true)}>
              {selectedUser ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  <Text style={{ color: "#1f2a58", fontWeight: "700" }}>{selectedUser.name} - {selectedUser.phone}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="person-add-outline" size={20} color="#7a8cc2" />
                  <Text style={{ color: "#7a8cc2" }}>Bấm để chọn khách hàng...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Hiển thị số lần đã tặng template này cho user đã chọn */}
            {selectedUser && selectedTemplate && (() => {
              const count = directVouchers.filter(
                v => v.targetUserId === selectedUser.id && v.templateLabel === selectedTemplate.label
              ).length;
              return count > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 10, backgroundColor: count >= MAX_SEND_PER_USER ? '#fef2f2' : '#fffbeb', borderRadius: 10 }}>
                  <Ionicons name={count >= MAX_SEND_PER_USER ? "warning" : "information-circle"} size={16} color={count >= MAX_SEND_PER_USER ? "#dc2626" : "#d97706"} />
                  <Text style={{ fontSize: 13, color: count >= MAX_SEND_PER_USER ? "#dc2626" : "#d97706", fontWeight: '700' }}>
                    {count >= MAX_SEND_PER_USER
                      ? `Đã hết lượt tặng (${count}/${MAX_SEND_PER_USER})`
                      : `Đã tặng ${count}/${MAX_SEND_PER_USER} lần`}
                  </Text>
                </View>
              ) : null;
            })()}

            <TextInput style={s.reasonInput} placeholder="Ghi chú thêm (Tùy chọn)..." value={customReason} onChangeText={setCustomReason} multiline />
            <TouchableOpacity
              style={[s.submitBtn, (!selectedUser || !selectedTemplate) && { opacity: 0.5 }]}
              onPress={handleSendDirect}
            >
              <Text style={s.submitTxt}>Tạo & Gửi Voucher Cho Khách</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.sectionTitle, { marginLeft: 4, marginTop: 10 }]}>Lịch sử tặng cá nhân</Text>
          {directVouchers.length === 0 && <Text style={s.emptyTxt}>Chưa có lịch sử tặng voucher.</Text>}
          {directVouchers.map(v => (
            <View key={v.id} style={s.historyCard}>
              <View style={s.historyHeader}>
                <Text style={s.voucherCode}>{v.code}</Text>
                <View style={[s.usedBadge, { backgroundColor: v.used ? "#fef9c3" : "#dcfce7" }]}>
                  <Text style={[s.usedTxt, { color: v.used ? "#d97706" : "#16a34a" }]}>{v.used ? "Đã dùng" : "Chưa dùng"}</Text>
                </View>
              </View>
              <Text style={s.historyGuest}>Tặng: <Text style={{ fontWeight: "700", color: "#1f2a58" }}>{v.targetUserName}</Text> ({v.targetUserPhone})</Text>
              {v.reason ? <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Lý do: {v.reason}</Text> : null}
              <View style={s.historyBottom}>
                <Text style={s.historyVal}>{v.type === "fixed" ? v.value.toLocaleString("vi-VN") + "đ" : v.value + "%"}</Text>
                <Text style={s.historyDate}>{v.createdAt}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <StaffTabBar activeRoute="/staff-voucher-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: "center" },
  tabContainer: { flexDirection: "row", backgroundColor: "#fff", padding: 8, marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#eaf0ff" },
  tabTxt: { fontSize: 14, fontWeight: "600", color: "#7a8cc2" },
  tabTxtActive: { color: "#2856d6", fontWeight: "800" },
  list: { padding: 16, paddingBottom: 100 },
  emptyTxt: { textAlign: "center", color: "#7a8cc2", marginTop: 20 },
  sysCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e4ebff" },
  sysCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sysTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", flex: 1, paddingRight: 10 },
  sysBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  sysBadgeTxt: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 1 },
  sysSub: { fontSize: 13, color: "#1f2a58", fontWeight: "700", marginBottom: 2 },
  sysSubMin: { fontSize: 12, color: "#7a8cc2", marginBottom: 10 },
  pointsBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef9c3", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  pointsTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  usageBar: { height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  usageFill: { height: "100%", borderRadius: 3 },
  sysUsage: { fontSize: 11, color: "#94a3b8", fontWeight: "600", textAlign: "right", marginBottom: 12 },
  formCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e4ebff" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1f2a58", marginBottom: 10 },
  selectUserBtn: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 14 },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  templateCard: { width: "48%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 12, alignItems: "center", gap: 6 },
  tLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", textAlign: "center" },
  tSub: { fontSize: 10, color: "#7a8cc2", textAlign: "center" },
  reasonInput: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 14, fontSize: 14, marginTop: 16, minHeight: 70, textAlignVertical: "top" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f59e0b", paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  submitTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  historyCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  voucherCode: { color: "#f59e0b", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  usedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  usedTxt: { fontSize: 10, fontWeight: "700" },
  historyGuest: { color: "#5f73a9", fontSize: 13, marginBottom: 4 },
  historyBottom: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  historyVal: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  historyDate: { color: "#94a8d8", fontSize: 11 },
  userModalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: { backgroundColor: "#fff", borderRadius: 24, width: "100%", maxHeight: "80%", overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  input: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, fontSize: 14, color: "#1f2a58" },
  userItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  userPhone: { fontSize: 12, color: "#7a8cc2", marginTop: 2 },
  alertOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  alertBox: { backgroundColor: "#fff", width: "100%", borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  alertMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  alertBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  alertBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "700" },
});