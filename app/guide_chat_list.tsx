/**
 * app/guide_chat_list.tsx
 * Danh sách Chat dành cho Hướng dẫn viên (Thêm Tab CSKH)
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatSession, getAllChats, SupportSession, getAllSupportChats } from "@/constants/chat-store";

export default function GuideChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<"guest" | "staff">("guest");
  const [guestChats, setGuestChats] = useState<ChatSession[]>([]);
  const [staffChats, setStaffChats] = useState<SupportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGuideId, setCurrentGuideId] = useState("");

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          let guideId = "";
          const userRaw = await AsyncStorage.getItem("@app_current_user");
          if (userRaw) guideId = JSON.parse(userRaw).accountId || "";
          setCurrentGuideId(guideId);

          // 1. Tải Chat Khách - HDV
          const allChats = await getAllChats();
          const myChats = allChats.filter(c => c.guideId === guideId);
          setGuestChats(myChats.length > 0 ? myChats : allChats);

          // 2. Tải Chat CSKH (Staff)
          const supportChats = await getAllSupportChats();
          setStaffChats(supportChats.filter(c => c.userId === guideId));

        } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const getProcessedList = () => {
    let list: any[] = [];
    if (activeTab === "staff") {
      list = staffChats.map(c => ({ id: c.userId, title: "Tổng đài CSKH", sub: "Hỗ trợ Hệ thống", lastMsg: c.lastMessage, unread: c.unreadUser || 0, color: '#f59e0b', type: 'staff' }));
      if (list.length === 0) {
        list = [{ id: currentGuideId, title: "Tổng đài CSKH", sub: "Hỗ trợ dành riêng cho HDV", lastMsg: "Chạm để nhắn tin với nhân viên", unread: 0, color: '#f59e0b', type: 'staff' }];
      }
    } else {
      list = guestChats.map(c => ({ id: c.bookingId, title: c.guestName || "Khách", sub: c.tourName || "Tour", lastMsg: c.lastMessage, unread: c.unreadGuide || 0, color: '#10b981', type: 'guest' }));
    }
    return list;
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/guide-home");
  };

  const dataList = getProcessedList();

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Hộp thư đến</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabItem, activeTab === "guest" && s.tabItemActive_Guest]} onPress={() => setActiveTab("guest")}>
          <Ionicons name="people" size={18} color={activeTab === "guest" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "guest" && s.tabTextActive]}>Khách hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabItem, activeTab === "staff" && s.tabItemActive_Staff]} onPress={() => setActiveTab("staff")}>
          <Ionicons name="headset" size={18} color={activeTab === "staff" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "staff" && s.tabTextActive]}>CSKH Hệ thống</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#10b981" /></View>
      : dataList.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={60} color="#cbd5e1" style={{ marginBottom: 10 }}/>
          <Text style={{ color: '#7a8cc2', fontSize: 16, fontWeight: '600' }}>Chưa có tin nhắn nào</Text>
        </View>
      ) : (
        <FlatList data={dataList} keyExtractor={(item) => item.id} contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.chatCard, item.unread > 0 && { backgroundColor: '#f0fdf4', borderColor: '#a7f3d0' }]} 
              onPress={() => router.push({ pathname: '/guide_chat_detail', params: { bookingId: item.id, type: item.type } } as any)}>
              <View style={[s.avatar, { backgroundColor: item.color }]}><Text style={s.avatarTxt}>{item.title.charAt(0)}</Text></View>
              <View style={s.chatInfo}>
                <View style={s.chatHeader}><Text style={s.guestName}>{item.title}</Text></View>
                <Text style={s.tourName} numberOfLines={1}>{item.sub}</Text>
                <Text style={[s.lastMsg, item.unread > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{item.lastMsg}</Text>
              </View>
              {item.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadTxt}>{item.unread}</Text></View>}
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
  
  tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: "#f1f5f9" },
  tabItemActive_Guest: { backgroundColor: "#10b981" },
  tabItemActive_Staff: { backgroundColor: "#f59e0b" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#fff" },

  list: { padding: 16, paddingBottom: 100 },
  chatCard: { flexDirection: "row", backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#e4ebff" },
  avatar: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "800" },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  guestName: { fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  tourName: { fontSize: 12, color: "#64748b", fontWeight: "600", marginBottom: 2 },
  lastMsg: { fontSize: 13, color: "#94a8d8" },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadTxt: { color: "#fff", fontSize: 10, fontWeight: "800" }
});