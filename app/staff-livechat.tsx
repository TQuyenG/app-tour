/**
 * app/staff-livechat.tsx
 * Staff Hỗ trợ Live Chat + Tính năng Gửi Tin Nhắn Hàng Loạt
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useRef } from "react";
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View, FlatList
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";
import { getAllSupportChats, markSupportChatRead, sendSupportMessage, resolveSupportChat, initOrGetSupportChat, SupportSession } from "@/constants/chat-store";

export default function StaffLiveChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");

  // Modal 1-1 Chat
  const [activeChat, setActiveChat] = useState<SupportSession | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Modal Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "guest" | "guide">("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const loadChats = async () => {
    const data = await getAllSupportChats();
    setSessions(data);
    if (activeChat) {
      const updated = data.find(c => c.userId === activeChat.userId);
      if (updated) setActiveChat(updated);
    }
  };

  useFocusEffect(useCallback(() => { loadChats(); }, []));

  const openChat = async (chat: SupportSession) => {
    setActiveChat(chat);
    if (chat.unreadStaff > 0) {
      await markSupportChatRead(chat.userId, "staff");
      loadChats();
    }
  };

  const handleSend = async () => {
    if (!msgInput.trim() || !activeChat) return;
    await sendSupportMessage(activeChat.userId, "staff", msgInput.trim());
    setMsgInput("");
    loadChats();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleResolve = async () => {
    if (!activeChat) return;
    Alert.alert("Đóng Ticket", "Đánh dấu cuộc trò chuyện này đã giải quyết?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đóng", onPress: async () => {
          await resolveSupportChat(activeChat.userId);
          setActiveChat(null);
          loadChats();
      }}
    ]);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return Alert.alert("Lỗi", "Vui lòng nhập nội dung.");
    
    // Lấy danh sách user thực từ Database ảo
    const rawAcc = await AsyncStorage.getItem("@app_accounts");
    let accounts: any[] = rawAcc ? JSON.parse(rawAcc) : [];
    
    if (broadcastTarget === "guest") accounts = accounts.filter(a => a.roles.includes("guest"));
    if (broadcastTarget === "guide") accounts = accounts.filter(a => a.roles.includes("guide"));
    
    if (accounts.length === 0) return Alert.alert("Thông báo", "Không có user nào trong hệ thống.");

    let count = 0;
    for (const acc of accounts) {
      const role = acc.roles.includes("guide") ? "guide" : "guest";
      await initOrGetSupportChat({ id: acc.id, name: acc.name, role });
      await sendSupportMessage(acc.id, "staff", broadcastMsg.trim());
      count++;
    }
    
    Alert.alert("Thành công", `Đã gửi tin nhắn đến ${count} người dùng.`);
    setShowBroadcast(false);
    setBroadcastMsg("");
    loadChats();
  };

  const filtered = sessions.filter(s => {
    const kw = search.toLowerCase();
    const matchSearch = !kw || s.userName.toLowerCase().includes(kw) || s.userId.toLowerCase().includes(kw);
    if (!matchSearch) return false;
    
    if (filter === "Khách hàng") return s.userRole === "guest";
    if (filter === "Hướng dẫn viên") return s.userRole === "guide";
    if (filter === "Chưa đọc") return s.unreadStaff > 0;
    return true;
  });

  const unreadCount = sessions.reduce((acc, s) => acc + s.unreadStaff, 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* MODAL 1-1 CHAT DETAIL */}
      {activeChat && (
        <Modal visible={true} animationType="slide">
          <View style={[s.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setActiveChat(null)} style={s.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#1f2a58" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.chatName}>{activeChat.userName}</Text>
              <Text style={s.chatRole}>{activeChat.userRole === "guide" ? "Hướng dẫn viên" : "Khách du lịch"}</Text>
            </View>
            <TouchableOpacity onPress={handleResolve} style={s.resolveBtn}>
              <Text style={s.resolveBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <FlatList
              ref={flatListRef}
              data={activeChat.messages}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              renderItem={({ item }) => {
                const isMe = item.from === "staff";
                const isSystem = item.from === "system";
                if (isSystem) return <Text style={s.sysMsg}>{item.text}</Text>;
                return (
                  <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft]}>
                    <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                      <Text style={[s.msgTxt, isMe ? { color: "#fff" } : { color: "#1f2a58" }]}>{item.text}</Text>
                    </View>
                    <Text style={s.msgTime}>{item.time}</Text>
                  </View>
                );
              }}
            />
            {activeChat.resolved ? (
              <View style={s.resolvedBox}><Text style={s.resolvedTxt}>Ticket đã đóng. Tin nhắn mới sẽ mở lại ticket.</Text></View>
            ) : null}
            <View style={[s.inputArea, { paddingBottom: insets.bottom + 10 }]}>
              <TextInput style={s.textInput} value={msgInput} onChangeText={setMsgInput} placeholder="Nhập câu trả lời..." multiline />
              <TouchableOpacity style={[s.sendBtn, !msgInput.trim() && { opacity: 0.5 }]} onPress={handleSend}>
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* MODAL BROADCAST (NHẮN HÀNG LOẠT) */}
      <Modal visible={showBroadcast} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.broadcastBox}>
            <Text style={s.broadcastTitle}>Gửi thông báo hàng loạt</Text>
            
            <Text style={s.label}>Đối tượng nhận:</Text>
            <View style={s.radioGroup}>
              {[
                { id: "all", label: "Toàn bộ hệ thống" },
                { id: "guest", label: "Chỉ Khách hàng" },
                { id: "guide", label: "Chỉ Hướng dẫn viên" }
              ].map(opt => (
                <TouchableOpacity key={opt.id} style={[s.radioBtn, broadcastTarget === opt.id && s.radioActive]} onPress={() => setBroadcastTarget(opt.id as any)}>
                  <Text style={[s.radioTxt, broadcastTarget === opt.id && { color: "#fff" }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Nội dung:</Text>
            <TextInput 
              style={s.broadcastInput} value={broadcastMsg} onChangeText={setBroadcastMsg} 
              placeholder="VD: Cảnh báo bão tại Đà Nẵng..." multiline numberOfLines={4} 
            />

            <View style={s.bBtns}>
              <TouchableOpacity style={s.bCancel} onPress={() => setShowBroadcast(false)}><Text style={{color: "#7a8cc2", fontWeight: "700"}}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={s.bSend} onPress={handleBroadcast}><Text style={{color: "#fff", fontWeight: "700"}}>Gửi ngay</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DANH SÁCH CHAT CHÍNH */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Hỗ trợ & Live Chat</Text>
        </View>
        <TouchableOpacity style={s.broadcastTrigger} onPress={() => setShowBroadcast(true)}>
          <Ionicons name="megaphone-outline" size={18} color="#f59e0b" />
          <Text style={{color: "#f59e0b", fontWeight: "800", fontSize: 12}}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm khách hàng, HDV..." value={search} onChangeText={setSearch} />
      </View>

      <View style={s.filterRow}>
        {["Tất cả", "Khách hàng", "Hướng dẫn viên", "Chưa đọc"].map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
           <View style={{ alignItems: "center", marginTop: 60 }}><Text style={{color: "#7a8cc2"}}>Không có cuộc trò chuyện nào</Text></View>
        ) : (
          filtered.map(c => (
            <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.8} onPress={() => openChat(c)}>
              <View style={[s.avatar, { backgroundColor: c.userRole === "guide" ? "#e0f2fe" : "#ede9fe" }]}>
                <Ionicons name={c.userRole === "guide" ? "compass" : "person"} size={20} color={c.userRole === "guide" ? "#0284c7" : "#7c3aed"} />
              </View>
              <View style={s.cardInfo}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={s.cName}>{c.userName}</Text>
                  <Text style={s.cTime}>{c.lastTime}</Text>
                </View>
                <Text style={[s.cLastMsg, c.unreadStaff > 0 && { color: "#1f2a58", fontWeight: "700" }]} numberOfLines={1}>
                  {c.lastMessage}
                </Text>
              </View>
              {c.unreadStaff > 0 && <View style={s.unreadDot}><Text style={s.unreadTxt}>{c.unreadStaff}</Text></View>}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <StaffTabBar activeRoute="/staff-livechat" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  broadcastTrigger: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef3c7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#fde68a" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, flexWrap: "wrap" },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 6 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: "row", backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#e4ebff" },
  avatar: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, marginLeft: 12 },
  cName: { fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  cTime: { fontSize: 11, color: "#94a8d8" },
  cLastMsg: { fontSize: 13, color: "#7a8cc2" },
  unreadDot: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  unreadTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Chat View
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  chatName: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  chatRole: { fontSize: 11, color: "#7a8cc2" },
  resolveBtn: { backgroundColor: "#fef2f2", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca" },
  resolveBtnTxt: { color: "#dc2626", fontSize: 12, fontWeight: "700" },
  msgRow: { marginBottom: 16, maxWidth: "80%" },
  msgLeft: { alignSelf: "flex-start" },
  msgRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { backgroundColor: "#2856d6", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e4ebff" },
  msgTxt: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: "#94a8d8", marginTop: 4 },
  sysMsg: { textAlign: "center", color: "#94a8d8", fontSize: 11, fontStyle: "italic", marginVertical: 10 },
  resolvedBox: { backgroundColor: "#f8faff", padding: 10, alignItems: "center" },
  resolvedTxt: { color: "#7a8cc2", fontSize: 11, fontStyle: "italic" },
  inputArea: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e4ebff", paddingHorizontal: 16, paddingTop: 10 },
  textInput: { flex: 1, backgroundColor: "#f3f7ff", borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2856d6", alignItems: "center", justifyContent: "center", marginLeft: 10 },

  // Broadcast Modal
  overlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", justifyContent: "center", padding: 20 },
  broadcastBox: { backgroundColor: "#fff", borderRadius: 24, padding: 20 },
  broadcastTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 16, textAlign: "center" },
  label: { fontSize: 13, fontWeight: "700", color: "#5f73a9", marginBottom: 8, marginTop: 10 },
  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radioBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#f8faff" },
  radioActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  radioTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },
  broadcastInput: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 12, textAlignVertical: "top", color: "#1f2a58" },
  bBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  bCancel: { flex: 1, alignItems: "center", padding: 12, backgroundColor: "#f3f7ff", borderRadius: 10 },
  bSend: { flex: 1, alignItems: "center", padding: 12, backgroundColor: "#f59e0b", borderRadius: 10 }
});