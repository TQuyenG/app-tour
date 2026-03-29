/**
 * app/active_tour_tracking.tsx
 * Màn hình Thực thi Tour (Cập nhật Luồng Kết Thúc, SOS, Cảnh Báo Trễ Giờ & Đánh Giá)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { 
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, 
  View, useWindowDimensions, Modal, TextInput, Animated, 
  Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { emitTrackingEvent, getTrackingEvents, clearTrackingEvents } from '@/constants/tracking-store';

export default function ActiveTourTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [role, setRole] = useState('guest');
  
  // Trạng thái mạng (Giả lập)
  const [isOffline, setIsOffline] = useState(false);

  // States Check-in
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCameraAuth, setShowCameraAuth] = useState(false);
  
  // Health Tracking
  const [heartRate, setHeartRate] = useState(75);

  // States Cảnh báo Trễ giờ
  const [lateWarning, setLateWarning] = useState<'none' | 'soft' | 'hard'>('none');

  // States Kết thúc Tour
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [waitingGuestConfirm, setWaitingGuestConfirm] = useState(false);

  // States Đánh giá (Rating) cho Khách
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [tipAmount, setTipAmount] = useState(0);

  // Biến dùng cho SOS (Nhấn giữ)
  const sosHoldAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      const currentRole = await AsyncStorage.getItem('@current_user_role');
      if (currentRole) setRole(currentRole);

      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        const found = list.find((b: any) => b.id === bookingId);
        setBooking(found);
      }
    };
    loadData();
  }, [bookingId]));

  // THEO DÕI THỜI GIAN & TÍN HIỆU TỪ TRACKING STORE
  useEffect(() => {
    if (!booking || booking.status !== 'on-tour') return;

    const interval = setInterval(async () => {
      // 1. Cập nhật nhịp tim giả lập
      if (role === 'guest') setHeartRate(Math.floor(Math.random() * (95 - 70 + 1) + 70));

      // 2. Kiểm tra cảnh báo trễ giờ (Dựa vào endTime)
      if (booking.endTime) {
        const now = new Date().getTime();
        const endTimeMs = new Date(booking.endTime).getTime();
        const diffMins = (now - endTimeMs) / (1000 * 60);

        if (diffMins > 60 && lateWarning !== 'hard') setLateWarning('hard');
        else if (diffMins > 15 && diffMins <= 60 && lateWarning === 'none') setLateWarning('soft');
      }

      // 3. Quét trạm tín hiệu xem đối phương có hành động gì không
      const events = await getTrackingEvents(booking.id);
      
      // Nếu HDV báo kết thúc -> Khách hiện popup xác nhận
      if (role === 'guest' && events.find(e => e.type === 'guide_ended_tour') && !showRating) {
         setShowEndConfirm(true); // Khách thấy thông báo HDV đã kết thúc
      }
      
      // Nếu Khách xác nhận -> Tour chính thức Completed
      if (role === 'guide' && events.find(e => e.type === 'guest_confirmed_end')) {
         completeTourForGuide();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [booking, role, lateWarning, showRating]);


  const handleConfirmCheckIn = async () => {
    try {
      const raw = await AsyncStorage.getItem('@guest_bookings');
      if (raw) {
        const list = JSON.parse(raw);
        const updatedList = list.map((b: any) => b.id === bookingId ? { ...b, status: 'on-tour' } : b);
        await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
        setBooking({ ...booking, status: 'on-tour' });
      }
      setShowQRScanner(false); setShowCameraAuth(false);
    } catch (e) {}
  };

  // HDV BẤM KẾT THÚC TOUR -> Gửi tín hiệu cho Khách
  const handleGuideEndTour = async () => {
    await emitTrackingEvent({ bookingId: booking.id, type: 'guide_ended_tour', timestamp: new Date().toISOString(), reason: endReason });
    setShowEndConfirm(false);
    setWaitingGuestConfirm(true); // HDV chờ khách ấn OK
  };

  // KHÁCH BẤM XÁC NHẬN KẾT THÚC -> Bật bảng Đánh giá
  const handleGuestConfirmEnd = async () => {
    await emitTrackingEvent({ bookingId: booking.id, type: 'guest_confirmed_end', timestamp: new Date().toISOString() });
    setShowEndConfirm(false);
    setShowRating(true); // Bật form Đánh giá
  };

  // HOÀN TẤT ĐÁNH GIÁ (KHÁCH) -> Lưu Review, Cộng Tiền Ví HDV, Cộng Điểm Khách
  const handleGuestSubmitRating = async () => {
    try {
      // 1. Đổi trạng thái tour thành completed
      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        const updatedList = list.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b);
        await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
      }
      
      // 2. Cộng điểm Loyalty cho Khách
      const pRaw = await AsyncStorage.getItem('@app_profile');
      if (pRaw) {
        const p = JSON.parse(pRaw);
        p.loyaltyPoints = (p.loyaltyPoints || 0) + 200; // Cộng 200 điểm
        await AsyncStorage.setItem('@app_profile', JSON.stringify(p));
      }

      // 3. Lưu Đánh giá (Review) vào hệ thống
      const rRaw = await AsyncStorage.getItem('@app_reviews');
      const reviews = rRaw ? JSON.parse(rRaw) : [];
      reviews.unshift({
        id: `rev-${Date.now()}`,
        bookingId: booking.id,
        guideId: booking.guideId,
        guestName: booking.customerName || 'Khách hàng',
        rating,
        reviewText,
        tipAmount,
        createdAt: new Date().toISOString()
      });
      await AsyncStorage.setItem('@app_reviews', JSON.stringify(reviews));

      // 4. Cộng tiền vào Ví Thu Nhập của HDV (Guide Wallet)
      const wRaw = await AsyncStorage.getItem('@guide_wallet');
      const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
      
      // Tính tiền Tour (Giả sử nền tảng thu phí 10%)
      const tourPrice = booking.totalAmount || 0;
      const netIncome = tourPrice * 0.9; 
      
      if (netIncome > 0) {
        wallet.balance += netIncome;
        wallet.transactions.unshift({
          id: `tx-tour-${Date.now()}`, type: 'tour_income', amount: netIncome,
          desc: `Thu nhập Tour: ${booking.tourName} (Đã trừ 10% phí)`, createdAt: new Date().toISOString()
        });
      }
      if (tipAmount > 0) {
        wallet.balance += tipAmount;
        wallet.transactions.unshift({
          id: `tx-tip-${Date.now()}`, type: 'tip', amount: tipAmount,
          desc: `Tiền Tip từ khách ${booking.customerName}`, createdAt: new Date().toISOString()
        });
      }
      await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));

      // Hoàn tất
      await clearTrackingEvents(bookingId as string);
      Alert.alert('Thành công', 'Đánh giá của bạn đã được ghi nhận. Bạn được cộng 200 điểm thưởng!', [{ text: 'Về Trang chủ', onPress: () => router.replace('/') }]);
    } catch (e) {
      console.log('Lỗi submit rating', e);
    }
  };

  // KẾT THÚC CHO HDV (Sau khi khách confirm)
  const completeTourForGuide = async () => {
    try {
      const raw = await AsyncStorage.getItem('@guest_bookings');
      if (raw) {
        const list = JSON.parse(raw);
        const updatedList = list.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b);
        await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
      }
      await clearTrackingEvents(bookingId as string);
      Alert.alert('Hoàn thành', 'Chuyến đi đã kết thúc thành công. Tiền sẽ được chuyển vào ví của bạn.', [{ text: 'Về Quản lý', onPress: () => router.replace('/guide-home') }]);
    } catch (e) {}
  };

  // XỬ LÝ NÚT SOS NHẤN GIỮ
  const handleSOSPressIn = () => {
    Animated.timing(sosHoldAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        emitTrackingEvent({ bookingId: booking.id, type: 'sos_alert', timestamp: new Date().toISOString() });
        Alert.alert('CẢNH BÁO SOS ĐÃ ĐƯỢC GỬI', 'Tọa độ GPS và tín hiệu khẩn cấp đã được gửi đến Admin, Y tế và Đối tác.');
      }
    });
  };
  const handleSOSPressOut = () => {
    Animated.timing(sosHoldAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  if (!booking) return <View style={s.screen} />;
  const isCheckedIn = booking.status === 'on-tour' || booking.status === 'completed';

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER TÙY BIẾN THEO MẠNG */}
      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }, isOffline && { backgroundColor: '#fef2f2' }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <View style={{alignItems: 'center'}}>
           <Text style={s.title}>{isCheckedIn ? 'Đang Diễn Ra' : 'Điểm Danh'}</Text>
           {isOffline && <Text style={{fontSize: 10, color: '#ef4444', fontWeight: 'bold'}}>MẤT KẾT NỐI MẠNG (OFFLINE)</Text>}
        </View>
        <TouchableOpacity onPress={() => setIsOffline(!isOffline)} style={{padding: 8}}><Ionicons name={isOffline ? "cloud-offline" : "wifi"} size={20} color={isOffline ? "#ef4444" : "#10b981"} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
           <Text style={s.tourName}>{booking.tourName}</Text>
           <Text style={s.bookingRef}>Mã vé: <Text style={{color: '#4f7cff'}}>{booking.id}</Text></Text>
        </View>

        {!isCheckedIn ? (
          /* TRẠNG THÁI 1: CHƯA CHECK-IN */
          <View style={s.checkInContainer}>
            <View style={s.qrBox}><Ionicons name="qr-code" size={150} color="#1f2a58" /><Text style={s.qrHint}>Mã QR định danh</Text></View>
            <TouchableOpacity style={s.primaryBtn} onPress={() => setShowQRScanner(true)}><Ionicons name="scan-outline" size={20} color="#fff" /><Text style={s.primaryBtnTxt}>Quét mã QR của {role === 'guest' ? 'HDV' : 'Khách'}</Text></TouchableOpacity>
            <Text style={s.orTxt}>— HOẶC —</Text>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setShowCameraAuth(true)}><Ionicons name="camera-outline" size={20} color="#4f7cff" /><Text style={s.secondaryBtnTxt}>Chụp Ảnh Xác Thực Chung</Text></TouchableOpacity>
          </View>
        ) : (
          /* TRẠNG THÁI 2: ON-TOUR */
          <View style={s.activeContainer}>
            {/* THÔNG BÁO TRỄ GIỜ (NẾU CÓ) */}
            {lateWarning === 'soft' && (
              <View style={[s.alertBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <Ionicons name="time" size={24} color="#d97706" />
                <View style={{flex: 1}}><Text style={[s.alertTitle, {color: '#d97706'}]}>Tour đã lố giờ dự kiến</Text><Text style={s.alertSub}>Mọi người đang tận hưởng cảnh đẹp chứ? Bạn có thể gia hạn thêm giờ nếu muốn.</Text></View>
              </View>
            )}
            {lateWarning === 'hard' && (
              <View style={[s.alertBanner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <Ionicons name="warning" size={24} color="#ef4444" />
                <View style={{flex: 1}}><Text style={[s.alertTitle, {color: '#ef4444'}]}>Quá giờ khá lâu!</Text><Text style={s.alertSub}>Hệ thống nhận thấy tour đã quá hạn hơn 60 phút. Bạn có đang an toàn không?</Text></View>
              </View>
            )}

            {/* BẢN ĐỒ GPS */}
            <View style={s.mapMockup}>
               <View style={s.mapOverlay}>
                 <Ionicons name="location" size={40} color="#ef4444" />
                 <Text style={s.mapTxt}>{isOffline ? 'GPS đang ghi lại cục bộ' : 'GPS đang theo dõi trực tiếp'}</Text>
                 <Text style={s.mapSubTxt}>{isOffline ? 'Sẽ đồng bộ khi có mạng' : 'Vị trí đang được đồng bộ'}</Text>
               </View>
            </View>

            <Text style={s.sectionTitle}>Đối tác chuyến đi</Text>
            <View style={s.partnerCard}>
              <View style={s.partnerAvatar}><Text style={s.partnerAvatarTxt}>{(role === 'guest' ? booking.guideName : booking.customerName).charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.partnerName}>{role === 'guest' ? booking.guideName : booking.customerName}</Text>
                <Text style={s.partnerPhone}><Ionicons name="call" size={12}/> {role === 'guest' ? '0912.345.678' : booking.customerPhone || '0901.234.567'}</Text>
              </View>
              <TouchableOpacity style={s.callCircle}><Ionicons name="call" size={20} color="#10b981" /></TouchableOpacity>
            </View>

            {/* SỨC KHỎE (GUEST) */}
            {role === 'guest' && (
              <View style={s.healthGrid}>
                <View style={s.healthBox}>
                  <Ionicons name="heart" size={24} color="#ef4444" style={{ marginBottom: 8 }} />
                  <Text style={s.healthVal}>{heartRate} <Text style={s.healthUnit}>bpm</Text></Text>
                  <Text style={s.healthLbl}>Nhịp tim hiện tại</Text>
                  <View style={s.healthSync}><Ionicons name="sync" size={10} color="#10b981"/><Text style={{fontSize: 10, color: '#10b981', marginLeft: 2}}>Apple Health</Text></View>
                </View>
              </View>
            )}

            {/* NÚT CHỨC NĂNG */}
            <View style={{ gap: 12, marginTop: 10 }}>
              {/* NÚT KẾT THÚC (CHỈ HDV THẤY) */}
              {role === 'guide' && (
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#10b981' }]} onPress={() => setShowEndConfirm(true)}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={s.primaryBtnTxt}>{waitingGuestConfirm ? 'Đang chờ khách xác nhận...' : 'Kết Thúc Chuyến Đi'}</Text>
                </TouchableOpacity>
              )}

              {/* NÚT SOS NHẤN GIỮ (CHỐNG CHẠM NHẦM) */}
              <View style={s.sosContainer}>
                 <Animated.View style={[s.sosProgress, { 
                   width: sosHoldAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) 
                 }]} />
                 <TouchableOpacity 
                   style={s.sosBtn} activeOpacity={0.8}
                   onPressIn={handleSOSPressIn} onPressOut={handleSOSPressOut}
                 >
                   <Ionicons name="warning" size={24} color="#fff" />
                   <Text style={s.sosTxt}>NHẤN GIỮ 2 GIÂY ĐỂ GỌI SOS</Text>
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* POPUP KẾT THÚC TOUR */}
      <Modal visible={showEndConfirm} transparent animationType="fade">
         <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
           <View style={s.modalBox}>
              <Ionicons name="flag" size={60} color="#10b981" />
              <Text style={s.modalTitle}>{role === 'guide' ? 'Xác nhận Kết thúc?' : 'HDV đã kết thúc Tour'}</Text>
              <Text style={s.modalSub}>
                {role === 'guide' 
                  ? 'Bạn có chắc chắn muốn kết thúc hành trình này? Hệ thống sẽ gửi yêu cầu xác nhận đến điện thoại của khách.' 
                  : 'Hướng dẫn viên đã xác nhận hoàn thành tour. Bạn có đồng ý kết thúc hành trình lúc này không?'}
              </Text>
              
              {role === 'guide' && (
                <TextInput style={s.input} multiline placeholder="Ghi chú thêm (Ví dụ: Kết thúc sớm do trời mưa)..." value={endReason} onChangeText={setEndReason} />
              )}

              <View style={{flexDirection: 'row', gap: 10, marginTop: 10, width: '100%'}}>
                <TouchableOpacity style={[s.secondaryBtn, {flex: 1}]} onPress={() => setShowEndConfirm(false)}><Text style={s.secondaryBtnTxt}>Hủy bỏ</Text></TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, {flex: 1, backgroundColor: '#10b981'}]} onPress={role === 'guide' ? handleGuideEndTour : handleGuestConfirmEnd}>
                  <Text style={s.primaryBtnTxt}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
           </View>
         </KeyboardAvoidingView>
      </Modal>

      {/* POPUP ĐÁNH GIÁ (CHỈ DÀNH CHO KHÁCH) */}
      <Modal visible={showRating} transparent animationType="slide">
         <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
           <View style={[s.modalBox, { padding: 20 }]}>
              <Text style={s.modalTitle}>Chuyến đi thế nào?</Text>
              <Text style={s.modalSub}>Hãy đánh giá Hướng dẫn viên {booking.guideName} để nhận 200 điểm thưởng.</Text>
              
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
                {[1,2,3,4,5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={s.input} multiline placeholder="Chia sẻ trải nghiệm của bạn..." value={reviewText} onChangeText={setReviewText} />
              
              <Text style={{alignSelf: 'flex-start', fontWeight: 'bold', color: '#1f2a58', marginBottom: 10}}>Tặng tiền Tip (Tùy chọn):</Text>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%'}}>
                {[0, 50000, 100000].map(amt => (
                   <TouchableOpacity key={amt} style={[s.tipBtn, tipAmount === amt && s.tipBtnActive]} onPress={() => setTipAmount(amt)}>
                     <Text style={[s.tipTxt, tipAmount === amt && s.tipTxtActive]}>{amt === 0 ? 'Không Tip' : `${amt/1000}K`}</Text>
                   </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.primaryBtn, {width: '100%'}]} onPress={handleGuestSubmitRating}>
                <Text style={s.primaryBtnTxt}>Gửi đánh giá & Nhận điểm</Text>
              </TouchableOpacity>
           </View>
         </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    
    card: { backgroundColor: '#fff', borderRadius: sz(16), padding: sz(16), elevation: 2, marginBottom: sz(16), alignItems: 'center' },
    tourName: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', textAlign: 'center', marginBottom: sz(4) },
    bookingRef: { fontSize: sz(13), fontWeight: '700', color: '#64748b' },

    checkInContainer: { alignItems: 'center', marginTop: sz(10) },
    qrBox: { width: sz(220), height: sz(220), backgroundColor: '#fff', borderRadius: sz(20), alignItems: 'center', justifyContent: 'center', elevation: 4, marginBottom: sz(30), borderWidth: 2, borderColor: '#e4ebff' },
    qrHint: { marginTop: sz(10), color: '#7a8cc2', fontWeight: '600' },
    
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f7cff', height: sz(54), width: '100%', borderRadius: sz(14), gap: sz(10), elevation: 3 },
    primaryBtnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '900' },
    orTxt: { marginVertical: sz(20), color: '#cbd5e1', fontWeight: '800' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf0ff', height: sz(54), width: '100%', borderRadius: sz(14), gap: sz(10), borderWidth: 1, borderColor: '#d1dfff' },
    secondaryBtnTxt: { color: '#4f7cff', fontSize: sz(15), fontWeight: '800' },

    activeContainer: { marginTop: sz(10) },
    alertBanner: { flexDirection: 'row', alignItems: 'center', gap: sz(10), padding: sz(14), borderRadius: sz(14), borderWidth: 1, marginBottom: sz(16) },
    alertTitle: { fontSize: sz(14), fontWeight: '900', marginBottom: 2 },
    alertSub: { fontSize: sz(12), color: '#64748b', lineHeight: sz(18) },

    mapMockup: { height: sz(200), backgroundColor: '#e2e8f0', borderRadius: sz(20), overflow: 'hidden', marginBottom: sz(20) },
    mapOverlay: { flex: 1, backgroundColor: 'rgba(241, 245, 249, 0.8)', alignItems: 'center', justifyContent: 'center' },
    mapTxt: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginTop: sz(10) },
    mapSubTxt: { fontSize: sz(12), color: '#64748b', marginTop: sz(4) },

    sectionTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    partnerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), elevation: 2, marginBottom: sz(24) },
    partnerAvatar: { width: sz(50), height: sz(50), borderRadius: sz(16), backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    partnerAvatarTxt: { color: '#fff', fontSize: sz(22), fontWeight: '900' },
    partnerName: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(4) },
    partnerPhone: { fontSize: sz(13), color: '#64748b', fontWeight: '600' },
    callCircle: { width: sz(44), height: sz(44), borderRadius: sz(22), backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },

    healthGrid: { flexDirection: 'row', gap: sz(12), marginBottom: sz(24) },
    healthBox: { flex: 1, backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), elevation: 2, alignItems: 'center' },
    healthVal: { fontSize: sz(24), fontWeight: '900', color: '#1f2a58' },
    healthUnit: { fontSize: sz(12), color: '#94a3b8' },
    healthLbl: { fontSize: sz(12), color: '#64748b', fontWeight: '600', marginTop: sz(4) },
    healthSync: { flexDirection: 'row', alignItems: 'center', marginTop: sz(8), backgroundColor: '#f0fdf4', paddingHorizontal: sz(8), paddingVertical: sz(2), borderRadius: sz(10) },

    sosContainer: { position: 'relative', height: sz(56), borderRadius: sz(16), overflow: 'hidden', backgroundColor: '#991b1b', elevation: 5 },
    sosProgress: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#ef4444' },
    sosBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(10) },
    sosTxt: { color: '#fff', fontSize: sz(15), fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.7)", alignItems: "center", justifyContent: "center", padding: sz(24) },
    modalBox: { backgroundColor: "#fff", width: "100%", borderRadius: sz(24), padding: sz(24), alignItems: "center", elevation: 10 },
    modalTitle: { fontSize: sz(20), fontWeight: "900", color: "#1f2a58", marginTop: sz(16), marginBottom: sz(8) },
    modalSub: { fontSize: sz(14), color: "#64748b", textAlign: "center", marginBottom: sz(20), lineHeight: sz(22) },
    input: { backgroundColor: '#f1f5f9', borderRadius: sz(12), width: '100%', minHeight: sz(80), padding: sz(14), textAlignVertical: 'top', color: '#1f2a58', marginBottom: sz(20) },
    
    tipBtn: { flex: 1, height: sz(44), borderRadius: sz(12), borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    tipBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    tipTxt: { fontWeight: '700', color: '#64748b' },
    tipTxtActive: { color: '#fff' }
  });
};