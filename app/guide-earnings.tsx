/**
 * app/guide-earnings.tsx
 * Thu nhập HDV - Giao diện Tài chính chuyên nghiệp, Đồng bộ hàm đọc tiền
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hàm đọc tiền chuẩn (Giống Admin)
const docTien = (n: number) => n.toLocaleString("vi-VN") + " đồng";

export default function GuideEarnings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [total] = useState(5400000);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ví thu nhập</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Số dư khả dụng</Text>
          <Text style={s.balanceVal}>{total.toLocaleString("vi-VN")}đ</Text>
          <Text style={s.balanceWords}>{docTien(total)}</Text>
          <TouchableOpacity style={s.withdrawBtn}><Text style={s.withdrawTxt}>Rút tiền về ngân hàng</Text></TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Lịch sử giao dịch</Text>
        {[
          { id: "1", tour: "Tour Đà Lạt", amount: "+2.800.000đ", date: "22/03/2026" },
          { id: "2", tour: "Tour Núi Bà Đen", amount: "+1.200.000đ", date: "15/03/2026" },
        ].map(item => (
          <View key={item.id} style={s.txCard}>
            <View style={s.txIcon}><Ionicons name="cash" size={20} color="#10b981" /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.txTitle}>{item.tour}</Text>
              <Text style={s.txDate}>{item.date}</Text>
            </View>
            <Text style={s.txAmount}>{item.amount}</Text>
          </View>
        ))}
      </ScrollView>

      <GuideTabBar activeRoute="guide-earnings" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  balanceCard: { backgroundColor: "#1f2a58", padding: 24, borderRadius: 24, alignItems: "center", elevation: 8 },
  balanceLabel: { color: "#94a8d8", fontSize: 13, marginBottom: 8 },
  balanceVal: { color: "#10b981", fontSize: 32, fontWeight: "900" },
  balanceWords: { color: "#fff", fontSize: 12, fontStyle: "italic", marginTop: 4, opacity: 0.8 },
  withdrawBtn: { marginTop: 20, backgroundColor: "#4f7cff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  withdrawTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginTop: 24, marginBottom: 12 },
  txCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  txIcon: { width: 40, height: 40, backgroundColor: "#d1fae5", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txTitle: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  txDate: { fontSize: 12, color: "#7a8cc2" },
  txAmount: { fontSize: 15, fontWeight: "800", color: "#10b981" }
});