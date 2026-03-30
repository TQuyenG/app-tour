/**
 * app/shared-booking-detail.tsx
 * Trang Chi tiết Đơn đặt Tour - HIỂN THỊ TÊN & SĐT HDV
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
  
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [guideModal, setGuideModal] = useState(false);
  
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
        let foundBooking = list.find((b: any) => b.id === bookingId);
        
        // QUÉT TÊN VÀ SĐT HDV
        if (foundBooking && foundBooking.guideId) {
            let realName = foundBooking.guideName;
            let realPhone = foundBooking.guidePhone;
            let isModified = false;

            if (!realName || String(realName).includes("Hệ thống") || !realPhone) {
                const accRaw = await AsyncStorage.getItem("@app_accounts");
                if (accRaw) {
                   const accounts = JSON.parse(accRaw);
                   const a = accounts.find((x:any) => x.id === foundBooking.guideId);
                   if (a) {
                      realName = a.name;
                      realPhone = a.phone || "Chưa cập nhật";
                      isModified = true;
                   }
                }
            }

            if (isModified) {
               foundBooking.guideName = realName;
               foundBooking.guidePhone = realPhone;
               const updatedList = list.map((b:any) => b.id === foundBooking.id ? foundBooking : b);
               await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
            }
        }
        setBooking(foundBooking);
      }

      const rawGuides = await AsyncStorage.getItem('@app_guides');
      if (rawGuides) setAvailableGuides(JSON.parse(rawGuides));
    };
    loadData();
  }, [bookingId]));

  const handleBack = () => {
    if (role === 'guest') router.replace('/bookings' as any);
    else if (role === 'guide') router.replace('/guide-booking-management' as any);
    else if (role === 'staff' || role === 'admin') router.replace('/staff-booking-management' as any);
    else {
      if (router.canGoBack()) router.back();
      else router.replace('/' as any);
    }
  };

  const handleChangeGuide = async (newGuide: any) => {
    try {
      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      let list = JSON.parse(rawBookings || '[]');
      list = list.map((b: any) => b.id === booking.id ? { ...b, guideId: newGuide.id, guideName: newGuide.name, guidePhone: newGuide.phone } : b);
      await AsyncStorage.setItem('@guest_bookings', JSON.stringify(list));
      
      const rawChats = await AsyncStorage.getItem('@app_chats');
      if (rawChats) {
         let chats = JSON.parse(rawChats);
         chats = chats.map((c: any) => c.bookingId === booking.id ? { ...c, guideId: newGuide.id, guideName: newGuide.name } : c);
         await AsyncStorage.setItem('@app_chats', JSON.stringify(chats));
      }

      setBooking({ ...booking, guideId: newGuide.id, guideName: newGuide.name, guidePhone: newGuide.phone });
      setGuideModal(false);
      Alert.alert("Thành công", `Đã bàn giao Tour này cho HDV ${newGuide.name}.`);
    } catch (e) {}
  };

  const handleStaffCancel = async () => {
    Alert.alert("Xác nhận Hủy", "Bạn có chắc chắn muốn Hủy đơn này từ phía CSKH?", [
      { text: "Không", style: "cancel" },
      { text: "Đồng ý Hủy", style: "destructive", onPress: async () => {
          const rawBookings = await AsyncStorage.getItem('@guest_bookings');
          let list = JSON.parse(rawBookings || '[]');
          list = list.map((b: any) => b.id === booking.id ? { ...b, status: 'cancelled', internalNote: 'Đã hủy bởi CSKH' } : b);
          await AsyncStorage.setItem('@guest_bookings', JSON.stringify(list));
          setBooking({ ...booking, status: 'cancelled' });
      }}
    ]);
  };

  const handleReport = async () => {
    if (!reportNote.trim()) return;
    try {
      const rawComplaints = await AsyncStorage.getItem('@app_complaints');
      const complaints = rawComplaints ? JSON.parse(rawComplaints) : [];
      const userRaw = await AsyncStorage.getItem('@app_current_user');
      const currentUser = userRaw ? JSON.parse(userRaw) : {};

      complaints.unshift({
        id: `tc-${Date.now().toString().slice(-6)}`, bookingId, 
        title: `Báo cáo từ ${role === 'guide' ? 'HDV' : 'Khách hàng'}`,
        description: reportNote, status: 'pending', type: 'tour',
        senderName: currentUser.name || (role === 'guide' ? booking.guideName : booking.customerName),
        senderPhone: currentUser.phone || booking.customerPhone || "---",
        createdAt: new Date().toLocaleString('vi-VN'), adminNotes: []
      });
      
      await AsyncStorage.setItem('@app_complaints', JSON.stringify(complaints));
      setReportModal(false);
      setPopup({ visible: true, type: 'success', title: 'Đã gửi báo cáo', message: 'Hệ thống đã ghi nhận sự cố. CSKH sẽ liên hệ với bạn.' });
    } catch (e) {}
  };

  const handleOpenChat = async () => {
    if (!booking) return;
    try {
      const rawChats = await AsyncStorage.getItem('@app_chats');
      let chats = rawChats ? JSON.parse(rawChats) : [];
      const existingChat = chats.find((c: any) => c.bookingId === booking.id);
      
      if (!existingChat) {
        const userRaw = await AsyncStorage.getItem('@app_current_user');
        const currentUser = userRaw ? JSON.parse(userRaw) : {};
        const finalGuideName = (booking.guideName && !String(booking.guideName).includes("Hệ thống")) ? booking.guideName : "Hướng dẫn viên";

        chats.unshift({
          id: `chat_${booking.id}`, bookingId: booking.id, tourName: booking.tourName || "Tour",
          roomName: `[${booking.id}] ${booking.tourName || "Tour"}`,
          guestId: booking.accountId || booking.guestId || currentUser.accountId,
          guestName: booking.customerName || booking.guestName || "Khách hàng",
          guideId: booking.guideId || "", guideName: finalGuideName,
          lastMsg: "Hệ thống: Phòng chat hỗ trợ chuyến đi đã được kích hoạt.", lastSenderId: "system",
          updatedAt: new Date().toISOString(), unreadCount: 0
        });
        await AsyncStorage.setItem('@app_chats', JSON.stringify(chats));
      }

      if (typeof initOrGetChatSession === 'function') await initOrGetChatSession(booking);

      if (role === 'guest') router.push({ pathname: '/guest_chat_detail', params: { bookingId: booking.id, type: 'guide' } } as any);
      else if (role === 'guide') router.push({ pathname: '/guide_chat_detail', params: { bookingId: booking.id } } as any);
    } catch (error) {}
  };

  const handleOpenTracking = () => {
    if (!booking) return;
    router.push({ pathname: '/active_tour_tracking', params: { bookingId: booking.id } } as any);
  };

  const handleCompleteTour = async () => {
    try {
      const rawBookings = await AsyncStorage.getItem('@guest_bookings');
      if (!rawBookings) return;
      
      let list = JSON.parse(rawBookings);
      let currentBooking = list.find((b: any) => b.id === bookingId);
      
      // 1. CHỐNG CỘNG ĐÚP: Nếu tour đã hoàn thành rồi thì bỏ qua
      if (currentBooking.status === 'completed') {
         setPopup({ visible: true, type: 'warning', title: 'Đã hoàn thành', message: 'Tour này đã được giải ngân trước đó.' });
         return;
      }

      // 2. LẤY TỈ LỆ HOA HỒNG TỪ ADMIN (Mặc định 12% nếu chưa có)
      const rawRules = await AsyncStorage.getItem('@admin_commissions');
      let commRate = 12; 
      if (rawRules) {
         const rules = JSON.parse(rawRules);
         // Lấy hoa hồng theo Category, nếu không khớp thì lấy rule đầu tiên làm chuẩn
         const rule = rules.find((r: any) => r.category === currentBooking.category) || rules[0];
         if (rule) commRate = rule.rate;
      }

      // 3. TÍNH TOÁN TIỀN GIẢI NGÂN THỰC TẾ
      const totalAmt = currentBooking.totalAmount || currentBooking.priceRaw || 0;
      const commissionFee = (totalAmt * commRate) / 100;
      const gatewayFee = (totalAmt * 1) / 100; // Phí cổng thanh toán 1%
      const netIncome = totalAmt - commissionFee - gatewayFee;

      // 4. CỘNG TIỀN VÀO VÍ CỦA HDV (@guide_wallet)
      const wRaw = await AsyncStorage.getItem('@guide_wallet');
      const wallet = wRaw ? JSON.parse(wRaw) : { balance: 0, transactions: [] };
      
      wallet.balance += netIncome;
      wallet.transactions.unshift({
         id: `tx-tour-${Date.now()}`,
         type: 'tour_income',
         amount: netIncome,
         desc: `Giải ngân: ${currentBooking.tourName || 'Tour'} (Trừ ${commRate}% HH & 1% Phí cổng)`,
         createdAt: new Date().toISOString()
      });
      await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));

      // 5. CẬP NHẬT TRẠNG THÁI BOOKING
      const updatedList = list.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b);
      await AsyncStorage.setItem('@guest_bookings', JSON.stringify(updatedList));
      
      setBooking({ ...currentBooking, status: 'completed' });
      setPopup({ 
         visible: true, 
         type: 'success', 
         title: 'Hoàn thành Tour', 
         message: `Đã giải ngân ${netIncome.toLocaleString('vi-VN')}đ vào Ví thu nhập của bạn!` 
      });

    } catch (e) {
      console.log("Lỗi giải ngân HDV:", e);
    }
  };

  if (!booking) return <View style={s.screen} />;

  const statusColors: any = { pending: '#f59e0b', paid: '#3b82f6', accepted: '#10b981', cancelled: '#ef4444', completed: '#8b5cf6', done: '#8b5cf6' };
  const safeDate = (dateStr: string) => {
    if (!dateStr) return "Chưa xác định";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Chưa xác định" : d.toLocaleString('vi-VN');
  };

  const displayGuideName = (booking.guideName && !String(booking.guideName).includes("Hệ thống")) ? booking.guideName : "Chưa xác định";
  const displayGuidePhone = booking.guidePhone ? ` - ${booking.guidePhone}` : '';

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
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
          <View style={s.row}><Ionicons name="calendar" size={16} color="#7a8cc2"/><Text style={s.rowTxt}>Ngày đi: {safeDate(booking.startTime || booking.tourDate)}</Text></View>
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
               {/* HIỂN THỊ TÊN KÈM SỐ ĐIỆN THOẠI HDV */}
               <Text style={s.personName}>{displayGuideName}{displayGuidePhone}</Text>
             </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Thanh toán</Text>
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Tổng thanh toán:</Text>
            <Text style={s.totalVal}>{(booking.totalAmount || booking.priceRaw || 0).toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {(role === 'staff' || role === 'admin') && (
           <View style={{ gap: Math.round(10 * scale), marginTop: Math.round(10 * scale) }}>
             <Text style={[s.sectionTitle, {color: '#dc2626', marginBottom: 0}]}>Thao tác CSKH (Staff)</Text>
             {booking.status !== 'cancelled' && booking.status !== 'completed' && (
               <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#1f2a58' }]} onPress={() => setGuideModal(true)}>
                 <Ionicons name="swap-horizontal" size={18} color="#fff" />
                 <Text style={s.primaryBtnTxt}>Đổi Hướng dẫn viên mới</Text>
               </TouchableOpacity>
             )}
             <View style={{flexDirection: 'row', gap: 10}}>
                {booking.status !== 'cancelled' && (
                  <TouchableOpacity style={[s.dangerBtn, {flex: 1, borderWidth: 1, borderColor: '#fecaca'}]} onPress={handleStaffCancel}>
                    <Text style={s.dangerBtnTxt}>Hủy Đơn</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.primaryBtn, {flex: 1, backgroundColor: '#10b981'}]} onPress={() => router.push('/staff-livechat' as any)}>
                  <Text style={s.primaryBtnTxt}>Mở Live Chat</Text>
                </TouchableOpacity>
             </View>
           </View>
        )}

        {(role === 'guest' || role === 'guide') && (
          <View style={{ gap: Math.round(10 * scale), marginTop: Math.round(10 * scale) }}>
            {role === 'guide' && booking.status === 'on-tour' && (
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleCompleteTour}>
                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                <Text style={s.primaryBtnTxt}>Hoàn thành & Nhận tiền</Text>
              </TouchableOpacity>
            )}
            
            {(booking.status === 'paid' || booking.status === 'accepted' || booking.status === 'on-tour') && (
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#10b981' }]} onPress={handleOpenTracking}>
                <Ionicons name={booking.status === 'on-tour' ? "map" : "qr-code"} size={18} color="#fff" />
                <Text style={s.primaryBtnTxt}>{booking.status === 'on-tour' ? 'Xem Hành trình' : 'Check-in / Vào Tour'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.primaryBtn} onPress={handleOpenChat}>
              <Ionicons name="chatbubbles" size={18} color="#fff" />
              <Text style={s.primaryBtnTxt}>Nhắn tin trao đổi</Text>
            </TouchableOpacity>
            
            {role === 'guest' && ['pending', 'paid', 'accepted'].includes(booking.status) && (
              <TouchableOpacity style={[s.dangerBtn, { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 }]} onPress={() => setReportModal(true)}>
                <Ionicons name="close-circle" size={18} color="#dc2626" />
                <Text style={s.dangerBtnTxt}>Hủy & Báo cáo sự cố</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={guideModal} transparent animationType="slide">
         <View style={s.popupOverlay}>
            <View style={[s.popupBox, { maxHeight: '80%', padding: 20 }]}>
               <Text style={s.popupTitle}>Chọn HDV Thay thế</Text>
               <ScrollView style={{width: '100%'}}>
                  {availableGuides.filter(g => g.id !== booking.guideId).map(g => (
                     <TouchableOpacity key={g.id} style={s.personRow} onPress={() => handleChangeGuide(g)}>
                        <View style={[s.avatar, {backgroundColor: '#eaf0ff'}]}><Ionicons name="person" size={16} color="#4f7cff"/></View>
                        <View style={{flex: 1}}><Text style={s.personName}>{g.name}</Text><Text style={s.personRole}>Nhấn để chọn</Text></View>
                        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                     </TouchableOpacity>
                  ))}
               </ScrollView>
               <TouchableOpacity style={[s.popupCancelBtn, {width: '100%', marginTop: 10}]} onPress={() => setGuideModal(false)}><Text style={s.popupCancelTxt}>Đóng</Text></TouchableOpacity>
            </View>
         </View>
      </Modal>

      <Modal visible={reportModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.popupOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.popupBox}>
            <Text style={s.popupTitle}>Báo cáo sự cố</Text>
            <TextInput style={s.input} multiline placeholder="Mô tả chi tiết vấn đề để Staff xử lý..." value={reportNote} onChangeText={setReportNote} />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setReportModal(false)}><Text style={s.popupCancelTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.popupSubmitBtn} onPress={handleReport}><Text style={s.popupSubmitTxt}>Gửi Báo Cáo</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={popup.visible} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
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