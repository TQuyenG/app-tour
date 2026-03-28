/**
 * app/admin-livechat-monitor.tsx
 * Admin giám sát chat Staff ↔ User (chỉ đọc, không thấy chat HDV↔User)
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

// Định nghĩa Type và dữ liệu giả (Mock Data) ngay tại đây
export type SharedChatSession = {
  id: string; guestName: string; topic: string; priority: string;
  bookingRef?: string; tourName?: string; amount?: string;
  resolved: boolean; unreadForStaff: number; lastTime: string; lastMessage: string;
  messages: { from: string; text: string; time: string }[];
};

const MOCK_SESSIONS: SharedChatSession[] = [
  {
    id: "1", guestName: "Nguyễn Văn A", topic: "Hỏi về tour Hạ Long", priority: "normal",
    resolved: false, unreadForStaff: 2, lastTime: "10:30", lastMessage: "Cho mình hỏi thêm...",
    messages: [
      { from: "guest", text: "Xin chào", time: "10:28" },
      { from: "staff", text: "Chào bạn, mình có thể giúp gì?", time: "10:29" },
      { from: "guest", text: "Cho mình hỏi thêm...", time: "10:30" }
    ]
  }
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#ef4444", normal: "#f59e0b", low: "#10b981",
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Khẩn", normal: "Thường", low: "Thấp",
};

export default function AdminLivechatMonitor() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [sessions,   setSessions]   = useState<SharedChatSession[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [filterTab,  setFilterTab]  = useState<"all" | "open" | "resolved">("all");

  useFocusEffect(useCallback(() => {
    setSessions(MOCK_SESSIONS);
  }, []));

  const filtered = sessions.filter(s =>
    filterTab === "all" ? true : filterTab === "open" ? !s.resolved : s.resolved
  );

  const activeSession = sessions.find(s => s.id === activeId);

  // ── Detail view (chỉ đọc) ──────────────────────────────
  if (activeId && activeSession) {
    return (
      <View style={st.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={[st.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => setActiveId(null)} style={st.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[st.topAvatar, { backgroundColor: "#f59e0b" }]}>
            <Text style={st.topAvatarTxt}>{activeSession.guestName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.topName}>{activeSession.guestName}</Text>
            <Text style={st.topSub}>{activeSession.topic}</Text>
          </View>
          <View style={[st.priorityBadge, { backgroundColor: PRIORITY_COLOR[activeSession.priority] + "20" }]}>
            <Text style={[st.priorityTxt, { color: PRIORITY_COLOR[activeSession.priority] }]}>
              {PRIORITY_LABEL[activeSession.priority]}
            </Text>
          </View>
        </View>

        {/* Context banner */}
        {activeSession.bookingRef && (
          <View style={st.ctxBar}>
            <Ionicons name="receipt-outline" size={13} color="#1d4ed8" />
            <Text style={st.ctxTxt}>
              <Text style={{ fontWeight: "800" }}>{activeSession.bookingRef}</Text>
              {activeSession.tourName ? ` · ${activeSession.tourName}` : ""}
              {activeSession.amount   ? ` · ${activeSession.amount}`   : ""}
            </Text>
          </View>
        )}

        {/* Read-only banner */}
        <View style={st.readOnlyBanner}>
          <Ionicons name="eye-outline" size={14} color="#7a8cc2" />
          <Text style={st.readOnlyTxt}>Admin chỉ xem — không thể nhắn tin</Text>
        </View>

        <ScrollView contentContainerStyle={st.msgContent}>
          {activeSession.messages.map((msg: { from: string; text: string; time: string }, i: number) => {
            const isStaff = msg.from === "staff";
            return (
              <View key={i} style={[st.msgRow, isStaff ? st.msgRowStaff : st.msgRowGuest]}>
                <View style={[st.miniAvatar, { backgroundColor: isStaff ? "#f59e0b" : "#4f7cff" }]}>
                  {isStaff
                    ? <Ionicons name="headset" size={11} color="#fff" />
                    : <Text style={st.miniAvatarTxt}>{activeSession.guestName.charAt(0)}</Text>
                  }
                </View>
                <View style={isStaff ? st.bubbleColStaff : st.bubbleColGuest}>
                  <Text style={st.senderLabel}>{isStaff ? "CSKH" : activeSession.guestName}</Text>
                  <View style={[st.bubble, isStaff ? st.bubbleStaff : st.bubbleGuest]}>
                    <Text style={[st.bubbleTxt, isStaff ? st.bubbleTxtStaff : st.bubbleTxtGuest]}>{msg.text}</Text>
                  </View>
                  <Text style={[st.timeStamp, isStaff ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>{msg.time}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <AdminTabBar role="admin" activeRoute="/admin-profile" />
      </View>
    );
  }

  // ── List view ─────────────────────────────────────────────
  const totalOpen     = sessions.filter(s => !s.resolved).length;
  const totalUnread   = sessions.reduce((n, s) => n + s.unreadForStaff, 0);
  const totalResolved = sessions.filter(s => s.resolved).length;

  return (
    <View style={st.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[st.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Giám sát Live Chat</Text>
      </View>

      {/* Stats row */}
      <View style={st.statsRow}>
        {[
          { label: "Đang mở",    value: totalOpen,     color: "#4f7cff" },
          { label: "Chờ xử lý",  value: totalUnread,   color: "#ef4444" },
          { label: "Đã giải quyết", value: totalResolved, color: "#10b981" },
        ].map((s2, i) => (
          <View key={i} style={[st.statBox, { backgroundColor: s2.color + "12" }]}>
            <Text style={[st.statVal, { color: s2.color }]}>{s2.value}</Text>
            <Text style={st.statLbl}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <View style={st.filterRow}>
        {(["all", "open", "resolved"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[st.filterBtn, filterTab === tab && st.filterBtnActive]}
            onPress={() => setFilterTab(tab)}>
            <Text style={[st.filterTxt, filterTab === tab && st.filterTxtActive]}>
              {tab === "all" ? "Tất cả" : tab === "open" ? "Đang mở" : "Đã xong"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
        {filtered.map(session => (
          <TouchableOpacity
            key={session.id}
            style={[st.card, session.unreadForStaff > 0 && st.cardUnread]}
            onPress={() => setActiveId(session.id)}
            activeOpacity={0.85}>
            <View style={[st.cardAvatar, { backgroundColor: "#4f7cff" }]}>
              <Text style={st.cardAvatarTxt}>{session.guestName.charAt(0)}</Text>
            </View>
            <View style={st.cardBody}>
              <View style={st.cardRow1}>
                <Text style={st.cardName} numberOfLines={1}>{session.guestName}</Text>
                <Text style={st.cardTime}>{session.lastTime}</Text>
              </View>
              <Text style={st.cardTopic} numberOfLines={1}>{session.topic}</Text>
              <Text style={st.cardLast} numberOfLines={1}>{session.lastMessage}</Text>
              <View style={st.cardMeta}>
                <View style={[st.priorityBadge, { backgroundColor: PRIORITY_COLOR[session.priority] + "18" }]}>
                  <Text style={[st.priorityTxt, { color: PRIORITY_COLOR[session.priority] }]}>
                    {PRIORITY_LABEL[session.priority]}
                  </Text>
                </View>
                {session.resolved
                  ? <View style={st.resolvedBadge}><Text style={st.resolvedTxt}>✓ Đã xong</Text></View>
                  : session.unreadForStaff > 0
                    ? <View style={st.unreadBubble}><Text style={st.unreadTxt}>{session.unreadForStaff} mới</Text></View>
                    : null
                }
                {session.bookingRef && (
                  <View style={st.bkTag}>
                    <Ionicons name="receipt-outline" size={9} color="#2856d6" />
                    <Text style={st.bkTagTxt}>{session.bookingRef}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <AdminTabBar role="admin" activeRoute="/admin-profile" />
    </View>
  );
}

const TXT = "#1f2a58"; const TXT3 = "#94a3b8"; const WHITE = "#fff"; const BORDER = "#e4ebff";

const st = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: "#f3f7ff" },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  iconBtn:    { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  headerTitle:{ flex: 1, fontSize: 18, fontWeight: "800", color: TXT },

  statsRow:  { flexDirection: "row", gap: 10, padding: 14, paddingBottom: 0 },
  statBox:   { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  statVal:   { fontSize: 20, fontWeight: "800" },
  statLbl:   { fontSize: 10, color: TXT3, fontWeight: "600", textAlign: "center" },

  filterRow:     { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  filterBtn:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  filterBtnActive:{ backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt:     { color: TXT3, fontSize: 12, fontWeight: "600" },
  filterTxtActive:{ color: WHITE },

  card:       { flexDirection: "row", gap: 10, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  cardUnread: { borderColor: "#dbeafe", backgroundColor: "#f0f7ff" },
  cardAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardAvatarTxt:{ color: WHITE, fontWeight: "800", fontSize: 17 },
  cardBody:   { flex: 1, minWidth: 0, gap: 2 },
  cardRow1:   { flexDirection: "row", alignItems: "center" },
  cardName:   { fontSize: 14, fontWeight: "700", color: TXT, flex: 1 },
  cardTime:   { fontSize: 11, color: TXT3, paddingLeft: 4 },
  cardTopic:  { fontSize: 11, fontWeight: "600", color: "#4f7cff" },
  cardLast:   { fontSize: 12, color: TXT3 },
  cardMeta:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2, flexWrap: "wrap" },

  priorityBadge:{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priorityTxt:  { fontSize: 10, fontWeight: "700" },
  resolvedBadge:{ backgroundColor: "#f0fdf4", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  resolvedTxt:  { color: "#16a34a", fontSize: 10, fontWeight: "700" },
  unreadBubble: { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  unreadTxt:    { color: "#dc2626", fontSize: 10, fontWeight: "700" },
  bkTag:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#eff6ff", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  bkTagTxt:     { fontSize: 10, fontWeight: "700", color: "#2856d6" },

  // Detail screen
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 8 },
  topAvatar:   { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  topAvatarTxt:{ color: WHITE, fontWeight: "800", fontSize: 14 },
  topName:     { color: TXT, fontWeight: "800", fontSize: 14 },
  topSub:      { color: TXT3, fontSize: 11 },
  ctxBar:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  ctxTxt:      { flex: 1, color: "#1d4ed8", fontSize: 11 },
  readOnlyBanner:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f8fafc", paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BORDER },
  readOnlyTxt: { fontSize: 12, color: TXT3 },
  msgContent:  { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16, gap: 10 },
  msgRow:      { flexDirection: "row", gap: 7 },
  msgRowGuest: { alignSelf: "flex-start" as const, maxWidth: "88%" },
  msgRowStaff: { alignSelf: "flex-end" as const,   maxWidth: "88%", flexDirection: "row-reverse" },
  miniAvatar:  { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" as const },
  miniAvatarTxt:{ fontSize: 10, fontWeight: "800", color: WHITE },
  bubbleColGuest:{ flexShrink: 1, gap: 2, alignItems: "flex-start" as const },
  bubbleColStaff:{ flexShrink: 1, gap: 2, alignItems: "flex-end" as const },
  senderLabel: { fontSize: 10, color: TXT3, fontWeight: "600", paddingHorizontal: 4 },
  bubble:      { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleGuest: { backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  bubbleStaff: { backgroundColor: "#fef3c7", borderBottomRightRadius: 4 },
  bubbleTxt:   { fontSize: 13, lineHeight: 19, flexShrink: 1, flexWrap: "wrap" as const },
  bubbleTxtGuest:{ color: TXT },
  bubbleTxtStaff:{ color: "#92400e" },
  timeStamp:   { fontSize: 10, color: TXT3 },
});