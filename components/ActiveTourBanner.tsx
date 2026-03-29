/**
 * components/ActiveTourBanner.tsx
 * Widget nổi theo dõi Tour (In-app Floating Banner)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ActiveTourBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeBooking, setActiveBooking] = useState<any>(null);

  useEffect(() => {
    // Quét liên tục để xem có đơn nào đang "on-tour" không
    const checkActiveTour = async () => {
      try {
        const raw = await AsyncStorage.getItem('@guest_bookings');
        if (raw) {
          const bookings = JSON.parse(raw);
          const onTour = bookings.find((b: any) => b.status === 'on-tour');
          setActiveBooking(onTour || null);
        }
      } catch (e) {}
    };
    
    checkActiveTour();
    const interval = setInterval(checkActiveTour, 3000);
    return () => clearInterval(interval);
  }, []);

  // Ẩn widget nếu đang ở chính trang Tracking hoặc Chi tiết đơn để tránh rối mắt
  if (!activeBooking || pathname === '/active_tour_tracking' || pathname === '/shared-booking-detail') {
    return null;
  }

  return (
    <View style={s.container}>
      <TouchableOpacity 
        style={s.banner} 
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/active_tour_tracking', params: { bookingId: activeBooking.id } } as any)}
      >
        <View style={s.pulseCircle}>
          <View style={s.dot} />
        </View>
        <View style={s.info}>
          <Text style={s.title}>Đang trong chuyến đi</Text>
          <Text style={s.sub}>{activeBooking.tourName}</Text>
        </View>
        <View style={s.healthMini}>
          <Ionicons name="heart" size={14} color="#ef4444" />
          <Text style={s.healthTxt}>Live</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 9999 }, // Nổi lên trên cùng
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, borderWidth: 1, borderColor: '#e2e8f0' },
  pulseCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981' },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '800', color: '#10b981', marginBottom: 2 },
  sub: { fontSize: 13, fontWeight: '700', color: '#1f2a58' },
  healthMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginRight: 10 },
  healthTxt: { fontSize: 10, fontWeight: '800', color: '#ef4444', marginLeft: 4 }
});