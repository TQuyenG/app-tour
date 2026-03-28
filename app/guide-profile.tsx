/**
 * app/guide-profile.tsx
 * Quản lý Hồ sơ HDV - Chuẩn UI/UX Xanh Royal
 * ĐÃ FIX LỖI CRASH: Xử lý an toàn khi currentUser bị null (Mock Data Fallback)
 */
import { GuideTabBar } from "@/components/GuideTabBar";
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

const STORAGE_KEY = "@guide_profile";

interface GuideProfile {
  name: string; phone: string; email: string; location: string;
  experience: string; bio: string; skills: string;
  languages: string; certifications: string;
  bankAccount: string; bankName: string; guideId?: string;
}

const DEFAULT_PROFILE: GuideProfile = {
  name: "Trần Minh Khoa", phone: "0987 654 321", email: "khoa.tm@localmate.vn",
  location: "Đà Lạt", experience: "3 năm",
  bio: "Chuyên tour săn mây và trải nghiệm cà phê đặc sản.",
  skills: "Chụp ảnh, Ẩm thực, Trekking", languages: "Việt, Anh",
  certifications: "Thẻ HDV quốc tế", bankAccount: "0123456789", bankName: "Vietcombank", guideId: "g1",
};

const MENU_ITEMS = [
  { icon: "calendar-outline",         label: "Quản lý Booking",       route: "/guide-booking-management", color: "#4f7cff" },
  { icon: "map-outline",              label: "Tour của tôi",           route: "/guide-tour-management",    color: "#10b981" },
  { icon: "time-outline",             label: "Lịch cá nhân",          route: "/guide-schedule-management",color: "#d97706" },
  { icon: "grid-outline",             label: "Quản lý Slots & Giá",  route: "/guide-schedule-slots",     color: "#8b5cf6" },
  { icon: "cash-outline",             label: "Thu nhập & Hoa hồng",  route: "/guide-earnings",           color: "#f59e0b" },
];

// MOCK USER Để chống lỗi Null
const MOCK_USER = {
  accountId: "acc_guide_1",
  guideId: "g1",
  activeRole: "guide",
  guideStatus: "active"
};

export default function GuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [form, setForm] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  
  // KHỞI TẠO STATE VỚI MOCK DATA ĐỂ CHỐNG CRASH RENDER
  const [currentUser, setCurrentUser] = useState<any>(MOCK_USER);
  
  const [pauseModal, setPauseModal] = useState(false);
  const [hideFromList, setHideFromList] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "switch" | "success" | "error"; title: string; message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) { const p = JSON.parse(raw); setProfile(p); setForm(p); } 
        else setForm(DEFAULT_PROFILE);
      }).catch(() => {});
      
      // Do chúng ta dùng Login giả lập, tạm thời bỏ qua hàm getCurrentUser từ Backend
      // Để nguyên MOCK_USER hoạt động
    }, []),
  );

  const handleSave = async () => {
    if (!form.name.trim()) { setConfirmPopup({visible:true, type:"error", title:"Lỗi", message:"Vui lòng điền họ tên!"}); return; }
    setProfile(form);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    
    setModalVisible(false);
    setConfirmPopup({visible:true, type:"success", title:"Đã lưu", message:"Hồ sơ HDV đã được cập nhật thành công."});
  };

  const handleSwitchToGuest = () => {
    setConfirmPopup({visible:true, type:"switch", title:"Đổi tài khoản", message:"Chuyển sang giao diện của Khách hàng?"});
  };

  const executeSwitch = async () => {
    // Cập nhật lại role ảo trong Storage để App hiểu đang là Khách
    await AsyncStorage.setItem("@current_user_role", "guest");
    setConfirmPopup({ ...confirmPopup, visible: false });
    setTimeout(() => {
      router.replace("/");
    }, 200);
  };

  const handlePause = async () => {
    const isBusy = currentUser?.guideStatus === "busy" || currentUser?.guideStatus === "paused";
    if (isBusy) {
      setCurrentUser({ ...currentUser, guideStatus: "active" });
      setConfirmPopup({visible:true, type:"success", title:"Kích hoạt", message:"Tài khoản HDV đã trực tuyến trở lại!"});
    } else {
      setPauseModal(true);
    }
  };

  const confirmPause = async () => {
    setCurrentUser({ ...currentUser, guideStatus: "paused" });
    setPauseModal(false);
    setConfirmPopup({visible:true, type:"success", title:"Tạm dừng", message: hideFromList ? "Bạn đã được ẩn khỏi danh sách tìm kiếm." : "Đã chuyển trạng thái sang Đang bận."});
  };

  // Check an toàn
  const isPaused = currentUser?.guideStatus === "paused" || currentUser?.guideStatus === "busy";

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f7ff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hồ sơ HDV</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{profile.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.subInfo}>{profile.location} · {profile.experience} kinh nghiệm</Text>
            <View style={styles.hdvBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10b981" />
              <Text style={styles.hdvBadgeTxt}>HDV Đã xác minh</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          {[
            { label: "Đánh giá", val: "4.9", icon: "star", color: "#f59e0b" },
            { label: "Tour xong", val: "134", icon: "map", color: "#4f7cff" },
            { label: "Booking", val: "2", icon: "calendar", color: "#10b981" },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.statItem, i < arr.length - 1 && styles.statBorder]}>
              <Ionicons name={item.icon as any} size={16} color={item.color} style={{ marginBottom: 4 }} />
              <Text style={[styles.statVal, { color: "#1f2a58" }]}>{item.val}</Text>
              <Text style={styles.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => { setForm(profile); setModalVisible(true); }}>
          <Ionicons name="create-outline" size={18} color="#4f7cff" />
          <Text style={styles.editBtnTxt}>Chỉnh sửa Hồ sơ</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Giới thiệu bản thân</Text>
          <Text style={styles.bioTxt}>{profile.bio || "Chưa có giới thiệu."}</Text>
        </View>

        <Text style={styles.sectionTitle}>Lối tắt tính năng</Text>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
          </TouchableOpacity>
        ))}

        <View style={styles.switchCard}>
          <Text style={styles.infoCardTitle}>Cài đặt tài khoản</Text>
          <TouchableOpacity style={[styles.switchRow, isPaused && { backgroundColor: "#fef3c7" }]} onPress={handlePause}>
            <View style={[styles.switchIcon, { backgroundColor: isPaused ? "#f59e0b" : "#eaf0ff" }]}>
              <Ionicons name={isPaused ? "play-circle" : "pause-circle"} size={22} color={isPaused ? "#fff" : "#4f7cff"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, isPaused && { color: "#d97706" }]}>
                {isPaused ? "Đang tạm dừng (Bật lại)" : "Tạm ngưng nhận Tour"}
              </Text>
              <Text style={styles.switchSub}>{isPaused ? "Tài khoản của bạn đang bị ẩn." : "Đánh dấu bận hoặc ẩn hồ sơ."}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchRow} onPress={handleSwitchToGuest}>
            <View style={[styles.switchIcon, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="swap-horizontal" size={22} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Chuyển sang chế độ Khách</Text>
              <Text style={styles.switchSub}>Đặt tour, tìm HDV khác</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.removeItem("@current_user_role");
          router.replace("/login");
        }}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutTxt}>Đăng xuất khỏi hệ thống</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật Hồ sơ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
              
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.input} value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm(p => ({ ...p, phone: v }))} />
              
              <Text style={styles.inputLabel}>Địa bàn hoạt động chính</Text>
              <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm(p => ({ ...p, location: v }))} />
              
              <Text style={styles.inputLabel}>Giới thiệu (Mô tả kỹ năng, thế mạnh)</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={form.bio} onChangeText={(v) => setForm(p => ({ ...p, bio: v }))} />
              
              <Text style={styles.inputLabel}>Thông tin Thanh toán (NH - STK)</Text>
              <View style={{flexDirection:"row", gap: 10}}>
                <TextInput style={[styles.input, {flex: 1}]} value={form.bankName} placeholder="Ngân hàng" onChangeText={(v) => setForm(p => ({ ...p, bankName: v }))} />
                <TextInput style={[styles.input, {flex: 2}]} value={form.bankAccount} keyboardType="numeric" placeholder="Số tài khoản" onChangeText={(v) => setForm(p => ({ ...p, bankAccount: v }))} />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu Thay Đổi</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Pause Option Modal */}
      <Modal visible={pauseModal} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="pause-circle" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.confirmTitle}>Tạm dừng nhận Tour</Text>
            <Text style={styles.confirmMessage}>Khách hàng sẽ thấy bạn ra sao?</Text>
            
            <TouchableOpacity style={[styles.pauseOpt, !hideFromList && styles.pauseOptActive]} onPress={() => setHideFromList(false)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pauseOptTxt}>Chỉ hiện "Đang bận"</Text>
                <Text style={styles.pauseOptSub}>Khách vẫn thấy Profile nhưng không thể đặt</Text>
              </View>
              {!hideFromList && <Ionicons name="checkmark-circle" size={20} color="#4f7cff" />}
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.pauseOpt, hideFromList && styles.pauseOptActive]} onPress={() => setHideFromList(true)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pauseOptTxt}>Ẩn hoàn toàn</Text>
                <Text style={styles.pauseOptSub}>Xóa tạm thời khỏi danh sách HDV</Text>
              </View>
              {hideFromList && <Ionicons name="checkmark-circle" size={20} color="#4f7cff" />}
            </TouchableOpacity>

            <View style={styles.confirmActionRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setPauseModal(false)}>
                <Text style={styles.confirmCancelBtnTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#f59e0b" }]} onPress={confirmPause}>
                <Text style={styles.confirmSubmitBtnTxt}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM POPUP CONFIRM GENERAL */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, confirmPopup.type === "switch" ? { backgroundColor: "#dcfce7" } : confirmPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }]}>
              <Ionicons name={confirmPopup.type === "switch" ? "swap-horizontal" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={32} color={confirmPopup.type === "switch" ? "#10b981" : confirmPopup.type === "success" ? "#10b981" : "#ef4444"} />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "switch" ? (
              <View style={styles.confirmActionRow}>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={styles.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#10b981" }]} onPress={executeSwitch}><Text style={styles.confirmSubmitBtnTxt}>Đổi ngay</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={styles.confirmSingleBtnTxt}>Đóng</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  headerTitle: { color: "#1f2a58", fontSize: 24, fontWeight: "900" },
  profileCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 24, fontWeight: "900" },
  profileInfo: { flex: 1 },
  name: { color: "#1f2a58", fontWeight: "800", fontSize: 18, marginBottom: 4 },
  subInfo: { color: "#7a8cc2", fontSize: 12 },
  hdvBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "#d1fae5", alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  hdvBadgeTxt: { color: "#059669", fontSize: 10, fontWeight: "800" },
  
  statsCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e4ebff" },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#f0f4ff" },
  statVal: { fontSize: 16, fontWeight: "900" },
  statLbl: { fontSize: 11, color: "#7a8cc2", marginTop: 4, fontWeight: "600" },
  
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: "#4f7cff" },
  editBtnTxt: { color: "#4f7cff", fontWeight: "800", fontSize: 14 },
  
  sectionTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 12, marginLeft: 4 },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e4ebff" },
  infoCardTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 8 },
  bioTxt: { color: "#64748b", fontSize: 13, lineHeight: 22 },
  
  menuItem: { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuText: { color: "#1f2a58", fontWeight: "700", flex: 1, fontSize: 14 },
  
  switchCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 20, marginTop: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderRadius: 12, paddingHorizontal: 10, marginBottom: 6 },
  switchIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  switchLabel: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  switchSub: { color: "#7a8cc2", fontSize: 12, marginTop: 2 },
  
  logoutBtn: { borderRadius: 16, backgroundColor: "#fee2e2", padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  logoutTxt: { color: "#ef4444", fontWeight: "800", fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14, marginBottom: 12 },
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  pauseOpt: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f8fafc", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  pauseOptActive: { borderColor: "#4f7cff", backgroundColor: "#eaf0ff" },
  pauseOptTxt: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  pauseOptSub: { color: "#7a8cc2", fontSize: 12, marginTop: 4 },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
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