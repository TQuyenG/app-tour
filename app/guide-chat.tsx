/**
 * app/guide-chat.tsx
 * Chat với khách - Giao diện Xanh Royal, Tích hợp GuideTabBar
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SEED_SESSIONS = [
  { id: "c1", guestName: "Trần Thị B", tourName: "Tour Núi Bà Đen", lastMessage: "Chúng tôi xuất phát lúc 6h sáng nhé!", lastTime: "08:30", unread: 2, avatarColor: "#4f7cff" },
  { id: "c2", guestName: "Lê Văn C", tourName: "Tour Đà Lạt 2N1Đ", lastMessage: "Cảm ơn anh Khoa rất nhiều.", lastTime: "Hôm qua", unread: 0, avatarColor: "#10b981" },
];

export default function GuideChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions] = useState(SEED_SESSIONS);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tin nhắn</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.chatCard} onPress={() => {}}>
            <View style={[s.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={s.avatarTxt}>{item.guestName.charAt(0)}</Text>
            </View>
            <View style={s.chatInfo}>
              <View style={s.chatHeader}>
                <Text style={s.guestName}>{item.guestName}</Text>
                <Text style={s.timeTxt}>{item.lastTime}</Text>
              </View>
              <Text style={s.tourName} numberOfLines={1}>{item.tourName}</Text>
              <Text style={s.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadTxt}>{item.unread}</Text></View>}
          </TouchableOpacity>
        )}
      />

      <GuideTabBar activeRoute="guide-chat" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  chatCard: { flexDirection: "row", backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#e4ebff" },
  avatar: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "800" },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  guestName: { fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  timeTxt: { fontSize: 11, color: "#7a8cc2" },
  tourName: { fontSize: 12, color: "#4f7cff", fontWeight: "600", marginBottom: 2 },
  lastMsg: { fontSize: 13, color: "#64748b" },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadTxt: { color: "#fff", fontSize: 10, fontWeight: "800" }
});