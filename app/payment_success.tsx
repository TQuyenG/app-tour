/**
 * app/payment_success.tsx
 * Thông báo chốt tour thành công - Nhảy thẳng vào Chi tiết Đơn
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={s.iconWrap}>
         <Ionicons name="checkmark-circle" size={Math.round(100 * scale)} color="#10b981" />
      </View>
      <Text style={s.title}>Tuyệt vời! Đã chốt tour.</Text>
      <Text style={s.sub}>Hóa đơn và thông tin chuyến đi đã được gửi đến Hướng dẫn viên. Bạn có thể chat trực tiếp với họ ngay bây giờ.</Text>
      
      {/* CHUYỂN HƯỚNG THẲNG TỚI CHI TIẾT CHUYẾN ĐI ĐÓ */}
      <TouchableOpacity 
        style={s.btn} 
        onPress={() => router.replace({ pathname: '/shared-booking-detail', params: { bookingId } } as any)}
      >
        <Text style={s.btnTxt}>Xem chi tiết chuyến đi</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={s.outlineBtn} onPress={() => router.replace('/' as any)}>
        <Text style={s.outlineBtnTxt}>Về trang chủ</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff', alignItems: 'center', justifyContent: 'center', padding: sz(24) },
    iconWrap: { backgroundColor: '#d1fae5', borderRadius: sz(100), padding: sz(10), marginBottom: sz(20), elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: {width: 0, height: 10} },
    title: { fontSize: sz(26), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12), textAlign: 'center' },
    sub: { fontSize: sz(15), color: '#64748b', textAlign: 'center', lineHeight: sz(24), marginBottom: sz(40), paddingHorizontal: sz(10) },
    btn: { backgroundColor: '#4f7cff', width: '100%', height: sz(56), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center', marginBottom: sz(14), elevation: 5, shadowColor: '#4f7cff', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 15 },
    btnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '800' },
    outlineBtn: { backgroundColor: 'transparent', width: '100%', height: sz(56), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e4ebff' },
    outlineBtnTxt: { color: '#7a8cc2', fontSize: sz(16), fontWeight: '700' }
  });
};