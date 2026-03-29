/**
 * app/shared-booking-detail.tsx
 * Trang Chi tiết Đơn đặt Tour dùng chung cho: Guest, Guide, Admin
 * Đã FIX: Chặn Check-in sớm, chỉ cho phép trước 1 tiếng.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initOrGetChatSession } from '@/constants/chat-store';

export default function SharedBookingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [role, setRole] = useState('guest');
  
  const [popup, setPopup] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [reportModal, setReportModal] = useState(false);
  const [reportNote, setReportNote] = useState('');

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      const currentRole = await AsyncStorage.getItem('@current_user_role');
      if (currentRole) setRole(currentRole);

      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        const foundBooking = list.find((b: any) => b.id === bookingId);
        setBooking(foundBooking);
      }
    };
    loadData();
  }, [bookingId]));

  const handleReport = async () => {
    if (!reportNote.trim()) return;
    try {
      const rawReports = await AsyncStorage.getItem('@admin_reports');
      const reports = rawReports ? JSON.parse(rawReports) : [];
      reports.unshift({
        id: `rp-${Date.now()}`, bookingId, reporterRole: role,
        note: reportNote, createdAt: new Date().toISOString(), status: 'pending'
      });
      await AsyncStorage.setItem('@admin_reports', JSON.stringify(reports));
      setReportModal(false);
      setPopup({ visible: true, type: 'success', title: 'Đã gửi báo cáo', message: 'Admin sẽ xử lý vấn đề của bạn sớm nhất có thể.' });
    } catch (e) {}
  };

  const handleOpenChat = async () => {
    if (!booking) return;
    try {
      await initOrGetChatSession(booking);
      if (role === 'guest') {
        router.push({ pathname: '/guest_chat_detail', params: { bookingId: booking.id, type: 'guide' } } as any);
      } else if (role === 'guide') {
        router.push({ pathname: '/guide_chat_detail', params: { bookingId: booking.id } } as any);
      }
    } catch (error) { console.log('Lỗi mở chat', error); }
  };

  const handleGoToChat = async () => {
  // role ở đây đã được lấy từ @current_user_role ở đầu file
  const session = await initOrGetChatSession(booking); 
  
  if (role === 'guide') {
    router.push({ pathname: '/guide_chat_detail', params: { bookingId: booking.id } });
  } else {
    router.push({ pathname: '/guest_chat_detail', params: { bookingId: booking.id } });
  }
};

  // LOGIC CHẶN THỜI GIAN CHECK-IN
  const handleOpenTracking = () => {
    if (!booking) return;
    
    // Tính khoảng cách thời gian từ hiện tại đến lúc tour chạy (bằng giờ)
    const now = new Date().getTime();
    const startTime = new Date(booking.startTime).getTime();
    const diffHours = (startTime - now) / (1000 * 60 * 60);

    // Nếu tour đang chạy HOẶC còn cách giờ khởi hành <= 1 tiếng => Cho phép vào
    if (booking.status === 'on-tour' || diffHours <= 1) {
      router.push({ pathname: '/active_tour_tracking', params: { bookingId: booking.id } } as any);
    } else {
      // Nếu còn sớm hơn 1 tiếng => Hiện cảnh báo
      setPopup({ 
        visible: true, 
        type: 'warning', 
        title: 'Chưa đến giờ Check-in', 
        message: 'Tính năng Check-in và Định vị chỉ mở trước thời gian khởi hành 1 tiếng. Bạn vui lòng quay lại sau nhé!' 
      });
    }
  };

  // LOGIC HDV HOÀN THÀNH TOUR & CỘNG ĐIỂM KHÁCH HÀNG
  const handleCompleteTour = async () => {
    try {
      // 1. Đổi status booking thành 'completed'
      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        const updatedList = list.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b);
        await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
        setBooking({ ...booking, status: 'completed' });
      }

      // 2. Cộng tiền cho HDV
      const wRaw = await AsyncStorage.getItem('@guide_wallet');
      const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
      const income = booking.totalAmount || 0;
      wallet.balance += income;
      wallet.transactions.unshift({
        id: `tx-tour-${Date.now()}`, type: 'tour_income', amount: income,
        desc: `Thu nhập từ tour: ${booking.tourName}`, createdAt: new Date().toISOString()
      });
      await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));

      // 3. CỘNG ĐIỂM LOYALTY CHO GUEST
      const tRaw = await AsyncStorage.getItem('@app_tours');
      let earnedPoints = 100;
      if (tRaw) {
        const allTours = JSON.parse(tRaw);
        const currentTour = allTours.find((t:any) => t.id === booking.tourId);
        if (currentTour && currentTour.pointsReward) earnedPoints = currentTour.pointsReward;
      }

      const pRaw = await AsyncStorage.getItem('@app_profile');
      const profile = pRaw ? JSON.parse(pRaw) : {};
      profile.loyaltyPoints = (profile.loyaltyPoints || 0) + earnedPoints;
      await AsyncStorage.setItem('@app_profile', JSON.stringify(profile));

      const hRaw = await AsyncStorage.getItem("@guest_loyalty_history");
      const history = hRaw ? JSON.parse(hRaw) : [];
      history.unshift({
        id: `h-tour-${Date.now()}`, type: "earn", points: earnedPoints, 
        desc: `Hoàn thành chuyến đi: ${booking.tourName}`, date: new Date().toISOString()
      });
      await AsyncStorage.setItem("@guest_loyalty_history", JSON.stringify(history));

      setPopup({ visible: true, type: 'success', title: 'Hoàn thành Tour', message: `Tour đã kết thúc. Khách hàng nhận được ${earnedPoints} điểm Loyalty.` });
    } catch (e) {
      console.log(e);
    }
  };

  if (!booking) return <View style={s.screen} />;

  const statusColors: any = {
    pending: '#f59e0b', paid: '#3b82f6', accepted: '#10b981',
    cancelled: '#ef4444', completed: '#8b5cf6', done: '#8b5cf6'
  };

  const safeDate = (dateStr: string) => {
    if (!dateStr) return "Chưa xác định";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Chưa xác định" : d.toLocaleString('vi-VN');
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.title}>Chi tiết Đơn {bookingId}</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        <View style={[s.statusBanner, { backgroundColor: (statusColors[booking.status] || '#94a3b8') + '15' }]}>
          <Ionicons name="information-circle" size={24} color={statusColors[booking.status] || '#94a3b8'} />
          <Text style={[s.statusTxt, { color: statusColors[booking.status] || '#94a3b8' }]}>
            Trạng thái đơn: {booking.status.toUpperCase()}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin chuyến đi</Text>
          <Text style={s.tourName}>{booking.tourName || "Chưa xác định"}</Text>
          <View style={s.row}><Ionicons name="calendar" size={16} color="#7a8cc2"/><Text style={s.rowTxt}>Bắt đầu: {safeDate(booking.startTime)}</Text></View>
          <View style={s.row}><Ionicons name="calendar-outline" size={16} color="#7a8cc2"/><Text style={s.rowTxt}>Kết thúc: {safeDate(booking.endTime)}</Text></View>
          <View style={s.row}><Ionicons name="people" size={16} color="#7a8cc2"/><Text style={s.rowTxt}>Số khách: {booking.guests || 1}</Text></View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin liên hệ</Text>
          <View style={s.personRow}>
             <View style={s.avatar}><Ionicons name="person" size={16} color="#4f7cff" /></View>
             <View style={{ flex: 1 }}>
               <Text style={s.personRole}>Khách hàng</Text>
               <Text style={s.personName}>{booking.customerName || "Chưa cập nhật"} - {booking.customerPhone || 'Chưa cập nhật SDT'}</Text>
             </View>
          </View>
          <View style={[s.personRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
             <View style={[s.avatar, { backgroundColor: '#dcfce7' }]}><Ionicons name="shield-checkmark" size={16} color="#10b981" /></View>
             <View style={{ flex: 1 }}>
               <Text style={s.personRole}>Hướng dẫn viên</Text>
               <Text style={s.personName}>{booking.guideName || "Hệ thống sắp xếp"}</Text>
             </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Thanh toán & Dịch vụ</Text>
          {booking.addons?.length > 0 ? (
            <View style={{ marginBottom: Math.round(10 * scale) }}>
              <Text style={{ color: '#7a8cc2', fontSize: Math.round(12 * scale), marginBottom: 4 }}>Dịch vụ thêm:</Text>
              {booking.addons.map((a: string, i: number) => {
                 let addonName = a;
                 if (a === "a1") addonName = "Thợ chụp ảnh chuyên nghiệp";
                 if (a === "a2") addonName = "Xe đưa đón tận nơi";
                 if (a === "a3") addonName = "Bảo hiểm du lịch";
                 return <Text key={i} style={{ color: '#1f2a58', fontWeight: '600', fontSize: Math.round(13 * scale) }}>• {addonName}</Text>;
              })}
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Tổng thanh toán:</Text>
            <Text style={s.totalVal}>{(booking.totalAmount || 0).toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        <View style={{ gap: Math.round(10 * scale), marginTop: Math.round(10 * scale) }}>
          {/* NÚT HOÀN THÀNH TOUR DÀNH CHO HDV */}
          {role === 'guide' && booking.status === 'on-tour' && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleCompleteTour}>
              <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
              <Text style={s.primaryBtnTxt}>Hoàn thành & Nhận tiền</Text>
            </TouchableOpacity>
          )}
          
          {/* NÚT VÀO MÀN HÌNH ĐI TOUR */}
          {(booking.status === 'paid' || booking.status === 'accepted' || booking.status === 'on-tour') && (
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#10b981' }]} 
              onPress={handleOpenTracking}>
              <Ionicons name={booking.status === 'on-tour' ? "map" : "qr-code"} size={18} color="#fff" />
              <Text style={s.primaryBtnTxt}>{booking.status === 'on-tour' ? 'Xem theo dõi Hành trình' : 'Check-in / Vào Tour'}</Text>
            </TouchableOpacity>
          )}

          {(role === 'guest' || role === 'guide') && (
            <TouchableOpacity style={s.primaryBtn} onPress={handleOpenChat}>
              <Ionicons name="chatbubbles" size={18} color="#fff" />
              <Text style={s.primaryBtnTxt}>Nhắn tin trao đổi</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.dangerBtn} onPress={() => setReportModal(true)}>
            <Ionicons name="warning" size={18} color="#ef4444" />
            <Text style={s.dangerBtnTxt}>Báo cáo sự cố đến Admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BÁO CÁO MẪU */}
      <Modal visible={reportModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.popupOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.popupBox}>
            <Text style={s.popupTitle}>Báo cáo sự cố</Text>
            <TextInput style={s.input} multiline placeholder="Mô tả vấn đề bạn gặp phải..." value={reportNote} onChangeText={setReportNote} />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setReportModal(false)}><Text style={s.popupCancelTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.popupSubmitBtn} onPress={handleReport}><Text style={s.popupSubmitTxt}>Gửi Báo Cáo</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP THÔNG BÁO DÙNG CHUNG CẢ LỖI VÀ THÀNH CÔNG */}
      <Modal visible={popup.visible} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            {/* Đổi màu icon linh hoạt theo type */}
            <Ionicons name={popup.type === 'success' ? "checkmark-circle" : "warning"} size={50} color={popup.type === 'success' ? "#10b981" : "#f59e0b"} />
            <Text style={s.popupTitle}>{popup.title}</Text>
            <Text style={{ textAlign: 'center', color: '#64748b', marginBottom: 20 }}>{popup.message}</Text>
            <TouchableOpacity style={s.popupCancelBtn} onPress={() => setPopup({...popup, visible: false})}><Text style={s.popupCancelTxt}>Đóng</Text></TouchableOpacity>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(14), backgroundColor: '#f8faff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    title: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    content: { padding: sz(16), paddingBottom: sz(60) },
    
    statusBanner: { flexDirection: 'row', alignItems: 'center', gap: sz(10), padding: sz(14), borderRadius: sz(16), marginBottom: sz(16) },
    statusTxt: { fontSize: sz(14), fontWeight: '900' },

    card: { backgroundColor: '#fff', borderRadius: sz(18), padding: sz(18), elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: sz(16) },
    sectionTitle: { fontSize: sz(14), fontWeight: '800', color: '#7a8cc2', marginBottom: sz(12) },
    tourName: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    row: { flexDirection: 'row', alignItems: 'center', gap: sz(8), marginBottom: sz(8) },
    rowTxt: { fontSize: sz(13), color: '#1f2a58', fontWeight: '600' },
    
    personRow: { flexDirection: 'row', alignItems: 'center', gap: sz(12), paddingBottom: sz(12), borderBottomWidth: 1, borderBottomColor: '#f0f4ff', marginBottom: sz(12) },
    avatar: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
    personRole: { fontSize: sz(11), color: '#7a8cc2', fontWeight: '700' },
    personName: { fontSize: sz(14), color: '#1f2a58', fontWeight: '900', marginTop: sz(2) },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sz(8), paddingTop: sz(12), borderTopWidth: 1, borderTopColor: '#f0f4ff' },
    totalLbl: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58' },
    totalVal: { fontSize: sz(20), fontWeight: '900', color: '#10b981' },

    primaryBtn: { backgroundColor: '#4f7cff', borderRadius: sz(14), height: sz(52), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), elevation: 2 },
    primaryBtnTxt: { color: '#fff', fontSize: sz(15), fontWeight: '900' },
    dangerBtn: { backgroundColor: '#fff', borderRadius: sz(14), height: sz(52), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), elevation: 1 },
    dangerBtnTxt: { color: '#ef4444', fontSize: sz(15), fontWeight: '800' },

    popupOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    popupBox: { backgroundColor: "#fff", width: "100%", borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    popupTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginBottom: sz(16) },
    input: { backgroundColor: '#f1f5f9', borderRadius: sz(12), width: '100%', minHeight: sz(80), padding: sz(14), textAlignVertical: 'top', color: '#1f2a58', marginBottom: sz(20) },
    popupCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
    popupCancelTxt: { color: "#64748b", fontWeight: "800", fontSize: sz(14) },
    popupSubmitBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
    popupSubmitTxt: { color: "#fff", fontWeight: "800", fontSize: sz(14) }
  });
};