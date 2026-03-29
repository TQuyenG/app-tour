/**
 * app/guide-profile.tsx
 * Quản lý Hồ sơ HDV - Đã chuyển Học vấn, Bằng cấp sang luồng Onboarding
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image, ImageBackground, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity,
  useWindowDimensions, View, Alert, Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HOBBIES_LIST = ["Leo núi", "Chụp ảnh", "Ẩm thực", "Lặn biển", "Đạp xe", "Lịch sử", "Nghệ thuật", "Cắm trại"];
const LANGUAGES_LIST = ["Tiếng Việt", "Tiếng Anh", "Tiếng Trung", "Tiếng Nhật", "Tiếng Hàn", "Tiếng Pháp"];

interface GuideProfile {
  name: string; phone: string; email: string; location: string;
  experience: string; bio: string; skills: string;
  languages: string[]; certifications: string;
  bankAccount: string; bankName: string; guideId?: string;
  vneidVerified: boolean; isLocal: boolean; cccd: string; dob: string; education: string;
  hobbies: string[]; awards: string; videoUrl: string;
  avatarUrl: string; coverUrl: string; galleryUrls: string[]; rating?: string; tours?: number;
}

const DEFAULT_PROFILE: GuideProfile = {
  name: "Hướng dẫn viên", phone: "", email: "", location: "",
  experience: "", bio: "", skills: "", languages: [], certifications: "",
  bankAccount: "", bankName: "", guideId: "",
  vneidVerified: false, isLocal: false, cccd: "", dob: "", education: "",
  hobbies: [], awards: "", videoUrl: "",
  avatarUrl: "", coverUrl: "", galleryUrls: [], rating: "5.0", tours: 0
};

export default function GuideProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile, setProfile] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [form, setForm] = useState<GuideProfile>(DEFAULT_PROFILE);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [uploadModal, setUploadModal] = useState<{visible: boolean, type: 'avatar' | 'cover' | 'video' | 'gallery'}>({visible: false, type: 'avatar'});
  const [mediaUrl, setMediaUrl] = useState('');
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '' });

  useFocusEffect(useCallback(() => {
    const loadProfile = async () => {
      const raw = await AsyncStorage.getItem("@guide_profile");
      if (raw) {
        const p = JSON.parse(raw);
        const formatted = {
          ...DEFAULT_PROFILE, ...p,
          hobbies: Array.isArray(p.hobbies) ? p.hobbies : (p.hobbies ? p.hobbies.split(',').map((x:string)=>x.trim()) : []),
          languages: Array.isArray(p.languages) ? p.languages : (p.languages ? p.languages.split(',').map((x:string)=>x.trim()) : []),
          galleryUrls: Array.isArray(p.galleryUrls) ? p.galleryUrls : []
        };
        setProfile(formatted); setForm(formatted);
      }
    };
    loadProfile();
  }, []));

  const handleLogout = async () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem('@current_user_role');
          router.replace('/login' as any);
        }
      }
    ]);
  };

  const handleSwitchToGuest = async () => {
    await AsyncStorage.setItem('@current_user_role', 'guest');
    router.replace('/' as any);
  };

  const setField = (key: keyof GuideProfile, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleArray = (field: 'hobbies' | 'languages', val: string) => {
    setForm(prev => {
      const arr = prev[field] || [];
      if (arr.includes(val)) return { ...prev, [field]: arr.filter(x => x !== val) };
      return { ...prev, [field]: [...arr, val] };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert("Lỗi", "Vui lòng nhập họ tên."); return; }
    setSaving(true);
    try {
      await AsyncStorage.setItem("@guide_profile", JSON.stringify(form));
      const rawGuides = await AsyncStorage.getItem("@app_guides");
      const list = rawGuides ? JSON.parse(rawGuides) : [];
      const updatedList = list.map((g: any) => g.id === form.guideId ? { ...g, ...form } : g);
      if (!updatedList.find((g:any) => g.id === form.guideId)) updatedList.push(form);
      await AsyncStorage.setItem("@app_guides", JSON.stringify(updatedList));
      setProfile(form); setEditModal(false);
      Alert.alert("Thành công", "Hồ sơ của bạn đã được cập nhật!");
    } catch (e) {} finally { setSaving(false); }
  };

  const handleMediaSubmit = () => {
    if (mediaUrl.trim()) {
      if (uploadModal.type === 'avatar') setForm({ ...form, avatarUrl: mediaUrl.trim() });
      if (uploadModal.type === 'cover') setForm({ ...form, coverUrl: mediaUrl.trim() });
      if (uploadModal.type === 'video') setForm({ ...form, videoUrl: mediaUrl.trim() });
      if (uploadModal.type === 'gallery') setForm({ ...form, galleryUrls: [...form.galleryUrls, mediaUrl.trim()] });
    }
    setMediaUrl('');
    setUploadModal({ visible: false, type: 'avatar' });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2a58" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}><Ionicons name="arrow-back" size={Math.round(24 * scale)} color="#fff" /></TouchableOpacity>
        <Text style={s.headerTitle}>Hồ sơ & Cài đặt</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <Image source={{ uri: profile.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.avatarImgMain} />
          <View style={s.profileInfo}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
               <Text style={s.nameTxtMain}>{profile.name}</Text>
               <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            </View>
            <Text style={s.emailTxtMain}>{profile.email || "Chưa cập nhật Email"}</Text>
            <Text style={s.phoneTxtMain}>{profile.phone || "Chưa cập nhật SDT"}</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.verifyRow}>
            <View style={s.verifyBadge}>
              <Ionicons name={profile.vneidVerified ? "checkmark-circle" : "close-circle"} size={16} color={profile.vneidVerified ? "#10b981" : "#94a3b8"} />
              <Text style={[s.verifyTxt, profile.vneidVerified && {color: '#10b981'}]}>VNeID</Text>
            </View>
            <View style={s.verifyBadge}>
              <Ionicons name={profile.isLocal ? "checkmark-circle" : "close-circle"} size={16} color={profile.isLocal ? "#10b981" : "#94a3b8"} />
              <Text style={[s.verifyTxt, profile.isLocal && {color: '#10b981'}]}>Bản địa</Text>
            </View>
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => { setForm(profile); setEditModal(true); }}>
            <Ionicons name="create-outline" size={18} color="#4f7cff" />
            <Text style={s.editBtnTxt}>Chỉnh sửa Hồ sơ & Media</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Công cụ quản lý</Text>
        {[
          { icon: "document-text-outline", label: "Hồ sơ & Giấy phép (Upload)", route: "/guide-onboarding", color: "#10b981", action: null },
          { icon: "eye-outline", label: "Xem Hồ sơ Công khai", route: `/public-guide-profile?id=${profile.guideId}`, color: "#4f7cff", action: null },
          { icon: "star-outline", label: "Đánh giá của Khách", route: "/guide-reviews", color: "#f59e0b", action: null },
          { icon: "lock-closed-outline", label: "Đổi mật khẩu", route: "#", color: "#64748b", action: () => setPwdModal(true) },
        ].map((item, index) => (
          <TouchableOpacity key={index} style={s.menuItem} onPress={item.action ? item.action : () => router.push(item.route as any)}>
            <View style={[s.menuIconBox, { backgroundColor: item.color + '1A' }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
            <Text style={s.menuItemTxt}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
          </TouchableOpacity>
        ))}

        <View style={s.card}>
          <Text style={s.sectionTitle}>Tài khoản & Vai trò</Text>
          <TouchableOpacity style={s.dualRoleBtn} onPress={handleSwitchToGuest}>
            <View style={s.dualRoleIcon}><Ionicons name="person-outline" size={20} color="#8b5cf6" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualRoleTitle}>Chuyển sang Khách</Text><Text style={s.dualRoleSub}>Để đặt tour và khám phá</Text></View>
            <Ionicons name="swap-horizontal" size={20} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}><Ionicons name="log-out-outline" size={20} color="#ef4444" /><Text style={s.logoutTxt}>Đăng xuất</Text></TouchableOpacity>
      </ScrollView>

      {/* MODAL CHỈNH SỬA HỒ SƠ CHÍNH */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlayEdit}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Cập nhật Hồ sơ</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} style={s.closeBtn}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.formContent}>
              <View style={s.coverWrapper}>
                <ImageBackground source={{ uri: form.coverUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' }} style={s.coverImage}>
                  <TouchableOpacity style={s.camBtn} onPress={() => setUploadModal({visible: true, type: 'cover'})}><Ionicons name="camera" size={20} color="#1f2a58" /></TouchableOpacity>
                </ImageBackground>
                <View style={s.avatarWrapper}>
                  <Image source={{ uri: form.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.avatarImgEdit} />
                  <TouchableOpacity style={s.camBtnSmall} onPress={() => setUploadModal({visible: true, type: 'avatar'})}><Ionicons name="camera" size={14} color="#1f2a58" /></TouchableOpacity>
                </View>
              </View>

              <Text style={s.formSectionTitle}>THÔNG TIN CƠ BẢN</Text>
              <Text style={s.inputLabel}>Họ và tên</Text>
              <TextInput style={s.input} value={form.name} onChangeText={v => setField('name', v)} placeholder="VD: Trần Minh Khoa" />
              <Text style={s.inputLabel}>Email</Text>
              <TextInput style={s.input} value={form.email} onChangeText={v => setField('email', v)} placeholder="VD: email@gmail.com" keyboardType="email-address" />
              <Text style={s.inputLabel}>Số điện thoại</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={v => setField('phone', v)} placeholder="VD: 0987 654 321" keyboardType="phone-pad" />
              <Text style={s.inputLabel}>Địa điểm hoạt động</Text>
              <TextInput style={s.input} value={form.location} onChangeText={v => setField('location', v)} placeholder="VD: Đà Lạt, Lâm Đồng" />

              <Text style={[s.formSectionTitle, { marginTop: 24 }]}>GIỚI THIỆU & HÌNH ẢNH</Text>
              <Text style={s.inputLabel}>Giới thiệu bản thân (Tiểu sử)</Text>
              <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={form.bio} onChangeText={v => setField('bio', v)} placeholder="Kể một chút về bạn..." multiline />

              <Text style={s.inputLabel}>Video & Thư viện ảnh</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, paddingHorizontal: Math.round(20*scale) }}>
                 <TouchableOpacity style={s.uploadMediaBtn} onPress={() => setUploadModal({visible: true, type: 'video'})}>
                   <Ionicons name="videocam-outline" size={24} color="#4f7cff" />
                   <Text style={s.uploadMediaTxt}>{form.videoUrl ? 'Đổi Video' : 'Thêm Video'}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={s.uploadMediaBtn} onPress={() => setUploadModal({visible: true, type: 'gallery'})}>
                   <Ionicons name="image-outline" size={24} color="#f59e0b" />
                   <Text style={s.uploadMediaTxt}>Thêm Ảnh ({form.galleryUrls?.length || 0})</Text>
                 </TouchableOpacity>
              </View>

              {/* KHUNG ĐIỀU HƯỚNG BẰNG CẤP SANG ONBOARDING */}
              <Text style={[s.formSectionTitle, { marginTop: 24 }]}>CHUYÊN MÔN & XÁC THỰC</Text>
              <View style={s.redirectBox}>
                <Text style={s.redirectTxt}>Học vấn, Bằng cấp, Chứng chỉ, Thẻ HDV, CCCD và Xác nhận Bản địa cần được Admin phê duyệt trực tiếp.</Text>
                <TouchableOpacity style={s.redirectBtn} onPress={() => { setEditModal(false); router.push('/guide-onboarding'); }}>
                  <Text style={s.redirectBtnTxt}>Đi đến trang Tải lên Hồ Sơ</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Kinh nghiệm dẫn tour (Mô tả ngắn)</Text>
              <TextInput style={s.input} value={form.experience} onChangeText={v => setField('experience', v)} placeholder="VD: 3 năm kinh nghiệm" />
              <Text style={s.inputLabel}>Kỹ năng đặc biệt</Text>
              <TextInput style={s.input} value={form.skills} onChangeText={v => setField('skills', v)} placeholder="VD: Sơ cứu y tế, Cắm trại..." />

              <Text style={[s.formSectionTitle, { marginTop: 24 }]}>SỞ THÍCH & NGÔN NGỮ</Text>
              <Text style={s.inputLabel}>Sở thích cá nhân</Text>
              <View style={s.chipGroup}>
                {HOBBIES_LIST.map(h => (
                  <TouchableOpacity key={h} style={[s.chip, form.hobbies?.includes(h) && s.chipActive]} onPress={() => toggleArray('hobbies', h)}><Text style={[s.chipTxt, form.hobbies?.includes(h) && s.chipTxtActive]}>{h}</Text></TouchableOpacity>
                ))}
              </View>
              <Text style={s.inputLabel}>Ngôn ngữ giao tiếp</Text>
              <View style={s.chipGroup}>
                {LANGUAGES_LIST.map(l => (
                  <TouchableOpacity key={l} style={[s.chip, form.languages?.includes(l) && s.chipActive]} onPress={() => toggleArray('languages', l)}><Text style={[s.chipTxt, form.languages?.includes(l) && s.chipTxtActive]}>{l}</Text></TouchableOpacity>
                ))}
              </View>

              <Text style={[s.formSectionTitle, { marginTop: 24 }]}>THÔNG TIN THANH TOÁN</Text>
              <Text style={s.inputLabel}>Tên Ngân hàng</Text>
              <TextInput style={s.input} value={form.bankName} onChangeText={v => setField('bankName', v)} placeholder="VD: Vietcombank..." />
              <Text style={s.inputLabel}>Số tài khoản</Text>
              <TextInput style={s.input} value={form.bankAccount} onChangeText={v => setField('bankAccount', v)} placeholder="Nhập số tài khoản" keyboardType="number-pad" />

              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={s.saveBtnTxt}>{saving ? "Đang lưu..." : "Lưu Hồ Sơ"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL UPLOAD MEDIA */}
      <Modal visible={uploadModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView style={s.popupOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.popupBox}>
            <Text style={s.popupTitle}>Cập nhật {uploadModal.type === 'video' ? 'Video' : 'Hình ảnh'}</Text>
            <TouchableOpacity style={s.uploadMediaLocalBtn} onPress={() => { setMediaUrl('https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600'); Alert.alert('Đã chọn file từ thư viện'); }}>
               <Ionicons name={uploadModal.type === 'video' ? 'film-outline' : 'images-outline'} size={28} color="#4f7cff" />
               <Text style={s.uploadMediaLocalTxt}>Chọn file từ thiết bị</Text>
            </TouchableOpacity>
            <Text style={s.orTxt}>HOẶC NHẬP LIÊN KẾT URL</Text>
            <TextInput style={[s.input, {width: '100%', marginHorizontal: 0, marginBottom: 0}]} placeholder={`Nhập URL`} value={mediaUrl} onChangeText={setMediaUrl} />
            <View style={s.popupBtnRow}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setUploadModal({visible: false, type: 'avatar'})}><Text style={s.popupCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.popupSubmitBtn} onPress={handleMediaSubmit}><Text style={s.popupSubmitBtnTxt}>Xác nhận</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ĐỔI MẬT KHẨU */}
      <Modal visible={pwdModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.popupOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.popupBox}>
            <Ionicons name="lock-closed" size={40} color="#f59e0b" />
            <Text style={s.popupTitle}>Đổi mật khẩu</Text>
            <TextInput style={[s.input, {width: '100%', marginHorizontal: 0, marginBottom: 10}]} secureTextEntry placeholder="Mật khẩu hiện tại" />
            <TextInput style={[s.input, {width: '100%', marginHorizontal: 0, marginBottom: 10}]} secureTextEntry placeholder="Mật khẩu mới" />
            <TextInput style={[s.input, {width: '100%', marginHorizontal: 0, marginBottom: 10}]} secureTextEntry placeholder="Xác nhận mật khẩu mới" />
            <View style={s.popupBtnRow}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setPwdModal(false)}><Text style={s.popupCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#f59e0b'}]} onPress={() => {setPwdModal(false); Alert.alert('Thành công', 'Đổi mật khẩu thành công!');}}><Text style={s.popupSubmitBtnTxt}>Cập nhật</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: sz(18), paddingBottom: sz(16), backgroundColor: "#1f2a58" },
    iconBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: sz(18), fontWeight: "800", color: "#fff", textAlign: 'center' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), elevation: 2, marginBottom: sz(16) },
    avatarImgMain: { width: sz(64), height: sz(64), borderRadius: sz(20), marginRight: sz(16) },
    profileInfo: { flex: 1 },
    nameTxtMain: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    emailTxtMain: { fontSize: sz(13), color: '#64748b', marginTop: sz(4) },
    phoneTxtMain: { fontSize: sz(13), color: '#64748b', marginTop: sz(2) },

    card: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(16), marginBottom: sz(16), elevation: 2 },
    verifyRow: { flexDirection: 'row', gap: sz(10), marginBottom: sz(14) },
    verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: sz(6), backgroundColor: '#f8fafc', paddingHorizontal: sz(12), paddingVertical: sz(8), borderRadius: sz(10), borderWidth: 1, borderColor: '#e2e8f0', flex: 1, justifyContent: 'center' },
    verifyTxt: { fontSize: sz(13), fontWeight: '700', color: '#64748b' },
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#f1f5f9', paddingVertical: sz(12), borderRadius: sz(12) },
    editBtnTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(14) },

    sectionTitle: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58', marginBottom: sz(10), marginLeft: sz(4) },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(14), borderRadius: sz(14), marginBottom: sz(10), elevation: 1 },
    menuIconBox: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    menuItemTxt: { flex: 1, fontSize: sz(14), fontWeight: '700', color: '#1f2a58' },

    dualRoleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', padding: sz(14), borderRadius: sz(14), borderWidth: 1, borderColor: '#ede9fe' },
    dualRoleIcon: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    dualRoleTitle: { fontSize: sz(14), fontWeight: '800', color: '#6d28d9', marginBottom: sz(2) },
    dualRoleSub: { fontSize: sz(12), color: '#8b5cf6' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#fef2f2', paddingVertical: sz(14), borderRadius: sz(14), marginTop: sz(10), borderWidth: 1, borderColor: '#fecaca' },
    logoutTxt: { color: '#ef4444', fontWeight: '800', fontSize: sz(15) },

    modalOverlayEdit: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,18,50,0.5)' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), height: '92%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: sz(20), borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    modalTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    closeBtn: { padding: sz(4) },
    formContent: { paddingBottom: sz(40) },

    coverWrapper: { height: sz(180), position: "relative", backgroundColor: "#fff" },
    coverImage: { width: "100%", height: sz(130), backgroundColor: "#cbd5e1" },
    camBtn: { position: "absolute", right: sz(16), bottom: sz(16), width: sz(36), height: sz(36), borderRadius: sz(18), backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", elevation: 2 },
    avatarWrapper: { position: "absolute", bottom: sz(10), left: sz(20), width: sz(80), height: sz(80), borderRadius: sz(24), backgroundColor: "#fff", padding: sz(4), elevation: 5 },
    avatarImgEdit: { width: "100%", height: "100%", borderRadius: sz(20), backgroundColor: "#e2e8f0" },
    camBtnSmall: { position: "absolute", right: -sz(4), bottom: -sz(4), width: sz(28), height: sz(28), borderRadius: sz(14), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },

    formSectionTitle: { fontSize: sz(13), fontWeight: "800", color: "#94a8d8", marginTop: sz(16), marginBottom: sz(8), letterSpacing: 0.5, paddingHorizontal: sz(20) },
    inputLabel: { fontSize: sz(13), fontWeight: "700", color: "#1f2a58", marginBottom: sz(8), marginTop: sz(12), paddingHorizontal: sz(20) },
    input: { backgroundColor: "#f8fafc", borderRadius: sz(12), borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: sz(16), paddingVertical: sz(14), color: "#1f2a58", fontSize: sz(14), marginHorizontal: sz(20) },
    
    redirectBox: { backgroundColor: '#eaf0ff', padding: sz(16), marginHorizontal: sz(20), borderRadius: sz(12), borderWidth: 1, borderColor: '#d1dfff', marginBottom: sz(10) },
    redirectTxt: { color: '#1f2a58', fontSize: sz(12), lineHeight: sz(18), marginBottom: sz(12) },
    redirectBtn: { backgroundColor: '#4f7cff', paddingVertical: sz(10), borderRadius: sz(10), alignItems: 'center' },
    redirectBtnTxt: { color: '#fff', fontWeight: '800', fontSize: sz(13) },

    uploadMediaBtn: { flex: 1, backgroundColor: '#f8faff', borderWidth: 1, borderColor: '#e4ebff', borderStyle: 'dashed', borderRadius: sz(12), alignItems: 'center', paddingVertical: sz(16), marginHorizontal: sz(10) },
    uploadMediaTxt: { marginTop: sz(6), fontSize: sz(12), fontWeight: '600', color: '#64748b' },

    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: sz(8), paddingHorizontal: sz(20) },
    chip: { paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(20), backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
    chipTxt: { fontSize: sz(12), color: '#475569', fontWeight: '600' },
    chipTxtActive: { color: '#fff' },

    saveBtn: { backgroundColor: "#4f7cff", borderRadius: sz(14), height: sz(54), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(8), margin: sz(20), marginTop: sz(30) },
    saveBtnTxt: { color: "#fff", fontSize: sz(16), fontWeight: "900" },

    popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    popupBox: { backgroundColor: "#fff", width: "100%", borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    popupTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(10), marginBottom: sz(16) },
    uploadMediaLocalBtn: { width: '100%', backgroundColor: '#f8faff', borderWidth: 1, borderColor: '#4f7cff', borderStyle: 'dashed', borderRadius: sz(14), alignItems: 'center', paddingVertical: sz(20), marginBottom: sz(16) },
    uploadMediaLocalTxt: { marginTop: sz(8), fontSize: sz(13), fontWeight: '700', color: '#4f7cff' },
    orTxt: { fontSize: sz(11), fontWeight: '800', color: '#94a3b8', marginBottom: sz(16) },
    popupBtnRow: { flexDirection: 'row', gap: sz(10), width: '100%', marginTop: sz(20) },
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    popupCancelBtnTxt: { color: "#64748b", fontSize: sz(15), fontWeight: "800" },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
    popupSubmitBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
  });
};