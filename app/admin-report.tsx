/**
 * app/admin-report.tsx
 * Hệ thống Báo cáo Đa dạng biểu đồ, Responsive Web/Mobile, Tích hợp Menu 3 chấm
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOURS, GUIDES } from "@/constants/travel-data";

const STORAGE_KEYS = {
  TOURS: "@app_tours",
  BOOKINGS_HISTORY: "@app_bookings_history", 
  GUIDES: "@app_guides",
  ACCOUNTS: "@app_accounts",
  VOUCHERS: "@admin_vouchers_advanced"
};

const generateHistoricalBookings = () => {
  const bookings: any[] = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const month = today.getMonth() - i;
    const year = today.getFullYear();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-15`;
    
    for (let j = 0; j < 15; j++) {
      const tour = TOURS[Math.floor(Math.random() * TOURS.length)];
      bookings.push({
        id: `bk-${dateStr}-${j}`,
        tourId: tour.id,
        guideId: Math.random() > 0.2 ? GUIDES[0].id : null, 
        priceRaw: parseInt(tour.price.replace(/\D/g, "")) || 0,
        date: dateStr,
        status: "confirmed",
      });
    }
  }
  return bookings;
};

const formatMoneyVND = (val: number) => val.toLocaleString("vi-VN") + "đ";

export default function AdminReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"doanhthu" | "tour" | "hdv" | "voucher">("doanhthu");
  const [activeMenuInfo, setActiveMenuInfo] = useState<{ visible: boolean; title: string }>({ visible: false, title: "" });

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyChart, setMonthlyChart] = useState<any[]>([]);
  const [categoryShares, setCategoryShares] = useState<any[]>([]);
  const [topGuides, setTopGuides] = useState<any[]>([]);
  const [voucherStats, setVoucherStats] = useState<any>({ total: 0, active: 0, usedRate: 0 });

  useFocusEffect(useCallback(() => { calculateAllReports(); }, []));

  const calculateAllReports = async () => {
    try {
      let rawTours = await AsyncStorage.getItem(STORAGE_KEYS.TOURS);
      let toursData = rawTours ? JSON.parse(rawTours) : TOURS.map(t => ({...t, priceRaw: parseInt(t.price.replace(/\D/g, "")) || 0}));
      
      let rawBookings = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS_HISTORY);
      let bookingsData = rawBookings ? JSON.parse(rawBookings) : generateHistoricalBookings();

      let rawVouchers = await AsyncStorage.getItem(STORAGE_KEYS.VOUCHERS);
      let vouchersData = rawVouchers ? JSON.parse(rawVouchers) : [];

      let currentTotalRevenue = 0;
      const catRevenueMap = new Map<string, number>();
      const guideMap = new Map<string, { name: string; rev: number }>();

      GUIDES.forEach(g => guideMap.set(g.id, { name: g.name, rev: 0 }));

      // Setup 6 tháng
      const monthlyStats: { month: string; rev: number }[] = [];
      const today = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthlyStats.unshift({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rev: 0 }); 
      }

      bookingsData.forEach((bk: any) => {
        if (bk.status === "confirmed") {
          currentTotalRevenue += bk.priceRaw;
          
          const tour = toursData.find((t:any) => t.id === bk.tourId);
          if (tour) catRevenueMap.set(tour.category, (catRevenueMap.get(tour.category) || 0) + bk.priceRaw);
          if (bk.guideId && guideMap.has(bk.guideId)) guideMap.get(bk.guideId)!.rev += bk.priceRaw;

          const mY = bk.date.substring(0, 7); 
          const mIdx = monthlyStats.findIndex(m => m.month === mY);
          if (mIdx > -1) monthlyStats[mIdx].rev += bk.priceRaw;
        }
      });

      setTotalRevenue(currentTotalRevenue);

      // Map Biểu đồ Cột 6 tháng (Đã fix Flexbox Rendering)
      setMonthlyChart(monthlyStats.map(m => {
        const mLabel = new Date(m.month + "-01").getMonth() + 1;
        let vLabel = m.rev >= 1000000000 ? (m.rev / 1000000000).toFixed(1) + "T" : (m.rev / 1000000).toFixed(0) + "Tr";
        return { month: `T${mLabel}`, value: m.rev, label: vLabel };
      }));

      // Map Biểu đồ Phân bổ (Mô phỏng Tròn)
      const colors = ["#4f7cff", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
      let cIdx = 0;
      const catArr = Array.from(catRevenueMap).map(([cat, rev]) => {
        const percent = currentTotalRevenue > 0 ? (rev / currentTotalRevenue) * 100 : 0;
        return { cat, rev, percent, color: colors[cIdx++ % colors.length] };
      }).sort((a,b) => b.rev - a.rev);
      setCategoryShares(catArr);

      // Map HDV
      const guideArr = Array.from(guideMap.values()).sort((a,b) => b.rev - a.rev).slice(0, 5);
      setTopGuides(guideArr);

      // Map Voucher
      let vUsed = 0; let vTotal = 0;
      vouchersData.forEach((v:any) => { vUsed += v.usedCount || 0; vTotal += v.usageLimit || 1; });
      setVoucherStats({ total: vouchersData.length, active: vouchersData.filter((v:any)=>v.status==="active").length, usedRate: vTotal > 0 ? (vUsed/vTotal)*100 : 0 });

      if (!rawBookings) await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS_HISTORY, JSON.stringify(bookingsData));

    } catch (e) {}
  };

  const openMenu = (title: string) => setActiveMenuInfo({ visible: true, title });

  // --- COMPONENT THẺ BIỂU ĐỒ CÓ MENU 3 CHẤM ---
  const ChartCard = ({ title, children }: { title: string, children: any }) => (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <TouchableOpacity style={styles.moreBtn} onPress={() => openMenu(title)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#7a8cc2" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hệ thống Báo cáo</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabSection}>
        {(["doanhthu", "tour", "hdv", "voucher"] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
              {tab === "doanhthu" ? "Doanh thu" : tab === "tour" ? "Tours" : tab === "hdv" ? "HDV" : "Voucher"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {activeTab === "doanhthu" && (
          <>
            <View style={styles.revenueHero}>
              <Text style={styles.revenueHeroLabel}>Tổng doanh thu hệ thống</Text>
              <Text style={styles.revenueHeroValue}>{formatMoneyVND(totalRevenue)}</Text>
            </View>

            <ChartCard title="Doanh thu 6 tháng gần nhất">
              <View style={styles.barChartWrapper}>
                {monthlyChart.map((item, index) => {
                  const maxVal = Math.max(...monthlyChart.map(m => m.value), 1000000);
                  const hPct = maxVal > 0 ? (item.value / maxVal) * 100 : 5;
                  const isLast = index === monthlyChart.length - 1;
                  return (
                    <View key={item.month} style={styles.barCol}>
                      <Text style={[styles.barVal, isLast && {color: "#4f7cff", fontWeight: "800"}]}>{item.label}</Text>
                      {/* FIX RENDER BUG: Dùng Flex-end chuẩn */}
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${hPct}%`, backgroundColor: isLast ? "#4f7cff" : "#c0cbe8" }]} />
                      </View>
                      <Text style={[styles.barMonth, isLast && {color: "#4f7cff", fontWeight: "800"}]}>{item.month}</Text>
                    </View>
                  );
                })}
              </View>
            </ChartCard>
          </>
        )}

        {activeTab === "tour" && (
          <ChartCard title="Phân bổ Doanh thu theo Hạng mục">
            <View style={styles.pieSegmentWrapper}>
              {/* Vẽ thanh ngang tỷ lệ mô phỏng Pie Chart */}
              <View style={styles.segmentedBar}>
                {categoryShares.map(c => (
                  <View key={c.cat} style={{ width: `${c.percent}%`, height: "100%", backgroundColor: c.color }} />
                ))}
              </View>
              {/* Chú thích */}
              <View style={styles.legendGrid}>
                {categoryShares.map(c => (
                  <View key={c.cat} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                    <Text style={styles.legendTxt}>{c.cat} ({c.percent.toFixed(1)}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </ChartCard>
        )}

        {activeTab === "hdv" && (
          <ChartCard title="Top Hướng Dẫn Viên Xuất Sắc">
            <View style={{ marginTop: 10 }}>
              {topGuides.map((g, idx) => (
                <View key={g.name} style={styles.listItem}>
                  <View style={styles.rankCircle}><Text style={styles.rankTxt}>{idx + 1}</Text></View>
                  <Text style={styles.listName} numberOfLines={1}>{g.name}</Text>
                  <Text style={styles.listRev}>{formatMoneyVND(g.rev)}</Text>
                </View>
              ))}
            </View>
          </ChartCard>
        )}

        {activeTab === "voucher" && (
          <ChartCard title="Tình trạng Tiêu thụ Voucher">
            <View style={styles.statBoxesRow}>
              <View style={styles.statBoxLite}>
                <Text style={styles.statBoxNum}>{voucherStats.total}</Text>
                <Text style={styles.statBoxLabel}>Mã phát hành</Text>
              </View>
              <View style={styles.statBoxLite}>
                <Text style={styles.statBoxNum}>{voucherStats.active}</Text>
                <Text style={styles.statBoxLabel}>Đang chạy</Text>
              </View>
            </View>
            
            <Text style={{ fontSize: 13, color: "#1f2a58", fontWeight: "700", marginTop: 20, marginBottom: 8 }}>Tỷ lệ sử dụng toàn hệ thống</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${voucherStats.usedRate}%`, backgroundColor: "#f59e0b" }]} />
            </View>
            <Text style={{ textAlign: "right", fontSize: 12, color: "#7a8cc2", marginTop: 4 }}>{voucherStats.usedRate.toFixed(1)}% Đã dùng</Text>
          </ChartCard>
        )}

      </ScrollView>

      {/* MODAL MENU 3 CHẤM (PINTEREST STYLE) */}
      <Modal visible={activeMenuInfo.visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActiveMenuInfo({ visible: false, title: "" })}>
          <View style={styles.popoverOverlay}>
            <View style={styles.popoverBox}>
              <Text style={styles.popoverTitle} numberOfLines={1}>{activeMenuInfo.title}</Text>
              <View style={styles.popoverDivider} />
              
              <TouchableOpacity style={styles.popoverItem} onPress={() => setActiveMenuInfo({ visible: false, title: "" })}>
                <View style={[styles.popoverIconWrap, { backgroundColor: "#eaf0ff" }]}><Ionicons name="eye" size={20} color="#4f7cff" /></View>
                <Text style={styles.popoverItemTxt}>Xem chi tiết toàn màn hình</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.popoverItem} onPress={() => setActiveMenuInfo({ visible: false, title: "" })}>
                <View style={[styles.popoverIconWrap, { backgroundColor: "#d1fae5" }]}><Ionicons name="download" size={20} color="#10b981" /></View>
                <Text style={styles.popoverItemTxt}>Tải xuống dữ liệu (.CSV)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.popoverItem} onPress={() => setActiveMenuInfo({ visible: false, title: "" })}>
                <View style={[styles.popoverIconWrap, { backgroundColor: "#fef3c7" }]}><Ionicons name="options" size={20} color="#d97706" /></View>
                <Text style={styles.popoverItemTxt}>Tùy chỉnh thông số hiển thị</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-report" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  tabSection: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 6, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: "#eaf0ff" },
  tabTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "700" },
  tabTxtActive: { color: "#4f7cff" },

  content: { padding: 16, paddingBottom: 100 },
  
  revenueHero: { alignItems: "center", backgroundColor: "#1f2a58", borderRadius: 20, paddingVertical: 30, marginBottom: 20, elevation: 6 },
  revenueHeroLabel: { color: "#94a8d8", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  revenueHeroValue: { color: "#10b981", fontSize: 36, fontWeight: "900" },

  chartCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e4ebff" },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", flex: 1 },
  moreBtn: { padding: 4 },

  // Fix Bar Chart Responsive Flexbox
  barChartWrapper: { flexDirection: "row", justifyContent: "space-between", height: 200, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center" },
  barTrack: { height: 140, width: "50%", maxWidth: 30, backgroundColor: "#f0f4ff", borderRadius: 8, marginVertical: 8, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 8 },
  barVal: { fontSize: 10, color: "#7a8cc2", fontWeight: "700" },
  barMonth: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" },

  // Horizontal Segmented Bar (Pie Simulation)
  pieSegmentWrapper: { marginTop: 10 },
  segmentedBar: { height: 24, borderRadius: 12, flexDirection: "row", overflow: "hidden", marginBottom: 20 },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", width: "45%" },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendTxt: { fontSize: 12, color: "#1f2a58", fontWeight: "600" },

  // List Layout
  listItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  rankCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  rankTxt: { color: "#4f7cff", fontWeight: "900", fontSize: 14 },
  listName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  listRev: { fontSize: 14, fontWeight: "800", color: "#10b981" },

  // Progress Bar Layout
  statBoxesRow: { flexDirection: "row", gap: 12 },
  statBoxLite: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  statBoxNum: { fontSize: 24, fontWeight: "900", color: "#4f7cff", marginBottom: 4 },
  statBoxLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  progressTrack: { height: 10, backgroundColor: "#f0f4ff", borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },

  // POPUP PINTEREST STYLE
  popoverOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  popoverBox: { width: "100%", maxWidth: 340, backgroundColor: "#fff", borderRadius: 24, padding: 20, elevation: 10 },
  popoverTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", textAlign: "center" },
  popoverDivider: { height: 1, backgroundColor: "#f0f4ff", marginVertical: 16 },
  popoverItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  popoverIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  popoverItemTxt: { fontSize: 15, color: "#1f2a58", fontWeight: "600" }
});