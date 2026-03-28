/**
 * app/guide-chat.tsx
 * Chat với khách đã đặt tour
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

interface ChatSession {
  id: string; guestName: string; guestId: string;
  tourName: string; lastMessage: string;
  lastTime: string; unread: number; avatarColor: string;
  bookingId: string;
}

interface Message {
  id: string; text: string; from: "guide" | "guest";
  time: string; read: boolean;
}

const SEED_SESSIONS: ChatSession[] = [
  { id: "c1", guestName: "Trần Thị B",    guestId: "g1",  tourName: "Tour Núi Bà Đen",     lastMessage: "Chúng tôi xuất phát lúc 6h sáng nhé anh/chị!", lastTime: "08:30", unread: 2, avatarColor: "#4f7cff",  bookingId: "BK001" },
  { id: "c2", guestName: "Lê Văn C",      guestId: "g2",  tourName: "Tour Đà Lạt 2N1Đ",   lastMessage: "Cảm ơn anh đã giải thích rõ ràng!",              lastTime: "Hôm qua", unread: 0, avatarColor: "#10b981",  bookingId: "BK002" },
  { id: "c3", guestName: "Nguyễn Thị D",  guestId: "g3",  tourName: "Tour Mũi Né 2N1Đ",   lastMessage: "Tour tuyệt vời lắm ạ, 5 sao nha!",              lastTime: "T2",  unread: 0, avatarColor: "#f59e0b",  bookingId: "BK003" },
  { id: "c4", guestName: "Hoàng Thị F",   guestId: "g4",  tourName: "Trekking Langbiang",  lastMessage: "Mình cần mang giày thể thao đúng không ạ?",      lastTime: "09:15", unread: 3, avatarColor: "#ec4899",  bookingId: "BK004" },
  { id: "c5", guestName: "Phạm Gia Huy",  guestId: "g5",  tourName: "Hội An cổ kính",     lastMessage: "Xin chào HDV, tour mình có bao gồm ăn tối không?", lastTime: "07:50", unread: 1, avatarColor: "#8b5cf6",  bookingId: "BK005" },
];

const SEED_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: "m1", text: "Xin chào HDV! Tôi đã đặt tour Núi Bà Đen ngày mai.", from: "guest", time: "08:10", read: true },
    { id: "m2", text: "Xin chào chị! Tôi xác nhận đã nhận booking của chị rồi ạ.", from: "guide", time: "08:15", read: true },
    { id: "m3", text: "Điểm đón ở đâu ạ?", from: "guest", time: "08:20", read: true },
    { id: "m4", text: "Chúng tôi xuất phát lúc 6h sáng nhé anh/chị! Điểm đón: Cổng Bến xe Miền Đông.", from: "guide", time: "08:30", read: false },
    { id: "m5", text: "Cần mang theo gì không ạ?", from: "guest", time: "08:32", read: false },
  ],
  c4: [
    { id: "m1", text: "Mình cần mang giày thể thao đúng không ạ?", from: "guest", time: "09:10", read: false },
    { id: "m2", text: "Mình cũng có bị say xe, cần chuẩn bị gì không?", from: "guest", time: "09:12", read: false },
    { id: "m3", text: "Trời sẽ mưa không ạ?", from: "guest", time: "09:15", read: false },
  ],
  c5: [
    { id: "m1", text: "Xin chào HDV, tour mình có bao gồm ăn tối không?", from: "guest", time: "07:50", read: false },
  ],
};

const QUICK_REPLIES = [
  "Xin chào! Tôi sẽ hỗ trợ bạn ngay.",
  "Điểm xuất phát lúc 6:00 sáng tại Bến xe Miền Đông.",
  "Vui lòng mang theo giấy tờ tùy thân và giày thoải mái.",
  "Tour bao gồm: xe đưa đón, ăn sáng và trưa, vé vào cửa.",
  "Thời tiết đang tốt, hành trình như kế hoạch nhé!",
  "Cảm ơn bạn đã tin tưởng! Chúc chuyến đi vui vẻ 🎉",
];

export default function GuideChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions]     = useState<ChatSession[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [showQuick, setShowQuick]   = useState(false);
  const flatRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_chat_sessions").then(raw => {
      setSessions(raw ? JSON.parse(raw) : SEED_SESSIONS);
    }).catch(() => setSessions(SEED_SESSIONS));
  }, []));

  const openChat = async (session: ChatSession) => {
    setActiveId(session.id);
    const saved = await AsyncStorage.getItem(`@guide_chat_${session.id}`).catch(() => null);
    setMessages(saved ? JSON.parse(saved) : (SEED_MESSAGES[session.id] || []));
    // Mark all read
    const updated = sessions.map(s => s.id === session.id ? { ...s, unread: 0 } : s);
    setSessions(updated);
    await AsyncStorage.setItem("@guide_chat_sessions", JSON.stringify(updated)).catch(() => {});
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeId) return;
    const newMsg: Message = { id: `m${Date.now()}`, text: text.trim(), from: "guide", time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }), read: false };
    const updated = [...messages, newMsg];
    setMessages(updated);
    await AsyncStorage.setItem(`@guide_chat_${activeId}`, JSON.stringify(updated)).catch(() => {});
    const updatedSessions = sessions.map(s => s.id === activeId ? { ...s, lastMessage: text.trim(), lastTime: "Vừa xong" } : s);
    setSessions(updatedSessions);
    await AsyncStorage.setItem("@guide_chat_sessions", JSON.stringify(updatedSessions)).catch(() => {});
    setInput("");
    setShowQuick(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const activeSession = sessions.find(s => s.id === activeId);
  const totalUnread   = sessions.reduce((s, c) => s + c.unread, 0);

  if (activeId && activeSession) {
    return (
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[s.chatTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => { setActiveId(null); setMessages([]); }} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[s.chatAvatar, { backgroundColor: activeSession.avatarColor }]}>
            <Text style={s.chatAvatarTxt}>{activeSession.guestName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatName}>{activeSession.guestName}</Text>
            <Text style={s.chatTour} numberOfLines={1}>{activeSession.tourName}</Text>
          </View>
          <TouchableOpacity style={s.callBtn}>
            <Ionicons name="call-outline" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Booking info banner */}
        <View style={s.bookingBanner}>
          <Ionicons name="receipt-outline" size={13} color="#2856d6" />
          <Text style={s.bookingBannerTxt}>Booking #{activeSession.bookingId} · {activeSession.tourName}</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.messageList}
          onLayout={() => flatRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.from === "guide" ? s.bubbleGuide : s.bubbleGuest]}>
              <Text style={[s.bubbleTxt, item.from === "guide" ? s.bubbleTxtGuide : s.bubbleTxtGuest]}>{item.text}</Text>
              <Text style={[s.bubbleTime, item.from === "guide" && { color: "rgba(255,255,255,0.7)" }]}>{item.time}</Text>
            </View>
          )}
        />

        {/* Quick replies */}
        {showQuick && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickBar} contentContainerStyle={s.quickBarContent}>
            {QUICK_REPLIES.map((q, i) => (
              <TouchableOpacity key={i} style={s.quickChip} onPress={() => sendMessage(q)}>
                <Text style={s.quickChipTxt} numberOfLines={1}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={[s.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
          <TouchableOpacity style={[s.quickToggle, showQuick && { backgroundColor: "#10b981" }]} onPress={() => setShowQuick(!showQuick)}>
            <Ionicons name="flash-outline" size={18} color={showQuick ? "#fff" : "#7a8cc2"} />
          </TouchableOpacity>
          <TextInput
            style={s.msgInput}
            value={input}
            onChangeText={setInput}
            placeholder="Nhắn tin cho khách..."
            placeholderTextColor="#b0bdd8"
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnOff]} onPress={() => sendMessage(input)} disabled={!input.trim()}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat với khách</Text>
        {totalUnread > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeTxt}>{totalUnread} chưa đọc</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {sessions.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Chưa có cuộc trò chuyện nào</Text>
          </View>
        )}
        {sessions.map(session => (
          <TouchableOpacity key={session.id} style={[s.sessionCard, session.unread > 0 && s.sessionCardUnread]} onPress={() => openChat(session)} activeOpacity={0.85}>
            <View style={[s.sessionAvatar, { backgroundColor: session.avatarColor }]}>
              <Text style={s.sessionAvatarTxt}>{session.guestName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.sessionTopRow}>
                <Text style={s.sessionName}>{session.guestName}</Text>
                <Text style={s.sessionTime}>{session.lastTime}</Text>
              </View>
              <Text style={s.sessionTour} numberOfLines={1}>{session.tourName}</Text>
              <Text style={[s.sessionLast, session.unread > 0 && { color: "#1f2a58", fontWeight: "700" }]} numberOfLines={1}>{session.lastMessage}</Text>
            </View>
            {session.unread > 0 && (
              <View style={s.unreadDot}>
                <Text style={s.unreadDotTxt}>{session.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <AdminTabBar role="guide" activeRoute="/guide-chat" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  unreadBadge:      { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  unreadBadgeTxt:   { color: "#dc2626", fontWeight: "800", fontSize: 12 },
  content:          { padding: 14 },
  emptyCard:        { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 12 },
  emptyTxt:         { color: "#7a8cc2" },
  sessionCard:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  sessionCardUnread:{ borderColor: "#dbeafe", backgroundColor: "#f0f7ff" },
  sessionAvatar:    { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  sessionAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 20 },
  sessionTopRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sessionName:      { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  sessionTime:      { color: "#94a3b8", fontSize: 11 },
  sessionTour:      { color: "#7a8cc2", fontSize: 11, marginBottom: 3 },
  sessionLast:      { color: "#94a3b8", fontSize: 12 },
  unreadDot:        { width: 22, height: 22, borderRadius: 11, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center" },
  unreadDotTxt:     { color: "#fff", fontSize: 10, fontWeight: "800" },
  // Chat screen
  chatTopBar:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  chatAvatar:       { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chatAvatarTxt:    { color: "#fff", fontWeight: "800", fontSize: 15 },
  chatName:         { color: "#1f2a58", fontWeight: "800", fontSize: 15 },
  chatTour:         { color: "#7a8cc2", fontSize: 11 },
  callBtn:          { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" },
  bookingBanner:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eaf0ff", paddingHorizontal: 14, paddingVertical: 8 },
  bookingBannerTxt: { color: "#2856d6", fontSize: 12, fontWeight: "600" },
  messageList:      { padding: 14, gap: 8 },
  bubble:           { maxWidth: "80%", borderRadius: 16, padding: 10 },
  bubbleGuide:      { backgroundColor: "#10b981", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleGuest:      { backgroundColor: "#fff", alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e4ebff" },
  bubbleTxt:        { fontSize: 14, lineHeight: 20 },
  bubbleTxtGuide:   { color: "#fff" },
  bubbleTxtGuest:   { color: "#1f2a58" },
  bubbleTime:       { color: "#7a8cc2", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  quickBar:         { maxHeight: 44, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e4ebff" },
  quickBarContent:  { gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  quickChip:        { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#f3f7ff", paddingHorizontal: 12, paddingVertical: 6, maxWidth: 220 },
  quickChipTxt:     { color: "#2856d6", fontSize: 12 },
  inputBar:         { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e4ebff" },
  quickToggle:      { width: 38, height: 38, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  msgInput:         { flex: 1, backgroundColor: "#f3f7ff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 10, color: "#1f2a58", maxHeight: 100, fontSize: 14 },
  sendBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center" },
  sendBtnOff:       { backgroundColor: "#c0cbe8" },
});