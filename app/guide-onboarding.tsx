/**
 * app/guide-onboarding.tsx
 * Hồ sơ & Giấy phép - Chuẩn UI/UX Xanh Royal
 * Đã FIX lỗi: Ẩn Header đen và không dùng icon cứng
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DOCS = [
  { id: "d1", name: "CCCD / Hộ chiếu", status: "approved", icon: "card-outline" },
  { id: "d2", name: "Thẻ Hướng dẫn viên", status: "pending", icon: "id-card-outline" },
  { id: "d3", name: "Chứng chỉ ngoại ngữ", status: "not_uploaded", icon: "language-outline" },
];

export default function GuideOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Ẩn thanh đen ở đầu file */}
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Hồ sơ & Giấy phép</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.statusCard}>
          <Ionicons name="time-outline" size={40} color="#f59e0b" />
          <Text style={s.statusTitle}>Đang chờ xác thực</Text>
          <Text style={s.statusDesc}>Tài khoản của bạn đang được Admin kiểm tra thông tin giấy phép.</Text>
        </View>

        <Text style={s.sectionTitle}>Danh sách chứng từ</Text>
        {DOCS.map(doc => (
          <TouchableOpacity key={doc.id} style={s.docCard}>
            <View style={s.docIcon}>
              <Ionicons name={doc.icon as any} size={24} color="#4f7cff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.docName}>{doc.name}</Text>
              <Text style={s.docSub}>Bấm để xem hoặc tải lên lại</Text>
            </View>
            <View style={[s.tag, { backgroundColor: doc.status === 'approved' ? '#d1fae5' : '#fef9c3' }]}>
              <Text style={[s.tagTxt, { color: doc.status === 'approved' ? '#059669' : '#d97706' }]}>
                {doc.status === 'approved' ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GuideTabBar activeRoute="guide-onboarding" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  statusCard: { backgroundColor: "#fff", padding: 24, borderRadius: 24, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "#e4ebff" },
  statusTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginTop: 12 },
  statusDesc: { fontSize: 13, color: "#7a8cc2", textAlign: "center", marginTop: 6, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 12 },
  docCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#e4ebff" },
  docIcon: { width: 44, height: 44, backgroundColor: "#eaf0ff", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  docSub: { fontSize: 11, color: "#94a8d8", marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagTxt: { fontSize: 10, fontWeight: "800" }
});