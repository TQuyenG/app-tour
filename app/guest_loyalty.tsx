/**
 * app/guest_loyalty.tsx
 * Điểm thưởng, cấp hạng tự động cập nhật từ Database
 * ĐÃ FIX: Chỉ lấy dữ liệu của User đang đăng nhập thông qua storage-helper
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; // Dùng màng lọc
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TIER_CONFIG = [
  { name: "Đồng",       minPoints: 0,    maxPoints: 999,   color: "#cd7f32", bg: "#fef3e8", icon: "medal-outline",        perks: ["Tích 1đ/10.000đ chi tiêu", "Nhận voucher sinh nhật 50k"] },
  { name: "Bạc",        minPoints: 1000, maxPoints: 4999,  color: "#94a3b8", bg: "#f1f5f9", icon: "shield-outline",        perks: ["Tích 1.2đ/10.000đ chi tiêu", "Voucher giảm 5% mua tour", "Hỗ trợ CSKH ưu tiên"] },
  { name: "Vàng",       minPoints: 5000, maxPoints: 9999,  color: "#f59e0b", bg: "#fffbeb", icon: "star-outline",          perks: ["Tích 1.5đ/10.000đ chi tiêu", "Voucher giảm 10%", "Tặng gói bảo hiểm", "Hủy tour miễn phí"] },
  { name: "Kim Cương",  minPoints: 10000,maxPoints: 999999,color: "#a855f7", bg: "#f3e8ff", icon: "diamond-outline",       perks: ["Tích 2đ/10.000đ chi tiêu", "Voucher giảm 20%", "Đón sân bay miễn phí", "Đặc quyền VIP 24/7"] }
];

export default function GuestLoyaltyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState(TIER_CONFIG[0]);
  const [history, setHistory] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{voucher: any, cost: number} | null>(null);

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      try {
        // Màng lọc sẽ tự lấy profile của đúng người đang log in
        const pRaw = await AsyncStorage.getItem("@app_profile");
        if (pRaw) {
          const p = JSON.parse(pRaw);
          const currentPoints = p.loyaltyPoints || 0;
          setPoints(currentPoints);
          const currentTier = TIER_CONFIG.slice().reverse().find(t => currentPoints >= t.minPoints) || TIER_CONFIG[0];
          setTier(currentTier);
        } else {
          // Nếu user mới tinh chưa có profile, reset về 0
          setPoints(0);
          setTier(TIER_CONFIG[0]);
        }

        const hRaw = await AsyncStorage.getItem("@guest_loyalty_history");
        setHistory(hRaw ? JSON.parse(hRaw) : []);

        const vRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
        if (vRaw) {
          const allVouchers = JSON.parse(vRaw);
          const loyaltyVouchers = allVouchers.filter((v:any) => v.group === 'loyalty' && v.status === 'active');
          setRewards(loyaltyVouchers);
        }
      } catch (e) {}
    };
    loadData();
  }, []));

  const handleRedeemClick = async (voucher: any) => {
    const cost = Number(voucher.pointsCost) || 500;
    const maxRedeem = Number(voucher.userLimit) || 1;

    const myVRaw = await AsyncStorage.getItem("@guest_vouchers");
    const myVouchers = myVRaw ? JSON.parse(myVRaw) : [];
    const currentRedeemCount = myVouchers.filter((v:any) => v.code === voucher.code).length;

    if (currentRedeemCount >= maxRedeem) {
      Alert.alert("Giới hạn", `Bạn đã đổi mã này ${currentRedeemCount}/${maxRedeem} lần.`);
      return;
    }

    if (points < cost) {
      Alert.alert("Không đủ điểm", `Bạn cần thêm ${cost - points} điểm nữa.`);
      return;
    }
    setConfirmModal({ voucher, cost });
  };

  const executeRedeem = async () => {
    if (!confirmModal) return;
    const { voucher, cost } = confirmModal;
    try {
      const newPoints = points - cost;
      setPoints(newPoints);
      const pRaw = await AsyncStorage.getItem("@app_profile");
      const p = pRaw ? JSON.parse(pRaw) : {};
      p.loyaltyPoints = newPoints;
      await AsyncStorage.setItem("@app_profile", JSON.stringify(p));

      const newHistory = [{
        id: `h-${Date.now()}`, type: "redeem", points: cost, desc: `Đổi voucher: ${voucher.code}`, date: new Date().toISOString()
      }, ...history];
      setHistory(newHistory);
      await AsyncStorage.setItem("@guest_loyalty_history", JSON.stringify(newHistory));

      const myVRaw = await AsyncStorage.getItem("@guest_vouchers");
      const myVouchers = myVRaw ? JSON.parse(myVRaw) : [];
      myVouchers.unshift({ ...voucher, id: `gv_${Date.now()}`, used: false, source: 'loyalty' });
      await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(myVouchers));

      setConfirmModal(null);
      Alert.alert("Thành công!", "Voucher đã được lưu vào kho của bạn.");
    } catch (e) {}
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.title}>Điểm thưởng & Hạng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.card, s.tierCard]}>
          <View style={[s.tierBadge, { backgroundColor: tier.bg }]}>
            <Ionicons name={tier.icon as any} size={20} color={tier.color} />
            <Text style={[s.tierName, { color: tier.color }]}>Thành viên {tier.name}</Text>
          </View>
          <Text style={s.pointsLabel}>Điểm hiện tại</Text>
          <Text style={s.pointsValue}>{points.toLocaleString("vi-VN")}</Text>
          
          {tier.name !== "Kim Cương" && (
             <View style={s.progressWrap}>
               <View style={s.progressBg}>
                 <View style={[s.progressFill, { backgroundColor: tier.color, width: `${Math.min((points / tier.maxPoints) * 100, 100)}%` }]} />
               </View>
               <Text style={s.progressTxt}>Cần {Math.max(tier.maxPoints - points + 1, 0)} điểm nữa để thăng hạng</Text>
             </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Đặc quyền Hạng {tier.name}</Text>
        <View style={s.perkCard}>
          {tier.perks.map((perk, i) => (
             <View key={i} style={s.perkRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4f7cff" />
                <Text style={s.perkTxt}>{perk}</Text>
             </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Cửa hàng Đổi Điểm</Text>
        {rewards.length === 0 ? (
          <Text style={{color: '#94a3b8', fontStyle: 'italic', marginBottom: 20}}>Hiện tại chưa có quà đổi điểm nào.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            {rewards.map((v, i) => (
               <View key={i} style={s.redeemCard}>
                 <View style={s.redeemTop}>
                   <Text style={s.redeemValue}>{v.type === 'percent' ? `${v.discountValue}%` : `${v.discountValue/1000}K`}</Text>
                   <MaterialCommunityIcons name="ticket-percent-outline" size={24} color="#4f7cff" />
                 </View>
                 <Text style={s.redeemName} numberOfLines={2}>{v.title}</Text>
                 <Text style={s.redeemPoints}>{v.pointsCost} điểm</Text>
                 <TouchableOpacity 
                   style={[s.redeemBtn, points < v.pointsCost && { backgroundColor: "#f1f5f9" }]} 
                   onPress={() => handleRedeemClick(v)}
                 >
                   <Text style={[s.redeemBtnTxt, points < v.pointsCost && { color: "#94a3b8" }]}>Đổi ngay</Text>
                 </TouchableOpacity>
               </View>
            ))}
          </ScrollView>
        )}

        <Text style={s.sectionTitle}>Lịch sử điểm</Text>
        {history.length === 0 && <Text style={{color: '#94a3b8'}}>Bạn chưa có giao dịch nào.</Text>}
        {history.map(item => (
           <View key={item.id} style={s.historyCard}>
              <View style={[s.historyIcon, { backgroundColor: item.type === "earn" ? "#eaf0ff" : "#fee2e2" }]}>
                <Ionicons name={item.type === "earn" ? "add" : "remove"} size={20} color={item.type === "earn" ? "#4f7cff" : "#ef4444"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.historyDesc} numberOfLines={1}>{item.desc}</Text>
                <Text style={s.historyDate}>{new Date(item.date).toLocaleDateString("vi-VN")}</Text>
              </View>
              <Text style={[s.historyPoints, { color: item.type === "earn" ? "#4f7cff" : "#ef4444" }]}>
                {item.type === "earn" ? "+" : "-"}{item.points}
              </Text>
           </View>
        ))}
      </ScrollView>

      <Modal visible={!!confirmModal} transparent animationType="fade">
         <View style={s.modalOverlay}>
            <View style={s.modalBox}>
               <Ionicons name="gift" size={50} color="#4f7cff" />
               <Text style={s.modalTitle}>Xác nhận đổi quà</Text>
               <Text style={s.modalSub}>Dùng {confirmModal?.cost} điểm để lấy voucher: {confirmModal?.voucher?.title}?</Text>
               <View style={s.modalBtnRow}>
                 <TouchableOpacity style={s.modalCancelBtn} onPress={() => setConfirmModal(null)}><Text style={s.modalCancelTxt}>Hủy</Text></TouchableOpacity>
                 <TouchableOpacity style={s.modalSubmitBtn} onPress={executeRedeem}><Text style={s.modalSubmitTxt}>Đồng ý Đổi</Text></TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8faff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 20 },
  tierCard: { alignItems: "center" },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  tierName: { fontSize: 14, fontWeight: "800" },
  pointsLabel: { color: "#64748b", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  pointsValue: { fontSize: 40, fontWeight: "900", color: "#1f2a58" },
  progressWrap: { width: "100%", marginTop: 16, alignItems: "center" },
  progressBg: { width: "100%", height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressTxt: { fontSize: 12, color: "#94a3b8" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#1f2a58", marginBottom: 12 },
  perkCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#e4ebff" },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  perkTxt: { fontSize: 14, color: "#334155", flex: 1 },
  redeemCard: { backgroundColor: "#fff", width: 150, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff" },
  redeemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  redeemValue: { fontSize: 20, fontWeight: "900", color: "#1f2a58" },
  redeemName: { fontSize: 11, color: "#64748b", marginBottom: 8, height: 32 },
  redeemPoints: { fontSize: 13, color: "#4f7cff", fontWeight: "800", marginBottom: 12 },
  redeemBtn: { backgroundColor: "#4f7cff", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  redeemBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  historyCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  historyDesc: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  historyDate: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  historyPoints: { fontSize: 16, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { backgroundColor: "#fff", width: "100%", borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58", marginTop: 12, marginBottom: 8 },
  modalSub: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  modalCancelTxt: { color: "#64748b", fontSize: 15, fontWeight: "800" },
  modalSubmitBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  modalSubmitTxt: { color: "#fff", fontSize: 15, fontWeight: "900" },
});