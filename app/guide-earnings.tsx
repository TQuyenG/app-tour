/**
 * app/guide-earnings.tsx
 * Ví thu nhập HDV - Tích hợp tính năng Rút Tiền chuẩn quy trình (Chờ Duyệt)
 * ĐÃ LIÊN KẾT TRỰC TIẾP VỚI KHO DỮ LIỆU @admin_payouts CỦA KẾ TOÁN
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideEarnings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [wallet, setWallet] = useState({ balance: 0, transactions: [] as any[] });
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const loadWallet = async () => {
    try {
      const wRaw = await AsyncStorage.getItem('@guide_wallet');
      if (wRaw) {
        const parsed = JSON.parse(wRaw);
        setWallet({
          balance: parsed.balance || 0,
          transactions: parsed.transactions || []
        });
      }
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => { loadWallet(); }, []));

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount.replace(/[^0-9]/g, ''));
    if (amt <= 0 || amt > wallet.balance) {
      Alert.alert('Lỗi', 'Số tiền rút không hợp lệ hoặc vượt quá số dư hiện tại.');
      return;
    }

    try {
      const newWallet = { ...wallet };
      const txId = `po-${Date.now()}`; // Đổi ID giống Admin Payout để đồng bộ dễ dàng
      
      // 1. Trừ tiền khỏi số dư chính
      newWallet.balance -= amt;
      
      // 2. Ghi nhận giao dịch với trạng thái PENDING
      newWallet.transactions.unshift({
        id: txId,
        type: 'withdraw',
        amount: amt,
        desc: 'Đang xử lý: Rút tiền về Tài khoản Ngân hàng',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await AsyncStorage.setItem('@guide_wallet', JSON.stringify(newWallet));
      
      // 3. ĐẨY LỆNH RÚT TIỀN SANG TRANG CỦA ADMIN/KẾ TOÁN (@admin_payouts)
      const pRaw = await AsyncStorage.getItem('@guide_profile');
      const profile = pRaw ? JSON.parse(pRaw) : {};
      
      const adminPayoutsRaw = await AsyncStorage.getItem('@admin_payouts');
      const adminPayouts = adminPayoutsRaw ? JSON.parse(adminPayoutsRaw) : [];
      
      adminPayouts.unshift({
        id: txId, 
        guideId: profile.guideId || 'guide-unknown', 
        guideName: profile.name || 'Hướng dẫn viên', 
        amount: amt,
        requestDate: new Date().toLocaleString('vi-VN'), 
        status: 'pending', 
        bankInfo: { 
           bankName: profile.bankName || 'Chưa cập nhật', 
           accountNumber: profile.bankAccount || 'Chưa cập nhật', 
           accountName: profile.name || 'Chưa cập nhật' 
        }
      });
      await AsyncStorage.setItem('@admin_payouts', JSON.stringify(adminPayouts));

      setWallet(newWallet);
      setShowWithdraw(false);
      setWithdrawAmount('');
      
      Alert.alert(
        'Yêu cầu thành công', 
        'Lệnh rút tiền đã được gửi tới Ban quản trị LocalMate. Tiền sẽ được chuyển về tài khoản ngân hàng của bạn ngay sau khi được kế toán duyệt.'
      );
    } catch (e) {}
  };

  const getTxStyle = (tx: any) => {
    // Nếu đang pending (rút tiền chưa duyệt), cho màu xám/vàng
    if (tx.status === 'pending') return { icon: 'time-outline', color: '#d97706', bg: '#fef3c7', sign: '-' };
    if (tx.status === 'rejected') return { icon: 'refresh', color: '#64748b', bg: '#f1f5f9', sign: '+' }; // Hoàn tiền

    switch(tx.type) {
      case 'tour_income': return { icon: 'briefcase', color: '#10b981', bg: '#dcfce7', sign: '+' };
      case 'tip': return { icon: 'gift', color: '#f59e0b', bg: '#fef3c7', sign: '+' };
      case 'withdraw': return { icon: 'card', color: '#ef4444', bg: '#fef2f2', sign: '-' };
      default: return { icon: 'cash', color: '#4f7cff', bg: '#eaf0ff', sign: '+' };
    }
  };

  const safeDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toLocaleString('vi-VN');
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + Math.round(10*scale) }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={Math.round(24*scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ví thu nhập</Text>
        <View style={{ width: Math.round(40*scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Số dư khả dụng</Text>
          <Text style={s.balanceVal}>{(wallet.balance || 0).toLocaleString('vi-VN')}đ</Text>
          <TouchableOpacity style={s.withdrawBtn} onPress={() => setShowWithdraw(true)}>
            <Ionicons name="wallet-outline" size={18} color="#1f2a58" />
            <Text style={s.withdrawTxt}>Rút tiền về Ngân hàng</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Lịch sử Giao dịch</Text>
        
        {(wallet.transactions || []).length === 0 ? (
          <View style={{alignItems: 'center', marginTop: 40}}>
             <Ionicons name="receipt-outline" size={50} color="#cbd5e1" />
             <Text style={{textAlign: 'center', color: '#94a3b8', marginTop: 10}}>Chưa có giao dịch nào.</Text>
          </View>
        ) : (
          wallet.transactions.map((tx: any) => {
            const style = getTxStyle(tx);
            return (
              <View key={tx.id} style={[s.txCard, tx.status === 'pending' && {borderColor: '#fde68a', backgroundColor: '#fffbeb'}]}>
                <View style={[s.txIconBox, { backgroundColor: style.bg }]}>
                  <Ionicons name={style.icon as any} size={20} color={style.color} />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txDesc} numberOfLines={2}>{tx.desc}</Text>
                  <Text style={s.txDate}>{safeDate(tx.createdAt)}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                   <Text style={[s.txAmount, { color: style.sign === '-' ? (tx.status === 'pending' ? '#d97706' : '#ef4444') : '#10b981' }]}>
                     {style.sign}{(tx.amount || 0).toLocaleString('vi-VN')}đ
                   </Text>
                   {tx.status === 'pending' && <Text style={{fontSize: 10, color: '#d97706', fontWeight: 'bold', marginTop: 4}}>Chờ Kế toán</Text>}
                   {tx.status === 'rejected' && <Text style={{fontSize: 10, color: '#64748b', fontWeight: 'bold', marginTop: 4}}>Đã hoàn lại</Text>}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showWithdraw} transparent animationType="fade">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalBox}>
            <Ionicons name="card" size={50} color="#4f7cff" />
            <Text style={s.modalTitle}>Rút tiền</Text>
            <Text style={s.modalSub}>Lệnh rút tiền sẽ được gửi tới Kế toán phê duyệt. Tối đa: {(wallet.balance || 0).toLocaleString('vi-VN')}đ</Text>
            
            <TextInput 
              style={s.input} 
              keyboardType="number-pad" 
              placeholder="Nhập số tiền..." 
              value={withdrawAmount} 
              onChangeText={setWithdrawAmount} 
            />

            <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
              <TouchableOpacity style={[s.btn, {backgroundColor: '#f1f5f9'}]} onPress={() => setShowWithdraw(false)}>
                <Text style={[s.btnTxt, {color: '#64748b'}]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, {backgroundColor: '#4f7cff'}]} onPress={handleWithdraw}>
                <Text style={s.btnTxt}>Tạo lệnh Rút</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GuideTabBar activeRoute="guide-earnings" />
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f3f7ff" },
    topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
    iconBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: sz(18), fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    
    balanceCard: { backgroundColor: "#1f2a58", padding: sz(24), borderRadius: sz(24), alignItems: "center", elevation: 8, shadowColor: '#1f2a58', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: {width: 0, height: 10} },
    balanceLabel: { color: "#94a8d8", fontSize: sz(14), fontWeight: '600', marginBottom: sz(8) },
    balanceVal: { color: "#10b981", fontSize: sz(36), fontWeight: "900" },
    withdrawBtn: { marginTop: sz(20), flexDirection: 'row', alignItems: 'center', gap: sz(8), backgroundColor: "#eaf0ff", paddingHorizontal: sz(20), paddingVertical: sz(12), borderRadius: sz(14) },
    withdrawTxt: { color: "#1f2a58", fontWeight: "800", fontSize: sz(14) },
    
    sectionTitle: { fontSize: sz(16), fontWeight: "800", color: "#1f2a58", marginTop: sz(24), marginBottom: sz(14) },
    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", padding: sz(16), borderRadius: sz(16), marginBottom: sz(10), borderWidth: 1, borderColor: "#e4ebff" },
    txIconBox: { width: sz(44), height: sz(44), borderRadius: sz(14), alignItems: 'center', justifyContent: 'center', marginRight: sz(14) },
    txInfo: { flex: 1, paddingRight: sz(10) },
    txDesc: { fontSize: sz(14), fontWeight: '700', color: '#1f2a58', marginBottom: sz(4), lineHeight: sz(20) },
    txDate: { fontSize: sz(12), color: '#94a3b8' },
    txAmount: { fontSize: sz(16), fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'center', alignItems: 'center', padding: sz(24) },
    modalBox: { backgroundColor: '#fff', width: '100%', borderRadius: sz(24), padding: sz(24), alignItems: 'center', elevation: 10 },
    modalTitle: { fontSize: sz(20), fontWeight: '900', color: '#1f2a58', marginTop: sz(16), marginBottom: sz(8) },
    modalSub: { fontSize: sz(14), color: '#64748b', textAlign: 'center', marginBottom: sz(24), lineHeight: sz(22) },
    input: { backgroundColor: '#f1f5f9', borderRadius: sz(14), width: '100%', padding: sz(16), fontSize: sz(20), fontWeight: '900', color: '#1f2a58', textAlign: 'center', marginBottom: sz(24) },
    btn: { flex: 1, height: sz(52), borderRadius: sz(14), alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontSize: sz(15), fontWeight: '800' }
  });
};