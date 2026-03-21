/**
 * app/(tabs)/profile.tsx  –  Profile Guest
 *
 * - Không dùng @/constants/shared-data (tránh lỗi module not found)
 * - Đọc/ghi trực tiếp AsyncStorage: @app_profile
 * - Đọc @app_current_user để biết có role guide không
 * - Dual role: nút "Chuyển sang HDV" hoặc "Đăng ký làm HDV"
 * - Modal edit đầy đủ thông tin + chọn màu avatar
 * - Logout gọi logoutAccount() từ app-accounts
 */
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

import { getCurrentUser, logoutAccount, switchRole } from '@/constants/app-accounts';

// ─── Types (tự định nghĩa, không import từ shared-data) ──────
interface GuestProfile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  voucher: string;
  avatarColor: string;
}

const DEFAULT_PROFILE: GuestProfile = {
  name: 'Nguyễn An',
  email: 'guest1@gmail.com',
  phone: '0901 234 567',
  dob: '01/01/1995',
  address: 'TP. Hồ Chí Minh',
  loyaltyPoints: 1200,
  loyaltyTier: 'Loyal',
  voucher: 'SUMMER2026',
  avatarColor: '#4f7cff',
};

// ─── AsyncStorage helpers ─────────────────────────────────────
async function loadProfile(): Promise<GuestProfile> {
  try {
    const raw = await AsyncStorage.getItem('@app_profile');
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

async function persistProfile(p: GuestProfile): Promise<void> {
  try {
    await AsyncStorage.setItem('@app_profile', JSON.stringify(p));
  } catch {}
}

// ─── Component ────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile,      setProfile]      = useState<GuestProfile>(DEFAULT_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  const [form,         setForm]         = useState<GuestProfile>(DEFAULT_PROFILE);
  const [saving,       setSaving]       = useState(false);
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  const [loaded,       setLoaded]       = useState(false);

  // Reload mỗi khi tab được focus
  useFocusEffect(
    useCallback(() => {
      loadProfile().then(p => {
        setProfile(p);
        setForm(p);
        setLoaded(true);
      });
      getCurrentUser().then(u => setCurrentUser(u));
    }, [])
  );

  // ── Save profile ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền họ tên.');
      return;
    }
    setSaving(true);
    await persistProfile(form);
    setProfile(form);
    setSaving(false);
    setModalVisible(false);
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = async () => {
    await logoutAccount();
    router.replace('/login' as any);
  };

  // ── Switch to guide role ──────────────────────────────────
  const handleSwitchToGuide = async () => {
    if (!currentUser) return;
    const res = await switchRole(currentUser.accountId, 'guide');
    if (res.ok) router.replace('/guide-home' as any);
    else Alert.alert('Lỗi', res.error || 'Không thể chuyển đổi.');
  };

  // ── Derived state ─────────────────────────────────────────
  const isGuideAlso = currentUser?.roles?.includes('guide') ?? false;

  const setField = (key: keyof GuestProfile, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const tierColors: Record<string, string> = {
    Member: '#7a8cc2', Loyal: '#ffbe40', Gold: '#f59e0b', Platinum: '#a855f7',
  };
  const tierColor = tierColors[profile.loyaltyTier] ?? '#4f7cff';

  if (!loaded) return <View style={st.screen} />;

  return (
    <ScrollView
      style={st.screen}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>

      <Text style={st.title}>Tài khoản</Text>

      {/* ── Profile card ── */}
      <View style={st.profileCard}>
        <View style={[st.avatar, { backgroundColor: profile.avatarColor }]}>
          <Text style={st.avatarInitial}>{(profile.name || 'U').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={st.profileInfo}>
          <Text style={st.name}>{profile.name}</Text>
          <Text style={st.email}>{profile.email}</Text>
          {!!profile.phone && <Text style={st.phone}>{profile.phone}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#7a8cc2" />
        </TouchableOpacity>
      </View>

      {/* ── Loyalty card ── */}
      <View style={st.crmCard}>
        <View style={st.crmRow}>
          <Text style={st.crmTitle}>Điểm tích lũy</Text>
          <Text style={[st.crmPoints, { color: '#4f7cff' }]}>
            {profile.loyaltyPoints.toLocaleString('vi-VN')} điểm
          </Text>
        </View>
        <View style={st.crmRow}>
          <Text style={st.crmMeta}>Cấp thành viên</Text>
          <View style={[st.tierBadge, { backgroundColor: tierColor + '22' }]}>
            <Text style={[st.tierTxt, { color: tierColor }]}>{profile.loyaltyTier}</Text>
          </View>
        </View>
        {!!profile.voucher && (
          <View style={st.voucherRow}>
            <Ionicons name="ticket-outline" size={14} color="#4f7cff" />
            <Text style={st.voucherTxt}>
              Voucher: <Text style={st.voucherCode}>{profile.voucher}</Text>
            </Text>
          </View>
        )}
        <View style={st.progressWrap}>
          <View style={st.progressBg}>
            <View
              style={[
                st.progressFill,
                { width: `${Math.min((profile.loyaltyPoints % 1000) / 10, 100)}%` as any },
              ]}
            />
          </View>
          <Text style={st.progressHint}>
            {1000 - (profile.loyaltyPoints % 1000)} điểm đến tier tiếp theo
          </Text>
        </View>
      </View>

      {/* ── Edit button ── */}
      <TouchableOpacity
        style={st.editBtn}
        onPress={() => { setForm(profile); setModalVisible(true); }}>
        <Ionicons name="create-outline" size={17} color="#4f7cff" />
        <Text style={st.editBtnTxt}>Chỉnh sửa thông tin cá nhân</Text>
      </TouchableOpacity>

      {/* ── Menu items ── */}
      {([
        { href: '/guest_notifications', icon: 'notifications-outline', label: 'Thông báo' },
        { href: '/guest_favorites',     icon: 'heart-outline',         label: 'Tour yêu thích' },
        { href: '/bookings',            icon: 'receipt-outline',       label: 'Lịch sử đặt tour' },
        { href: '/guest_booking_flow',  icon: 'map-outline',           label: 'Đặt tour mới' },
      ] as const).map(item => (
        <TouchableOpacity
          key={item.href}
          style={st.menuItem}
          onPress={() => router.push(item.href as any)}>
          <View style={st.menuIcon}>
            <Ionicons name={item.icon} size={20} color="#4f7cff" />
          </View>
          <Text style={st.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {/* ── Dual role card ── */}
      <View style={st.dualCard}>
        <Text style={st.dualTitle}>Vai trò & Tài khoản</Text>
        {isGuideAlso ? (
          <TouchableOpacity style={st.dualRow} onPress={handleSwitchToGuide}>
            <View style={[st.dualIcon, { backgroundColor: '#edf9f0' }]}>
              <Ionicons name="map-outline" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dualLabel}>Chuyển sang tài khoản HDV</Text>
              <Text style={st.dualSub}>Quản lý lịch, nhận tour, thu nhập</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={st.dualRow}
            onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[st.dualIcon, { backgroundColor: '#edf2ff' }]}>
              <Ionicons name="person-add-outline" size={20} color="#4f7cff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dualLabel}>Đăng ký làm Hướng dẫn viên</Text>
              <Text style={st.dualSub}>Kiếm thu nhập từ đam mê du lịch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={st.logoutTxt}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* ── Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={st.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={st.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.mheader}>
              <Text style={st.mtitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={st.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={st.mbody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              {/* Avatar color picker */}
              <Label t="Màu avatar" />
              <View style={st.colorRow}>
                {['#4f7cff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[st.colorDot, { backgroundColor: c }, form.avatarColor === c && st.colorDotActive]}
                    onPress={() => setField('avatarColor', c)}>
                    {form.avatarColor === c && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Label t="Họ và tên *" />
              <TextInput
                style={st.input}
                value={form.name}
                onChangeText={v => setField('name', v)}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Email" />
              <TextInput
                style={st.input}
                value={form.email}
                onChangeText={v => setField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Số điện thoại" />
              <TextInput
                style={st.input}
                value={form.phone}
                onChangeText={v => setField('phone', v)}
                keyboardType="phone-pad"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Ngày sinh" />
              <TextInput
                style={st.input}
                value={form.dob}
                onChangeText={v => setField('dob', v)}
                placeholder="VD: 01/01/1995"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Địa chỉ" />
              <TextInput
                style={st.input}
                value={form.address}
                onChangeText={v => setField('address', v)}
                placeholder="VD: TP. Hồ Chí Minh"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Voucher" />
              <TextInput
                style={st.input}
                value={form.voucher}
                onChangeText={v => setField('voucher', v.toUpperCase())}
                autoCapitalize="characters"
                placeholder="VD: SUMMER2026"
                placeholderTextColor="#b0bdd8"
              />

              <TouchableOpacity
                style={[st.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={st.saveBtnTxt}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ─── Small helpers ────────────────────────────────────────────
const Label = ({ t }: { t: string }) => <Text style={st.formLabel}>{t}</Text>;

// ─── Styles ───────────────────────────────────────────────────
const st = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  title:   { color: '#1f2a58', fontSize: 26, fontWeight: '700', marginBottom: 14 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e4ebff', padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12, marginBottom: 14,
  },
  avatar:        { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo:   { flex: 1 },
  name:          { color: '#1f2a58', fontWeight: '700', fontSize: 16 },
  email:         { color: '#7a8cc2', marginTop: 3, fontSize: 13 },
  phone:         { color: '#5f73a9', marginTop: 2, fontSize: 12 },

  crmCard:      { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 16, marginBottom: 14, gap: 10 },
  crmRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crmTitle:     { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  crmPoints:    { fontWeight: '800', fontSize: 16 },
  crmMeta:      { color: '#7a8cc2', fontSize: 13 },
  tierBadge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tierTxt:      { fontWeight: '800', fontSize: 13 },
  voucherRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voucherTxt:   { color: '#7a8cc2', fontSize: 13 },
  voucherCode:  { color: '#4f7cff', fontWeight: '700' },
  progressWrap: { gap: 5 },
  progressBg:   { height: 5, backgroundColor: '#e4ebff', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f7cff', borderRadius: 4 },
  progressHint: { color: '#7a8cc2', fontSize: 11 },

  editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#dfe7ff', paddingVertical: 12, marginBottom: 18 },
  editBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 14 },

  menuItem: { marginBottom: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  menuText: { color: '#1f2a58', fontWeight: '600', flex: 1 },

  dualCard:  { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 12 },
  dualTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  dualRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dualIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dualLabel: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  dualSub:   { color: '#7a8cc2', fontSize: 12, marginTop: 2 },

  logoutBtn: { marginTop: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutTxt: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle:   { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  mheader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  mtitle:   { fontSize: 17, fontWeight: '800', color: '#1f2a58' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  mbody:    { paddingHorizontal: 20, paddingTop: 8 },

  formLabel:     { color: '#1f2a58', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input:         { backgroundColor: '#f3f7ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1f2a58', fontSize: 14 },
  colorRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  colorDot:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorDotActive:{ borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  saveBtn:       { marginTop: 20, backgroundColor: '#4f7cff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },
});