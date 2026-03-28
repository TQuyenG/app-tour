/**
 * app/(tabs)/bookings.tsx
 * Lịch sử Đặt Tour của Guest - Responsive UI
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GuestBooking {
  id: string; tourName: string; guideName: string; 
  guests: number; totalAmount: number; status: string; date: string;
}

export default function GuestBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [segment, setSegment] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@guest_bookings').then(raw => {
      if (raw) setBookings(JSON.parse(raw));
    });
  }, []));

  const visible = useMemo(() => bookings.filter(b => {
    if (segment === 'upcoming') return ['pending','paid','accepted'].includes(b.status);
    if (segment === 'active')   return ['checked-in','on-tour'].includes(b.status);
    return ['completed','done','cancelled'].includes(b.status);
  }), [bookings, segment]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 14 }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={s.headerRow}>
        <Text style={s.title}>Đơn đặt tour</Text>
        <Text style={s.subtitle}>Quản lý và theo dõi chuyến đi</Text>
      </View>

      <View style={s.segmentRow}>
        {[
          { key: 'upcoming', label: 'Sắp đi' },
          { key: 'active',   label: 'Đang đi' },
          { key: 'done',     label: 'Lịch sử' },
        ].map(seg => (
          <TouchableOpacity key={seg.key} style={[s.segment, segment === seg.key && s.segmentActive]} onPress={() => setSegment(seg.key as any)}>
            <Text style={[s.segmentText, segment === seg.key && s.segmentTextActive]}>{seg.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {visible.map(b => (
        <View key={b.id} style={s.card}>
          <View style={s.cardHeader}>
             <Text style={s.bookingId}>Mã Đơn: #{b.id}</Text>
             <View style={s.statusBadge}><Text style={s.statusTxt}>{b.status}</Text></View>
          </View>
          <View style={s.cardBody}>
            <Text style={s.tourName}>{b.tourName || 'Tour hệ thống'}</Text>
            <Text style={s.metaTxt}><Ionicons name="calendar-outline" /> {b.date}</Text>
            <Text style={s.metaTxt}><Ionicons name="people-outline" /> {b.guests} khách</Text>
            <Text style={s.metaTxt}><Ionicons name="person-outline" /> HDV: {b.guideName || 'Đang cập nhật'}</Text>
          </View>
          <View style={s.cardFooter}>
            <Text style={s.price}>{(b.totalAmount || 0).toLocaleString('vi-VN')}đ</Text>
            <TouchableOpacity style={s.btn}><Text style={s.btnTxt}>Chi tiết</Text></TouchableOpacity>
          </View>
        </View>
      ))}

      {visible.length === 0 && (
         <View style={{ alignItems: 'center', marginTop: 40 }}><Text style={{ color: '#7a8cc2' }}>Chưa có đơn nào ở mục này.</Text></View>
      )}
    </ScrollView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f3f7ff' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    headerRow: { marginBottom: sz(14) },
    title: { color: '#1f2a58', fontSize: sz(24), fontWeight: '900' },
    subtitle: { color: '#7a8cc2', marginTop: sz(4), fontSize: sz(13) },
    segmentRow: { flexDirection: 'row', gap: sz(8), marginBottom: sz(14) },
    segment: { flex: 1, alignItems: 'center', paddingVertical: sz(10), backgroundColor: '#fff', borderRadius: sz(12), borderWidth: 1, borderColor: '#e4ebff' },
    segmentActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
    segmentText: { color: '#6c7fb7', fontWeight: '700', fontSize: sz(13) },
    segmentTextActive: { color: '#fff' },
    card: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(14), marginBottom: sz(12), borderWidth: 1, borderColor: '#e4ebff' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f4ff', paddingBottom: sz(8), marginBottom: sz(8) },
    bookingId: { color: '#4f7cff', fontWeight: '800', fontSize: sz(13) },
    statusBadge: { backgroundColor: '#eef2ff', paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(6) },
    statusTxt: { color: '#4f7cff', fontSize: sz(11), fontWeight: '700' },
    cardBody: { marginBottom: sz(10) },
    tourName: { color: '#1f2a58', fontWeight: '900', fontSize: sz(15), marginBottom: sz(6) },
    metaTxt: { color: '#7a8cc2', fontSize: sz(13), marginBottom: sz(4) },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { color: '#10b981', fontWeight: '900', fontSize: sz(16) },
    btn: { backgroundColor: '#f3f7ff', paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(8) },
    btnTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(13) }
  });
};