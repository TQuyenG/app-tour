/**
 * app/guide-reviews.tsx
 * Đánh giá của khách - Giao diện thẻ Tag, Bỏ thanh đen
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideReviews() {
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
        <Text style={s.headerTitle}>Đánh giá & Phản hồi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {[1, 2, 3].map(i => (
          <View key={i} style={s.reviewCard}>
            <View style={s.cardTop}>
              <Text style={s.guestName}>Nguyễn Văn {i}</Text>
              <View style={s.stars}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={s.starTxt}>5.0</Text>
              </View>
            </View>
            <Text style={s.tourLabel}>Tour Đà Lạt 3N2Đ</Text>
            <Text style={s.comment}>"HDV rất nhiệt tình, am hiểu kiến thức địa phương. Sẽ quay lại!"</Text>
            <TouchableOpacity style={s.replyBtn}><Text style={s.replyTxt}>Phản hồi khách hàng</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <GuideTabBar activeRoute="guide-reviews" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  reviewCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  guestName: { fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  stars: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  starTxt: { fontSize: 12, fontWeight: "700", color: "#d97706" },
  tourLabel: { fontSize: 12, color: "#4f7cff", fontWeight: "600", marginBottom: 8 },
  comment: { fontSize: 14, color: "#64748b", lineHeight: 20 },
  replyBtn: { marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  replyTxt: { color: "#4f7cff", fontSize: 13, fontWeight: "700" }
});