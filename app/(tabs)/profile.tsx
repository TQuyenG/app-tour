/**
 * app/(tabs)/profile.tsx  –  Profile Guest
 * ĐÃ FIX: Lấy danh tính từ Session Đăng Nhập (@app_current_user), loại bỏ triệt để Mặc định "Nguyễn An".
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GuestProfile {
  name: string; email: string; phone: string; dob: string;
  address: string; loyaltyPoints: number; loyaltyTier: string;
  voucher: string; avatarColor: string; avatarUrl?: string;
}

// BỘ KHUNG RỖNG - Đợi được lấp đầy bởi dữ liệu Session
const EMPTY_PROFILE: GuestProfile = {
  name: 'Khách hàng', email: '', phone: '',
  dob: 'Chưa cập nhật', address: 'Chưa cập nhật', 
  loyaltyPoints: 0, loyaltyTier: 'Đồng', voucher: '', avatarColor: '#4f7cff', avatarUrl: '',
};

const TIER_CONFIG = [
  { name: "Đồng", minPoints: 0 }, 
  { name: "Bạc", minPoints: 1000 },
  { name: "Vàng", minPoints: 5000 }, 
  { name: "Kim Cương", minPoints: 10000 }
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile, setProfile] = useState<GuestProfile>(EMPTY_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<GuestProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  
  const [isGuideAlso, setIsGuideAlso] = useState(false);
  const [guideReqStatus, setGuideReqStatus] = useState<'none' | 'pending' | 'rejected'>('none');
  const [guideReqNote, setGuideReqNote] = useState('');

  const [uploadModal, setUploadModal] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');

  const [pwdModal, setPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '' });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // 1. Lấy dữ liệu danh tính Gốc từ Phiên đăng nhập
          const rawUser = await AsyncStorage.getItem('@app_current_user');
          const sessionUser = rawUser ? JSON.parse(rawUser) : null;

          // 2. Lấy các dữ liệu phụ trợ từ Profile (Ngày sinh, điểm Loyalty, v.v...)
          const rawProfile = await AsyncStorage.getItem('@app_profile');
          const savedProfile = rawProfile ? JSON.parse(rawProfile) : {};
          
          // 3. Hợp nhất: Session luôn là Vua (Ghi đè mọi thứ khác)
          const p = {
            ...EMPTY_PROFILE,
            ...savedProfile,
            name: sessionUser?.name || savedProfile.name || EMPTY_PROFILE.name,
            email: sessionUser?.email || savedProfile.email || EMPTY_PROFILE.email,
            phone: sessionUser?.phone || savedProfile.phone || EMPTY_PROFILE.phone,
            avatarColor: sessionUser?.avatarColor || savedProfile.avatarColor || EMPTY_PROFILE.avatarColor
          };

          const currentTier = TIER_CONFIG.slice().reverse().find(t => p.loyaltyPoints >= t.minPoints)?.name || "Đồng";
          p.loyaltyTier = currentTier;
          
          setProfile(p); 
          setForm(p);
          
          const currentEmail = p.email;
          const accId = sessionUser?.accountId || '';
          
          // Kiểm tra Role Hướng dẫn viên
          let hasGuideRole = sessionUser?.roles?.includes('guide') || false;
          setIsGuideAlso(hasGuideRole);

          if (!hasGuideRole) {
            const rawReqs = await AsyncStorage.getItem('@admin_guide_requests');
            if (rawReqs) {
              const reqs = JSON.parse(rawReqs);
              const myReqs = reqs.filter((r: any) => (accId && r.accountId === accId) || r.email === currentEmail);
              if (myReqs.length > 0) {
                const latestReq = myReqs[0];
                if (latestReq.status === 'pending') setGuideReqStatus('pending');
                else if (latestReq.status === 'rejected') {
                  setGuideReqStatus('rejected');
                  setGuideReqNote(latestReq.adminNote || latestReq.note || 'Hồ sơ chưa đạt yêu cầu.');
                } else if (latestReq.status === 'approved') setIsGuideAlso(true);
              } else setGuideReqStatus('none');
            }
          }
        } catch (e) {}
      };
      loadData();
    }, [])
  );

  const handleCheckIn = async () => {
    try {
      const today = new Date().toLocaleDateString('vi-VN');
      const lastCheckIn = await AsyncStorage.getItem('@guest_last_checkin');
      
      if (lastCheckIn === today) {
        Alert.alert("Thông báo", "Bạn đã điểm danh hôm nay rồi. Ngày mai quay lại nhé!");
        return;
      }

      const newPoints = profile.loyaltyPoints + 20;
      const currentTier = TIER_CONFIG.slice().reverse().find(t => newPoints >= t.minPoints)?.name || "Đồng";
      const updatedProfile = { ...profile, loyaltyPoints: newPoints, loyaltyTier: currentTier };
      
      await AsyncStorage.setItem('@app_profile', JSON.stringify(updatedProfile));
      await AsyncStorage.setItem('@guest_last_checkin', today);
      setProfile(updatedProfile);

      const hRaw = await AsyncStorage.getItem("@guest_loyalty_history");
      const history = hRaw ? JSON.parse(hRaw) : [];
      history.unshift({
        id: `h-${Date.now()}`, type: "earn", points: 20, desc: "Điểm danh hàng ngày", date: new Date().toISOString()
      });
      await AsyncStorage.setItem("@guest_loyalty_history", JSON.stringify(history));

      Alert.alert("Thành công", "Bạn đã nhận được 20 điểm thưởng!");
    } catch (e) {
      console.log(e);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Lỗi', 'Vui lòng điền họ tên.'); return; }
    setSaving(true);
    await AsyncStorage.setItem('@app_profile', JSON.stringify(form));
    
    // Cập nhật ngược lại Session để giữ đồng bộ Source of Truth
    const rawUser = await AsyncStorage.getItem('@app_current_user');
    if (rawUser) {
      const sessionUser = JSON.parse(rawUser);
      sessionUser.name = form.name;
      sessionUser.phone = form.phone;
      await AsyncStorage.setItem('@app_current_user', JSON.stringify(sessionUser));
    }

    setProfile(form);
    setSaving(false);
    setModalVisible(false);
  };

  const handleMediaSubmit = () => {
    if (mediaUrl.trim()) setForm({ ...form, avatarUrl: mediaUrl.trim() });
    setMediaUrl('');
    setUploadModal(false);
  };

  const handlePwdSubmit = () => {
    if (!pwdForm.old || !pwdForm.new || !pwdForm.confirm) { Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.'); return; }
    if (pwdForm.new !== pwdForm.confirm) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.'); return; }
    Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.');
    setPwdForm({ old: '', new: '', confirm: '' });
    setPwdModal(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@current_user_role');
    router.replace('/login' as any);
  };

  const handleSwitchToGuide = async () => {
    await AsyncStorage.setItem('@current_user_role', 'guide');
    router.replace('/guide-home' as any);
  };

  const setField = (key: keyof GuestProfile, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));
  const tierColors: Record<string, string> = { 'Đồng': '#cd7f32', 'Bạc': '#94a3b8', 'Vàng': '#f59e0b', 'Kim Cương': '#a855f7' };
  const tierColor = tierColors[profile.loyaltyTier] ?? '#4f7cff';

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + Math.round(14 * scale), paddingBottom: Math.round(100 * scale) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Text style={s.title}>Tài khoản</Text>

      <View style={s.profileCard}>
        {profile.avatarUrl ? (
           <Image source={{ uri: profile.avatarUrl }} style={s.avatar} />
        ) : (
           <View style={[s.avatar, { backgroundColor: profile.avatarColor }]}><Text style={s.avatarInitial}>{(profile.name || 'U').trim().charAt(0).toUpperCase()}</Text></View>
        )}
        <View style={s.profileInfo}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.email}>{profile.email}</Text>
          {!!profile.phone && <Text style={s.phone}>{profile.phone}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}><Ionicons name="log-out-outline" size={Math.round(22 * scale)} color="#7a8cc2" /></TouchableOpacity>
      </View>

      <View style={s.crmCard}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/guest_loyalty')}>
          <View style={s.crmRow}>
            <Text style={s.crmTitle}>Điểm tích lũy <Ionicons name="chevron-forward" size={14} color="#7a8cc2"/></Text>
            <Text style={[s.crmPoints, { color: '#4f7cff' }]}>{profile.loyaltyPoints.toLocaleString('vi-VN')} điểm</Text>
          </View>
          <View style={s.crmRow}>
            <Text style={s.crmMeta}>Cấp thành viên</Text>
            <View style={[s.tierBadge, { backgroundColor: tierColor + '22' }]}><Text style={[s.tierTxt, { color: tierColor }]}>{profile.loyaltyTier}</Text></View>
          </View>
          <View style={s.progressWrap}>
            <View style={s.progressBg}><View style={[s.progressFill, { width: `${Math.min((profile.loyaltyPoints % 1000) / 10, 100)}%` as any }]} /></View>
            <Text style={s.progressHint}>{1000 - (profile.loyaltyPoints % 1000)} điểm đến tier tiếp theo</Text>
          </View>
        </TouchableOpacity>

        {/* NÚT ĐIỂM DANH */}
        <TouchableOpacity style={s.checkInBtn} onPress={handleCheckIn}>
           <Ionicons name="calendar-outline" size={Math.round(18 * scale)} color="#fff" />
           <Text style={s.checkInTxt}>Điểm danh nhận 20 điểm</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.editBtn} onPress={() => { setForm(profile); setModalVisible(true); }}>
        <Ionicons name="create-outline" size={Math.round(17 * scale)} color="#4f7cff" />
        <Text style={s.editBtnTxt}>Chỉnh sửa thông tin cá nhân</Text>
      </TouchableOpacity>

      {([
        { href: '/guest_chat_list',     icon: 'chatbubbles-outline',   label: 'Trung tâm Hỗ trợ',         color: '#f59e0b', action: null },
        { href: '/guest_loyalty',       icon: 'star-outline',          label: 'Điểm thưởng & Đổi Quà',    color: '#f59e0b', action: null },
        { href: '/guest_vouchers',      icon: 'ticket-outline',        label: 'Kho Voucher của tôi',      color: '#10b981', action: null },
        { href: '/bookings',            icon: 'receipt-outline',       label: 'Lịch sử đặt tour',         color: '#2856d6', action: null },
        { href: '#',                    icon: 'lock-closed-outline',   label: 'Đổi mật khẩu',             color: '#64748b', action: () => setPwdModal(true) },
      ] as const).map((item, idx) => (
        <TouchableOpacity key={idx} style={s.menuItem} onPress={item.action ? item.action : () => router.push(item.href as any)}>
          <View style={[s.menuIcon, { backgroundColor: (item as any).color + '18' }]}><Ionicons name={item.icon as any} size={Math.round(20 * scale)} color={(item as any).color} /></View>
          <Text style={s.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      <View style={s.dualCard}>
        <Text style={s.dualTitle}>Vai trò & Tài khoản</Text>
        {isGuideAlso ? (
          <TouchableOpacity style={s.dualRow} onPress={handleSwitchToGuide}>
            <View style={[s.dualIcon, { backgroundColor: '#edf9f0' }]}><Ionicons name="map-outline" size={Math.round(20 * scale)} color="#16a34a" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualLabel}>Chuyển sang tài khoản HDV</Text><Text style={s.dualSub}>Quản lý lịch, nhận tour, thu nhập</Text></View>
            <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
          </TouchableOpacity>
        ) : guideReqStatus === 'pending' ? (
          <View style={s.dualRow}>
            <View style={[s.dualIcon, { backgroundColor: '#fffbeb' }]}><Ionicons name="time-outline" size={Math.round(20 * scale)} color="#d97706" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualLabel}>Đang chờ xét duyệt HDV</Text><Text style={s.dualSub}>Hồ sơ của bạn đang được Admin kiểm tra.</Text></View>
          </View>
        ) : guideReqStatus === 'rejected' ? (
          <TouchableOpacity style={s.dualRow} onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[s.dualIcon, { backgroundColor: '#fef2f2' }]}><Ionicons name="close-circle-outline" size={Math.round(20 * scale)} color="#ef4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dualLabel, { color: '#ef4444' }]}>Hồ sơ HDV bị từ chối</Text>
              <Text style={[s.dualSub, { color: '#ef4444', fontStyle: 'italic' }]}>Lý do: {guideReqNote}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.dualRow} onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[s.dualIcon, { backgroundColor: '#edf2ff' }]}><Ionicons name="person-add-outline" size={Math.round(20 * scale)} color="#4f7cff" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualLabel}>Đăng ký làm Hướng dẫn viên</Text><Text style={s.dualSub}>Kiếm thu nhập từ đam mê</Text></View>
            <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={Math.round(18 * scale)} color="#ef4444" />
        <Text style={s.logoutTxt}>Đăng xuất khỏi thiết bị</Text>
      </TouchableOpacity>

      {/* Modal Chỉnh sửa Hồ sơ */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} onPress={() => setModalVisible(false)} />
          <View style={s.sheet}>
            <View style={s.mheader}>
              <Text style={s.mtitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.mbody}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                 <TouchableOpacity onPress={() => setUploadModal(true)}>
                   {form.avatarUrl ? (
                     <Image source={{ uri: form.avatarUrl }} style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#e2e8f0' }} />
                   ) : (
                     <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: form.avatarColor, alignItems: 'center', justifyContent: 'center' }}>
                       <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>{(form.name || 'U').charAt(0)}</Text>
                     </View>
                   )}
                   <View style={{ position: 'absolute', bottom: -5, right: -5, backgroundColor: '#4f7cff', borderRadius: 12, padding: 4, borderWidth: 2, borderColor: '#fff' }}>
                      <Ionicons name="camera" size={14} color="#fff" />
                   </View>
                 </TouchableOpacity>
              </View>

              <TextInput style={s.input} value={form.name} onChangeText={v => setField('name', v)} placeholder="Họ và tên" />
              <TextInput style={s.input} value={form.phone} onChangeText={v => setField('phone', v)} placeholder="Số điện thoại" />
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnTxt}>Lưu thay đổi</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL UPLOAD ẢNH */}
      <Modal visible={uploadModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.popupOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.popupBox}>
            <Text style={s.popupTitle}>Đổi ảnh đại diện</Text>
            <TouchableOpacity style={s.uploadMediaBtn} onPress={() => { setMediaUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'); Alert.alert('Đã chọn file thành công'); }}>
               <Ionicons name="images-outline" size={28} color="#4f7cff" />
               <Text style={s.uploadMediaTxt}>Chọn ảnh từ thư viện thiết bị</Text>
            </TouchableOpacity>
            <Text style={s.orTxt}>HOẶC NHẬP URL</Text>
            <TextInput style={[s.input, {width: '100%', marginBottom: 0}]} placeholder="Nhập liên kết ảnh (https://...)" value={mediaUrl} onChangeText={setMediaUrl} />
            <View style={s.popupBtnRow}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setUploadModal(false)}><Text style={s.popupCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.popupSubmitBtn} onPress={handleMediaSubmit}><Text style={s.popupSubmitBtnTxt}>Cập nhật</Text></TouchableOpacity>
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
            <TextInput style={[s.input, {width: '100%', marginBottom: 10}]} secureTextEntry placeholder="Mật khẩu hiện tại" value={pwdForm.old} onChangeText={t => setPwdForm({...pwdForm, old: t})} />
            <TextInput style={[s.input, {width: '100%', marginBottom: 10}]} secureTextEntry placeholder="Mật khẩu mới" value={pwdForm.new} onChangeText={t => setPwdForm({...pwdForm, new: t})} />
            <TextInput style={[s.input, {width: '100%', marginBottom: 10}]} secureTextEntry placeholder="Xác nhận mật khẩu mới" value={pwdForm.confirm} onChangeText={t => setPwdForm({...pwdForm, confirm: t})} />
            <View style={s.popupBtnRow}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setPwdModal(false)}><Text style={s.popupCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#f59e0b'}]} onPress={handlePwdSubmit}><Text style={s.popupSubmitBtnTxt}>Lưu mật khẩu</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen:  { flex: 1, backgroundColor: '#f3f7ff' },
    content: { padding: sz(18), paddingBottom: sz(100) },
    title:   { color: '#1f2a58', fontSize: sz(26), fontWeight: '700', marginBottom: sz(14) },
    profileCard: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(14), flexDirection: 'row', alignItems: 'center', gap: sz(12), marginBottom: sz(14) },
    avatar: { width: sz(56), height: sz(56), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#fff', fontSize: sz(22), fontWeight: '800' },
    profileInfo: { flex: 1 },
    name: { color: '#1f2a58', fontWeight: '700', fontSize: sz(16) },
    email: { color: '#7a8cc2', marginTop: sz(3), fontSize: sz(13) },
    phone: { color: '#5f73a9', marginTop: sz(2), fontSize: sz(12) },
    
    crmCard: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(16), marginBottom: sz(14), gap: sz(10), elevation: 2 },
    crmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    crmTitle: { color: '#1f2a58', fontWeight: '700', fontSize: sz(14) },
    crmPoints: { fontWeight: '900', fontSize: sz(16) },
    crmMeta: { color: '#7a8cc2', fontSize: sz(13) },
    tierBadge: { borderRadius: sz(10), paddingHorizontal: sz(10), paddingVertical: sz(4) },
    tierTxt: { fontWeight: '800', fontSize: sz(13) },
    voucherRow:   { flexDirection: 'row', alignItems: 'center', gap: sz(6) },
    voucherTxt:   { color: '#7a8cc2', fontSize: sz(13) },
    voucherCode:  { color: '#4f7cff', fontWeight: '700' },
    progressWrap: { gap: sz(5) },
    progressBg:   { height: sz(5), backgroundColor: '#e4ebff', borderRadius: sz(4), overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4f7cff', borderRadius: sz(4) },
    progressHint: { color: '#7a8cc2', fontSize: sz(11) },
    
    checkInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#10b981', paddingVertical: sz(12), borderRadius: sz(12), marginTop: sz(6) },
    checkInTxt: { color: '#fff', fontWeight: '800', fontSize: sz(13) },

    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#fff', borderRadius: sz(14), paddingVertical: sz(12), marginBottom: sz(18) },
    editBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(14) },
    menuItem: { marginBottom: sz(10), borderRadius: sz(14), backgroundColor: '#fff', padding: sz(14), flexDirection: 'row', alignItems: 'center', gap: sz(12) },
    menuIcon: { width: sz(36), height: sz(36), borderRadius: sz(10), alignItems: 'center', justifyContent: 'center' },
    menuText: { color: '#1f2a58', fontWeight: '600', flex: 1, fontSize: sz(14) },
    dualCard: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(14), marginTop: sz(10) },
    dualTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: sz(10), fontSize: sz(14) },
    dualRow: { flexDirection: 'row', alignItems: 'center', gap: sz(12), paddingVertical: sz(8) },
    dualIcon: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: 'center', justifyContent: 'center' },
    dualLabel: { color: '#1f2a58', fontWeight: '700', fontSize: sz(14) },
    dualSub: { color: '#7a8cc2', fontSize: sz(12), marginTop: sz(2) },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#fef2f2', paddingVertical: sz(14), borderRadius: sz(14), marginTop: sz(10), borderWidth: 1, borderColor: '#fecaca' },
    logoutTxt: { color: '#ef4444', fontWeight: '800', fontSize: sz(15) },
    
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: sz(28), borderTopRightRadius: sz(28), padding: sz(20) },
    mheader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sz(20) },
    mtitle: { fontSize: sz(18), fontWeight: '800', color: '#1f2a58' },
    mbody: { gap: sz(12) },
    input: { backgroundColor: '#f3f7ff', padding: sz(14), borderRadius: sz(12), fontSize: sz(14), color: '#1f2a58' },
    saveBtn: { backgroundColor: '#4f7cff', padding: sz(14), borderRadius: sz(12), alignItems: 'center', marginTop: sz(10) },
    saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: sz(15) },

    popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    popupBox: { backgroundColor: "#fff", width: "100%", borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    popupTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(10), marginBottom: sz(16) },
    uploadMediaBtn: { width: '100%', backgroundColor: '#f8faff', borderWidth: 1, borderColor: '#4f7cff', borderStyle: 'dashed', borderRadius: sz(14), alignItems: 'center', paddingVertical: sz(20), marginBottom: sz(16) },
    uploadMediaTxt: { marginTop: sz(8), fontSize: sz(13), fontWeight: '700', color: '#4f7cff' },
    orTxt: { fontSize: sz(11), fontWeight: '800', color: '#94a3b8', marginBottom: sz(16) },
    popupBtnRow: { flexDirection: 'row', gap: sz(10), width: '100%', marginTop: sz(20) },
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    popupCancelBtnTxt: { color: "#64748b", fontSize: sz(15), fontWeight: "800" },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
    popupSubmitBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
  });
};