import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerTintColor: '#1f2a58',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f3f7ff' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
        <Stack.Screen name="vneid-login" options={{ title: 'Đăng nhập nhanh VNeID' }} />
        <Stack.Screen name="biometric-confirm" options={{ title: 'Xác nhận sinh trắc học' }} />
        <Stack.Screen name="tour-detail" options={{ title: 'Chi tiết tour' }} />
        <Stack.Screen name="tour/[id]" options={{ title: 'Chi tiết tour' }} />
        <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
        <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
        <Stack.Screen name="favorites" options={{ title: 'Yêu thích' }} />
        <Stack.Screen name="ekyc" options={{ title: 'Xác thực eKYC' }} />
        <Stack.Screen name="search-guide" options={{ title: 'Tìm Hướng dẫn viên' }} />
        <Stack.Screen name="guide-profile" options={{ title: 'Hồ sơ HDV' }} />
        <Stack.Screen name="guide/[id]" options={{ title: 'Hồ sơ HDV' }} />
        <Stack.Screen name="services" options={{ title: 'Dịch vụ thêm' }} />
        <Stack.Screen name="booking-confirm" options={{ title: 'Xác nhận đặt tour' }} />
        <Stack.Screen name="confirm-dispatch" options={{ title: 'Đồng bộ xác nhận' }} />
        <Stack.Screen name="checkin" options={{ title: 'Check-in 2 bên' }} />
        <Stack.Screen name="on-tour" options={{ title: 'Đang đi tour' }} />
        <Stack.Screen name="tour-complete" options={{ title: 'Hoàn tất tour' }} />
        <Stack.Screen name="settlement" options={{ title: 'Giải ngân HDV' }} />
        <Stack.Screen name="review" options={{ title: 'Đánh giá chuyến đi' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="staff-home" options={{ headerShown: false }} />
        <Stack.Screen name="staff-booking-management" options={{ headerShown: false }} />
        <Stack.Screen name="staff-refund-management" options={{ headerShown: false }} />
        <Stack.Screen name="staff-livechat" options={{ headerShown: false }} />
        <Stack.Screen name="staff-voucher-send" options={{ headerShown: false }} />
        <Stack.Screen name="staff-review-moderation" options={{ headerShown: false }} />
        <Stack.Screen name="staff-profile" options={{ headerShown: false }} />
        <Stack.Screen name="admin-users" options={{ headerShown: false }} />
        <Stack.Screen name="admin-commission" options={{ headerShown: false }} />
        <Stack.Screen name="admin-banner" options={{ headerShown: false }} />
        <Stack.Screen name="admin-complaints" options={{ headerShown: false }} />
        <Stack.Screen name="admin-settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin-flash-sale" options={{ headerShown: false }} />
        <Stack.Screen name="guest_loyalty" options={{ headerShown: false }} />
        <Stack.Screen name="guest_vouchers" options={{ headerShown: false }} />
        <Stack.Screen name="guest_refund" options={{ headerShown: false }} />
        <Stack.Screen name="guide-analytics" options={{ headerShown: false }} />
        <Stack.Screen name="guide-schedule-slots" options={{ headerShown: false }} />
        <Stack.Screen name="guide-sponsored" options={{ headerShown: false }} />
        <Stack.Screen name="guide-chat" options={{ headerShown: false }} />
        <Stack.Screen name="guide-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="guide-earnings" options={{ headerShown: false }} />
        <Stack.Screen name="guide-reviews" options={{ headerShown: false }} />
        <Stack.Screen name="guide-notifications" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
