/**
 * app/guide_chat_list.tsx
 * Danh sách Chat HDV - ĐÃ FIX LỖI ẨN NHÓM CHAT TOUR MỚI
 */
import { GuideTabBar } from "@/components/GuideTabBar"; // Giữ nguyên import bottom bar của bạn
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useMemo } from "react";
import {
  FlatList, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ActivityIndicator, useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [activeTab, setActiveTab] = useState<"guest" | "staff">("guest");
  const [guestChats, setGuestChats] = useState<any[]>([]);
  const [staffChats, setStaffChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [myGuideId, setMyGuideId] = useState("");

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          // 1. LẤY THÔNG TIN HDV ĐANG ĐĂNG NHẬP
          const userRaw = await AsyncStorage.getItem("@app_current_user");
          const currentUser = userRaw ? JSON.parse(userRaw) : null;
          const guideId = currentUser?.accountId || "";
          setMyGuideId(guideId);

          if (!guideId) {
            setIsLoading(false);
            return;
          }

          // 2. LẤY DANH SÁCH BOOKING CỦA HDV NÀY
          const bRaw = await AsyncStorage.getItem("@guest_bookings");
          const allBookings = bRaw ? JSON.parse(bRaw) : [];
          const myBookings = allBookings.filter((b: any) => b.guideId === guideId);

          // 3. LẤY DANH SÁCH CHAT HIỆN CÓ
          const cRaw = await AsyncStorage.getItem("@app_chats");
          const allChats = cRaw ? JSON.parse(cRaw) : [];

          // 4. GHÉP DỮ LIỆU: Đảm bảo mọi booking của HDV đều có phòng chat hiển thị
          const mergedGuestChats: any[] = [];
          const newChatsToSave: any[] = [];

          myBookings.forEach((b: any) => {
            // Tìm chat khớp với booking (id dạng BK123 hoặc chat_BK123)
            const existingChat = allChats.find((c: any) => c.bookingId === b.id || c.id === b.id || c.id === `chat_${b.id}`);

            if (existingChat) {
              mergedGuestChats.push(existingChat);
            } else {
              // NẾU CHƯA CÓ CHAT -> TẠO ENTRY ẢO ĐỂ HIỂN THỊ LUÔN CHO HDV BẤM VÀO
              const newChat = {
                id: `chat_${b.id}`,
                bookingId: b.id,
                tourName: b.tourName || "Tour chưa xác định",
                roomName: `[${b.id}] ${b.tourName || "Tour"}`,
                guestId: b.accountId || b.guestId || "",
                guestName: b.customerName || "Khách hàng",
                guideId: guideId,
                guideName: currentUser?.name || "Bạn (HDV)",
                lastMsg: "Phòng chat mới tạo. Hãy nhắn tin chào khách!",
                lastSenderId: "system",
                updatedAt: b.createdAt || new Date().toISOString(),
                unreadCount: 0,
              };
              mergedGuestChats.push(newChat);
              newChatsToSave.push(newChat);
            }
          });

          // Lưu các chat bị thiếu ngược lại vào Storage để đồng bộ
          if (newChatsToSave.length > 0) {
            await AsyncStorage.setItem("@app_chats", JSON.stringify([...newChatsToSave, ...allChats]));
          }

          // Sắp xếp chat mới nhất lên đầu
          mergedGuestChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setGuestChats(mergedGuestChats);

          // 5. TẢI CHAT VỚI CSKH (STAFF)
          const sRaw = await AsyncStorage.getItem("@staff_chats_v3");
          let sChats = sRaw ? JSON.parse(sRaw).filter((c: any) => c.guestId === guideId || c.id === `support_${guideId}`) : [];

          // Luôn đảm bảo HDV có ít nhất 1 kênh liên lạc CSKH
          if (sChats.length === 0) {
            sChats = [{
              id: `support_${guideId}`,
              roomName: "Trung tâm Hỗ trợ HDV",
              guestId: guideId,
              guestName: currentUser?.name || "Hướng dẫn viên",
              lastMsg: "Nhắn tin để nhận hỗ trợ từ điều hành.",
              updatedAt: new Date().toISOString(),
              unreadCount: 0,
            }];
          }
          setStaffChats(sChats);

        } catch (error) {
          console.error("Lỗi tải danh sách chat HDV:", error);
        }
        setIsLoading(false);
      };

      loadData();
    }, [])
  );

  // Lọc dữ liệu theo Search bar
  const filteredData = useMemo(() => {
    const list = activeTab === "guest" ? guestChats : staffChats;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((c: any) =>
      (c.roomName || "").toLowerCase().includes(q) ||
      (c.bookingId || "").toLowerCase().includes(q) ||
      (c.guestName || "").toLowerCase().includes(q)
    );
  }, [activeTab, guestChats, staffChats, searchQuery]);

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home" as any)} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Hội thoại của bạn</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabContainer}>
        <TouchableOpacity style={[s.tabItem, activeTab === "guest" && s.tabItemActive_Guest]} onPress={() => setActiveTab("guest")}>
          <Text style={[s.tabText, activeTab === "guest" && s.tabTextActive]}>Khách của tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabItem, activeTab === "staff" && s.tabItemActive_Staff]} onPress={() => setActiveTab("staff")}>
          <Text style={[s.tabText, activeTab === "staff" && s.tabTextActive]}>Hỗ trợ hệ thống</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm mã tour, tên khách..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item: any) => item.id || item.bookingId}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isStaff = activeTab === "staff";
            const avatarBg = isStaff ? "#f59e0b" : "#10b981";
            const avatarTxt = isStaff ? "LM" : (item.guestName ? item.guestName.charAt(0).toUpperCase() : "K");
            const sessionId = isStaff ? item.id : (item.bookingId || item.id);

            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push({ pathname: "/guide_chat_detail", params: { bookingId: sessionId, type: activeTab } } as any)}
              >
                <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                  <Text style={s.avatarTxt}>{avatarTxt}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={s.cardTitle} numberOfLines={1}>
                      {item.roomName || "Tour Khách hàng"}
                    </Text>
                    <Text style={s.time}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : ""}
                    </Text>
                  </View>
                  <Text style={s.subName}>Khách: {item.guestName || "Thành viên"}</Text>
                  <Text style={s.lastMsg} numberOfLines={1}>
                    {item.lastSenderId === myGuideId ? "Bạn: " : ""}
                    {item.lastMsg || "Chưa có tin nhắn"}
                  </Text>
                </View>
                {item.unreadCount > 0 && item.lastSenderId !== myGuideId && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 100 }}>
              <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
              <Text style={{ color: "#94a3b8", marginTop: 16, fontSize: 15 }}>
                Chưa có cuộc hội thoại nào
              </Text>
            </View>
          }
        />
      )}

      {/* Import GuideTabBar nếu bạn đang dùng Bottom Tab riêng */}
      <GuideTabBar activeRoute="guide-chat" />
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff" },
    backBtn: { width: sz(40), height: sz(40), alignItems: "flex-start", justifyContent: "center" },
    headerTitle: { fontSize: sz(18), fontWeight: "800", color: "#1e293b" },
    tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingVertical: sz(10), gap: sz(12) },
    tabItem: { flex: 1, height: sz(40), borderRadius: sz(20), alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
    tabItemActive_Guest: { backgroundColor: "#10b981" },
    tabItemActive_Staff: { backgroundColor: "#f59e0b" },
    tabText: { fontSize: sz(14), fontWeight: "700", color: "#64748b" },
    tabTextActive: { color: "#fff" },
    searchContainer: { paddingHorizontal: sz(16), paddingTop: sz(12), paddingBottom: sz(4) },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: sz(16), paddingHorizontal: sz(14), height: sz(48), borderWidth: 1, borderColor: "#e2e8f0" },
    searchInput: { flex: 1, marginLeft: sz(10), fontSize: sz(14), color: "#0f172a" },
    list: { padding: sz(16), paddingBottom: 100 },
    card: { flexDirection: "row", backgroundColor: "#fff", padding: sz(14), borderRadius: sz(16), marginBottom: sz(10), alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0", elevation: 1 },
    avatar: { width: sz(50), height: sz(50), borderRadius: sz(16), alignItems: "center", justifyContent: "center", marginRight: sz(12) },
    avatarTxt: { color: "#fff", fontSize: sz(20), fontWeight: "900" },
    cardTitle: { fontSize: sz(15), fontWeight: "900", color: "#1f2a58" },
    subName: { fontSize: sz(12), color: "#10b981", fontWeight: "800", marginTop: 2 },
    lastMsg: { fontSize: sz(13), color: "#64748b", marginTop: 4 },
    time: { fontSize: sz(11), color: "#94a3b8" },
    unreadBadge: { backgroundColor: "#ef4444", minWidth: sz(20), height: sz(20), borderRadius: sz(10), alignItems: "center", justifyContent: "center", paddingHorizontal: sz(6), marginLeft: sz(8) },
    unreadText: { color: "#fff", fontSize: sz(10), fontWeight: "900" },
  });
};