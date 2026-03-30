/**
 * app/guest_checkout.tsx
 * FIX: Lấy ảnh + tên + SĐT HDV từ @guide_profile / @app_guides / @app_accounts
 * THÊM: Chọn voucher từ ví + đổi điểm loyalty
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import {
  Image, Modal, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuestCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { tourId, guideId, schStart, schEnd, guests, total, addons, tourName } = useLocalSearchParams();
  const baseTotal = Number(total) || 0;

  const selectedAddons = useMemo(() => {
    try { return addons ? JSON.parse(addons as string) : []; }
    catch { return []; }
  }, [addons]);

  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo');

  // ── THÔNG TIN HDV ──
  const [guideData, setGuideData] = useState({ name: "Hệ thống tự sắp xếp", phone: "Chưa cập nhật", avatarUrl: "" });

  // ── VOUCHER & ĐIỂM ──
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [voucherModal, setVoucherModal] = useState(false);
  const [pointsModal, setPointsModal] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [alertModal, setAlertModal] = useState({ visible: false, title: "", msg: "", ok: false });

  const showAlert = (title: string, msg: string, ok = false) =>
    setAlertModal({ visible: true, title, msg, ok });

  useFocusEffect(useCallback(() => {
    const init = async () => {
      const userRaw = await AsyncStorage.getItem("@app_current_user");
      const currentUser = userRaw ? JSON.parse(userRaw) : {};
      const myId = currentUser?.accountId || "";
      setCurrentUserId(myId);

      // ── LẤY THÔNG TIN HDV: ưu tiên @guide_profile của HDV đó, rồi @app_guides, rồi @app_accounts ──
      if (guideId && guideId !== "null" && guideId !== "undefined") {
        let found: any = null;

        // 1. Tìm trong @app_guides (nguồn booking_flow dùng)
        const guidesRaw = await AsyncStorage.getItem("@app_guides");
        if (guidesRaw) {
          found = JSON.parse(guidesRaw).find((g: any) => g.id === guideId);
        }

        // 2. Fallback: @app_accounts
        if (!found) {
          const accRaw = await AsyncStorage.getItem("@app_accounts");
          if (accRaw) {
            found = JSON.parse(accRaw).find((a: any) => a.id === guideId);
          }
        }

        // 3. Thử lấy thêm avatarUrl từ @guide_profile nếu guideId khớp
        const profRaw = await AsyncStorage.getItem("@guide_profile");
        if (profRaw) {
          const prof = JSON.parse(profRaw);
          // @guide_profile lưu của HDV đang đăng nhập; khớp nếu guideId trùng
          if (prof.guideId === guideId || prof.accountId === guideId) {
            setGuideData({
              name: prof.name || found?.name || "Hướng dẫn viên",
              phone: prof.phone || found?.phone || "Chưa cập nhật",
              avatarUrl: prof.avatarUrl || found?.avatarUrl || "",
            });
            found = null; // đã set xong
          }
        }

        if (found) {
          setGuideData({
            name: found.name || "Hướng dẫn viên",
            phone: found.phone || "Chưa cập nhật",
            avatarUrl: found.avatarUrl || "",
          });
        }
      }

      // ── LẤY VOUCHER CỦA USER ──
      let vouchers: any[] = [];

      const guestVRaw = await AsyncStorage.getItem("@guest_vouchers");
      if (guestVRaw) {
        JSON.parse(guestVRaw)
          .filter((v: any) => v.accountId === myId && !v.used)
          .forEach((v: any) => vouchers.push({ ...v, value: Number(v.value || v.discountValue || 0), source: v.source || 'promo' }));
      }

      const adminVRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      if (adminVRaw) {
        JSON.parse(adminVRaw)
          .filter((v: any) => v.isGiftAll && v.status === "active")
          .forEach((v: any) => {
            if (!vouchers.find(ex => ex.code === v.code)) {
              vouchers.push({ id: v.id, code: v.code, type: v.type, value: Number(v.discountValue || v.value || 0), title: v.title, used: false, source: "system", color: v.color || "#2856d6", accountId: myId });
            }
          });
      }

      const directVRaw = await AsyncStorage.getItem("@direct_vouchers");
      if (directVRaw) {
        JSON.parse(directVRaw)
          .filter((v: any) => v.targetUserId === myId && !v.used)
          .forEach((v: any) => {
            if (!vouchers.find(ex => ex.code === v.code)) {
              vouchers.push({ id: v.id, code: v.code, type: v.type, value: Number(v.value || v.discountValue || 0), title: "Mã CSKH / Đền bù", desc: v.reason, used: false, source: "cskh", color: "#f59e0b", accountId: myId });
            }
          });
      }

      setMyVouchers(vouchers);

      // ── LẤY ĐIỂM LOYALTY ──
      const loyaltyRaw = await AsyncStorage.getItem("@guest_loyalty");
      if (loyaltyRaw) {
        const loyalty = JSON.parse(loyaltyRaw);
        // Hỗ trợ cả dạng object {points} lẫn dạng array [{accountId, points}]
        if (Array.isArray(loyalty)) {
          const mine = loyalty.find((l: any) => l.accountId === myId);
          setLoyaltyPoints(mine?.points || 0);
        } else if (loyalty.accountId === myId || loyalty.accountId === undefined) {
          setLoyaltyPoints(loyalty.points || 0);
        }
      }
    };
    init();
  }, [guideId]));

  // ── ÁP DỤNG VOUCHER ──
  const applyVoucher = (v: any) => {
    let disc = 0;
    if (v.type === 'percent') {
      disc = Math.round(baseTotal * v.value / 100);
      if (v.maxDiscount) disc = Math.min(disc, v.maxDiscount);
    } else {
      disc = v.value;
    }
    if (baseTotal < (v.minOrderValue || 0)) {
      showAlert("Chưa đủ điều kiện", `Đơn tối thiểu ${(v.minOrderValue || 0).toLocaleString('vi-VN')}đ`);
      return;
    }
    setAppliedVoucher(v);
    setVoucherDiscount(disc);
    setVoucherModal(false);
    setManualCode("");
  };

  const removeVoucher = () => { setAppliedVoucher(null); setVoucherDiscount(0); };

  const handleManualVoucher = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    let found = myVouchers.find(v => v.code.toUpperCase() === code);
    if (!found) {
      const adminRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      if (adminRaw) {
        const admin = JSON.parse(adminRaw).find((v: any) => v.code.toUpperCase() === code && v.status === "active");
        if (admin) found = { ...admin, value: Number(admin.discountValue || admin.value || 0) };
      }
    }
    if (!found) return showAlert("Không hợp lệ", "Mã voucher không tồn tại hoặc đã hết hạn.");
    applyVoucher(found);
  };

  // ── ĐỔI ĐIỂM ──
  // 1 điểm = 1.000đ
  const POINT_RATE = 1000;
  const maxPointsUsable = Math.min(loyaltyPoints, Math.floor(baseTotal / POINT_RATE));

  const applyPoints = () => {
    const pts = Math.min(Number(pointsInput) || 0, maxPointsUsable);
    setPointsUsed(pts);
    setPointsDiscount(pts * POINT_RATE);
    setPointsModal(false);
    setPointsInput("");
  };

  const removePoints = () => { setPointsUsed(0); setPointsDiscount(0); };

  const finalAmount = Math.max(0, baseTotal - voucherDiscount - pointsDiscount);

  const handleFinalPay = async () => {
    setProcessing(true);
    const userRaw = await AsyncStorage.getItem("@app_current_user");
    const currentUser = userRaw ? JSON.parse(userRaw) : {};
    const newBookingId = `BK${Date.now().toString().slice(-6)}`;
    const finalGuideId = (guideId && guideId !== "null" && guideId !== "undefined") ? String(guideId) : "";

    // Đánh dấu voucher đã dùng
    if (appliedVoucher) {
      const gRaw = await AsyncStorage.getItem("@guest_vouchers");
      if (gRaw) {
        const gList = JSON.parse(gRaw).map((v: any) =>
          v.id === appliedVoucher.id ? { ...v, used: true } : v
        );
        await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(gList));
      }
      const aRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      if (aRaw) {
        const aList = JSON.parse(aRaw).map((v: any) =>
          v.code === appliedVoucher.code ? { ...v, usedCount: (v.usedCount || 0) + 1 } : v
        );
        await AsyncStorage.setItem("@admin_vouchers_advanced", JSON.stringify(aList));
      }
    }

    // Trừ điểm nếu đã dùng
    if (pointsUsed > 0) {
      const loyaltyRaw = await AsyncStorage.getItem("@guest_loyalty");
      if (loyaltyRaw) {
        const loyalty = JSON.parse(loyaltyRaw);
        if (Array.isArray(loyalty)) {
          const updated = loyalty.map((l: any) =>
            l.accountId === currentUserId ? { ...l, points: Math.max(0, (l.points || 0) - pointsUsed) } : l
          );
          await AsyncStorage.setItem("@guest_loyalty", JSON.stringify(updated));
        } else {
          await AsyncStorage.setItem("@guest_loyalty", JSON.stringify({ ...loyalty, points: Math.max(0, (loyalty.points || 0) - pointsUsed) }));
        }
      }
    }

    // 1. LƯU BOOKING
    const newBooking = {
      id: newBookingId,
      tourId, tourName: tourName || "Chuyến đi tuyệt vời",
      guideId: finalGuideId,
      guideName: guideData.name,
      guidePhone: guideData.phone,
      startTime: schStart, endTime: schEnd,
      guests: Number(guests || 1),
      addons: selectedAddons,
      totalAmount: finalAmount,
      discountVoucher: voucherDiscount,
      discountPoints: pointsDiscount,
      voucherCode: appliedVoucher?.code || "",
      pointsUsed,
      paymentMethod,
      status: "paid",
      createdAt: new Date().toISOString(),
      accountId: currentUser.accountId,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
    };

    const bRaw = await AsyncStorage.getItem("@guest_bookings");
    const bList = bRaw ? JSON.parse(bRaw) : [];
    bList.unshift(newBooking);
    await AsyncStorage.setItem("@guest_bookings", JSON.stringify(bList));

    // 2. TẠO PHÒNG CHAT (để HDV thấy trong guide_chat_list)
    const cRaw = await AsyncStorage.getItem("@app_chats");
    const cList = cRaw ? JSON.parse(cRaw) : [];
    if (!cList.some((c: any) => c.bookingId === newBookingId)) {
      cList.unshift({
        id: `chat_${newBookingId}`,
        bookingId: newBookingId,
        tourName: tourName || "Tour",
        roomName: `[${newBookingId}] ${tourName || "Tour"}`,
        guestId: currentUser.accountId,
        guestName: currentUser.name || "Khách hàng",
        guideId: finalGuideId,
        guideName: guideData.name,
        lastMsg: "🎉 Đặt tour thành công! Phòng chat đã sẵn sàng.",
        lastSenderId: "system",
        updatedAt: new Date().toISOString(),
        unreadCount: 1,
      });
      await AsyncStorage.setItem("@app_chats", JSON.stringify(cList));
    }

    setTimeout(() => {
      setProcessing(false);
      router.replace({ pathname: '/payment_success', params: { bookingId: newBookingId } } as any);
    }, 1500);
  };

  const formatDiscount = (v: any) => {
    if (v.type === 'percent') return `${v.value}%`;
    if (v.value >= 1000000) return `${(v.value / 1000000).toFixed(1)}Tr`;
    if (v.value >= 1000) return `${(v.value / 1000).toFixed(0)}K`;
    return `${v.value}đ`;
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── MODAL ALERT ── */}
      <Modal visible={alertModal.visible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.alertBox}>
            <Ionicons name={alertModal.ok ? "checkmark-circle" : "warning"} size={44} color={alertModal.ok ? "#10b981" : "#f59e0b"} />
            <Text style={s.alertTitle}>{alertModal.title}</Text>
            <Text style={s.alertMsg}>{alertModal.msg}</Text>
            <TouchableOpacity style={s.alertBtn} onPress={() => setAlertModal({ ...alertModal, visible: false })}>
              <Text style={s.alertBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHỌN VOUCHER ── */}
      <Modal visible={voucherModal} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Chọn Voucher</Text>
              <TouchableOpacity onPress={() => setVoucherModal(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            {/* Nhập tay */}
            <View style={s.manualRow}>
              <TextInput
                style={s.manualInput} placeholder="Nhập mã thủ công..."
                value={manualCode} onChangeText={setManualCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={s.manualBtn} onPress={handleManualVoucher}>
                <Text style={s.manualBtnTxt}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {myVouchers.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 24, marginBottom: 24 }}>Ví bạn chưa có voucher nào</Text>
              )}
              {myVouchers.map((v, i) => (
                <TouchableOpacity key={i} style={s.vRow} onPress={() => applyVoucher(v)}>
                  <View style={[s.vBadge, { backgroundColor: v.color || '#4f7cff' }]}>
                    <Text style={s.vBadgeTxt}>{formatDiscount(v)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.vTitle} numberOfLines={1}>{v.title || v.code}</Text>
                    <Text style={s.vCode}>{v.code}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ĐỔI ĐIỂM ── */}
      <Modal visible={pointsModal} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <View style={[s.sheet, { paddingBottom: 30 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Đổi điểm thưởng</Text>
              <TouchableOpacity onPress={() => setPointsModal(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            <View style={s.pointsInfoRow}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={s.pointsInfoTxt}>Bạn có <Text style={{ fontWeight: '900', color: '#1f2a58' }}>{loyaltyPoints.toLocaleString()}</Text> điểm  •  Tối đa dùng được <Text style={{ fontWeight: '900', color: '#10b981' }}>{maxPointsUsable.toLocaleString()}</Text> điểm</Text>
            </View>
            <Text style={s.pointsRate}>1 điểm = 1.000đ giảm giá</Text>
            <View style={s.manualRow}>
              <TextInput
                style={s.manualInput}
                placeholder={`Nhập số điểm (tối đa ${maxPointsUsable})`}
                value={pointsInput}
                onChangeText={t => setPointsInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
              <TouchableOpacity style={[s.manualBtn, { backgroundColor: '#f59e0b' }]} onPress={applyPoints}>
                <Text style={s.manualBtnTxt}>Dùng</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.maxPointsBtn} onPress={() => setPointsInput(String(maxPointsUsable))}>
              <Text style={s.maxPointsTxt}>Dùng tối đa ({maxPointsUsable} điểm = {(maxPointsUsable * POINT_RATE).toLocaleString('vi-VN')}đ)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Hóa đơn thanh toán</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HÓA ĐƠN ── */}
        <View style={s.billCard}>
          <View style={s.billHeader}>
            <Ionicons name="receipt" size={24} color="#4f7cff" />
            <Text style={s.billBrand}>LOCALMATE RECEIPT</Text>
          </View>
          <View style={s.dashedLine} />

          <Text style={s.label}>Chuyến đi</Text>
          <Text style={s.valMain}>{tourName}</Text>

          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.label}>Ngày khởi hành</Text>
              <Text style={s.valText}>{new Date(schStart as string).toLocaleDateString('vi-VN')}</Text>
            </View>
            <View style={[s.infoItem, { alignItems: 'flex-end' }]}>
              <Text style={s.label}>Số lượng</Text>
              <Text style={s.valText}>{guests} Người</Text>
            </View>
          </View>

          {/* HDV — ảnh + tên + SĐT */}
          <View style={s.guideBox}>
            <Text style={s.label}>Hướng dẫn viên</Text>
            <View style={s.guideRow}>
              {guideData.avatarUrl ? (
                <Image source={{ uri: guideData.avatarUrl }} style={s.guideAvatar} />
              ) : (
                <View style={[s.guideAvatar, s.guideAvatarFallback]}>
                  <Ionicons name="person" size={20} color="#4f7cff" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.valBold}>{guideData.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="call-outline" size={12} color="#64748b" />
                  <Text style={s.subText}>{guideData.phone}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.dashedLine} />

          <Text style={s.label}>Chi tiết dịch vụ</Text>
          {selectedAddons.length > 0 ? (
            selectedAddons.map((item: any, idx: number) => (
              <View key={idx} style={s.priceRow}>
                <Text style={s.priceLabel}>+ {item.name}</Text>
                <Text style={s.priceVal}>{item.price.toLocaleString()}đ</Text>
              </View>
            ))
          ) : (
            <Text style={[s.subText, { marginBottom: 10 }]}>Không có dịch vụ thêm</Text>
          )}

          {/* Dòng tổng gốc */}
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { fontWeight: '700', color: '#1f2a58' }]}>Tạm tính</Text>
            <Text style={[s.priceVal, { fontWeight: '800' }]}>{baseTotal.toLocaleString('vi-VN')}đ</Text>
          </View>
          {voucherDiscount > 0 && (
            <View style={s.priceRow}>
              <Text style={[s.priceLabel, { color: '#10b981' }]}>Voucher ({appliedVoucher?.code})</Text>
              <Text style={[s.priceVal, { color: '#10b981' }]}>-{voucherDiscount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
          {pointsDiscount > 0 && (
            <View style={s.priceRow}>
              <Text style={[s.priceLabel, { color: '#f59e0b' }]}>Điểm thưởng ({pointsUsed} điểm)</Text>
              <Text style={[s.priceVal, { color: '#f59e0b' }]}>-{pointsDiscount.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}

          <View style={s.totalContainer}>
            <Text style={s.totalLabel}>TỔNG THANH TOÁN</Text>
            <Text style={s.totalVal}>{finalAmount.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* ── KHUYẾN MÃI & ĐIỂM ── */}
        <Text style={s.sectionTitle}>Khuyến mãi & Điểm thưởng</Text>
        <View style={s.promoCard}>
          {/* Voucher */}
          {appliedVoucher ? (
            <View style={s.appliedRow}>
              <Ionicons name="ticket" size={18} color="#10b981" />
              <Text style={s.appliedTxt} numberOfLines={1}>
                {appliedVoucher.code} — giảm {voucherDiscount.toLocaleString('vi-VN')}đ
              </Text>
              <TouchableOpacity onPress={removeVoucher}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.promoBtn} onPress={() => setVoucherModal(true)}>
              <View style={[s.promoBtnIcon, { backgroundColor: '#eaf0ff' }]}>
                <Ionicons name="ticket-outline" size={20} color="#4f7cff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.promoBtnTitle}>Dùng Voucher</Text>
                <Text style={s.promoBtnSub}>{myVouchers.length > 0 ? `${myVouchers.length} mã khả dụng trong ví` : "Nhập mã hoặc chọn từ ví"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}

          <View style={s.divider} />

          {/* Điểm */}
          {pointsUsed > 0 ? (
            <View style={s.appliedRow}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={s.appliedTxt}>
                {pointsUsed} điểm — giảm {pointsDiscount.toLocaleString('vi-VN')}đ
              </Text>
              <TouchableOpacity onPress={removePoints}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.promoBtn, loyaltyPoints === 0 && { opacity: 0.45 }]}
              onPress={() => loyaltyPoints > 0 ? setPointsModal(true) : showAlert("Chưa có điểm", "Bạn chưa có điểm thưởng. Hoàn thành tour để tích điểm!")}
            >
              <View style={[s.promoBtnIcon, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="star-outline" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.promoBtnTitle}>Đổi điểm thưởng</Text>
                <Text style={s.promoBtnSub}>Bạn có {loyaltyPoints.toLocaleString()} điểm  •  1 điểm = 1.000đ</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── PHƯƠNG THỨC THANH TOÁN ── */}
        <Text style={s.sectionTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity style={[s.pmItem, paymentMethod === 'momo' && s.pmActive]} onPress={() => setPaymentMethod('momo')}>
          <View style={[s.pmIcon, { backgroundColor: '#a50064' }]}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>MOMO</Text></View>
          <Text style={s.pmText}>Ví MoMo (Đã liên kết)</Text>
          <Ionicons name={paymentMethod === 'momo' ? "radio-button-on" : "radio-button-off"} size={22} color="#4f7cff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.pmItem, paymentMethod === 'card' && s.pmActive]} onPress={() => setPaymentMethod('card')}>
          <View style={[s.pmIcon, { backgroundColor: '#4f7cff' }]}><Ionicons name="card" size={18} color="#fff" /></View>
          <Text style={s.pmText}>Thẻ Visa/Mastercard</Text>
          <Ionicons name={paymentMethod === 'card' ? "radio-button-on" : "radio-button-off"} size={22} color="#4f7cff" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── NÚT THANH TOÁN ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={s.footerTotal}>
          <Text style={s.footerTotalLabel}>Tổng cần thanh toán</Text>
          <Text style={s.footerTotalVal}>{finalAmount.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={s.payBtn} onPress={handleFinalPay} disabled={processing}>
          {processing ? <ActivityIndicator color="#fff" /> : <Text style={s.payBtnTxt}>Xác nhận & Thanh toán</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (v: number) => Math.round(v * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f4f7fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sz(20), paddingBottom: sz(14), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    headerTitle: { fontSize: sz(17), fontWeight: '900', color: '#1f2a58' },
    backBtn: { width: sz(40), height: sz(40), alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: sz(12) },
    content: { padding: sz(20), paddingBottom: sz(120) },

    billCard: { backgroundColor: '#fff', borderRadius: sz(24), padding: sz(24), elevation: 5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: sz(20) },
    billHeader: { flexDirection: 'row', alignItems: 'center', gap: sz(10), marginBottom: sz(15) },
    billBrand: { fontSize: sz(13), fontWeight: '900', color: '#4f7cff', letterSpacing: 1.5 },
    dashedLine: { height: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', marginVertical: sz(18) },
    label: { fontSize: sz(11), color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: sz(4) },
    valMain: { fontSize: sz(20), fontWeight: '900', color: '#1f2a58', marginBottom: sz(14) },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sz(16) },
    infoItem: { flex: 1 },
    valText: { fontSize: sz(15), fontWeight: '700', color: '#334155' },

    guideBox: { backgroundColor: '#f8faff', padding: sz(14), borderRadius: sz(16), borderWidth: 1, borderColor: '#edf2f7', marginBottom: sz(4) },
    guideRow: { flexDirection: 'row', alignItems: 'center', gap: sz(12), marginTop: sz(6) },
    guideAvatar: { width: sz(44), height: sz(44), borderRadius: sz(22) },
    guideAvatarFallback: { backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
    valBold: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58' },
    subText: { fontSize: sz(13), color: '#64748b' },

    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sz(8) },
    priceLabel: { fontSize: sz(14), color: '#64748b' },
    priceVal: { fontSize: sz(14), fontWeight: '700', color: '#1f2a58' },
    totalContainer: { marginTop: sz(12), paddingTop: sz(14), borderTopWidth: 1, borderColor: '#f1f5f9', alignItems: 'flex-end' },
    totalLabel: { fontSize: sz(11), fontWeight: '800', color: '#94a3b8', marginBottom: sz(4) },
    totalVal: { fontSize: sz(28), fontWeight: '900', color: '#4f7cff' },

    sectionTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },

    promoCard: { backgroundColor: '#fff', borderRadius: sz(18), marginBottom: sz(20), overflow: 'hidden', elevation: 2 },
    promoBtn: { flexDirection: 'row', alignItems: 'center', padding: sz(16), gap: sz(12) },
    promoBtnIcon: { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: 'center', justifyContent: 'center' },
    promoBtnTitle: { fontSize: sz(14), fontWeight: '800', color: '#1f2a58' },
    promoBtnSub: { fontSize: sz(12), color: '#94a3b8', marginTop: sz(2) },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: sz(16) },
    appliedRow: { flexDirection: 'row', alignItems: 'center', padding: sz(14), paddingHorizontal: sz(16), gap: sz(10) },
    appliedTxt: { flex: 1, fontSize: sz(14), fontWeight: '700', color: '#10b981' },

    pmItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(18), marginBottom: sz(10), borderWidth: 1.5, borderColor: 'transparent' },
    pmActive: { borderColor: '#4f7cff', backgroundColor: '#f0f7ff' },
    pmIcon: { width: sz(42), height: sz(42), borderRadius: sz(12), alignItems: 'center', justifyContent: 'center', marginRight: sz(14) },
    pmText: { flex: 1, fontSize: sz(15), fontWeight: '700', color: '#1f2a58' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: sz(20), borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), elevation: 15 },
    footerTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sz(12) },
    footerTotalLabel: { fontSize: sz(13), color: '#64748b', fontWeight: '600' },
    footerTotalVal: { fontSize: sz(20), fontWeight: '900', color: '#1f2a58' },
    payBtn: { backgroundColor: '#1f2a58', height: sz(54), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center' },
    payBtnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '900' },

    // Modals
    overlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'center', alignItems: 'center', padding: sz(24) },
    alertBox: { backgroundColor: '#fff', width: '100%', borderRadius: sz(24), padding: sz(24), alignItems: 'center' },
    alertTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginTop: sz(10), marginBottom: sz(8) },
    alertMsg: { fontSize: sz(14), color: '#64748b', textAlign: 'center', lineHeight: sz(20), marginBottom: sz(20) },
    alertBtn: { width: '100%', height: sz(48), borderRadius: sz(12), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    alertBtnTxt: { color: '#1f2a58', fontWeight: '800', fontSize: sz(14) },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), padding: sz(20) },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sz(16) },
    sheetTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    manualRow: { flexDirection: 'row', gap: sz(10), marginBottom: sz(12) },
    manualInput: { flex: 1, height: sz(46), backgroundColor: '#f8fafc', borderRadius: sz(12), borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: sz(14), fontSize: sz(14), color: '#1f2a58', fontWeight: '700' },
    manualBtn: { backgroundColor: '#4f7cff', paddingHorizontal: sz(16), borderRadius: sz(12), justifyContent: 'center' },
    manualBtnTxt: { color: '#fff', fontWeight: '800', fontSize: sz(13) },
    vRow: { flexDirection: 'row', alignItems: 'center', gap: sz(12), paddingVertical: sz(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    vBadge: { width: sz(56), height: sz(56), borderRadius: sz(14), alignItems: 'center', justifyContent: 'center' },
    vBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: sz(14) },
    vTitle: { fontSize: sz(14), fontWeight: '800', color: '#1f2a58' },
    vCode: { fontSize: sz(12), color: '#7a8cc2', marginTop: sz(2) },
    pointsInfoRow: { flexDirection: 'row', alignItems: 'center', gap: sz(8), backgroundColor: '#fffbeb', padding: sz(12), borderRadius: sz(12), marginBottom: sz(8) },
    pointsInfoTxt: { fontSize: sz(13), color: '#64748b', flex: 1 },
    pointsRate: { fontSize: sz(12), color: '#94a3b8', marginBottom: sz(12), textAlign: 'center' },
    maxPointsBtn: { marginTop: sz(10), backgroundColor: '#fffbeb', borderRadius: sz(12), padding: sz(12), alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
    maxPointsTxt: { color: '#d97706', fontWeight: '800', fontSize: sz(13) },
  });
};