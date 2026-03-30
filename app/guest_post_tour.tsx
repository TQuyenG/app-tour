/**
 * app/guest_post_tour.tsx
 * Trang Đánh giá Tour - GIỮ NGUYÊN UI GỐC CỦA BẠN
 * Đã cắt bỏ phần Giải ngân, Thêm Đánh giá Tour & Tip, Hỗ trợ Xem/Sửa đánh giá
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GuestReview {
  id: string; bookingId: string; guideId: string; guideName: string; tourName: string;
  tourRating: number; // MỚI: Đánh giá riêng cho Tour
  overallRating: number; // Đánh giá HDV
  criteria: { attitude: number; knowledge: number; punctual: number; professional: number };
  comment: string; reply: string; tipAmount: number; date: string; createdAt: string; updatedAt?: string;
}

const STEP_LABELS = ['Đánh giá', 'Hoàn tất'];
const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

// ── AsyncStorage helpers ──
async function saveReviewToGuide(review: GuestReview, isEdit: boolean) {
  try {
    const raw = await AsyncStorage.getItem('@app_reviews');
    const list = raw ? JSON.parse(raw) : [];
    if (isEdit) {
      const idx = list.findIndex((r: any) => r.bookingId === review.bookingId);
      if (idx > -1) list[idx] = review;
    } else {
      list.unshift(review);
    }
    await AsyncStorage.setItem('@app_reviews', JSON.stringify(list));
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

export default function GuestPostTourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams();
  const safeBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;

  const [step, setStep] = useState(0); // Chỉ còn 2 bước: 0 (Đánh giá), 1 (Xong)
  const [bookingData, setBookingData] = useState({
    id: '', tourName: 'Đang tải...', guideName: '---', guideId: '', customerName: 'Khách hàng', totalAmount: 0,
  });

  const [existingReview, setExistingReview] = useState<GuestReview | null>(null);
  const [tourRating, setTourRating] = useState(5);
  const [overallRating, setOverallRating] = useState(5);
  const [criteria, setCriteria] = useState({ attitude: 5, knowledge: 5, punctual: 5, professional: 5 });
  const [comment, setComment] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [alreadyTipped, setAlreadyTipped] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!safeBookingId) return;
    const loadAll = async () => {
      const bRaw = await AsyncStorage.getItem('@guest_bookings');
      if (bRaw) {
        const list = JSON.parse(bRaw);
        const found = list.find((b: any) => b.id === safeBookingId);
        if (found) {
          setBookingData({
            id: found.id, tourName: found.tourName, guideName: found.guideName, customerName: found.customerName,
            guideId: found.guideId, totalAmount: found.totalAmount,
          });
        }
      }
      
      const rRaw = await AsyncStorage.getItem('@app_reviews');
      if (rRaw) {
        const rList = JSON.parse(rRaw);
        const myRev = rList.find((r: any) => r.bookingId === safeBookingId);
        if (myRev) {
          setExistingReview(myRev);
          setTourRating(myRev.tourRating || myRev.overallRating || 5);
          setOverallRating(myRev.overallRating || myRev.rating || 5);
          if (myRev.criteria) setCriteria(myRev.criteria);
          if (myRev.comment || myRev.reviewText) setComment(myRev.comment || myRev.reviewText);
          setAlreadyTipped(myRev.tipAmount || 0);
        }
      }
    };
    loadAll();
  }, [safeBookingId]);

  const booking = bookingData;

  const handleSubmitReview = useCallback(async () => {
    setSubmitting(true);
    const reviewText = comment.trim() || 'Chuyến đi rất tuyệt!';
    const review: GuestReview = {
      id: existingReview ? existingReview.id : `rev${Date.now()}`,
      bookingId: booking.id, guideId: booking.guideId, guideName: booking.guideName,
      tourName: booking.tourName, 
      tourRating, overallRating, criteria,
      comment: reviewText, reply: existingReview?.reply || '', 
      tipAmount: existingReview ? alreadyTipped : tipAmount,
      date: existingReview ? existingReview.date : new Date().toLocaleDateString('vi-VN'), 
      createdAt: existingReview ? existingReview.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await saveReviewToGuide(review, !!existingReview);
    
    // Nếu có tip mới và chưa từng tip -> Cộng tiền ví HDV
    if (tipAmount > 0 && alreadyTipped === 0 && !existingReview) {
       const wRaw = await AsyncStorage.getItem('@guide_wallet');
       const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
       wallet.balance += tipAmount;
       wallet.transactions.unshift({
          id: `tx-tip-${Date.now()}`, type: 'tip', amount: tipAmount,
          desc: `Tiền Tip từ khách ${booking.customerName || 'Khách'}`, createdAt: new Date().toISOString()
       });
       await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));
    }

    if (!existingReview) {
      await pushReviewNotifToGuide(booking.guideName, overallRating);
    }
    setSubmitting(false);
    setStep(1); // Chuyển sang màn hình Xong
  }, [comment, tourRating, overallRating, criteria, booking, existingReview, tipAmount, alreadyTipped]);

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

  const renderReviewForm = () => (
    <>
      <Text style={s.sectionTitle}>{existingReview ? 'Sửa đánh giá' : 'Đánh giá chuyến đi'}</Text>
      <Text style={s.sectionSub}>Phản hồi của bạn giúp cộng đồng và cải thiện chất lượng</Text>

      {/* ĐÁNH GIÁ CHUYẾN ĐI (TOUR) */}
      <View style={[s.ratingCard, { marginBottom: Math.round(14 * scale) }]}>
        <Text style={s.ratingLabel}>Trải nghiệm chuyến đi ({booking.tourName})</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setTourRating(i)}>
              <Ionicons name={i <= tourRating ? 'star' : 'star-outline'} size={Math.round(38 * scale)} color="#ffbe40" />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.ratingHint}>{['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][tourRating]}</Text>
      </View>

      <View style={s.guideCard}>
        <View style={s.guideAvatar}><Ionicons name="person" size={Math.round(22 * scale)} color="#fff" /></View>
        <View>
          <Text style={s.guideName}>{booking.guideName}</Text>
          <Text style={s.guideTour}>Hướng dẫn viên</Text>
        </View>
      </View>

      {/* ĐÁNH GIÁ HDV */}
      <View style={s.ratingCard}>
        <Text style={s.ratingLabel}>Chất lượng phục vụ của HDV</Text>
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

      {/* TẶNG TIP */}
      {!existingReview && (
        <View style={[s.criteriaCard, { marginBottom: Math.round(16 * scale), paddingVertical: Math.round(16 * scale) }]}>
          <Text style={s.commentLabel}>Tặng tiền Tip cho HDV (Tùy chọn)</Text>
          <Text style={[s.criteriaLabel, { marginBottom: Math.round(12 * scale), fontSize: Math.round(12 * scale) }]}>100% tiền tip sẽ được chuyển trực tiếp cho HDV.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Math.round(10 * scale) }}>
            {[0, 50000, 100000, 200000].map(amt => (
              <TouchableOpacity key={amt} style={[s.outlineBtn, { marginTop: 0, flex: 1, minWidth: '45%', borderColor: tipAmount === amt ? '#4f7cff' : '#dfe7ff', backgroundColor: tipAmount === amt ? '#4f7cff' : '#fff' }]} onPress={() => setTipAmount(amt)}>
                <Text style={[s.outlineTxt, { color: tipAmount === amt ? '#fff' : '#4f7cff' }]}>{amt === 0 ? 'Không tip' : fmt(amt)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {alreadyTipped > 0 && existingReview && (
        <View style={s.aiBanner}>
          <Ionicons name="gift-outline" size={Math.round(16 * scale)} color="#4f7cff" />
          <Text style={s.aiTxt}>Bạn đã tặng Tip {fmt(alreadyTipped)} cho Hướng dẫn viên trong đánh giá này.</Text>
        </View>
      )}

      <TouchableOpacity style={[s.primaryBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmitReview} disabled={submitting}>
        <Ionicons name={existingReview ? "save-outline" : "paper-plane-outline"} size={Math.round(18 * scale)} color="#fff" />
        <Text style={s.primaryBtnTxt}>{submitting ? 'Đang lưu...' : (existingReview ? 'Lưu thay đổi' : `Gửi đánh giá ${tipAmount > 0 ? `& Tặng Tip (${fmt(tipAmount)})` : ''}`)}</Text>
      </TouchableOpacity>
    </>
  );

  const renderSuccess = () => (
    <View style={s.doneWrap}>
      <Ionicons name="heart-circle" size={Math.round(80 * scale)} color="#4f7cff" />
      <Text style={s.doneFinalTitle}>Cảm ơn bạn!</Text>
      <Text style={s.doneFinalSub}>Đánh giá của bạn đã được {existingReview ? 'cập nhật' : 'gửi'} thành công. Chúc bạn có những chuyến đi tiếp theo thật tuyệt vời!</Text>

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

      <TouchableOpacity style={s.outlineBtn} onPress={() => router.push('/(tabs)/bookings' as any)}>
        <Ionicons name="list-outline" size={Math.round(16 * scale)} color="#4f7cff" />
        <Text style={s.outlineTxt}>Về lịch sử đặt tour</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + Math.round(14 * scale) }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {step === 0 && (
        <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={Math.round(20 * scale)} color="#4f7cff" />
          <Text style={s.backTxt}>Về trang trước</Text>
        </TouchableOpacity>
      )}
      {step === 0 && renderProgress()}
      
      {step === 0 ? renderReviewForm() : renderSuccess()}
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
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    progressItem: { flexDirection: 'row', alignItems: 'center' },
    progressCircle: { width: sz(26), height: sz(26), borderRadius: sz(13), backgroundColor: '#e4ebff', alignItems: 'center', justifyContent: 'center' },
    progressActive: { backgroundColor: '#4f7cff' },
    progressDone: { backgroundColor: '#3dc87d' },
    progressNum: { color: '#7a8cc2', fontSize: sz(11), fontWeight: '800' },
    progressLine: { width: sz(60), height: sz(3), backgroundColor: '#e4ebff', marginHorizontal: sz(4) },
    progressLineDone: { backgroundColor: '#3dc87d' },
    progressLabel: { color: '#1f2a58', fontWeight: '900', fontSize: sz(14), marginTop: sz(8), textAlign: 'center' },

    sectionTitle: { color: '#1f2a58', fontSize: sz(22), fontWeight: '900', marginBottom: sz(4) },
    sectionSub: { color: '#7a8cc2', marginBottom: sz(14), fontSize: sz(13) },

    aiBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: sz(8), backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', borderRadius: sz(12), padding: sz(12), marginBottom: sz(16) },
    aiTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(12), flex: 1, lineHeight: sz(18) },

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