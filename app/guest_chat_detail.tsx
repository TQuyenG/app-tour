/**
 * app/guest_chat_detail.tsx
 * Màn hình Chat chi tiết của Khách hàng - ĐÃ FIX: Hiện rõ tên HDV và tên Khách
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useMemo } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GuestChatDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId, type } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [title, setTitle] = useState("Đang tải...");
  const [subTitle, setSubTitle] = useState(""); // Thêm biến chứa phụ đề
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const loadChat = async () => {
    if (!bookingId) return;

    const currentUserRaw = await AsyncStorage.getItem("@app_current_user");
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    const myId = currentUser?.accountId || "";
    setCurrentUserId(myId);

    if (type === "staff") {
       // --- NHÁNH CHAT CSKH ---
       const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
       if (sRaw) {
          const sChats = JSON.parse(sRaw);
          const chatIndex = sChats.findIndex((c: any) => c.id === bookingId);
          if (chatIndex > -1) {
             setTitle(sChats[chatIndex].roomName || "Trung tâm CSKH");
             setSubTitle("Nhân viên hỗ trợ trực tuyến");
             // Xóa chấm đỏ (Đã đọc)
             if (sChats[chatIndex].lastSenderId !== myId) {
                sChats[chatIndex].unreadCount = 0;
                await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));
             }
          } else {
             setTitle("Trung tâm CSKH LocalMate");
             setSubTitle("Nhân viên hỗ trợ trực tuyến");
          }
       } else {
          setTitle("Trung tâm CSKH LocalMate");
          setSubTitle("Nhân viên hỗ trợ trực tuyến");
       }

       const mRaw = await AsyncStorage.getItem('@staff_messages_v3');
       if (mRaw) {
          const msgs = JSON.parse(mRaw).filter((m: any) => m.sessionId === bookingId);
          setMessages(msgs.reverse());
       }
    } else {
       // --- NHÁNH CHAT VỚI HDV ---
       const cRaw = await AsyncStorage.getItem('@app_chats');
       if (cRaw) {
          const chats = JSON.parse(cRaw);
          const chatIndex = chats.findIndex((c: any) => c.id === bookingId || c.bookingId === bookingId);
          if (chatIndex > -1) {
             const chat = chats[chatIndex];
             setTitle(chat.roomName || chat.tourName || "Phòng Chat Tour");
             
             // FIX: Hiện rõ tên HDV và Tên Khách
             setSubTitle(`HDV: ${chat.guideName || "Chưa rõ"} • Khách: ${chat.guestName || "Bạn"}`);
             
             if (chat.lastSenderId !== myId) {
                chat.unreadCount = 0;
                await AsyncStorage.setItem('@app_chats', JSON.stringify(chats));
             }
          } else {
             setTitle("Phòng Chat Tour");
             setSubTitle("Đang kết nối...");
          }
       }
       const mRaw = await AsyncStorage.getItem('@app_messages');
       if (mRaw) {
          const msgs = JSON.parse(mRaw).filter((m: any) => m.sessionId === bookingId || m.sessionId === String(bookingId).replace('chat_', ''));
          setMessages(msgs.reverse());
       }
    }
  };

  useFocusEffect(useCallback(() => { loadChat(); }, [bookingId]));

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sessionId: type === "staff" ? bookingId : String(bookingId).replace('chat_', ''),
      senderId: currentUserId,
      text: inputText.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages([newMsg, ...messages]);
    setInputText("");

    if (type === "staff") {
      const mRaw = await AsyncStorage.getItem('@staff_messages_v3');
      const allMsgs = mRaw ? JSON.parse(mRaw) : [];
      allMsgs.push(newMsg);
      await AsyncStorage.setItem('@staff_messages_v3', JSON.stringify(allMsgs));

      const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
      let sChats = sRaw ? JSON.parse(sRaw) : [];
      let chatIndex = sChats.findIndex((c: any) => c.id === bookingId);
      if (chatIndex > -1) {
         sChats[chatIndex].lastMsg = newMsg.text;
         sChats[chatIndex].lastSenderId = currentUserId;
         sChats[chatIndex].updatedAt = newMsg.createdAt;
      } else {
         sChats.unshift({
            id: bookingId, guestId: currentUserId,
            roomName: "Trung tâm CSKH LocalMate",
            lastMsg: newMsg.text, lastSenderId: currentUserId,
            updatedAt: newMsg.createdAt, unreadCount: 1
         });
      }
      await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));
    } else {
      const mRaw = await AsyncStorage.getItem('@app_messages');
      const allMsgs = mRaw ? JSON.parse(mRaw) : [];
      allMsgs.push(newMsg);
      await AsyncStorage.setItem('@app_messages', JSON.stringify(allMsgs));

      const cRaw = await AsyncStorage.getItem('@app_chats');
      let cChats = cRaw ? JSON.parse(cRaw) : [];
      let chatIndex = cChats.findIndex((c: any) => c.id === bookingId || c.bookingId === bookingId);
      if (chatIndex > -1) {
         cChats[chatIndex].lastMsg = newMsg.text;
         cChats[chatIndex].lastSenderId = currentUserId;
         cChats[chatIndex].updatedAt = newMsg.createdAt;
      }
      await AsyncStorage.setItem('@app_chats', JSON.stringify(cChats));
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUserId;
    const isSystem = item.senderId === "system";

    if (isSystem) {
       return (
         <View style={{alignItems: 'center', marginVertical: 10}}>
            <View style={{backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10}}>
               <Text style={{fontSize: 12, color: '#475569', fontWeight: 'bold'}}>{item.text}</Text>
            </View>
         </View>
       )
    }

    return (
      <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft]}>
        <View style={[s.bubble, isMe ? (type === "staff" ? s.bubbleStaffMe : s.bubbleGuest) : s.bubbleOther]}>
          <Text style={[s.msgTxt, isMe ? {color: '#fff'} : {color: '#0f172a'}]}>{item.text}</Text>
        </View>
        <Text style={s.time}>
          {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="chevron-back" size={24} color="#1e293b" /></TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {/* Cập nhật phụ đề */}
          <Text style={s.statusTxt} numberOfLines={1}>{subTitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderMessage} inverted showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent} />

      <View style={[s.inputArea, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="add-circle-outline" size={24} color="#94a3b8" /></TouchableOpacity>
        <View style={s.textInputWrapper}>
          <TextInput style={s.textInput} placeholder="Nhập tin nhắn..." value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color={inputText.trim() ? (type === "staff" ? "#f59e0b" : "#4f7cff") : "#94a3b8"} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    backBtn: { width: sz(40), height: sz(40), alignItems: "flex-start", justifyContent: "center" },
    headerTitleWrap: { flex: 1, alignItems: "center" },
    headerTitle: { fontSize: sz(16), fontWeight: "800", color: "#1e293b" },
    statusTxt: { fontSize: sz(11), color: "#10b981", fontWeight: "600", marginTop: sz(2) },
    listContent: { paddingHorizontal: sz(16), paddingVertical: sz(20) },
    msgRow: { marginBottom: sz(16), maxWidth: "85%" },
    msgLeft: { alignSelf: "flex-start" },
    msgRight: { alignSelf: "flex-end", alignItems: "flex-end" },
    bubble: { paddingHorizontal: sz(14), paddingVertical: sz(10), borderRadius: sz(20) },
    bubbleGuest: { backgroundColor: "#4f7cff", borderBottomRightRadius: sz(4) },
    bubbleStaffMe: { backgroundColor: "#f59e0b", borderBottomRightRadius: sz(4) },
    bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: sz(4), borderWidth: 1, borderColor: "#e2e8f0" },
    msgTxt: { fontSize: sz(14), lineHeight: sz(20) },
    time: { fontSize: sz(10), color: "#94a3b8", marginTop: sz(4) },
    inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: sz(12), paddingTop: sz(10), gap: sz(6) },
    toolBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center", marginBottom: sz(4) },
    textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: sz(20), borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", paddingHorizontal: sz(12), minHeight: sz(40), marginBottom: sz(10) },
    textInput: { flex: 1, maxHeight: sz(100), paddingTop: sz(10), paddingBottom: sz(10), fontSize: sz(14), color: "#0f172a" },
    sendBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center" }
  });
};