/**
 * app/active_tour_tracking.tsx
 * ĐÃ FIX CRITICAL:
 * 1. Đổi import AsyncStorage sang @/constants/storage-helper (đồng bộ với guide-earnings & guest_loyalty)
 * 2. Fix logic giải ngân HDV + tích điểm khách đúng key
 * 3. Nút "Về Trang Chủ" sau khi kết thúc tour: HDV → guide-home, Khách → /
 */
import { GuideTabBar } from '@/components/GuideTabBar';
import AsyncStorage from '@/constants/storage-helper';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- CONSTANTS ---
const TOUR_PHASE = { PREPARE: 'prepare', CHECKIN: 'checkin', ACTIVE: 'on-tour', FINISHED: 'completed' };

export default function ActiveTourTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [role, setRole] = useState('guest');
  const [tourPhase, setTourPhase] = useState(TOUR_PHASE.PREPARE);
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [checkinData, setCheckinData] = useState({ people: 0, luggage: 0, guideVerified: false });
  const [showModal, setShowModal] = useState<'sos' | 'report' | null>(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', showCancel: false, onConfirm: () => {} });
  const [trackingStats, setTrackingStats] = useState({ steps: 1240, distance: 0.8 });
  const [reportNote, setReportNote] = useState('');

  // --- LOGIC LẤY DỮ LIỆU ---
  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const currentRole = await AsyncStorage.getItem('@current_user_role');
        if (currentRole) setRole(currentRole);

        const rawId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
        const cleanBookingId = String(rawId || '').replace('chat_', '');

        const rawBookings = await AsyncStorage.getItem('@guest_bookings');
        if (rawBookings) {
          const list = JSON.parse(rawBookings);
          let found = list.find((b: any) => String(b.id) === cleanBookingId);
          
          if (found) {
            let cName = found.customerName || found.guestName || "Khách hàng";
            let cPhone = found.customerPhone || found.phone || "";
            let gName = found.guideName || "Chưa phân bổ";
            let gPhone = found.guidePhone || "";

            const accRaw = await AsyncStorage.getItem("@app_accounts");
            if (accRaw) {
               const accounts = JSON.parse(accRaw);
               if (!cPhone || cPhone === "---" || cName === "Khách hàng") {
                  const guestAcc = accounts.find((a:any) => a.id === found.accountId || a.id === found.guestId);
                  if (guestAcc) { cName = guestAcc.name || cName; cPhone = guestAcc.phone || cPhone; }
               }
               if (!gPhone || gPhone === "---" || String(gName).includes("Hệ thống")) {
                  const guideAcc = accounts.find((a:any) => a.id === found.guideId);
                  if (guideAcc) { gName = guideAcc.name || gName; gPhone = guideAcc.phone || gPhone; }
               }
            }

            found.customerName = cName; found.customerPhone = cPhone || " ";
            found.guideName = gName; found.guidePhone = gPhone || " ";

            setBooking(found);

            if (found.status === 'on-tour') setTourPhase(TOUR_PHASE.ACTIVE);
            else if (found.status === 'completed') setTourPhase(TOUR_PHASE.FINISHED);
            else setTourPhase(TOUR_PHASE.PREPARE);
            
            setCheckinData(p => ({ ...p, people: found.guests || 1 }));
          }
        }
      } catch (error) {
        console.error('loadData error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [bookingId]));

  // --- TỰ ĐỘNG ĐỒNG BỘ MÀN HÌNH KHÁCH KHI HDV BẤM BẮT ĐẦU ---
  useEffect(() => {
    let interval: any;
    if (role === 'guest' && (tourPhase === TOUR_PHASE.PREPARE || tourPhase === TOUR_PHASE.CHECKIN)) {
      interval = setInterval(async () => {
        try {
          const raw = await AsyncStorage.getItem('@guest_bookings');
          if (raw) {
            const list = JSON.parse(raw);
            const current = list.find((b: any) => String(b.id) === String(booking?.id));
            if (current && current.status === 'on-tour') {
              setTourPhase(TOUR_PHASE.ACTIVE);
            }
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [role, tourPhase, booking]);

  // --- MÔ PHỎNG SỨC KHỎE GPS ---
  useEffect(() => {
    if (tourPhase === TOUR_PHASE.ACTIVE) {
      const interval = setInterval(() => {
        setTrackingStats(prev => ({
          steps: prev.steps + Math.floor(Math.random() * 8),
          distance: prev.distance + (Math.random() / 50),
        }));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [tourPhase]);

  // --- HANDLERS (CHỈ HDV ĐƯỢC GỌI HÀM NÀY) ---
  const handleConfirmCheckinFinal = async () => {
    if (checkinData.people !== (booking?.guests || 1)) {
      setCustomAlert({ visible: true, title: "Sai lệch số lượng", message: `Đơn gốc là ${booking?.guests || 1} khách. Vui lòng điểm danh đúng số lượng!`, showCancel: false, onConfirm: () => setCustomAlert(p => ({...p, visible: false})) });
      return;
    }
    if (!checkinData.guideVerified) {
      setCustomAlert({ visible: true, title: "Chưa xác nhận", message: "Bạn cần bật Xác nhận danh tính Khách trước khi đi tiếp!", showCancel: false, onConfirm: () => setCustomAlert(p => ({...p, visible: false})) });
      return;
    }
    
    setTourPhase(TOUR_PHASE.ACTIVE);
    try {
      const raw = await AsyncStorage.getItem('@guest_bookings');
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((b: any) => b.id === booking.id ? { ...b, status: 'on-tour' } : b);
        await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('handleConfirmCheckinFinal error:', e);
    }
  };

  // ============================================================
  // ✅ FIX HOÀN CHỈNH: handleStopTour
  // - Ghi ví HDV qua storage-helper (đồng bộ với guide-earnings.tsx)
  // - Ghi điểm khách vào @app_profile.loyaltyPoints + @guest_loyalty_history
  //   (đúng key mà guest_loyalty.tsx đọc)
  // ============================================================
  const handleStopTour = () => {
    setCustomAlert({
      visible: true,
      title: "Kết Thúc Tour",
      message: "Bạn chắc chắn muốn kết thúc chuyến đi này? Hệ thống sẽ chốt dữ liệu để thanh toán.",
      showCancel: true,
      onConfirm: async () => {
        setCustomAlert(p => ({ ...p, visible: false }));

        try {
          // ── BƯỚC 1: Đọc & cập nhật booking → completed ──
          const raw = await AsyncStorage.getItem('@guest_bookings');
          if (!raw) {
            Alert.alert('Lỗi', 'Không tìm thấy dữ liệu đơn tour.');
            return;
          }
          const list = JSON.parse(raw);
          const currentBooking = list.find((b: any) => b.id === booking.id);

          if (!currentBooking) {
            Alert.alert('Lỗi', 'Không tìm thấy đơn tour trong hệ thống.');
            return;
          }
          if (currentBooking.status === 'completed') {
            // Tour đã kết thúc trước đó, chỉ chuyển phase UI
            setTourPhase(TOUR_PHASE.FINISHED);
            return;
          }

          const updated = list.map((b: any) =>
            b.id === booking.id ? { ...b, status: 'completed' } : b
          );
          await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updated));

          // Chuyển UI sang FINISHED sau khi ghi thành công
          setTourPhase(TOUR_PHASE.FINISHED);

          // ── BƯỚC 2: Tính toán hoa hồng & giải ngân cho HDV ──
          const rawRules = await AsyncStorage.getItem('@admin_commissions');
          let commRate = 12; // fallback 12% nếu chưa cấu hình
          if (rawRules) {
            const rules = JSON.parse(rawRules);
            const matchedRule = rules.find((r: any) => r.category === currentBooking.category);
            const fallbackRule = rules[0];
            const rule = matchedRule || fallbackRule;
            if (rule) commRate = rule.rate;
          }

          const totalAmt = Number(currentBooking.totalAmount || currentBooking.priceRaw || 0);
          // Thu nhập ròng = Tổng tiền - hoa hồng admin - 1% phí nền tảng
          const netIncome = totalAmt - (totalAmt * commRate / 100) - (totalAmt * 1 / 100);

          // Ghi vào ví HDV (cùng key với guide-earnings.tsx)
          const wRaw = await AsyncStorage.getItem('@guide_wallet');
          const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
          wallet.balance = (wallet.balance || 0) + netIncome;
          if (!Array.isArray(wallet.transactions)) wallet.transactions = [];
          wallet.transactions.unshift({
            id: `tx-tour-${currentBooking.id}-${Date.now()}`,
            type: 'tour_income',
            amount: netIncome,
            desc: `Giải ngân Tour: ${currentBooking.tourName || 'Tour'} (Trừ ${commRate}% HH + 1% phí)`,
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));

          // ── BƯỚC 3: Tích điểm cho khách ──
          // Đọc số điểm thưởng từ thông tin tour (nếu có), mặc định 200
          let rewardPoints = 200;
          const tRaw = await AsyncStorage.getItem('@app_tours');
          if (tRaw) {
            const tourInfo = JSON.parse(tRaw).find((t: any) => t.id === currentBooking.tourId);
            if (tourInfo?.rewardPoints) rewardPoints = Number(tourInfo.rewardPoints);
          }

          // Ghi vào @app_profile.loyaltyPoints — đúng key guest_loyalty.tsx đọc
          const pRaw = await AsyncStorage.getItem('@app_profile');
          const profile = pRaw ? JSON.parse(pRaw) : {};
          const oldPoints = Number(profile.loyaltyPoints) || 0;
          profile.loyaltyPoints = oldPoints + rewardPoints;
          await AsyncStorage.setItem('@app_profile', JSON.stringify(profile));

          // Ghi lịch sử vào @guest_loyalty_history — đúng key guest_loyalty.tsx đọc
          const hRaw = await AsyncStorage.getItem('@guest_loyalty_history');
          const loyaltyHistory = hRaw ? JSON.parse(hRaw) : [];
          loyaltyHistory.unshift({
            id: `h-tour-${currentBooking.id}-${Date.now()}`,
            type: 'earn',
            points: rewardPoints,
            desc: `Hoàn thành tour: ${currentBooking.tourName || 'Tour'}`,
            date: new Date().toISOString(),
          });
          await AsyncStorage.setItem('@guest_loyalty_history', JSON.stringify(loyaltyHistory));

        } catch (e) {
          // Hiển thị lỗi cụ thể để debug
          console.error('handleStopTour error:', e);
          Alert.alert('Có lỗi xảy ra', `Chi tiết: ${String(e)}\n\nVui lòng thử lại.`);
        }
      }
    });
  };

  // ── NAVIGATE VỀ TRANG CHỦ THEO ROLE ──
  const handleGoHome = () => {
    if (role === 'guide') {
      router.replace('/guide-home');
    } else {
      router.replace('/');
    }
  };

  if (isLoading) return (
    <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#4f7cff" />
      <Text style={{ marginTop: 16, color: '#64748b' }}>Đang tải dữ liệu chuyến đi...</Text>
    </View>
  );
  if (!booking) return (
    <View style={[s.screen, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
      <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
      <Text style={{ marginTop: 16, color: '#1f2a58', fontWeight: '900', fontSize: 18 }}>Không tìm thấy Đơn Tour!</Text>
      <TouchableOpacity style={[s.primaryBtn, { marginTop: 24, width: '100%' }]} onPress={handleGoHome}>
        <Text style={s.primaryBtnTxt}>Quay Lại</Text>
      </TouchableOpacity>
    </View>
  );

  const HealthBubble = () => {
    const [heartRate, setHeartRate] = useState(75);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const interval = setInterval(() => setHeartRate(prev => prev + (Math.random() > 0.5 ? 1 : -1)), 2000);
      Animated.loop(Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])).start();
      return () => clearInterval(interval);
    }, []);
    return (
      <Animated.View style={[s.healthBubble, { opacity: fadeAnim }]}>
        <Ionicons name="heart" size={16} color="#ef4444" style={{ marginRight: 4 }} />
        <Text style={s.healthBubbleText}>{heartRate} bpm</Text>
      </Animated.View>
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
           <Text style={s.title}>{tourPhase === TOUR_PHASE.ACTIVE ? 'Hành trình Live' : 'Quản lý Chuyến đi'}</Text>
           <Text style={s.subTitle}>Mã vé: {booking.id}</Text>
        </View>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* THÔNG TIN CHUNG */}
        <View style={s.card}>
          <Text style={s.tourName}>{booking.tourName}</Text>
          <View style={s.dashedLine} />
          <View style={s.personRow}>
             <View style={s.avatar}><Ionicons name="person" size={16} color="#4f7cff" /></View>
             <View style={{ flex: 1 }}>
               <Text style={s.personRole}>Khách hàng đại diện</Text>
               <Text style={s.personName}>{booking.customerName}</Text>
               <Text style={s.personSub}>{booking.customerPhone}</Text>
             </View>
          </View>
          <View style={[s.personRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 12 }]}>
             <View style={[s.avatar, { backgroundColor: '#dcfce7' }]}><Ionicons name="shield-checkmark" size={16} color="#10b981" /></View>
             <View style={{ flex: 1 }}>
               <Text style={s.personRole}>Hướng dẫn viên</Text>
               <Text style={s.personName}>{booking.guideName}</Text>
               <Text style={s.personSub}>{booking.guidePhone}</Text>
             </View>
          </View>
        </View>

        {/* PHASE 1 & 2: PHÂN QUYỀN HIỂN THỊ */}
        {(tourPhase === TOUR_PHASE.PREPARE || tourPhase === TOUR_PHASE.CHECKIN) && (
          role === 'guide' ? (
             tourPhase === TOUR_PHASE.PREPARE ? (
               <TouchableOpacity style={s.primaryBtn} onPress={() => setTourPhase(TOUR_PHASE.CHECKIN)}>
                 <Ionicons name="qr-code" size={20} color="#fff" />
                 <Text style={s.primaryBtnTxt}>Tiến hành Điểm danh (Check-in)</Text>
               </TouchableOpacity>
             ) : (
               <View style={s.card}>
                 <View style={s.cardHeader}>
                   <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                   <Text style={s.cardHeaderTitle}>Thực hiện Điểm danh</Text>
                 </View>
                 <View style={s.checkinControlRow}>
                   <Text style={s.checkinLabel}>Số Khách Lên Xe ({booking.guests} đăng ký):</Text>
                   <View style={s.counter}>
                     <TouchableOpacity onPress={() => setCheckinData(p => ({ ...p, people: Math.max(0, p.people - 1) }))} style={s.counterBtn}><Ionicons name="remove" size={20} color="#1f2a58" /></TouchableOpacity>
                     <Text style={s.counterValue}>{checkinData.people}</Text>
                     <TouchableOpacity onPress={() => setCheckinData(p => ({ ...p, people: p.people + 1 }))} style={s.counterBtn}><Ionicons name="add" size={20} color="#1f2a58" /></TouchableOpacity>
                   </View>
                 </View>
                 <View style={s.checkinControlRow}>
                   <Text style={s.checkinLabel}>Số Kiện Hành Lý:</Text>
                   <View style={s.counter}>
                     <TouchableOpacity onPress={() => setCheckinData(p => ({ ...p, luggage: Math.max(0, p.luggage - 1) }))} style={s.counterBtn}><Ionicons name="remove" size={20} color="#1f2a58" /></TouchableOpacity>
                     <Text style={s.counterValue}>{checkinData.luggage}</Text>
                     <TouchableOpacity onPress={() => setCheckinData(p => ({ ...p, luggage: p.luggage + 1 }))} style={s.counterBtn}><Ionicons name="add" size={20} color="#1f2a58" /></TouchableOpacity>
                   </View>
                 </View>
                 <View style={s.checkinControlRow}>
                   <Text style={s.checkinLabel}>HDV Xác Nhận Danh Tính:</Text>
                   <Switch value={checkinData.guideVerified} onValueChange={(v) => setCheckinData(p => ({ ...p, guideVerified: v }))} trackColor={{ false: "#e2e8f0", true: "#dcfce7" }} thumbColor={checkinData.guideVerified ? "#10b981" : "#f8fafc"} />
                 </View>
                 <TouchableOpacity style={[s.primaryBtn, { marginTop: 15, backgroundColor: '#10b981' }]} onPress={handleConfirmCheckinFinal}>
                   <Text style={s.primaryBtnTxt}>Chốt Check-in & Bắt Đầu Tour</Text>
                 </TouchableOpacity>
               </View>
             )
          ) : (
             <View style={s.guestWaitBox}>
                {tourPhase === TOUR_PHASE.PREPARE ? (
                   <>
                     <TouchableOpacity style={s.primaryBtn} onPress={() => Alert.alert("Thông báo", "Đã gửi thông báo cho HDV biết bạn đã có mặt tại điểm hẹn.")}>
                        <Ionicons name="location" size={20} color="#fff" />
                        <Text style={s.primaryBtnTxt}>Xác nhận: Tôi đã có mặt</Text>
                     </TouchableOpacity>
                     <Text style={s.waitText}>Vui lòng gặp Hướng dẫn viên để tiến hành thủ tục điểm danh.</Text>
                   </>
                ) : (
                   <>
                     <ActivityIndicator size="large" color="#4f7cff" />
                     <Text style={[s.waitText, { marginTop: 16, fontWeight: '700', color: '#1f2a58' }]}>Hướng dẫn viên đang làm thủ tục điểm danh.</Text>
                     <Text style={s.waitText}>Hành trình và Bản đồ GPS sẽ tự động hiển thị khi hoàn tất.</Text>
                   </>
                )}
             </View>
          )
        )}

        {/* PHASE 3: ACTIVE ON-TOUR */}
        {tourPhase === TOUR_PHASE.ACTIVE && (
          <View>
            <View style={s.mapContainer}>
              <Ionicons name="location" size={50} color="#ef4444" />
              <Text style={s.mapText}>Bản Đồ GPS Hành Trình</Text>
              {gpsEnabled && (
                <View style={s.gpsStatusActive}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.gpsStatusText}>GPS Trực Tuyến</Text>
                </View>
              )}
              {role === 'guest' && <HealthBubble />}
            </View>

            <View style={s.activeStatsPanel}>
              <View style={s.statBox}>
                <Text style={s.statLabel}>BƯỚC CHÂN</Text>
                <Text style={s.statValue}>{trackingStats.steps}</Text>
                <Text style={s.statSubText}><Ionicons name="sync" size={10} color="#10b981"/> Apple Health</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>QUÃNG ĐƯỜNG</Text>
                <Text style={s.statValue}>{trackingStats.distance.toFixed(2)} km</Text>
                <Text style={s.statSubText}><Ionicons name="navigate" size={10} color="#4f7cff"/> Từ GPS thiết bị</Text>
              </View>
            </View>

            <View style={s.actionButtonGroupActive}>
              <TouchableOpacity style={s.secondaryActionBtn} onPress={() => setShowModal('report')}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={[s.secondaryActionText, { color: '#f59e0b' }]}>Báo sự cố</Text>
              </TouchableOpacity>
              
              {/* CHỈ HDV MỚI CÓ QUYỀN BẤM DỪNG TOUR */}
              {role === 'guide' && (
                 <TouchableOpacity style={[s.secondaryActionBtn, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]} onPress={handleStopTour}>
                   <Ionicons name="stop-circle" size={20} color="#ef4444" />
                   <Text style={[s.secondaryActionText, { color: '#ef4444' }]}>Dừng Tour</Text>
                 </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* PHASE 4: FINISHED */}
        {tourPhase === TOUR_PHASE.FINISHED && (
          <View style={s.finishedContainer}>
            <Ionicons name="flag" size={80} color="#10b981" />
            <Text style={s.finishedTitle}>Tour Đã Hoàn Thành!</Text>
            <Text style={s.finishedSub}>
              {role === 'guide'
                ? 'Hành trình tuyệt vời! Thu nhập đã được giải ngân vào Ví của bạn.'
                : 'Hành trình tuyệt vời! Điểm thưởng đã được cộng vào tài khoản của bạn.'}
            </Text>
            {/* ✅ FIX: Nút về trang chủ theo đúng role */}
            <TouchableOpacity style={s.primaryBtn} onPress={handleGoHome}>
              <Ionicons name={role === 'guide' ? 'briefcase' : 'home'} size={20} color="#fff" />
              <Text style={s.primaryBtnTxt}>
                {role === 'guide' ? 'Về Trang Chủ HDV' : 'Về Trang Chủ'}
              </Text>
            </TouchableOpacity>
            {/* Nút phụ: Xem ví/điểm thưởng ngay */}
            <TouchableOpacity
              style={[s.secondaryActionBtn, { marginTop: 12, width: '100%', borderColor: '#e4ebff' }]}
              onPress={() => role === 'guide' ? router.replace('/guide-earnings') : router.replace('/guest_loyalty')}
            >
              <Ionicons name={role === 'guide' ? 'wallet-outline' : 'star-outline'} size={18} color="#4f7cff" />
              <Text style={[s.secondaryActionText, { color: '#4f7cff' }]}>
                {role === 'guide' ? 'Xem Ví Thu Nhập' : 'Xem Điểm Thưởng'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* NÚT SOS NỔI */}
      {(tourPhase === TOUR_PHASE.CHECKIN || tourPhase === TOUR_PHASE.ACTIVE) && (
        <TouchableOpacity style={s.sosButton} onPress={() => setShowModal('sos')}>
          <View style={s.sosGradient}>
            <Ionicons name="medical" size={28} color="#fff" />
            <Text style={s.sosText}>SOS</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* MENU BOTTOM CỦA HDV */}
      {role === 'guide' && <GuideTabBar activeRoute="active_tour_tracking" />}

      {/* --- MODALS (POPUP) --- */}
      <Modal visible={!!showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalContent}>
            {showModal === 'sos' && (
              <View style={{alignItems: 'center'}}>
                <Ionicons name="warning" size={60} color="#ef4444" />
                <Text style={[s.notiTitle, { fontSize: 20, marginTop: 10 }]}>CẢNH BÁO KHẨN CẤP!</Text>
                <Text style={[s.notiMsg, { textAlign: 'center', marginBottom: 20 }]}>Bạn sắp gửi tín hiệu cầu cứu và tọa độ GPS hiện tại đến Y tế và CSKH LocalMate. Xác nhận?</Text>
                <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
                  <TouchableOpacity style={[s.secondaryActionBtn, {flex: 1}]} onPress={() => setShowModal(null)}><Text style={s.secondaryActionText}>Hủy</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.primaryBtn, {flex: 1, backgroundColor: '#ef4444', marginBottom: 0}]} onPress={() => { setShowModal(null); setCustomAlert({visible:true, title:"Đã gửi SOS", message:"Cứu hộ đang được điều động.", showCancel:false, onConfirm: () => setCustomAlert(p=>({...p, visible:false}))}) }}><Text style={s.primaryBtnTxt}>GỬI SOS</Text></TouchableOpacity>
                </View>
              </View>
            )}
            {showModal === 'report' && (
              <View>
                <Text style={[s.notiTitle, { fontSize: 20, marginBottom: 15, textAlign: 'center' }]}>Báo Cáo Sự Cố</Text>
                <TextInput style={s.input} multiline placeholder="Ghi chú nhanh vấn đề (Xe hỏng, kẹt đường, y tế)..." value={reportNote} onChangeText={setReportNote} />
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={[s.secondaryActionBtn, {flex: 1}]} onPress={() => setShowModal(null)}><Text style={s.secondaryActionText}>Đóng</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.primaryBtn, {flex: 1, backgroundColor: '#f59e0b', marginBottom: 0}]} onPress={() => { setShowModal(null); setReportNote(''); setCustomAlert({visible:true, title:"Đã gửi báo cáo", message:"CSKH đã nhận thông tin.", showCancel:false, onConfirm: () => setCustomAlert(p=>({...p, visible:false}))}) }}><Text style={s.primaryBtnTxt}>Gửi Báo Cáo</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CUSTOM ALERT POPUP */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={s.alertOverlay}>
          <View style={s.alertBox}>
            <Ionicons name={customAlert.title.includes('Sai') || customAlert.title.includes('Chưa') ? "warning" : "information-circle"} size={50} color={customAlert.title.includes('Sai') || customAlert.title.includes('Chưa') ? "#f59e0b" : "#4f7cff"} />
            <Text style={s.alertTitle}>{customAlert.title}</Text>
            <Text style={s.alertMessage}>{customAlert.message}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              {customAlert.showCancel && (
                <TouchableOpacity style={s.alertCancelBtn} onPress={() => setCustomAlert(p => ({ ...p, visible: false }))}>
                  <Text style={s.alertCancelTxt}>Hủy</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.alertConfirmBtn} onPress={customAlert.onConfirm}>
                <Text style={s.alertConfirmTxt}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    subTitle: { fontSize: sz(12), color: '#64748b', fontWeight: '600', marginTop: 2 },
    
    content: { padding: sz(16), paddingBottom: sz(100) },
    card: { backgroundColor: '#fff', borderRadius: sz(20), padding: sz(18), elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: sz(16) },
    tourName: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    dashedLine: { height: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: sz(12) },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: sz(12) },
    avatar: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
    personRole: { fontSize: sz(11), color: '#7a8cc2', fontWeight: '700' },
    personName: { fontSize: sz(15), color: '#1f2a58', fontWeight: '900', marginTop: sz(2) },
    personSub: { fontSize: sz(13), color: '#64748b', fontWeight: '600', marginTop: sz(2) },

    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: sz(16), gap: sz(8) },
    cardHeaderTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58' },
    checkinControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sz(16) },
    checkinLabel: { fontSize: sz(14), color: '#1f2a58', fontWeight: '700', flex: 1 },
    counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: sz(12), padding: sz(4) },
    counterBtn: { backgroundColor: '#fff', width: sz(36), height: sz(36), borderRadius: sz(10), justifyContent: 'center', alignItems: 'center', elevation: 1 },
    counterValue: { width: sz(40), textAlign: 'center', fontSize: sz(16), fontWeight: '900', color: '#4f7cff' },

    guestWaitBox: { backgroundColor: '#fff', borderRadius: sz(20), padding: sz(24), alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#e4ebff' },
    waitText: { fontSize: sz(14), color: '#64748b', textAlign: 'center', marginTop: sz(12), lineHeight: sz(22) },

    primaryBtn: { flexDirection: 'row', backgroundColor: '#4f7cff', borderRadius: sz(14), height: sz(54), alignItems: 'center', justifyContent: 'center', gap: sz(10), elevation: 3, width: '100%', marginBottom: sz(16) },
    primaryBtnTxt: { color: '#fff', fontWeight: '900', fontSize: sz(15) },

    mapContainer: { height: sz(240), backgroundColor: '#e2e8f0', borderRadius: sz(20), justifyContent: 'center', alignItems: 'center', marginBottom: sz(16), overflow: 'hidden' },
    mapText: { color: '#64748b', marginTop: sz(10), fontWeight: '800' },
    gpsStatusActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(12), position: 'absolute', top: sz(12), left: sz(12) },
    gpsStatusText: { color: '#fff', fontSize: sz(11), fontWeight: '900', marginLeft: sz(6) },
    healthBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', position: 'absolute', top: sz(12), right: sz(12), paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(14), elevation: 3 },
    healthBubbleText: { color: '#ef4444', fontWeight: '900', fontSize: sz(12) },

    activeStatsPanel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sz(16), gap: sz(12) },
    statBox: { flex: 1, backgroundColor: '#fff', borderRadius: sz(16), padding: sz(16), elevation: 2, alignItems: 'center' },
    statLabel: { fontSize: sz(11), color: '#64748b', fontWeight: '900' },
    statValue: { fontSize: sz(24), fontWeight: '900', color: '#1f2a58', marginVertical: sz(8) },
    statSubText: { fontSize: sz(10), color: '#94a3b8', fontWeight: '600' },

    actionButtonGroupActive: { flexDirection: 'row', gap: sz(12) },
    secondaryActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: sz(14), height: sz(54), elevation: 2, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: sz(8) },
    secondaryActionText: { fontSize: sz(14), color: '#64748b', fontWeight: '800' },

    sosButton: { position: 'absolute', bottom: sz(100), right: sz(20), elevation: 8 },
    sosGradient: { width: sz(64), height: sz(64), borderRadius: sz(32), backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fee2e2' },
    sosText: { color: '#fff', fontWeight: '900', fontSize: sz(12) },

    finishedContainer: { alignItems: 'center', padding: sz(30), backgroundColor: '#fff', borderRadius: sz(20), elevation: 2 },
    finishedTitle: { fontSize: sz(22), fontWeight: '900', color: '#10b981', marginVertical: sz(16) },
    finishedSub: { fontSize: sz(14), color: '#64748b', textAlign: 'center', marginBottom: sz(30), lineHeight: sz(22) },

    modalBg: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), padding: sz(24), paddingBottom: sz(40) },
    notiTitle: { fontWeight: '900', color: '#1f2a58', fontSize: sz(16) },
    notiMsg: { color: '#64748b', fontSize: sz(14), lineHeight: sz(22) },
    input: { backgroundColor: '#f1f5f9', borderRadius: sz(12), minHeight: sz(80), padding: sz(14), textAlignVertical: 'top', color: '#1f2a58', marginBottom: sz(20) },

    alertOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'center', alignItems: 'center', padding: sz(24) },
    alertBox: { backgroundColor: '#fff', width: '100%', borderRadius: sz(24), padding: sz(24), alignItems: 'center' },
    alertTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginTop: sz(12), marginBottom: sz(8), textAlign: 'center' },
    alertMessage: { fontSize: sz(14), color: '#64748b', textAlign: 'center', lineHeight: sz(22), marginBottom: sz(24) },
    alertCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    alertCancelTxt: { color: '#64748b', fontWeight: '800', fontSize: sz(14) },
    alertConfirmBtn: { flex: 1, height: sz(48), borderRadius: sz(12), backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center' },
    alertConfirmTxt: { color: '#fff', fontWeight: '800', fontSize: sz(14) }
  });
};