/**
 * app/guest_chat_list.tsx
 * Danh sách hội thoại của Khách hàng
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import React, { useCallback, useState, useMemo } from "react";
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllChats, ChatSession } from "@/constants/chat-store";

export default function GuestChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [activeTab, setActiveTab] = useState<"guide" | "staff">("guide");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [rawStaffChats, setRawStaffChats] = useState<any[]>([]);
  const [rawGuideChats, setRawGuideChats] = useState<ChatSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const staffRaw = await AsyncStorage.getItem("@guest_staff_chats");
          setRawStaffChats(staffRaw ? JSON.parse(staffRaw) : []);

          let guestId = 'guest_temp';
          const userRaw = await AsyncStorage.getItem("@app_current_user");
          if (userRaw) guestId = JSON.parse(userRaw).accountId;

          const allChats = await getAllChats();
          // Lọc chat của đúng user hiện tại (hoặc các chat tạm chưa có owner)
          const myGuideChats = allChats.filter(c => c.guestId === guestId || !c.guestId || c.guestId === 'guest_temp');
          setRawGuideChats(myGuideChats.length > 0 ? myGuideChats : allChats);
        } catch (e) {} finally { setIsLoading(false); }
      };
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const getProcessedList = () => {
    let list = activeTab === "staff" 
      ? rawStaffChats.map(c => ({ id: c.id, title: c.staffName || "CSKH", sub: c.topic || "Hỗ trợ", lastMsg: c.lastMessage, unread: c.unread || 0, color: '#f59e0b', type: 'staff' }))
      : rawGuideChats.map(c => ({ id: c.bookingId, title: c.guideName || "HDV", sub: c.tourName || "Tour", lastMsg: c.lastMessage, unread: c.unreadGuest || 0, color: '#10b981', type: 'guide' }));
    
    if (searchQuery.trim()) list = list.filter(i => (i.title||"").toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  };

  const dataList = getProcessedList();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/"); // Khách về trang chủ nếu không có lịch sử
    }
  };

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {/* Fix bar đen của Expo Router */}
      <Stack.Screen options={{ headerShown: false }} /> 

      <View style={[s.header, { paddingTop: insets.top + Math.round(10*scale) }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={Math.round(24*scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.title}>Trung tâm Hỗ trợ</Text>
        <View style={{ width: Math.round(40*scale) }}/>
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabItem, activeTab === "guide" && s.tabItemActive_Guide]} onPress={() => setActiveTab("guide")}>
          <Ionicons name="map" size={Math.round(18*scale)} color={activeTab === "guide" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "guide" && s.tabTextActive]}>Hướng dẫn viên</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabItem, activeTab === "staff" && s.tabItemActive]} onPress={() => setActiveTab("staff")}>
          <Ionicons name="headset" size={Math.round(18*scale)} color={activeTab === "staff" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "staff" && s.tabTextActive]}>CSKH Hệ thống</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={Math.round(18*scale)} color="#94a3b8" />
          <TextInput style={s.searchInput} placeholder="Tìm kiếm tin nhắn..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#4f7cff" style={{marginTop: 50}} /> : (
        <FlatList 
          data={dataList}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          renderItem={({item}) => (
            <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/guest_chat_detail', params: { bookingId: item.id, type: item.type } } as any)}>
              <View style={[s.avatar, { backgroundColor: item.color }]}><Text style={s.avatarTxt}>{item.title.charAt(0)}</Text></View>
              <View style={{flex: 1}}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{item.sub}</Text>
                <Text style={[s.cardMsg, item.unread > 0 && { color: '#1f2a58', fontWeight: 'bold' }]} numberOfLines={1}>{item.lastMsg}</Text>
              </View>
              {item.unread > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{item.unread}</Text></View>}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f0f4f8" },
    header: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingBottom: sz(16), borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    backBtn: { padding: sz(8), backgroundColor: "#f1f5f9", borderRadius: sz(12) },
    title: { flex: 1, textAlign: 'center', fontSize: sz(18), fontWeight: "800", color: "#0f172a" },
    tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingVertical: sz(12), gap: sz(12) },
    tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(6), paddingVertical: sz(12), borderRadius: sz(14), backgroundColor: "#f1f5f9" },
    tabItemActive: { backgroundColor: "#4f7cff" },
    tabItemActive_Guide: { backgroundColor: "#10b981" },
    tabText: { fontSize: sz(14), fontWeight: "600", color: "#64748b" },
    tabTextActive: { color: "#fff" },
    searchContainer: { paddingHorizontal: sz(16), paddingTop: sz(12), paddingBottom: sz(4) },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: sz(16), paddingHorizontal: sz(14), height: sz(48), borderWidth: 1, borderColor: "#e2e8f0" },
    searchInput: { flex: 1, marginLeft: sz(10), fontSize: sz(14), color: "#0f172a" },
    list: { padding: sz(16) },
    card: { flexDirection: "row", backgroundColor: "#fff", padding: sz(14), borderRadius: sz(16), marginBottom: sz(10), alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
    avatar: { width: sz(50), height: sz(50), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    avatarTxt: { color: '#fff', fontSize: sz(20), fontWeight: 'bold' },
    cardTitle: { fontSize: sz(15), fontWeight: "700", color: "#0f172a" },
    cardSub: { fontSize: sz(12), color: "#64748b", marginBottom: sz(2) },
    cardMsg: { fontSize: sz(13), color: "#94a3b8" },
    badge: { backgroundColor: "#ef4444", borderRadius: sz(10), minWidth: sz(20), paddingHorizontal: sz(6), height: sz(20), alignItems: 'center', justifyContent: 'center' },
    badgeTxt: { color: '#fff', fontSize: sz(10), fontWeight: 'bold' }
  });
};