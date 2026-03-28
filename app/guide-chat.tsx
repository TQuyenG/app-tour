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
          contentContainerStyle={s.msgListContent}
          onLayout={() => flatRef.current?.scrollToEnd()}
          renderItem={({ item }) => {
          const isGuide = item.from === "guide";
          return (
            <View style={[s.msgRow, isGuide ? s.msgRowGuide : s.msgRowGuest]}>
              <View style={[s.miniAvatar, { backgroundColor: isGuide ? ACCENT : "#c0cbe8" }]}>
                <Text style={s.miniAvatarTxt}>{isGuide ? "H" : activeSession?.guestName.charAt(0)}</Text>
              </View>
              <View style={isGuide ? s.bubbleColGuide : s.bubbleColGuest}>
                <View style={[s.bubble, isGuide ? s.bubbleGuide : s.bubbleGuest]}>
                  <Text style={[s.bubbleTxt, isGuide ? s.bubbleTxtGuide : s.bubbleTxtGuest]}>{item.text}</Text>
                </View>
                <Text style={[s.timeTxt, isGuide ? s.timeTxtGuide : s.timeTxtGuest]}>{item.time}</Text>
              </View>
            </View>
          );
        }}
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

// ── Color tokens (đồng bộ với staff-livechat) ────────────────
const TXT   = "#1f2a58";
const TXT3  = "#94a3b8";
const WHITE = "#fff";
const BORDER= "#e4ebff";
const MSGBG = "#f3f7ff";
const ACCENT= "#10b981";   // xanh lá — màu accent của guide

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MSGBG },

  // ── List screen ──────────────────────────────────────────
  topBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  iconBtn:       { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: "800", color: TXT },
  unreadBadge:   { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  unreadBadgeTxt:{ color: "#dc2626", fontWeight: "800", fontSize: 12 },

  content:    { padding: 12 },
  emptyCard:  { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 32, alignItems: "center", gap: 12, marginTop: 40 },
  emptyTxt:   { color: TXT3, fontSize: 13, fontWeight: "600" },

  // Session card — cấu trúc giống staff
  sessionCard:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  sessionCardUnread: { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
  sessionAvatar:     { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionAvatarTxt:  { color: WHITE, fontWeight: "800", fontSize: 18 },
  cardBody:          { flex: 1, minWidth: 0, gap: 2 },
  sessionTopRow:     { flexDirection: "row", alignItems: "center" },
  sessionName:       { fontSize: 14, fontWeight: "700", color: TXT, flexShrink: 1 },
  sessionTime:       { fontSize: 11, color: TXT3, marginLeft: "auto" as const, paddingLeft: 4 },
  sessionTour:       { fontSize: 11, fontWeight: "600", color: ACCENT },
  sessionLast:       { fontSize: 12, color: TXT3 },
  unreadDot:         { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadDotTxt:      { color: WHITE, fontSize: 10, fontWeight: "800" },

  // ── Chat (detail) screen ─────────────────────────────────
  chatTopBar:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 8 },
  chatAvatar:    { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chatAvatarTxt: { color: WHITE, fontWeight: "800", fontSize: 14 },
  topInfo:       { flex: 1, minWidth: 0 },
  chatName:      { color: TXT, fontWeight: "800", fontSize: 14 },
  chatTour:      { color: TXT3, fontSize: 11 },
  callBtn:       { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" },

  bookingBanner:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  bookingBannerTxt: { color: "#1d4ed8", fontSize: 11, fontWeight: "600" },

  msgList:        { flex: 1, backgroundColor: MSGBG },
  msgListContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 8 },

  // Bubble layout — giống staff (row + column + bounded bubble)
  msgRow:       { flexDirection: "row", gap: 7 },
  msgRowGuest:  { alignSelf: "flex-start", maxWidth: "88%" },
  msgRowGuide:  { alignSelf: "flex-end",   maxWidth: "88%", flexDirection: "row-reverse" },

  miniAvatar:    { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" },
  miniAvatarTxt: { fontSize: 10, fontWeight: "800", color: WHITE },

  bubbleColGuest: { flexShrink: 1, gap: 2, alignItems: "flex-start" },
  bubbleColGuide: { flexShrink: 1, gap: 2, alignItems: "flex-end" },

  bubble:      { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleGuide: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  bubbleGuest: { backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },

  bubbleTxt:      { fontSize: 13, lineHeight: 19, flexShrink: 1, flexWrap: "wrap" as const },
  bubbleTxtGuide: { color: WHITE },
  bubbleTxtGuest: { color: TXT },

  timeTxt:      { fontSize: 10, color: TXT3 },
  timeTxtGuest: { alignSelf: "flex-start" as const },
  timeTxtGuide: { alignSelf: "flex-end" as const },

  // Quick replies
  quickBar:        { maxHeight: 46, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  quickBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" as const },
  quickChip:       { backgroundColor: "#f0fdf4", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#bbf7d0" },
  quickChipTxt:    { color: ACCENT, fontSize: 12, fontWeight: "600" },

  // Input bar
  inputBar:    { backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  inputRow:    { flexDirection: "row", gap: 8, alignItems: "center" },
  quickToggle: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  msgInput:    { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 18, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, color: TXT, fontSize: 13, maxHeight: 88, lineHeight: 19 },
  sendBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sendBtnOff:  { backgroundColor: "#e2e8f0" },
});