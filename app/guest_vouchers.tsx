/**
 * app/guest_vouchers.tsx
 * Kho voucher của khách: xem, dùng, nhập mã mới
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Voucher {
  id: string; code: string; type: "fixed" | "percent";
  value: number; minOrder?: number; maxDiscount?: number;
  desc: string; expiry: string; used: boolean;
  source: "system" | "loyalty" | "cskh" | "promo";
  color: string;
}

const SEED_VOUCHERS: Voucher[] = [
  { id: "v1",  code: "SUMMER35",   type: "percent", value: 35, minOrder: 2000000, maxDiscount: 500000, desc: "Ưu đãi mùa hè – Giảm 35% tour biển & cao nguyên",  expiry: "30/06/2026", used: false, source: "promo",   color: "#4f7cff" },
  { id: "v2",  code: "NEWUSER200", type: "fixed",   value: 200000, minOrder: 1500000,                  desc: "Chào mừng thành viên mới – Giảm 200.000đ",          expiry: "31/12/2026", used: false, source: "system",  color: "#16a34a" },
  { id: "v3",  code: "LY238491",   type: "fixed",   value: 55000,                                      desc: "Đổi điểm thưởng – Voucher 55.000đ",                expiry: "30/04/2026", used: false, source: "loyalty", color: "#f59e0b" },
  { id: "v4",  code: "BDAY100",    type: "fixed",   value: 100000,                                     desc: "Voucher sinh nhật từ TourGo 🎂",                   expiry: "01/05/2026", used: false, source: "system",  color: "#ec4899" },
  { id: "v5",  code: "CSKH582034", type: "fixed",   value: 100000, minOrder: 500000,                   desc: "Bồi thường sự cố từ CSKH",                         expiry: "15/05/2026", used: false, source: "cskh",   color: "#8b5cf6" },
  { id: "v6",  code: "TOUR10",     type: "percent", value: 10, minOrder: 3000000, maxDiscount: 300000, desc: "Giảm 10% cho tour trên 3 triệu",                   expiry: "30/04/2026", used: false, source: "promo",  color: "#06b6d4" },
  { id: "v7",  code: "USED001",    type: "fixed",   value: 150000,                                     desc: "Voucher đã sử dụng – Tour Đà Lạt 3N2Đ",           expiry: "01/04/2026", used: true,  source: "promo",  color: "#94a3b8" },
  { id: "v8",  code: "EXPIRE99",   type: "percent", value: 20, minOrder: 2000000,                      desc: "Voucher Flash Sale cuối tuần (đã hết hạn)",        expiry: "07/04/2026", used: false, source: "promo",  color: "#94a3b8" },
];

const SOURCE_META = {
  system:  { label: "Hệ thống", color: "#16a34a", bg: "#dcfce7" },
  loyalty: { label: "Điểm thưởng", color: "#f59e0b", bg: "#fef9c3" },
  cskh:    { label: "CSKH",     color: "#8b5cf6", bg: "#ede9fe" },
  promo:   { label: "Khuyến mãi", color: "#4f7cff", bg: "#edf2ff" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

function isExpired(expiry: string): boolean {
  const [d, m, y] = expiry.split("/").map(Number);
  return new Date(y, m - 1, d) < new Date();
}

export default function GuestVouchers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vouchers, setVouchers]   = useState<Voucher[]>([]);
  const [newCode, setNewCode]     = useState("");
  const [filter, setFilter]       = useState<"all" | "valid" | "used" | "expired">("valid");
  const [copied, setCopied]       = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guest_vouchers").then(raw => {
      setVouchers(raw ? JSON.parse(raw) : SEED_VOUCHERS);
    }).catch(() => setVouchers(SEED_VOUCHERS));
  }, []));

  const persist = async (data: Voucher[]) => {
    setVouchers(data);
    await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(data)).catch(() => {});
  };

  const addCode = async () => {
    if (!newCode.trim()) return;
    const code = newCode.trim().toUpperCase();
    if (vouchers.find(v => v.code === code)) {
      Alert.alert("Đã có", "Mã voucher này đã có trong kho của bạn."); return;
    }
    const pRaw = await AsyncStorage.getItem("@promo_codes").catch(() => null);
    const pList = pRaw ? JSON.parse(pRaw) : [];
    const found = pList.find((p: any) => p.code === code && p.active);
    if (!found) {
      Alert.alert("Không hợp lệ", "Mã voucher không tồn tại hoặc đã hết hiệu lực."); return;
    }
    const newV: Voucher = {
      id: `v${Date.now()}`, code, type: found.type ?? "fixed",
      value: found.value ?? 0, desc: "Voucher nhập tay",
      expiry: "31/12/2026", used: false, source: "promo", color: "#4f7cff",
    };
    await persist([newV, ...vouchers]);
    setNewCode("");
    Alert.alert("✅ Thêm thành công", `Voucher ${code} đã vào kho của bạn!`);
  };

  const copyCode = (code: string) => {
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    Alert.alert("📋 Đã sao chép", `Mã "${code}" đã được sao chép!`);
  };

  const filtered = vouchers.filter(v => {
    if (filter === "valid")   return !v.used && !isExpired(v.expiry);
    if (filter === "used")    return v.used;
    if (filter === "expired") return !v.used && isExpired(v.expiry);
    return true;
  });

  const validCount   = vouchers.filter(v => !v.used && !isExpired(v.expiry)).length;
  const totalSaving  = vouchers.filter(v => v.used && v.type === "fixed").reduce((s, v) => s + v.value, 0);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kho Voucher</Text>
        <View style={s.validBadge}>
          <Text style={s.validBadgeTxt}>{validCount} còn dùng</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Còn dùng",    value: validCount,                                                    color: "#16a34a" },
          { label: "Đã dùng",     value: vouchers.filter(v => v.used).length,                          color: "#7a8cc2" },
          { label: "Hết hạn",    value: vouchers.filter(v => !v.used && isExpired(v.expiry)).length,  color: "#dc2626" },
          { label: "Đã tiết kiệm",value: `${(totalSaving/1000).toFixed(0)}k`,                         color: "#4f7cff" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Nhập mã */}
      <View style={s.inputSection}>
        <View style={s.inputRow}>
          <Ionicons name="pricetag-outline" size={16} color="#8ea0d6" />
          <TextInput
            style={s.codeInput}
            value={newCode}
            onChangeText={v => setNewCode(v.toUpperCase())}
            placeholder="Nhập mã voucher..."
            placeholderTextColor="#b0bdd8"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={s.applyBtn} onPress={addCode}>
            <Text style={s.applyBtnTxt}>Thêm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {[["valid","Còn dùng"],["all","Tất cả"],["used","Đã dùng"],["expired","Hết hạn"]].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.filterChip, filter === k && s.filterActive]} onPress={() => setFilter(k as any)}>
            <Text style={[s.filterTxt, filter === k && s.filterTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        {filtered.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="ticket-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có voucher nào</Text>
            <TouchableOpacity style={s.exploreBtn} onPress={() => router.push("/explore" as any)}>
              <Text style={s.exploreBtnTxt}>Khám phá tour để nhận voucher</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map(v => {
          const expired = isExpired(v.expiry);
          const inactive = v.used || expired;
          const srcMeta = SOURCE_META[v.source];
          return (
            <View key={v.id} style={[s.card, inactive && s.cardInactive]}>
              {/* Left color bar */}
              <View style={[s.colorBar, { backgroundColor: inactive ? "#e2e8f0" : v.color }]} />
              <View style={{ flex: 1, padding: 12 }}>
                <View style={s.cardTopRow}>
                  <View style={[s.srcBadge, { backgroundColor: srcMeta.bg }]}>
                    <Text style={[s.srcTxt, { color: srcMeta.color }]}>{srcMeta.label}</Text>
                  </View>
                  {v.used && <View style={s.usedBadge}><Text style={s.usedTxt}>Đã dùng</Text></View>}
                  {expired && !v.used && <View style={s.expiredBadge}><Text style={s.expiredTxt}>Hết hạn</Text></View>}
                </View>
                <Text style={[s.voucherValue, { color: inactive ? "#94a3b8" : v.color }]}>
                  {v.type === "fixed" ? fmt(v.value) : `Giảm ${v.value}%`}
                  {v.type === "percent" && v.maxDiscount ? ` (tối đa ${fmt(v.maxDiscount)})` : ""}
                </Text>
                <Text style={s.voucherDesc} numberOfLines={2}>{v.desc}</Text>
                {v.minOrder && <Text style={s.minOrder}>Đơn tối thiểu: {fmt(v.minOrder)}</Text>}
                <View style={s.cardBottom}>
                  <View style={s.codeRow}>
                    <Text style={[s.code, inactive && { color: "#94a3b8" }]}>{v.code}</Text>
                    {!inactive && (
                      <TouchableOpacity style={s.copyBtn} onPress={() => copyCode(v.code)}>
                        <Ionicons name={copied === v.code ? "checkmark" : "copy-outline"} size={14} color="#4f7cff" />
                        <Text style={s.copyTxt}>{copied === v.code ? "Đã copy" : "Copy"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.expiry}>HSD: {v.expiry}</Text>
                </View>
                {!inactive && (
                  <TouchableOpacity
                    style={[s.useBtn, { backgroundColor: v.color }]}
                    onPress={() => router.push("/guest_booking_flow" as any)}
                  >
                    <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
                    <Text style={s.useBtnTxt}>Dùng ngay khi đặt tour</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  validBadge:    { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  validBadgeTxt: { color: "#16a34a", fontWeight: "800", fontSize: 12 },
  summaryRow:    { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:   { alignItems: "center", flex: 1 },
  summaryValue:  { fontSize: 16, fontWeight: "900" },
  summaryLabel:  { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  inputSection:  { padding: 14, paddingBottom: 0 },
  inputRow:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  codeInput:     { flex: 1, paddingVertical: 10, color: "#1f2a58", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  applyBtn:      { backgroundColor: "#4f7cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  applyBtnTxt:   { color: "#fff", fontWeight: "700", fontSize: 13 },
  filterRow:     { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:    { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:  { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt:     { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive:{ color: "#fff" },
  content:       { padding: 14, paddingTop: 0 },
  emptyCard:     { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 12 },
  emptyTxt:      { color: "#7a8cc2" },
  exploreBtn:    { backgroundColor: "#4f7cff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  exploreBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card:          { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 10, overflow: "hidden" },
  cardInactive:  { opacity: 0.6 },
  colorBar:      { width: 6 },
  cardTopRow:    { flexDirection: "row", gap: 6, marginBottom: 6 },
  srcBadge:      { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  srcTxt:        { fontSize: 10, fontWeight: "700" },
  usedBadge:     { backgroundColor: "#f1f5f9", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  usedTxt:       { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  expiredBadge:  { backgroundColor: "#fee2e2", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  expiredTxt:    { color: "#dc2626", fontSize: 10, fontWeight: "700" },
  voucherValue:  { fontSize: 22, fontWeight: "900", marginBottom: 3 },
  voucherDesc:   { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginBottom: 4 },
  minOrder:      { color: "#94a3b8", fontSize: 11, marginBottom: 6 },
  cardBottom:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  codeRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  code:          { color: "#1f2a58", fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  copyBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#edf2ff", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  copyTxt:       { color: "#4f7cff", fontSize: 11, fontWeight: "700" },
  expiry:        { color: "#94a3b8", fontSize: 11 },
  useBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 9 },
  useBtnTxt:     { color: "#fff", fontWeight: "700", fontSize: 13 },
});