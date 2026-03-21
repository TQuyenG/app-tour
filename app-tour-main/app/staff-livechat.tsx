/**
 * app/staff-livechat.tsx
 * Staff hỗ trợ khách qua live chat — Phiên bản nâng cấp
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

interface ChatMessage {
  from: "guest" | "staff";
  text: string;
  time: string;
  type?: "text" | "booking_ref" | "action";
}

interface ChatSession {
  id: string; guestName: string; guestId: string;
  lastMessage: string; unread: number;
  resolved: boolean; createdAt: string;
  topic: string; bookingRef?: string;
  priority: "urgent" | "normal" | "low";
  messages: ChatMessage[];
}

const SEED_CHATS: ChatSession[] = [
  {
    id: "ch001", guestName: "Nguyễn An", guestId: "acc-guest-1",
    lastMessage: "Booking #BK001001 của tôi bị hủy, tôi cần hoàn tiền gấp",
    unread: 2, resolved: false, createdAt: new Date().toISOString(),
    topic: "Yêu cầu hoàn tiền khẩn", bookingRef: "BK001001", priority: "urgent",
    messages: [
      { from: "guest", text: "Xin chào CSKH, tour Đà Lạt của tôi bị hủy đột ngột!", time: "09:15" },
      { from: "guest", text: "Booking #BK001001, tôi đã thanh toán 2.990.000đ, cần hoàn tiền gấp vì sắp hết hạn thẻ", time: "09:16" },
    ],
  },
  {
    id: "ch002", guestName: "Trần Văn B", guestId: "acc-guest-2",
    lastMessage: "HDV đến trễ 2 tiếng, tôi lỡ mất buổi sáng tham quan",
    unread: 3, resolved: false, createdAt: new Date().toISOString(),
    topic: "Khiếu nại HDV trễ giờ", bookingRef: "BK001002", priority: "urgent",
    messages: [
      { from: "guest", text: "Chào bạn, tôi muốn khiếu nại về chuyến đi Phú Quốc", time: "10:30" },
      { from: "guest", text: "HDV đến trễ 2 tiếng so với lịch hẹn 08:00, không thông báo trước", time: "10:31" },
      { from: "guest", text: "Tôi lỡ mất buổi sáng tham quan đảo, rất thất vọng và muốn được đền bù", time: "10:32" },
    ],
  },
  {
    id: "ch003", guestName: "Lê Thị C", guestId: "acc-guest-3",
    lastMessage: "Cảm ơn bạn đã hỗ trợ nhiệt tình!",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Đổi ngày tour Sapa", bookingRef: "BK001003", priority: "low",
    messages: [
      { from: "guest", text: "Xin chào, tôi muốn đổi ngày tour Sapa từ 20/04 sang 25/04", time: "08:00" },
      { from: "staff", text: "Dạ chào bạn! Tôi kiểm tra lịch ngay nhé. Tour Sapa còn chỗ đến 30/04 ạ!", time: "08:03" },
      { from: "guest", text: "Tôi muốn đổi sang 25/04 được không?", time: "08:05" },
      { from: "staff", text: "Dạ được bạn ơi! Tôi đã cập nhật booking sang 25/04 cho bạn rồi nhé 🎉 Booking #BK001003 đã được xác nhận ngày mới.", time: "08:07" },
      { from: "guest", text: "Cảm ơn bạn đã hỗ trợ nhiệt tình!", time: "08:10" },
    ],
  },
  {
    id: "ch004", guestName: "Phạm Quốc D", guestId: "acc-guest-4",
    lastMessage: "Tôi muốn hỏi về chính sách hủy tour",
    unread: 1, resolved: false, createdAt: new Date().toISOString(),
    topic: "Hỏi chính sách hủy tour", priority: "normal",
    messages: [
      { from: "guest", text: "Chào CSKH, cho tôi hỏi nếu hủy tour trước 3 ngày thì được hoàn bao nhiêu % tiền vậy?", time: "11:00" },
    ],
  },
  {
    id: "ch005", guestName: "Hoàng Thị E", guestId: "acc-guest-5",
    lastMessage: "OK cảm ơn, tôi sẽ chờ email xác nhận",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Chưa nhận email xác nhận", bookingRef: "BK001006", priority: "low",
    messages: [
      { from: "guest", text: "Tôi đặt tour Hạ Long mà chưa nhận được email xác nhận dù đã 2 tiếng rồi", time: "14:00" },
      { from: "staff", text: "Dạ tôi kiểm tra ngay! Booking BK001006 đã xác nhận rồi ạ, hệ thống gửi mail hơi chậm.", time: "14:05" },
      { from: "staff", text: "Email xác nhận đã được gửi lại, bạn vui lòng kiểm tra hộp thư Spam hoặc Promotions nhé!", time: "14:06" },
      { from: "guest", text: "OK cảm ơn, tôi sẽ chờ email xác nhận", time: "14:08" },
    ],
  },
  {
    id: "ch006", guestName: "Bùi Thanh K", guestId: "acc-guest-6",
    lastMessage: "Tour cam kết Limousine nhưng lại đón bằng xe 16 chỗ cũ!",
    unread: 4, resolved: false, createdAt: new Date().toISOString(),
    topic: "Tranh chấp dịch vụ không đúng hợp đồng", bookingRef: "BK001009", priority: "urgent",
    messages: [
      { from: "guest", text: "CSKH ơi, tour Đà Nẵng của tôi bị lừa rồi!", time: "15:00" },
      { from: "guest", text: "Hợp đồng ghi rõ xe Limousine 9 chỗ, nhưng họ đón tôi bằng xe 16 chỗ cũ kỹ", time: "15:01" },
      { from: "guest", text: "Tôi có ảnh bằng chứng đây, bạn xem đi", time: "15:02" },
      { from: "guest", text: "Tôi yêu cầu hoàn tiền ngay lập tức!", time: "15:03" },
    ],
  },
  {
    id: "ch007", guestName: "Võ Minh L", guestId: "acc-guest-7",
    lastMessage: "Cảm ơn team đã giải quyết nhanh!",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Thêm dịch vụ đặc sản vào booking", bookingRef: "BK001010", priority: "low",
    messages: [
      { from: "guest", text: "Tôi muốn thêm gói bữa ăn đặc sản vào booking BK001010 được không?", time: "16:00" },
      { from: "staff", text: "Dạ được ạ! Gói bữa ăn đặc sản thêm 250.000đ/người. Booking của bạn có 5 người, tổng thêm 1.250.000đ.", time: "16:05" },
      { from: "staff", text: "Tôi gửi link thanh toán bổ sung vào email đăng ký nhé!", time: "16:06" },
      { from: "guest", text: "Vậy tôi thanh toán rồi, cảm ơn team đã giải quyết nhanh!", time: "16:20" },
    ],
  },
];

const PRIORITY_META = {
  urgent: { label: "Khẩn", color: "#dc2626", bg: "#fee2e2" },
  normal: { label: "Bình thường", color: "#2856d6", bg: "#eaf0ff" },
  low:    { label: "Thấp", color: "#94a3b8", bg: "#f1f5f9" },
};

const QUICK_REPLIES = [
  "Dạ tôi kiểm tra ngay cho bạn nhé!",
  "Vui lòng cung cấp mã booking để tôi hỗ trợ ạ",
  "Tôi đã ghi nhận vấn đề và sẽ xử lý trong 24h",
  "Xin lỗi vì sự bất tiện này, chúng tôi sẽ giải quyết sớm nhất!",
  "Bạn có thể cung cấp ảnh hoặc bằng chứng không ạ?",
];

const nowStr = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export default function StaffLivechat() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [chats, setChats]                     = useState<ChatSession[]>([]);
  const [selected, setSelected]               = useState<ChatSession | null>(null);
  const [input, setInput]                     = useState("");
  const [filterResolved, setFilterResolved]   = useState(false);
  const [filterPriority, setFilterPriority]   = useState<"all"|"urgent"|"normal">("all");
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_chats").then(raw => {
      if (raw) setChats(JSON.parse(raw));
      else {
        setChats(SEED_CHATS);
        AsyncStorage.setItem("@staff_chats", JSON.stringify(SEED_CHATS)).catch(() => {});
      }
    }).catch(() => setChats(SEED_CHATS));
  }, []));

  const persist = async (data: ChatSession[]) => {
    setChats(data);
    await AsyncStorage.setItem("@staff_chats", JSON.stringify(data)).catch(() => {});
  };

  const openChat = (chat: ChatSession) => {
    const updated = chats.map(c => c.id === chat.id ? { ...c, unread: 0 } : c);
    persist(updated);
    setSelected({ ...chat, unread: 0 });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendMsg = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || !selected) return;
    const msg: ChatMessage = { from: "staff", text: msgText, time: nowStr() };
    const updatedSession = { ...selected, messages: [...selected.messages, msg], lastMessage: msgText };
    setSelected(updatedSession);
    const updatedChats = chats.map(c => c.id === selected.id ? updatedSession : c);
    await persist(updatedChats);
    setInput("");
    setShowQuickReplies(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const resolveChat = async () => {
    if (!selected) return;
    Alert.alert("Đóng chat", "Đánh dấu cuộc trò chuyện này đã được giải quyết?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          const updatedSession = { ...selected, resolved: true };
          setSelected(updatedSession);
          await persist(chats.map(c => c.id === selected.id ? updatedSession : c));
        },
      },
    ]);
  };

  const openCount   = chats.filter(c => !c.resolved).length;
  const urgentCount = chats.filter(c => !c.resolved && c.priority === "urgent").length;

  const listFiltered = chats.filter(c => {
    const matchResolved = filterResolved ? c.resolved : !c.resolved;
    const matchPriority = filterPriority === "all" ? true : c.priority === filterPriority;
    return matchResolved && matchPriority;
  }).sort((a, b) => {
    if (!filterResolved) {
      const pri = { urgent: 0, normal: 1, low: 2 };
      return pri[a.priority] - pri[b.priority];
    }
    return 0;
  });

  // ── Chat detail view ───────────────────────────────────────
  if (selected) {
    const priMeta = PRIORITY_META[selected.priority] ?? PRIORITY_META.normal;
    return (
      <View style={s.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Top Bar */}
        <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2a58" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={s.headerTitle}>{selected.guestName}</Text>
              <View style={[s.priBadge, { backgroundColor: priMeta.bg }]}>
                <Text style={[s.priBadgeTxt, { color: priMeta.color }]}>{priMeta.label}</Text>
              </View>
            </View>
            <Text style={s.headerSub} numberOfLines={1}>{selected.topic}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {selected.bookingRef && (
              <TouchableOpacity
                style={s.refBtn}
                onPress={() => router.push("/staff-booking-management" as any)}
              >
                <Ionicons name="receipt-outline" size={14} color="#2856d6" />
                <Text style={s.refBtnTxt}>{selected.bookingRef}</Text>
              </TouchableOpacity>
            )}
            {!selected.resolved && (
              <TouchableOpacity style={s.resolveBtn} onPress={resolveChat}>
                <Ionicons name="checkmark-done-outline" size={15} color="#16a34a" />
                <Text style={s.resolveTxt}>Đóng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Context Bar */}
        {selected.bookingRef && (
          <View style={s.contextBar}>
            <Ionicons name="information-circle-outline" size={14} color="#2856d6" />
            <Text style={s.contextTxt}>Liên quan đến booking <Text style={{ fontWeight: "800" }}>{selected.bookingRef}</Text> · {selected.topic}</Text>
            <TouchableOpacity onPress={() => router.push("/staff-booking-management" as any)}>
              <Text style={s.contextLink}>Xem →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.msgList}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={s.systemMsg}>
            <Text style={s.systemMsgTxt}>💬 Chat #{selected.id} · {selected.resolved ? "Đã đóng" : "Đang mở"}</Text>
          </View>
          {selected.messages.map((m, i) => (
            <View key={i} style={[s.bubbleWrap, m.from === "staff" ? s.bubbleWrapStaff : s.bubbleWrapGuest]}>
              {m.from === "guest" && (
                <View style={s.avatarSmall}>
                  <Text style={s.avatarSmallTxt}>{selected.guestName.charAt(0)}</Text>
                </View>
              )}
              <View style={[s.bubble, m.from === "staff" ? s.bubbleStaff : s.bubbleGuest]}>
                <Text style={[s.bubbleTxt, m.from === "staff" && { color: "#fff" }]}>{m.text}</Text>
                <Text style={[s.bubbleTime, m.from === "staff" && { color: "rgba(255,255,255,0.7)" }]}>{m.time}</Text>
              </View>
              {m.from === "staff" && (
                <View style={s.staffAvatarSmall}>
                  <Ionicons name="headset" size={13} color="#f59e0b" />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Quick Replies */}
        {showQuickReplies && !selected.resolved && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickReplyWrap} contentContainerStyle={s.quickReplyContent}>
            {QUICK_REPLIES.map((qr, i) => (
              <TouchableOpacity key={i} style={s.quickReplyChip} onPress={() => sendMsg(qr)}>
                <Text style={s.quickReplyTxt} numberOfLines={1}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Row */}
        {!selected.resolved ? (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={[s.inputRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
              <TouchableOpacity style={s.quickReplyToggle} onPress={() => setShowQuickReplies(v => !v)}>
                <Ionicons name="flash" size={18} color={showQuickReplies ? "#f59e0b" : "#94a3b8"} />
              </TouchableOpacity>
              <TextInput
                style={s.chatInput}
                value={input}
                onChangeText={setInput}
                placeholder="Nhập tin nhắn hỗ trợ..."
                placeholderTextColor="#b0bdd8"
                multiline
              />
              <TouchableOpacity style={[s.sendBtn, !input.trim() && { opacity: 0.5 }]} onPress={() => sendMsg()} disabled={!input.trim()}>
                <Ionicons name="send" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={[s.closedBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
            <Ionicons name="lock-closed-outline" size={16} color="#7a8cc2" />
            <Text style={s.closedTxt}>Cuộc trò chuyện đã được đóng</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Chat list view ─────────────────────────────────────────
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Live Chat</Text>
          <Text style={s.headerSub}>{openCount} đang mở · {urgentCount} khẩn cấp</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {urgentCount > 0 && (
            <View style={s.urgentBadge}>
              <Ionicons name="alert-circle" size={12} color="#dc2626" />
              <Text style={s.urgentBadgeTxt}>{urgentCount} khẩn</Text>
            </View>
          )}
          {openCount > 0 && (
            <View style={s.openBadge}>
              <Text style={s.openBadgeTxt}>{openCount} mở</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.segmentRow}>
        <TouchableOpacity
          style={[s.segment, !filterResolved && s.segmentActive]}
          onPress={() => setFilterResolved(false)}
        >
          <Text style={[s.segmentTxt, !filterResolved && s.segmentTxtActive]}>Đang mở ({openCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.segment, filterResolved && s.segmentActive]}
          onPress={() => setFilterResolved(true)}
        >
          <Text style={[s.segmentTxt, filterResolved && s.segmentTxtActive]}>Đã đóng ({chats.filter(c => c.resolved).length})</Text>
        </TouchableOpacity>
      </View>

      {/* Priority Filter */}
      {!filterResolved && (
        <View style={s.priorityRow}>
          {(["all","urgent","normal"] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.priorityChip, filterPriority === p && s.priorityChipActive]}
              onPress={() => setFilterPriority(p)}
            >
              <Text style={[s.priorityChipTxt, filterPriority === p && s.priorityChipTxtActive]}>
                {p === "all" ? "Tất cả" : p === "urgent" ? "🚨 Khẩn cấp" : "Bình thường"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 96 }]}>
        {listFiltered.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có cuộc trò chuyện nào</Text>
          </View>
        ) : (
          listFiltered.map(c => {
            const priMeta = PRIORITY_META[c.priority] ?? PRIORITY_META.normal;
            return (
              <TouchableOpacity key={c.id} style={[s.chatCard, c.priority === "urgent" && !c.resolved && s.chatCardUrgent]} onPress={() => openChat(c)} activeOpacity={0.8}>
                <View style={[s.avatar, { backgroundColor: c.resolved ? "#e4ebff" : c.priority === "urgent" ? "#fee2e2" : "#fef3c7" }]}>
                  <Text style={[s.avatarTxt, { color: c.resolved ? "#7a8cc2" : c.priority === "urgent" ? "#dc2626" : "#f59e0b" }]}>
                    {c.guestName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.chatHeaderRow}>
                    <Text style={s.guestName}>{c.guestName}</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <View style={[s.priBadge, { backgroundColor: priMeta.bg }]}>
                        <Text style={[s.priBadgeTxt, { color: priMeta.color }]}>{priMeta.label}</Text>
                      </View>
                      {c.unread > 0 && (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadTxt}>{c.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={s.topicTxt} numberOfLines={1}>{c.topic}</Text>
                  <Text style={s.lastMsg} numberOfLines={1}>{c.lastMessage}</Text>
                  {c.bookingRef && (
                    <View style={s.refTag}>
                      <Ionicons name="receipt-outline" size={10} color="#2856d6" />
                      <Text style={s.refTagTxt}>{c.bookingRef}</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View style={[s.statusDot, { backgroundColor: c.resolved ? "#c0cbe8" : c.priority === "urgent" ? "#dc2626" : "#16a34a" }]} />
                  <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <StaffTabBar activeRoute="/staff-livechat" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:           { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:       { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub:         { fontSize: 11, color: "#7a8cc2", marginTop: 2, fontWeight: "500" },
  urgentBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  urgentBadgeTxt:    { color: "#dc2626", fontWeight: "800", fontSize: 11 },
  openBadge:         { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  openBadgeTxt:      { color: "#16a34a", fontWeight: "800", fontSize: 11 },
  segmentRow:        { flexDirection: "row", marginHorizontal: 16, marginTop: 12, marginBottom: 0, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  segment:           { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  segmentActive:     { backgroundColor: "#f59e0b" },
  segmentTxt:        { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  segmentTxtActive:  { color: "#fff" },
  priorityRow:       { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  priorityChip:      { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6 },
  priorityChipActive:{ backgroundColor: "#dc2626", borderColor: "#dc2626" },
  priorityChipTxt:   { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  priorityChipTxtActive: { color: "#fff" },
  content:           { paddingHorizontal: 16, paddingTop: 10 },
  emptyCard:         { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 40, alignItems: "center", gap: 10 },
  emptyTxt:          { color: "#7a8cc2", fontWeight: "600" },

  chatCard:          { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  chatCardUrgent:    { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  avatar:            { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarTxt:         { fontWeight: "800", fontSize: 18 },
  chatHeaderRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3, justifyContent: "space-between" },
  guestName:         { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  priBadge:          { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priBadgeTxt:       { fontSize: 10, fontWeight: "700" },
  unreadBadge:       { backgroundColor: "#ef4444", borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadTxt:         { color: "#fff", fontSize: 10, fontWeight: "800" },
  topicTxt:          { color: "#2856d6", fontSize: 11, fontWeight: "600", marginBottom: 3 },
  lastMsg:           { color: "#7a8cc2", fontSize: 12 },
  refTag:            { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  refTagTxt:         { color: "#2856d6", fontSize: 10, fontWeight: "700" },
  statusDot:         { width: 8, height: 8, borderRadius: 4 },

  // Chat detail
  refBtn:            { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  refBtnTxt:         { color: "#2856d6", fontSize: 11, fontWeight: "700" },
  resolveBtn:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  resolveTxt:        { color: "#16a34a", fontWeight: "700", fontSize: 12 },
  contextBar:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#eaf0ff", paddingHorizontal: 18, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#dde8ff" },
  contextTxt:        { flex: 1, color: "#2856d6", fontSize: 11, fontWeight: "500" },
  contextLink:       { color: "#2856d6", fontWeight: "700", fontSize: 11 },
  msgList:           { flex: 1 },
  systemMsg:         { alignItems: "center", marginBottom: 14 },
  systemMsgTxt:      { color: "#94a3b8", fontSize: 11, fontWeight: "600", backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  bubbleWrap:        { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  bubbleWrapGuest:   { alignSelf: "flex-start", maxWidth: "85%" },
  bubbleWrapStaff:   { alignSelf: "flex-end", maxWidth: "85%", flexDirection: "row-reverse" },
  avatarSmall:       { width: 28, height: 28, borderRadius: 8, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarSmallTxt:    { color: "#2856d6", fontWeight: "800", fontSize: 12 },
  staffAvatarSmall:  { width: 28, height: 28, borderRadius: 8, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble:            { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleGuest:       { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderBottomLeftRadius: 4 },
  bubbleStaff:       { backgroundColor: "#f59e0b", borderBottomRightRadius: 4 },
  bubbleTxt:         { color: "#1f2a58", fontSize: 13, lineHeight: 20 },
  bubbleTime:        { color: "#94a3b8", fontSize: 10, marginTop: 5, alignSelf: "flex-end" },
  quickReplyWrap:    { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f0f4ff", maxHeight: 48 },
  quickReplyContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 8, alignItems: "center" },
  quickReplyChip:    { backgroundColor: "#eaf0ff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  quickReplyTxt:     { color: "#2856d6", fontSize: 12, fontWeight: "600" },
  inputRow:          { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e4ebff", alignItems: "flex-end" },
  quickReplyToggle:  { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  chatInput:         { flex: 1, backgroundColor: "#f3f7ff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 10, color: "#1f2a58", fontSize: 14, maxHeight: 100 },
  sendBtn:           { width: 44, height: 44, borderRadius: 13, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center" },
  closedBar:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 14, paddingHorizontal: 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e4ebff" },
  closedTxt:         { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
});