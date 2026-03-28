/**
 * app/guest_loyalty.tsx
 * Điểm thưởng, cấp hạng, lịch sử tích điểm, đổi điểm
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LoyaltyHistory {
  id: string; type: "earn" | "redeem" | "expire" | "bonus";
  points: number; desc: string; date: string;
}

interface GuestProfile {
  name: string; loyaltyPoints: number; loyaltyTier: string;
  avatarColor: string;
}

const TIER_CONFIG = [
  { name: "Đồng",       minPoints: 0,    maxPoints: 999,   color: "#cd7f32", bg: "#fef3e8", icon: "medal-outline",        perks: ["Tích 1đ/10.000đ chi tiêu", "Nhận voucher sinh nhật 50k"] },
  { name: "Bạc",        minPoints: 1000, maxPoints: 4999,  color: "#94a3b8", bg: "#f1f5f9", icon: "shield-outline",        perks: ["Tích 1.2đ/10.000đ chi tiêu", "Voucher sinh nhật 100k", "Ưu tiên hỗ trợ"] },
  { name: "Vàng",       minPoints: 5000, maxPoints: 14999, color: "#f59e0b", bg: "#fffbeb", icon: "star-outline",          perks: ["Tích 1.5đ/10.000đ chi tiêu", "Voucher sinh nhật 200k", "Giảm 5% mọi tour"] },
  { name: "Kim Cương",  minPoints: 15000,maxPoints: 99999, color: "#3b82f6", bg: "#eff6ff", icon: "diamond-outline",       perks: ["Tích 2đ/10.000đ chi tiêu", "Voucher sinh nhật 500k", "Giảm 10% mọi tour", "HDV ưu tiên"] },
];

const REDEEM_OPTIONS = [
  { id: "r1", points: 100,  value: "10.000đ",  icon: "cash-outline",   color: "#16a34a" },
  { id: "r2", points: 500,  value: "55.000đ",  icon: "pricetag-outline", color: "#2856d6" },
  { id: "r3", points: 1000, value: "120.000đ", icon: "gift-outline",   color: "#8b5cf6" },
  { id: "r4", points: 2000, value: "260.000đ", icon: "wallet-outline",  color: "#f59e0b" },
];

const EARN_WAYS = [
  { icon: "airplane-outline",    label: "Đặt tour",        desc: "+1 điểm / 10.000đ chi tiêu" },
  { icon: "star-outline",        label: "Viết review",     desc: "+50 điểm mỗi review có ảnh" },
  { icon: "person-add-outline",  label: "Giới thiệu bạn", desc: "+500 điểm / người đăng ký thành công" },
  { icon: "gift-outline",        label: "Sinh nhật",      desc: "+200 điểm mỗi năm" },
  { icon: "checkmark-circle-outline", label: "Hoàn thành KYC", desc: "+100 điểm một lần" },
];

const SEED_HISTORY: LoyaltyHistory[] = [
  { id: "h1",  type: "earn",   points: 299,  desc: "Đặt tour Đà Lạt 3N2Đ",         date: "12/04/2026" },
  { id: "h2",  type: "earn",   points: 50,   desc: "Review tour Phú Quốc (có ảnh)", date: "10/04/2026" },
  { id: "h3",  type: "redeem", points: -100, desc: "Đổi điểm lấy 10.000đ",          date: "08/04/2026" },
  { id: "h4",  type: "earn",   points: 469,  desc: "Đặt tour Phú Quốc 4N3Đ",       date: "05/04/2026" },
  { id: "h5",  type: "bonus",  points: 200,  desc: "Thưởng sinh nhật",              date: "01/04/2026" },
  { id: "h6",  type: "earn",   points: 359,  desc: "Đặt tour Sapa 3N2Đ",           date: "28/03/2026" },
  { id: "h7",  type: "earn",   points: 50,   desc: "Review tour Sapa (có ảnh)",     date: "25/03/2026" },
  { id: "h8",  type: "redeem", points: -500, desc: "Đổi điểm lấy voucher 55.000đ", date: "20/03/2026" },
  { id: "h9",  type: "earn",   points: 500,  desc: "Giới thiệu bạn Trần Văn B",    date: "15/03/2026" },
  { id: "h10", type: "earn",   points: 100,  desc: "Hoàn thành eKYC",              date: "10/03/2026" },
  { id: "h11", type: "earn",   points: 230,  desc: "Đặt tour Nha Trang 3N2Đ",      date: "05/03/2026" },
  { id: "h12", type: "expire", points: -150, desc: "Điểm hết hạn (hạng Đồng)",     date: "01/03/2026" },
];

const TYPE_META = {
  earn:   { label: "Tích điểm",  color: "#16a34a", bg: "#dcfce7", icon: "add-circle-outline" },
  redeem: { label: "Đổi điểm",  color: "#dc2626", bg: "#fee2e2", icon: "remove-circle-outline" },
  expire: { label: "Hết hạn",   color: "#94a3b8", bg: "#f1f5f9", icon: "time-outline" },
  bonus:  { label: "Thưởng",    color: "#f59e0b", bg: "#fef9c3", icon: "gift-outline" },
};

export default function GuestLoyalty() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile]   = useState<GuestProfile>({ name: "Nguyễn An", loyaltyPoints: 1208, loyaltyTier: "Loyal", avatarColor: "#4f7cff" });
  const [history, setHistory]   = useState<LoyaltyHistory[]>([]);
  const [tab, setTab]           = useState<"overview" | "history" | "earn">("overview");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@app_profile").then(raw => {
      if (raw) setProfile(prev => ({ ...prev, ...JSON.parse(raw) }));
    }).catch(() => {});
    AsyncStorage.getItem("@loyalty_history").then(raw => {
      setHistory(raw ? JSON.parse(raw) : SEED_HISTORY);
    }).catch(() => setHistory(SEED_HISTORY));
  }, []));

  const currentTier = TIER_CONFIG.find(t => profile.loyaltyPoints >= t.minPoints && profile.loyaltyPoints <= t.maxPoints) ?? TIER_CONFIG[0];
  const nextTier    = TIER_CONFIG[TIER_CONFIG.indexOf(currentTier) + 1];
  const progress    = nextTier
    ? ((profile.loyaltyPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  const handleRedeem = (opt: typeof REDEEM_OPTIONS[0]) => {
    if (profile.loyaltyPoints < opt.points) {
      Alert.alert("Không đủ điểm", `Bạn cần thêm ${opt.points - profile.loyaltyPoints} điểm nữa.`);
      return;
    }
    Alert.alert(
      "Xác nhận đổi điểm",
      `Đổi ${opt.points} điểm lấy voucher ${opt.value}?\n\nVoucher sẽ được thêm vào kho của bạn.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận", onPress: async () => {
            const newPoints = profile.loyaltyPoints - opt.points;
            const newProfile = { ...profile, loyaltyPoints: newPoints };
            setProfile(newProfile);
            await AsyncStorage.setItem("@app_profile", JSON.stringify(newProfile)).catch(() => {});
            const code = `LY${Date.now().toString().slice(-6)}`;
            const numValue = parseInt(opt.value.replace(/\D/g, ""));
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 3); // hạn 3 tháng
            const expiryStr = expiryDate.toLocaleDateString("vi-VN");

            // ✅ Thêm thẳng vào @guest_vouchers — không cần nhập mã
            const gRaw = await AsyncStorage.getItem("@guest_vouchers").catch(() => null);
            const gList = gRaw ? JSON.parse(gRaw) : [];
            gList.unshift({
              id: `vly${Date.now()}`,
              code,
              type: "fixed",
              value: numValue,
              minOrder: 0,
              maxDiscount: numValue,
              desc: `Đổi ${opt.points} điểm thưởng – Voucher ${opt.value}`,
              expiry: expiryStr,
              used: false,
              source: "loyalty",
              color: "#f59e0b",
            });
            await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(gList)).catch(() => {});

            // ✅ Cũng lưu vào @promo_codes để Guest có thể nhập mã thủ công
            const pRaw = await AsyncStorage.getItem("@promo_codes").catch(() => null);
            const pList = pRaw ? JSON.parse(pRaw) : [];
            pList.unshift({
              id: `ly${Date.now()}`, code, type: "fixed", value: numValue,
              minOrder: 0, maxDiscount: numValue,
              description: `Voucher đổi điểm – ${opt.value}`,
              expiry: expiryStr, color: "#f59e0b",
              active: true, source: "loyalty",
              usedCount: 0, limit: 1,
            });
            await AsyncStorage.setItem("@promo_codes", JSON.stringify(pList)).catch(() => {});
            const newEntry: LoyaltyHistory = { id: `h${Date.now()}`, type: "redeem", points: -opt.points, desc: `Đổi điểm lấy voucher ${opt.value}`, date: new Date().toLocaleDateString("vi-VN") };
            const newHistory = [newEntry, ...history];
            setHistory(newHistory);
            await AsyncStorage.setItem("@loyalty_history", JSON.stringify(newHistory)).catch(() => {});
            Alert.alert("✅ Thành công", `Đã đổi ${opt.points} điểm!\nMã voucher: ${code}\nXem trong Kho voucher của bạn.`);
          },
        },
      ]
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Điểm thưởng & Hạng</Text>
        <TouchableOpacity style={s.voucherBtn} onPress={() => router.push("/guest_vouchers" as any)}>
          <Ionicons name="ticket-outline" size={18} color="#4f7cff" />
          <Text style={s.voucherBtnTxt}>Voucher</Text>
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={[s.heroCard, { backgroundColor: currentTier.color }]}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroGreeting}>Xin chào, {profile.name} 👋</Text>
            <Text style={s.heroPoints}>{profile.loyaltyPoints.toLocaleString("vi-VN")}</Text>
            <Text style={s.heroPointsLabel}>điểm tích lũy</Text>
          </View>
          <View style={[s.tierBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name={currentTier.icon as any} size={20} color="#fff" />
            <Text style={s.tierBadgeTxt}>{currentTier.name}</Text>
          </View>
        </View>
        {nextTier && (
          <View style={s.progressSection}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>Tiến tới hạng {nextTier.name}</Text>
              <Text style={s.progressLabel}>{nextTier.minPoints - profile.loyaltyPoints} điểm nữa</Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        {[["overview","Tổng quan"],["history","Lịch sử"],["earn","Cách tích điểm"]].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.tabBtn, tab === k && s.tabBtnActive]} onPress={() => setTab(k as any)}>
            <Text style={[s.tabBtnTxt, tab === k && s.tabBtnTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        {tab === "overview" && (
          <>
            {/* Tier benefits */}
            <Text style={s.sectionTitle}>Quyền lợi hạng {currentTier.name}</Text>
            <View style={s.benefitsCard}>
              {currentTier.perks.map((perk, i) => (
                <View key={i} style={s.perkRow}>
                  <View style={[s.perkDot, { backgroundColor: currentTier.color }]} />
                  <Text style={s.perkTxt}>{perk}</Text>
                </View>
              ))}
            </View>

            {/* All tiers */}
            <Text style={s.sectionTitle}>Bảng xếp hạng</Text>
            {TIER_CONFIG.map((tier, i) => {
              const isCurrent = tier.name === currentTier.name;
              return (
                <View key={i} style={[s.tierRow, isCurrent && s.tierRowActive, { borderLeftColor: tier.color }]}>
                  <View style={[s.tierIcon, { backgroundColor: tier.bg }]}>
                    <Ionicons name={tier.icon as any} size={20} color={tier.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.tierNameRow}>
                      <Text style={s.tierName}>{tier.name}</Text>
                      {isCurrent && <View style={[s.currentBadge, { backgroundColor: tier.color }]}><Text style={s.currentBadgeTxt}>Hạng của bạn</Text></View>}
                    </View>
                    <Text style={s.tierRange}>{tier.minPoints.toLocaleString()} – {tier.maxPoints >= 99999 ? "∞" : tier.maxPoints.toLocaleString()} điểm</Text>
                  </View>
                </View>
              );
            })}

            {/* Redeem */}
            <Text style={s.sectionTitle}>Đổi điểm lấy voucher</Text>
            <View style={s.redeemGrid}>
              {REDEEM_OPTIONS.map(opt => {
                const canRedeem = profile.loyaltyPoints >= opt.points;
                return (
                  <TouchableOpacity key={opt.id} style={[s.redeemCard, !canRedeem && s.redeemCardOff]} onPress={() => handleRedeem(opt)} activeOpacity={0.8}>
                    <View style={[s.redeemIcon, { backgroundColor: opt.color + "18" }]}>
                      <Ionicons name={opt.icon as any} size={22} color={canRedeem ? opt.color : "#c0cbe8"} />
                    </View>
                    <Text style={[s.redeemValue, { color: canRedeem ? opt.color : "#c0cbe8" }]}>{opt.value}</Text>
                    <Text style={s.redeemPoints}>{opt.points} điểm</Text>
                    {!canRedeem && <Text style={s.redeemLock}>Thiếu {opt.points - profile.loyaltyPoints}đ</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={s.sectionTitle}>Lịch sử giao dịch điểm</Text>
            {history.map(item => {
              const meta = TYPE_META[item.type];
              return (
                <View key={item.id} style={s.historyCard}>
                  <View style={[s.historyIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyDesc}>{item.desc}</Text>
                    <Text style={s.historyDate}>{item.date} · {meta.label}</Text>
                  </View>
                  <Text style={[s.historyPoints, { color: item.points > 0 ? "#16a34a" : "#dc2626" }]}>
                    {item.points > 0 ? "+" : ""}{item.points}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {tab === "earn" && (
          <>
            <Text style={s.sectionTitle}>Cách kiếm điểm thưởng</Text>
            {EARN_WAYS.map((way, i) => (
              <View key={i} style={s.earnCard}>
                <View style={s.earnIcon}>
                  <Ionicons name={way.icon as any} size={22} color="#4f7cff" />
                </View>
                <View>
                  <Text style={s.earnLabel}>{way.label}</Text>
                  <Text style={s.earnDesc}>{way.desc}</Text>
                </View>
              </View>
            ))}
            <View style={s.earnTipCard}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#f59e0b" />
              <Text style={s.earnTipTxt}>Mẹo: Đặt tour vào dịp lễ được nhân đôi điểm thưởng! Theo dõi thông báo để không bỏ lỡ.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:    { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  voucherBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#edf2ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  voucherBtnTxt:  { color: "#4f7cff", fontWeight: "700", fontSize: 12 },
  heroCard:       { margin: 14, borderRadius: 20, padding: 20 },
  heroTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroGreeting:   { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 4 },
  heroPoints:     { color: "#fff", fontSize: 36, fontWeight: "900" },
  heroPointsLabel:{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  tierBadge:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  tierBadgeTxt:   { color: "#fff", fontWeight: "800", fontSize: 14 },
  progressSection:{ gap: 6 },
  progressLabelRow:{ flexDirection: "row", justifyContent: "space-between" },
  progressLabel:  { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  progressBg:     { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" },
  progressFill:   { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  tabRow:         { flexDirection: "row", marginHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 4 },
  tabBtn:         { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive:   { backgroundColor: "#4f7cff" },
  tabBtnTxt:      { color: "#7a8cc2", fontWeight: "600", fontSize: 11 },
  tabBtnTxtActive:{ color: "#fff" },
  content:        { padding: 14, paddingTop: 8 },
  sectionTitle:   { color: "#1f2a58", fontWeight: "700", fontSize: 15, marginBottom: 10, marginTop: 6 },
  benefitsCard:   { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, gap: 10, marginBottom: 14 },
  perkRow:        { flexDirection: "row", alignItems: "center", gap: 10 },
  perkDot:        { width: 8, height: 8, borderRadius: 4 },
  perkTxt:        { color: "#1f2a58", fontSize: 13, fontWeight: "600" },
  tierRow:        { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", borderLeftWidth: 4, padding: 12, marginBottom: 8 },
  tierRowActive:  { backgroundColor: "#f7faff", borderColor: "#4f7cff" },
  tierIcon:       { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tierNameRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  tierName:       { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  tierRange:      { color: "#7a8cc2", fontSize: 12 },
  currentBadge:   { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  currentBadgeTxt:{ color: "#fff", fontSize: 10, fontWeight: "700" },
  redeemGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  redeemCard:     { width: "47%", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, alignItems: "center", gap: 6 },
  redeemCardOff:  { opacity: 0.55 },
  redeemIcon:     { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  redeemValue:    { fontSize: 18, fontWeight: "900" },
  redeemPoints:   { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },
  redeemLock:     { color: "#ef4444", fontSize: 10, fontWeight: "600" },
  historyCard:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  historyIcon:    { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  historyDesc:    { color: "#1f2a58", fontWeight: "600", fontSize: 13 },
  historyDate:    { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  historyPoints:  { fontSize: 15, fontWeight: "800" },
  earnCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 8 },
  earnIcon:       { width: 44, height: 44, borderRadius: 14, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  earnLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 3 },
  earnDesc:       { color: "#7a8cc2", fontSize: 12 },
  earnTipCard:    { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fef9c3", borderRadius: 14, borderWidth: 1, borderColor: "#fde68a", padding: 14, marginTop: 4 },
  earnTipTxt:     { flex: 1, color: "#92400e", fontSize: 12, lineHeight: 18 },
});