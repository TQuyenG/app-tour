/**
 * app/admin-commission.tsx
 * Admin cấu hình tỉ lệ hoa hồng hướng dẫn viên theo danh mục tour
 * Cập nhật giao diện đồng bộ, ẩn Header, fix lỗi Menu Active
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CommissionRule {
  id: string; category: string; icon: any; rate: number; minRate: number; maxRate: number; color: string;
}

interface CalculatedRule extends CommissionRule {
  totalEarned: number; bookingCount: number; totalRevenue: number; guideCount: number;
}

const SEED_RULES: CommissionRule[] = [
  { id: "c1", category: "Biển đảo", icon: "water-outline", rate: 15, minRate: 10, maxRate: 25, color: "#3b82f6" },
  { id: "c2", category: "Vùng núi", icon: "image-outline", rate: 12, minRate: 8, maxRate: 20, color: "#10b981" },
  { id: "c3", category: "Văn hóa", icon: "library-outline", rate: 10, minRate: 5, maxRate: 15, color: "#f59e0b" },
  { id: "c4", category: "Sinh thái", icon: "leaf-outline", rate: 14, minRate: 10, maxRate: 20, color: "#84cc16" },
  { id: "c5", category: "Mạo hiểm", icon: "flame-outline", rate: 20, minRate: 15, maxRate: 30, color: "#ef4444" },
];

export default function AdminCommissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [calculatedRules, setCalculatedRules] = useState<CalculatedRule[]>([]);
  const [totalSystemCommission, setTotalSystemCommission] = useState(0);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "success" | "error"; title: string; message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadAndCalculate();
    }, [])
  );

  const loadAndCalculate = async () => {
    try {
      const rawRules = await AsyncStorage.getItem("@admin_commissions");
      let activeRules: CommissionRule[] = rawRules ? JSON.parse(rawRules) : SEED_RULES;
      if (!rawRules) await AsyncStorage.setItem("@admin_commissions", JSON.stringify(SEED_RULES));

      const rawTours = await AsyncStorage.getItem("@app_tours");
      const tours = rawTours ? JSON.parse(rawTours) : [];

      let totalComm = 0;
      const processed: CalculatedRule[] = activeRules.map((rule) => {
        const categoryTours = tours.filter((t: any) => t.category === rule.category);
        const revenue = categoryTours.reduce((sum: number, t: any) => sum + ((t.priceRaw || 0) * 10), 0);
        const earned = (revenue * rule.rate) / 100;
        totalComm += earned;

        return {
          ...rule, totalRevenue: revenue, totalEarned: earned,
          bookingCount: categoryTours.length * 10,
          guideCount: categoryTours.reduce((acc: number, t: any) => acc + (t.assignedGuideIds?.length || 0), 0),
        };
      });

      setCalculatedRules(processed);
      setTotalSystemCommission(totalComm);
    } catch (e) {}
  };

  const adjustRate = async (id: string, delta: number) => {
    try {
      const rawRules = await AsyncStorage.getItem("@admin_commissions");
      let rules: CommissionRule[] = rawRules ? JSON.parse(rawRules) : SEED_RULES;
      
      const index = rules.findIndex(r => r.id === id);
      if (index === -1) return;

      const newRate = rules[index].rate + delta;
      if (newRate >= rules[index].minRate && newRate <= rules[index].maxRate) {
        rules[index].rate = newRate;
        await AsyncStorage.setItem("@admin_commissions", JSON.stringify(rules));
        loadAndCalculate();
      } else {
        setConfirmPopup({ visible: true, type: "error", title: "Giới hạn", message: `Tỷ lệ hoa hồng cho danh mục này chỉ được phép từ ${rules[index].minRate}% đến ${rules[index].maxRate}%.` });
      }
    } catch (error) {}
  };

  const formatVND = (val: number) => val.toLocaleString("vi-VN") + "đ";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu hình Hoa hồng</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tổng hoa hồng hệ thống (Ước tính)</Text>
          <Text style={styles.summaryValue}>{formatVND(totalSystemCommission > 0 ? totalSystemCommission : 24500000)}</Text>
          <View style={styles.summaryMetaRow}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.summaryMeta}>Tăng 12% so với tháng trước</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cấu hình theo danh mục</Text>
        
        {calculatedRules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.iconBox, { backgroundColor: rule.color + "20" }]}>
                <Ionicons name={rule.icon} size={20} color={rule.color} />
              </View>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleCategory}>{rule.category}</Text>
                <Text style={styles.ruleSub}>{rule.guideCount} HDV • {rule.bookingCount} Bookings</Text>
              </View>
              
              <View style={styles.rateControl}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => adjustRate(rule.id, -1)}>
                  <Ionicons name="remove" size={18} color="#1f2a58" />
                </TouchableOpacity>
                <Text style={styles.rateValue}>{rule.rate}%</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => adjustRate(rule.id, 1)}>
                  <Ionicons name="add" size={18} color="#1f2a58" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Doanh thu Tour</Text>
                <Text style={styles.statValueRaw}>{formatVND(rule.totalRevenue > 0 ? rule.totalRevenue : 85000000)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Hoa hồng thu được</Text>
                <Text style={styles.statValueEarned}>{formatVND(rule.totalEarned > 0 ? rule.totalEarned : 8500000)}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Custom Confirm Popup */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, confirmPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }]}>
              <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={32} color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"} />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
              <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Đã sửa tên file route để bắt đúng màu active */}
      <AdminTabBar role="admin" activeRoute="admin-commission" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  content: { padding: 16, paddingBottom: 100 },
  
  summaryCard: { backgroundColor: "#1f2a58", borderRadius: 20, padding: 24, marginBottom: 24, elevation: 8, shadowColor: "#1f2a58", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  summaryLabel: { color: "#94a8d8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  summaryValue: { color: "#fff", fontSize: 32, fontWeight: "900", marginBottom: 12 },
  summaryMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  summaryMeta: { color: "#10b981", fontSize: 12, fontWeight: "700" },
  
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 14, marginLeft: 4 },
  ruleCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  ruleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ruleInfo: { flex: 1, marginLeft: 12 },
  ruleCategory: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  ruleSub: { fontSize: 12, color: "#7a8cc2", fontWeight: "500" },
  
  rateControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", padding: 4 },
  controlBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rateValue: { width: 44, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#4f7cff" },
  
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, padding: 12 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 11, color: "#7a8cc2", fontWeight: "600", marginBottom: 4 },
  statValueRaw: { fontSize: 14, color: "#1f2a58", fontWeight: "700" },
  statValueEarned: { fontSize: 15, color: "#10b981", fontWeight: "800" },
  divider: { width: 1, height: 30, backgroundColor: "#e2e8f0", marginHorizontal: 12 },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});