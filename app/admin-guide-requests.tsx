/**
 * app/admin-guide-requests.tsx
 * Admin xét duyệt yêu cầu đăng ký HDV 
 * - Đọc Data 100% từ Local DB.
 * - Tự động tạo Profile cá nhân từ dữ liệu Khách nhập.
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminGuideRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [detail, setDetail] = useState<any | null>(null);
  
  const [rejectNote, setRejectNote] = useState("");
  const [rejectModal, setRejectModal] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState<{ visible: boolean; type: "approve" | "success" | "error"; title: string; message: string; }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const loadRequests = async () => {
    try {
      const raw = await AsyncStorage.getItem('@admin_guide_requests');
      if (raw) {
        setRequests(JSON.parse(raw));
      } else {
        setRequests([]); // Đảm bảo không có rác dữ liệu cứng
      }
    } catch (e) {
      setRequests([]);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      // 1. Cập nhật trạng thái Request trong DB
      const updatedReqs = requests.map(r => r.id === detail.id ? { ...r, status: 'approved' } : r);
      await AsyncStorage.setItem('@admin_guide_requests', JSON.stringify(updatedReqs));
      setRequests(updatedReqs);

      // 2. Đưa vào danh sách HDV công khai (@app_guides)
      const rawGuides = await AsyncStorage.getItem('@app_guides');
      const guides = rawGuides ? JSON.parse(rawGuides) : [];
      const newGuideId = `g_${detail.accountId}`;
      
      const newGuideData = {
        id: newGuideId, 
        name: detail.name, 
        location: detail.location, 
        experience: detail.experience,
        skills: detail.skills ? detail.skills.split(',').map((s:string)=>s.trim()) : [], 
        bio: detail.bio,
        rating: 5.0, 
        tours: 0, 
        verified: false
      };
      
      // Tránh trùng lặp nếu admin bấm duyệt 2 lần
      const existingIndex = guides.findIndex((g: any) => g.id === newGuideId);
      if (existingIndex >= 0) guides[existingIndex] = newGuideData;
      else guides.push(newGuideData);
      
      await AsyncStorage.setItem('@app_guides', JSON.stringify(guides));

      // 3. Cập nhật quyền Role vào tài khoản User
      const rawUsers = await AsyncStorage.getItem('@app_users');
      if (rawUsers) {
        const usersList = JSON.parse(rawUsers);
        const uIndex = usersList.findIndex((u: any) => u.accountId === detail.accountId);
        if (uIndex >= 0) {
          if (!usersList[uIndex].roles) usersList[uIndex].roles = [];
          if (!usersList[uIndex].roles.includes('guide')) usersList[uIndex].roles.push('guide');
          await AsyncStorage.setItem('@app_users', JSON.stringify(usersList));
        }
      }

      // Cập nhật session hiện tại nếu Admin đang dùng chung máy để test
      const rawSession = await AsyncStorage.getItem('@app_current_user');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session.accountId === detail.accountId) {
          if (!session.roles) session.roles = [];
          if (!session.roles.includes('guide')) session.roles.push('guide');
          await AsyncStorage.setItem('@app_current_user', JSON.stringify(session));
        }
      }

      // 4. Tạo sẵn Profile cá nhân cho HDV (Tránh HDV phải nhập lại)
      const rawLocalProfile = await AsyncStorage.getItem('@guide_profile');
      let currentGuideProfile = rawLocalProfile ? JSON.parse(rawLocalProfile) : {};
      
      // Ghi đè các thông tin HDV đã nhập ở form đăng ký
      currentGuideProfile = {
        ...currentGuideProfile,
        name: detail.name,
        phone: detail.phone || currentGuideProfile.phone || "",
        email: detail.email || currentGuideProfile.email || "",
        location: detail.location,
        experience: detail.experience,
        skills: detail.skills,
        bio: detail.bio,
        guideId: newGuideId,
        vneidVerified: false, 
      };
      await AsyncStorage.setItem("@guide_profile", JSON.stringify(currentGuideProfile));

      setConfirmPopup({ visible: true, type: "success", title: "Đã phê duyệt", message: `Hồ sơ của ${detail.name} đã được cấp quyền HDV.` });
      setDetail(null);
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể lưu dữ liệu vào hệ thống." });
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      const updatedReqs = requests.map(r => r.id === detail.id ? { ...r, status: 'rejected', adminNote: rejectNote } : r);
      await AsyncStorage.setItem('@admin_guide_requests', JSON.stringify(updatedReqs));
      setRequests(updatedReqs);
      
      setRejectModal(false);
      setDetail(null);
      setConfirmPopup({ visible: true, type: "success", title: "Đã từ chối", message: `Đã phản hồi từ chối đến ${detail.name}.` });
    } catch (e) {}
  };

  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Duyệt Hướng dẫn viên</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabBar}>
        {([
          { key: "pending", label: "Chờ duyệt" }, { key: "approved", label: "Đã duyệt" }, { key: "rejected", label: "Từ chối" }
        ] as const).map(t => (
          <TouchableOpacity key={t.key} style={[s.tabItem, filter === t.key && s.tabItemActive]} onPress={() => setFilter(t.key as any)}>
            <Text style={[s.tabTxt, filter === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.listContent}>
        {filtered.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={{ color: '#7a8cc2', fontWeight: "600" }}>Không có hồ sơ nào.</Text>
          </View>
        )}
        {filtered.map(req => (
          <View key={req.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.avatar}><Ionicons name="person" size={20} color="#4f7cff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{req.name}</Text>
                <Text style={s.date}>{new Date(req.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: req.status === "pending" ? "#fef3c7" : req.status === "approved" ? "#d1fae5" : "#fee2e2" }]}>
                <Text style={[s.statusTxt, { color: req.status === "pending" ? "#d97706" : req.status === "approved" ? "#059669" : "#dc2626" }]}>
                  {req.status === "pending" ? "Chờ duyệt" : req.status === "approved" ? "Đã duyệt" : "Từ chối"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.viewBtn} onPress={() => setDetail(req)}>
              <Text style={s.viewBtnTxt}>Xem chi tiết Hồ sơ</Text>
              <Ionicons name="chevron-forward" size={16} color="#4f7cff" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* CHI TIẾT HỒ SƠ */}
      <Modal visible={!!detail} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chi tiết Hồ sơ Ứng tuyển</Text>
              <TouchableOpacity onPress={() => setDetail(null)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {detail && (
                <>
                  <View style={s.detailBlock}>
                    <Text style={s.detailLabel}>Thông tin liên hệ</Text>
                    <Text style={s.detailVal}>Họ tên: {detail.name}</Text>
                    <Text style={s.detailVal}>SĐT: {detail.phone}</Text>
                    <Text style={s.detailVal}>Email: {detail.email}</Text>
                  </View>
                  <View style={s.detailBlock}>
                    <Text style={s.detailLabel}>Chuyên môn & Khu vực</Text>
                    <Text style={s.detailVal}>Khu vực: {detail.location}</Text>
                    <Text style={s.detailVal}>Kinh nghiệm: {detail.experience}</Text>
                    <Text style={s.detailVal}>Kỹ năng: {detail.skills}</Text>
                  </View>
                  <View style={s.detailBlock}>
                    <Text style={s.detailLabel}>Giới thiệu bản thân</Text>
                    <Text style={[s.detailVal, { fontStyle: "italic", color: "#475569" }]}>"{detail.bio}"</Text>
                  </View>
                  {detail.status === "pending" && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => setRejectModal(true)}>
                        <Ionicons name="close" size={18} color="#dc2626" /><Text style={s.rejectBtnTxt}>Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.approveBtn} onPress={() => setConfirmPopup({ visible: true, type: "approve", title: "Phê duyệt", message: `Cấp quyền HDV cho ${detail.name}?` })}>
                        <Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.approveBtnTxt}>Phê duyệt</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POPUPS */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.confirmOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Lý do từ chối</Text>
            <TextInput style={[s.input, { width: "100%", height: 80, textAlignVertical: "top", marginBottom: 16 }]} multiline placeholder="VD: Hồ sơ thiếu kinh nghiệm..." value={rejectNote} onChangeText={setRejectNote} />
            <View style={s.confirmActionRow}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setRejectModal(false)}><Text style={s.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={handleReject}><Text style={{color:"#fff", fontWeight:"800"}}>Từ chối</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <View style={[s.confirmIconWrap, { backgroundColor: confirmPopup.type === "success" ? "#d1fae5" : confirmPopup.type === "error" ? "#fee2e2" : "#eaf0ff" }]}><Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : confirmPopup.type === "error" ? "close-circle" : "help-circle"} size={32} color={confirmPopup.type === "success" ? "#10b981" : confirmPopup.type === "error" ? "#ef4444" : "#4f7cff"} /></View>
            <Text style={s.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={s.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "approve" ? (
              <View style={s.confirmActionRow}>
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({...confirmPopup, visible: false})}><Text style={s.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={[s.confirmSubmitBtn, { backgroundColor: "#10b981" }]} onPress={handleApprove}><Text style={{color:"#fff", fontWeight:"800"}}>Xác nhận</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({...confirmPopup, visible: false})}><Text style={s.confirmCancelBtnTxt}>Đóng</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-guide-requests" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  tabBar: { flexDirection: "row", paddingHorizontal: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "#4f7cff" },
  tabTxt: { fontSize: 13, fontWeight: "600", color: "#7a8cc2" },
  tabTxtActive: { color: "#4f7cff", fontWeight: "800" },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e4ebff" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff", paddingBottom: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  date: { fontSize: 12, color: "#94a8d8", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  viewBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: 12, borderRadius: 10 },
  viewBtnTxt: { color: "#4f7cff", fontWeight: "700", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  handle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  detailBlock: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  detailLabel: { fontSize: 12, fontWeight: "800", color: "#94a8d8", marginBottom: 6 },
  detailVal: { fontSize: 14, color: "#1f2a58", marginBottom: 4, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 40 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 50, borderRadius: 14, borderWidth: 1, borderColor: "#fecaca" },
  rejectBtnTxt: { color: "#dc2626", fontWeight: "800", fontSize: 15 },
  approveBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 50, borderRadius: 14, backgroundColor: "#10b981" },
  approveBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 13 },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "800" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});