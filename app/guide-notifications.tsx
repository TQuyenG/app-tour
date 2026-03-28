/**
 * app/guide-notifications.tsx
 * Thông báo HDV - Giao diện Clean UI, Bỏ thanh đen
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NOTIFS = [
  { id: "1", title: "Booking mới", body: "Bạn có lịch dẫn mới vào 25/03/2026.", time: "1 giờ trước", read: false },
  { id: "2", title: "Thanh toán", body: "Thu nhập Tour Đà Lạt đã được chuyển.", time: "Hôm qua", read: true },
];

export default function GuideNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState(NOTIFS);
  const [confirmModal, setConfirmModal] = useState({ visible: false, id: "" });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={() => setNotifs([])}><Text style={s.clearTxt}>Xóa hết</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {notifs.map(n => (
          <View key={n.id} style={[s.card, !n.read && s.unreadCard]}>
            <View style={s.cardBody}>
              <Text style={[s.notifTitle, !n.read && s.unreadTitle]}>{n.title}</Text>
              <Text style={s.notifBody}>{n.body}</Text>
              <Text style={s.notifTime}>{n.time}</Text>
            </View>
            {!n.read && <View style={s.dot} />}
          </View>
        ))}
      </ScrollView>

      <GuideTabBar activeRoute="guide-notifications" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  clearTxt: { color: "#ef4444", fontSize: 13, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e4ebff" },
  unreadCard: { borderColor: "#4f7cff", backgroundColor: "#f0f4ff" },
  cardBody: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: "700", color: "#64748b", marginBottom: 4 },
  unreadTitle: { color: "#1f2a58" },
  notifBody: { fontSize: 13, color: "#7a8cc2", lineHeight: 18 },
  notifTime: { fontSize: 11, color: "#94a8d8", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4f7cff", marginLeft: 10 }
});