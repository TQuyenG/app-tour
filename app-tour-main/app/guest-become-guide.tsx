/**
 * guest-become-guide.tsx
 *
 * Fix:
 *  1. Nếu @app_current_user chưa có (demo login cũ) → fallback đọc @app_profile
 *  2. Button không bao giờ bị block im lặng — luôn có thông báo rõ ràng
 *  3. Thông tin cá nhân tự điền từ data đã có (profile hoặc session)
 *  4. submitGuideRequest không cần accountId bắt buộc — fallback sang id tạm
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPendingGuideRequests, submitGuideRequest } from '@/constants/app-accounts';

// ─── Load user info từ mọi nguồn có thể ─────────────────────
async function loadUserInfo(): Promise<{
  accountId: string; name: string; email: string; phone: string;
  roles: string[];
}> {
  // Thử session trước
  try {
    const sessionRaw = await AsyncStorage.getItem('@app_current_user');
    if (sessionRaw) {
      const s = JSON.parse(sessionRaw);
      if (s.name) return {
        accountId: s.accountId || `guest-${Date.now()}`,
        name:      s.name  || '',
        email:     s.email || '',
        phone:     s.phone || '',
        roles:     s.roles || ['guest'],
      };
    }
  } catch {}

  // Fallback: @app_profile (guest profile)
  try {
    const profileRaw = await AsyncStorage.getItem('@app_profile');
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      return {
        accountId: `guest-${Date.now()}`,
        name:      p.name  || '',
        email:     p.email || '',
        phone:     p.phone || '',
        roles:     ['guest'],
      };
    }
  } catch {}

  return { accountId: `guest-${Date.now()}`, name: '', email: '', phone: '', roles: ['guest'] };
}

export default function GuestBecomeGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userInfo,   setUserInfo]   = useState<{ accountId:string; name:string; email:string; phone:string; roles:string[] } | null>(null);
  const [existing,   setExisting]   = useState<any>(null);
  const [loadingInit,setLoadingInit]= useState(true);
  const [loading,    setLoading]    = useState(false);

  // Form fields — pre-filled sau khi load
  const [bio,        setBio]        = useState('');
  const [skills,     setSkills]     = useState('');
  const [languages,  setLanguages]  = useState('Tiếng Việt');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    Promise.all([
      loadUserInfo(),
      getPendingGuideRequests(),
    ]).then(([info, reqs]) => {
      setUserInfo(info);
      // Tìm request của user hiện tại (dùng email để match vì accountId có thể thay đổi)
      const myReq = reqs.find(r =>
        r.email === info.email || r.accountId === info.accountId
      );
      if (myReq && myReq.status !== 'rejected') setExisting(myReq);
      setLoadingInit(false);
    });
  }, []);

  const handleSubmit = async () => {
    // Validate từng field với thông báo cụ thể
    if (!bio.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập phần Giới thiệu bản thân.');
      return;
    }
    if (!skills.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Kỹ năng của bạn.');
      return;
    }
    if (!experience.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Kinh nghiệm (VD: 3 năm).');
      return;
    }
    if (!languages.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Ngôn ngữ.');
      return;
    }

    // Nếu chưa có thông tin user → vẫn cho gửi với thông báo
    const info = userInfo ?? { accountId: `guest-${Date.now()}`, name: '---', email: '---', phone: '---', roles: ['guest'] };

    setLoading(true);
    try {
      await submitGuideRequest(
        info.accountId,
        info.name,
        info.email,
        info.phone,
        bio.trim(),
        skills.trim(),
        languages.trim(),
        experience.trim(),
      );
      setLoading(false);
      Alert.alert(
        '✅ Đã gửi yêu cầu!',
        'Admin sẽ xét duyệt và thông báo kết quả trong 1-3 ngày làm việc. Bạn có thể kiểm tra trạng thái tại đây bất kỳ lúc nào.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    }
  };

  const alreadyGuide = userInfo?.roles?.includes('guide');

  // ── Loading ─────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <View style={st.loadingWrap}>
        <Text style={st.loadingTxt}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={st.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#4f7cff"/>
          <Text style={st.backTxt}>Quay lại</Text>
        </TouchableOpacity>

        <Text style={st.title}>Trở thành Hướng dẫn viên</Text>
        <Text style={st.sub}>Chia sẻ kiến thức địa phương và kiếm thu nhập từ đam mê du lịch</Text>

        {/* ── Lợi ích ── */}
        <View style={st.benefitsCard}>
          {[
            { icon: 'cash-outline',             txt: 'Thu nhập 500.000đ – 2.000.000đ / tour' },
            { icon: 'star-outline',             txt: 'Xây dựng danh tiếng qua đánh giá khách' },
            { icon: 'shield-checkmark-outline', txt: 'Bảo vệ bởi chính sách Escrow TourGo' },
            { icon: 'people-outline',           txt: 'Kết nối hàng ngàn khách mỗi tháng' },
          ].map((item, i) => (
            <View key={i} style={st.benefitRow}>
              <View style={st.benefitIcon}>
                <Ionicons name={item.icon as any} size={18} color="#4f7cff"/>
              </View>
              <Text style={st.benefitTxt}>{item.txt}</Text>
            </View>
          ))}
        </View>

        {/* ── Đã là HDV ── */}
        {alreadyGuide ? (
          <View style={[st.statusCard, { borderColor: '#bbf7d0' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#16a34a"/>
            <Text style={st.statusTitle}>Bạn đã là Hướng dẫn viên!</Text>
            <Text style={st.statusSub}>Chuyển sang tab HDV để quản lý lịch và nhận tour.</Text>
            <TouchableOpacity style={st.statusBtn} onPress={() => router.push('/guide-home' as any)}>
              <Text style={st.statusBtnTxt}>Vào trang HDV</Text>
            </TouchableOpacity>
          </View>

        /* ── Đang chờ / bị từ chối ── */
        ) : existing ? (
          <View style={[st.statusCard, {
            borderColor: existing.status === 'pending' ? '#fde68a' : '#fecaca',
            backgroundColor: existing.status === 'pending' ? '#fffbeb' : '#fff5f5',
          }]}>
            <Ionicons
              name={existing.status === 'pending' ? 'hourglass-outline' : 'close-circle'}
              size={48}
              color={existing.status === 'pending' ? '#d97706' : '#ef4444'}/>
            <Text style={st.statusTitle}>
              {existing.status === 'pending' ? 'Đang chờ Admin xét duyệt' : 'Yêu cầu bị từ chối'}
            </Text>
            <Text style={st.statusSub}>
              {existing.status === 'pending'
                ? 'Chúng tôi sẽ thông báo kết quả trong 1-3 ngày làm việc.'
                : `Lý do: ${existing.note || 'Không đáp ứng yêu cầu hiện tại'}`}
            </Text>
            {existing.status === 'rejected' && (
              <TouchableOpacity style={[st.statusBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => setExisting(null)}>
                <Text style={st.statusBtnTxt}>Gửi lại yêu cầu</Text>
              </TouchableOpacity>
            )}
          </View>

        /* ── Form đăng ký ── */
        ) : (
          <>
            {/* Thông tin cá nhân (tự điền) */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Text style={st.sectionTitle}>Thông tin cá nhân</Text>
                <View style={st.autoFillBadge}>
                  <Ionicons name="checkmark-circle-outline" size={12} color="#16a34a"/>
                  <Text style={st.autoFillTxt}>Tự điền</Text>
                </View>
              </View>
              <View style={st.infoCard}>
                <InfoRow label="Họ tên" val={userInfo?.name || ''} placeholder="Chưa có — vui lòng cập nhật Profile"/>
                <InfoRow label="Email"  val={userInfo?.email || ''} placeholder="Chưa có email"/>
                <InfoRow label="SĐT"    val={userInfo?.phone || ''} placeholder="Chưa có số điện thoại"/>
              </View>
              {(!userInfo?.name || !userInfo?.email) && (
                <Text style={st.infoWarning}>
                  ⚠️ Thông tin chưa đầy đủ. Hãy cập nhật Profile trước khi gửi yêu cầu.
                </Text>
              )}
            </View>

            {/* Giới thiệu */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Giới thiệu bản thân <Text style={st.required}>*</Text></Text>
              <TextInput
                style={st.textArea}
                placeholder="Mô tả kinh nghiệm, điểm mạnh và phong cách dẫn tour của bạn..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={bio}
                onChangeText={setBio}
                placeholderTextColor="#b0bdd8"
              />
              <Text style={st.charCount}>{bio.length} ký tự</Text>
            </View>

            {/* Kỹ năng */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Kỹ năng <Text style={st.required}>*</Text></Text>
              <TextInput
                style={st.inputField}
                placeholder="VD: Biển đảo, Trekking, Ẩm thực, Nhiếp ảnh"
                value={skills}
                onChangeText={setSkills}
                placeholderTextColor="#b0bdd8"
              />
              <Text style={st.fieldHint}>Cách nhau bằng dấu phẩy</Text>
            </View>

            {/* Ngôn ngữ */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Ngôn ngữ <Text style={st.required}>*</Text></Text>
              <TextInput
                style={st.inputField}
                placeholder="VD: Tiếng Việt, Tiếng Anh"
                value={languages}
                onChangeText={setLanguages}
                placeholderTextColor="#b0bdd8"
              />
            </View>

            {/* Kinh nghiệm */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Kinh nghiệm <Text style={st.required}>*</Text></Text>
              <TextInput
                style={st.inputField}
                placeholder="VD: 3 năm, 5 năm, mới bắt đầu..."
                value={experience}
                onChangeText={setExperience}
                placeholderTextColor="#b0bdd8"
              />
            </View>

            {/* Note */}
            <View style={st.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color="#4f7cff"/>
              <Text style={st.noteTxt}>
                Sau khi gửi, Admin sẽ xét duyệt và thông báo kết quả.
                Khi được duyệt, tài khoản của bạn sẽ có thêm quyền Hướng dẫn viên và
                có thể chuyển đổi qua lại tự do.
              </Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[st.submitBtn, loading && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff"/>
              <Text style={st.submitBtnTxt}>
                {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đăng ký HDV'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Info row helper ──────────────────────────────────────────
function InfoRow({ label, val, placeholder }: { label: string; val: string; placeholder: string }) {
  const isEmpty = !val.trim();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4ff',
    }}>
      <Text style={{ color: '#7a8cc2', fontSize: 13, width: 60 }}>{label}</Text>
      <Text style={{
        flex: 1, textAlign: 'right', fontSize: 13, fontWeight: isEmpty ? '400' : '600',
        color: isEmpty ? '#c0cbe8' : '#1f2a58',
      }}>
        {isEmpty ? placeholder : val}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f3f7ff' },
  content:     { padding: 18 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff' },
  loadingTxt:  { color: '#7a8cc2', fontWeight: '600' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backTxt: { color: '#4f7cff', fontWeight: '600' },
  title:   { color: '#1f2a58', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  sub:     { color: '#7a8cc2', lineHeight: 20, marginBottom: 18 },

  benefitsCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e4ebff', padding: 16, marginBottom: 20, gap: 12,
  },
  benefitRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  benefitTxt:  { flex: 1, color: '#1f2a58', fontSize: 13, fontWeight: '600' },

  statusCard:  { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 12 },
  statusTitle: { color: '#1f2a58', fontWeight: '800', fontSize: 18, textAlign: 'center' },
  statusSub:   { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
  statusBtn:   { backgroundColor: '#4f7cff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  statusBtnTxt:{ color: '#fff', fontWeight: '700' },

  section:       { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle:  { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  required:      { color: '#ef4444' },
  autoFillBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#edf9f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  autoFillTxt:   { color: '#16a34a', fontSize: 11, fontWeight: '700' },

  infoCard:    { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 12 },
  infoWarning: { color: '#d97706', fontSize: 12, marginTop: 8, lineHeight: 18 },

  textArea:   { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', padding: 14, minHeight: 110, color: '#1f2a58', fontSize: 14, lineHeight: 22 },
  inputField: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 13, color: '#1f2a58', fontSize: 14 },
  fieldHint:  { color: '#94a3b8', fontSize: 11, marginTop: 5 },
  charCount:  { color: '#94a3b8', fontSize: 11, marginTop: 5, textAlign: 'right' },

  noteBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#edf2ff', borderRadius: 12, padding: 12, marginBottom: 16 },
  noteTxt:  { flex: 1, color: '#4f7cff', fontSize: 12, lineHeight: 18 },

  submitBtn: {
    height: 54, borderRadius: 14, backgroundColor: '#4f7cff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 4, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  submitBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});