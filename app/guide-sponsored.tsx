/**
 * app/guide-sponsored.tsx
 * Quảng cáo Sponsored - Giao diện Premium, Xanh Royal
 * Đã FIX lỗi: Expected corresponding JSX closing tag for 'View'
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideSponsored() {
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
        <Text style={s.headerTitle}>Gói Sponsored</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Đã sửa thẻ đóng tại đây */}
        <View style={s.premiumCard}>
          <Text style={s.premiumLabel}>Tăng 5x lượt tiếp cận</Text>
          <Text style={s.premiumTitle}>LocalMate Sponsored</Text>
          <Text style={s.premiumDesc}>Đẩy tour của bạn lên vị trí đầu tiên trong kết quả tìm kiếm.</Text>
        </View>

        <Text style={s.sectionTitle}>Các gói hiện có</Text>
        {["Gói tuần (199k)", "Gói tháng (599k)"].map(pkg => (
          <View key={pkg} style={s.pkgCard}>
            <Text style={s.pkgName}>{pkg}</Text>
            <TouchableOpacity style={s.buyBtn}>
              <Text style={s.buyBtnTxt}>Mua ngay</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <GuideTabBar activeRoute="guide-sponsored" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  premiumCard: { backgroundColor: "#1f2a58", padding: 24, borderRadius: 24, elevation: 8 },
  premiumLabel: { color: "#10b981", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  premiumTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginVertical: 8 },
  premiumDesc: { color: "#94a8d8", fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginTop: 24, marginBottom: 12 },
  pkgCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  pkgName: { fontSize: 15, fontWeight: "700", color: "#1f2a58" },
  buyBtn: { backgroundColor: "#4f7cff", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  buyBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 }
});