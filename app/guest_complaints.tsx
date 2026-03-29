/**
 * app/guest_complaints.tsx
 * Guest xem danh sách khiếu nại & tranh chấp của bản thân
 * Đồng bộ status từ staff/admin qua @guest_complaints key
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ComplaintStatus = 'pending' | 'investigating' | 'resolved' | 'rejected';
type ComplaintType   = 'guide' | 'tour' | 'payment' | 'app' | 'other';

interface GuestComplaint {
  id: string; type: ComplaintType; title: string; description: string;
  bookingId?: string; tourName?: string; amount?: number;
  status: ComplaintStatus; priority: 'low' | 'medium' | 'high';
  createdAt: string; resolvedAt?: string; adminNote?: string; voucherSent?: boolean;
}

const STATUS_META: Record<ComplaintStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:       { label: 'Chờ xử lý',    color: '#d97706', bg: '#fef9c3', icon: 'time-outline' },
  investigating: { label: 'Đang điều tra',color: '#2856d6', bg: '#eaf0ff', icon: 'search-outline' },
  resolved:      { label: 'Đã giải quyết',color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle-outline' },
  rejected:      { label: 'Từ chối',      color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
};

const TYPE_META: Record<ComplaintType, { label: string; icon: string; color: string }> = {
  guide:   { label: 'HDV',        icon: 'person-outline',          color: '#8b5cf6' },
  tour:    { label: 'Tour',       icon: 'map-outline',             color: '#2856d6' },
  payment: { label: 'Thanh toán', icon: 'card-outline',            color: '#dc2626' },
  app:     { label: 'Ứng dụng',   icon: 'phone-portrait-outline',  color: '#64748b' },
  other:   { label: 'Khác',       icon: 'help-circle-outline',     color: '#94a3b8' },
};

const TOUR_IMG_MAP: Record<string, string> = {
  'hội an':   'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80',
  'phú quốc': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80',
  'nha trang':'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  'sapa':     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'đà lạt':   'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80',
  'hạ long':  'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=400&q=80',
  'đà nẵng':  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
};

function getComplaintImg(tourName?: string): string {
  if (!tourName) return 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80';
  const n = tourName.toLowerCase();
  for (const [key, url] of Object.entries(TOUR_IMG_MAP)) {
    if (n.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80';
}

const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

export default function GuestComplaints() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<GuestComplaint[]>([]);
  const [filter, setFilter]         = useState<'all' | ComplaintStatus>('all');

  useFocusEffect(useCallback(() => {
    // Đọc từ @guest_complaints (staff/admin sync status về đây)
    AsyncStorage.getItem('@guest_complaints').then(raw => {
      setComplaints(raw ? JSON.parse(raw) : []);
    }).catch(() => setComplaints([]));
  }, []));

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);

  const pendingCount = complaints.filter(c => c.status === 'pending').length;

  const FILTERS: { key: 'all' | ComplaintStatus; label: string }[] = [
    { key: 'all',          label: `Tất cả (${complaints.length})` },
    { key: 'pending',      label: 'Chờ xử lý' },
    { key: 'investigating',label: 'Đang điều tra' },
    { key: 'resolved',     label: 'Đã giải quyết' },
    { key: 'rejected',     label: 'Từ chối' },
  ];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Khiếu nại & Tranh chấp</Text>
          <Text style={s.headerSub}>{complaints.length} yêu cầu · {pendingCount} chờ xử lý</Text>
        </View>
        {pendingCount > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingBadgeTxt}>{pendingCount} chờ</Text>
          </View>
        )}
      </View>

      {/* KPI Row */}
      <View style={s.kpiRow}>
        {[
          { label: 'Tổng',         value: complaints.length,                                       color: '#2856d6', bg: '#eaf0ff' },
          { label: 'Chờ xử lý',    value: complaints.filter(c => c.status === 'pending').length,   color: '#d97706', bg: '#fef9c3' },
          { label: 'Điều tra',     value: complaints.filter(c => c.status === 'investigating').length, color: '#a855f7', bg: '#fdf4ff' },
          { label: 'Giải quyết',   value: complaints.filter(c => c.status === 'resolved').length,  color: '#16a34a', bg: '#dcfce7' },
        ].map((k, i) => (
          <View key={i} style={[s.kpiCard, { backgroundColor: k.bg }]}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 48, marginBottom: 10 }}>📋</Text>
            <Text style={s.emptyTitle}>Chưa có khiếu nại nào</Text>
            <Text style={s.emptyTxt}>Nếu bạn gặp vấn đề với tour hoặc HDV, hãy gửi khiếu nại từ trang Đơn đặt tour.</Text>
            <TouchableOpacity style={s.goBookingBtn} onPress={() => router.push('/bookings' as any)}>
              <Ionicons name="receipt-outline" size={16} color="#fff" />
              <Text style={s.goBookingTxt}>Đến Đơn đặt tour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(c => {
            const stMeta   = STATUS_META[c.status] ?? STATUS_META.pending;
            const typeMeta = TYPE_META[c.type]     ?? TYPE_META.other;
            const imgUrl   = getComplaintImg(c.tourName);
            return (
              <View key={c.id} style={s.card}>
                {/* Ảnh */}
                <View style={s.cardImgWrap}>
                  <Image source={{ uri: imgUrl }} style={s.cardImg} resizeMode="cover" />
                  <View style={s.cardImgOverlay} />
                  {/* ID badge */}
                  <View style={s.idBadge}>
                    <Text style={s.idTxt}>#{c.id}</Text>
                  </View>
                  {/* Status float */}
                  <View style={[s.statusFloat, { backgroundColor: stMeta.bg }]}>
                    <Ionicons name={stMeta.icon as any} size={11} color={stMeta.color} />
                    <Text style={[s.statusFloatTxt, { color: stMeta.color }]}>{stMeta.label}</Text>
                  </View>
                  {/* Priority badge */}
                  {c.priority === 'high' && (
                    <View style={s.priBadge}>
                      <Text style={s.priTxt}>Ưu tiên cao</Text>
                    </View>
                  )}
                </View>

                <View style={s.cardBody}>
                  {/* Type + title */}
                  <View style={[s.typeBadge, { backgroundColor: typeMeta.color + '15' }]}>
                    <Ionicons name={typeMeta.icon as any} size={12} color={typeMeta.color} />
                    <Text style={[s.typeTxt, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                  </View>
                  <Text style={s.cardTitle}>{c.title}</Text>

                  {/* Meta */}
                  {c.bookingId && (
                    <View style={s.metaRow}>
                      <Ionicons name="receipt-outline" size={12} color="#7a8cc2" />
                      <Text style={s.metaTxt}>Booking: <Text style={{ color: '#4f7cff', fontWeight: '700' }}>#{c.bookingId}</Text></Text>
                    </View>
                  )}
                  {c.tourName && (
                    <View style={s.metaRow}>
                      <Ionicons name="map-outline" size={12} color="#7a8cc2" />
                      <Text style={s.metaTxt}>{c.tourName}</Text>
                    </View>
                  )}
                  {c.amount !== undefined && c.amount > 0 && (
                    <View style={s.metaRow}>
                      <Ionicons name="cash-outline" size={12} color="#7a8cc2" />
                      <Text style={s.metaTxt}>Giá trị: <Text style={{ color: '#dc2626', fontWeight: '700' }}>{fmt(c.amount)}</Text></Text>
                    </View>
                  )}

                  {/* Mô tả */}
                  <Text style={s.descTxt} numberOfLines={2}>{c.description}</Text>

                  {/* Admin note (nếu có) */}
                  {c.adminNote ? (
                    <View style={s.noteBox}>
                      <Ionicons name="information-circle-outline" size={13} color="#2856d6" />
                      <Text style={s.noteTxt}>{c.adminNote}</Text>
                    </View>
                  ) : null}

                  {/* Voucher sent */}
                  {c.voucherSent && (
                    <View style={s.voucherBox}>
                      <Ionicons name="ticket-outline" size={13} color="#16a34a" />
                      <Text style={s.voucherTxt}>Đã nhận voucher bồi thường</Text>
                    </View>
                  )}

                  {/* Dates */}
                  <View style={s.dateRow}>
                    <View style={s.datePill}>
                      <Ionicons name="calendar-outline" size={10} color="#7a8cc2" />
                      <Text style={s.dateTxt}>Gửi: {c.createdAt}</Text>
                    </View>
                    {c.resolvedAt && (
                      <View style={[s.datePill, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-circle-outline" size={10} color="#16a34a" />
                        <Text style={[s.dateTxt, { color: '#16a34a' }]}>Xong: {c.resolvedAt}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#f3f7ff' },
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', gap: 10 },
  iconBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '800', color: '#1f2a58' },
  headerSub:     { fontSize: 11, color: '#7a8cc2', marginTop: 1 },
  pendingBadge:  { backgroundColor: '#fef9c3', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  pendingBadgeTxt:{ color: '#d97706', fontWeight: '800', fontSize: 11 },
  kpiRow:        { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  kpiCard:       { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  kpiValue:      { fontSize: 18, fontWeight: '900' },
  kpiLabel:      { fontSize: 9, color: '#7a8cc2', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  filterScroll:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  filterRow:     { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  filterChip:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f7ff' },
  filterChipActive:{ backgroundColor: '#4f7cff' },
  filterTxt:     { color: '#7a8cc2', fontWeight: '600', fontSize: 12 },
  filterTxtActive:{ color: '#fff' },
  content:       { padding: 12 },
  emptyCard:     { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', padding: 32, alignItems: 'center', marginTop: 20 },
  emptyTitle:    { color: '#1f2a58', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  emptyTxt:      { color: '#7a8cc2', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  goBookingBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4f7cff', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  goBookingTxt:  { color: '#fff', fontWeight: '700' },
  card:          { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', overflow: 'hidden', marginBottom: 12, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardImgWrap:   { height: 130, position: 'relative' },
  cardImg:       { width: '100%', height: '100%' },
  cardImgOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(15,25,60,0.4)' },
  idBadge:       { position: 'absolute', bottom: 8, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  idTxt:         { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusFloat:   { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusFloatTxt:{ fontSize: 11, fontWeight: '800' },
  priBadge:      { position: 'absolute', top: 10, left: 10, backgroundColor: '#fee2e2', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  priTxt:        { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  cardBody:      { padding: 12 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 6 },
  typeTxt:       { fontSize: 11, fontWeight: '700' },
  cardTitle:     { color: '#1f2a58', fontWeight: '800', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaTxt:       { color: '#7a8cc2', fontSize: 12 },
  descTxt:       { color: '#5f73a9', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  noteBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#eaf0ff', borderRadius: 8, padding: 8, marginBottom: 6 },
  noteTxt:       { flex: 1, color: '#2856d6', fontSize: 11, lineHeight: 16 },
  voucherBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', borderRadius: 8, padding: 7, marginBottom: 6 },
  voucherTxt:    { color: '#16a34a', fontSize: 11, fontWeight: '700' },
  dateRow:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  datePill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f7ff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  dateTxt:       { color: '#7a8cc2', fontSize: 10 },
});