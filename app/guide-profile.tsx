/**
 * app/guide-profile.tsx
 * Quản lý Hồ sơ HDV - Responsive toàn diện, Ảnh bìa tràn viền, Dữ liệu động
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image, ImageBackground, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity,
  useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@guide_profile";
const TOURS_STORAGE = "@app_tours";
const BOOKINGS_STORAGE = "@app_bookings_history";

interface GuideProfile {
  name: string; phone: string; email: string; location: string;
  experience: string; bio: string; skills: string;
  languages: string; certifications: string;
  bankAccount: string; bankName: string; guideId?: string;
  vneidVerified: boolean; cccd: string; dob: string; education: string;
  hobbies: string; awards: string; videoUrl: string;
  avatarUrl: string; coverUrl: string;
}

const DEFAULT_PROFILE: GuideProfile = {
  name: "Trần Minh Khoa", phone: "0987 654 321", email: "khoa.tm@localmate.vn",
  location: "Đà Lạt", experience: "3 năm",
  bio: "Chuyên tour săn mây và trải nghiệm cà phê đặc sản.",
  skills: "Chụp ảnh, Ẩm thực, Trekking", languages: "Việt, Anh",
  certifications: "Thẻ HDV quốc tế", bankAccount: "0123456789", bankName: "Vietcombank", guideId: "g1",
  vneidVerified: true, cccd: "079095123456", dob: "12/05/1995", education: "Đại học Văn Lang",
  hobbies: "Leo núi, Nhiếp ảnh, Đọc sách, Camping", 
  awards: "HDV Xuất sắc nhất năm 2024 (LocalMate)\nGiải Nhì Ảnh nghệ thuật Đà Lạt", 
  videoUrl: "https://www.youtube.com/watch?v=mock_video",
  avatarUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200",
  coverUrl: "https://images.unsplash.com/photo-1559586616-361e18714958?auto=format&fit=crop&q=80&w=800"
};

const MENU_ITEMS = [
  { icon: "calendar-outline", label: "Quản lý Booking", route: "/guide-booking-management", color: "#4f7cff" },
  { icon: "map-outline", label: "Tour của tôi", route: "/guide-tour-management", color: "#10b981" },
  { icon: "time-outline", label: "Lịch cá nhân", route: "/guide-schedule-management", color: "#d97706" },
  { icon: "grid-outline", label: "Quản lý Slots & Giá", route: "/guide-schedule-slots", color: "#8b5cf6" },
];

export default function GuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  // Tỷ lệ Responsive so với màn hình iPhone chuẩn (375px)
  const scale = width / 375;
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile, setProfile] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [form, setForm] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [stats, setStats] = useState({ tours: 0, bookings: 0, rating: "4.9" });
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState<{ visible: boolean; type: "success" | "error"; title: string; message: string; }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      let currentProfile = DEFAULT_PROFILE;
      const rawProfile = await AsyncStorage.getItem(STORAGE_KEY);
      if (rawProfile) {
        currentProfile = JSON.parse(rawProfile);
        setProfile(currentProfile);
        setForm(currentProfile);
      }

      // Tính toán thống kê động từ Local Storage
      const rawTours = await AsyncStorage.getItem(TOURS_STORAGE);
      const rawBookings = await AsyncStorage.getItem(BOOKINGS_STORAGE);
      let tCount = 0, bCount = 0;

      if (rawTours) {
        const toursList = JSON.parse(rawTours);
        tCount = toursList.filter((t: any) => t.assignedGuideNames?.includes(currentProfile.name)).length;
      }
      if (rawBookings) {
        const bookingsList = JSON.parse(rawBookings);
        bCount = bookingsList.length; // Demo: Đếm tổng booking có trong máy
      }
      setStats({ tours: tCount, bookings: bCount, rating: "4.9" });
    } catch (error) {}
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setConfirmPopup({visible:true, type:"error", title:"Lỗi", message:"Vui lòng điền họ tên!"}); return; }
    setProfile(form);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setModalVisible(false);
    setConfirmPopup({visible:true, type:"success", title:"Đã lưu", message:"Hồ sơ HDV đã được cập nhật thành công."});
  };

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* ẢNH BÌA TRÀN VIỀN */}
        <ImageBackground source={{ uri: profile.coverUrl }} style={[s.coverImage, { paddingTop: insets.top }]}>
          <View style={s.coverOverlay}>
            <Text style={s.headerTitle}>Hồ sơ của tôi</Text>
          </View>
        </ImageBackground>

        <View style={s.mainBody}>
          {/* PROFILE CARD */}
          <View style={s.profileCard}>
            <View style={s.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarTxt}>{profile.name.charAt(0)}</Text>
              )}
            </View>
            <View style={s.profileInfo}>
              <Text style={s.name}>{profile.name}</Text>
              <Text style={s.subInfo}><Ionicons name="location" size={12} /> {profile.location} · {profile.experience}</Text>
              <View style={s.badgesRow}>
                <View style={s.hdvBadge}><Ionicons name="shield-checkmark" size={12} color="#10b981" /><Text style={s.hdvBadgeTxt}>HDV Đã xác minh</Text></View>
                {profile.vneidVerified && (
                  <View style={[s.hdvBadge, { backgroundColor: "#eaf0ff" }]}><Ionicons name="checkmark-circle" size={12} color="#4f7cff" /><Text style={[s.hdvBadgeTxt, { color: "#4f7cff" }]}>VNeID</Text></View>
                )}
              </View>
            </View>
          </View>

          {/* VNEID CARD */}
          {profile.vneidVerified && (
            <View style={s.verificationCard}>
                <View style={s.verifyHeader}><Ionicons name="finger-print" size={16} color="#059669" /><Text style={s.verifyHeaderTxt}>ĐỊNH DANH ĐẢM BẢO</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Căn cước công dân:</Text><Text style={s.verifyValue}>{profile.cccd}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Ngày sinh:</Text><Text style={s.verifyValue}>{profile.dob}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Học vấn:</Text><Text style={s.verifyValue}>{profile.education}</Text></View>
            </View>
          )}

          {/* STATS CARD (Lấy từ Local) */}
          <View style={s.statsCard}>
            <View style={s.statItem}><Ionicons name="star" size={18} color="#f59e0b" /><Text style={s.statVal}>{stats.rating}</Text><Text style={s.statLbl}>Đánh giá</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="map" size={18} color="#4f7cff" /><Text style={s.statVal}>{stats.tours}</Text><Text style={s.statLbl}>Tour của tôi</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="calendar" size={18} color="#10b981" /><Text style={s.statVal}>{stats.bookings}</Text><Text style={s.statLbl}>Booking nhận</Text></View>
          </View>

          {/* EDIT BUTTON */}
          <TouchableOpacity style={s.editBtn} onPress={() => { setForm(profile); setModalVisible(true); }}>
            <Ionicons name="create-outline" size={18} color="#4f7cff" />
            <Text style={s.editBtnTxt}>Cập nhật Hồ sơ</Text>
          </TouchableOpacity>

          {/* INFO DETAILS */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Giới thiệu bản thân</Text>
            <Text style={s.bioTxt}>{profile.bio || "Chưa có giới thiệu."}</Text>
            
            <View style={s.skillBox}><Text style={s.skillTitle}>Kỹ năng chuyên môn</Text><Text style={s.skillContent}>{profile.skills}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Sở thích cá nhân</Text><Text style={s.skillContent}>{profile.hobbies}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Chứng nhận & Giải thưởng</Text><Text style={s.skillContent}>{profile.awards}</Text></View>
          </View>

          {/* CHỨC NĂNG RIÊNG DÀNH CHO HDV */}
          <Text style={s.sectionTitle}>Chức năng quản lý</Text>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={s.menuItem} onPress={() => router.push(item.route as any)}>
              <View style={[s.menuIcon, { backgroundColor: item.color + "15" }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
              <Text style={s.menuText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.logoutBtn} onPress={async () => { await AsyncStorage.removeItem("@current_user_role"); router.replace("/login"); }}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={s.logoutTxt}>Đăng xuất khỏi hệ thống</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL CẬP NHẬT HỒ SƠ */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[s.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Cập nhật Hồ sơ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              
              <Text style={s.inputLabel}>URL Ảnh đại diện</Text>
              <TextInput style={s.input} value={form.avatarUrl} onChangeText={(v) => setForm(p => ({ ...p, avatarUrl: v }))} placeholder="https://..." />
              
              <Text style={s.inputLabel}>URL Ảnh bìa (Cover)</Text>
              <TextInput style={s.input} value={form.coverUrl} onChangeText={(v) => setForm(p => ({ ...p, coverUrl: v }))} placeholder="https://..." />

              <Text style={[s.inputLabel, { color: "#059669", marginTop: 10 }]}>Thông tin định danh</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                 <View style={{ flex: 1 }}><TextInput style={s.input} value={form.cccd} onChangeText={(v) => setForm(p => ({ ...p, cccd: v }))} placeholder="Số CCCD" keyboardType="numeric" /></View>
                 <View style={{ flex: 1 }}><TextInput style={s.input} value={form.dob} onChangeText={(v) => setForm(p => ({ ...p, dob: v }))} placeholder="Ngày sinh" /></View>
              </View>
              <TextInput style={s.input} value={form.education} onChangeText={(v) => setForm(p => ({ ...p, education: v }))} placeholder="Trường học / Chuyên ngành..." />
              
              <View style={s.divider} />

              <Text style={s.inputLabel}>Họ và tên</Text>
              <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
              
              <Text style={s.inputLabel}>Giới thiệu (Kinh nghiệm, thế mạnh)</Text>
              <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={form.bio} onChangeText={(v) => setForm(p => ({ ...p, bio: v }))} />
              
              <Text style={s.inputLabel}>Kỹ năng</Text>
              <TextInput style={s.input} value={form.skills} onChangeText={(v) => setForm(p => ({ ...p, skills: v }))} />

              <Text style={s.inputLabel}>Sở thích cá nhân</Text>
              <TextInput style={s.input} value={form.hobbies} onChangeText={(v) => setForm(p => ({ ...p, hobbies: v }))} />

              <Text style={s.inputLabel}>Chứng nhận & Giải thưởng</Text>
              <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} multiline value={form.awards} onChangeText={(v) => setForm(p => ({ ...p, awards: v }))} />

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={s.saveBtnTxt}>Lưu Thay Đổi</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* POPUP THÔNG BÁO */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={48} color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"} />
            <Text style={s.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={s.confirmMessage}>{confirmPopup.message}</Text>
            <TouchableOpacity style={s.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={s.confirmSingleBtnTxt}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-profile" />
    </View>
  );
}

// BỘ STYLE RESPONSIVE (Dùng chung cho cả Public Profile)
export const getStyles = (scale: number) => {
  const sz = (size: number) => Math.round(size * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    coverImage: { width: "100%", height: sz(220), justifyContent: "flex-start", backgroundColor: "#1f2a58" },
    coverOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: sz(20), paddingTop: sz(10), flexDirection: "row", justifyContent: "space-between" },
    headerTitle: { color: "#fff", fontSize: sz(24), fontWeight: "900", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    
    mainBody: { paddingHorizontal: sz(16), marginTop: sz(-50) },
    profileCard: { backgroundColor: "#fff", borderRadius: sz(20), padding: sz(16), flexDirection: "row", alignItems: "center", gap: sz(14), marginBottom: sz(16), elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    avatarWrap: { width: sz(76), height: sz(76), borderRadius: sz(24), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", elevation: 2 },
    avatarImg: { width: "100%", height: "100%", borderRadius: sz(21) },
    avatarTxt: { color: "#fff", fontSize: sz(28), fontWeight: "900" },
    profileInfo: { flex: 1 },
    name: { color: "#1f2a58", fontWeight: "900", fontSize: sz(19), marginBottom: sz(4) },
    subInfo: { color: "#64748b", fontSize: sz(12), fontWeight: "600" },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: sz(6), marginTop: sz(8) },
    hdvBadge: { flexDirection: "row", alignItems: "center", gap: sz(4), backgroundColor: "#d1fae5", borderRadius: sz(8), paddingHorizontal: sz(8), paddingVertical: sz(4) },
    hdvBadgeTxt: { color: "#059669", fontSize: sz(10), fontWeight: "800" },
    
    verificationCard: { backgroundColor: "#d1fae5", borderRadius: sz(14), padding: sz(14), marginBottom: sz(16), borderWidth: 1, borderColor: "#a7f3d0" },
    verifyHeader: { flexDirection: "row", alignItems: "center", gap: sz(6), marginBottom: sz(8) },
    verifyHeaderTxt: { color: "#059669", fontWeight: "900", fontSize: sz(13) },
    verifyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: sz(4) },
    verifyLabel: { color: "#065f46", fontSize: sz(12) },
    verifyValue: { color: "#064e3b", fontSize: sz(12), fontWeight: "700" },
    
    statsCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: sz(16), paddingVertical: sz(16), marginBottom: sz(16), elevation: 2 },
    statItem: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, backgroundColor: "#f0f4ff" },
    statVal: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(4) },
    statLbl: { fontSize: sz(11), color: "#7a8cc2", marginTop: sz(2), fontWeight: "600" },
    
    editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(8), backgroundColor: "#fff", borderRadius: sz(14), paddingVertical: sz(14), marginBottom: sz(20), borderWidth: 1, borderColor: "#4f7cff" },
    editBtnTxt: { color: "#4f7cff", fontWeight: "800", fontSize: sz(14) },
    
    sectionTitle: { color: "#1f2a58", fontWeight: "900", fontSize: sz(16), marginBottom: sz(12), marginLeft: sz(4) },
    infoCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(16), marginBottom: sz(20), elevation: 1 },
    infoCardTitle: { color: "#1f2a58", fontWeight: "900", fontSize: sz(15), marginBottom: sz(8) },
    bioTxt: { color: "#475569", fontSize: sz(14), lineHeight: sz(24) },
    skillBox: { marginTop: sz(12), paddingTop: sz(12), borderTopWidth: 1, borderTopColor: "#f0f4ff" },
    skillTitle: { fontSize: sz(12), color: "#94a8d8", fontWeight: "800", marginBottom: sz(4) },
    skillContent: { fontSize: sz(14), color: "#1f2a58", fontWeight: "600", lineHeight: sz(22) },
    
    menuItem: { backgroundColor: "#fff", borderRadius: sz(14), padding: sz(14), flexDirection: "row", alignItems: "center", gap: sz(12), marginBottom: sz(10), elevation: 1 },
    menuIcon: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: "center", justifyContent: "center" },
    menuText: { color: "#1f2a58", fontWeight: "800", flex: 1, fontSize: sz(14) },
    logoutBtn: { borderRadius: sz(16), backgroundColor: "#fee2e2", padding: sz(16), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(10), marginTop: sz(10) },
    logoutTxt: { color: "#ef4444", fontWeight: "900", fontSize: sz(15) },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#fff", borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), maxHeight: "90%" },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: sz(20), borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
    modalTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58" },
    closeBtn: { width: sz(36), height: sz(36), borderRadius: sz(12), backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
    modalBody: { padding: sz(20) },
    inputLabel: { fontSize: sz(13), fontWeight: "800", color: "#1f2a58", marginBottom: sz(8), marginTop: sz(4) },
    input: { backgroundColor: "#f8fafc", borderRadius: sz(12), borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: sz(16), paddingVertical: sz(14), color: "#1f2a58", fontSize: sz(14), marginBottom: sz(12) },
    divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: sz(12) },
    saveBtn: { backgroundColor: "#4f7cff", borderRadius: sz(14), height: sz(54), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(8), marginTop: sz(10), marginBottom: sz(30) },
    saveBtnTxt: { color: "#fff", fontSize: sz(16), fontWeight: "900" },
    
    confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: sz(340), borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    confirmTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(16), marginBottom: sz(8), textAlign: "center" },
    confirmMessage: { fontSize: sz(14), color: "#64748b", textAlign: "center", marginBottom: sz(24), lineHeight: sz(22) },
    confirmSingleBtn: { width: "100%", height: sz(50), borderRadius: sz(14), backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
    confirmSingleBtnTxt: { color: "#1f2a58", fontSize: sz(15), fontWeight: "900" },
  });
};