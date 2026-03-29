/**
 * app/guest_vouchers.tsx
 * Kho voucher của khách: xem, dùng, nhập mã mới
 * ĐÃ BỔ SUNG: Tự động nhận Voucher có cờ "Tặng mọi khách hàng" từ Admin.
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Voucher {
  id: string; code: string; type: "fixed" | "percent";
  value: number; discountValue?: number; desc?: string; title?: string;
  used: boolean; source: "system" | "loyalty" | "cskh" | "promo";
  color: string;
}

export default function GuestVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [promoCode, setPromoCode] = useState("");

  useFocusEffect(useCallback(() => {
    const loadVouchers = async () => {
      const raw = await AsyncStorage.getItem("@guest_vouchers");
      let myVouchers = raw ? JSON.parse(raw) : [];

      // KIỂM TRA QUÀ TẶNG TOÀN HỆ THỐNG TỪ ADMIN
      const adminVRaw = await AsyncStorage.getItem("@admin_vouchers_advanced");
      if (adminVRaw) {
        const adminVouchers = JSON.parse(adminVRaw);
        const giftVouchers = adminVouchers.filter((v:any) => v.isGiftAll && v.status === 'active');

        // Lọc những voucher được tặng mà khách chưa có trong ví
        const newGifts = giftVouchers.filter((gv:any) => !myVouchers.some((mv:any) => mv.code === gv.code)).map((gv:any) => ({
           ...gv,
           id: `gv_gift_${Date.now()}_${Math.random()}`,
           used: false,
           source: 'system'
        }));

        if (newGifts.length > 0) {
           myVouchers = [...newGifts, ...myVouchers];
           await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(myVouchers));
        }
      }

      setVouchers(myVouchers);
    };
    loadVouchers();
  }, []));

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) return;
    Alert.alert("Chưa tìm thấy", "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
    setPromoCode("");
  };

  const unusedVouchers = vouchers.filter(v => !v.used);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.title}>Kho Voucher</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.promoInputBox}>
          <Ionicons name="ticket-outline" size={20} color="#7a8cc2" />
          <TextInput style={s.promoInput} placeholder="Nhập mã ưu đãi mới..." placeholderTextColor="#94a3b8" value={promoCode} onChangeText={setPromoCode} autoCapitalize="characters" />
          <TouchableOpacity style={[s.promoApplyBtn, promoCode.trim().length > 0 && { backgroundColor: "#4f7cff" }]} onPress={handleApplyPromoCode}>
            <Text style={[s.promoApplyTxt, promoCode.trim().length > 0 && { color: "#fff" }]}>Áp dụng</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Mã giảm giá của bạn ({unusedVouchers.length})</Text>

        {unusedVouchers.length === 0 && (
           <Text style={{color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 40}}>Bạn chưa có voucher nào.</Text>
        )}

        {unusedVouchers.map((v, i) => (
          <View key={i} style={s.voucherCard}>
            <View style={[s.cardLeft, { backgroundColor: v.color || '#4f7cff' }]}>
              <Text style={s.valTxt}>{v.type === "percent" ? `${v.discountValue || v.value}%` : `${(v.discountValue || v.value) / 1000}K`}</Text>
              <Text style={s.typeTxt}>GIẢM GIÁ</Text>
            </View>
            <View style={s.cardRight}>
              <View style={s.cardTop}>
                <View style={s.srcBadge}><Text style={s.srcTxt}>{v.source === "loyalty" ? "Đổi điểm" : "Hệ thống"}</Text></View>
              </View>
              <Text style={s.voucherDesc} numberOfLines={2}>{v.title || v.desc}</Text>
              
              <View style={s.cardBottom}>
                <View style={s.codeRow}>
                  <Text style={s.code}>{v.code}</Text>
                  <TouchableOpacity style={s.copyBtn} onPress={() => Alert.alert("Đã sao chép", `Mã ${v.code} đã được sao chép!`)}>
                    <Ionicons name="copy-outline" size={12} color="#4f7cff" />
                    <Text style={s.copyTxt}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={s.cutLeft} /><View style={s.cutRight} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8faff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  content: { padding: 16, paddingBottom: 40 },
  promoInputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 24, elevation: 2 },
  promoInput: { flex: 1, height: 40, fontSize: 14, color: "#1f2a58", marginLeft: 10, fontWeight: "600" },
  promoApplyBtn: { backgroundColor: "#f1f5f9", paddingHorizontal: 16, height: 36, borderRadius: 10, justifyContent: "center" },
  promoApplyTxt: { color: "#94a3b8", fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#1f2a58", marginBottom: 12 },
  
  voucherCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, marginBottom: 14, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, overflow: "hidden" },
  cardLeft: { width: 100, justifyContent: "center", alignItems: "center", padding: 10, borderRightWidth: 1, borderRightColor: "#e4ebff", borderStyle: "dashed" },
  valTxt: { color: "#fff", fontSize: 24, fontWeight: "900" },
  typeTxt: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "800", marginTop: 4 },
  cardRight: { flex: 1, padding: 14, justifyContent: "center" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  srcBadge: { backgroundColor: "#eaf0ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  srcTxt: { color: "#4f7cff", fontSize: 10, fontWeight: "800" },
  voucherDesc: { color: "#475569", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { color: "#1f2a58", fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#edf2ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  copyTxt: { color: "#4f7cff", fontSize: 11, fontWeight: "700" },
  cutLeft: { position: "absolute", left: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: "#f8faff" },
  cutRight: { position: "absolute", right: -10, top: "50%", marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: "#f8faff" }
});