/**
 * app/(tabs)/bookings.tsx  (guest_bookings.tsx)
 * - Đọc booking từ @guest_bookings AsyncStorage thay vì local-storage cũ
 * - Route đúng sang các file mới (guest_booking_flow, guest_post_tour)
 * - useFocusEffect reload khi quay lại
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BookingStatus = 'pending' | 'paid' | 'checked-in' | 'on-tour' | 'completed' | 'cancelled' | 'accepted' | 'ongoing' | 'done'
  | 'pending_guide' | 'guide_accepted' | 'guide_rejected' | 'checked_in' | 'on_tour';

interface GuestBooking {
  id: string; tourId: string; tourName: string;
  guideName: string; guests: number; totalAmount: number;
  paymentMethod: string; status: BookingStatus;
  createdAt: string; date: string;
}

const STORAGE_KEY = '@guest_bookings';

const STATUS_META: Record<BookingStatus, { label: string; color: string; step: number }> = {
  // status cũ
  pending:      { label: 'Chờ thanh toán', color: '#d97706', step: 1 },
  paid:         { label: 'Đã thanh toán',  color: '#4f7cff', step: 2 },
  'checked-in': { label: 'Đã check-in',   color: '#a855f7', step: 3 },
  'on-tour':    { label: 'Đang đi tour',  color: '#2856d6', step: 4 },
  accepted:     { label: 'Đã xác nhận',   color: '#4f7cff', step: 2 },
  ongoing:      { label: 'Đang dẫn',      color: '#a855f7', step: 4 },
  done:         { label: 'Hoàn thành',    color: '#16a34a', step: 5 },
  completed:    { label: 'Hoàn tất',      color: '#16a34a', step: 5 },
  cancelled:    { label: 'Đã hủy',        color: '#dc2626', step: 0 },
  // status mới từ guest_booking_flow.tsx
  pending_guide:   { label: 'Chờ HDV xác nhận', color: '#d97706', step: 1 },
  guide_accepted:  { label: 'HDV đã nhận',       color: '#4f7cff', step: 2 },
  guide_rejected:  { label: 'HDV từ chối',        color: '#dc2626', step: 0 },
  checked_in:      { label: 'Đã check-in',        color: '#a855f7', step: 3 },
  on_tour:         { label: 'Đang đi tour',       color: '#2856d6', step: 4 },
};

const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

export default function GuestBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [segment, setSegment] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setBookings(JSON.parse(raw));
    }).catch(() => {});
  }, []));

  const visible = useMemo(() => bookings.filter(b => {
    const s = b.status;
    if (segment === 'upcoming') return ['pending','paid','accepted','pending_guide','guide_accepted'].includes(s);
    if (segment === 'active')   return ['checked-in','on-tour','ongoing','checked_in','on_tour'].includes(s);
    return ['completed','done','cancelled','guide_rejected'].includes(s);
  }), [bookings, segment]);

  const getAction = (status: BookingStatus) => {
    if (['pending','pending_guide'].includes(status))
      return { label: 'Xem đơn', route: 'guest_booking_flow', step: '4' };
    if (['paid','accepted','guide_accepted'].includes(status))
      return { label: 'Check-in', route: 'guest_booking_flow', step: '6' };
    if (['checked-in','on-tour','ongoing','checked_in','on_tour'].includes(status))
      return { label: 'Theo dõi tour', route: 'guest_booking_flow', step: '7' };
    if (['completed','done'].includes(status))
      return { label: 'Đánh giá', route: 'guest_post_tour', step: '0' };
    return null;
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>
      <Text style={st.title}>Đơn đặt tour</Text>
      <Text style={st.subtitle}>Theo dõi trạng thái các chuyến đi của bạn</Text>

      {/* Segment */}
      <View style={st.segmentRow}>
        {[
          { key: 'upcoming', label: 'Sắp đi',  count: bookings.filter(b => ['pending','paid','accepted','pending_guide','guide_accepted'].includes(b.status)).length },
          { key: 'active',   label: 'Đang đi', count: bookings.filter(b => ['checked-in','on-tour','ongoing','checked_in','on_tour'].includes(b.status)).length },
          { key: 'done',     label: 'Hoàn tất', count: bookings.filter(b => ['completed','done','cancelled','guide_rejected'].includes(b.status)).length },
        ].map(seg => (
          <TouchableOpacity key={seg.key} style={[st.segment, segment === seg.key && st.segmentActive]} onPress={() => setSegment(seg.key as any)}>
            <Text style={[st.segmentText, segment === seg.key && st.segmentTextActive]}>{seg.label}</Text>
            {seg.count > 0 && <View style={[st.segBadge, segment === seg.key && { backgroundColor: '#fff3' }]}><Text style={[st.segBadgeTxt, segment === seg.key && { color: '#fff' }]}>{seg.count}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      {visible.map(b => {
        const meta = STATUS_META[b.status] || STATUS_META.pending;
        const action = getAction(b.status);
        return (
          <View key={b.id} style={st.card}>
            {/* Icon */}
            <View style={st.cardIcon}>
              <Ionicons name="airplane-outline" size={22} color="#4f7cff" />
            </View>
            <View style={st.cardBody}>
              <Text style={st.tourName}>{b.tourName || 'Tour đã đặt'}</Text>
              <Text style={st.meta}>Mã: {b.id} · HDV: {b.guideName || '---'}</Text>
              <Text style={st.meta}>{b.guests} khách · {b.date}</Text>

              {/* Timeline dots */}
              <View style={st.timelineRow}>
                {[1,2,3,4,5].map(step => (
                  <View key={step} style={[st.dot, step <= meta.step && st.dotActive, step === meta.step && { backgroundColor: meta.color }]} />
                ))}
              </View>

              <View style={st.cardFooter}>
                <Text style={st.price}>{fmt(b.totalAmount)}</Text>
                <View style={[st.statusBadge, { backgroundColor: meta.color + '18' }]}>
                  <Text style={[st.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {action && (
                <TouchableOpacity
                  style={st.actionBtn}
                  onPress={() => router.push({
                    pathname: `/${action.route}` as any,
                    params: { bookingId: b.id, resumeStep: action.step },
                  })}
                >
                  <Text style={st.actionTxt}>{action.label}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {visible.length === 0 && (
        <View style={st.emptyCard}>
          <Ionicons name="receipt-outline" size={48} color="#c0cbe8" />
          <Text style={st.emptyText}>
            {segment === 'upcoming' ? 'Chưa có đơn sắp tới. Hãy đặt tour mới!' :
             segment === 'active'   ? 'Không có tour đang diễn ra.' :
             'Chưa có đơn đã hoàn tất.'}
          </Text>
          {segment === 'upcoming' && (
            <TouchableOpacity style={st.emptyBtn} onPress={() => router.push('/explore')}>
              <Text style={st.emptyBtnTxt}>Khám phá tour</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18, paddingBottom: 26 },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 14 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 9 },
  segmentActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  segmentText: { color: '#6c7fb7', fontWeight: '600', fontSize: 12 },
  segmentTextActive: { color: '#fff' },
  segBadge: { backgroundColor: '#edf2ff', borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segBadgeTxt: { color: '#4f7cff', fontSize: 10, fontWeight: '800' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  tourName: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  meta: { color: '#7a8cc2', marginTop: 3, fontSize: 12 },
  timelineRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  dot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#d7e0f6' },
  dotActive: { backgroundColor: '#4f7cff' },
  cardFooter: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#4f7cff', fontWeight: '700', fontSize: 15 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  actionBtn: { marginTop: 8, alignSelf: 'flex-start', height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#f7faff', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 12 },
  emptyCard: { borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 10 },
  emptyText: { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 4, height: 40, borderRadius: 10, backgroundColor: '#4f7cff', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  emptyBtnTxt: { color: '#fff', fontWeight: '700' },
});