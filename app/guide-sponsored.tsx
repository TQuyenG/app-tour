/**
 * app/guide-sponsored.tsx
 * Mua gói quảng cáo Sponsored Listing
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

interface SponsoredPackage {
  id: string; name: string; duration: string;
  price: number; features: string[];
  badge: string; color: string; popular?: boolean;
}

interface ActiveAd {
  id: string; packageName: string; tourName: string;
  startDate: string; endDate: string; daysLeft: number;
  impressions: number; clicks: number; bookings: number;
  color: string; status: "active" | "paused" | "expired";
}

const PACKAGES: SponsoredPackage[] = [
  {
    id: "pkg1", name: "Starter",    duration: "7 ngày",  price: 199000,
    badge: "Cơ bản", color: "#64748b",
    features: ["Hiển thị nổi bật 7 ngày", "Badge 'Nổi bật'", "Tăng 3x lượt xem", "Thống kê cơ bản"],
  },
  {
    id: "pkg2", name: "Standard",   duration: "15 ngày", price: 349000,
    badge: "Phổ biến", color: "#4f7cff", popular: true,
    features: ["Hiển thị nổi bật 15 ngày", "Badge 'Top Pick'", "Tăng 5x lượt xem", "Ưu tiên kết quả tìm kiếm", "Thống kê chi tiết"],
  },
  {
    id: "pkg3", name: "Premium",    duration: "30 ngày", price: 599000,
    badge: "Cao cấp", color: "#f59e0b",
    features: ["Hiển thị nổi bật 30 ngày", "Badge 'Premium'", "Tăng 10x lượt xem", "Vị trí #1 trang chủ", "Push notification cho 500 khách", "Thống kê realtime + xuất Excel"],
  },
  {
    id: "pkg4", name: "Elite",      duration: "60 ngày", price: 999000,
    badge: "Elite", color: "#8b5cf6",
    features: ["Tất cả tính năng Premium", "Hiển thị 60 ngày", "Banner trang chủ", "Email marketing 2.000 khách", "Tư vấn tối ưu hồ sơ 1-1", "Hỗ trợ ưu tiên 24/7"],
  },
];

const SEED_ADS: ActiveAd[] = [
  { id: "ad1", packageName: "Standard", tourName: "Tour Đà Lạt 3N2Đ",       startDate: "01/04/2026", endDate: "16/04/2026", daysLeft: 3, impressions: 4320, clicks: 216, bookings: 8,  color: "#4f7cff", status: "active" },
  { id: "ad2", packageName: "Starter",  tourName: "Trekking Langbiang",       startDate: "20/03/2026", endDate: "27/03/2026", daysLeft: 0, impressions: 1890, clicks: 63,  bookings: 3,  color: "#64748b", status: "expired" },
  { id: "ad3", packageName: "Premium",  tourName: "Tour Mũi Né 2N1Đ",         startDate: "10/03/2026", endDate: "09/04/2026", daysLeft: 0, impressions: 9870, clicks: 592, bookings: 22, color: "#f59e0b", status: "expired" },
];

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function GuideSponsored() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ads, setAds]           = useState<ActiveAd[]>([]);
  const [tab, setTab]           = useState<"packages" | "active">("packages");
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_ads").then(raw => {
      setAds(raw ? JSON.parse(raw) : SEED_ADS);
    }).catch(() => setAds(SEED_ADS));
  }, []));

  const buyPackage = (pkg: SponsoredPackage) => {
    if (!selected) { Alert.alert("Chọn tour", "Vui lòng chọn tour muốn quảng cáo."); return; }
    Alert.alert(
      `Mua gói ${pkg.name}`,
      `Tour: Tour đã chọn\nGói: ${pkg.name} (${pkg.duration})\nGiá: ${fmt(pkg.price)}\n\nXác nhận thanh toán?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thanh toán", onPress: async () => {
            const start = new Date();
            const end   = new Date(start);
            end.setDate(end.getDate() + parseInt(pkg.duration));
            const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
            const newAd: ActiveAd = {
              id: `ad${Date.now()}`,
              packageName: pkg.name,
              tourName: "Tour đã chọn",
              startDate: fmtDate(start),
              endDate:   fmtDate(end),
              daysLeft:  parseInt(pkg.duration),
              impressions: 0, clicks: 0, bookings: 0,
              color: pkg.color, status: "active",
            };
            const updated = [newAd, ...ads];
            setAds(updated);
            await AsyncStorage.setItem("@guide_ads", JSON.stringify(updated)).catch(() => {});
            Alert.alert("✅ Thanh toán thành công!", `Gói ${pkg.name} đã được kích hoạt. Tour của bạn sẽ hiển thị nổi bật ngay!`);
            setTab("active");
          },
        },
      ]
    );
  };

  const activeAds   = ads.filter(a => a.status === "active");
  const totalROI    = ads.filter(a => a.bookings > 0).reduce((s, a) => s + a.bookings * 2800000, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);

  const TOUR_OPTIONS = ["Tour Đà Lạt 3N2Đ","Trekking Langbiang","Tour Mũi Né 2N1Đ","Hội An cổ kính","Tour Núi Bà Đen"];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quảng cáo Sponsored</Text>
        {activeAds.length > 0 && (
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeTxt}>{activeAds.length} đang chạy</Text>
          </View>
        )}
      </View>

      {/* ROI Summary */}
      <View style={s.roiCard}>
        <View style={s.roiItem}>
          <Text style={s.roiValue}>{totalClicks.toLocaleString()}</Text>
          <Text style={s.roiLabel}>Tổng clicks</Text>
        </View>
        <View style={s.roiDivider} />
        <View style={s.roiItem}>
          <Text style={[s.roiValue, { color: "#f59e0b" }]}>{ads.reduce((s,a)=>s+a.bookings,0)}</Text>
          <Text style={s.roiLabel}>Booking từ QC</Text>
        </View>
        <View style={s.roiDivider} />
        <View style={s.roiItem}>
          <Text style={[s.roiValue, { color: "#16a34a" }]}>{fmt(totalROI)}</Text>
          <Text style={s.roiLabel}>Doanh thu ước tính</Text>
        </View>
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "packages" && s.tabBtnActive]} onPress={() => setTab("packages")}>
          <Text style={[s.tabBtnTxt, tab === "packages" && s.tabBtnTxtActive]}>Gói quảng cáo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "active" && s.tabBtnActive]} onPress={() => setTab("active")}>
          <Text style={[s.tabBtnTxt, tab === "active" && s.tabBtnTxtActive]}>Đang chạy ({activeAds.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {tab === "packages" && (
          <>
            {/* Tour picker */}
            <Text style={s.sectionTitle}>Chọn tour muốn quảng cáo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {TOUR_OPTIONS.map(t => (
                <TouchableOpacity key={t} style={[s.tourPill, selected === t && s.tourPillActive]} onPress={() => setSelected(t)}>
                  <Text style={[s.tourPillTxt, selected === t && s.tourPillTxtActive]} numberOfLines={1}>{t}</Text>
                  {selected === t && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.sectionTitle}>Chọn gói quảng cáo</Text>
            {PACKAGES.map(pkg => (
              <View key={pkg.id} style={[s.packageCard, pkg.popular && s.packageCardPopular, { borderColor: pkg.color + "60" }]}>
                {pkg.popular && (
                  <View style={[s.popularTag, { backgroundColor: pkg.color }]}>
                    <Text style={s.popularTxt}>PHỔ BIẾN NHẤT</Text>
                  </View>
                )}
                <View style={s.packageHeader}>
                  <View style={[s.packageIcon, { backgroundColor: pkg.color + "18" }]}>
                    <Ionicons name="megaphone-outline" size={22} color={pkg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.packageName}>{pkg.name}</Text>
                    <Text style={s.packageDuration}>{pkg.duration}</Text>
                  </View>
                  <Text style={[s.packagePrice, { color: pkg.color }]}>{fmt(pkg.price)}</Text>
                </View>
                {pkg.features.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={pkg.color} />
                    <Text style={s.featureTxt}>{f}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[s.buyBtn, { backgroundColor: pkg.color }, !selected && s.buyBtnOff]}
                  onPress={() => buyPackage(pkg)}
                >
                  <Ionicons name="flash-outline" size={16} color="#fff" />
                  <Text style={s.buyBtnTxt}>Mua gói {pkg.name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === "active" && (
          <>
            {ads.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="megaphone-outline" size={48} color="#c0cbe8" />
                <Text style={s.emptyTxt}>Chưa có chiến dịch quảng cáo nào</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setTab("packages")}>
                  <Text style={s.emptyBtnTxt}>Mua gói quảng cáo ngay</Text>
                </TouchableOpacity>
              </View>
            )}
            {ads.map(ad => {
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0";
              return (
                <View key={ad.id} style={[s.adCard, ad.status === "expired" && { opacity: 0.6 }]}>
                  <View style={s.adHeader}>
                    <View style={[s.adBadge, { backgroundColor: ad.color }]}>
                      <Text style={s.adBadgeTxt}>{ad.packageName}</Text>
                    </View>
                    <View style={[s.adStatus, { backgroundColor: ad.status === "active" ? "#dcfce7" : "#fee2e2" }]}>
                      <Text style={[s.adStatusTxt, { color: ad.status === "active" ? "#16a34a" : "#dc2626" }]}>
                        {ad.status === "active" ? `Còn ${ad.daysLeft} ngày` : "Đã hết hạn"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.adTourName}>{ad.tourName}</Text>
                  <Text style={s.adDate}>{ad.startDate} → {ad.endDate}</Text>
                  <View style={s.adStats}>
                    {[
                      { label: "Lượt hiển thị", value: ad.impressions.toLocaleString(), color: "#2856d6" },
                      { label: "Clicks",         value: ad.clicks.toLocaleString(),      color: "#f59e0b" },
                      { label: "CTR",            value: `${ctr}%`,                      color: "#a855f7" },
                      { label: "Booking",        value: ad.bookings,                     color: "#16a34a" },
                    ].map((stat, i) => (
                      <View key={i} style={s.adStatItem}>
                        <Text style={[s.adStatValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={s.adStatLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
      <AdminTabBar role="guide" activeRoute="/guide-sponsored" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  activeBadge:      { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeTxt:   { color: "#16a34a", fontWeight: "800", fontSize: 12 },
  roiCard:          { flexDirection: "row", backgroundColor: "#1f2a58", margin: 14, borderRadius: 18, padding: 16, alignItems: "center" },
  roiItem:          { flex: 1, alignItems: "center" },
  roiValue:         { color: "#fff", fontSize: 16, fontWeight: "900" },
  roiLabel:         { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 3, textAlign: "center" },
  roiDivider:       { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" },
  tabRow:           { flexDirection: "row", marginHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 4 },
  tabBtn:           { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive:     { backgroundColor: "#10b981" },
  tabBtnTxt:        { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  tabBtnTxtActive:  { color: "#fff" },
  content:          { padding: 14, paddingTop: 8 },
  sectionTitle:     { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  tourPill:         { borderRadius: 10, borderWidth: 1.5, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 200 },
  tourPillActive:   { backgroundColor: "#10b981", borderColor: "#10b981" },
  tourPillTxt:      { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  tourPillTxtActive:{ color: "#fff" },
  packageCard:      { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, padding: 16, marginBottom: 12, overflow: "hidden" },
  packageCardPopular:{ elevation: 6, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  popularTag:       { position: "absolute", top: 0, right: 0, borderBottomLeftRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  popularTxt:       { color: "#fff", fontWeight: "800", fontSize: 10 },
  packageHeader:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  packageIcon:      { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  packageName:      { color: "#1f2a58", fontWeight: "800", fontSize: 16 },
  packageDuration:  { color: "#7a8cc2", fontSize: 12, marginTop: 2 },
  packagePrice:     { fontSize: 18, fontWeight: "900" },
  featureRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  featureTxt:       { color: "#5f73a9", fontSize: 13 },
  buyBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  buyBtnOff:        { opacity: 0.5 },
  buyBtnTxt:        { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyCard:        { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 12 },
  emptyTxt:         { color: "#7a8cc2" },
  emptyBtn:         { backgroundColor: "#10b981", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  emptyBtnTxt:      { color: "#fff", fontWeight: "700" },
  adCard:           { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  adHeader:         { flexDirection: "row", gap: 8, marginBottom: 6 },
  adBadge:          { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  adBadgeTxt:       { color: "#fff", fontWeight: "800", fontSize: 12 },
  adStatus:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  adStatusTxt:      { fontSize: 12, fontWeight: "700" },
  adTourName:       { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 3 },
  adDate:           { color: "#94a3b8", fontSize: 11, marginBottom: 10 },
  adStats:          { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f3f7ff", borderRadius: 10, padding: 10 },
  adStatItem:       { alignItems: "center" },
  adStatValue:      { fontSize: 16, fontWeight: "900" },
  adStatLabel:      { color: "#7a8cc2", fontSize: 10, marginTop: 2 },
});