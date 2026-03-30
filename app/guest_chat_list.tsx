/**
 * app/guest_chat_list.tsx
 * Danh sách hội thoại của Khách hàng - ĐÃ FIX TRỰC TIẾP LỖI MẤT KÊNH CSKH
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; 
import { useFocusEffect, useRouter, Stack } from "expo-router";
import React, { useCallback, useState, useMemo } from "react";
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [rawGuideChats, setRawGuideChats] = useState<any[]>([]);
  const [currentGuestId, setCurrentGuestId] = useState("");

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        const rawUser = await AsyncStorage.getItem('@app_current_user');
        const user = rawUser ? JSON.parse(rawUser) : null;
        const myId = user?.accountId || "";
        setCurrentGuestId(myId);

        if (myId) {
          // 1. TẢI CHAT VỚI HDV (TỪ @app_chats)
          try {
             const cRaw = await AsyncStorage.getItem('@app_chats');
             if (cRaw) {
               const parsed = JSON.parse(cRaw);
               setRawGuideChats(parsed.filter((c: any) => c.guestId === myId || c.accountId === myId));
             }
          } catch(e) {}

          // 2. TẢI CHAT VỚI STAFF CSKH (TỪ @staff_chats_v3)
          try {
             const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
             let sChats = [];
             if (sRaw) {
               const parsed = JSON.parse(sRaw);
               sChats = parsed.filter((c: any) => c.guestId === myId || c.userId === myId || c.id === `support_${myId}`);
             }

             // FIX: Luôn luôn tạo sẵn 1 kênh CSKH để khách tự do nhắn tin nếu chưa có
             if (sChats.length === 0) {
               sChats = [{
                  id: `support_${myId}`,
                  roomName: "Trung tâm CSKH LocalMate",
                  guestId: myId,
                  guestName: user?.name || "Khách hàng",
                  lastMsg: "Xin chào! LocalMate có thể hỗ trợ gì cho bạn?",
                  updatedAt: new Date().toISOString(),
                  unreadCount: 0
               }];
             }
             setRawStaffChats(sChats);
          } catch(e) {}
        }
        setIsLoading(false);
      };
      fetchData();
    }, [])
  );

  const filteredData = useMemo(() => {
    const list = activeTab === "guide" ? rawGuideChats : rawStaffChats;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c: any) => 
      (c.roomName || c.guideName || "Hỗ trợ").toLowerCase().includes(q) || 
      (c.lastMsg || "").toLowerCase().includes(q)
    );
  }, [activeTab, rawGuideChats, rawStaffChats, searchQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const isStaff = activeTab === "staff";
    const roomTitle = item.roomName || (isStaff ? "Trung tâm Hỗ trợ LocalMate" : item.tourName || item.guideName || "Hướng dẫn viên");
    const subName = isStaff ? "Nhân viên CSKH" : `HDV: ${item.guideName || "Đang xếp"}`;

    const avatarTxt = isStaff ? "LM" : "T";
    const avatarBg = isStaff ? "#f59e0b" : "#4f7cff";
    
    // Nếu chat HDV thì sessionId là bookingId (BK123), nếu CSKH thì là support_123
    const sessionId = isStaff ? item.id : (item.bookingId || item.id);

    return (
      <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: "/guest_chat_detail", params: { bookingId: sessionId, type: activeTab } } as any)}>
        <View style={[s.avatar, { backgroundColor: avatarBg }]}><Text style={s.avatarTxt}>{avatarTxt}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{roomTitle}</Text>
            <Text style={s.time}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN') : ""}</Text>
          </View>
          <Text style={s.subName} numberOfLines={1}>{subName}</Text>
          <Text style={s.lastMsg} numberOfLines={1}>
            {item.lastSenderId === currentGuestId ? "Bạn: " : ""}{item.lastMsg || "Chưa có tin nhắn"}
          </Text>
        </View>
        {item.unreadCount > 0 && item.lastSenderId !== currentGuestId && (
           <View style={s.unreadBadge}><Text style={s.unreadText}>{item.unreadCount}</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="chevron-back" size={24} color="#1e293b" /></TouchableOpacity>
        <Text style={s.headerTitle}>Hội thoại</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabItem, activeTab === "guide" && s.tabItemActive_Guide]} onPress={() => setActiveTab("guide")}><Text style={[s.tabText, activeTab === "guide" && s.tabTextActive]}>Tour của tôi</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tabItem, activeTab === "staff" && s.tabItemActive]} onPress={() => setActiveTab("staff")}><Text style={[s.tabText, activeTab === "staff" && s.tabTextActive]}>Hỗ trợ hệ thống</Text></TouchableOpacity>
      </View>

      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput style={s.searchInput} placeholder="Tìm phòng chat..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#4f7cff" style={{ marginTop: 50 }} /> : (
        <FlatList data={filteredData} keyExtractor={(item: any) => item.id || item.bookingId} renderItem={renderItem} contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#cbd5e1" />
              <Text style={{ color: "#94a3b8", marginTop: 16, fontSize: 15 }}>Bạn chưa có cuộc hội thoại nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff" },
    backBtn: { width: sz(40), height: sz(40), alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: sz(18), fontWeight: "700", color: "#1e293b" },
    tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingVertical: sz(10), gap: sz(12) },
    tabItem: { flex: 1, height: sz(40), borderRadius: sz(20), alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
    tabItemActive: { backgroundColor: "#f59e0b" },
    tabItemActive_Guide: { backgroundColor: "#4f7cff" },
    tabText: { fontSize: sz(14), fontWeight: "600", color: "#64748b" },
    tabTextActive: { color: "#fff" },
    searchContainer: { paddingHorizontal: sz(16), paddingTop: sz(12), paddingBottom: sz(4) },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: sz(16), paddingHorizontal: sz(14), height: sz(48), borderWidth: 1, borderColor: "#e2e8f0" },
    searchInput: { flex: 1, marginLeft: sz(10), fontSize: sz(14), color: "#0f172a" },
    list: { padding: sz(16) },
    card: { flexDirection: "row", backgroundColor: "#fff", padding: sz(14), borderRadius: sz(16), marginBottom: sz(10), alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
    avatar: { width: sz(50), height: sz(50), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    avatarTxt: { color: '#fff', fontSize: sz(20), fontWeight: 'bold' },
    cardTitle: { fontSize: sz(15), fontWeight: "900", color: "#1e293b" },
    subName: { fontSize: sz(11), color: "#2856d6", fontWeight: "700" },
    lastMsg: { fontSize: sz(13), color: "#64748b", marginTop: sz(2) },
    time: { fontSize: sz(11), color: "#94a3b8" },
    unreadBadge: { backgroundColor: "#ef4444", minWidth: sz(20), height: sz(20), borderRadius: sz(10), alignItems: 'center', justifyContent: 'center', paddingHorizontal: sz(6), marginLeft: sz(8) },
    unreadText: { color: '#fff', fontSize: sz(10), fontWeight: 'bold' }
  });
};