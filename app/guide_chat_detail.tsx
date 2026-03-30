/**
 * app/guide_chat_detail.tsx
 * Màn hình Chat chi tiết dành cho HDV - ĐÃ FIX HIỆN TÊN & SĐT CHÉO
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useMemo } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GuideChatDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId, type } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [title, setTitle] = useState("Đang tải...");
  const [subTitle, setSubTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [currentGuideId, setCurrentGuideId] = useState("");

  const loadChat = async () => {
    if (!bookingId) return;

    const currentUserRaw = await AsyncStorage.getItem("@app_current_user");
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    const myId = currentUser?.accountId || "";
    setCurrentGuideId(myId);

    if (type === "staff") {
       const sRaw = await AsyncStorage.getItem('@staff_chats_v3');
       if (sRaw) {
          const sChats = JSON.parse(sRaw);
          const chatIndex = sChats.findIndex((c: any) => c.id === bookingId);
          if (chatIndex > -1) {
             setTitle(sChats[chatIndex].roomName || "Trung tâm CSKH");
             setSubTitle("Nhân viên hỗ trợ trực tuyến");
             if (sChats[chatIndex].lastSenderId !== myId) {
                sChats[chatIndex].unreadCount = 0;
                await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));
             }
          } else {
             setTitle("Trung tâm CSKH");
             setSubTitle("Nhân viên hỗ trợ trực tuyến");
          }
       }
       const mRaw = await AsyncStorage.getItem('@staff_messages_v3');
       if (mRaw) setMessages(JSON.parse(mRaw).filter((m: any) => m.sessionId === bookingId).reverse());
    } else {
       // --- NHÁNH CHAT VỚI KHÁCH: Lấy SĐT từ Booking ---
       let gName = "Bạn"; let cName = "Khách"; let gPhone = "---"; let cPhone = "---";
       let roomTitle = "Phòng Chat Tour";

       const bRaw = await AsyncStorage.getItem("@guest_bookings");
       if (bRaw) {
          const bookings = JSON.parse(bRaw);
          const b = bookings.find((x: any) => x.id === bookingId || `chat_${x.id}` === bookingId);
          if (b) {
             roomTitle = `[${b.id}] ${b.tourName || "Tour"}`;
             gName = (b.guideName && !b.guideName.includes("Hệ thống")) ? b.guideName : "Bạn";
             cName = b.customerName || "Khách";
             cPhone = b.customerPhone || "---";
             gPhone = b.guidePhone || "---";

             if (gPhone === "---" && b.guideId) {
                const accRaw = await AsyncStorage.getItem("@app_accounts");
                if (accRaw) {
                   const accs = JSON.parse(accRaw);
                   const acc = accs.find((a:any)=>a.id===b.guideId);
                   if (acc && acc.phone) gPhone = acc.phone;
                }
             }
          }
       }

       setTitle(roomTitle);
       // Hiện SĐT 2 bên như trong ảnh
       setSubTitle(`HDV: ${gName} (${gPhone}) • Khách: ${cName} (${cPhone})`);

       const cRaw = await AsyncStorage.getItem('@app_chats');
       if (cRaw) {
          const chats = JSON.parse(cRaw);
          const chatIndex = chats.findIndex((c: any) => c.id === bookingId || c.bookingId === bookingId);
          if (chatIndex > -1 && chats[chatIndex].lastSenderId !== myId) {
             chats[chatIndex].unreadCount = 0;
             await AsyncStorage.setItem('@app_chats', JSON.stringify(chats));
          }
       }
       const mRaw = await AsyncStorage.getItem('@app_messages');
       if (mRaw) setMessages(JSON.parse(mRaw).filter((m: any) => m.sessionId === bookingId || m.sessionId === String(bookingId).replace('chat_', '')).reverse());
    }
  };

  useFocusEffect(useCallback(() => { loadChat(); }, [bookingId]));

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const newMsg = { id: `msg_${Date.now()}`, sessionId: type === "staff" ? bookingId : String(bookingId).replace('chat_', ''), senderId: currentGuideId, text: inputText.trim(), createdAt: new Date().toISOString() };
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
      if (chatIndex > -1) { sChats[chatIndex].lastMsg = newMsg.text; sChats[chatIndex].lastSenderId = currentGuideId; sChats[chatIndex].updatedAt = newMsg.createdAt; }
      else { sChats.unshift({ id: bookingId, guestId: currentGuideId, roomName: "Trung tâm Hỗ trợ HDV", lastMsg: newMsg.text, lastSenderId: currentGuideId, updatedAt: newMsg.createdAt, unreadCount: 1 }); }
      await AsyncStorage.setItem('@staff_chats_v3', JSON.stringify(sChats));
    } else {
      const mRaw = await AsyncStorage.getItem('@app_messages');
      const allMsgs = mRaw ? JSON.parse(mRaw) : [];
      allMsgs.push(newMsg);
      await AsyncStorage.setItem('@app_messages', JSON.stringify(allMsgs));

      const cRaw = await AsyncStorage.getItem('@app_chats');
      let cChats = cRaw ? JSON.parse(cRaw) : [];
      let chatIndex = cChats.findIndex((c: any) => c.id === bookingId || c.bookingId === bookingId);
      if (chatIndex > -1) { cChats[chatIndex].lastMsg = newMsg.text; cChats[chatIndex].lastSenderId = currentGuideId; cChats[chatIndex].updatedAt = newMsg.createdAt; cChats[chatIndex].unreadCount = (cChats[chatIndex].unreadCount || 0) + 1; }
      await AsyncStorage.setItem('@app_chats', JSON.stringify(cChats));
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentGuideId;
    const isSystem = item.senderId === "system";

    if (isSystem) return (<View style={{alignItems: 'center', marginVertical: 10}}><View style={{backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10}}><Text style={{fontSize: 12, color: '#475569', fontWeight: 'bold'}}>{item.text}</Text></View></View>);

    return (
      <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft]}>
        <View style={[s.bubble, isMe ? s.bubbleSelf : (type === "staff" ? s.bubbleStaff : s.bubbleOther)]}>
          <Text style={[s.bubbleText, isMe ? s.bubbleTextSelf : s.bubbleTextOther]}>{item.text}</Text>
        </View>
        <Text style={[s.msgTime, isMe ? s.msgTimeRight : s.msgTimeLeft]}>{new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => { if(router.canGoBack()) router.back(); else router.replace('/guide-home' as any); }} style={s.backBtn}><Ionicons name="chevron-back" size={24} color="#1e293b" /></TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.statusTxt} numberOfLines={1}>{subTitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderMessage} inverted showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent} />

      <View style={[s.inputArea, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="add-circle-outline" size={24} color="#94a3b8" /></TouchableOpacity>
        <View style={s.textInputWrapper}>
          <TextInput style={s.textInput} placeholder="Nhập tin nhắn..." value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}><Ionicons name="send" size={18} color={inputText.trim() ? "#10b981" : "#94a3b8"} /></TouchableOpacity>
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
    statusTxt: { fontSize: sz(10), color: "#10b981", fontWeight: "700", marginTop: sz(2) },
    listContent: { paddingHorizontal: sz(16), paddingVertical: sz(20) },
    msgRow: { marginBottom: sz(16), maxWidth: "85%" },
    msgLeft: { alignSelf: "flex-start" },
    msgRight: { alignSelf: "flex-end", alignItems: "flex-end" },
    bubble: { paddingHorizontal: sz(14), paddingVertical: sz(10), borderRadius: sz(20) },
    bubbleSelf: { backgroundColor: "#10b981", borderBottomRightRadius: sz(4) },
    bubbleStaff: { backgroundColor: "#f59e0b", borderBottomRightRadius: sz(4) },
    bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: sz(4), borderWidth: 1, borderColor: "#e2e8f0" },
    bubbleText: { fontSize: sz(14), lineHeight: sz(20) },
    bubbleTextSelf: { color: "#fff" },
    bubbleTextOther: { color: "#0f172a" },
    msgTime: { fontSize: sz(10), color: "#94a3b8", marginTop: sz(4) },
    msgTimeLeft: { marginLeft: sz(4) },
    msgTimeRight: { marginRight: sz(4) },
    inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: sz(12), paddingTop: sz(10), gap: sz(8) },
    toolBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center", marginBottom: sz(4) },
    textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: sz(20), borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", paddingHorizontal: sz(12), minHeight: sz(40), marginBottom: sz(10) },
    textInput: { flex: 1, maxHeight: sz(100), paddingTop: sz(10), paddingBottom: sz(10), fontSize: sz(14), color: "#0f172a" },
    sendBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center" }
  });
};