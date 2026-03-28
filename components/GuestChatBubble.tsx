/**
 * components/GuestChatBubble.tsx
 * Bóng chat nổi toàn app bên Guest — đồng bộ với staff-livechat
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────
interface ChatMessage {
  from: "guest" | "staff";
  text: string;
  time: string;
  type?: "text" | "image" | "voice" | "system";
}

interface ChatSession {
  id: string;
  guestName: string;
  guestId: string;
  lastMessage: string;
  unread: number;
  resolved: boolean;
  createdAt: string;
  topic: string;
  bookingRef?: string;
  priority: "urgent" | "normal" | "low";
  tourName?: string;
  amount?: string;
  messages: ChatMessage[];
}

// ─── Dữ liệu staff hỗ trợ (ảnh avatar) ────────────────────
const STAFF_AVATAR = "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80";
const SUPPORT_IMG  = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=85";

// Ảnh nhóm staff (hiện trong header khi mở chat)
const STAFF_TEAM = [
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
];
const QUICK_TOPICS = [
  { icon: "receipt-outline",        label: "Hỏi về booking",    topic: "Hỏi về booking",    color: "#4f7cff", bg: "#eef2ff" },
  { icon: "refresh-circle-outline", label: "Hoàn tiền",         topic: "Yêu cầu hoàn tiền", color: "#16a34a", bg: "#dcfce7" },
  { icon: "person-outline",         label: "Vấn đề HDV",        topic: "Vấn đề HDV",         color: "#8b5cf6", bg: "#ede9fe" },
  { icon: "card-outline",           label: "Lỗi thanh toán",    topic: "Lỗi thanh toán",     color: "#dc2626", bg: "#fee2e2" },
  { icon: "compass-outline",        label: "Tư vấn tour",       topic: "Tư vấn tour",        color: "#d97706", bg: "#fef3c7" },
  { icon: "shield-checkmark-outline",label: "Khiếu nại",        topic: "Khiếu nại",          color: "#0284c7", bg: "#e0f2fe" },
];

const AVATAR_COLORS = [
  "#ef4444","#f97316","#8b5cf6","#3b82f6",
  "#22c55e","#06b6d4","#a855f7","#ec4899",
];

const nowStr = () =>
  new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

// ─── Auto reply từ staff ─────────────────────────────────────
const AUTO_REPLIES: Record<string, string> = {
  "Hỏi về booking":    "Dạ bạn cho tôi biết mã booking cần hỗ trợ nhé! Tôi sẽ kiểm tra ngay 🔍",
  "Yêu cầu hoàn tiền": "Dạ tôi ghi nhận yêu cầu hoàn tiền của bạn rồi ạ. Vui lòng cung cấp mã booking và lý do để tôi xử lý nhanh nhất 💚",
  "Vấn đề HDV":        "Dạ tôi rất tiếc khi nghe điều đó! Bạn có thể mô tả chi tiết vấn đề với HDV để tôi ghi nhận và xử lý không ạ?",
  "Lỗi thanh toán":    "Dạ tôi hiểu rồi ạ, lỗi thanh toán sẽ được kiểm tra ngay. Bạn cho biết số tiền bị trừ và thời gian giao dịch nhé!",
  "Tư vấn tour":       "Chào bạn! Tôi sẵn sàng tư vấn tour phù hợp nhất cho bạn 🌟 Bạn muốn đi đâu, bao nhiêu người và ngân sách bao nhiêu ạ?",
  "Khiếu nại":         "Dạ tôi tiếp nhận khiếu nại của bạn. Vui lòng mô tả chi tiết sự việc, tôi sẽ escalate lên cấp trên xử lý trong 24h ạ.",
};

const DEFAULT_REPLY = "Dạ xin chào! Tôi đang nhận tin nhắn của bạn. Vui lòng chờ 1-2 phút để CSKH phản hồi ạ 🙏";

export function GuestChatBubble() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // State
  const [open, setOpen]             = useState(false);
  const [session, setSession]       = useState<ChatSession | null>(null);
  const [input, setInput]           = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTopics, setShowTopics] = useState(true);
  const [isTyping, setIsTyping]     = useState(false);

  // Animations
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(600)).current;
  const badgeAnim   = useRef(new Animated.Value(0)).current;

  // Drag position
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Pulse animation khi có unread
  useEffect(() => {
    if (unreadCount > 0 && !open) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [unreadCount, open]);

  // Load session đã có khi component mount (giữ lịch sử chat)
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        const raw = await AsyncStorage.getItem("@guest_chat_session");
        if (raw) {
          const sess: ChatSession = JSON.parse(raw);
          setSession(sess);
          setShowTopics(false);
        }
      } catch {}
    };
    loadExistingSession();
  }, []);

  // Poll realtime: đọc từ @staff_chats_v3 để lấy reply staff gửi trực tiếp
  useEffect(() => {
    const syncFromStaff = async () => {
      try {
        // 1. Luôn đọc từ storage (không dùng state session để tránh stale closure)
        const localRaw = await AsyncStorage.getItem("@guest_chat_session");
        if (!localRaw) return;
        const localSess: ChatSession = JSON.parse(localRaw);

        // 2. Tìm session tương ứng bên staff
        const staffRaw = await AsyncStorage.getItem("@staff_chats_v3");
        if (!staffRaw) return;
        const staffList: ChatSession[] = JSON.parse(staffRaw);
        const staffSess = staffList.find(c => c.id === localSess.id);
        if (!staffSess) return;

        // 3. Nếu staff có nhiều tin hơn → merge vào local + update state
        if (staffSess.messages.length > localSess.messages.length) {
          const merged: ChatSession = {
            ...localSess,
            messages: staffSess.messages,
            lastMessage: staffSess.lastMessage,
            resolved: staffSess.resolved,
          };
          // Lưu storage trước
          await AsyncStorage.setItem("@guest_chat_session", JSON.stringify(merged)).catch(() => {});
          // Rồi mới update state
          setSession(merged);
          setShowTopics(false);

          // Tính unread badge (chỉ khi chat đang đóng)
          const seenRaw = await AsyncStorage.getItem("@guest_chat_seen_count");
          const seen = seenRaw ? parseInt(seenRaw) : 0;
          const staffMsgCount = merged.messages.filter(m => m.from === "staff").length;
          setUnreadCount(prev => open ? prev : Math.max(0, staffMsgCount - seen));
        }
      } catch {}
    };

    // Chạy ngay lập tức 1 lần
    syncFromStaff();
    // Sau đó poll mỗi 3 giây
    const interval = setInterval(syncFromStaff, 3000);
    return () => clearInterval(interval);
  }, [open]); // Chỉ depend vào open, không depend session để tránh stale closure

  const openChat = async () => {
    // Mark as seen — đọc từ storage để chắc chắn có data mới nhất
    try {
      const raw = await AsyncStorage.getItem("@guest_chat_session");
      if (raw) {
        const sess: ChatSession = JSON.parse(raw);
        const staffCount = sess.messages.filter(m => m.from === "staff").length;
        await AsyncStorage.setItem("@guest_chat_seen_count", String(staffCount)).catch(() => {});
        setSession(sess);
        setShowTopics(false);
      }
    } catch {}
    setUnreadCount(0);
    setOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
  };

  const closeChat = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 280, useNativeDriver: true }).start(() => setOpen(false));
  };

  const startSession = async (topic: string) => {
    // Thử tất cả các key profile có thể có
    let guestName = "Khách hàng";
    let guestId = `guest_${Date.now()}`;
    for (const key of ["@guest_profile", "@app_profile", "@guest_account"]) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw);
          if (p.name) { guestName = p.name; break; }
        }
      } catch {}
    }

    const sessionId = `ch_guest_${Date.now()}`;

    const systemMsg: ChatMessage = {
      from: "staff",
      text: `Xin chào ${guestName.split(" ").pop()}! 👋 Tôi là CSKH TourGo. Chủ đề: **${topic}**. Tôi sẽ hỗ trợ bạn ngay ạ!`,
      time: nowStr(),
      type: "system",
    };

    const newSession: ChatSession = {
      id: sessionId,
      guestName,
      guestId,
      lastMessage: `[Khách mới] ${topic}`,
      unread: 1,
      resolved: false,
      createdAt: new Date().toISOString(),
      topic,
      priority: topic.includes("hoàn") || topic.includes("khiếu") || topic.includes("khẩn") ? "urgent" : "normal",
      messages: [systemMsg],
    };
    // Lưu storage TRƯỚC để tránh mất data nếu component unmount
    await AsyncStorage.setItem("@guest_chat_session", JSON.stringify(newSession)).catch(() => {});
    setSession(newSession);
    setShowTopics(false);
    // Push lên staff queue — force unshift dù đã tồn tại
    const staffRaw = await AsyncStorage.getItem("@staff_chats_v3").catch(() => null);
    const staffList: ChatSession[] = staffRaw ? JSON.parse(staffRaw) : [];
    // Xóa session cũ nếu có rồi insert mới lên đầu
    const filtered = staffList.filter(c => c.id !== newSession.id);
    filtered.unshift(newSession);
    await AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(filtered)).catch(() => {});

    // Auto reply sau 1.5s
    setTimeout(async () => {
      const reply = AUTO_REPLIES[topic] || DEFAULT_REPLY;
      await sendStaffReply(newSession, reply);
    }, 1500);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const sendStaffReply = async (currentSession: ChatSession, text: string) => {
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsTyping(false);

    const staffMsg: ChatMessage = { from: "staff", text, time: nowStr() };
    const updated: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, staffMsg],
      lastMessage: text,
    };
    setSession(updated);
    await AsyncStorage.setItem("@guest_chat_session", JSON.stringify(updated)).catch(() => {});

    // Sync lên staff
    const staffRaw2 = await AsyncStorage.getItem("@staff_chats_v3").catch(() => null);
    const staffList2: ChatSession[] = staffRaw2 ? JSON.parse(staffRaw2) : [];
    const staffFiltered2 = staffList2.filter(c => c.id !== updated.id);
    staffFiltered2.unshift(updated);
    await AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(staffFiltered2)).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    let currentSession = session;

    if (!currentSession) {
      // Tạo session mới nếu chưa có topic
      await startSession("Tư vấn chung");
      return;
    }

    const guestMsg: ChatMessage = { from: "guest", text, time: nowStr() };
    const updated: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, guestMsg],
      lastMessage: text,
      unread: (currentSession.unread || 0) + 1, // tăng unread để staff thấy badge
      createdAt: new Date().toISOString(),       // cập nhật time để nổi lên đầu
    };
    // Lưu storage TRƯỚC
    await AsyncStorage.setItem("@guest_chat_session", JSON.stringify(updated)).catch(() => {});
    setSession(updated);

    // Sync lên staff — xóa cũ, insert mới lên ĐẦU để hiện ngay
    const sRaw = await AsyncStorage.getItem("@staff_chats_v3").catch(() => null);
    const sList: ChatSession[] = sRaw ? JSON.parse(sRaw) : [];
    const sFiltered = sList.filter(c => c.id !== updated.id);
    sFiltered.unshift(updated); // luôn đầu danh sách
    await AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(sFiltered)).catch(() => {});

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    // Auto reply từ staff sau 2-4s
    const replies = [
      "Dạ tôi hiểu rồi ạ! Để tôi kiểm tra và phản hồi bạn ngay 🔍",
      "Vâng, tôi ghi nhận rồi ạ. Bạn có thể cung cấp thêm thông tin không?",
      "Cảm ơn bạn! Tôi đang xử lý, vui lòng chờ trong giây lát nhé ⏳",
      "Dạ để tôi kiểm tra hệ thống và phản hồi sớm cho bạn ạ!",
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    setTimeout(() => sendStaffReply(updated, randomReply), 2000 + Math.random() * 2000);
  };

  const newChat = async () => {
    await AsyncStorage.removeItem("@guest_chat_session").catch(() => {});
    await AsyncStorage.removeItem("@guest_chat_seen_count").catch(() => {});
    setSession(null);
    setShowTopics(true);
    setUnreadCount(0);
    setInput("");
    setIsTyping(false);
  };

  // ── Bubble FAB ────────────────────────────────────────────
  const bubbleBottom = insets.bottom + 80;

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <Animated.View
          style={[
            bs.bubbleWrap,
            { bottom: bubbleBottom },
            { transform: [...pan.getTranslateTransform(), { scale: pulseAnim }] },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Tooltip trên bubble */}
          {unreadCount > 0 && (
            <View style={bs.tooltip}>
              <Text style={bs.tooltipTxt}>💬 Tin nhắn mới!</Text>
              <View style={bs.tooltipArrow} />
            </View>
          )}

          <TouchableOpacity
            style={bs.bubbleOuter}
            onPress={openChat}
            activeOpacity={0.9}
          >
            {/* Ring ngoài */}
            <Animated.View style={[bs.bubbleRing, { opacity: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [0.4, 0] }) }]} />
            {/* Avatar */}
            <View style={bs.bubble}>
              <Image source={{ uri: STAFF_AVATAR }} style={bs.bubbleAvatar} />
            </View>
            {/* Online dot */}
            <View style={bs.onlineDot} />
            {/* Unread badge */}
            {unreadCount > 0 && (
              <View style={bs.unreadBadge}>
                <Text style={bs.unreadTxt}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}


      {/* Chat Modal */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={closeChat}
        statusBarTranslucent
      >
        <View style={bs.modalOverlay}>
          <TouchableOpacity style={bs.modalBackdrop} activeOpacity={1} onPress={closeChat} />

          <Animated.View
            style={[bs.chatSheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom }]}
          >
            {/* ── Header gradient ── */}
            <View style={bs.chatHeader}>
              <View style={bs.headerLeft}>
                {/* Nhóm avatar staff xếp chồng */}
                <View style={bs.teamAvatarRow}>
                  {STAFF_TEAM.map((uri, i) => (
                    <Image
                      key={i}
                      source={{ uri }}
                      style={[bs.teamAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]}
                    />
                  ))}
                  <View style={bs.onlineDotHeader} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={bs.headerName}>CSKH TourGo</Text>
                  <View style={bs.headerStatusRow}>
                    <View style={bs.onlineDotSmall} />
                    <Text style={bs.headerStatus}>3 nhân viên đang online</Text>
                  </View>
                </View>
              </View>
              <View style={bs.headerActions}>
                {session && (
                  <TouchableOpacity style={bs.headerBtn} onPress={newChat}>
                    <Ionicons name="create-outline" size={17} color="#4f7cff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={bs.headerBtnClose} onPress={closeChat}>
                  <Ionicons name="chevron-down" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Support image + intro ── */}
            {!session && (
              <View style={bs.introWrap}>
                <Image source={{ uri: SUPPORT_IMG }} style={bs.introImg} resizeMode="cover" />
                <View style={bs.introOverlay} />
                {/* Stats badges */}
                <View style={bs.introBadgeRow}>
                  <View style={bs.introBadge}>
                    <Text style={bs.introBadgeTxt}>⚡ Phản hồi &lt; 2 phút</Text>
                  </View>
                  <View style={[bs.introBadge, { backgroundColor: "rgba(34,197,94,0.85)" }]}>
                    <Text style={bs.introBadgeTxt}>✅ 24/7</Text>
                  </View>
                </View>
                <View style={bs.introContent}>
                  <Text style={bs.introTitle}>Xin chào! 👋</Text>
                  <Text style={bs.introSub}>Đội ngũ CSKH TourGo luôn sẵn sàng hỗ trợ bạn</Text>
                </View>
              </View>
            )}

            {/* ── Topics (chưa chọn topic) ── */}
            {!session && showTopics && (
              <ScrollView style={bs.topicScroll} contentContainerStyle={bs.topicContent} showsVerticalScrollIndicator={false}>
                <Text style={bs.topicTitle}>Bạn cần hỗ trợ gì?</Text>
                <View style={bs.topicGrid}>
                  {QUICK_TOPICS.map(t => (
                    <TouchableOpacity
                      key={t.topic}
                      style={[bs.topicChip, { borderColor: t.color + "30" }]}
                      onPress={() => startSession(t.topic)}
                      activeOpacity={0.8}
                    >
                      <View style={[bs.topicIconWrap, { backgroundColor: t.bg }]}>
                        <Ionicons name={t.icon as any} size={18} color={t.color} />
                      </View>
                      <Text style={[bs.topicLabel, { color: "#1f2a58" }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={bs.topicOrTxt}>— hoặc nhập câu hỏi bên dưới —</Text>
              </ScrollView>
            )}

            {/* ── Messages ── */}
            {session && (
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView
                  ref={scrollRef}
                  style={bs.msgList}
                  contentContainerStyle={bs.msgContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Topic header */}
                  <View style={bs.topicBanner}>
                    <Ionicons name="chatbubbles-outline" size={13} color="#4f7cff" />
                    <Text style={bs.topicBannerTxt}>{session.topic}</Text>
                    <View style={[bs.priorityDot, {
                      backgroundColor: session.priority === "urgent" ? "#ef4444" : "#22c55e"
                    }]} />
                  </View>

                  {session.messages.map((msg, i) => {
                    const isGuest = msg.from === "guest";
                    return (
                      <View key={i} style={[bs.msgRow, isGuest ? bs.msgRowGuest : bs.msgRowStaff]}>
                        {!isGuest && (
                          <Image source={{ uri: STAFF_AVATAR }} style={bs.msgAvatar} />
                        )}
                        <View style={[bs.msgBubble, isGuest ? bs.msgBubbleGuest : bs.msgBubbleStaff]}>
                          {msg.type === "image" ? (
                            <View style={bs.attachRow}>
                              <Ionicons name="image-outline" size={14} color={isGuest ? "#4f7cff" : "#fff"} />
                              <Text style={[bs.msgTxt, isGuest ? bs.msgTxtGuest : bs.msgTxtStaff]}>
                                {msg.text}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[bs.msgTxt, isGuest ? bs.msgTxtGuest : bs.msgTxtStaff]}>
                              {msg.text}
                            </Text>
                          )}
                          <Text style={[bs.msgTime, isGuest ? bs.msgTimeGuest : bs.msgTimeStaff]}>
                            {msg.time}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <View style={[bs.msgRow, bs.msgRowStaff]}>
                      <Image source={{ uri: STAFF_AVATAR }} style={bs.msgAvatar} />
                      <View style={[bs.msgBubble, bs.msgBubbleStaff, bs.typingBubble]}>
                        <Text style={bs.typingTxt}>● ● ●</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Input */}
                <View style={bs.inputBar}>
                  <TouchableOpacity style={bs.attachBtn}>
                    <Ionicons name="image-outline" size={20} color="#7a8cc2" />
                  </TouchableOpacity>
                  <TextInput
                    style={bs.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#b0bdd8"
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                  />
                  <TouchableOpacity
                    style={[bs.sendBtn, !input.trim() && bs.sendBtnOff]}
                    onPress={sendMessage}
                    disabled={!input.trim()}
                  >
                    <Ionicons name="send" size={16} color={input.trim() ? "#fff" : "#b0bdd8"} />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}

            {/* Input khi đang ở topic selection */}
            {!session && (
              <View style={bs.inputBar}>
                <TouchableOpacity style={bs.attachBtn}>
                  <Ionicons name="image-outline" size={20} color="#7a8cc2" />
                </TouchableOpacity>
                <TextInput
                  style={bs.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Hoặc nhập câu hỏi tại đây..."
                  placeholderTextColor="#b0bdd8"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[bs.sendBtn, !input.trim() && bs.sendBtnOff]}
                  onPress={sendMessage}
                  disabled={!input.trim()}
                >
                  <Ionicons name="send" size={16} color={input.trim() ? "#fff" : "#b0bdd8"} />
                </TouchableOpacity>
              </View>
            )}

            {/* Footer trust */}
            <View style={bs.footer}>
              <Ionicons name="shield-checkmark-outline" size={11} color="#7a8cc2" />
              <Text style={bs.footerTxt}>TourGo · Phản hồi trong 1–3 phút · Bảo mật 100%</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const bs = StyleSheet.create({
  // ── Bubble FAB ──────────────────────────────────────────
  bubbleWrap:    { position: "absolute", right: 18, zIndex: 9999, alignItems: "flex-end" },
  bubbleOuter:   { position: "relative", width: 62, height: 62, alignItems: "center", justifyContent: "center" },
  bubbleRing:    { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: "#4f7cff", top: -8, left: -8 },
  bubble:        { width: 60, height: 60, borderRadius: 30, overflow: "hidden", borderWidth: 3, borderColor: "#fff", shadowColor: "#1a3fb0", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 },
  bubbleAvatar:  { width: 60, height: 60, borderRadius: 30 },
  onlineDot:     { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2.5, borderColor: "#fff" },
  unreadBadge:   { position: "absolute", top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2.5, borderColor: "#fff", shadowColor: "#ef4444", shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 },
  unreadTxt:     { color: "#fff", fontSize: 10, fontWeight: "900" },
  tooltip:       { marginBottom: 8, backgroundColor: "#1a3fb0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, shadowColor: "#1a3fb0", shadowOpacity: 0.25, shadowRadius: 8, elevation: 6, alignSelf: "flex-end", marginRight: 4 },
  tooltipTxt:    { color: "#fff", fontSize: 12, fontWeight: "700" },
  tooltipArrow:  { position: "absolute", bottom: -6, right: 16, width: 12, height: 6, backgroundColor: "#1a3fb0", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },

  // ── Modal ────────────────────────────────────────────────
  modalOverlay:  { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.45)" },
  chatSheet:     { backgroundColor: "#f8faff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%", minHeight: "65%", overflow: "hidden", shadowColor: "#1a3fb0", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20 },

  // ── Header ───────────────────────────────────────────────
  chatHeader:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eef2ff" },
  headerLeft:       { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  teamAvatarRow:    { flexDirection: "row", alignItems: "center", position: "relative" },
  teamAvatar:       { width: 36, height: 36, borderRadius: 12, borderWidth: 2.5, borderColor: "#fff" },
  onlineDotHeader:  { position: "absolute", bottom: 0, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#fff" },
  headerName:       { color: "#1a3fb0", fontWeight: "900", fontSize: 15 },
  headerStatusRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDotSmall:   { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e" },
  headerStatus:     { color: "#22c55e", fontSize: 11, fontWeight: "700" },
  headerActions:    { flexDirection: "row", gap: 6 },
  headerBtn:        { width: 34, height: 34, borderRadius: 10, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  headerBtnClose:   { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },

  // ── Intro image ──────────────────────────────────────────
  introWrap:       { height: 130, position: "relative", overflow: "hidden" },
  introImg:        { width: "100%", height: "100%" },
  introOverlay:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,30,100,0.55)" },
  introBadgeRow:   { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 6 },
  introBadge:      { backgroundColor: "rgba(79,124,255,0.85)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  introBadgeTxt:   { color: "#fff", fontSize: 10, fontWeight: "800" },
  introContent:    { position: "absolute", bottom: 16, left: 18 },
  introTitle:      { color: "#fff", fontWeight: "900", fontSize: 20 },
  introSub:        { color: "rgba(255,255,255,0.88)", fontSize: 12, marginTop: 4, lineHeight: 17 },

  // ── Topics ───────────────────────────────────────────────
  topicScroll:   { flex: 1, backgroundColor: "#f8faff" },
  topicContent:  { padding: 16, paddingBottom: 8 },
  topicTitle:    { color: "#1a3fb0", fontWeight: "900", fontSize: 14, marginBottom: 12 },
  topicGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicChip:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11, width: "47%", shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  topicIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  topicLabel:    { fontWeight: "700", fontSize: 12, flex: 1, lineHeight: 17 },
  topicOrTxt:    { color: "#b0bdd8", textAlign: "center", fontSize: 11, marginTop: 14, marginBottom: 4 },

  // ── Messages ─────────────────────────────────────────────
  msgList:        { flex: 1, backgroundColor: "#f0f4ff" },
  msgContent:     { padding: 14, gap: 10, paddingBottom: 8 },
  topicBanner:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6, borderWidth: 1, borderColor: "#e4ebff", shadowColor: "#a0b4e8", shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  topicBannerTxt: { color: "#4f7cff", fontWeight: "700", fontSize: 12, flex: 1 },
  priorityDot:    { width: 8, height: 8, borderRadius: 4 },
  msgRow:         { flexDirection: "row", gap: 8 },
  msgRowGuest:    { justifyContent: "flex-end" },
  msgRowStaff:    { justifyContent: "flex-start" },
  msgAvatar:      { width: 30, height: 30, borderRadius: 10, alignSelf: "flex-end", borderWidth: 2, borderColor: "#fff" },
  msgBubble:      { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  msgBubbleGuest: { backgroundColor: "#4f7cff", borderBottomRightRadius: 4 },
  msgBubbleStaff: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e8eeff", borderBottomLeftRadius: 4 },
  msgTxt:         { fontSize: 13.5, lineHeight: 20 },
  msgTxtGuest:    { color: "#fff", fontWeight: "500" },
  msgTxtStaff:    { color: "#1a3fb0" },
  msgTime:        { fontSize: 9, marginTop: 5 },
  msgTimeGuest:   { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  msgTimeStaff:   { color: "#b0bdd8" },
  attachRow:      { flexDirection: "row", alignItems: "center", gap: 6 },
  typingBubble:   { paddingVertical: 14, paddingHorizontal: 16 },
  typingTxt:      { color: "#c0cbe8", fontSize: 14, letterSpacing: 5 },

  // ── Input ────────────────────────────────────────────────
  inputBar:   { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eef2ff", backgroundColor: "#fff" },
  attachBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "#f0f4ff", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input:      { flex: 1, backgroundColor: "#f0f4ff", borderRadius: 18, borderWidth: 1.5, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 10, color: "#1a3fb0", fontSize: 13, maxHeight: 80, lineHeight: 19 },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", flexShrink: 0, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  sendBtnOff: { backgroundColor: "#e4ebff", shadowOpacity: 0, elevation: 0 },

  // ── Footer ───────────────────────────────────────────────
  footer:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, backgroundColor: "#fff" },
  footerTxt: { color: "#c0cbe8", fontSize: 10, fontWeight: "500" },
});