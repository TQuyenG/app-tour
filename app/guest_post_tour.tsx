/**
 * app/guest_post_tour.tsx
 * Trang Hoàn tất & Đánh giá Tour - Đã FIX: Responsive Scale, Thay Emoji bằng Icon
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GuestReview {
  id: string; guideId: string; guideName: string; tourName: string;
  overallRating: number;
  criteria: { attitude: number; knowledge: number; punctual: number; professional: number };
  comment: string; reply: string; date: string; createdAt: string;
}

const STEP_LABELS = ['Hoàn tất', 'Giải ngân', 'Đánh giá', 'Xong'];
const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

// ── AsyncStorage helpers ──
async function saveReviewToGuide(review: GuestReview) {
  try {
    const raw = await AsyncStorage.getItem('@guide_reviews');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(review);
    await AsyncStorage.setItem('@guide_reviews', JSON.stringify(list));
  } catch {}
}

async function pushReviewNotifToGuide(guideName: string, rating: number) {
  try {
    const raw = await AsyncStorage.getItem('@guide_notifications');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: `rn${Date.now()}`, type: 'review',
      title: `Đánh giá ${rating}⭐ mới từ khách hàng`,
      body: `Khách vừa để lại đánh giá cho tour của bạn.`,
      time: 'Vừa xong', read: false,
    });
    await AsyncStorage.setItem('@guide_notifications', JSON.stringify(list));
  } catch {}
}

async function markBookingCompleted(bookingId: string) {
  try {
    const raw = await AsyncStorage.getItem('@guest_bookings');
    if (!raw) return;
    const list = JSON.parse(raw);
    const updated = list.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b);
    await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updated));
    
    const gRaw = await AsyncStorage.getItem('@guide_bookings');
    if (gRaw) {
      const gList = JSON.parse(gRaw);
      const gUpdated = gList.map((b: any) => b.id === bookingId ? { ...b, status: 'done' } : b);
      await AsyncStorage.setItem('@guide_bookings', JSON.stringify(gUpdated));
    }
  } catch {}
}

async function pushGuestNotification(msg: string) {
  try {
    const raw = await AsyncStorage.getItem('@guest_notifications');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ id: `gn${Date.now()}`, message: msg, read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem('@guest_notifications', JSON.stringify(list));
  } catch {}
}

export default function GuestPostTourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [step, setStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    id: '', tourName: 'Đang tải...', guideName: '---', guideId: '', totalAmount: 0,
  });

  useCallback(() => {
    if (!bookingId) return;
    AsyncStorage.getItem('@guest_bookings').then(raw => {
      if (!raw) return;
      const list = JSON.parse(raw);
      const found = list.find((b: any) => b.id === bookingId);
      if (found) {
        setBookingData({
          id: found.id, tourName: found.tourName, guideName: found.guideName,
          guideId: found.guideId, totalAmount: found.totalAmount,
        });
      }
    }).catch(() => {});
  }, [bookingId]);

  const [overallRating, setOverallRating] = useState(5);
  const [criteria, setCriteria] = useState({ attitude: 5, knowledge: 5, punctual: 5, professional: 5 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const booking = bookingData;
  const commission = Math.round(booking.totalAmount * 0.12);
  const gatewayFee = Math.round(booking.totalAmount * 0.01);
  const payout = booking.totalAmount - commission - gatewayFee;

  const handleCompleteTour = useCallback(async () => {
    await markBookingCompleted(booking.id);
    await pushGuestNotification(`Tour "${booking.tourName}" đã hoàn tất. Cảm ơn bạn!`);
    setStep(1);
  }, [booking]);

  const handleSettlement = useCallback(async () => {
    setStep(2);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!comment.trim()) setComment('Chuyến đi rất tuyệt!');
    setSubmitting(true);
    const review: GuestReview = {
      id: `rev${Date.now()}`, guideId: booking.guideId, guideName: booking.guideName,
      tourName: booking.tourName, overallRating, criteria,
      comment: comment || 'Chuyến đi rất tuyệt!', reply: '', 
      date: new Date().toLocaleDateString('vi-VN'), createdAt: new Date().toISOString(),
    };
    await saveReviewToGuide(review);
    await pushReviewNotifToGuide(booking.guideName, overallRating);
    await pushGuestNotification('Cảm ơn bạn đã gửi đánh giá!');
    setSubmitting(false);
    setStep(3);
  }, [comment, overallRating, criteria, booking]);

  const renderProgress = () => (
    <View style={s.progressWrap}>
      <View style={s.progressRow}>
        {STEP_LABELS.map((lbl, i) => (
          <View key={i} style={s.progressItem}>
            <View style={[s.progressCircle, step === i && s.progressActive, step > i && s.progressDone]}>
              {step > i
                ? <Ionicons name="checkmark" size={Math.round(12 * scale)} color="#fff" />
                : <Text style={[s.progressNum, (step >= i) && { color: '#fff' }]}>{i + 1}</Text>}
            </View>
            {i < STEP_LABELS.length - 1 && <View style={[s.progressLine, step > i && s.progressLineDone]} />}
          </View>
        ))}
      </View>
      <Text style={s.progressLabel}>{STEP_LABELS[step]}</Text>
    </View>
  );

  const renderRow = (label: string, val: string, bold?: boolean, highlight?: boolean, ok?: boolean) => (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowVal, bold && { fontWeight: '800' }, highlight && { color: '#4f7cff', fontSize: Math.round(16 * scale) }, ok && { color: '#16a34a' }]}>
        {val}
      </Text>
    </View>
  );

  const renderStep0 = () => (
    <>
      <View style={s.doneHeader}>
        <Ionicons name="checkmark-done-circle" size={Math.round(64 * scale)} color="#3dc87d" />
        <Text style={s.doneTitle}>Tour đã hoàn tất!</Text>
        <Text style={s.doneSub}>Khách hàng và HDV đã xác nhận kết thúc chuyến đi</Text>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoCardTitle}>Biên bản hoàn tất</Text>
        {renderRow('Mã tour', `TG-${booking.id}`)}
        {renderRow('Tour', booking.tourName)}
        {renderRow('Hướng dẫn viên', booking.guideName)}
        {renderRow('Thời gian thực tế', '08:05 – 16:42')}
        {renderRow('Trạng thái check-in', 'Đủ 2 lần xác nhận', false, false, true)}
        {renderRow('Trạng thái đơn', 'Đã hoàn tất', false, false, true)}
      </View>

      <View style={s.aiBanner}>
        <Ionicons name="analytics-outline" size={Math.round(16 * scale)} color="#4f7cff" />
        <Text style={s.aiTxt}>AI Safety Score: 96/100 · Dữ liệu chuyến đi đã lưu để phân tích chất lượng dịch vụ.</Text>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={handleCompleteTour}>
        <Ionicons name="cash-outline" size={Math.round(18 * scale)} color="#fff" />
        <Text style={s.primaryBtnTxt}>Tiếp tục giải ngân HDV</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep1 = () => (
    <>
      <Text style={s.sectionTitle}>Khấu trừ & Giải ngân</Text>
      <Text style={s.sectionSub}>Hệ thống tự động tính hoa hồng và chuyển tiền cho HDV</Text>

      <View style={s.infoCard}>
        {renderRow('Tổng thanh toán khách', fmt(booking.totalAmount))}
        {renderRow('Hoa hồng nền tảng (12%)', `-${fmt(commission)}`)}
        {renderRow('Phí cổng thanh toán (1%)', `-${fmt(gatewayFee)}`)}
        <View style={s.divider} />
        {renderRow('Số tiền giải ngân HDV', fmt(payout), true, true)}
      </View>

      <View style={s.statusCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(8 * scale) }}>
          <MaterialCommunityIcons name="bank-check" size={Math.round(18 * scale)} color="#3dc87d" />
          <Text style={s.statusTxt}>Lệnh chuyển khoản đã tạo cho HDV {booking.guideName}</Text>
        </View>
        <Text style={s.statusSub}>Mã GD: PAYOUT-{booking.id} · Dự kiến hoàn tất trong 1–3 phút</Text>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={handleSettlement}>
        <Ionicons name="star-outline" size={Math.round(18 * scale)} color="#fff" />
        <Text style={s.primaryBtnTxt}>Tiếp tục đánh giá chuyến đi</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/(tabs)/bookings' as any)}>
        <Text style={s.outlineTxt}>Về danh sách đơn đặt</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={s.sectionTitle}>Đánh giá chuyến đi</Text>
      <Text style={s.sectionSub}>Phản hồi của bạn giúp huấn luyện AI và cải thiện chất lượng</Text>

      <View style={s.guideCard}>
        <View style={s.guideAvatar}><Ionicons name="person" size={Math.round(22 * scale)} color="#fff" /></View>
        <View>
          <Text style={s.guideName}>{booking.guideName}</Text>
          <Text style={s.guideTour}>{booking.tourName}</Text>
        </View>
      </View>

      <View style={s.ratingCard}>
        <Text style={s.ratingLabel}>Chất lượng tổng thể</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setOverallRating(i)}>
              <Ionicons name={i <= overallRating ? 'star' : 'star-outline'} size={Math.round(38 * scale)} color="#ffbe40" />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ratingHint}>{['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][overallRating]}</Text>
      </View>

      <View style={s.criteriaCard}>
        {([
          ['attitude', 'Thái độ phục vụ'],
          ['knowledge', 'Kiến thức địa điểm'],
          ['punctual', 'Đúng giờ'],
          ['professional', 'Tính chuyên nghiệp'],
        ] as const).map(([key, label]) => (
          <View key={key} style={s.criteriaRow}>
            <Text style={s.criteriaLabel}>{label}</Text>
            <View style={s.miniStars}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => setCriteria(c => ({ ...c, [key]: i }))}>
                  <Ionicons name={i <= criteria[key] ? 'star' : 'star-outline'} size={Math.round(18 * scale)} color="#ffbe40" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={s.commentWrap}>
        <Text style={s.commentLabel}>Nhận xét chi tiết</Text>
        <TextInput style={s.commentInput} placeholder="Chia sẻ trải nghiệm của bạn về chuyến đi..." multiline numberOfLines={4} textAlignVertical="top" value={comment} onChangeText={setComment} placeholderTextColor="#b0bdd8" />
      </View>

      <View style={s.aiBanner}>
        <Ionicons name="bulb-outline" size={Math.round(15 * scale)} color="#4f7cff" />
        <Text style={s.aiTxt}>Dữ liệu đánh giá được AI học để cải thiện kết quả gợi ý cho lần sau</Text>
      </View>

      <TouchableOpacity style={[s.primaryBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmitReview} disabled={submitting}>
        <Ionicons name="paper-plane-outline" size={Math.round(18 * scale)} color="#fff" />
        <Text style={s.primaryBtnTxt}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <View style={s.doneWrap}>
      <Ionicons name="heart-circle" size={Math.round(80 * scale)} color="#4f7cff" />
      <Text style={s.doneFinalTitle}>Cảm ơn bạn!</Text>
      <Text style={s.doneFinalSub}>Đánh giá của bạn đã được gửi thành công. Chúc bạn có những chuyến đi tiếp theo thật tuyệt vời!</Text>

      {/* THAY THẾ EMOJI CỨNG BẰNG ICON VECTOR ĐỒNG BỘ */}
      <View style={s.confettiRow}>
        <Ionicons name="star" size={Math.round(28 * scale)} color="#f59e0b" />
        <Ionicons name="map" size={Math.round(28 * scale)} color="#10b981" />
        <Ionicons name="airplane" size={Math.round(28 * scale)} color="#4f7cff" />
        <Ionicons name="camera" size={Math.round(28 * scale)} color="#8b5cf6" />
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/' as any)}>
        <Ionicons name="home-outline" size={Math.round(18 * scale)} color="#fff" />
        <Text style={s.primaryBtnTxt}>Về trang chủ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/search-guide' as any)}>
        <Ionicons name="search-outline" size={Math.round(16 * scale)} color="#4f7cff" />
        <Text style={s.outlineTxt}>Đặt tour mới</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + Math.round(14 * scale) }]} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" />
      {step < 3 && (
        <TouchableOpacity style={s.backRow} onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={Math.round(20 * scale)} color="#4f7cff" />
          <Text style={s.backTxt}>{step > 0 ? 'Quay lại' : 'Về trang tour'}</Text>
        </TouchableOpacity>
      )}
      {step < 3 && renderProgress()}
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </ScrollView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f3f7ff' },
    content: { padding: sz(18), paddingBottom: sz(40) },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginBottom: sz(12) },
    backTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(14) },

    progressWrap: { marginBottom: sz(20) },
    progressRow: { flexDirection: 'row', alignItems: 'center' },
    progressItem: { flexDirection: 'row', alignItems: 'center' },
    progressCircle: { width: sz(26), height: sz(26), borderRadius: sz(13), backgroundColor: '#e4ebff', alignItems: 'center', justifyContent: 'center' },
    progressActive: { backgroundColor: '#4f7cff' },
    progressDone: { backgroundColor: '#3dc87d' },
    progressNum: { color: '#7a8cc2', fontSize: sz(11), fontWeight: '800' },
    progressLine: { width: sz(30), height: sz(3), backgroundColor: '#e4ebff' },
    progressLineDone: { backgroundColor: '#3dc87d' },
    progressLabel: { color: '#1f2a58', fontWeight: '900', fontSize: sz(14), marginTop: sz(8) },

    doneHeader: { alignItems: 'center', marginBottom: sz(18) },
    doneTitle: { color: '#1f2a58', fontSize: sz(26), fontWeight: '900', marginTop: sz(10) },
    doneSub: { color: '#7a8cc2', marginTop: sz(6), textAlign: 'center', fontSize: sz(13) },

    sectionTitle: { color: '#1f2a58', fontSize: sz(22), fontWeight: '900', marginBottom: sz(4) },
    sectionSub: { color: '#7a8cc2', marginBottom: sz(14), fontSize: sz(13) },

    infoCard: { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(16), marginBottom: sz(14) },
    infoCardTitle: { color: '#1f2a58', fontWeight: '900', marginBottom: sz(10), fontSize: sz(15) },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: sz(8), borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    rowLabel: { color: '#7a8cc2', fontSize: sz(13) },
    rowVal: { color: '#1f2a58', fontWeight: '700', fontSize: sz(13) },
    divider: { height: 1, backgroundColor: '#eef2ff', marginVertical: sz(8) },

    aiBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: sz(8), backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', borderRadius: sz(12), padding: sz(12), marginBottom: sz(16) },
    aiTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(12), flex: 1, lineHeight: sz(18) },

    statusCard: { borderRadius: sz(14), borderWidth: 1, borderColor: '#ccefdc', backgroundColor: '#edf9f0', padding: sz(14), marginBottom: sz(16) },
    statusTxt: { color: '#2da66e', fontWeight: '900', flex: 1, fontSize: sz(13) },
    statusSub: { color: '#5d8f72', marginTop: sz(6), fontSize: sz(12) },

    guideCard: { flexDirection: 'row', alignItems: 'center', gap: sz(12), backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), marginBottom: sz(14) },
    guideAvatar: { width: sz(52), height: sz(52), borderRadius: sz(14), backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center' },
    guideName: { color: '#1f2a58', fontWeight: '900', fontSize: sz(16) },
    guideTour: { color: '#7a8cc2', marginTop: sz(4), fontSize: sz(13) },
    
    ratingCard: { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(16), alignItems: 'center', marginBottom: sz(14) },
    ratingLabel: { color: '#7a8cc2', marginBottom: sz(12), fontWeight: '700', fontSize: sz(13) },
    starRow: { flexDirection: 'row', gap: sz(8) },
    ratingHint: { color: '#f59e0b', fontWeight: '900', marginTop: sz(8), fontSize: sz(14) },
    
    criteriaCard: { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), marginBottom: sz(14), gap: sz(12) },
    criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    criteriaLabel: { color: '#5a6897', fontSize: sz(13), fontWeight: '600' },
    miniStars: { flexDirection: 'row', gap: sz(2) },
    
    commentWrap: { marginBottom: sz(14) },
    commentLabel: { color: '#1f2a58', fontWeight: '900', marginBottom: sz(8), fontSize: sz(14) },
    commentInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: sz(14), padding: sz(14), minHeight: sz(100), color: '#1f2a58', fontSize: sz(14) },

    doneWrap: { alignItems: 'center', paddingTop: sz(20) },
    doneFinalTitle: { color: '#1f2a58', fontSize: sz(28), fontWeight: '900', marginTop: sz(16), marginBottom: sz(8) },
    doneFinalSub: { color: '#7a8cc2', textAlign: 'center', lineHeight: sz(22), paddingHorizontal: sz(20), marginBottom: sz(24), fontSize: sz(14) },
    confettiRow: { flexDirection: 'row', gap: sz(16), marginBottom: sz(32) },

    primaryBtn: { height: sz(50), borderRadius: sz(14), backgroundColor: '#4f7cff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), marginTop: sz(8), width: '100%' },
    primaryBtnTxt: { color: '#fff', fontWeight: '900', fontSize: sz(15) },
    outlineBtn: { height: sz(50), borderRadius: sz(14), borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), marginTop: sz(10), width: '100%' },
    outlineTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(15) },
  });
};