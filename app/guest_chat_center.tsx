/**
 * app/guest_chat_center.tsx
 * Trung tâm Hỗ trợ Trực tuyến dành riêng cho Khách hàng (Guest).
 * Tính năng:
 * - 2 Tab chuyên biệt: Tổng đài Staff & Hướng dẫn viên (Guide).
 * - Lưu trữ LocalStorage độc lập (@chat_user_staff và @chat_user_guide).
 * - Xử lý an toàn dữ liệu (Safe null check) tránh lỗi toLowerCase.
 * - Giao diện Chat hiện đại (Bubble, Time, Unread Badge, Keyboard Avoiding).
 * - Dữ liệu mẫu (Seed Data) vô cùng phong phú và chân thực.
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// =====================================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPESCRIPT INTERFACES)
// =====================================================================
interface ChatMessage {
  id?: string;
  from: "guest" | "staff" | "guide" | "system";
  text: string;
  time: string;
  isRead?: boolean;
}

// Cấu trúc chung để UI dễ render, dù dữ liệu gốc có khác nhau
interface UnifiedChatSession {
  id: string;
  displayTitle: string;    // Tên Staff, Tên HDV hoặc Tiêu đề chung
  displaySubtitle: string; // Tên Tour, Mã Booking, v.v.
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  avatarColor: string;
  avatarChar: string;
  isResolved?: boolean;
  priority?: "urgent" | "normal" | "low";
  messages: ChatMessage[];
  rawData: any;            // Giữ lại dữ liệu gốc để lưu ngược lại Storage
}

// =====================================================================
// 2. DỮ LIỆU MẪU KHỔNG LỒ (SEED DATA) CHO STAFF
// =====================================================================
const SEED_STAFF_CHATS = [
  {
    id: "ch_staff_001",
    topic: "Hỗ trợ hoàn tiền khẩn cấp",
    guestName: "Khách hàng",
    guestId: "guest_current",
    bookingRef: "BK001001",
    lastMessage: "Dạ tiền sẽ về thẻ của anh/chị trong 24h tới ạ.",
    createdAt: "10:30",
    unread: 2,
    resolved: false,
    priority: "urgent",
    messages: [
      { from: "guest", text: "Chào bạn, booking #BK001001 của tôi bị hủy do bão, chừng nào tôi nhận được tiền hoàn?", time: "10:20" },
      { from: "staff", text: "Chào anh/chị, em là Ngọc Linh từ CSKH TourGo. Hệ thống đã xác nhận lệnh hoàn tiền 100% cho booking của mình rồi ạ.", time: "10:25" },
      { from: "staff", text: "Dạ tiền sẽ về thẻ của anh/chị trong 24h tới ạ.", time: "10:30" }
    ]
  },
  {
    id: "ch_staff_002",
    topic: "Tư vấn Tour Phú Quốc",
    guestName: "Khách hàng",
    guestId: "guest_current",
    bookingRef: "",
    lastMessage: "Tour có bao gồm buffet sáng chuẩn 4 sao nha bạn.",
    createdAt: "Hôm qua",
    unread: 0,
    resolved: true,
    priority: "normal",
    messages: [
      { from: "guest", text: "Admin cho mình hỏi Tour Phú Quốc 3N2Đ mã PQ-05 có bao ăn uống đầy đủ không?", time: "15:00" },
      { from: "staff", text: "Dạ chào bạn. Tour mã PQ-05 có bao gồm buffet sáng chuẩn 4 sao tại Resort nha bạn. Các bữa trưa và tối mình sẽ ăn tự túc để thoải mái khám phá đặc sản ạ.", time: "15:10" }
    ]
  },
  {
    id: "ch_staff_003",
    topic: "Lỗi thanh toán ZaloPay",
    guestName: "Khách hàng",
    guestId: "guest_current",
    bookingRef: "BK001055",
    lastMessage: "Bạn thử thao tác lại giúp mình nhé, hệ thống đã ổn định.",
    createdAt: "T2",
    unread: 1,
    resolved: false,
    priority: "normal",
    messages: [
      { from: "guest", text: "App bị lỗi không thanh toán được ZaloPay, cứ báo lỗi mạng.", time: "09:00" },
      { from: "staff", text: "Chào bạn, lúc 09:00 cổng ZaloPay có đợt bảo trì ngắn 15 phút. Bạn thử thao tác lại giúp mình nhé, hệ thống đã ổn định.", time: "09:20" }
    ]
  },
  {
    id: "ch_staff_004",
    topic: "Xác nhận đổi tên khách",
    guestName: "Khách hàng",
    guestId: "guest_current",
    bookingRef: "BK002022",
    lastMessage: "Cảm ơn bạn, tôi thấy vé điện tử cập nhật rồi.",
    createdAt: "T7",
    unread: 0,
    resolved: true,
    priority: "low",
    messages: [
      { from: "guest", text: "Tôi muốn đổi tên hành khách từ Nguyễn Văn A sang Trần Thị B cho booking BK002022.", time: "14:10" },
      { from: "staff", text: "Dạ em đã cập nhật tên hành khách thành Trần Thị B. Em đã gửi lại vé điện tử qua email của mình rồi ạ.", time: "14:25" },
      { from: "guest", text: "Cảm ơn bạn, tôi thấy vé điện tử cập nhật rồi.", time: "14:30" }
    ]
  }
];

// =====================================================================
// 3. DỮ LIỆU MẪU KHỔNG LỒ (SEED DATA) CHO GUIDE (HDV)
// =====================================================================
const SEED_GUIDE_CHATS = [
  {
    id: "ch_guide_001",
    guideName: "Trần Minh Khoa",
    tourName: "Đà Lạt Mộng Mơ 3N2Đ",
    bookingId: "BK001001",
    lastMessage: "6h sáng mai xe Limousine sẽ đón anh/chị ở 70 Trần Phú nhé!",
    lastTime: "08:15",
    unread: 1,
    color: "#10b981",
    messages: [
      { from: "guide", text: "Chào đoàn mình! Em là Khoa, HDV đồng hành cùng gia đình trong chuyến đi Đà Lạt ngày mai.", time: "08:00" },
      { from: "guest", text: "Chào Khoa, anh muốn hỏi mai xe đón ở đâu và mấy giờ?", time: "08:10" },
      { from: "guide", text: "6h sáng mai xe Limousine sẽ đón anh/chị ở 70 Trần Phú nhé! Anh/chị nhớ mang theo áo khoác nhẹ vì Đà Lạt đang se lạnh ạ.", time: "08:15" }
    ]
  },
  {
    id: "ch_guide_002",
    guideName: "Lê Thu Hà",
    tourName: "Phú Quốc 4N3Đ - Nghỉ dưỡng",
    bookingId: "BK001088",
    lastMessage: "Cảm ơn đoàn đã đi cùng Hà ạ ❤️ Chúc anh chị nhiều sức khỏe!",
    lastTime: "Tuần trước",
    unread: 0,
    color: "#ec4899",
    messages: [
      { from: "guest", text: "Cảm ơn em Hà đã nhiệt tình hướng dẫn và chụp ảnh cho cả nhà nhé. Bọn trẻ con rất thích em.", time: "19:00" },
      { from: "guide", text: "Dạ em cảm ơn anh chị rất nhiều. Cảm ơn đoàn đã đi cùng Hà ạ ❤️ Chúc anh chị nhiều sức khỏe! Hẹn gặp lại gia đình ở những chuyến đi sau.", time: "19:15" }
    ]
  },
  {
    id: "ch_guide_003",
    guideName: "Nguyễn Bảo Quốc",
    tourName: "Trekking Langbiang",
    bookingId: "BK003099",
    lastMessage: "Mình nhớ mang giày độ bám tốt nha anh.",
    lastTime: "10:20",
    unread: 3,
    color: "#8b5cf6",
    messages: [
      { from: "guest", text: "Quốc ơi, chiều nay mấy giờ mình bắt đầu leo núi?", time: "10:00" },
      { from: "guide", text: "Dạ 14h00 mình tập trung dưới chân núi nha anh.", time: "10:15" },
      { from: "guide", text: "Trời có vẻ sắp mưa nhẹ, đoàn mình có chuẩn bị áo mưa nilon hết chưa ạ?", time: "10:18" },
      { from: "guide", text: "Mình nhớ mang giày độ bám tốt nha anh.", time: "10:20" }
    ]
  }
];

// Các gợi ý trả lời nhanh cho Khách hàng
const GUEST_QUICK_REPLIES = [
  "Cảm ơn bạn đã hỗ trợ!",
  "Cho mình hỏi chi tiết hơn được không?",
  "Mình đã nhận được thông tin.",
  "Dạ vâng, mình hiểu rồi.",
  "Xe sẽ đón mình ở đâu ạ?",
  "Cho mình xin số điện thoại liên hệ khẩn cấp."
];

// =====================================================================
// 4. MAIN COMPONENT: GUEST CHAT CENTER
// =====================================================================
export default function GuestChatCenter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // --- STATE TỔNG QUAN ---
  const [activeTab, setActiveTab] = useState<"staff" | "guide">("staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE LƯU TRỮ RAW DATA ---
  const [rawStaffChats, setRawStaffChats] = useState<any[]>([]);
  const [rawGuideChats, setRawGuideChats] = useState<any[]>([]);

  // --- STATE CHO CHI TIẾT CHAT ---
  const [activeSession, setActiveSession] = useState<UnifiedChatSession | null>(null);
  const [inputText, setInputText] = useState("");
  const [showQuickReply, setShowQuickReply] = useState(false);

  // =====================================================================
  // 5. DATA FETCHING & NORMALIZATION LOGIC
  // =====================================================================
  
  // Hàm chuyển đổi dữ liệu gốc của Staff thành chuẩn chung
  const normalizeStaffChat = (chat: any): UnifiedChatSession => {
    return {
      id: chat.id,
      displayTitle: "Tổng đài CSKH", // Đối với khách, hiển thị tên chung hoặc tên nhân viên nếu có
      displaySubtitle: chat.topic || "Hỗ trợ dịch vụ",
      lastMessage: chat.lastMessage || "",
      lastTime: chat.createdAt || "Vừa xong",
      unreadCount: chat.unread || 0,
      avatarColor: "#f59e0b", // Màu cam thương hiệu cho Staff
      avatarChar: "S",
      isResolved: chat.resolved,
      priority: chat.priority || "normal",
      messages: chat.messages || [],
      rawData: chat
    };
  };

  // Hàm chuyển đổi dữ liệu gốc của Guide thành chuẩn chung
  const normalizeGuideChat = (chat: any): UnifiedChatSession => {
    return {
      id: chat.id,
      displayTitle: chat.guideName || "Hướng dẫn viên",
      displaySubtitle: chat.tourName || "Tour du lịch",
      lastMessage: chat.lastMessage || chat.lastMsg || "",
      lastTime: chat.lastTime || chat.time || "Vừa xong",
      unreadCount: chat.unread || 0,
      avatarColor: chat.color || "#10b981", // Màu xanh lá cho Guide
      avatarChar: (chat.guideName || "G").charAt(0).toUpperCase(),
      priority: "normal",
      messages: chat.messages || [],
      rawData: chat
    };
  };

  // Load Data từ AsyncStorage
  const loadChatData = async () => {
    try {
      // 1. Load Staff Chats
      const staffRaw = await AsyncStorage.getItem("@chat_user_staff");
      if (staffRaw) {
        setRawStaffChats(JSON.parse(staffRaw));
      } else {
        await AsyncStorage.setItem("@chat_user_staff", JSON.stringify(SEED_STAFF_CHATS));
        setRawStaffChats(SEED_STAFF_CHATS);
      }

      // 2. Load Guide Chats
      const guideRaw = await AsyncStorage.getItem("@chat_user_guide");
      if (guideRaw) {
        setRawGuideChats(JSON.parse(guideRaw));
      } else {
        await AsyncStorage.setItem("@chat_user_guide", JSON.stringify(SEED_GUIDE_CHATS));
        setRawGuideChats(SEED_GUIDE_CHATS);
      }
    } catch (error) {
      console.error("Lỗi load data chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Kích hoạt load data khi vào màn hình và poll mỗi 3 giây để nhận tin nhắn mới
  useFocusEffect(
    useCallback(() => {
      loadChatData();
      const intervalId = setInterval(() => {
        loadChatData();
      }, 3000); // Tương tác thực tế (Real-time giả lập)
      return () => clearInterval(intervalId);
    }, [])
  );

  // Cập nhật lại list đã chuẩn hóa và lọc theo tìm kiếm
  const getProcessedList = (): UnifiedChatSession[] => {
    let list: UnifiedChatSession[] = [];
    
    if (activeTab === "staff") {
      list = rawStaffChats.map(normalizeStaffChat);
    } else {
      list = rawGuideChats.map(normalizeGuideChat);
    }

    // Lọc an toàn (Safe Search) - FIX LỖI TOLOWERCASE TẠI ĐÂY
    const keyword = searchQuery.toLowerCase().trim();
    if (keyword) {
      list = list.filter(item => {
        const title = (item.displayTitle || "").toLowerCase();
        const subtitle = (item.displaySubtitle || "").toLowerCase();
        const msg = (item.lastMessage || "").toLowerCase();
        return title.includes(keyword) || subtitle.includes(keyword) || msg.includes(keyword);
      });
    }

    return list;
  };

  const processedList = getProcessedList();
  const totalUnreadCount = processedList.reduce((sum, item) => sum + item.unreadCount, 0);

  // =====================================================================
  // 6. ACTION HANDLERS (XỬ LÝ SỰ KIỆN)
  // =====================================================================

  // Mở đoạn chat chi tiết
  const handleOpenChat = async (session: UnifiedChatSession) => {
    // Cập nhật state nội bộ
    const updatedSession = { ...session, unreadCount: 0 };
    setActiveSession(updatedSession);

    // Cập nhật AsyncStorage để đánh dấu đã đọc
    try {
      if (activeTab === "staff") {
        const updatedRaw = rawStaffChats.map(c => c.id === session.id ? { ...c, unread: 0 } : c);
        setRawStaffChats(updatedRaw);
        await AsyncStorage.setItem("@chat_user_staff", JSON.stringify(updatedRaw));
      } else {
        const updatedRaw = rawGuideChats.map(c => c.id === session.id ? { ...c, unread: 0 } : c);
        setRawGuideChats(updatedRaw);
        await AsyncStorage.setItem("@chat_user_guide", JSON.stringify(updatedRaw));
      }
    } catch (e) {}

    // Cuộn xuống cuối
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  // Đóng đoạn chat, quay về danh sách
  const handleCloseChat = () => {
    setActiveSession(null);
    setInputText("");
    setShowQuickReply(false);
  };

  // Gửi tin nhắn mới
  const handleSendMessage = async (textToSent?: string) => {
    const finalMsg = (textToSent || inputText).trim();
    if (!finalMsg || !activeSession) return;

    const newMsgObj: ChatMessage = {
      from: "guest",
      text: finalMsg,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Cập nhật State Session Đang mở ngay lập tức để UI mượt
    const newMessages = [...activeSession.messages, newMsgObj];
    setActiveSession({
      ...activeSession,
      messages: newMessages,
      lastMessage: finalMsg,
      lastTime: "Vừa xong"
    });
    
    setInputText("");
    setShowQuickReply(false);

    // Cuộn xuống cuối
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // 2. Lưu vào AsyncStorage và State List tổng
    try {
      if (activeTab === "staff") {
        const updatedRaw = rawStaffChats.map(c => {
          if (c.id === activeSession.id) {
            return {
              ...c,
              messages: [...(c.messages || []), newMsgObj],
              lastMessage: finalMsg,
              createdAt: "Vừa xong" // Dùng chung trường time
            };
          }
          return c;
        });
        setRawStaffChats(updatedRaw);
        await AsyncStorage.setItem("@chat_user_staff", JSON.stringify(updatedRaw));
      } else {
        const updatedRaw = rawGuideChats.map(c => {
          if (c.id === activeSession.id) {
            return {
              ...c,
              messages: [...(c.messages || []), newMsgObj],
              lastMessage: finalMsg,
              lastMsg: finalMsg, // Cover cả 2 key
              lastTime: "Vừa xong",
              time: "Vừa xong"
            };
          }
          return c;
        });
        setRawGuideChats(updatedRaw);
        await AsyncStorage.setItem("@chat_user_guide", JSON.stringify(updatedRaw));
      }
    } catch (e) {
      console.error("Lỗi khi lưu tin nhắn:", e);
    }
  };

  // =====================================================================
  // 7. RENDER: GIAO DIỆN CHI TIẾT TIN NHẮN (DETAIL VIEW)
  // =====================================================================
  if (activeSession) {
    return (
      <KeyboardAvoidingView 
        style={[s.screen, { backgroundColor: '#f8fafc' }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header Chi tiết */}
        <View style={[s.detailHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleCloseChat} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[s.detailAvatar, { backgroundColor: activeSession.avatarColor }]}>
            <Text style={s.detailAvatarTxt}>{activeSession.avatarChar}</Text>
          </View>
          <View style={s.detailHeaderInfo}>
            <Text style={s.detailName} numberOfLines={1}>{activeSession.displayTitle}</Text>
            <Text style={s.detailSub} numberOfLines={1}>{activeSession.displaySubtitle}</Text>
          </View>
          <TouchableOpacity style={s.iconCircleBtn}>
            <Ionicons name="call-outline" size={18} color="#4f7cff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconCircleBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Khung tin nhắn */}
        <FlatList
          ref={flatListRef}
          data={activeSession.messages}
          keyExtractor={(_, index) => `msg_${index}`}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={s.encryptionNotice}>
              <Ionicons name="lock-closed" size={12} color="#94a3b8" />
              <Text style={s.encryptionTxt}>Tin nhắn được mã hóa bảo mật trên hệ thống TourGo.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isGuest = item.from === "guest";
            return (
              <View style={[s.msgWrapper, isGuest ? s.msgWrapperRight : s.msgWrapperLeft]}>
                {!isGuest && (
                  <View style={[s.miniAvatar, { backgroundColor: activeSession.avatarColor }]}>
                    <Text style={s.miniAvatarTxt}>{activeSession.avatarChar}</Text>
                  </View>
                )}
                <View style={isGuest ? s.bubbleBlockRight : s.bubbleBlockLeft}>
                  <View style={[s.bubble, isGuest ? s.bubbleGuest : s.bubbleOther]}>
                    <Text style={[s.bubbleText, isGuest ? s.bubbleTextGuest : s.bubbleTextOther]}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={[s.msgTime, isGuest ? s.msgTimeRight : s.msgTimeLeft]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Gợi ý trả lời nhanh */}
        {showQuickReply && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickReplyContainer} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
            {GUEST_QUICK_REPLIES.map((text, idx) => (
              <TouchableOpacity key={idx} style={s.quickReplyChip} onPress={() => handleSendMessage(text)}>
                <Text style={s.quickReplyTxt}>{text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Khu vực nhập liệu */}
        <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={s.attachBtn}>
            <Ionicons name="add-circle" size={26} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={s.attachBtn} 
            onPress={() => setShowQuickReply(!showQuickReply)}
          >
            <Ionicons name="flash" size={24} color={showQuickReply ? "#f59e0b" : "#94a3b8"} />
          </TouchableOpacity>
          <View style={s.textInputWrapper}>
            <TextInput
              style={s.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity 
            style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} 
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={16} color={inputText.trim() ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // =====================================================================
  // 8. RENDER: GIAO DIỆN DANH SÁCH TỔNG QUAN (LIST VIEW)
  // =====================================================================
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header chính */}
      <View style={[s.mainHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnList}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <View style={s.mainHeaderCenter}>
          <Text style={s.mainTitle}>Trung tâm Hỗ trợ</Text>
          <Text style={s.mainSubTitle}>
            {/* SỬA LẠI TÊN BIẾN Ở DÒNG DƯỚI NÀY */}
            {totalUnreadCount > 0 ? `Bạn có ${totalUnreadCount} tin nhắn mới` : "Phản hồi trong vòng 5 phút"}
          </Text>
        </View>
      </View>

      {/* Tab Switcher: Chuyển đổi Staff / Guide */}
      <View style={s.tabContainer}>
        <TouchableOpacity 
          style={[s.tabItem, activeTab === "staff" && s.tabItemActive]} 
          onPress={() => { setActiveTab("staff"); setSearchQuery(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="headset" size={18} color={activeTab === "staff" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "staff" && s.tabTextActive]}>CSKH TourGo</Text>
          {activeTab !== "staff" && rawStaffChats.reduce((s,c)=>s+(c.unread||0),0) > 0 && <View style={s.tabUnreadDot}/>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[s.tabItem, activeTab === "guide" && s.tabItemActive_Guide]} 
          onPress={() => { setActiveTab("guide"); setSearchQuery(""); }}
          activeOpacity={0.8}
        >
          <Ionicons name="map" size={18} color={activeTab === "guide" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabText, activeTab === "guide" && s.tabTextActive]}>Hướng dẫn viên</Text>
          {activeTab !== "guide" && rawGuideChats.reduce((s,c)=>s+(c.unread||0),0) > 0 && <View style={s.tabUnreadDot}/>}
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={s.searchInput}
            placeholder={activeTab === "staff" ? "Tìm theo mã booking, chủ đề..." : "Tìm theo tên HDV, tên tour..."}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Danh sách Chat */}
      {isLoading ? (
        <View style={s.centerScreen}>
          <ActivityIndicator size="large" color="#4f7cff" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {processedList.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#cbd5e1" />
              </View>
              <Text style={s.emptyTitle}>Không tìm thấy tin nhắn</Text>
              <Text style={s.emptySub}>
                {searchQuery ? "Thử tìm kiếm với từ khóa khác nhé." : "Bạn chưa có cuộc trò chuyện nào ở mục này."}
              </Text>
            </View>
          ) : (
            processedList.map((chat) => {
              const isUrgent = chat.priority === "urgent";
              return (
                <TouchableOpacity 
                  key={chat.id} 
                  style={[s.chatCard, chat.unreadCount > 0 && s.chatCardUnread]}
                  onPress={() => handleOpenChat(chat)}
                  activeOpacity={0.7}
                >
                  <View style={s.chatCardLeft}>
                    <View style={[s.listAvatar, { backgroundColor: chat.avatarColor + "1A" }]}>
                      <Text style={[s.listAvatarTxt, { color: chat.avatarColor }]}>{chat.avatarChar}</Text>
                    </View>
                    {chat.unreadCount > 0 && (
                      <View style={[s.unreadBadge, { backgroundColor: activeTab === "staff" ? "#ef4444" : "#10b981" }]}>
                        <Text style={s.unreadBadgeTxt}>{chat.unreadCount}</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.chatCardMiddle}>
                    <View style={s.cardTopRow}>
                      <Text style={s.cardTitle} numberOfLines={1}>{chat.displayTitle}</Text>
                      <Text style={[s.cardTime, chat.unreadCount > 0 && { color: activeTab === "staff" ? "#4f7cff" : "#10b981", fontWeight: "700" }]}>
                        {chat.lastTime}
                      </Text>
                    </View>
                    <View style={s.cardMidRow}>
                      {isUrgent && (
                        <View style={s.urgentTag}>
                          <Text style={s.urgentTagTxt}>Khẩn</Text>
                        </View>
                      )}
                      <Text style={s.cardSubtitle} numberOfLines={1}>{chat.displaySubtitle}</Text>
                    </View>
                    <Text style={[s.cardLastMsg, chat.unreadCount > 0 && { color: "#1f2a58", fontWeight: "600" }]} numberOfLines={1}>
                      {chat.lastMessage || "Hình ảnh/Tệp đính kèm"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

// =====================================================================
// 9. STYLESHEET (CSS CHO REACT NATIVE)
// =====================================================================
const s = StyleSheet.create({
  // Layout chung
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header Danh sách
  mainHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  backBtnList: { padding: 6, backgroundColor: "#f1f5f9", borderRadius: 12, marginRight: 12 },
  mainHeaderCenter: { flex: 1 },
  mainTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  mainSubTitle: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Tabs
  tabContainer: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "transparent", position: "relative" },
  tabItemActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff", shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  tabItemActive_Guide: { backgroundColor: "#10b981", borderColor: "#10b981", shadowColor: "#10b981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  tabUnreadDot: { position: "absolute", top: 8, right: "15%", width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#f1f5f9" },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: "#0f172a" },

  // List Content
  listContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#334155", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center", paddingHorizontal: 40 },

  // Chat Card
  chatCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  chatCardUnread: { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" },
  chatCardLeft: { position: "relative", marginRight: 14 },
  listAvatar: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  listAvatarTxt: { fontSize: 22, fontWeight: "900" },
  unreadBadge: { position: "absolute", top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", paddingHorizontal: 4 },
  unreadBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },
  
  chatCardMiddle: { flex: 1, minWidth: 0 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  cardTime: { fontSize: 11, color: "#94a3b8" },
  cardMidRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  urgentTag: { backgroundColor: "#fee2e2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  urgentTagTxt: { color: "#ef4444", fontSize: 10, fontWeight: "700" },
  cardSubtitle: { fontSize: 12, color: "#64748b", fontWeight: "600", flex: 1 },
  cardLastMsg: { fontSize: 13, color: "#64748b" },

  // ================= CHI TIẾT CHAT =================
  detailHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  backBtn: { padding: 8 },
  detailAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: 4, marginRight: 12 },
  detailAvatarTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  detailHeaderInfo: { flex: 1, minWidth: 0 },
  detailName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  detailSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  iconCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginLeft: 8 },

  // Message List
  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  encryptionNotice: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f1f5f9", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: "center", marginBottom: 20 },
  encryptionTxt: { fontSize: 10, color: "#94a3b8", fontWeight: "500" },

  msgWrapper: { flexDirection: "row", marginBottom: 16, maxWidth: "85%" },
  msgWrapperLeft: { alignSelf: "flex-start" },
  msgWrapperRight: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  
  miniAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginHorizontal: 8 },
  miniAvatarTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },

  bubbleBlockLeft: { alignItems: "flex-start" },
  bubbleBlockRight: { alignItems: "flex-end" },
  
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleGuest: { backgroundColor: "#4f7cff", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextGuest: { color: "#fff" },
  bubbleTextOther: { color: "#0f172a" },

  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  msgTimeLeft: { marginLeft: 4 },
  msgTimeRight: { marginRight: 4 },

  // Input Area
  quickReplyContainer: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", maxHeight: 50 },
  quickReplyChip: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center" },
  quickReplyTxt: { fontSize: 12, color: "#4f7cff", fontWeight: "500" },

  inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  attachBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  
  textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0", minHeight: 40, maxHeight: 100, justifyContent: "center" },
  textInput: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: "#0f172a" },
  
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: "#cbd5e1" },
});