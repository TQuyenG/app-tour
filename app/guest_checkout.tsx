/**
 * app/guest_checkout.tsx
 * Xác nhận Thanh toán - Bổ sung Liên kết Kho Voucher & Trang Loyalty Đổi điểm
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

export default function GuestCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { tourId, guideId, schStart, schEnd, guests, total, addons } = useLocalSearchParams();
  const baseTotal = Number(total) || 0;
  
  // Voucher States
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Kho Voucher Data
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useFocusEffect(useCallback(() => {
    const loadWallet = async () => {
      const raw = await AsyncStorage.getItem("@guest_vouchers");
      if (raw) setMyVouchers(JSON.parse(raw).filter((v:any) => !v.used));
    };
    loadWallet();
  }, []));

  // TÍNH TOÁN MỨC GIẢM GIÁ TỰ ĐỘNG
  const calculateDiscount = (voucher: any) => {
    if (baseTotal < (voucher.minOrderValue || 0)) {
      Alert.alert("Chưa đủ điều kiện", `Đơn hàng tối thiểu để dùng mã này là ${(voucher.minOrderValue || 0).toLocaleString('vi-VN')}đ.`);
      return false;
    }

    let calculated = 0;
    if (voucher.type === 'percent') {
      calculated = baseTotal * ((voucher.discountValue || voucher.value) / 100);
      if (voucher.maxDiscount && calculated > voucher.maxDiscount) {
        calculated = voucher.maxDiscount;
      }
    } else {
      calculated = voucher.discountValue || voucher.value;
    }

    setDiscountAmount(calculated);
    setAppliedVoucher(voucher);
    setVoucherInput(voucher.code);
    setShowVoucherModal(false);
    return true;
  };

  const handleManualApply = async () => {
    if (!voucherInput.trim()) return;
    
    // Tìm trong kho của khách trước
    let found = myVouchers.find(v => v.code.toUpperCase() === voucherInput.toUpperCase());
    
    // Nếu không có, tìm trong kho Public của Admin
    if (!found) {
      const aRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      if (aRaw) {
        const adminVouchers = JSON.parse(aRaw);
        const publicVoucher = adminVouchers.find((v:any) => v.code === voucherInput.toUpperCase() && v.status === 'active');
        if (publicVoucher) {
           if (publicVoucher.usedCount >= publicVoucher.usageLimit) {
              Alert.alert("Rất tiếc", "Mã giảm giá này đã hết lượt sử dụng trên hệ thống.");
              return;
           }
           found = publicVoucher;
        }
      }
    }

    if (found) {
      calculateDiscount(found);
    } else {
      Alert.alert("Lỗi", "Mã giảm giá không hợp lệ hoặc không thuộc về bạn.");
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherInput("");
  };

  const handleCheckout = async () => {
    setProcessing(true);
    
    // NẾU CÓ DÙNG VOUCHER, ĐỒNG BỘ DATA CHO ADMIN & ĐÁNH DẤU ĐÃ DÙNG
    if (appliedVoucher) {
       // 1. Cập nhật usedCount bên Admin
       const aRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
       if (aRaw) {
         const aList = JSON.parse(aRaw);
         const updatedAList = aList.map((v:any) => v.code === appliedVoucher.code ? { ...v, usedCount: (v.usedCount || 0) + 1 } : v);
         await AsyncStorage.setItem("@admin_vouchers_advanced", JSON.stringify(updatedAList));
       }

       // 2. Đánh dấu đã dùng trong ví Guest (nếu mã đó nằm trong ví)
       const gRaw = await AsyncStorage.getItem("@guest_vouchers");
       if (gRaw) {
         const gList = JSON.parse(gRaw);
         const updatedGList = gList.map((v:any) => v.id === appliedVoucher.id ? { ...v, used: true } : v);
         await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(updatedGList));
       }
    }

    // Pass data sang màn hình Success
    setTimeout(() => {
      setProcessing(false);
      router.replace({
        pathname: '/payment_success',
        params: { tourId, guideId, finalTotal: baseTotal - discountAmount }
      } as any);
    }, 1500);
  };

  const finalAmount = Math.max(0, baseTotal - discountAmount);

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => setShowCancelModal(true)}>
           <Ionicons name="arrow-back" size={Math.round(24 * scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thanh toán an toàn</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        <View style={s.summaryCard}>
          <Text style={s.sectionTitle}>Tóm tắt hóa đơn</Text>
          <View style={s.summaryRow}><Text style={s.summaryLbl}>Gói Tour cơ bản</Text><Text style={s.summaryVal}>{baseTotal.toLocaleString('vi-VN')}đ</Text></View>
          {appliedVoucher && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryLbl, {color: '#10b981'}]}>Giảm giá ({appliedVoucher.code})</Text>
              <Text style={[s.summaryVal, {color: '#10b981'}]}>-{discountAmount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.summaryRow}><Text style={s.totalLbl}>TỔNG CẦN THANH TOÁN</Text><Text style={s.totalVal}>{finalAmount.toLocaleString('vi-VN')}đ</Text></View>
        </View>

        {/* KHUNG VOUCHER NÂNG CẤP */}
        <View style={s.voucherBox}>
          <Text style={s.sectionTitle}>Khuyến mãi & Đổi điểm</Text>
          
          <View style={s.voucherInputRow}>
            <Ionicons name="ticket" size={20} color="#4f7cff" />
            <TextInput style={s.vInput} placeholder="Nhập mã giảm giá..." value={voucherInput} onChangeText={setVoucherInput} autoCapitalize="characters" editable={!appliedVoucher} />
            {appliedVoucher ? (
              <TouchableOpacity onPress={removeVoucher}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.vApplyBtn} onPress={handleManualApply}><Text style={s.vApplyTxt}>Áp dụng</Text></TouchableOpacity>
            )}
          </View>

          <View style={s.voucherActionRow}>
             <TouchableOpacity style={s.vActionBtn} onPress={() => setShowVoucherModal(true)}>
               <Ionicons name="wallet-outline" size={18} color="#f59e0b" />
               <Text style={s.vActionTxt}>Chọn từ Kho ({myVouchers.length})</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[s.vActionBtn, {backgroundColor: '#fef2f2', borderColor: '#fecaca'}]} onPress={() => router.push('/guest_loyalty')}>
               <Ionicons name="gift-outline" size={18} color="#ef4444" />
               <Text style={[s.vActionTxt, {color: '#ef4444'}]}>Đổi điểm lấy mã</Text>
             </TouchableOpacity>
          </View>
        </View>

        <Text style={s.sectionTitle}>Phương thức thanh toán</Text>
        {['Apple Pay', 'Ví MoMo', 'Thẻ tín dụng / Ghi nợ'].map((pm, i) => (
           <TouchableOpacity key={i} style={s.pmCard}>
             <View style={s.pmIcon}><Ionicons name={i===0?"logo-apple":i===1?"wallet":"card"} size={24} color="#4f7cff" /></View>
             <Text style={s.pmName}>{pm}</Text>
             <View style={s.radio}><View style={i===0 ? s.radioInner : null} /></View>
           </TouchableOpacity>
        ))}

      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={s.btn} onPress={handleCheckout} disabled={processing}>
          {processing ? <Text style={s.btnTxt}>Đang xử lý...</Text> : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={s.btnTxt}>Thanh toán {finalAmount.toLocaleString('vi-VN')}đ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL KHO VOUCHER */}
      <Modal visible={showVoucherModal} transparent animationType="slide">
         <View style={s.modalOverlay}>
            <View style={s.voucherSheet}>
               <View style={s.modalHeader}>
                 <Text style={s.modalTitle}>Kho Voucher của bạn</Text>
                 <TouchableOpacity onPress={() => setShowVoucherModal(false)}><Ionicons name="close" size={24} color="#1f2a58"/></TouchableOpacity>
               </View>
               <ScrollView style={{maxHeight: 400}} showsVerticalScrollIndicator={false}>
                 {myVouchers.length === 0 && <Text style={{textAlign:'center', color: '#94a3b8', marginTop: 20}}>Ví của bạn chưa có mã giảm giá nào.</Text>}
                 {myVouchers.map((v, idx) => (
                   <TouchableOpacity key={idx} style={s.vItemCard} onPress={() => calculateDiscount(v)}>
                      <View style={{flex: 1}}>
                        <Text style={s.vItemCode}>{v.code}</Text>
                        <Text style={s.vItemDesc} numberOfLines={2}>{v.title || v.desc}</Text>
                        <Text style={{fontSize: 11, color: '#f59e0b', marginTop: 4}}>Điều kiện: Tối thiểu {(v.minOrderValue||0).toLocaleString('vi-VN')}đ</Text>
                      </View>
                      <View style={s.vItemUseBtn}><Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>Sử dụng</Text></View>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
            </View>
         </View>
      </Modal>

      {/* Modal Hủy (Giữ nguyên) */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={s.modalOverlayCancel}>
          <View style={s.modalBox}>
            <View style={s.modalIcon}><Ionicons name="warning" size={32} color="#ef4444" /></View>
            <Text style={s.modalTitle}>Hủy thanh toán?</Text>
            <Text style={s.modalSub}>Đơn đặt tour của bạn chưa được hoàn tất. Bạn có chắc chắn muốn quay lại?</Text>
            <View style={s.modalRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowCancelModal(false)}><Text style={s.modalCancelTxt}>Tiếp tục</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={() => { setShowCancelModal(false); router.back(); }}><Text style={s.modalConfirmTxt}>Đồng ý Hủy</Text></TouchableOpacity>
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    content: { padding: sz(16), paddingBottom: sz(120) },
    
    summaryCard: { backgroundColor: '#fff', padding: sz(20), borderRadius: sz(20), elevation: 4, marginBottom: sz(20), shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
    sectionTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(14) },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sz(10) },
    summaryLbl: { fontSize: sz(14), color: '#64748b', fontWeight: '600' },
    summaryVal: { fontSize: sz(14), color: '#1f2a58', fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#e4ebff', marginVertical: sz(10) },
    totalLbl: { fontSize: sz(14), color: '#1f2a58', fontWeight: '900' },
    totalVal: { fontSize: sz(18), color: '#4f7cff', fontWeight: '900' },

    voucherBox: { backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), elevation: 2, marginBottom: sz(20), borderWidth: 1, borderColor: '#e4ebff' },
    voucherInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: sz(12), borderRadius: sz(12), borderWidth: 1, borderColor: '#e2e8f0', marginBottom: sz(12) },
    vInput: { flex: 1, height: sz(46), marginLeft: sz(8), fontSize: sz(14), fontWeight: 'bold', color: '#1f2a58' },
    vApplyBtn: { backgroundColor: '#1f2a58', paddingHorizontal: sz(12), paddingVertical: sz(6), borderRadius: sz(8) },
    vApplyTxt: { color: '#fff', fontSize: sz(12), fontWeight: '800' },
    voucherActionRow: { flexDirection: 'row', gap: sz(10) },
    vActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(6), paddingVertical: sz(10), backgroundColor: '#fffbeb', borderRadius: sz(10), borderWidth: 1, borderColor: '#fde68a' },
    vActionTxt: { fontSize: sz(12), fontWeight: '800', color: '#d97706' },

    pmCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), marginBottom: sz(10), elevation: 2, borderWidth: 1, borderColor: '#e4ebff' },
    pmIcon: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: sz(14) },
    pmName: { flex: 1, fontSize: sz(15), fontWeight: '800', color: '#1f2a58' },
    radio: { width: sz(22), height: sz(22), borderRadius: sz(11), borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: sz(12), height: sz(12), borderRadius: sz(6), backgroundColor: '#4f7cff' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: sz(20), paddingTop: sz(14), borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: {width: 0, height: -10} },
    btn: { flexDirection: 'row', gap: sz(8), backgroundColor: '#4f7cff', borderRadius: sz(16), height: sz(56), alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'flex-end' },
    voucherSheet: { backgroundColor: '#fff', borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), padding: sz(20) },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: sz(14), borderBottomWidth: 1, borderBottomColor: '#f0f4ff', marginBottom: sz(14) },
    modalTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    vItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: sz(14), borderRadius: sz(12), borderWidth: 1, borderColor: '#e2e8f0', marginBottom: sz(10) },
    vItemCode: { fontSize: sz(14), fontWeight: '900', color: '#4f7cff', marginBottom: sz(4) },
    vItemDesc: { fontSize: sz(12), color: '#475569' },
    vItemUseBtn: { backgroundColor: '#10b981', paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(8) },

    modalOverlayCancel: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: sz(20) },
    modalBox: { backgroundColor: '#fff', width: '100%', borderRadius: sz(24), padding: sz(24), alignItems: 'center', elevation: 10 },
    modalIcon: { width: sz(64), height: sz(64), borderRadius: sz(32), backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: sz(16) },
    modalSub: { fontSize: sz(14), color: '#64748b', textAlign: 'center', marginBottom: sz(24), lineHeight: sz(22) },
    modalRow: { flexDirection: 'row', gap: sz(12) },
    modalCancelBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    modalCancelTxt: { color: '#64748b', fontSize: sz(15), fontWeight: '800' },
    modalConfirmBtn: { flex: 1, height: sz(48), borderRadius: sz(14), backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    modalConfirmTxt: { color: '#fff', fontSize: sz(15), fontWeight: '800' }
  });
};