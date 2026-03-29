/**
 * app/guide_chat_list.tsx
 * Danh sách Chat dành cho Hướng dẫn viên
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatSession, getAllChats } from "@/constants/chat-store";

export default function GuideChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          let currentGuideId = "";
          let currentAccId = "";
          const rawUser = await AsyncStorage.getItem("@app_current_user");
          const rawProfile = await AsyncStorage.getItem("@guide_profile");
          
          if (rawUser) currentAccId = JSON.parse(rawUser).accountId || "";
          if (rawProfile) currentGuideId = JSON.parse(rawProfile).guideId || "";

          const allChats = await getAllChats();
          
          let myChats = allChats.filter(c => c.guideId === currentGuideId || c.guideId === currentAccId);
          if (myChats.length === 0) myChats = allChats;

          setSessions(myChats);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/guide-home"); // HDV về trang chủ HDV
    }
  };

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Tin nhắn của Khách</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#10b981" /></View>
      : sessions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={60} color="#cbd5e1" style={{ marginBottom: 10 }}/>
          <Text style={{ color: '#7a8cc2', fontSize: 16, fontWeight: '600' }}>Chưa có tin nhắn nào</Text>
        </View>
      ) : (
        <FlatList data={sessions} keyExtractor={(item) => item.id} contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.chatCard, item.unreadGuide > 0 && { backgroundColor: '#f0fdf4', borderColor: '#a7f3d0' }]} 
              onPress={() => router.push({ pathname: '/guide_chat_detail', params: { bookingId: item.bookingId } } as any)}>
              <View style={[s.avatar, { backgroundColor: '#10b981' }]}><Text style={s.avatarTxt}>{item.guestName.charAt(0)}</Text></View>
              <View style={s.chatInfo}>
                <View style={s.chatHeader}><Text style={s.guestName}>{item.guestName}</Text><Text style={[s.timeTxt, item.unreadGuide > 0 && { color: '#10b981', fontWeight: 'bold' }]}>{item.lastTime}</Text></View>
                <Text style={s.tourName} numberOfLines={1}>{item.tourName}</Text>
                <Text style={[s.lastMsg, item.unreadGuide > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              {item.unreadGuide > 0 && <View style={s.unreadBadge}><Text style={s.unreadTxt}>{item.unreadGuide}</Text></View>}
            </TouchableOpacity>
          )}
        />
      )}
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
  tourName: { fontSize: 12, color: "#10b981", fontWeight: "600", marginBottom: 2 },
  lastMsg: { fontSize: 13, color: "#64748b" },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadTxt: { color: "#fff", fontSize: 10, fontWeight: "800" }
});