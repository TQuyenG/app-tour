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
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BookingStatus = 'pending' | 'paid' | 'checked-in' | 'on-tour' | 'completed' | 'cancelled' | 'accepted' | 'ongoing' | 'done'
  | 'pending_guide' | 'guide_accepted' | 'guide_rejected' | 'checked_in' | 'on_tour';

interface GuestBooking {
  id: string; tourId: string; tourName: string;
  guideName: string; guests: number; totalAmount: number;
  paymentMethod: string; status: BookingStatus;
  createdAt: string; date: string;
}

const STORAGE_KEY = '@guest_bookings';

<<<<<<< Updated upstream
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
=======
// ── Ảnh Unsplash theo tourId & tên tour ──
const TOUR_IMG_MAP: Record<string, string> = {
  't1':  'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=500&q=80',
  't2':  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500&q=80',
  't3':  'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=500&q=80',
  't4':  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80',
  't5':  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500&q=80',
  't6':  'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=500&q=80',
  't7':  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80',
  't8':  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500&q=80',
  't9':  'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=500&q=80',
  't10': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
  't11': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500&q=80',
  't12': 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=500&q=80',
>>>>>>> Stashed changes
};

function getBookingImg(tourId: string, tourName: string): string {
  if (TOUR_IMG_MAP[tourId]) return TOUR_IMG_MAP[tourId];
  const n = (tourName || '').toLowerCase();
  if (n.includes('đà lạt'))    return TOUR_IMG_MAP['t1'];
  if (n.includes('phú quốc'))  return TOUR_IMG_MAP['t2'];
  if (n.includes('nha trang')) return TOUR_IMG_MAP['t3'];
  if (n.includes('sapa') || n.includes('sa pa')) return TOUR_IMG_MAP['t4'];
  if (n.includes('hội an'))    return TOUR_IMG_MAP['t5'];
  if (n.includes('huế'))       return TOUR_IMG_MAP['t6'];
  if (n.includes('mũi né'))    return TOUR_IMG_MAP['t7'];
  if (n.includes('hà giang'))  return TOUR_IMG_MAP['t8'];
  if (n.includes('cần thơ'))   return TOUR_IMG_MAP['t9'];
  if (n.includes('quy nhơn'))  return TOUR_IMG_MAP['t10'];
  if (n.includes('bà nà'))     return TOUR_IMG_MAP['t11'];
  if (n.includes('côn đảo'))   return TOUR_IMG_MAP['t12'];
  if (n.includes('hạ long'))   return 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=500&q=80';
  if (n.includes('đà nẵng'))   return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500&q=80';
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=500&q=80';
}

// Avatar HDV theo tên
const GUIDE_AVATAR_MAP: Record<string, string> = {
  'trần minh khoa':  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
  'nguyễn thu hà':   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
  'lê quang dũng':   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
  'phạm hoài nam':   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
  'đỗ trúc ly':      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80',
  'bùi thanh sơn':   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80',
};

function getGuideAvatar(guideName: string): string {
  const key = (guideName || '').toLowerCase().trim();
  return GUIDE_AVATAR_MAP[key] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80';
}

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; icon: string; step: number }> = {
  pending:       { label: 'Chờ thanh toán',   color: '#d97706', bg: '#fef9c3', icon: 'time-outline',             step: 1 },
  paid:          { label: 'Đã thanh toán',    color: '#4f7cff', bg: '#eef2ff', icon: 'checkmark-circle-outline', step: 2 },
  'checked-in':  { label: 'Đã check-in',      color: '#a855f7', bg: '#fdf4ff', icon: 'location-outline',         step: 3 },
  'on-tour':     { label: 'Đang đi tour',     color: '#2856d6', bg: '#eaf0ff', icon: 'airplane-outline',         step: 4 },
  accepted:      { label: 'Đã xác nhận',      color: '#4f7cff', bg: '#eef2ff', icon: 'checkmark-circle-outline', step: 2 },
  ongoing:       { label: 'Đang dẫn',         color: '#a855f7', bg: '#fdf4ff', icon: 'walk-outline',             step: 4 },
  done:          { label: 'Hoàn thành',       color: '#16a34a', bg: '#dcfce7', icon: 'ribbon-outline',           step: 5 },
  completed:     { label: 'Hoàn tất',         color: '#16a34a', bg: '#dcfce7', icon: 'ribbon-outline',           step: 5 },
  cancelled:     { label: 'Đã hủy',           color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline',     step: 0 },
  pending_guide: { label: 'Chờ HDV xác nhận', color: '#d97706', bg: '#fef9c3', icon: 'hourglass-outline',        step: 1 },
  guide_accepted:{ label: 'HDV đã nhận',      color: '#0891b2', bg: '#e0f2fe', icon: 'person-circle-outline',    step: 2 },
  guide_rejected:{ label: 'HDV từ chối',      color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline',     step: 0 },
  checked_in:    { label: 'Đã check-in',      color: '#a855f7', bg: '#fdf4ff', icon: 'location-outline',         step: 3 },
  on_tour:       { label: 'Đang đi tour',     color: '#2856d6', bg: '#eaf0ff', icon: 'airplane-outline',         step: 4 },
};

// Step labels cho timeline
const STEP_LABELS = ['Đặt', 'Xác nhận', 'Check-in', 'Đang đi', 'Xong'];

const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

// ── Complaint / Dispute types (đồng bộ với staff-complaints & admin-complaints) ──
type ComplaintType = 'guide' | 'tour' | 'payment' | 'app' | 'other';
const COMPLAINT_TYPES: { id: ComplaintType; label: string; icon: string; color: string }[] = [
  { id: 'guide',   label: 'Vấn đề HDV',     icon: 'person-outline',          color: '#8b5cf6' },
  { id: 'tour',    label: 'Chất lượng tour', icon: 'map-outline',             color: '#2856d6' },
  { id: 'payment', label: 'Thanh toán',      icon: 'card-outline',            color: '#dc2626' },
  { id: 'app',     label: 'Ứng dụng',        icon: 'phone-portrait-outline',  color: '#64748b' },
  { id: 'other',   label: 'Khác',            icon: 'help-circle-outline',     color: '#94a3b8' },
];

export default function GuestBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [segment, setSegment] = useState<'upcoming' | 'active' | 'done'>('upcoming');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintBooking, setComplaintBooking]     = useState<GuestBooking | null>(null);
  const [complaintType, setComplaintType]           = useState<ComplaintType>('guide');
  const [complaintTitle, setComplaintTitle]         = useState('');
  const [complaintDesc, setComplaintDesc]           = useState('');
  const [submitting, setSubmitting]                 = useState(false);

  const openComplaint = (b: GuestBooking) => {
    setComplaintBooking(b);
    setComplaintType('guide');
    setComplaintTitle('');
    setComplaintDesc('');
    setShowComplaintModal(true);
  };

  const submitComplaint = async () => {
    if (!complaintBooking) return;
    if (!complaintTitle.trim()) { Alert.alert('Thiếu', 'Vui lòng nhập tiêu đề khiếu nại.'); return; }
    if (!complaintDesc.trim())  { Alert.alert('Thiếu', 'Vui lòng mô tả chi tiết vấn đề.'); return; }
    setSubmitting(true);

    // Lấy tên guest từ profile
    const profileRaw = await AsyncStorage.getItem('@app_profile').catch(() => null);
    const profile = profileRaw ? JSON.parse(profileRaw) : null;
    const guestName  = profile?.name  || 'Khách hàng';
    const guestEmail = profile?.email || 'guest@app.com';

    const newComplaint = {
      id: `cp${Date.now()}`,
      guestName,
      guestEmail,
      type: complaintType,
      title: complaintTitle.trim(),
      description: complaintDesc.trim(),
      bookingId: complaintBooking.id,
      tourName: complaintBooking.tourName,
      amount: complaintBooking.totalAmount,
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      assignedTo: '',
      adminNote: '',
      voucherSent: false,
    };

    // Ghi vào @complaints (staff + admin đọc)
    const cRaw = await AsyncStorage.getItem('@complaints').catch(() => null);
    const cList = cRaw ? JSON.parse(cRaw) : [];
    cList.unshift(newComplaint);
    await AsyncStorage.setItem('@complaints', JSON.stringify(cList)).catch(() => {});

    // Ghi vào @guest_complaints (guest tự xem)
    const gcRaw = await AsyncStorage.getItem('@guest_complaints').catch(() => null);
    const gcList = gcRaw ? JSON.parse(gcRaw) : [];
    gcList.unshift(newComplaint);
    await AsyncStorage.setItem('@guest_complaints', JSON.stringify(gcList)).catch(() => {});

    // Push notification cho guest
    const nRaw = await AsyncStorage.getItem('@guest_notifications').catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    nList.unshift({
      id: `n${Date.now()}`,
      message: `📋 Khiếu nại #${newComplaint.id} đã được ghi nhận. CSKH sẽ phản hồi trong 24-48 giờ.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem('@guest_notifications', JSON.stringify(nList)).catch(() => {});

    setSubmitting(false);
    setShowComplaintModal(false);
    Alert.alert('✅ Đã gửi khiếu nại', `Mã khiếu nại: #${newComplaint.id}\nCSKH sẽ phản hồi trong 24-48 giờ làm việc.`);
  };

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

      {/* ── Header ── */}
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Đơn đặt tour</Text>
          <Text style={st.subtitle}>Theo dõi trạng thái các chuyến đi của bạn</Text>
        </View>
        <View style={st.totalBadge}>
          <Ionicons name="receipt-outline" size={14} color="#4f7cff" />
          <Text style={st.totalBadgeTxt}>{bookings.length} đơn</Text>
        </View>
      </View>

      {/* ── Segment tabs ── */}
      <View style={st.segmentRow}>
        {[
<<<<<<< Updated upstream
          { key: 'upcoming', label: 'Sắp đi',  count: bookings.filter(b => ['pending','paid','accepted','pending_guide','guide_accepted'].includes(b.status)).length },
          { key: 'active',   label: 'Đang đi', count: bookings.filter(b => ['checked-in','on-tour','ongoing','checked_in','on_tour'].includes(b.status)).length },
          { key: 'done',     label: 'Hoàn tất', count: bookings.filter(b => ['completed','done','cancelled','guide_rejected'].includes(b.status)).length },
=======
          { key: 'upcoming', label: 'Sắp đi',  emoji: '✈️', count: bookings.filter(b => ['pending','paid','accepted','pending_guide','guide_accepted'].includes(b.status)).length },
          { key: 'active',   label: 'Đang đi', emoji: '🗺️', count: bookings.filter(b => ['checked-in','on-tour','ongoing','checked_in','on_tour'].includes(b.status)).length },
          { key: 'done',     label: 'Hoàn tất',emoji: '✅', count: bookings.filter(b => ['completed','done','cancelled','guide_rejected'].includes(b.status)).length },
>>>>>>> Stashed changes
        ].map(seg => (
          <TouchableOpacity
            key={seg.key}
            style={[st.segment, segment === seg.key && st.segmentActive]}
            onPress={() => setSegment(seg.key as any)}
          >
            <Text style={st.segEmoji}>{seg.emoji}</Text>
            <Text style={[st.segmentText, segment === seg.key && st.segmentTextActive]}>{seg.label}</Text>
            {seg.count > 0 && (
              <View style={[st.segBadge, segment === seg.key && st.segBadgeActive]}>
                <Text style={[st.segBadgeTxt, segment === seg.key && st.segBadgeTxtActive]}>{seg.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Booking cards ── */}
      {visible.map(b => {
        const meta   = STATUS_META[b.status] ?? STATUS_META.pending;
        const action = getAction(b.status);
        const imgUrl = getBookingImg(b.tourId, b.tourName);
        const guideAvatar = getGuideAvatar(b.guideName);
        const isCancelled = b.status === 'cancelled' || b.status === 'guide_rejected';

        return (
          <View key={b.id} style={[st.card, isCancelled && st.cardCancelled]}>

            {/* ── Ảnh banner tour ── */}
            <View style={st.cardImgWrap}>
              <Image source={{ uri: imgUrl }} style={st.cardImg} resizeMode="cover" />
              {/* Overlay gradient */}
              <View style={st.cardImgOverlay} />

              {/* Badge mã booking */}
              <View style={st.bookingIdBadge}>
                <Text style={st.bookingIdTxt}>#{b.id}</Text>
              </View>

              {/* Status badge nổi trên ảnh */}
              <View style={[st.statusBadgeFloat, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                <Text style={[st.statusFloatTxt, { color: meta.color }]}>{meta.label}</Text>
              </View>

              {/* Avatar HDV nổi góc phải dưới */}
              {b.guideName && b.guideName !== '---' && (
                <View style={st.guideAvatarWrap}>
                  <Image source={{ uri: guideAvatar }} style={st.guideAvatarImg} resizeMode="cover" />
                  <View style={st.guideOnlineDot} />
                </View>
              )}
            </View>

            {/* ── Nội dung card ── */}
            <View style={st.cardBody}>
              <Text style={st.tourName} numberOfLines={2}>{b.tourName || 'Tour đã đặt'}</Text>

              {/* Meta info */}
              <View style={st.metaGrid}>
                <View style={st.metaRow}>
                  <Ionicons name="barcode-outline" size={12} color="#7a8cc2" />
                  <Text style={st.metaTxt}>Mã: <Text style={{ color: '#4f7cff', fontWeight: '700' }}>{b.id}</Text></Text>
                </View>
                {b.guideName && b.guideName !== '---' && (
                  <View style={st.metaRow}>
                    <Ionicons name="person-outline" size={12} color="#7a8cc2" />
                    <Text style={st.metaTxt}>HDV: <Text style={{ color: '#1f2a58', fontWeight: '600' }}>{b.guideName}</Text></Text>
                  </View>
                )}
                <View style={st.metaRow}>
                  <Ionicons name="people-outline" size={12} color="#7a8cc2" />
                  <Text style={st.metaTxt}>{b.guests} khách</Text>
                  {b.date ? (
                    <>
                      <Text style={st.metaDot}>·</Text>
                      <Ionicons name="calendar-outline" size={12} color="#7a8cc2" />
                      <Text style={st.metaTxt}>{b.date}</Text>
                    </>
                  ) : null}
                </View>
              </View>

<<<<<<< Updated upstream
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
=======
              {/* ── Timeline ── */}
              {!isCancelled && (
                <View style={st.timelineWrap}>
                  <View style={st.timelineRow}>
                    {[1,2,3,4,5].map(step => (
                      <View key={step} style={st.timelineSegWrap}>
                        <View style={[
                          st.timelineSeg,
                          step <= meta.step && { backgroundColor: meta.color },
                          step === meta.step && st.timelineSegCurrent,
                        ]} />
                      </View>
                    ))}
                  </View>
                  <View style={st.timelineLabelRow}>
                    {STEP_LABELS.map((lbl, i) => (
                      <Text key={lbl} style={[st.timelineLabel, (i + 1) <= meta.step && { color: meta.color, fontWeight: '700' }]}>
                        {lbl}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Footer: giá + action ── */}
              <View style={st.cardFooter}>
                <View>
                  <Text style={st.priceSub}>Tổng tiền</Text>
                  <Text style={[st.price, isCancelled && { color: '#94a3b8' }]}>{fmt(b.totalAmount)}</Text>
                </View>

                <View style={st.actionGroup}>
                  {action && (
                    <TouchableOpacity
                      style={[st.actionBtn, action.label === 'Đánh giá' && st.actionBtnGreen]}
                      onPress={() => router.push({
                        pathname: `/${action.route}` as any,
                        params: { bookingId: b.id, resumeStep: action.step },
                      })}
                    >
                      <Ionicons
                        name={
                          action.label === 'Check-in' ? 'location-outline' :
                          action.label === 'Đánh giá' ? 'star-outline' :
                          action.label === 'Theo dõi tour' ? 'map-outline' :
                          'document-text-outline'
                        }
                        size={13}
                        color="#fff"
                      />
                      <Text style={st.actionTxt}>{action.label}</Text>
                    </TouchableOpacity>
                  )}

                  {isCancelled && (
                    <View style={st.cancelledTag}>
                      <Ionicons name="close-circle-outline" size={13} color="#dc2626" />
                      <Text style={st.cancelledTxt}>Đã hủy</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── Nút Khiếu nại + Tranh chấp ── */}
              {!isCancelled && (
                <View style={st.complaintRow}>
                  <TouchableOpacity
                    style={st.complaintBtn}
                    onPress={() => openComplaint(b)}
                  >
                    <Ionicons name="warning-outline" size={13} color="#d97706" />
                    <Text style={st.complaintBtnTxt}>Khiếu nại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.disputeBtn}
                    onPress={() => {
                      setComplaintBooking(b);
                      setComplaintType('payment');
                      setComplaintTitle('Tranh chấp booking ' + b.id);
                      setComplaintDesc('');
                      setShowComplaintModal(true);
                    }}
                  >
                    <Ionicons name="shield-outline" size={13} color="#dc2626" />
                    <Text style={st.disputeBtnTxt}>Tranh chấp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.viewComplaintBtn}
                    onPress={() => router.push('/guest_complaints' as any)}
                  >
                    <Ionicons name="list-outline" size={13} color="#7a8cc2" />
                    <Text style={st.viewComplaintTxt}>Xem khiếu nại</Text>
                  </TouchableOpacity>
                </View>
>>>>>>> Stashed changes
              )}
            </View>
          </View>
        );
      })}

      {/* ── Empty state ── */}
      {visible.length === 0 && (
        <View style={st.emptyCard}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>
            {segment === 'upcoming' ? '✈️' : segment === 'active' ? '🗺️' : '📋'}
          </Text>
          <Text style={st.emptyTitle}>
            {segment === 'upcoming' ? 'Chưa có đơn sắp tới' :
             segment === 'active'   ? 'Không có tour đang diễn ra' :
             'Chưa có đơn hoàn tất'}
          </Text>
          <Text style={st.emptyText}>
            {segment === 'upcoming' ? 'Khám phá và đặt tour ngay hôm nay!' :
             segment === 'active'   ? 'Các tour đang đi sẽ hiển thị tại đây.' :
             'Lịch sử chuyến đi sẽ hiển thị ở đây.'}
          </Text>
          {segment === 'upcoming' && (
            <TouchableOpacity style={st.emptyBtn} onPress={() => router.push('/explore' as any)}>
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={st.emptyBtnTxt}>Khám phá tour</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

   {/* ── Modal tạo khiếu nại / tranh chấp ── */}
      <Modal
        visible={showComplaintModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComplaintModal(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHandle} />

            {/* Header modal */}
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalTitle}>
                  {complaintType === 'payment' && complaintTitle.startsWith('Tranh chấp')
                    ? '⚖️ Gửi Tranh chấp'
                    : '📋 Gửi Khiếu nại'}
                </Text>
                {complaintBooking && (
                  <Text style={st.modalSub}>Booking: #{complaintBooking.id} · {complaintBooking.tourName}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)} style={st.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Ảnh tour */}
              {complaintBooking && (
                <View style={st.modalImgWrap}>
                  <Image
                    source={{ uri: getBookingImg(complaintBooking.tourId, complaintBooking.tourName) }}
                    style={st.modalImg}
                    resizeMode="cover"
                  />
                  <View style={st.modalImgOverlay} />
                  <Text style={st.modalImgTxt}>{complaintBooking.tourName}</Text>
                </View>
              )}

              <View style={{ padding: 16 }}>
                {/* Loại khiếu nại */}
                <Text style={st.modalLabel}>Loại vấn đề *</Text>
                <View style={st.typeGrid}>
                  {COMPLAINT_TYPES.map(ct => (
                    <TouchableOpacity
                      key={ct.id}
                      style={[st.typeChip, complaintType === ct.id && { borderColor: ct.color, backgroundColor: ct.color + '12' }]}
                      onPress={() => setComplaintType(ct.id)}
                    >
                      <Ionicons name={ct.icon as any} size={14} color={complaintType === ct.id ? ct.color : '#94a3b8'} />
                      <Text style={[st.typeChipTxt, complaintType === ct.id && { color: ct.color, fontWeight: '700' }]}>{ct.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tiêu đề */}
                <Text style={st.modalLabel}>Tiêu đề *</Text>
                <TextInput
                  style={st.modalInput}
                  value={complaintTitle}
                  onChangeText={setComplaintTitle}
                  placeholder="Mô tả ngắn vấn đề bạn gặp..."
                  placeholderTextColor="#b0bdd8"
                />

                {/* Mô tả chi tiết */}
                <Text style={st.modalLabel}>Mô tả chi tiết *</Text>
                <TextInput
                  style={[st.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                  value={complaintDesc}
                  onChangeText={setComplaintDesc}
                  placeholder="Trình bày chi tiết sự việc, thời gian, địa điểm, tên HDV liên quan..."
                  placeholderTextColor="#b0bdd8"
                  multiline
                  numberOfLines={4}
                />

                {/* Chính sách */}
                <View style={st.policyBox}>
                  <Ionicons name="information-circle-outline" size={14} color="#2856d6" />
                  <Text style={st.policyTxt}>CSKH sẽ phản hồi trong 24-48 giờ làm việc. Mọi khiếu nại đều được ghi nhận và xử lý công bằng.</Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[st.submitBtn, (!complaintTitle.trim() || !complaintDesc.trim() || submitting) && st.submitBtnOff]}
                  onPress={submitComplaint}
                  disabled={!complaintTitle.trim() || !complaintDesc.trim() || submitting}
                >
                  <Ionicons name="send-outline" size={16} color="#fff" />
                  <Text style={st.submitBtnTxt}>{submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#f3f7ff' },
  content:  { padding: 16, paddingBottom: 26 },

  // Header
  headerRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title:          { color: '#1f2a58', fontSize: 24, fontWeight: '800' },
  subtitle:       { color: '#7a8cc2', marginTop: 4, fontSize: 13 },
  totalBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  totalBadgeTxt:  { color: '#4f7cff', fontWeight: '700', fontSize: 12 },

  // Segment tabs
  segmentRow:       { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segment:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 10, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 1 },
  segmentActive:    { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  segEmoji:         { fontSize: 13 },
  segmentText:      { color: '#6c7fb7', fontWeight: '600', fontSize: 12 },
  segmentTextActive:{ color: '#fff', fontWeight: '800' },
  segBadge:         { backgroundColor: '#edf2ff', borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segBadgeActive:   { backgroundColor: 'rgba(255,255,255,0.25)' },
  segBadgeTxt:      { color: '#4f7cff', fontSize: 10, fontWeight: '800' },
  segBadgeTxtActive:{ color: '#fff' },

  // Card
  card:           { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e4ebff', overflow: 'hidden', marginBottom: 14, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  cardCancelled:  { opacity: 0.75, borderColor: '#fecaca' },

  // Card image
  cardImgWrap:       { height: 150, position: 'relative' },
  cardImg:           { width: '100%', height: '100%' },
  cardImgOverlay:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(15,25,60,0.45)' },
  bookingIdBadge:    { position: 'absolute', bottom: 10, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  bookingIdTxt:      { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusBadgeFloat:  { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  statusFloatTxt:    { fontSize: 11, fontWeight: '800' },
  guideAvatarWrap:   { position: 'absolute', bottom: -18, right: 16, width: 44, height: 44, borderRadius: 14, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  guideAvatarImg:    { width: '100%', height: '100%' },
  guideOnlineDot:    { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },

  // Card body
  cardBody:     { padding: 14, paddingTop: 22 },
  tourName:     { color: '#1f2a58', fontWeight: '800', fontSize: 15, lineHeight: 21, marginBottom: 8 },
  metaGrid:     { gap: 4, marginBottom: 10 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt:      { color: '#7a8cc2', fontSize: 12 },
  metaDot:      { color: '#c0cbe8', fontSize: 12 },

  // Timeline
  timelineWrap:        { marginBottom: 12 },
  timelineRow:         { flexDirection: 'row', gap: 4, marginBottom: 4 },
  timelineSegWrap:     { flex: 1 },
  timelineSeg:         { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0' },
  timelineSegCurrent:  { height: 6, borderRadius: 3 },
  timelineLabelRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  timelineLabel:       { color: '#b0bdd8', fontSize: 9, fontWeight: '600', flex: 1, textAlign: 'center' },

  // Footer
  cardFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceSub:        { color: '#94a3b8', fontSize: 10, fontWeight: '500' },
  price:           { color: '#4f7cff', fontWeight: '900', fontSize: 17 },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#4f7cff', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnGreen:  { backgroundColor: '#16a34a' },
  actionTxt:       { color: '#fff', fontWeight: '800', fontSize: 12 },
  cancelledTag:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  cancelledTxt:    { color: '#dc2626', fontWeight: '700', fontSize: 12 },

  // Empty
  emptyCard:    { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e4ebff', padding: 32, alignItems: 'center', marginTop: 8 },
  emptyTitle:   { color: '#1f2a58', fontWeight: '800', fontSize: 16, marginBottom: 6 },
  emptyText:    { color: '#7a8cc2', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  emptyBtn:     { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, borderRadius: 12, backgroundColor: '#4f7cff', paddingHorizontal: 22, justifyContent: 'center' },
  emptyBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Action group
  actionGroup:      { flexDirection: 'row', gap: 6, alignItems: 'center' },

  // Complaint / Dispute buttons
  complaintRow:     { flexDirection: 'row', gap: 7, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  complaintBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  complaintBtnTxt:  { color: '#d97706', fontWeight: '700', fontSize: 11 },
  disputeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  disputeBtnTxt:    { color: '#dc2626', fontWeight: '700', fontSize: 11 },
  viewComplaintBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8faff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 'auto' },
  viewComplaintTxt: { color: '#7a8cc2', fontWeight: '600', fontSize: 11 },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHandle:    { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:     { color: '#1f2a58', fontWeight: '800', fontSize: 16 },
  modalSub:       { color: '#7a8cc2', fontSize: 11, marginTop: 3 },
  modalCloseBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  modalImgWrap:   { height: 140, position: 'relative' },
  modalImg:       { width: '100%', height: '100%' },
  modalImgOverlay:{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,25,60,0.4)' },
  modalImgTxt:    { position: 'absolute', bottom: 10, left: 14, color: '#fff', fontWeight: '800', fontSize: 14 },
  modalLabel:     { color: '#1f2a58', fontWeight: '700', fontSize: 13, marginBottom: 8, marginTop: 12 },
  typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#e4ebff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8faff' },
  typeChipTxt:    { color: '#7a8cc2', fontSize: 12 },
  modalInput:     { backgroundColor: '#f8faff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 13, paddingVertical: 10, color: '#1f2a58', fontSize: 13 },
  policyBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#eaf0ff', borderRadius: 10, padding: 10, marginTop: 12, marginBottom: 4 },
  policyTxt:      { flex: 1, color: '#2856d6', fontSize: 11, lineHeight: 16 },
  submitBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: 14, backgroundColor: '#4f7cff', marginTop: 14 },
  submitBtnOff:   { backgroundColor: '#c0cbe8' },
  submitBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});