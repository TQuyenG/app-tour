/**
 * app/guide-analytics.tsx
 * Analytics HDV - Giao diện thẻ Thống kê mượt mà, Bỏ thanh đen
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideAnalytics() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thống kê hiệu quả</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.grid}>
          {[
            { label: "Lượt xem hồ sơ", val: "1.243", icon: "eye", color: "#4f7cff", bg: "#eaf0ff" },
            { label: "Tỷ lệ chốt đơn", val: "8.5%", icon: "cart", color: "#10b981", bg: "#dcfce7" },
            { label: "Đánh giá trung bình", val: "4.9", icon: "star", color: "#f59e0b", bg: "#fef3c7" },
            { label: "Tổng số khách dẫn", val: "452", icon: "people", color: "#8b5cf6", bg: "#ede9fe" },
          ].map((item, i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.iconBox, { backgroundColor: item.bg }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
              <Text style={s.statVal}>{item.val}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <GuideTabBar activeRoute="guide-analytics" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: { width: "48%", backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statVal: { fontSize: 20, fontWeight: "900", color: "#1f2a58", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#7a8cc2", fontWeight: "600" }
});