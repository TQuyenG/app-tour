/**
 * app/(tabs)/bookings.tsx
 * Lịch sử Đặt Tour của Guest - Đã chuyển Đánh giá sang trang riêng (guest_post_tour)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper'; 
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuestBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [bookings, setBookings] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [segment, setSegment] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  const [cancelModal, setCancelModal] = useState<any>(null);
  const [rescheduleModal, setRescheduleModal] = useState<any>(null);

  const [now, setNow] = useState(new Date().getTime());
  const [reminderModal, setReminderModal] = useState<any>(null);
  const [ackKeys, setAckKeys] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    const loadPrivateBookings = async () => {
      const rawUser = await AsyncStorage.getItem('@app_current_user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;

      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (rawBookings && currentUser) {
        const allBookings = JSON.parse(rawBookings);
        const myBookings = allBookings.filter((b: any) => 
          b.accountId === currentUser.accountId || 
          b.guestId === currentUser.accountId ||
          b.userId === currentUser.accountId ||
          (b.customerEmail && b.customerEmail.toLowerCase() === currentUser.email.toLowerCase())
        );
        myBookings.sort((a:any, b:any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setBookings(myBookings);
      }
    };

    loadPrivateBookings();
    AsyncStorage.getItem('@app_tours').then(raw => { if (raw) setTours(JSON.parse(raw)); });
    AsyncStorage.getItem('@app_reviews').then(raw => { if (raw) setReviews(JSON.parse(raw)); });
    AsyncStorage.getItem('@guest_acked_reminders').then(raw => { if (raw) setAckKeys(JSON.parse(raw)); });
  }, []));

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      setNow(currentTime);

      if (!reminderModal) {
        for (const b of bookings) {
          if (!['pending', 'paid', 'confirmed', 'accepted'].includes(b.status)) continue;
          
          const startTime = new Date(b.startTime || b.tourDate || Date.now()).getTime();
          const diffMs = startTime - currentTime;
          if (diffMs <= 0) continue;

          const diffHours = diffMs / (1000 * 60 * 60);
          const diffMins = diffMs / (1000 * 60);
          let thresholdObj = null;

          if (diffHours <= 24 && diffHours > 23.98 && !ackKeys.includes(`${b.id}-24h`)) thresholdObj = { id: b.id, tourName: b.tourName, time: '24 giờ', key: `${b.id}-24h` };
          else if (diffHours <= 12 && diffHours > 11.98 && !ackKeys.includes(`${b.id}-12h`)) thresholdObj = { id: b.id, tourName: b.tourName, time: '12 giờ', key: `${b.id}-12h` };
          else if (diffHours <= 1 && diffHours > 0.98 && !ackKeys.includes(`${b.id}-1h`)) thresholdObj = { id: b.id, tourName: b.tourName, time: '1 tiếng', key: `${b.id}-1h` };
          else if (diffMins <= 15 && diffMins > 14.8 && !ackKeys.includes(`${b.id}-15m`)) thresholdObj = { id: b.id, tourName: b.tourName, time: '15 phút', key: `${b.id}-15m` };

          if (thresholdObj) { setReminderModal(thresholdObj); break; }
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
    if (!startTimeStr) return null;
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
    const rawAll = await AsyncStorage.getItem('@guest_bookings');
    const allBookings = rawAll ? JSON.parse(rawAll) : [];
    
    const updatedAll = allBookings.map((b: any) => b.id === cancelModal.id ? { ...b, status: 'cancelled' } : b);
    await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedAll));
    setBookings(bookings.map(b => b.id === cancelModal.id ? { ...b, status: 'cancelled' } : b));
    
    setCancelModal(null);
    Alert.alert('Thành công', 'Đã hủy đơn đặt tour.');
  };

  const executeReschedule = async (newSch: any) => {
    if (!rescheduleModal) return;
    const rawAll = await AsyncStorage.getItem('@guest_bookings');
    const allBookings = rawAll ? JSON.parse(rawAll) : [];
    
    const updatedAll = allBookings.map((b: any) => b.id === rescheduleModal.id ? { 
      ...b, scheduleId: newSch.id, startTime: newSch.startTime, endTime: newSch.endTime, date: new Date(newSch.startTime).toLocaleDateString('vi-VN')
    } : b);

    await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedAll));
    setBookings(bookings.map(b => b.id === rescheduleModal.id ? { 
      ...b, scheduleId: newSch.id, startTime: newSch.startTime, endTime: newSch.endTime, date: new Date(newSch.startTime).toLocaleDateString('vi-VN')
    } : b));

    setRescheduleModal(null);
    Alert.alert('Thành công', 'Đã dời ngày khởi hành.');
  };

  const getTourSchedules = (tourId: string) => {
    const t = tours.find(x => x.id === tourId);
    if (!t || !t.schedules) return [];
    return t.schedules.filter((sch:any) => new Date(sch.startTime).getTime() > new Date().getTime());
  };

  const visible = useMemo(() => bookings.filter(b => {
    const st = b.status || 'paid';
    if (segment === 'upcoming') return ['pending', 'paid', 'confirmed', 'accepted'].includes(st);
    if (segment === 'active')   return ['checked_in', 'checked-in', 'on_tour', 'on-tour'].includes(st);
    return ['completed', 'done', 'cancelled', 'rejected'].includes(st);
  }), [bookings, segment]);

  const safeDate = (dateStr: string) => {
    if (!dateStr) return "Chưa xác định";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Chưa xác định" : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
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
          const cd = segment === 'upcoming' ? getCountdownStatus(b.startTime || b.tourDate) : null;
          const hasReviewed = reviews.some(r => r.bookingId === b.id);

          return (
          <View key={b.id} style={s.card}>
            <View style={s.cardHeader}>
               <Text style={s.bookingId}>#{b.id}</Text>
               <View style={s.statusBadge}><Text style={s.statusTxt}>{(b.status || 'PAID').toUpperCase()}</Text></View>
            </View>
            <View style={s.cardBody}>
              <Text style={s.tourName}>{b.tourName || "Tour không rõ"}</Text>
              
              {cd && (
                <View style={[s.countdownBox, { backgroundColor: cd.color + '15', borderColor: cd.color + '40' }]}>
                  <Ionicons name={cd.icon as any} size={16} color={cd.color} />
                  <Text style={[s.countdownTxt, { color: cd.color }]}>{cd.text}</Text>
                </View>
              )}

              <View style={s.metaRow}><Ionicons name="calendar" size={14} color="#4f7cff" /><Text style={s.metaTxt}>{safeDate(b.startTime || b.tourDate)}</Text></View>
              <View style={s.metaRow}><Ionicons name="person" size={14} color="#4f7cff" /><Text style={s.metaTxt}>HDV: {b.guideName || "Hệ thống tự động xếp"}</Text></View>
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

              {/* NÚT ĐÁNH GIÁ & SỬA ĐÁNH GIÁ */}
              {segment === 'done' && (b.status === 'completed' || b.status === 'done') && (
                <TouchableOpacity 
                  style={[s.actionBtn, { backgroundColor: hasReviewed ? '#f0fdf4' : '#fffbeb' }]} 
                  onPress={() => router.push({ pathname: '/guest_post_tour', params: { bookingId: b.id } } as any)}
                >
                  <Text style={[s.actionTxt, { color: hasReviewed ? '#16a34a' : '#d97706' }]}>
                    {hasReviewed ? 'Xem / Sửa đánh giá' : 'Viết đánh giá'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )})}
        {visible.length === 0 && <Text style={{textAlign: 'center', color: '#7a8cc2', marginTop: 40}}>Không có đơn đặt nào.</Text>}
      </ScrollView>

      {/* CÁC MODAL GIỮ NGUYÊN */}
      <Modal visible={!!reminderModal} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
               <Ionicons name="notifications-circle" size={40} color="#f59e0b" />
            </View>
            <Text style={s.popupTitle}>Sắp đến giờ đi Tour!</Text>
            <Text style={s.popupMessage}>
              Chuyến đi <Text style={{fontWeight: 'bold', color: '#1f2a58'}}>{reminderModal?.tourName}</Text> sẽ bắt đầu trong vòng <Text style={{fontWeight: 'bold', color: '#ef4444'}}>{reminderModal?.time}</Text> nữa.
            </Text>
            <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#f59e0b', width: '100%'}]} onPress={handleAckReminder}>
              <Text style={s.popupSubmitBtnTxt}>Tôi đã sẵn sàng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!cancelModal} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <Ionicons name="warning" size={50} color="#ef4444" />
            <Text style={s.popupTitle}>Hủy Đặt Tour</Text>
            <Text style={s.popupMessage}>Bạn có chắc chắn muốn hủy đơn #{cancelModal?.id} không?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setCancelModal(null)}><Text style={s.popupCancelBtnTxt}>Đóng</Text></TouchableOpacity>
              <TouchableOpacity style={[s.popupSubmitBtn, {backgroundColor: '#ef4444'}]} onPress={executeCancel}><Text style={s.popupSubmitBtnTxt}>Xác nhận Hủy</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!rescheduleModal} transparent animationType="slide">
        <View style={s.popupOverlay}>
          <View style={[s.popupBox, { maxHeight: '80%', padding: 20 }]}>
            <Text style={s.popupTitle}>Chọn ngày Dời</Text>
            <Text style={s.popupMessage}>Tour: {rescheduleModal?.tourName}</Text>
            <ScrollView style={{ width: '100%', marginBottom: 20 }}>
              {getTourSchedules(rescheduleModal?.tourId).map((sch: any) => (
                <TouchableOpacity key={sch.id} style={s.schCard} onPress={() => executeReschedule(sch)}>
                  <Text style={{ fontSize: Math.round(14 * scale), fontWeight: '800', color: '#1f2a58' }}>{new Date(sch.startTime).toLocaleString('vi-VN')}</Text>
                </TouchableOpacity>
              ))}
              {getTourSchedules(rescheduleModal?.tourId).length === 0 && <Text style={{ textAlign: 'center', color: '#ef4444' }}>Tour này hiện không có lịch trình trống nào khác.</Text>}
            </ScrollView>
            <TouchableOpacity style={[s.popupCancelBtn, { width: '100%' }]} onPress={() => setRescheduleModal(null)}><Text style={s.popupCancelBtnTxt}>Đóng</Text></TouchableOpacity>
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
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    popupCancelBtnTxt: { color: "#64748b", fontSize: sz(15), fontWeight: "800" },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(14), alignItems: "center", justifyContent: "center" },
    popupSubmitBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
  });
};