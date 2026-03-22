/**
 * app/guide-analytics.tsx
 * Thống kê tour: lượt xem, CTR, rating, doanh thu theo tháng
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

const { width: SW } = Dimensions.get("window");

interface TourStat {
  id: string; name: string; category: string;
  views: number; bookings: number; revenue: number;
  rating: number; reviewCount: number;
  conversionRate: number; trend: "up" | "down" | "flat";
}

interface MonthRevenue { month: string; revenue: number; bookings: number; }

const TOUR_STATS: TourStat[] = [
  { id: "1", name: "Tour Đà Lạt 3N2Đ",           category: "Cao nguyên", views: 1243, bookings: 48, revenue: 134400000, rating: 4.9, reviewCount: 42, conversionRate: 3.86, trend: "up" },
  { id: "2", name: "Trekking Langbiang",           category: "Núi rừng",  views: 876,  bookings: 35, revenue: 52500000,  rating: 4.8, reviewCount: 30, conversionRate: 3.99, trend: "up" },
  { id: "3", name: "Tour Mũi Né 2N1Đ",            category: "Biển đảo",  views: 654,  bookings: 29, revenue: 104400000, rating: 4.7, reviewCount: 25, conversionRate: 4.43, trend: "flat" },
  { id: "4", name: "Hội An cổ kính 2N1Đ",         category: "Di sản",    views: 432,  bookings: 22, revenue: 48400000,  rating: 4.6, reviewCount: 18, conversionRate: 5.09, trend: "down" },
  { id: "5", name: "Tour Núi Bà Đen",              category: "Tâm linh",  views: 389,  bookings: 18, revenue: 21600000,  rating: 4.9, reviewCount: 16, conversionRate: 4.63, trend: "up" },
  { id: "6", name: "Ninh Bình – Tràng An",         category: "Di sản",    views: 310,  bookings: 14, revenue: 35000000,  rating: 4.8, reviewCount: 12, conversionRate: 4.52, trend: "up" },
  { id: "7", name: "Tour Phú Yên xứ hoa vàng",    category: "Biển đảo",  views: 287,  bookings: 11, revenue: 35200000,  rating: 0,   reviewCount: 0,  conversionRate: 3.83, trend: "flat" },
  { id: "8", name: "Tour Cần Thơ miền sông nước", category: "Miền Tây",  views: 198,  bookings: 7,  revenue: 12600000,  rating: 0,   reviewCount: 0,  conversionRate: 3.54, trend: "flat" },
];

const MONTHLY: MonthRevenue[] = [
  { month: "T9",  revenue: 68000000,  bookings: 28 },
  { month: "T10", revenue: 85000000,  bookings: 34 },
  { month: "T11", revenue: 72000000,  bookings: 30 },
  { month: "T12", revenue: 120000000, bookings: 48 },
  { month: "T1",  revenue: 95000000,  bookings: 38 },
  { month: "T2",  revenue: 110000000, bookings: 44 },
  { month: "T3",  revenue: 134000000, bookings: 52 },
];

const MAX_REV = Math.max(...MONTHLY.map(m => m.revenue));
const fmt     = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(0)}tr` : `${(n/1000).toFixed(0)}k`;
const fmtFull = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function GuideAnalytics() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab]           = useState<"overview" | "tours" | "monthly">("overview");
  const [sortBy, setSortBy]     = useState<"revenue" | "views" | "bookings" | "rating">("revenue");

  const sorted = [...TOUR_STATS].sort((a, b) => {
    if (sortBy === "revenue")  return b.revenue - a.revenue;
    if (sortBy === "views")    return b.views - a.views;
    if (sortBy === "bookings") return b.bookings - a.bookings;
    return b.rating - a.rating;
  });

  const totalViews    = TOUR_STATS.reduce((s, t) => s + t.views, 0);
  const totalBookings = TOUR_STATS.reduce((s, t) => s + t.bookings, 0);
  const totalRevenue  = TOUR_STATS.reduce((s, t) => s + t.revenue, 0);
  const avgRating     = TOUR_STATS.filter(t => t.rating > 0).reduce((s, t, _, a) => s + t.rating / a.length, 0);
  const avgCTR        = TOUR_STATS.reduce((s, t, _, a) => s + t.conversionRate / a.length, 0);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thống kê & Analytics</Text>
      </View>

      {/* KPI Summary */}
      <View style={s.kpiRow}>
        {[
          { label: "Tổng lượt xem", value: totalViews.toLocaleString(),   color: "#2856d6" },
          { label: "Booking",        value: totalBookings,                  color: "#16a34a" },
          { label: "CTR TB",         value: `${avgCTR.toFixed(1)}%`,       color: "#f59e0b" },
          { label: "Rating TB",      value: avgRating.toFixed(1) + "⭐",   color: "#a855f7" },
        ].map((k, i) => (
          <View key={i} style={s.kpiItem}>
            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        {[["overview","Tổng quan"],["monthly","Doanh thu"],["tours","Từng tour"]].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.tabBtn, tab === k && s.tabBtnActive]} onPress={() => setTab(k as any)}>
            <Text style={[s.tabBtnTxt, tab === k && s.tabBtnTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {tab === "overview" && (
          <>
            {/* Revenue card */}
            <View style={s.revenueHero}>
              <Text style={s.revenueLabel}>Tổng doanh thu</Text>
              <Text style={s.revenueValue}>{fmtFull(totalRevenue)}</Text>
              <View style={s.revenueBadge}>
                <Ionicons name="trending-up" size={13} color="#16a34a" />
                <Text style={s.revenueBadgeTxt}>+22% so với tháng trước</Text>
              </View>
            </View>

            {/* Metric cards */}
            <View style={s.metricGrid}>
              {[
                { icon: "eye-outline",       label: "Lượt xem tháng này", value: "1.243",  color: "#2856d6", change: "+18%" },
                { icon: "receipt-outline",   label: "Booking tháng này",   value: "52",      color: "#16a34a", change: "+8%" },
                { icon: "star-outline",      label: "Đánh giá mới",        value: "143",     color: "#f59e0b", change: "+5%" },
                { icon: "people-outline",    label: "Lượt khách",          value: "186",     color: "#a855f7", change: "+14%" },
              ].map((m, i) => (
                <View key={i} style={s.metricCard}>
                  <View style={[s.metricIcon, { backgroundColor: m.color + "18" }]}>
                    <Ionicons name={m.icon as any} size={20} color={m.color} />
                  </View>
                  <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                  <View style={s.changeBadge}>
                    <Ionicons name="trending-up" size={10} color="#16a34a" />
                    <Text style={s.changeTxt}>{m.change}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Top 3 tours */}
            <Text style={s.sectionTitle}>Top 3 Tour tốt nhất</Text>
            {TOUR_STATS.slice(0, 3).map((t, i) => (
              <View key={t.id} style={s.topCard}>
                <View style={[s.rankBadge, i === 0 && { backgroundColor: "#fef9c3" }, i === 1 && { backgroundColor: "#f1f5f9" }, i === 2 && { backgroundColor: "#fef3e8" }]}>
                  <Text style={[s.rankTxt, { color: i === 0 ? "#d97706" : i === 1 ? "#64748b" : "#cd7f32" }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.topName} numberOfLines={1}>{t.name}</Text>
                  <Text style={s.topMeta}>{t.views} lượt xem · {t.bookings} booking</Text>
                </View>
                <Text style={[s.topRevenue, { color: "#16a34a" }]}>{fmt(t.revenue)}</Text>
              </View>
            ))}
          </>
        )}

        {tab === "monthly" && (
          <>
            <Text style={s.sectionTitle}>Doanh thu 7 tháng gần đây</Text>
            <View style={s.chartCard}>
              <View style={s.barChart}>
                {MONTHLY.map((m, i) => {
                  const height = Math.max((m.revenue / MAX_REV) * 120, 8);
                  const isLast = i === MONTHLY.length - 1;
                  return (
                    <View key={i} style={s.barCol}>
                      <Text style={s.barRevLabel}>{fmt(m.revenue)}</Text>
                      <View style={[s.bar, { height, backgroundColor: isLast ? "#10b981" : "#4f7cff" + "99" }]} />
                      <Text style={s.barMonth}>{m.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={s.monthlyList}>
              {[...MONTHLY].reverse().map((m, i) => (
                <View key={i} style={s.monthlyRow}>
                  <Text style={s.monthlyMonth}>{m.month}/2026</Text>
                  <Text style={s.monthlyBookings}>{m.bookings} booking</Text>
                  <Text style={[s.monthlyRevenue, { color: "#16a34a" }]}>{fmtFull(m.revenue)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {tab === "tours" && (
          <>
            {/* Sort */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {[["revenue","Doanh thu"],["bookings","Booking"],["views","Lượt xem"],["rating","Rating"]].map(([k,l]) => (
                <TouchableOpacity key={k} style={[s.sortChip, sortBy === k && s.sortChipActive]} onPress={() => setSortBy(k as any)}>
                  <Text style={[s.sortChipTxt, sortBy === k && s.sortChipTxtActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {sorted.map((t, i) => (
              <View key={t.id} style={s.tourStatCard}>
                <View style={s.tourStatHeader}>
                  <Text style={s.tourStatRank}>#{i + 1}</Text>
                  <Text style={s.tourStatName} numberOfLines={1}>{t.name}</Text>
                  <View style={[s.trendBadge, { backgroundColor: t.trend === "up" ? "#dcfce7" : t.trend === "down" ? "#fee2e2" : "#f1f5f9" }]}>
                    <Ionicons name={t.trend === "up" ? "trending-up" : t.trend === "down" ? "trending-down" : "remove"} size={12} color={t.trend === "up" ? "#16a34a" : t.trend === "down" ? "#dc2626" : "#94a3b8"} />
                  </View>
                </View>
                <View style={s.tourStatGrid}>
                  {[
                    { label: "Lượt xem", value: t.views.toLocaleString(), color: "#2856d6" },
                    { label: "Booking",  value: t.bookings,               color: "#16a34a" },
                    { label: "CTR",      value: `${t.conversionRate}%`,   color: "#f59e0b" },
                    { label: "Rating",   value: t.rating > 0 ? t.rating.toFixed(1) + "⭐" : "—",  color: "#a855f7" },
                  ].map((stat, j) => (
                    <View key={j} style={s.tourStatItem}>
                      <Text style={[s.tourStatValue, { color: stat.color }]}>{stat.value}</Text>
                      <Text style={s.tourStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.tourStatFooter}>
                  <Text style={s.tourStatRevLabel}>Doanh thu</Text>
                  <Text style={s.tourStatRevValue}>{fmtFull(t.revenue)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <AdminTabBar role="guide" activeRoute="/guide-analytics" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  kpiRow:          { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  kpiItem:         { alignItems: "center", flex: 1 },
  kpiValue:        { fontSize: 15, fontWeight: "900" },
  kpiLabel:        { color: "#7a8cc2", fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },
  tabRow:          { flexDirection: "row", margin: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive:    { backgroundColor: "#10b981" },
  tabBtnTxt:       { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  tabBtnTxtActive: { color: "#fff" },
  content:         { padding: 14, paddingTop: 0 },
  revenueHero:     { backgroundColor: "#10b981", borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 14 },
  revenueLabel:    { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 },
  revenueValue:    { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  revenueBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  revenueBadgeTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  metricGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  metricCard:      { width: "47%", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, alignItems: "center", gap: 4 },
  metricIcon:      { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  metricValue:     { fontSize: 20, fontWeight: "900" },
  metricLabel:     { color: "#7a8cc2", fontSize: 10, textAlign: "center" },
  changeBadge:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#dcfce7", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  changeTxt:       { color: "#16a34a", fontSize: 10, fontWeight: "700" },
  sectionTitle:    { color: "#1f2a58", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  topCard:         { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  rankBadge:       { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankTxt:         { fontWeight: "900", fontSize: 13 },
  topName:         { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  topMeta:         { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  topRevenue:      { fontWeight: "900", fontSize: 15 },
  chartCard:       { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 14 },
  barChart:        { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 160, paddingTop: 24 },
  barCol:          { alignItems: "center", flex: 1, gap: 4 },
  bar:             { width: 24, borderRadius: 6 },
  barRevLabel:     { color: "#7a8cc2", fontSize: 8, fontWeight: "600" },
  barMonth:        { color: "#1f2a58", fontSize: 10, fontWeight: "700" },
  monthlyList:     { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden" },
  monthlyRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  monthlyMonth:    { color: "#1f2a58", fontWeight: "700", width: 60 },
  monthlyBookings: { color: "#7a8cc2", fontSize: 12 },
  monthlyRevenue:  { fontWeight: "800", fontSize: 14 },
  sortChip:        { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  sortChipActive:  { backgroundColor: "#10b981", borderColor: "#10b981" },
  sortChipTxt:     { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  sortChipTxtActive:{ color: "#fff" },
  tourStatCard:    { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  tourStatHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  tourStatRank:    { color: "#94a3b8", fontWeight: "700", fontSize: 12 },
  tourStatName:    { flex: 1, color: "#1f2a58", fontWeight: "800", fontSize: 13 },
  trendBadge:      { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  tourStatGrid:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  tourStatItem:    { alignItems: "center" },
  tourStatValue:   { fontSize: 16, fontWeight: "900" },
  tourStatLabel:   { color: "#7a8cc2", fontSize: 10, marginTop: 2 },
  tourStatFooter:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  tourStatRevLabel:{ color: "#7a8cc2", fontSize: 12 },
  tourStatRevValue:{ color: "#16a34a", fontWeight: "900", fontSize: 16 },
});