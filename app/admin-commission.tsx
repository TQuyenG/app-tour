/**
 * app/admin-commission.tsx
 * Admin cấu hình tỉ lệ hoa hồng hệ thống - ĐÃ NÂNG CẤP DỮ LIỆU THẬT
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CommissionRule {
  id: string; category: string; icon: any; rate: number; minRate: number; maxRate: number; color: string;
}

interface CalculatedRule extends CommissionRule {
  totalEarned: number; bookingCount: number; totalRevenue: number;
}

// Cấu hình mặc định nếu Admin chưa từng cài đặt
const SEED_RULES: CommissionRule[] = [
  { id: "c1", category: "Biển đảo", icon: "water-outline", rate: 15, minRate: 5, maxRate: 30, color: "#3b82f6" },
  { id: "c2", category: "Vùng núi", icon: "image-outline", rate: 12, minRate: 5, maxRate: 30, color: "#10b981" },
  { id: "c3", category: "Văn hóa", icon: "library-outline", rate: 10, minRate: 5, maxRate: 30, color: "#f59e0b" },
  { id: "c4", category: "Sinh thái", icon: "leaf-outline", rate: 14, minRate: 5, maxRate: 30, color: "#84cc16" },
  { id: "c5", category: "Mạo hiểm", icon: "flame-outline", rate: 20, minRate: 5, maxRate: 30, color: "#ef4444" },
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

  // --- HÀM TÍNH TOÁN DỮ LIỆU THẬT TỪ CÁC ĐƠN ĐÃ HOÀN THÀNH ---
  const loadAndCalculate = async () => {
    try {
      // 1. Lấy danh sách tỉ lệ hoa hồng hiện tại
      const rawRules = await AsyncStorage.getItem("@admin_commissions");
      let activeRules: CommissionRule[] = rawRules ? JSON.parse(rawRules) : SEED_RULES;
      if (!rawRules) await AsyncStorage.setItem("@admin_commissions", JSON.stringify(SEED_RULES));

      // 2. Lấy dữ liệu đơn đặt tour THẬT của khách hàng
      const rawBookings = await AsyncStorage.getItem("@guest_bookings");
      const bookings = rawBookings ? JSON.parse(rawBookings) : [];
      
      // Chỉ tính doanh thu từ các tour ĐÃ HOÀN THÀNH
      const completedBookings = bookings.filter((b: any) => b.status === 'completed');

      let totalComm = 0;
      
      // 3. Khớp dữ liệu doanh thu vào từng danh mục hoa hồng
      const processed: CalculatedRule[] = activeRules.map((rule) => {
        const categoryBookings = completedBookings.filter((b: any) => b.category === rule.category);
        
        // Tổng tiền thu được từ danh mục này
        const revenue = categoryBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
        
        // Hoa hồng Admin được hưởng (dựa trên tỉ lệ % của danh mục)
        const earned = (revenue * rule.rate) / 100;
        
        totalComm += earned;

        return {
          ...rule, 
          totalRevenue: revenue, 
          totalEarned: earned,
          bookingCount: categoryBookings.length,
        };
      });

      setCalculatedRules(processed);
      setTotalSystemCommission(totalComm);
    } catch (e) {
      console.log("Lỗi tải dữ liệu hoa hồng:", e);
    }
  };

  // --- HÀM TĂNG/GIẢM TỈ LỆ HOA HỒNG (Lưu ngay lập tức) ---
  const adjustRate = async (id: string, delta: number) => {
    try {
      const rawRules = await AsyncStorage.getItem("@admin_commissions");
      let rules: CommissionRule[] = rawRules ? JSON.parse(rawRules) : SEED_RULES;
      
      const index = rules.findIndex(r => r.id === id);
      if (index === -1) return;

      const newRate = rules[index].rate + delta;
      
      // Kiểm tra giới hạn Min/Max
      if (newRate >= rules[index].minRate && newRate <= rules[index].maxRate) {
        rules[index].rate = newRate;
        await AsyncStorage.setItem("@admin_commissions", JSON.stringify(rules));
        
        // Cập nhật lại UI và tính toán lại doanh thu dựa trên tỉ lệ mới
        loadAndCalculate(); 
      } else {
        setConfirmPopup({ 
          visible: true, 
          type: "error", 
          title: "Đạt giới hạn", 
          message: `Tỉ lệ hoa hồng cho "${rules[index].category}" chỉ được phép từ ${rules[index].minRate}% đến ${rules[index].maxRate}%.` 
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const formatVND = (val: number) => (val || 0).toLocaleString("vi-VN") + "đ";

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
          <Text style={styles.summaryLabel}>Tổng hoa hồng thực tế thu được</Text>
          <Text style={styles.summaryValue}>{formatVND(totalSystemCommission)}</Text>
          <View style={styles.summaryMetaRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.summaryMeta}>Tự động tính từ các tour đã hoàn thành</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quản lý tỉ lệ theo danh mục</Text>
        
        {calculatedRules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.iconBox, { backgroundColor: rule.color + "20" }]}>
                <Ionicons name={rule.icon} size={20} color={rule.color} />
              </View>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleCategory}>{rule.category}</Text>
                <Text style={styles.ruleSub}>Đã bán: {rule.bookingCount} tour</Text>
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
                <Text style={styles.statValueRaw}>{formatVND(rule.totalRevenue)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Hoa hồng Admin nhận</Text>
                <Text style={styles.statValueEarned}>{formatVND(rule.totalEarned)}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Popup thông báo lỗi/thành công */}
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
  summaryValue: { color: "#10b981", fontSize: 32, fontWeight: "900", marginBottom: 12 },
  summaryMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  summaryMeta: { color: "#fff", fontSize: 12, fontWeight: "600" },
  
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 14, marginLeft: 4 },
  ruleCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
  ruleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ruleInfo: { flex: 1, marginLeft: 12 },
  ruleCategory: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  ruleSub: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" },
  
  rateControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", padding: 4 },
  controlBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 1 },
  rateValue: { width: 44, textAlign: "center", fontSize: 16, fontWeight: "900", color: "#4f7cff" },
  
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#f1f5f9" },
  statBox: { flex: 1 },
  statLabel: { fontSize: 11, color: "#7a8cc2", fontWeight: "600", marginBottom: 4 },
  statValueRaw: { fontSize: 14, color: "#1f2a58", fontWeight: "800" },
  statValueEarned: { fontSize: 15, color: "#10b981", fontWeight: "900" },
  divider: { width: 1, height: 30, backgroundColor: "#e2e8f0", marginHorizontal: 12 },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});