/**
 * app/(tabs)/bookings.tsx
 * Lịch sử Đặt Tour của Guest (Phiên bản Hoàn Chỉnh 100%)
 * Gộp chung: Nhắc nhở/Đếm ngược + Hủy/Dời Lịch + Viết Đánh Giá
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuestBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  // States Dữ liệu
  const [bookings, setBookings] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [segment, setSegment] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  // States Modals Tính năng
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [rescheduleModal, setRescheduleModal] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<any>(null);

  // States Đánh giá
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [tipAmount, setTipAmount] = useState(0);

  // States Nhắc nhở & Đếm ngược
  const [now, setNow] = useState(new Date().getTime());
  const [reminderModal, setReminderModal] = useState<any>(null);
  const [ackKeys, setAckKeys] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@guest_bookings').then(raw => { if (raw) setBookings(JSON.parse(raw)); });
    AsyncStorage.getItem('@app_tours').then(raw => { if (raw) setTours(JSON.parse(raw)); });
    AsyncStorage.getItem('@app_reviews').then(raw => { if (raw) setReviews(JSON.parse(raw)); });
    AsyncStorage.getItem('@guest_acked_reminders').then(raw => { if (raw) setAckKeys(JSON.parse(raw)); });
  }, []));

  // ENGINE REALTIME (Đếm ngược & Check mốc thông báo)
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      setNow(currentTime);

      if (!reminderModal) {
        for (const b of bookings) {
          if (!['pending', 'paid', 'accepted'].includes(b.status)) continue;
          
          const startTime = new Date(b.startTime).getTime();
          const diffMs = startTime - currentTime;
          if (diffMs <= 0) continue;

          const diffHours = diffMs / (1000 * 60 * 60);
          const diffMins = diffMs / (1000 * 60);

          let thresholdObj = null;

          if (diffHours <= 24 && diffHours > 23.98 && !ackKeys.includes(`${b.id}-24h`)) {
            thresholdObj = { id: b.id, tourName: b.tourName, time: '24 giờ', key: `${b.id}-24h` };
          } else if (diffHours <= 12 && diffHours > 11.98 && !ackKeys.includes(`${b.id}-12h`)) {
            thresholdObj = { id: b.id, tourName: b.tourName, time: '12 giờ', key: `${b.id}-12h` };
          } else if (diffHours <= 1 && diffHours > 0.98 && !ackKeys.includes(`${b.id}-1h`)) {
            thresholdObj = { id: b.id, tourName: b.tourName, time: '1 tiếng', key: `${b.id}-1h` };
          } else if (diffMins <= 15 && diffMins > 14.8 && !ackKeys.includes(`${b.id}-15m`)) {
            thresholdObj = { id: b.id, tourName: b.tourName, time: '15 phút', key: `${b.id}-15m` };
          }

          if (thresholdObj) {
            setReminderModal(thresholdObj);
            break;
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [bookings, ackKeys, reminderModal]);

  const handleAckReminder = async () => {
    if (!reminderModal) return;
    const newKeys = [...ackKeys, reminderModal.key];
    setAckKeys(newKeys);
    await AsyncStorage.setItem('@guest_acked_reminders', JSON.stringify(newKeys));
    setReminderModal(null);
  };

  const getCountdownStatus = (startTimeStr: string) => {
    const diff = new Date(startTimeStr).getTime() - now;
    if (diff < 0) return { text: "Đã bắt đầu / Quá giờ", color: "#10b981", icon: "play-circle" };

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (d > 0) return { text: `Bắt đầu sau ${d} ngày ${h} giờ`, color: "#4f7cff", icon: "time" };
    if (h > 0) return { text: `Sắp khởi hành: Còn ${h} giờ ${m} phút`, color: "#f59e0b", icon: "alarm" };
    return { text: `Khẩn trương: Còn ${m} phút ${s} giây`, color: "#ef4444", icon: "flame" };
  };

  const executeCancel = async () => {
    if (!cancelModal) return;
    const updated = bookings.map(b => b.id === cancelModal.id ? { ...b, status: 'cancelled' } : b);
    await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updated));
    setBookings(updated);
    setCancelModal(null);
    Alert.alert('Thành công', 'Đã hủy đơn đặt tour.');
  };

  const executeReschedule = async (newSch: any) => {
    if (!rescheduleModal) return;
    const updated = bookings.map(b => b.id === rescheduleModal.id ? { 
      ...b, 
      scheduleId: newSch.id, 
      startTime: newSch.startTime, 
      endTime: newSch.endTime,
      date: new Date(newSch.startTime).toLocaleDateString('vi-VN')
    } : b);
    await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updated));
    setBookings(updated);
    setRescheduleModal(null);
    Alert.alert('Thành công', 'Đã dời ngày khởi hành.');
  };

  const getTourSchedules = (tourId: string) => {
    const t = tours.find(x => x.id === tourId);
    if (!t || !t.schedules) return [];
    return t.schedules.filter((sch:any) => new Date(sch.startTime).getTime() > new Date().getTime());
  };

  const handleReviewSubmit = async () => {
    try {
      const newReview = {
        id: `rev-${Date.now()}`,
        bookingId: reviewModal.id,
        guideId: reviewModal.guideId,
        guestName: reviewModal.customerName || 'Khách hàng',
        rating, reviewText, tipAmount,
        createdAt: new Date().toISOString()
      };
      
      const newReviews = [newReview, ...reviews];
      setReviews(newReviews);
      await AsyncStorage.setItem('@app_reviews', JSON.stringify(newReviews));

      if (tipAmount > 0) {
        const wRaw = await AsyncStorage.getItem('@guide_wallet');
        const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
        wallet.balance += tipAmount;
        wallet.transactions.unshift({
          id: `tx-tip-${Date.now()}`, type: 'tip', amount: tipAmount,
          desc: `Tiền Tip từ khách ${reviewModal.customerName}`, createdAt: new Date().toISOString()
        });
        await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));
      }

      // ================= ĐỌC ĐIỂM TỪ TOUR VÀ CỘNG ĐIỂM REVIEW =================
      const tRaw = await AsyncStorage.getItem('@app_tours');
      let reviewPoints = 50; 
      if (tRaw) {
        const allTours = JSON.parse(tRaw);
        const currentTour = allTours.find((t:any) => t.id === reviewModal?.tourId);
        if (currentTour && currentTour.reviewPoints) reviewPoints = currentTour.reviewPoints;
      }

      const pRaw = await AsyncStorage.getItem('@app_profile');
      const profile = pRaw ? JSON.parse(pRaw) : {};
      profile.loyaltyPoints = (profile.loyaltyPoints || 0) + reviewPoints;
      await AsyncStorage.setItem('@app_profile', JSON.stringify(profile));

      const hRaw = await AsyncStorage.getItem("@guest_loyalty_history");
      const history = hRaw ? JSON.parse(hRaw) : [];
      history.unshift({
        id: `h-rev-${Date.now()}`, type: "earn", points: reviewPoints, 
        desc: `Đánh giá Tour: ${reviewModal?.tourName || ''}`, date: new Date().toISOString()
      });
      await AsyncStorage.setItem("@guest_loyalty_history", JSON.stringify(history));
      // =====================================================================

      setReviewModal(null);
      Alert.alert('Thành công', `Cảm ơn bạn đã gửi đánh giá! Bạn được cộng +${reviewPoints} điểm thưởng.`);
    } catch (e) {
      console.log(e);
    }
  };

  const visible = useMemo(() => bookings.filter(b => {
    if (segment === 'upcoming') return ['pending','paid','accepted'].includes(b.status);
    if (segment === 'active')   return ['checked-in','on-tour'].includes(b.status);
    return ['completed','done','cancelled', 'rejected'].includes(b.status);
  }), [bookings, segment]);

  const safeDate = (dateStr: string) => {
    if (!dateStr) return "Chưa xác định";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Chưa xác định" : d.toLocaleString('vi-VN');
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.headerRow, { paddingTop: insets.top + Math.round(14 * scale) }]}>
        <Text style={s.title}>Đơn đặt tour</Text>
        <Text style={s.subtitle}>Quản lý và theo dõi chuyến đi</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.segmentRow}>
          {[ { key: 'upcoming', label: 'Sắp đi', icon: 'airplane' }, { key: 'active', label: 'Đang đi', icon: 'map' }, { key: 'done', label: 'Lịch sử', icon: 'time' } ].map(seg => (
            <TouchableOpacity key={seg.key} style={[s.segment, segment === seg.key && s.segmentActive]} onPress={() => setSegment(seg.key as any)}>
              <Ionicons name={seg.icon as any} size={18} color={segment === seg.key ? "#fff" : "#7a8cc2"} style={{ marginBottom: 4 }} />
              <Text style={[s.segmentText, segment === seg.key && s.segmentTextActive]}>{seg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {visible.map(b => {
          const cd = segment === 'upcoming' ? getCountdownStatus(b.startTime) : null;
          const hasReviewed = reviews.some(r => r.bookingId === b.id);

          return (
          <View key={b.id} style={s.card}>
            <View style={s.cardHeader}>
               <Text style={s.bookingId}>#{b.id}</Text>
               <View style={s.statusBadge}><Text style={s.statusTxt}>{b.status.toUpperCase()}</Text></View>
            </View>
            <View style={s.cardBody}>
              <Text style={s.tourName}>{b.tourName || "Tour không rõ"}</Text>
              
              {cd && (
                <View style={[s.countdownBox, { backgroundColor: cd.color + '15', borderColor: cd.color + '40' }]}>
                  <Ionicons name={cd.icon as any} size={16} color={cd.color} />
                  <Text style={[s.countdownTxt, { color: cd.color }]}>{cd.text}</Text>
                </View>
              )}

              <View style={s.metaRow}><Ionicons name="calendar" size={14} color="#4f7cff" /><Text style={s.metaTxt}>{safeDate(b.startTime)}</Text></View>
              <View style={s.metaRow}><Ionicons name="person" size={14} color="#4f7cff" /><Text style={s.metaTxt}>HDV: {b.guideName || "Hệ thống sắp xếp"}</Text></View>
            </View>
            
            <View style={s.cardActions}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => router.push({ pathname: '/shared-booking-detail', params: { bookingId: b.id } } as any)}>
                <Text style={[s.actionTxt, { color: '#1f2a58' }]}>Chi tiết</Text>
              </TouchableOpacity>
              
              {segment === 'upcoming' && (
                <>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#eaf0ff' }]} onPress={() => setRescheduleModal(b)}>
                    <Text style={[s.actionTxt, { color: '#4f7cff' }]}>Dời ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => setCancelModal(b)}>
                    <Text style={[s.actionTxt, { color: '#ef4444' }]}>Hủy đơn</Text>
                  </TouchableOpacity>
                </>
              )}

              {segment === 'done' && (b.status === 'completed' || b.status === 'done') && (
                <TouchableOpacity 
                  style={[s.actionBtn, { backgroundColor: hasReviewed ? '#f0fdf4' : '#fffbeb' }]} 
                  onPress={() => !hasReviewed ? setReviewModal(b) : Alert.alert('Thông báo', 'Bạn đã đánh giá tour này rồi.')}
                >
                  <Text style={[s.actionTxt, { color: hasReviewed ? '#16a34a' : '#d97706' }]}>
                    {hasReviewed ? 'Đã đánh giá' : 'Viết đánh giá'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )})}
        {visible.length === 0 && <Text style={{textAlign: 'center', color: '#7a8cc2', marginTop: 40}}>Không có đơn đặt nào.</Text>}
      </ScrollView>

      {/* POPUP NHẮC NHỞ TỰ ĐỘNG */}
      <Modal visible={!!reminderModal} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
               <Ionicons name="notifications-circle" size={40} color="#f59e0b" />
            </View>
            <Text style={s.popupTitle}>Sắp đến giờ đi Tour!</Text>
            <Text style={s.popupMessage}>
              Chuyến đi <Text style={{fontWeight: 'bold', color: '#1f2a58'}}>{reminderModal?.tourName}</Text> sẽ bắt đầu trong vòng <Text style={{fontWeight: 'bold', color: '#ef4444'}}>{reminderModal?.time}</Text> nữa. Bạn hãy chuẩn bị hành lý nhé!
            </Text>
            <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#f59e0b', width: '100%'}]} onPress={handleAckReminder}>
              <Text style={s.popupSubmitBtnTxt}>Tôi đã sẵn sàng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP HỦY ĐƠN */}
      <Modal visible={!!cancelModal} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <Ionicons name="warning" size={50} color="#ef4444" />
            <Text style={s.popupTitle}>Hủy Đặt Tour</Text>
            <Text style={s.popupMessage}>Bạn có chắc chắn muốn hủy đơn #{cancelModal?.id} không? Bạn sẽ phải đặt lại từ đầu nếu đổi ý.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setCancelModal(null)}><Text style={s.popupCancelBtnTxt}>Đóng</Text></TouchableOpacity>
              <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#ef4444'}]} onPress={executeCancel}><Text style={s.popupSubmitBtnTxt}>Xác nhận Hủy</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POPUP DỜI NGÀY */}
      <Modal visible={!!rescheduleModal} transparent animationType="slide">
        <View style={s.popupOverlay}>
          <View style={[s.popupBox, { maxHeight: '80%', padding: 20 }]}>
            <Text style={s.popupTitle}>Chọn ngày Dời</Text>
            <Text style={s.popupMessage}>Tour: {rescheduleModal?.tourName}</Text>
            <ScrollView style={{ width: '100%', marginBottom: 20 }}>
              {getTourSchedules(rescheduleModal?.tourId).map((sch: any) => (
                <TouchableOpacity key={sch.id} style={s.schCard} onPress={() => executeReschedule(sch)}>
                  <Text style={{ fontSize: Math.round(14 * scale), fontWeight: '800', color: '#1f2a58' }}>{new Date(sch.startTime).toLocaleString('vi-VN')}</Text>
                  <Text style={{ fontSize: Math.round(12 * scale), color: '#64748b' }}>Chạm để chọn</Text>
                </TouchableOpacity>
              ))}
              {getTourSchedules(rescheduleModal?.tourId).length === 0 && <Text style={{ textAlign: 'center', color: '#ef4444' }}>Tour này hiện không có lịch trình trống nào khác.</Text>}
            </ScrollView>
            <TouchableOpacity style={[s.popupCancelBtn, { width: '100%' }]} onPress={() => setRescheduleModal(null)}><Text style={s.popupCancelBtnTxt}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP ĐÁNH GIÁ */}
      <Modal visible={!!reviewModal} transparent animationType="slide">
         <View style={s.popupOverlay}>
           <View style={[s.popupBox, { padding: 20 }]}>
              <Text style={s.popupTitle}>Đánh giá chuyến đi</Text>
              <Text style={s.popupMessage}>Đánh giá HDV {reviewModal?.guideName}</Text>
              
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
                {[1,2,3,4,5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} multiline placeholder="Viết nhận xét..." value={reviewText} onChangeText={setReviewText} />
              
              <Text style={{alignSelf: 'flex-start', fontWeight: 'bold', color: '#1f2a58', marginBottom: 10}}>Tặng Tip (Tùy chọn):</Text>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%'}}>
                {[0, 50000, 100000].map(amt => (
                   <TouchableOpacity key={amt} style={[s.tipBtn, tipAmount === amt && s.tipBtnActive]} onPress={() => setTipAmount(amt)}>
                     <Text style={[s.tipTxt, tipAmount === amt && s.tipTxtActive]}>{amt === 0 ? 'Không Tip' : `${amt/1000}K`}</Text>
                   </TouchableOpacity>
                ))}
              </View>

              <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
                <TouchableOpacity style={s.popupCancelBtn} onPress={() => setReviewModal(null)}><Text style={s.popupCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#f59e0b'}]} onPress={handleReviewSubmit}><Text style={s.popupSubmitBtnTxt}>Gửi đánh giá</Text></TouchableOpacity>
              </View>
           </View>
         </View>
      </Modal>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    headerRow: { paddingHorizontal: sz(20), paddingBottom: sz(14), backgroundColor: '#f8faff' },
    title: { color: '#1f2a58', fontSize: sz(24), fontWeight: '900' },
    subtitle: { color: '#7a8cc2', marginTop: sz(4), fontSize: sz(13), fontWeight: '600' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    segmentRow: { flexDirection: 'row', gap: sz(10), marginBottom: sz(16) },
    segment: { flex: 1, alignItems: 'center', paddingVertical: sz(12), backgroundColor: '#fff', borderRadius: sz(16), elevation: 2 },
    segmentActive: { backgroundColor: '#4f7cff' },
    segmentText: { color: '#7a8cc2', fontWeight: '800', fontSize: sz(12) },
    segmentTextActive: { color: '#fff' },
    card: { backgroundColor: '#fff', borderRadius: sz(18), padding: sz(16), marginBottom: sz(16), elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f4ff', paddingBottom: sz(10), marginBottom: sz(12) },
    bookingId: { color: '#1f2a58', fontWeight: '900', fontSize: sz(14) },
    statusBadge: { backgroundColor: '#eaf0ff', paddingHorizontal: sz(10), paddingVertical: sz(4), borderRadius: sz(8) },
    statusTxt: { color: '#4f7cff', fontSize: sz(11), fontWeight: '800' },
    cardBody: { marginBottom: sz(14) },
    tourName: { color: '#1f2a58', fontWeight: '900', fontSize: sz(16), marginBottom: sz(8) },
    countdownBox: { flexDirection: 'row', alignItems: 'center', gap: sz(6), padding: sz(8), borderRadius: sz(8), borderWidth: 1, marginBottom: sz(10) },
    countdownTxt: { fontSize: sz(12), fontWeight: '800' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(8), marginBottom: sz(6) },
    metaTxt: { color: '#64748b', fontSize: sz(13), fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: sz(8) },
    actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: sz(10), borderRadius: sz(10) },
    actionTxt: { fontWeight: '800', fontSize: sz(12) },
    schCard: { backgroundColor: '#f8faff', padding: sz(14), borderRadius: sz(12), marginBottom: sz(10), borderWidth: 1, borderColor: '#e4ebff' },
    popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    popupBox: { backgroundColor: "#fff", width: "100%", borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    popupTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(16), marginBottom: sz(8) },
    popupMessage: { fontSize: sz(14), color: "#64748b", textAlign: "center", marginBottom: sz(24), lineHeight: sz(22) },
    input: { backgroundColor: '#f1f5f9', borderRadius: sz(12), width: '100%', minHeight: sz(80), padding: sz(14), textAlignVertical: 'top', color: '#1f2a58', marginBottom: sz(20) },
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    popupCancelBtnTxt: { color: "#64748b", fontSize: sz(15), fontWeight: "800" },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(14), alignItems: "center", justifyContent: "center" },
    popupSubmitBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
    tipBtn: { flex: 1, height: sz(44), borderRadius: sz(12), borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    tipBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    tipTxt: { fontWeight: '700', color: '#64748b' },
    tipTxtActive: { color: '#fff' }
  });
};