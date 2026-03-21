import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

const STORAGE_KEY = '@guide_reviews';
interface Review { id: string; customerName: string; tourName: string; rating: number; comment: string; date: string; reply: string; }

const SEED: Review[] = [
  { id: '1', customerName: 'Trần Thị B', tourName: 'Tour Núi Bà Đen', rating: 5, comment: 'Anh hướng dẫn viên rất nhiệt tình, am hiểu địa phương. Chuyến đi rất tuyệt!', date: '15/03/2025', reply: '' },
  { id: '2', customerName: 'Lê Văn C', tourName: 'Tour Đà Lạt 2N1Đ', rating: 4, comment: 'Tour tốt, lịch trình hợp lý. Tuy nhiên xe hơi trễ buổi sáng đầu tiên.', date: '10/03/2025', reply: 'Cảm ơn anh C đã phản hồi. Tôi xin lỗi về sự chậm trễ, sẽ cải thiện ở những chuyến sau!' },
  { id: '3', customerName: 'Nguyễn Thị D', tourName: 'Tour Mũi Né biển', rating: 5, comment: 'Tuyệt vời! Anh dẫn rất chuyên nghiệp, biết nhiều về lịch sử địa phương.', date: '05/03/2025', reply: '' },
  { id: '4', customerName: 'Phạm Thị G', tourName: 'Trekking Langbiang', rating: 3, comment: 'Tour ổn nhưng thông tin cung cấp trước chưa đầy đủ, tôi không biết cần chuẩn bị gì.', date: '01/03/2025', reply: '' },
];

export default function GuideReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyModal, setReplyModal] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterRating, setFilterRating] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setReviews(JSON.parse(raw));
      else { setReviews(SEED); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); }
    }).catch(() => setReviews(SEED));
  }, []);

  const persist = useCallback(async (data: Review[]) => {
    setReviews(data); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, []);

  const saveReply = () => {
    if (!replyModal) return;
    persist(reviews.map(r => r.id === replyModal.id ? { ...r, reply: replyText } : r));
    setReplyModal(null);
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const filtered = filterRating === 0 ? reviews : reviews.filter(r => r.rating === filterRating);

  const ratingCount = (n: number) => reviews.filter(r => r.rating === n).length;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1a2f7a" /></TouchableOpacity>
        <Text style={s.headerTitle}>Đánh giá từ khách</Text>
        <View style={s.ratingBadge}><Ionicons name="star" size={14} color="#f59e0b" /><Text style={s.ratingBadgeTxt}>{avgRating}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.bigRating}>{avgRating}</Text>
            <View style={s.starsRow}>{[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= Math.round(Number(avgRating)) ? 'star' : 'star-outline'} size={18} color="#f59e0b" />)}</View>
            <Text style={s.totalReviews}>{reviews.length} đánh giá</Text>
          </View>
          <View style={s.summaryRight}>
            {[5,4,3,2,1].map(n => {
              const cnt = ratingCount(n);
              const pct = reviews.length ? (cnt / reviews.length) * 100 : 0;
              return (
                <View key={n} style={s.barRow}>
                  <Text style={s.barLabel}>{n}⭐</Text>
                  <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` }]} /></View>
                  <Text style={s.barCount}>{cnt}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {[0,5,4,3,2,1].map(n => (
            <TouchableOpacity key={n} style={[s.filterChip, filterRating === n && s.filterActive]} onPress={() => setFilterRating(n)}>
              <Text style={[s.filterTxt, filterRating === n && s.filterTxtActive]}>{n === 0 ? 'Tất cả' : `${n} sao`}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.resultText}>{filtered.length} đánh giá</Text>

        {filtered.map(review => (
          <View key={review.id} style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <View style={s.custAvatar}><Ionicons name="person" size={16} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.custName}>{review.customerName}</Text>
                <Text style={s.tourName}>{review.tourName} · {review.date}</Text>
              </View>
              <View style={s.starsBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={s.starsNum}>{review.rating}</Text>
              </View>
            </View>
            <Text style={s.comment}>{review.comment}</Text>
            {!!review.reply && (
              <View style={s.replyBox}>
                <View style={s.replyHeader}><Ionicons name="return-down-forward" size={13} color="#2856d6" /><Text style={s.replyLabel}>Phản hồi của bạn</Text></View>
                <Text style={s.replyTxt}>{review.reply}</Text>
              </View>
            )}
            <TouchableOpacity style={s.replyBtn} onPress={() => { setReplyText(review.reply); setReplyModal(review); }}>
              <Ionicons name="chatbubble-outline" size={13} color="#2856d6" />
              <Text style={s.replyBtnTxt}>{review.reply ? 'Sửa phản hồi' : 'Phản hồi'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={!!replyModal} animationType="slide" transparent onRequestClose={() => setReplyModal(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setReplyModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.mheader}>
              <Text style={s.mtitle}>Phản hồi đánh giá</Text>
              <TouchableOpacity onPress={() => setReplyModal(null)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <View style={s.mbody}>
              {replyModal && <Text style={s.quoteText}>"{replyModal.comment}"</Text>}
              <TextInput style={[s.input, { minHeight: 100, paddingTop: 12 }]} value={replyText} onChangeText={setReplyText} placeholder="Nhập phản hồi của bạn..." multiline numberOfLines={4} placeholderTextColor="#b0bdd8" textAlignVertical="top" autoFocus />
              <TouchableOpacity style={s.saveBtn} onPress={saveReply}>
                <Ionicons name="send-outline" size={18} color="#fff" /><Text style={s.saveBtnTxt}>Gửi phản hồi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1a2f7a' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef9c3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  ratingBadgeTxt: { color: '#d97706', fontWeight: '800', fontSize: 14 },
  content: { padding: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, flexDirection: 'row', gap: 16, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  summaryLeft: { alignItems: 'center', width: 80 },
  bigRating: { color: '#1a2f7a', fontSize: 40, fontWeight: '900' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  totalReviews: { color: '#7a8cc2', fontSize: 11, marginTop: 4 },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: '#5f73a9', fontSize: 11, fontWeight: '600', width: 28 },
  barBg: { flex: 1, height: 6, backgroundColor: '#f0f4ff', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  barCount: { color: '#7a8cc2', fontSize: 11, width: 16, textAlign: 'right' },
  filterRow: { gap: 8, paddingBottom: 10 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7 },
  filterActive: { backgroundColor: '#2856d6', borderColor: '#2856d6' },
  filterTxt: { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  filterTxtActive: { color: '#fff' },
  resultText: { color: '#7a8cc2', fontSize: 12, marginBottom: 8 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e4ebff', shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  custAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#2856d6', alignItems: 'center', justifyContent: 'center' },
  custName: { color: '#1a2f7a', fontWeight: '700', fontSize: 14 },
  tourName: { color: '#7a8cc2', fontSize: 11, marginTop: 2 },
  starsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  starsNum: { color: '#d97706', fontWeight: '800', fontSize: 13 },
  comment: { color: '#334155', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  replyBox: { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 12, marginBottom: 10 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  replyLabel: { color: '#2856d6', fontSize: 12, fontWeight: '700' },
  replyTxt: { color: '#5f73a9', fontSize: 12, lineHeight: 18 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#eaf0ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  replyBtnTxt: { color: '#2856d6', fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  mheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  mtitle: { fontSize: 17, fontWeight: '800', color: '#1a2f7a' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center' },
  mbody: { padding: 20 },
  quoteText: { color: '#5f73a9', fontSize: 13, fontStyle: 'italic', lineHeight: 20, backgroundColor: '#f0f4ff', borderRadius: 12, padding: 12, marginBottom: 12 },
  input: { backgroundColor: '#f0f4ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1a2f7a', fontSize: 14 },
  saveBtn: { marginTop: 16, backgroundColor: '#2856d6', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});