/**
 * app/guest-become-guide.tsx
 * Khách hàng điền form đăng ký làm HDV -> Lưu local cho Admin duyệt
 * - Đã FIX: Xóa bar đen (Navigation Header).
 * - Đã FIX: Thay thế Alert bằng Popup Modal tùy chỉnh.
 * - Đã FIX: Xử lý mượt luồng lưu Data cho Admin.
 * - Responsive UI toàn diện.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, Modal,
  StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuestBecomeGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);
  
  const [user, setUser] = useState({ accountId: `guest-${Date.now()}`, name: '', email: '', phone: '' });
  const [form, setForm] = useState({ location: '', experience: '', skills: '', bio: '' });
  const [submitting, setSubmitting] = useState(false);

  // State quản lý Popup tùy chỉnh (Thay thế cho Alert)
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: "success" | "error" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const sessionRaw = await AsyncStorage.getItem('@app_current_user');
        if (sessionRaw) {
          const sessionData = JSON.parse(sessionRaw);
          setUser({ 
            accountId: sessionData.accountId || user.accountId, 
            name: sessionData.name || '', 
            email: sessionData.email || '', 
            phone: sessionData.phone || '' 
          });
        } else {
          const profileRaw = await AsyncStorage.getItem('@app_profile');
          if (profileRaw) {
            const p = JSON.parse(profileRaw);
            setUser({ 
              accountId: user.accountId, 
              name: p.name || '', 
              email: p.email || '', 
              phone: p.phone || '' 
            });
          }
        }
      } catch (e) {
        console.log("Lỗi load user", e);
      }
    };
    loadUser();
  }, []);

  const handlePreSubmit = () => {
    if (!form.location || !form.experience || !form.skills || !form.bio) {
      setPopup({
        visible: true,
        type: "error",
        title: "Thiếu thông tin",
        message: "Vui lòng điền đầy đủ các trường bắt buộc có dấu (*)."
      });
      return;
    }

    setPopup({
      visible: true,
      type: "confirm",
      title: "Xác nhận gửi hồ sơ",
      message: "Bạn có chắc chắn muốn gửi thông tin này cho Admin xét duyệt không?",
      onConfirm: executeSubmit
    });
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    setPopup({ ...popup, visible: false }); // Ẩn popup xác nhận
    
    try {
      // 1. Lưu yêu cầu cho Admin duyệt
      const newReq = {
        id: `req-${Date.now()}`, 
        accountId: user.accountId,
        name: user.name || 'Người dùng ẩn danh', 
        email: user.email, 
        phone: user.phone,
        ...form, 
        status: 'pending', 
        createdAt: new Date().toISOString()
      };
      
      const rawReqs = await AsyncStorage.getItem('@admin_guide_requests');
      const reqList = rawReqs ? JSON.parse(rawReqs) : [];
      reqList.unshift(newReq);
      await AsyncStorage.setItem('@admin_guide_requests', JSON.stringify(reqList));

      // 2. Bắn thông báo cho Admin
      const rawNotifs = await AsyncStorage.getItem('@admin_notifications');
      const notifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      notifs.unshift({ 
        id: `an-${Date.now()}`, 
        title: 'Yêu cầu HDV mới', 
        body: `${user.name || 'Một khách hàng'} vừa đăng ký làm HDV.`, 
        read: false, 
        createdAt: new Date().toISOString() 
      });
      await AsyncStorage.setItem('@admin_notifications', JSON.stringify(notifs));

      // 3. Hiển thị Popup thành công
      setPopup({
        visible: true,
        type: "success",
        title: "Thành công",
        message: "Hồ sơ của bạn đã được gửi. Admin sẽ xét duyệt trong vòng 24h.",
        onConfirm: () => {
          setPopup({ ...popup, visible: false });
          router.back();
        }
      });
    } catch (e) {
      setPopup({
        visible: true,
        type: "error",
        title: "Lỗi hệ thống",
        message: "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* KHẮC PHỤC LỖI BAR ĐEN BẰNG STACK.SCREEN */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={Math.round(24 * scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.title}>Trở thành Hướng dẫn viên</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.noteBox}>
          <Ionicons name="information-circle" size={Math.round(24 * scale)} color="#4f7cff" />
          <Text style={s.noteTxt}>Hồ sơ của bạn sẽ được đội ngũ kiểm duyệt để đảm bảo chất lượng nền tảng.</Text>
        </View>

        <Text style={s.sectionTitle}>Thông tin cá nhân (Tự động điền)</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}><Text style={s.infoLbl}>Họ tên:</Text><Text style={s.infoVal}>{user.name || 'Chưa cập nhật'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLbl}>Email:</Text><Text style={s.infoVal}>{user.email || 'Chưa cập nhật'}</Text></View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}><Text style={s.infoLbl}>Số ĐT:</Text><Text style={s.infoVal}>{user.phone || 'Chưa cập nhật'}</Text></View>
        </View>
        <Text style={s.infoWarning}>Vui lòng cập nhật thông tin cá nhân trong phần Tài khoản nếu chưa chính xác.</Text>

        <Text style={[s.sectionTitle, { marginTop: Math.round(24 * scale) }]}>Kinh nghiệm & Kỹ năng</Text>
        
        <Text style={s.label}>Khu vực hoạt động chính *</Text>
        <TextInput style={s.inputField} placeholder="VD: Đà Lạt, Phú Quốc..." value={form.location} onChangeText={v => setForm({ ...form, location: v })} placeholderTextColor="#94a3b8" />

        <Text style={s.label}>Kinh nghiệm dẫn tour *</Text>
        <TextInput style={s.inputField} placeholder="VD: 3 năm làm HDV tự do..." value={form.experience} onChangeText={v => setForm({ ...form, experience: v })} placeholderTextColor="#94a3b8" />

        <Text style={s.label}>Kỹ năng nổi bật (Cách nhau dấu phẩy) *</Text>
        <TextInput style={s.inputField} placeholder="VD: Tiếng Anh, Chụp ảnh, Hoạt náo..." value={form.skills} onChangeText={v => setForm({ ...form, skills: v })} placeholderTextColor="#94a3b8" />

        <Text style={s.label}>Giới thiệu ngắn về bản thân *</Text>
        <TextInput style={s.textArea} placeholder="Thuyết phục khách hàng chọn bạn..." multiline textAlignVertical="top" value={form.bio} onChangeText={v => setForm({ ...form, bio: v })} placeholderTextColor="#94a3b8" />

      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Math.round(14 * scale)) }]}>
        <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.7 }]} onPress={handlePreSubmit} disabled={submitting}>
          <Text style={s.submitBtnTxt}>{submitting ? 'Đang xử lý...' : 'Gửi Yêu Cầu Duyệt'}</Text>
        </TouchableOpacity>
      </View>

      {/* POPUP TÙY CHỈNH THAY THẾ ALERT */}
      <Modal visible={popup.visible} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <View style={[s.popupIconWrap, { backgroundColor: popup.type === "success" ? "#d1fae5" : popup.type === "error" ? "#fee2e2" : "#eaf0ff" }]}>
              <Ionicons 
                name={popup.type === "success" ? "checkmark-circle" : popup.type === "error" ? "warning" : "help-circle"} 
                size={Math.round(32 * scale)} 
                color={popup.type === "success" ? "#10b981" : popup.type === "error" ? "#ef4444" : "#4f7cff"} 
              />
            </View>
            <Text style={s.popupTitle}>{popup.title}</Text>
            <Text style={s.popupMessage}>{popup.message}</Text>
            
            {popup.type === "confirm" ? (
              <View style={s.popupActionRow}>
                <TouchableOpacity style={s.popupCancelBtn} onPress={() => setPopup({ ...popup, visible: false })}>
                  <Text style={s.popupCancelBtnTxt}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.popupSubmitBtn} onPress={popup.onConfirm}>
                  <Text style={s.popupSubmitBtnTxt}>Đồng ý</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.popupSingleBtn} onPress={() => {
                if (popup.onConfirm) popup.onConfirm();
                else setPopup({ ...popup, visible: false });
              }}>
                <Text style={s.popupSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: sz(17), fontWeight: '800', color: '#1f2a58' },
    content: { padding: sz(18), paddingBottom: sz(40) },
    
    noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: sz(8), backgroundColor: '#edf2ff', borderRadius: sz(12), padding: sz(12), marginBottom: sz(16) },
    noteTxt: { flex: 1, color: '#4f7cff', fontSize: sz(13), lineHeight: sz(18) },
    
    sectionTitle: { fontSize: sz(15), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    infoCard: { backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: sz(12) },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: sz(12), borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    infoLbl: { color: '#7a8cc2', fontSize: sz(13), fontWeight: '600' },
    infoVal: { color: '#1f2a58', fontWeight: '800', fontSize: sz(13) },
    infoWarning: { color: '#d97706', fontSize: sz(12), marginTop: sz(8), fontStyle: 'italic' },
    
    label: { fontSize: sz(13), fontWeight: '800', color: '#1f2a58', marginTop: sz(16), marginBottom: sz(8) },
    inputField: { backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: sz(14), paddingVertical: sz(13), color: '#1f2a58', fontSize: sz(14) },
    textArea: { backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), minHeight: sz(110), color: '#1f2a58', fontSize: sz(14) },
    
    bottomBar: { backgroundColor: '#fff', paddingHorizontal: sz(18), paddingTop: sz(14), borderTopWidth: 1, borderTopColor: '#e4ebff', elevation: 10 },
    submitBtn: { backgroundColor: '#4f7cff', borderRadius: sz(14), height: sz(52), alignItems: 'center', justifyContent: 'center' },
    submitBtnTxt: { color: '#fff', fontWeight: '900', fontSize: sz(15) },

    // Custom Popup Styles
    popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    popupBox: { backgroundColor: "#fff", width: "100%", maxWidth: sz(340), borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    popupIconWrap: { width: sz(64), height: sz(64), borderRadius: sz(32), alignItems: "center", justifyContent: "center", marginBottom: sz(16) },
    popupTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginBottom: sz(8), textAlign: "center" },
    popupMessage: { fontSize: sz(14), color: "#64748b", textAlign: "center", lineHeight: sz(22), marginBottom: sz(24) },
    popupActionRow: { flexDirection: "row", gap: sz(12), width: "100%" },
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
    popupCancelBtnTxt: { color: "#7a8cc2", fontSize: sz(15), fontWeight: "800" },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
    popupSubmitBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
    popupSingleBtn: { width: "100%", height: sz(48), borderRadius: sz(12), backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
    popupSingleBtnTxt: { color: "#1f2a58", fontSize: sz(15), fontWeight: "900" },
  });
};