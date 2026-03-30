/**
 * app/staff-livechat.tsx
 * Staff Hỗ trợ Live Chat + Tính năng Gửi Tin Nhắn Hàng Loạt (Broadcast)
 * ĐÃ FIX UI: Giao diện thẻ Chat giống hệt bên Guest (Lấy Tên Phòng làm Tiêu đề)
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { useCallback, useState, useRef, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

export default function StaffLiveChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Modal 1-1 Chat
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Modal Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "guest" | "guide">("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  // --- 1. TẢI DANH SÁCH PHÒNG CHAT ---
  const loadSessions = async () => {
    try {
      const raw = await AsyncStorage.getItem("@staff_chats_v3");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.sort((a: any, b: any) => new Date(b.updatedAt).getTime() < new Date(a.updatedAt).getTime() ? 1 : -1);
        setSessions(parsed);
      }
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 3000);
    return () => clearInterval(interval);
  }, []));

  // --- 2. TẢI TIN NHẮN CỦA PHÒNG ĐANG MỞ ---
  const loadActiveMessages = async (chatId: string) => {
    try {
      const mRaw = await AsyncStorage.getItem("@staff_messages_v3");
      if (mRaw) {
        const allMsgs = JSON.parse(mRaw);
        const chatMsgs = allMsgs.filter((m: any) => m.sessionId === chatId);
        setMessages(chatMsgs.reverse());
      }
      
      const sRaw = await AsyncStorage.getItem("@staff_chats_v3");
      if (sRaw) {
         let sChats = JSON.parse(sRaw);
         const cIdx = sChats.findIndex((c:any) => c.id === chatId);
         if (cIdx > -1 && sChats[cIdx].lastSenderId !== "staff") {
            sChats[cIdx].unreadCount = 0;
            await AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(sChats));
         }
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeChat) {
      loadActiveMessages(activeChat.id);
      const interval = setInterval(() => loadActiveMessages(activeChat.id), 2000);
      return () => clearInterval(interval);
    }
  }, [activeChat?.id]);

  // --- 3. GỬI TIN NHẮN 1-1 ---
  const handleSend = async () => {
    if (!msgInput.trim() || !activeChat) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sessionId: activeChat.id,
      senderId: "staff",
      text: msgInput.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages([newMsg, ...messages]);
    setMsgInput("");

    try {
      const mRaw = await AsyncStorage.getItem('@staff_messages_v3');
      const allMsgs = mRaw ? JSON.parse(mRaw) : [];
      allMsgs.push(newMsg);
      await AsyncStorage.setItem('@staff_messages_v3', JSON.stringify(allMsgs));

      const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
      let sChats = sRaw ? JSON.parse(sRaw) : [];
      let chatIndex = sChats.findIndex((c: any) => c.id === activeChat.id);
      if (chatIndex > -1) {
         sChats[chatIndex].lastMsg = newMsg.text;
         sChats[chatIndex].lastSenderId = "staff";
         sChats[chatIndex].updatedAt = newMsg.createdAt;
         sChats[chatIndex].unreadCount = (sChats[chatIndex].unreadCount || 0) + 1;
      }
      await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));
      loadSessions();
    } catch(e) {}
  };

  // --- 4. GỬI THÔNG BÁO HÀNG LOẠT (BROADCAST) ---
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return Alert.alert("Lỗi", "Vui lòng nhập nội dung thông báo.");
    
    try {
      const accRaw = await AsyncStorage.getItem("@app_accounts");
      const accounts = accRaw ? JSON.parse(accRaw) : [];
      
      let targets = accounts;
      if (broadcastTarget === "guest") targets = accounts.filter((a: any) => a.roles.includes("guest") && !a.roles.includes("guide"));
      if (broadcastTarget === "guide") targets = accounts.filter((a: any) => a.roles.includes("guide"));

      if (targets.length === 0) return Alert.alert("Thông báo", "Không tìm thấy người dùng phù hợp để gửi.");

      const mRaw = await AsyncStorage.getItem('@staff_messages_v3');
      const allMsgs = mRaw ? JSON.parse(mRaw) : [];
      
      const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
      let sChats = sRaw ? JSON.parse(sRaw) : [];

      const now = new Date().toISOString();

      targets.forEach((user: any) => {
        const sessionId = `support_${user.id}`;
        
        allMsgs.push({
          id: `msg_${Date.now()}_${Math.random()}`,
          sessionId, senderId: "staff",
          text: `📢 [THÔNG BÁO HỆ THỐNG]\n${broadcastMsg.trim()}`,
          createdAt: now
        });

        const cIdx = sChats.findIndex((c: any) => c.id === sessionId);
        if (cIdx > -1) {
          sChats[cIdx].lastMsg = `[Thông báo]: ${broadcastMsg.trim()}`;
          sChats[cIdx].lastSenderId = "staff";
          sChats[cIdx].updatedAt = now;
          sChats[cIdx].unreadCount = (sChats[cIdx].unreadCount || 0) + 1;
        } else {
          sChats.unshift({
            id: sessionId, guestId: user.id,
            roomName: user.roles.includes("guide") ? "Trung tâm Hỗ trợ HDV" : "Trung tâm CSKH LocalMate",
            guestName: user.name || "Người dùng",
            lastMsg: `[Thông báo]: ${broadcastMsg.trim()}`,
            lastSenderId: "staff",
            updatedAt: now,
            unreadCount: 1
          });
        }
      });

      await AsyncStorage.setItem('@staff_messages_v3', JSON.stringify(allMsgs));
      await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));

      setBroadcastMsg("");
      setShowBroadcast(false);
      Alert.alert("Thành công", `Đã gửi thông báo đến ${targets.length} người dùng.`);
      loadSessions();
    } catch (e) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi phát thông báo.");
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (!search.trim()) return true;
    const kw = search.toLowerCase();
    return s.guestName?.toLowerCase().includes(kw) || s.roomName?.toLowerCase().includes(kw);
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Hỗ trợ Trực tuyến</Text>
        </View>
        <TouchableOpacity style={s.broadcastIconBtn} onPress={() => setShowBroadcast(true)}>
          <Ionicons name="megaphone" size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput style={s.searchInput} placeholder="Tìm phòng chat, tên người gửi..." value={search} onChangeText={setSearch} />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filteredSessions.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
            <Text style={{ color: "#94a3b8", marginTop: 16, fontSize: 15 }}>Không có cuộc hội thoại nào.</Text>
          </View>
        )}
        {filteredSessions.map(sess => {
          // Tô màu Avatar theo loại phòng (HDV hay Khách thường)
          const isGuide = sess.roomName?.includes("HDV");
          const avatarBg = isGuide ? "#10b981" : "#4f7cff";
          const avatarTxt = sess.guestName?.charAt(0).toUpperCase() || "U";

          return (
            <TouchableOpacity key={sess.id} style={s.card} onPress={() => setActiveChat(sess)} activeOpacity={0.7}>
              <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                <Text style={s.avatarTxt}>{avatarTxt}</Text>
              </View>
              <View style={s.infoWrap}>
                <View style={s.cardHeader}>
                  <Text style={s.roomName} numberOfLines={1}>{sess.roomName}</Text>
                  <Text style={s.timeTxt}>{sess.updatedAt ? new Date(sess.updatedAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : ""}</Text>
                </View>
                <Text style={s.guestName} numberOfLines={1}>Người gửi: {sess.guestName}</Text>
                <Text style={s.lastMsg} numberOfLines={1}>{sess.lastSenderId === "staff" ? "Bạn: " : ""}{sess.lastMsg}</Text>
              </View>
              {sess.unreadCount > 0 && sess.lastSenderId !== "staff" && (
                <View style={s.unreadBadge}><Text style={s.unreadTxt}>{sess.unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* --- MODAL CHAT 1-1 --- */}
      {activeChat && (
        <Modal visible={!!activeChat} animationType="slide">
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f8fafc" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[s.chatHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => { setActiveChat(null); loadSessions(); }} style={s.chatBackBtn}>
                <Ionicons name="chevron-back" size={24} color="#1e293b" />
              </TouchableOpacity>
              <View style={s.chatHeaderInfo}>
                <Text style={s.chatHeaderName} numberOfLines={1}>{activeChat.roomName}</Text>
                <Text style={s.chatHeaderSub} numberOfLines={1}>Khách: {activeChat.guestName}</Text>
              </View>
            </View>

            <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} inverted showsVerticalScrollIndicator={false} contentContainerStyle={s.msgList}
              renderItem={({ item }) => {
                const isMe = item.senderId === "staff";
                const isSystem = item.text.includes("[THÔNG BÁO HỆ THỐNG]");
                return (
                  <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft, isSystem && {maxWidth: '100%', width: '100%', alignItems: 'center'}]}>
                    <View style={[s.bubble, isSystem ? s.bubbleSystem : (isMe ? s.bubbleMe : s.bubbleOther)]}>
                      <Text style={[s.bubbleTxt, isSystem ? {color: '#d97706', fontWeight: 'bold', fontSize: 12} : (isMe ? { color: "#fff" } : { color: "#0f172a" })]}>{item.text}</Text>
                    </View>
                    {!isSystem && <Text style={s.msgTime}>{new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</Text>}
                  </View>
                );
              }}
            />

            <View style={[s.inputArea, { paddingBottom: insets.bottom + 10 }]}>
              <TouchableOpacity style={s.attachBtn}><Ionicons name="add" size={24} color="#94a3b8" /></TouchableOpacity>
              <View style={s.textInputWrapper}>
                <TextInput style={s.textInput} placeholder="Nhập tin nhắn..." value={msgInput} onChangeText={setMsgInput} multiline />
                <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={18} color={msgInput.trim() ? "#f59e0b" : "#94a3b8"} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* --- MODAL BROADCAST --- */}
      <Modal visible={showBroadcast} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
          <View style={s.broadcastBox}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
              <Text style={s.broadcastTitle}>Phát thông báo hệ thống</Text>
              <TouchableOpacity onPress={() => setShowBroadcast(false)}><Ionicons name="close" size={24} color="#1e293b" /></TouchableOpacity>
            </View>
            
            <Text style={s.label}>Đối tượng nhận</Text>
            <View style={s.radioGroup}>
              {[ { key: "all", label: "Tất cả" }, { key: "guest", label: "Chỉ Khách hàng" }, { key: "guide", label: "Chỉ HDV" } ].map(opt => (
                <TouchableOpacity key={opt.key} style={[s.radioBtn, broadcastTarget === opt.key && s.radioActive]} onPress={() => setBroadcastTarget(opt.key as any)}>
                  <Text style={[s.radioTxt, broadcastTarget === opt.key && { color: "#fff" }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Nội dung thông báo</Text>
            <TextInput style={s.broadcastInput} placeholder="Nhập nội dung cần gửi hàng loạt..." value={broadcastMsg} onChangeText={setBroadcastMsg} multiline textAlignVertical="top" />

            <TouchableOpacity style={s.submitBtn} onPress={handleBroadcast}>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={s.submitTxt}>Gửi ngay</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      <StaffTabBar activeRoute="/staff-livechat" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 8, marginLeft: -8 },
  broadcastIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#e2e8f0", marginHorizontal: 16, marginTop: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: "#0f172a" },
  
  list: { padding: 16, paddingBottom: 100 },
  
  // UI Thẻ Chat mới (Đồng bộ với Guest)
  card: { flexDirection: "row", backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  avatar: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  infoWrap: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  roomName: { fontSize: 15, fontWeight: "900", color: "#1e293b", flex: 1, marginRight: 8 },
  timeTxt: { fontSize: 11, color: "#94a3b8" },
  guestName: { fontSize: 11, color: "#2856d6", fontWeight: "700" },
  lastMsg: { fontSize: 13, color: "#64748b", marginTop: 2 },
  unreadBadge: { backgroundColor: "#ef4444", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: 8, paddingHorizontal: 6 },
  unreadTxt: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // Chat View
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  chatBackBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center", marginLeft: -8 },
  chatHeaderInfo: { flex: 1, alignItems: "center" },
  chatHeaderName: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  chatHeaderSub: { fontSize: 11, color: "#10b981", fontWeight: "600", marginTop: 2 },
  
  msgList: { paddingHorizontal: 16, paddingVertical: 20 },
  msgRow: { marginBottom: 16, maxWidth: "85%" },
  msgLeft: { alignSelf: "flex-start" },
  msgRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: "#f59e0b", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  bubbleSystem: { backgroundColor: "#fef3c7", borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#fde68a' },
  bubbleTxt: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  
  inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0", gap: 6 },
  attachBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 40, marginBottom: 10 },
  textInput: { flex: 1, maxHeight: 100, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: "#0f172a" },
  sendBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  // Broadcast Modal
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", padding: 20 },
  broadcastBox: { backgroundColor: "#fff", borderRadius: 24, padding: 20 },
  broadcastTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", textAlign: "center" },
  label: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 8, marginTop: 10 },
  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radioBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f1f5f9" },
  radioActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  radioTxt: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  broadcastInput: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, minHeight: 120, fontSize: 14, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2856d6", paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  submitTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});