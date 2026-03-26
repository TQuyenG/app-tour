/**
 * app/staff-livechat.tsx
 * Staff hỗ trợ khách qua live chat — UI tối ưu
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

// ─── Types ───────────────────────────────────────────────────
interface ChatMessage {
  from: "guest" | "staff";
  text: string;
  time: string;
  type?: "text" | "image" | "voice" | "booking_ref" | "system";
  isStarred?: boolean;
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

// ─── Seed data ───────────────────────────────────────────────
const SEED_CHATS: ChatSession[] = [
  {
    id: "ch001", guestName: "Nguyễn An", guestId: "acc-guest-1",
    lastMessage: "Booking #BK001001 của tôi bị hủy, cần hoàn tiền gấp",
    unread: 2, resolved: false, createdAt: new Date().toISOString(),
    topic: "Yêu cầu hoàn tiền khẩn", bookingRef: "BK001001",
    tourName: "Đà Lạt Mộng Mơ 3N2D", amount: "2.990.000đ", priority: "urgent",
    messages: [
      { from: "guest", text: "Xin chào CSKH, tour Đà Lạt của tôi bị hủy đột ngột! Tôi không nhận được thông báo nào cả 😡", time: "09:15" },
      { from: "guest", text: "Booking #BK001001, tôi đã thanh toán 2.990.000đ, cần hoàn tiền gấp vì sắp hết hạn thẻ ngày 31/03", time: "09:16" },
      { from: "staff", text: "Xin chào bạn Nguyễn An! Tôi rất tiếc về sự bất tiện này 🙏 Để tôi kiểm tra thông tin booking #BK001001 ngay nhé.", time: "13:40" },
      { from: "staff", text: "Booking #BK001001 bị hủy từ phía nhà cung cấp do sự cố kỹ thuật. Bạn sẽ được hoàn 100% = 2.990.000đ trong vòng 3–5 ngày làm việc.", time: "13:52" },
      { from: "guest", text: "Vậy khi nào tôi nhận được tiền hoàn? Thẻ tôi sắp hết hạn vào 31/03 rồi!", time: "13:47" },
      { from: "guest", text: "Screenshot_hóa_đơn.jpg", time: "13:48", type: "image" },
      { from: "staff", text: "Để đảm bảo tiền về kịp trước 31/03, tôi sẽ escalate lên bộ phận kế toán để xử lý ưu tiên trong hôm nay nhé! 🚀", time: "13:53" },
    ],
  },
  {
    id: "ch002", guestName: "Trần Văn B", guestId: "acc-guest-2",
    lastMessage: "HDV đến trễ 2 tiếng, tôi lỡ mất buổi sáng tham quan",
    unread: 3, resolved: false, createdAt: new Date().toISOString(),
    topic: "Khiếu nại HDV trễ giờ", bookingRef: "BK001002",
    tourName: "Phú Quốc Thiên Đường 4N3D", amount: "4.500.000đ", priority: "urgent",
    messages: [
      { from: "guest", text: "Chào bạn, tôi muốn khiếu nại về chuyến đi Phú Quốc", time: "10:30" },
      { from: "guest", text: "HDV đến trễ 2 tiếng so với lịch hẹn 08:00, không thông báo trước", time: "10:31" },
      { from: "guest", text: "Tôi lỡ mất cả buổi sáng tham quan đảo, rất thất vọng và muốn được đền bù xứng đáng", time: "10:32" },
    ],
  },
  {
    id: "ch006", guestName: "Bùi Thanh K", guestId: "acc-guest-6",
    lastMessage: "Tour cam kết Limousine nhưng lại đón bằng xe 16 chỗ cũ!",
    unread: 4, resolved: false, createdAt: new Date().toISOString(),
    topic: "Tranh chấp dịch vụ không đúng HĐ", bookingRef: "BK001009",
    tourName: "Đà Nẵng - Hội An 4N3D", amount: "5.600.000đ", priority: "urgent",
    messages: [
      { from: "guest", text: "CSKH ơi, tour Đà Nẵng của tôi bị sai dịch vụ rồi!", time: "15:00" },
      { from: "guest", text: "Hợp đồng ghi rõ xe Limousine 9 chỗ, nhưng họ đón tôi bằng xe 16 chỗ cũ kỹ, không có điều hoà", time: "15:01" },
      { from: "guest", text: "Tôi có ảnh bằng chứng đây, bạn xem đi", time: "15:02", type: "image" },
      { from: "guest", text: "Tôi yêu cầu hoàn tiền phần chênh lệch ngay lập tức!", time: "15:03" },
    ],
  },
  {
    id: "ch008", guestName: "Đinh Hải M", guestId: "acc-guest-8",
    lastMessage: "Tôi bỏ quên túi xách trên xe, trong có passport!",
    unread: 2, resolved: false, createdAt: new Date().toISOString(),
    topic: "Mất hành lý trên xe tour", bookingRef: "BK001011",
    tourName: "Nha Trang Express 3N2D", amount: "3.750.000đ", priority: "urgent",
    messages: [
      { from: "guest", text: "CSKH ơi khẩn cấp! Tôi bỏ quên túi xách trên xe tour số BX: 51H-12345", time: "07:30" },
      { from: "guest", text: "Trong túi có passport, ví tiền và điện thoại dự phòng. Rất quan trọng, xử lý ngay giúp tôi!", time: "07:32" },
    ],
  },
  {
    id: "ch009", guestName: "Phan Thị P", guestId: "acc-guest-9",
    lastMessage: "Khách sạn nói không có tên tôi trong danh sách đặt phòng!",
    unread: 3, resolved: false, createdAt: new Date().toISOString(),
    topic: "Khẩn: Lỗi đặt phòng khách sạn", bookingRef: "BK001012",
    tourName: "Đà Lạt Mộng Mơ 3N2D", amount: "2.990.000đ", priority: "urgent",
    messages: [
      { from: "guest", text: "Xin chào, tôi đang ở Đà Lạt và check-in khách sạn thì họ nói không có tên tôi!", time: "18:00" },
      { from: "guest", text: "Booking BK001012, tour Đà Lạt 3N2Đ, khách sạn Lâm Sơn Hotel", time: "18:01" },
      { from: "guest", text: "Nhân viên khách sạn bảo không nhận được thông tin từ công ty tour, giờ tôi không có chỗ ngủ!", time: "18:02" },
    ],
  },
  {
    id: "ch004", guestName: "Phạm Quốc D", guestId: "acc-guest-4",
    lastMessage: "Tôi muốn hỏi về chính sách hủy tour trước 3 ngày",
    unread: 1, resolved: false, createdAt: new Date().toISOString(),
    topic: "Hỏi chính sách hủy tour", priority: "normal",
    messages: [
      { from: "guest", text: "Chào CSKH, cho tôi hỏi nếu hủy tour trước 3 ngày thì được hoàn bao nhiêu % tiền vậy?", time: "11:00" },
    ],
  },
  {
    id: "ch010", guestName: "Nguyễn Minh F", guestId: "acc-guest-10",
    lastMessage: "Tour Hội An có phù hợp cho người cao tuổi không?",
    unread: 1, resolved: false, createdAt: new Date().toISOString(),
    topic: "Tư vấn tour cho người cao tuổi", priority: "normal",
    messages: [
      { from: "guest", text: "Chào bạn, tôi muốn đặt tour Hội An cho bố mẹ 70 tuổi.", time: "09:00" },
      { from: "guest", text: "Tour có đi bộ nhiều không? Bố tôi đi lại khó khăn một chút, cần xe lăn.", time: "09:01" },
    ],
  },
  {
    id: "ch011", guestName: "Lý Hoàng N", guestId: "acc-guest-11",
    lastMessage: "Tôi muốn nâng cấp phòng lên deluxe, thêm bao nhiêu tiền?",
    unread: 2, resolved: false, createdAt: new Date().toISOString(),
    topic: "Yêu cầu nâng cấp phòng KS", bookingRef: "BK001013",
    tourName: "Vũng Tàu Resort Weekend", amount: "2.100.000đ", priority: "normal",
    messages: [
      { from: "guest", text: "Xin chào, booking BK001013 của tôi đang ở phòng standard.", time: "10:00" },
      { from: "guest", text: "Tôi muốn nâng cấp lên phòng deluxe view biển, thêm bao nhiêu tiền vậy?", time: "10:02" },
      { from: "staff", text: "Dạ chào bạn! Phòng Deluxe view biển tại resort chênh lệch 450.000đ/đêm ạ. Tour 3 đêm tổng thêm 1.350.000đ.", time: "10:08" },
      { from: "guest", text: "Để tôi suy nghĩ thêm và trả lời sau nhé bạn ơi", time: "10:10" },
    ],
  },
  {
    id: "ch003", guestName: "Lê Thị C", guestId: "acc-guest-3",
    lastMessage: "Cảm ơn bạn đã hỗ trợ nhiệt tình!",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Đổi ngày tour Sapa", bookingRef: "BK001003",
    tourName: "Sapa Fansipan 3N2D", amount: "3.200.000đ", priority: "low",
    messages: [
      { from: "guest", text: "Xin chào, tôi muốn đổi ngày tour Sapa từ 20/04 sang 25/04", time: "08:00" },
      { from: "staff", text: "Dạ chào bạn! Tour Sapa còn chỗ đến 30/04, tôi cập nhật ngay nhé!", time: "08:03" },
      { from: "staff", text: "Đã cập nhật booking sang 25/04 rồi bạn ơi 🎉 Booking #BK001003 xác nhận ngày mới.", time: "08:07" },
      { from: "guest", text: "Cảm ơn bạn đã hỗ trợ nhiệt tình!", time: "08:10" },
    ],
  },
  {
    id: "ch005", guestName: "Hoàng Thị E", guestId: "acc-guest-5",
    lastMessage: "OK cảm ơn, tôi sẽ chờ email xác nhận",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Chưa nhận email xác nhận", bookingRef: "BK001006",
    tourName: "Hạ Long Bay 2N1D", amount: "1.850.000đ", priority: "low",
    messages: [
      { from: "guest", text: "Tôi đặt tour Hạ Long mà chưa nhận được email xác nhận dù đã 2 tiếng rồi", time: "14:00" },
      { from: "staff", text: "Dạ Booking BK001006 đã xác nhận rồi ạ, email gửi lại vào hộp thư ngay nhé!", time: "14:05" },
      { from: "guest", text: "OK cảm ơn, tôi sẽ chờ email xác nhận", time: "14:08" },
    ],
  },
  {
    id: "ch007", guestName: "Võ Minh L", guestId: "acc-guest-7",
    lastMessage: "Cảm ơn team đã giải quyết nhanh!",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Thêm dịch vụ đặc sản vào booking", bookingRef: "BK001010",
    tourName: "Mũi Né - Phan Thiết 3N2D", amount: "6.250.000đ", priority: "low",
    messages: [
      { from: "guest", text: "Tôi muốn thêm gói bữa ăn đặc sản vào booking BK001010 được không?", time: "16:00" },
      { from: "staff", text: "Dạ được ạ! Gói đặc sản 250.000đ/người × 5 người = 1.250.000đ. Tôi gửi link thanh toán vào email nhé!", time: "16:05" },
      { from: "guest", text: "Tôi đã thanh toán rồi, cảm ơn team đã giải quyết nhanh!", time: "16:20" },
    ],
  },
  {
    id: "ch012", guestName: "Tống Vinh Q", guestId: "acc-guest-12",
    lastMessage: "Cảm ơn, tôi nhận được hóa đơn rồi ạ",
    unread: 0, resolved: true, createdAt: new Date().toISOString(),
    topic: "Yêu cầu hóa đơn VAT", bookingRef: "BK001020",
    tourName: "Cần Thơ Miền Tây 2N1D", amount: "1.680.000đ", priority: "low",
    messages: [
      { from: "guest", text: "Tôi cần xuất hóa đơn VAT cho booking BK001020, công ty tôi cần quyết toán.", time: "12:00" },
      { from: "staff", text: "Dạ vui lòng cung cấp tên công ty và mã số thuế ạ!", time: "12:05" },
      { from: "guest", text: "Công ty TNHH ABC, MST: 0123456789", time: "12:08" },
      { from: "staff", text: "Hóa đơn VAT đã gửi vào email đăng ký rồi bạn ơi! Link tải: invoice.tourcare.vn/BK001020", time: "12:40" },
      { from: "guest", text: "Cảm ơn, tôi nhận được hóa đơn rồi ạ", time: "12:45" },
    ],
  },
];

// ─── Constants ───────────────────────────────────────────────
const PRIORITY_META = {
  urgent: { label: "Khẩn",   color: "#ef4444", bg: "#fef2f2" },
  normal: { label: "Thường", color: "#3b82f6", bg: "#eff6ff" },
  low:    { label: "Thấp",   color: "#94a3b8", bg: "#f8fafc" },
};

const AVATAR_COLORS = [
  "#ef4444","#f97316","#8b5cf6","#3b82f6",
  "#22c55e","#06b6d4","#a855f7","#ec4899",
];

const QUICK_REPLIES = [
  "Dạ tôi kiểm tra ngay cho bạn nhé!",
  "Vui lòng cung cấp mã booking ạ",
  "Xin lỗi vì sự bất tiện, tôi xử lý ngay!",
  "Bạn sẽ được hoàn tiền trong 3–5 ngày",
  "Tôi đã ghi nhận và chuyển bộ phận liên quan",
  "Bạn có thể cung cấp ảnh bằng chứng không ạ?",
];

const getAvatarColor = (id: string): string => {
  const idx = parseInt(id.replace(/\D/g, ""), 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? "#3b82f6";
};

const nowStr = () =>
  new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

// ─── Main Component ──────────────────────────────────────────
export default function StaffLivechat() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [chats, setChats]                       = useState<ChatSession[]>([]);
  const [selected, setSelected]                 = useState<ChatSession | null>(null);
  const [input, setInput]                       = useState("");
  const [filterResolved, setFilterResolved]     = useState(false);
  const [filterPriority, setFilterPriority]     = useState<"all"|"urgent"|"normal">("all");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [searchMsg, setSearchMsg]               = useState("");
  const [showSearch, setShowSearch]             = useState(false);
  const [starredIds, setStarredIds]             = useState<Set<string>>(new Set());
  const [showStarredOnly, setShowStarredOnly]   = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_chats_v3")
      .then(raw => {
        if (raw) setChats(JSON.parse(raw));
        else {
          setChats(SEED_CHATS);
          AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(SEED_CHATS)).catch(() => {});
        }
      })
      .catch(() => setChats(SEED_CHATS));
  }, []));

  const persist = async (data: ChatSession[]) => {
    setChats(data);
    await AsyncStorage.setItem("@staff_chats_v3", JSON.stringify(data)).catch(() => {});
  };

  const openChat = (chat: ChatSession) => {
    const updated = chats.map(c => c.id === chat.id ? { ...c, unread: 0 } : c);
    persist(updated);
    setSelected({ ...chat, unread: 0 });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  };

  const sendMsg = async (text?: string) => {
    const msgText = text ?? input.trim();
    if (!msgText || !selected) return;
    const msg: ChatMessage = { from: "staff", text: msgText, time: nowStr() };
    const updSess: ChatSession = {
      ...selected,
      messages: [...selected.messages, msg],
      lastMessage: msgText,
    };
    setSelected(updSess);
    await persist(chats.map(c => c.id === selected.id ? updSess : c));
    setInput("");
    setShowQuickReplies(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const resolveChat = async () => {
    if (!selected) return;
    Alert.alert("Đóng chat", "Đánh dấu cuộc trò chuyện này đã giải quyết?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận", onPress: async () => {
          const updSess = { ...selected, resolved: true };
          setSelected(updSess);
          await persist(chats.map(c => c.id === selected.id ? updSess : c));
        },
      },
    ]);
  };

  const toggleStar = (idx: number) => {
    if (!selected) return;
    const key = `${selected.id}-${idx}`;
    setStarredIds(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const openCount   = chats.filter(c => !c.resolved).length;
  const urgentCount = chats.filter(c => !c.resolved && c.priority === "urgent").length;

  const listFiltered = chats
    .filter(c => {
      const okResolved = filterResolved ? c.resolved : !c.resolved;
      const okPriority = filterPriority === "all" || c.priority === filterPriority;
      return okResolved && okPriority;
    })
    .sort((a, b) => {
      if (!filterResolved) {
        const p: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
        return p[a.priority] - p[b.priority];
      }
      return 0;
    });

  // ══════════════════════════════════════════════
  //  CHAT DETAIL VIEW
  // ══════════════════════════════════════════════
  if (selected) {
    const pri = PRIORITY_META[selected.priority] ?? PRIORITY_META.normal;
    const ac  = getAvatarColor(selected.guestId);

    const visibleMsgs = selected.messages.filter((m, i) => {
      if (showStarredOnly) return starredIds.has(`${selected.id}-${i}`);
      if (searchMsg)       return m.text.toLowerCase().includes(searchMsg.toLowerCase());
      return true;
    });

    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* ── Top Bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => { setSelected(null); setShowSearch(false); setSearchMsg(""); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>

          <View style={[s.topAvatar, { backgroundColor: ac + "22" }]}>
            <Text style={[s.topAvatarTxt, { color: ac }]}>{selected.guestName.charAt(0)}</Text>
          </View>

          <View style={s.topInfo}>
            <View style={s.topNameRow}>
              <Text style={s.topName} numberOfLines={1}>{selected.guestName}</Text>
              <View style={[s.badge, { backgroundColor: pri.bg }]}>
                <Text style={[s.badgeTxt, { color: pri.color }]}>{pri.label}</Text>
              </View>
            </View>
            <Text style={s.topTopic} numberOfLines={1}>{selected.topic}</Text>
          </View>

          <View style={s.topActions}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => { setShowSearch(v => !v); setSearchMsg(""); }}
            >
              <Ionicons
                name={showSearch ? "close-outline" : "search-outline"}
                size={18} color="#64748b"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, showStarredOnly && { backgroundColor: "#fef3c7" }]}
              onPress={() => setShowStarredOnly(v => !v)}
            >
              <Ionicons
                name={showStarredOnly ? "star" : "star-outline"}
                size={18}
                color={showStarredOnly ? "#f59e0b" : "#64748b"}
              />
            </TouchableOpacity>

            {!selected.resolved && (
              <TouchableOpacity style={s.resolveBtn} onPress={resolveChat}>
                <Ionicons name="checkmark-done-outline" size={13} color="#16a34a" />
                <Text style={s.resolveTxt}>Đóng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Search bar ── */}
        {showSearch && (
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={14} color="#94a3b8" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm trong cuộc trò chuyện..."
              placeholderTextColor="#94a3b8"
              value={searchMsg}
              onChangeText={setSearchMsg}
              autoFocus
            />
            {!!searchMsg && (
              <Text style={s.searchCount}>{visibleMsgs.length} kết quả</Text>
            )}
          </View>
        )}

        {/* ── Context bar ── */}
        {selected.bookingRef && (
          <View style={s.ctxBar}>
            <Ionicons name="receipt-outline" size={12} color="#3b82f6" />
            <Text style={s.ctxTxt} numberOfLines={1}>
              <Text style={s.ctxBold}>{selected.bookingRef}</Text>
              {selected.tourName ? `  ·  ${selected.tourName}` : ""}
              {selected.amount   ? `  ·  ${selected.amount}` : ""}
            </Text>
            <TouchableOpacity onPress={() => router.push("/staff-booking-management" as any)}>
              <Text style={s.ctxLink}>Xem →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Resolved banner ── */}
        {selected.resolved && (
          <View style={s.resolvedBanner}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={s.resolvedTxt}>Cuộc trò chuyện đã đóng và giải quyết</Text>
          </View>
        )}

        {/* ── Messages + Input ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={s.msgList}
            contentContainerStyle={s.msgListContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.sysMsgWrap}>
              <Text style={s.sysMsgTxt}>
                💬 Chat #{selected.id} · {selected.resolved ? "Đã đóng" : "Đang mở"}
              </Text>
            </View>

            {visibleMsgs.map((msg, i) => {
              const isGuest  = msg.from === "guest";
              const key      = `${selected.id}-${i}`;
              const starred  = starredIds.has(key);
              const bColor   = isGuest ? getAvatarColor(selected.guestId) : "#f59e0b";
              const initials = isGuest ? selected.guestName.charAt(0) : "S";

              return (
                <View
                  key={key}
                  style={[s.msgRow, isGuest ? s.msgRowGuest : s.msgRowStaff]}
                >
                  {/* Mini avatar — always rendered on its side */}
                  <View style={[s.miniAvatar, { backgroundColor: bColor + "22" }]}>
                    <Text style={[s.miniAvatarTxt, { color: bColor }]}>{initials}</Text>
                  </View>

                  {/* Bubble column */}
                  <View style={isGuest ? s.bubbleColGuest : s.bubbleColStaff}>
                    <TouchableOpacity
                      onLongPress={() => toggleStar(i)}
                      activeOpacity={0.85}
                      style={[s.bubble, isGuest ? s.bubbleGuest : s.bubbleStaff]}
                    >
                      {msg.type === "image" ? (
                        <View style={s.attachRow}>
                          <View style={[
                            s.attachIcon,
                            isGuest ? s.attachIconGuest : s.attachIconStaff,
                          ]}>
                            <Ionicons
                              name="image-outline" size={14}
                              color={isGuest ? "#3b82f6" : "#92400e"}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                s.attachName,
                                isGuest ? s.bubbleTxtGuest : s.bubbleTxtStaff,
                              ]}
                              numberOfLines={1}
                            >
                              {msg.text}
                            </Text>
                            <Text style={[s.attachSub, isGuest ? { color: "#94a3b8" } : { color: "rgba(0,0,0,0.45)" }]}>
                              Hình ảnh đính kèm
                            </Text>
                          </View>
                        </View>
                      ) : msg.type === "voice" ? (
                        <View style={s.attachRow}>
                          <View style={[s.attachIcon, isGuest ? s.attachIconGuest : s.attachIconStaff]}>
                            <Ionicons name="mic-outline" size={14} color={isGuest ? "#3b82f6" : "#92400e"} />
                          </View>
                          <Text style={[s.bubbleTxt, isGuest ? s.bubbleTxtGuest : s.bubbleTxtStaff]}>
                            {msg.text || "Tin nhắn thoại"}
                          </Text>
                        </View>
                      ) : (
                        /*
                         * CRITICAL FIX: Text wrapping
                         * - No `numberOfLines` limit so text wraps fully
                         * - bubbleTxt uses flexShrink:1 + flexWrap:"wrap"
                         * - bubbleColGuest/Staff use flexShrink:1
                         * - msgRow uses maxWidth:"88%" to bound bubble width
                         */
                        <Text
                          style={[
                            s.bubbleTxt,
                            isGuest ? s.bubbleTxtGuest : s.bubbleTxtStaff,
                          ]}
                        >
                          {msg.text}
                        </Text>
                      )}

                      {starred && (
                        <View style={s.starPin}>
                          <Ionicons name="star" size={8} color="#f59e0b" />
                        </View>
                      )}
                    </TouchableOpacity>

                    <Text style={[s.timeTxt, isGuest ? s.timeTxtGuest : s.timeTxtStaff]}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Quick replies ── */}
          {showQuickReplies && !selected.resolved && (
            <ScrollView
              horizontal
              style={s.qrBar}
              contentContainerStyle={s.qrContent}
              showsHorizontalScrollIndicator={false}
            >
              {QUICK_REPLIES.map(qr => (
                <TouchableOpacity key={qr} style={s.qrChip} onPress={() => sendMsg(qr)}>
                  <Text style={s.qrTxt}>{qr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Input / Closed ── */}
          {selected.resolved ? (
            <View style={s.closedBar}>
              <Ionicons name="lock-closed-outline" size={13} color="#94a3b8" />
              <Text style={s.closedTxt}>Cuộc trò chuyện đã đóng — chỉ đọc</Text>
            </View>
          ) : (
            <View style={s.inputBar}>
              {/* Tool row */}
              <View style={s.toolRow}>
                <TouchableOpacity style={s.toolBtn}>
                  <Ionicons name="attach-outline" size={19} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={s.toolBtn}>
                  <Ionicons name="image-outline" size={19} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={s.toolBtn}>
                  <Ionicons name="mic-outline" size={19} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toolBtn, showQuickReplies && s.toolBtnOn]}
                  onPress={() => setShowQuickReplies(v => !v)}
                >
                  <Ionicons
                    name="flash-outline" size={19}
                    color={showQuickReplies ? "#f59e0b" : "#64748b"}
                  />
                </TouchableOpacity>
              </View>

              {/* Text row — alignItems:"center" aligns send btn with input mid-point */}
              <View style={s.inputRow}>
                <TextInput
                  style={s.textInput}
                  placeholder="Nhập tin nhắn hỗ trợ..."
                  placeholderTextColor="#94a3b8"
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
                <TouchableOpacity
                  style={[s.sendBtn, !input.trim() && s.sendBtnOff]}
                  onPress={() => sendMsg()}
                  disabled={!input.trim()}
                >
                  <Ionicons
                    name="send" size={15}
                    color={input.trim() ? "#fff" : "#94a3b8"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ══════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Live Chat</Text>
          <Text style={s.headerSub}>
            Hôm nay · {new Date().toLocaleDateString("vi-VN")}
          </Text>
        </View>
        <View style={s.headerBadges}>
          {urgentCount > 0 && (
            <View style={[s.hBadge, { backgroundColor: "#fef2f2" }]}>
              <Text style={[s.hBadgeTxt, { color: "#ef4444" }]}>
                🚨 {urgentCount} khẩn
              </Text>
            </View>
          )}
          <View style={[s.hBadge, { backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.hBadgeTxt, { color: "#16a34a" }]}>
              ✅ {openCount} mở
            </Text>
          </View>
        </View>
      </View>

      {/* ── Segment tabs ── */}
      <View style={s.segWrap}>
        {(["open", "resolved"] as const).map(tab => {
          const isActive = (tab === "resolved") === filterResolved;
          const count    = tab === "open"
            ? chats.filter(c => !c.resolved).length
            : chats.filter(c => c.resolved).length;
          const label    = tab === "open" ? `Đang mở (${count})` : `Đã xử lý (${count})`;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.segTab, isActive && s.segTabActive]}
              onPress={() => { setFilterResolved(tab === "resolved"); setFilterPriority("all"); }}
            >
              <Text style={[s.segTxt, isActive && s.segTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Priority filter ── */}
      {!filterResolved && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
          style={s.chipScroll}
        >
          {([
            { key: "all",    label: "🔥 Tất cả" },
            { key: "urgent", label: "🚨 Khẩn cấp" },
            { key: "normal", label: "🔵 Bình thường" },
          ] as const).map(({ key, label }) => {
            const isActive = filterPriority === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.pChip, isActive && s.pChipActive]}
                onPress={() => setFilterPriority(key)}
              >
                <Text style={[s.pChipTxt, isActive && s.pChipTxtActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Chat list ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {listFiltered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTxt}>Không có cuộc trò chuyện nào</Text>
          </View>
        ) : (
          listFiltered.map(chat => {
            const pri      = PRIORITY_META[chat.priority] ?? PRIORITY_META.normal;
            const ac       = getAvatarColor(chat.guestId);
            const isUrgent = chat.priority === "urgent";

            return (
              <TouchableOpacity
                key={chat.id}
                style={[s.card, isUrgent && !chat.resolved && s.cardUrgent]}
                onPress={() => openChat(chat)}
                activeOpacity={0.72}
              >
                {/* Avatar */}
                <View style={[s.cardAvatar, { backgroundColor: ac + "20" }]}>
                  <Text style={[s.cardAvatarTxt, { color: ac }]}>
                    {chat.guestName.charAt(0)}
                  </Text>
                  <View style={[
                    s.onlineDot,
                    { backgroundColor: chat.resolved ? "#94a3b8" : isUrgent ? "#ef4444" : "#22c55e" },
                  ]} />
                </View>

                {/*
                 * CRITICAL: flex:1 + minWidth:0 on cardBody prevents text
                 * from overflowing the card width and clipping off-screen
                 */}
                <View style={s.cardBody}>
                  {/* Row 1: name + badge + unread + time */}
                  <View style={s.cardRow1}>
                    <Text
                      style={s.cardName}
                      numberOfLines={1}
                    >
                      {chat.guestName}
                    </Text>
                    <View style={[s.badge, { backgroundColor: pri.bg, marginLeft: 4 }]}>
                      <Text style={[s.badgeTxt, { color: pri.color }]}>{pri.label}</Text>
                    </View>
                    {chat.unread > 0 && (
                      <View style={s.unreadBubble}>
                        <Text style={s.unreadTxt}>{chat.unread}</Text>
                      </View>
                    )}
                    <Text style={s.cardTime}>
                      {new Date(chat.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {/* Row 2: topic */}
                  <Text style={s.cardTopic} numberOfLines={1}>{chat.topic}</Text>

                  {/* Row 3: last message — ellipsis, single line */}
                  <Text style={s.cardMsg} numberOfLines={1} ellipsizeMode="tail">
                    {chat.lastMessage}
                  </Text>

                  {/* Row 4: booking + tour */}
                  {(chat.bookingRef || chat.tourName) && (
                    <View style={s.cardMeta}>
                      {chat.bookingRef && (
                        <View style={s.bkTag}>
                          <Ionicons name="receipt-outline" size={9} color="#3b82f6" />
                          <Text style={s.bkTagTxt}>{chat.bookingRef}</Text>
                        </View>
                      )}
                      {chat.tourName && (
                        <Text style={s.tourName} numberOfLines={1} ellipsizeMode="tail">
                          {chat.tourName}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <StaffTabBar activeRoute="/staff-livechat" />
    </View>
  );
}

// ─── Design tokens ───────────────────────────────────────────
const BG     = "#f1f5f9";
const WHITE  = "#ffffff";
const BORDER = "#e2e8f0";
const TXT    = "#0f172a";
const TXT3   = "#94a3b8";
const ACCENT = "#f59e0b";
const BLUE   = "#3b82f6";
const MSGBG  = "#eef2f7";

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // ── LIST HEADER ──
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerLeft:   { flex: 1 },
  headerTitle:  { fontSize: 19, fontWeight: "800", color: TXT, letterSpacing: -0.3 },
  headerSub:    { fontSize: 11, color: TXT3, marginTop: 1, fontWeight: "500" },
  headerBadges: { flexDirection: "row", gap: 6, alignItems: "center" },
  hBadge:       { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  hBadgeTxt:    { fontSize: 11, fontWeight: "700" },

  // ── SEGMENTS ──
  segWrap:      { flexDirection: "row", margin: 12, marginBottom: 4, backgroundColor: WHITE, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: BORDER },
  segTab:       { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  segTabActive: { backgroundColor: ACCENT },
  segTxt:       { fontSize: 13, fontWeight: "600", color: TXT3 },
  segTxtActive: { color: WHITE, fontWeight: "700" },

  // ── PRIORITY CHIPS ──
  chipScroll:     { maxHeight: 42, marginBottom: 2 },
  chipRow:        { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: "center" },
  pChip:          { borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE, paddingHorizontal: 12, paddingVertical: 5 },
  pChipActive:    { backgroundColor: ACCENT, borderColor: ACCENT },
  pChipTxt:       { fontSize: 12, fontWeight: "600", color: TXT3 },
  pChipTxtActive: { color: WHITE },

  // ── LIST ──
  listContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 90, gap: 6 },

  // ── CARD ──
  card:       {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  cardUrgent: { borderLeftWidth: 3, borderLeftColor: "#ef4444", paddingLeft: 10 },

  // Card avatar
  cardAvatar:    { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" },
  cardAvatarTxt: { fontSize: 18, fontWeight: "800" },
  onlineDot:     { position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: WHITE },

  // Card body — flex:1 + minWidth:0 = THE key to prevent text overflow
  cardBody:  { flex: 1, minWidth: 0, gap: 2 },
  cardRow1:  { flexDirection: "row", alignItems: "center" },
  cardName:  { fontSize: 14, fontWeight: "700", color: TXT, flexShrink: 1 },
  cardTime:  { fontSize: 11, color: TXT3, marginLeft: "auto" as const, flexShrink: 0, paddingLeft: 4 },
  cardTopic: { fontSize: 11, fontWeight: "600", color: BLUE },
  cardMsg:   { fontSize: 12, color: TXT3 },
  cardMeta:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },

  // Booking tag
  bkTag:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#eff6ff", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  bkTagTxt: { fontSize: 10, fontWeight: "700", color: BLUE },
  tourName: { fontSize: 10, color: TXT3, flexShrink: 1 },

  // Shared badge
  badge:    { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, flexShrink: 0, marginLeft: 4 },
  badgeTxt: { fontSize: 10, fontWeight: "700" },

  // Unread bubble
  unreadBubble: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, marginLeft: 3, flexShrink: 0 },
  unreadTxt:    { color: WHITE, fontSize: 10, fontWeight: "800" },

  // Empty
  emptyBox:  { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40, opacity: 0.35 },
  emptyTxt:  { fontSize: 13, color: TXT3, fontWeight: "600" },

  // ─── DETAIL ─────────────────────────────────────────────────

  // Top bar
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 8 },
  iconBtn:     { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topAvatar:   { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topAvatarTxt:{ fontSize: 14, fontWeight: "800" },
  topInfo:     { flex: 1, minWidth: 0 },
  topNameRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 1 },
  topName:     { fontSize: 14, fontWeight: "800", color: TXT, flexShrink: 1 },
  topTopic:    { fontSize: 11, color: TXT3, fontWeight: "500" },
  topActions:  { flexDirection: "row", gap: 5, alignItems: "center", flexShrink: 0 },

  // Resolve button — height fixed so icon + text align perfectly
  resolveBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    height: 32, paddingHorizontal: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  resolveTxt: { color: "#16a34a", fontWeight: "700", fontSize: 12, lineHeight: 16 },

  // Search
  searchBar:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 14, paddingVertical: 9 },
  searchInput: { flex: 1, color: TXT, fontSize: 13, paddingVertical: 0 },
  searchCount: { color: ACCENT, fontWeight: "700", fontSize: 12 },

  // Context bar
  ctxBar:  { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  ctxTxt:  { flex: 1, color: "#1d4ed8", fontSize: 11, fontWeight: "500" },
  ctxBold: { fontWeight: "800" },
  ctxLink: { color: BLUE, fontWeight: "700", fontSize: 11, flexShrink: 0 },

  // Resolved
  resolvedBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#bbf7d0" },
  resolvedTxt:    { fontSize: 12, color: "#16a34a", fontWeight: "600" },

  // Message list
  msgList:       { flex: 1, backgroundColor: MSGBG },
  msgListContent:{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 8 },

  // System msg
  sysMsgWrap: { alignItems: "center", marginBottom: 4 },
  sysMsgTxt:  { fontSize: 11, color: TXT3, backgroundColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },

  // Message row layout
  // maxWidth:"88%" bounds bubble so text MUST wrap instead of overflow
  msgRow:      { flexDirection: "row", gap: 7 },
  msgRowGuest: { alignSelf: "flex-start", maxWidth: "88%" },
  msgRowStaff: { alignSelf: "flex-end",   maxWidth: "88%", flexDirection: "row-reverse" },

  // Mini avatar
  miniAvatar:    { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end" },
  miniAvatarTxt: { fontSize: 10, fontWeight: "800" },

  // Bubble columns — flexShrink:1 allows column to compress and text to wrap
  bubbleColGuest: { flexShrink: 1, gap: 2, alignItems: "flex-start" },
  bubbleColStaff: { flexShrink: 1, gap: 2, alignItems: "flex-end" },

  // Bubble shell — no fixed width; grows to content, bounded by parent
  bubble:      { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, position: "relative" },
  bubbleGuest: { backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  bubbleStaff: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },

  // Bubble text — flexShrink+flexWrap ensure full wrapping, no clipping
  bubbleTxt:      { fontSize: 13, lineHeight: 19, flexShrink: 1, flexWrap: "wrap" as const },
  bubbleTxtGuest: { color: TXT },
  bubbleTxtStaff: { color: "#1a0f00" },

  // Time stamp
  timeTxt:       { fontSize: 10, fontWeight: "500" },
  timeTxtGuest:  { color: TXT3, alignSelf: "flex-start" as const },
  timeTxtStaff:  { color: TXT3, alignSelf: "flex-end" as const },

  // Attachment bubble
  attachRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  attachIcon:      { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  attachIconGuest: { backgroundColor: "#eff6ff" },
  attachIconStaff: { backgroundColor: "rgba(0,0,0,0.1)" },
  attachName:      { fontSize: 12, fontWeight: "600" },
  attachSub:       { fontSize: 10, marginTop: 1 },

  // Star pin
  starPin: { position: "absolute", top: -5, right: -5, backgroundColor: "#fef3c7", borderRadius: 10, padding: 2, borderWidth: 1, borderColor: "#fde68a" },

  // Quick replies
  qrBar:    { backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER, maxHeight: 46 },
  qrContent:{ paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" },
  qrChip:   { backgroundColor: "#eff6ff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#dbeafe", flexShrink: 0 },
  qrTxt:    { color: BLUE, fontSize: 12, fontWeight: "600" },

  // Input bar
  inputBar: { backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  toolRow:  { flexDirection: "row", gap: 4, marginBottom: 7, alignItems: "center" },
  toolBtn:  { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  toolBtnOn:{ backgroundColor: "#fef3c7" },

  // alignItems:"center" vertically centers send button with text input
  inputRow:  { flexDirection: "row", gap: 8, alignItems: "center" },
  textInput: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    color: TXT,
    fontSize: 13,
    maxHeight: 88,
    lineHeight: 19,
  },
  sendBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sendBtnOff: { backgroundColor: "#e2e8f0" },

  // Closed
  closedBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  closedTxt: { fontSize: 12, color: TXT3, fontWeight: "500" },
});