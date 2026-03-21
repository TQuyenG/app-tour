import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getCurrentUser, setGuideStatus, switchRole,
  syncGuideProfileToPublic, type GuideStatus,
} from '@/constants/app-accounts';

const STORAGE_KEY = '@guide_profile';
interface GuideProfile {
  name: string; phone: string; email: string; location: string;
  experience: string; bio: string; skills: string;
  languages: string; certifications: string; bankAccount: string; bankName: string;
  guideId?: string;
}
const DEFAULT_PROFILE: GuideProfile = {
  name: 'Nguyễn Văn A', phone: '0912 345 678', email: 'guide1@gmail.com',
  location: 'TP. Hồ Chí Minh', experience: '5 năm',
  bio: 'HDV chuyên tuyến miền Nam, giỏi về lịch sử và văn hóa địa phương.',
  skills: 'Biển đảo, Cao nguyên, Trekking, Lịch sử',
  languages: 'Tiếng Việt, Tiếng Anh, Tiếng Pháp',
  certifications: 'Thẻ HDV quốc tế, Chứng chỉ sơ cấp cứu, Bằng lái xe B2',
  bankAccount: '1234567890', bankName: 'Vietcombank',
  guideId: 'g1',
};

const MENU_ITEMS = [
  { icon: 'calendar-outline', label: 'Quản lý Booking', route: '/guide-booking-management', color: '#2856d6' },
  { icon: 'map-outline', label: 'Tour của tôi', route: '/guide-tour-management', color: '#10b981' },
  { icon: 'time-outline', label: 'Lịch cá nhân', route: '/guide-schedule-management', color: '#22c55e' },
  { icon: 'cash-outline', label: 'Thu nhập', route: '/guide-earnings', color: '#f59e0b' },
  { icon: 'star-outline', label: 'Đánh giá từ khách', route: '/guide-reviews', color: '#a855f7' },
  { icon: 'notifications-outline', label: 'Thông báo', route: '/guide-notifications', color: '#4f7cff' },
] as const;

export default function GuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile,      setProfile]      = useState<GuideProfile>(DEFAULT_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  const [form,         setForm]         = useState<GuideProfile>(DEFAULT_PROFILE);
  const [saving,       setSaving]       = useState(false);
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  // Guide pause modal
  const [pauseModal,   setPauseModal]   = useState(false);
  const [hideFromList, setHideFromList] = useState(false);

  useFocusEffect(useCallback(() => {
    // Load từ @guide_profile
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) { const p = JSON.parse(raw); setProfile(p); setForm(p); }
      else setForm(DEFAULT_PROFILE);
    }).catch(() => {});
    // Load session để biết guideId và trạng thái
    getCurrentUser().then(u => { if (u) setCurrentUser(u); });
  }, []));

  const persist = useCallback(async (data: GuideProfile) => {
    setProfile(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    // Sync sang @app_guides để guest home thấy ngay
    const guideId = data.guideId ?? currentUser?.guideId ?? 'g1';
    await syncGuideProfileToPublic(guideId, {
      name:       data.name,
      location:   data.location,
      experience: data.experience,
      skills:     data.skills,
      bio:        data.bio,
      phone:      data.phone,
      email:      data.email,
    });
  }, [currentUser]);

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng điền họ tên.'); return; }
    setSaving(true); await persist(form); setSaving(false); setModalVisible(false);
    Alert.alert('Đã lưu', 'Thông tin đã cập nhật và đồng bộ lên danh sách HDV.');
  };

  // Switch sang tài khoản khách
  const handleSwitchToGuest = () => {
    if (!currentUser) return;
    Alert.alert('Chuyển sang tài khoản Khách', 'Bạn có muốn chuyển sang chế độ khách không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chuyển đổi', onPress: async () => {
        const res = await switchRole(currentUser.accountId, 'guest');
        if (res.ok) router.replace('/');
        else Alert.alert('Lỗi', res.error || 'Không thể chuyển đổi.');
      }},
    ]);
  };

  // Xử lý tạm dừng / kích hoạt lại tài khoản HDV
  const handlePause = async () => {
    if (!currentUser) return;
    const isBusy = currentUser.guideStatus === 'busy' || currentUser.guideStatus === 'paused';
    if (isBusy) {
      // Kích hoạt lại
      await setGuideStatus(currentUser.accountId, 'active', false);
      getCurrentUser().then(u => setCurrentUser(u));
      Alert.alert('Đã kích hoạt', 'Tài khoản HDV đã được kích hoạt trở lại.');
    } else {
      setPauseModal(true);
    }
  };

  const confirmPause = async () => {
    if (!currentUser) return;
    await setGuideStatus(currentUser.accountId, 'paused', hideFromList);
    getCurrentUser().then(u => setCurrentUser(u));
    setPauseModal(false);
    Alert.alert('Đã tạm dừng', hideFromList ? 'Tài khoản HDV đã ẩn khỏi danh sách tìm kiếm.' : 'Tài khoản HDV đánh dấu bận. Vẫn hiển thị nhưng không nhận tour mới.');
  };

  const f = (k: keyof GuideProfile, v: string) => setForm(p => ({ ...p, [k]: v }));
  const skills = profile.skills.split(',').map(x => x.trim()).filter(Boolean);
  const langs  = profile.languages.split(',').map(x => x.trim()).filter(Boolean);
  const isPaused = currentUser?.guideStatus === 'paused' || currentUser?.guideStatus === 'busy';
  const hasGuestRole = currentUser?.roles?.includes('guest') || true; // demo always true

  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>
      <Text style={st.pageTitle}>Tài khoản HDV</Text>

      {/* Profile Card */}
      <View style={st.profileCard}>
        <View style={st.avatar}><Ionicons name="person" size={30} color="#fff" /></View>
        <View style={st.profileInfo}>
          <Text style={st.name}>{profile.name}</Text>
          <Text style={st.subInfo}>{profile.location} · {profile.experience} KN</Text>
          <View style={st.hdvBadge}><Ionicons name="shield-checkmark" size={11} color="#2856d6" /><Text style={st.hdvBadgeTxt}>HDV Đã xác minh</Text></View>
        </View>
        <TouchableOpacity onPress={() => router.push('/login' as any)}>
          <Ionicons name="log-out-outline" size={22} color="#7a8cc2" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={st.statsCard}>
        {[
          { label: 'Đánh giá', val: '4.8⭐', color: '#f59e0b' },
          { label: 'Tours xong', val: '142', color: '#2856d6' },
          { label: 'Booking', val: '5', color: '#16a34a' },
          { label: 'Kinh nghiệm', val: profile.experience, color: '#a855f7' },
        ].map((item, i, arr) => (
          <View key={item.label} style={[st.statItem, i < arr.length - 1 && st.statBorder]}>
            <Text style={[st.statVal, { color: item.color }]}>{item.val}</Text>
            <Text style={st.statLbl}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Bio */}
      <View style={st.infoCard}>
        <View style={st.infoCardHeader}><Ionicons name="person-outline" size={16} color="#2856d6" /><Text style={st.infoCardTitle}>Giới thiệu</Text></View>
        <Text style={st.bioTxt}>{profile.bio || 'Chưa có giới thiệu.'}</Text>
      </View>

      {/* Skills + Languages */}
      <View style={st.infoCard}>
        <View style={st.infoCardHeader}><Ionicons name="briefcase-outline" size={16} color="#2856d6" /><Text style={st.infoCardTitle}>Kỹ năng & Ngôn ngữ</Text></View>
        <View style={st.chipsWrap}>
          {skills.map(sk => <View key={sk} style={st.skillChip}><Text style={st.skillChipTxt}>{sk}</Text></View>)}
        </View>
        <View style={[st.chipsWrap, { marginTop: 8 }]}>
          {langs.map(l => <View key={l} style={[st.skillChip, { backgroundColor: '#f3e8ff' }]}><Ionicons name="language-outline" size={11} color="#a855f7" /><Text style={[st.skillChipTxt, { color: '#a855f7' }]}>{l}</Text></View>)}
        </View>
      </View>

      {/* Certifications */}
      <View style={st.infoCard}>
        <View style={st.infoCardHeader}><Ionicons name="ribbon-outline" size={16} color="#2856d6" /><Text style={st.infoCardTitle}>Chứng chỉ & Bằng cấp</Text></View>
        {profile.certifications.split(',').map(c => c.trim()).filter(Boolean).map(cert => (
          <View key={cert} style={st.certRow}><Ionicons name="checkmark-circle" size={14} color="#16a34a" /><Text style={st.certTxt}>{cert}</Text></View>
        ))}
      </View>

      {/* Contact */}
      <View style={st.infoCard}>
        <View style={st.infoCardHeader}><Ionicons name="call-outline" size={16} color="#2856d6" /><Text style={st.infoCardTitle}>Liên hệ</Text></View>
        {[{ icon: 'call-outline', val: profile.phone }, { icon: 'mail-outline', val: profile.email }, { icon: 'card-outline', val: `${profile.bankName}: ${profile.bankAccount}` }].map((item, i) => (
          <View key={i} style={st.contactRow}>
            <Ionicons name={item.icon as any} size={14} color="#7a8cc2" />
            <Text style={st.contactTxt}>{item.val}</Text>
          </View>
        ))}
      </View>

      {/* Edit profile button */}
      <TouchableOpacity style={st.editBtn} onPress={() => { setForm(profile); setModalVisible(true); }}>
        <Ionicons name="create-outline" size={18} color="#2856d6" /><Text style={st.editBtnTxt}>Chỉnh sửa thông tin</Text>
      </TouchableOpacity>

      {/* Menu */}
      <Text style={st.sectionTitle}>Chức năng</Text>
      {MENU_ITEMS.map((item, i) => (
        <TouchableOpacity key={i} style={st.menuItem} onPress={() => router.push(item.route as any)} activeOpacity={0.75}>
          <View style={[st.menuIcon, { backgroundColor: item.color + '18' }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
          <Text style={st.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {/* Switch role + pause card */}
      <View style={st.switchCard}>
        <Text style={st.switchCardTitle}>Chuyển đổi & Trạng thái</Text>

        {/* Pause / Resume */}
        <TouchableOpacity style={[st.switchRow, isPaused && { backgroundColor: '#fff8ec' }]} onPress={handlePause}>
          <View style={[st.switchIcon, { backgroundColor: isPaused ? '#fde68a' : '#edf2ff' }]}>
            <Ionicons name={isPaused ? 'play-circle-outline' : 'pause-circle-outline'} size={20} color={isPaused ? '#d97706' : '#4f7cff'}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.switchLabel, isPaused && { color: '#d97706' }]}>
              {isPaused ? 'Kích hoạt lại tài khoản HDV' : 'Tạm dừng nhận tour'}
            </Text>
            <Text style={st.switchSub}>
              {isPaused ? 'Tài khoản đang tạm dừng' : 'Ẩn hoặc đánh dấu bận'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#c0cbe8"/>
        </TouchableOpacity>

        {/* Switch to guest */}
        {hasGuestRole && (
          <TouchableOpacity style={st.switchRow} onPress={handleSwitchToGuest}>
            <View style={[st.switchIcon, { backgroundColor: '#edf9f0' }]}>
              <Ionicons name="person-circle-outline" size={20} color="#16a34a"/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.switchLabel}>Chuyển sang tài khoản Khách</Text>
              <Text style={st.switchSub}>Duyệt tour, đặt chỗ như khách thường</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8"/>
          </TouchableOpacity>
        )}
      </View>

      {/* Pause modal */}
      <Modal visible={pauseModal} animationType="fade" transparent onRequestClose={() => setPauseModal(false)}>
        <View style={st.pauseOverlay}>
          <View style={st.pauseBox}>
            <Text style={st.pauseTitle}>Tạm dừng tài khoản HDV</Text>
            <Text style={st.pauseSub}>Chọn cách tạm dừng phù hợp:</Text>
            <TouchableOpacity style={[st.pauseOpt, !hideFromList && st.pauseOptActive]} onPress={() => setHideFromList(false)}>
              <Ionicons name="eye-outline" size={18} color="#4f7cff"/>
              <View style={{ flex: 1 }}>
                <Text style={st.pauseOptTxt}>Đánh dấu Bận</Text>
                <Text style={st.pauseOptSub}>Vẫn hiển thị tên, nhưng không nhận tour mới</Text>
              </View>
              {!hideFromList && <Ionicons name="checkmark-circle" size={18} color="#4f7cff"/>}
            </TouchableOpacity>
            <TouchableOpacity style={[st.pauseOpt, hideFromList && st.pauseOptActive]} onPress={() => setHideFromList(true)}>
              <Ionicons name="eye-off-outline" size={18} color="#7a8cc2"/>
              <View style={{ flex: 1 }}>
                <Text style={st.pauseOptTxt}>Ẩn khỏi danh sách</Text>
                <Text style={st.pauseOptSub}>Khách không tìm thấy bạn trong kết quả</Text>
              </View>
              {hideFromList && <Ionicons name="checkmark-circle" size={18} color="#4f7cff"/>}
            </TouchableOpacity>
            <View style={st.pauseBtnRow}>
              <TouchableOpacity style={st.pauseCancelBtn} onPress={() => setPauseModal(false)}>
                <Text style={{ color:'#7a8cc2',fontWeight:'600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.pauseConfirmBtn} onPress={confirmPause}>
                <Text style={{ color:'#fff',fontWeight:'700' }}>Xác nhận tạm dừng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={st.logoutBtn} onPress={() => router.push('/login' as any)}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" /><Text style={st.logoutTxt}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.mheader}>
              <Text style={st.mtitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={st.mbody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FL t="Họ và tên *" /><TextInput style={st.input} value={form.name} onChangeText={v => f('name', v)} placeholderTextColor="#b0bdd8" />
              <FL t="Số điện thoại" /><TextInput style={st.input} value={form.phone} onChangeText={v => f('phone', v)} keyboardType="phone-pad" placeholderTextColor="#b0bdd8" />
              <FL t="Email" /><TextInput style={st.input} value={form.email} onChangeText={v => f('email', v)} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#b0bdd8" />
              <FL t="Địa điểm hoạt động" /><TextInput style={st.input} value={form.location} onChangeText={v => f('location', v)} placeholderTextColor="#b0bdd8" />
              <FL t="Kinh nghiệm" /><TextInput style={st.input} value={form.experience} onChangeText={v => f('experience', v)} placeholder="VD: 5 năm" placeholderTextColor="#b0bdd8" />
              <FL t="Giới thiệu bản thân" /><TextInput style={[st.input, { minHeight: 80, paddingTop: 12 }]} value={form.bio} onChangeText={v => f('bio', v)} multiline textAlignVertical="top" placeholderTextColor="#b0bdd8" />
              <FL t="Kỹ năng (cách dấu phẩy)" /><TextInput style={st.input} value={form.skills} onChangeText={v => f('skills', v)} placeholder="Biển đảo, Trekking..." placeholderTextColor="#b0bdd8" />
              <FL t="Ngôn ngữ (cách dấu phẩy)" /><TextInput style={st.input} value={form.languages} onChangeText={v => f('languages', v)} placeholder="Tiếng Việt, Tiếng Anh..." placeholderTextColor="#b0bdd8" />
              <FL t="Chứng chỉ (cách dấu phẩy)" /><TextInput style={st.input} value={form.certifications} onChangeText={v => f('certifications', v)} placeholder="Thẻ HDV, Sơ cấp cứu..." placeholderTextColor="#b0bdd8" />
              <FL t="Ngân hàng" /><TextInput style={st.input} value={form.bankName} onChangeText={v => f('bankName', v)} placeholder="Vietcombank" placeholderTextColor="#b0bdd8" />
              <FL t="Số tài khoản" /><TextInput style={st.input} value={form.bankAccount} onChangeText={v => f('bankAccount', v)} keyboardType="numeric" placeholderTextColor="#b0bdd8" />
              <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={st.saveBtnTxt}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const FL = ({ t }: { t: string }) => <Text style={st.formLabel}>{t}</Text>;

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 18 },
  pageTitle: { color: '#1a2f7a', fontSize: 26, fontWeight: '700', marginBottom: 14 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#2856d6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#eaf0ff' },
  profileInfo: { flex: 1 },
  name: { color: '#1a2f7a', fontWeight: '800', fontSize: 17 },
  subInfo: { color: '#7a8cc2', fontSize: 12, marginTop: 3 },
  hdvBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, backgroundColor: '#eaf0ff', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hdvBadgeTxt: { color: '#2856d6', fontSize: 11, fontWeight: '700' },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e4ebff' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: '#e4ebff' },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#7a8cc2', marginTop: 2, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e4ebff' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoCardTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 14 },
  bioTxt: { color: '#334155', fontSize: 13, lineHeight: 20 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eaf0ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  skillChipTxt: { color: '#2856d6', fontSize: 12, fontWeight: '600' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  certTxt: { color: '#334155', fontSize: 13 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  contactTxt: { color: '#334155', fontSize: 13 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, marginBottom: 18, borderWidth: 1.5, borderColor: '#dfe7ff' },
  editBtnTxt: { color: '#2856d6', fontWeight: '700', fontSize: 14 },
  sectionTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 15, marginBottom: 10 },
  menuItem: { marginBottom: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { color: '#1a2f7a', fontWeight: '600', flex: 1 },
  logoutBtn: { marginTop: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutTxt: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  mheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  mtitle: { fontSize: 17, fontWeight: '800', color: '#1a2f7a' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center' },
  mbody: { paddingHorizontal: 20, paddingTop: 8 },
  formLabel: { color: '#1a2f7a', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f0f4ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1a2f7a', fontSize: 14 },
  saveBtn: { marginTop: 20, backgroundColor: '#2856d6', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Switch role + pause
  switchCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 12 },
  switchCardTitle: { color: '#1a2f7a', fontWeight: '700', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderRadius: 12 },
  switchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  switchLabel: { color: '#1a2f7a', fontWeight: '700', fontSize: 14 },
  switchSub: { color: '#7a8cc2', fontSize: 12, marginTop: 2 },
  // Pause modal
  pauseOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(10,18,50,0.45)', padding: 24 },
  pauseBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  pauseTitle: { color: '#1f2a58', fontWeight: '800', fontSize: 17, marginBottom: 6 },
  pauseSub: { color: '#7a8cc2', fontSize: 13, marginBottom: 14 },
  pauseOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f3f7ff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e4ebff' },
  pauseOptActive: { borderColor: '#4f7cff', backgroundColor: '#edf2ff' },
  pauseOptTxt: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  pauseOptSub: { color: '#7a8cc2', fontSize: 12, marginTop: 2 },
  pauseBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  pauseCancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', alignItems: 'center', justifyContent: 'center' },
  pauseConfirmBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center' },
});