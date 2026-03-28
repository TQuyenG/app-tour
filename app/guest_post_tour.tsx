/**
 * guest_post_tour.tsx
 * Gộp từ: tour-complete.tsx + settlement.tsx + review.tsx
 *
 * Steps:
 *  0 – Tour hoàn tất (tour-complete)
 *  1 – Giải ngân / khấu trừ (settlement)
 *  2 – Đánh giá chuyến đi (review)
 *  3 – Hoàn thành (done screen)
 *
 * AsyncStorage sync:
 *  @guide_reviews       – HDV đọc đánh giá mới
 *  @guide_notifications – thông báo đánh giá cho HDV
 *  @guest_notifications – xác nhận cho khách
 *  @guest_bookings      – cập nhật status completed
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface GuestReview {
  id: string; guideId: string; guideName: string; tourName: string;
  overallRating: number;
  criteria: { attitude: number; knowledge: number; punctual: number; professional: number };
  comment: string; reply: string; date: string; createdAt: string;
}

const STEP_LABELS = ['Hoàn tất', 'Giải ngân', 'Đánh giá', 'Xong'];
const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

// Booking data sẽ load từ params + AsyncStorage trong component

// ─────────────────────────────────────────
// AsyncStorage helpers
// ─────────────────────────────────────────
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
    // Also update guide side
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

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────
export default function GuestPostTourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [step, setStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    id: '',
    tourName: 'Đang tải...',
    guideName: '---',
    guideId: '',
    totalAmount: 0,
  });

  // Load booking thật từ AsyncStorage
  useCallback(() => {
    if (!bookingId) return;
    AsyncStorage.getItem('@guest_bookings').then(raw => {
      if (!raw) return;
      const list = JSON.parse(raw);
      const found = list.find((b: any) => b.id === bookingId);
      if (found) {
        setBookingData({
          id: found.id,
          tourName: found.tourName,
          guideName: found.guideName,
          guideId: found.guideId,
          totalAmount: found.totalAmount,
        });
      }
    }).catch(() => {});
  }, [bookingId]);

  // Review state
  const [overallRating, setOverallRating] = useState(5);
  const [criteria, setCriteria] = useState({ attitude: 5, knowledge: 5, punctual: 5, professional: 5 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const booking = bookingData;
  const commission = Math.round(booking.totalAmount * 0.12);
  const gatewayFee = Math.round(booking.totalAmount * 0.01);
  const payout = booking.totalAmount - commission - gatewayFee;

  // ── Actions ──────────────────────────────
  const handleCompleteTour = useCallback(async () => {
    await markBookingCompleted(booking.id);
    await pushGuestNotification(`Tour "${booking.tourName}" đã hoàn tất. Cảm ơn bạn!`);
    setStep(1);
  }, [booking]);

  const handleSettlement = useCallback(async () => {
    setStep(2);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!comment.trim()) { setComment('Chuyến đi rất tuyệt!'); }
    setSubmitting(true);
    const review: GuestReview = {
      id: `rev${Date.now()}`,
      guideId: booking.guideId, guideName: booking.guideName,
      tourName: booking.tourName, overallRating, criteria,
      comment: comment || 'Chuyến đi rất tuyệt!',
      reply: '', date: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toISOString(),
    };
    await saveReviewToGuide(review);
    await pushReviewNotifToGuide(booking.guideName, overallRating);
    await pushGuestNotification('Cảm ơn bạn đã gửi đánh giá!');
    setSubmitting(false);
    setStep(3);
  }, [comment, overallRating, criteria, booking]);

  // ─────────────────────────────────────────
  // Progress bar
  // ─────────────────────────────────────────
  const renderProgress = () => (
    <View style={s.progressWrap}>
      <View style={s.progressRow}>
        {STEP_LABELS.map((lbl, i) => (
          <View key={i} style={s.progressItem}>
            <View style={[s.progressCircle, step === i && s.progressActive, step > i && s.progressDone]}>
              {step > i
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[s.progressNum, (step >= i) && { color: '#fff' }]}>{i + 1}</Text>}
            </View>
            {i < STEP_LABELS.length - 1 && <View style={[s.progressLine, step > i && s.progressLineDone]} />}
          </View>
        ))}
      </View>
      <Text style={s.progressLabel}>{STEP_LABELS[step]}</Text>
    </View>
  );

  // ─────────────────────────────────────────
  // STEP 0 – Tour Complete
  // ─────────────────────────────────────────
  const renderStep0 = () => (
    <>
      <View style={s.doneHeader}>
        <Ionicons name="checkmark-done-circle" size={64} color="#3dc87d" />
        <Text style={s.doneTitle}>Tour đã hoàn tất!</Text>
        <Text style={s.doneSub}>Khách hàng và HDV đã xác nhận kết thúc chuyến đi</Text>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoCardTitle}>Biên bản hoàn tất</Text>
        {[
          { label: 'Mã tour',              val: `TG-${booking.id}` },
          { label: 'Tour',                 val: booking.tourName },
          { label: 'Hướng dẫn viên',       val: booking.guideName },
          { label: 'Thời gian thực tế',    val: '08:05 – 16:42' },
          { label: 'Trạng thái check-in',  val: 'Đủ 2 lần xác nhận', ok: true },
          { label: 'Trạng thái đơn',       val: 'Đã hoàn tất', ok: true },
        ].map((r, i) => (
          <View key={i} style={s.row}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={[s.rowVal, r.ok && { color: '#16a34a' }]}>{r.val}</Text>
          </View>
        ))}
      </View>

      <View style={s.aiBanner}>
        <Ionicons name="analytics-outline" size={16} color="#4f7cff" />
        <Text style={s.aiTxt}>AI Safety Score: 96/100 · Dữ liệu chuyến đi đã lưu để phân tích chất lượng dịch vụ.</Text>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={handleCompleteTour}>
        <Ionicons name="cash-outline" size={18} color="#fff" />
        <Text style={s.primaryBtnTxt}>Tiếp tục giải ngân HDV</Text>
      </TouchableOpacity>
    </>
  );

  // ─────────────────────────────────────────
  // STEP 1 – Settlement
  // ─────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <Text style={s.sectionTitle}>Khấu trừ & Giải ngân</Text>
      <Text style={s.sectionSub}>Hệ thống tự động tính hoa hồng và chuyển tiền cho HDV</Text>

      <View style={s.infoCard}>
        {[
          { label: 'Tổng thanh toán khách',    val: fmt(booking.totalAmount), ok: false },
          { label: 'Hoa hồng nền tảng (12%)',  val: `-${fmt(commission)}`, ok: false },
          { label: 'Phí cổng thanh toán (1%)', val: `-${fmt(gatewayFee)}`, ok: false },
        ].map((r, i) => <Row key={i} label={r.label} val={r.val} />)}
        <View style={s.divider} />
        <Row label="Số tiền giải ngân HDV" val={fmt(payout)} bold highlight />
      </View>

      <View style={s.statusCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="bank-check" size={18} color="#3dc87d" />
          <Text style={s.statusTxt}>Lệnh chuyển khoản đã tạo cho HDV {booking.guideName}</Text>
        </View>
        <Text style={s.statusSub}>Mã GD: PAYOUT-{booking.id} · Dự kiến hoàn tất trong 1–3 phút</Text>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={handleSettlement}>
        <Ionicons name="star-outline" size={18} color="#fff" />
        <Text style={s.primaryBtnTxt}>Tiếp tục đánh giá chuyến đi</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/(tabs)/bookings' as any)}>
        <Text style={s.outlineTxt}>Về danh sách đơn đặt</Text>
      </TouchableOpacity>
    </>
  );

  // ─────────────────────────────────────────
  // STEP 2 – Review
  // ─────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <Text style={s.sectionTitle}>Đánh giá chuyến đi</Text>
      <Text style={s.sectionSub}>Phản hồi của bạn giúp huấn luyện AI và cải thiện chất lượng</Text>

      {/* Guide card */}
      <View style={s.guideCard}>
        <View style={s.guideAvatar}><Ionicons name="person" size={22} color="#fff" /></View>
        <View>
          <Text style={s.guideName}>{booking.guideName}</Text>
          <Text style={s.guideTour}>{booking.tourName}</Text>
        </View>
      </View>

      {/* Overall rating */}
      <View style={s.ratingCard}>
        <Text style={s.ratingLabel}>Chất lượng tổng thể</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setOverallRating(i)}>
              <Ionicons name={i <= overallRating ? 'star' : 'star-outline'} size={38} color="#ffbe40" />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ratingHint}>{['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][overallRating]}</Text>
      </View>

      {/* Criteria */}
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
                  <Ionicons name={i <= criteria[key] ? 'star' : 'star-outline'} size={18} color="#ffbe40" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Comment */}
      <View style={s.commentWrap}>
        <Text style={s.commentLabel}>Nhận xét chi tiết</Text>
        <TextInput style={s.commentInput} placeholder="Chia sẻ trải nghiệm của bạn về chuyến đi..." multiline numberOfLines={4} textAlignVertical="top" value={comment} onChangeText={setComment} placeholderTextColor="#b0bdd8" />
      </View>

      <View style={s.aiBanner}>
        <Ionicons name="bulb-outline" size={15} color="#4f7cff" />
        <Text style={s.aiTxt}>Dữ liệu đánh giá được AI học để cải thiện kết quả gợi ý cho lần sau</Text>
      </View>

      <TouchableOpacity style={[s.primaryBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmitReview} disabled={submitting}>
        <Ionicons name="paper-plane-outline" size={18} color="#fff" />
        <Text style={s.primaryBtnTxt}>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</Text>
      </TouchableOpacity>
    </>
  );

  // ─────────────────────────────────────────
  // STEP 3 – Done
  // ─────────────────────────────────────────
  const renderStep3 = () => (
    <View style={s.doneWrap}>
      <Ionicons name="heart-circle" size={80} color="#4f7cff" />
      <Text style={s.doneFinalTitle}>Cảm ơn bạn!</Text>
      <Text style={s.doneFinalSub}>Đánh giá của bạn đã được gửi thành công. Chúc bạn có những chuyến đi tiếp theo thật tuyệt vời!</Text>

      <View style={s.confettiRow}>
        {['🎉', '✨', '🌟', '🏖️', '🗺️'].map((e, i) => <Text key={i} style={s.emoji}>{e}</Text>)}
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/' as any)}>
        <Ionicons name="home-outline" size={18} color="#fff" />
        <Text style={s.primaryBtnTxt}>Về trang chủ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/search-guide' as any)}>
        <Ionicons name="search-outline" size={16} color="#4f7cff" />
        <Text style={s.outlineTxt}>Đặt tour mới</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 14, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      {step < 3 && (
        <TouchableOpacity style={s.backRow} onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          <Text style={s.backTxt}>{step > 0 ? 'Quay lại' : 'Về trang tour'}</Text>
        </TouchableOpacity>
      )}
      {step < 3 && renderProgress()}
      {renderStep()}
    </ScrollView>
  );
}

function Row({ label, val, bold, highlight }: { label: string; val: string; bold?: boolean; highlight?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowVal, bold && { fontWeight: '700' }, highlight && { color: '#4f7cff', fontSize: 16 }]}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backTxt: { color: '#4f7cff', fontWeight: '600' },

  progressWrap: { marginBottom: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e4ebff', alignItems: 'center', justifyContent: 'center' },
  progressActive: { backgroundColor: '#4f7cff' },
  progressDone: { backgroundColor: '#3dc87d' },
  progressNum: { color: '#7a8cc2', fontSize: 11, fontWeight: '700' },
  progressLine: { width: 30, height: 3, backgroundColor: '#e4ebff' },
  progressLineDone: { backgroundColor: '#3dc87d' },
  progressLabel: { color: '#1f2a58', fontWeight: '700', fontSize: 13, marginTop: 8 },

  // Done header
  doneHeader: { alignItems: 'center', marginBottom: 18 },
  doneTitle: { color: '#1f2a58', fontSize: 26, fontWeight: '700', marginTop: 10 },
  doneSub: { color: '#7a8cc2', marginTop: 6, textAlign: 'center' },

  sectionTitle: { color: '#1f2a58', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: '#7a8cc2', marginBottom: 14 },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 12 },
  infoCardTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  rowLabel: { color: '#7a8cc2' },
  rowVal: { color: '#1f2a58', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eef2ff', marginVertical: 6 },

  aiBanner: { flexDirection: 'row', gap: 8, backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', borderRadius: 12, padding: 10, marginBottom: 14 },
  aiTxt: { color: '#4f7cff', fontWeight: '600', fontSize: 12, flex: 1, lineHeight: 18 },

  // Settlement
  statusCard: { borderRadius: 14, borderWidth: 1, borderColor: '#ccefdc', backgroundColor: '#edf9f0', padding: 12, marginBottom: 14 },
  statusTxt: { color: '#2da66e', fontWeight: '700', flex: 1 },
  statusSub: { color: '#5d8f72', marginTop: 6, fontSize: 12 },

  // Review
  guideCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 14 },
  guideAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center' },
  guideName: { color: '#1f2a58', fontWeight: '700', fontSize: 16 },
  guideTour: { color: '#7a8cc2', marginTop: 4 },
  ratingCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 16, alignItems: 'center', marginBottom: 12 },
  ratingLabel: { color: '#7a8cc2', marginBottom: 12, fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 8 },
  ratingHint: { color: '#f59e0b', fontWeight: '700', marginTop: 8, fontSize: 14 },
  criteriaCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 12, gap: 12 },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  criteriaLabel: { color: '#5a6897' },
  miniStars: { flexDirection: 'row', gap: 2 },
  commentWrap: { marginBottom: 12 },
  commentLabel: { color: '#1f2a58', fontWeight: '700', marginBottom: 8 },
  commentInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 14, padding: 12, minHeight: 100, color: '#1f2a58' },

  // Final done
  doneWrap: { alignItems: 'center', paddingTop: 20 },
  doneFinalTitle: { color: '#1f2a58', fontSize: 28, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  doneFinalSub: { color: '#7a8cc2', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 24 },
  confettiRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  emoji: { fontSize: 28 },

  // Shared
  primaryBtn: { height: 50, borderRadius: 14, backgroundColor: '#4f7cff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, width: '100%' },
  primaryBtnTxt: { color: '#fff', fontWeight: '700' },
  outlineBtn: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, width: '100%' },
  outlineTxt: { color: '#4f7cff', fontWeight: '600' },
});