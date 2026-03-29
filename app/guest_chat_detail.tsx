/**
 * app/guest_chat_detail.tsx
 * Màn hình Chat chi tiết của Khách hàng
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useMemo } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllChats, sendMessage, markAsRead, initOrGetSupportChat, sendSupportMessage, markSupportChatRead } from "@/constants/chat-store";

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
  const [inputText, setInputText] = useState("");

  const loadChat = async () => {
    if (!bookingId) return;
    
    if (type === 'guide') {
      const chats = await getAllChats();
      const currentChat = chats.find(c => c.bookingId === bookingId);
      if (currentChat) {
        setMessages(currentChat.messages);
        setTitle(currentChat.guideName || "Hướng dẫn viên");
        await markAsRead(bookingId as string, 'guest');
      }
    } else {
      // Chat CSKH (Staff)
      const userRaw = await AsyncStorage.getItem("@app_current_user");
      const uObj = userRaw ? JSON.parse(userRaw) : { accountId: 'guest_temp', name: 'Khách hàng' };
      
      // Khởi tạo phòng nếu chưa có
      const current = await initOrGetSupportChat({ id: uObj.accountId, name: uObj.name, role: 'guest' });
      setMessages(current.messages || []);
      setTitle("Tổng đài CSKH");
      await markSupportChatRead(uObj.accountId, 'user');
    }
  };

  useFocusEffect(useCallback(() => {
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [bookingId]));

  const handleSendMessage = async () => {
    if (!inputText.trim() || !bookingId) return;
    const txt = inputText.trim();
    setInputText("");
    
    const newMsg = { from: 'user', text: txt, time: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) };
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    if (type === 'guide') {
      await sendMessage(bookingId as string, 'guest', txt);
    } else {
      const userRaw = await AsyncStorage.getItem("@app_current_user");
      const uObj = userRaw ? JSON.parse(userRaw) : { accountId: 'guest_temp' };
      await sendSupportMessage(uObj.accountId, 'user', txt);
    }
    await loadChat();
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/guest_chat_list");
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(10*scale) }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={Math.round(24*scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(_, i) => `msg_${i}`} contentContainerStyle={s.list} onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.from === 'system') return <Text style={s.sysMsg}>{item.text}</Text>;
          const isMe = item.from === "guest" || item.from === "user";
          return (
            <View style={[s.msgRow, isMe ? s.msgRight : s.msgLeft]}>
              <View style={[s.bubble, isMe ? (type === 'guide' ? s.bubbleGuest : s.bubbleStaff) : s.bubbleOther]}>
                <Text style={[s.msgTxt, isMe ? { color: '#fff' } : { color: '#1f2a58' }]}>{item.text}</Text>
              </View>
              <Text style={s.time}>{item.time}</Text>
            </View>
          );
        }}
      />

      <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, Math.round(12*scale)) }]}>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="add" size={Math.round(24*scale)} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="camera-outline" size={Math.round(22*scale)} color="#64748b" /></TouchableOpacity>
        
        <View style={s.textInputWrapper}>
          <TextInput style={s.textInput} value={inputText} onChangeText={setInputText} placeholder="Nhập tin nhắn..." placeholderTextColor="#94a3b8" multiline />
        </View>
        
        {inputText.trim() ? (
          <TouchableOpacity style={[s.sendBtn, type === 'staff' && { backgroundColor: '#f59e0b' }]} onPress={handleSendMessage}>
            <Ionicons name="send" size={Math.round(16*scale)} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.toolBtn}><Ionicons name="mic-outline" size={Math.round(24*scale)} color="#64748b" /></TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    header: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: sz(16), paddingBottom: sz(12), borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    backBtn: { padding: sz(8) },
    title: { flex: 1, fontSize: sz(18), fontWeight: "800", color: "#0f172a", marginLeft: sz(10) },
    list: { padding: sz(16), paddingBottom: sz(20) },
    sysMsg: { textAlign: 'center', fontSize: sz(11), color: '#94a3b8', marginVertical: sz(10), backgroundColor: '#f1f5f9', alignSelf: 'center', paddingHorizontal: sz(12), paddingVertical: sz(4), borderRadius: sz(10) },
    msgRow: { marginBottom: sz(16), maxWidth: "85%" },
    msgLeft: { alignSelf: "flex-start" },
    msgRight: { alignSelf: "flex-end", alignItems: "flex-end" },
    bubble: { paddingHorizontal: sz(14), paddingVertical: sz(10), borderRadius: sz(20) },
    bubbleGuest: { backgroundColor: "#4f7cff", borderBottomRightRadius: sz(4) },
    bubbleStaff: { backgroundColor: "#f59e0b", borderBottomRightRadius: sz(4) },
    bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: sz(4), borderWidth: 1, borderColor: "#e2e8f0" },
    msgTxt: { fontSize: sz(14), lineHeight: sz(20) },
    time: { fontSize: sz(10), color: "#94a3b8", marginTop: sz(4) },
    inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: sz(12), paddingTop: sz(10), gap: sz(6) },
    toolBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center", marginBottom: sz(4) },
    textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: sz(20), borderWidth: 1, borderColor: "#e2e8f0", minHeight: sz(40), maxHeight: sz(100), justifyContent: "center" },
    textInput: { paddingHorizontal: sz(14), paddingTop: sz(10), paddingBottom: sz(10), fontSize: sz(14), color: "#0f172a" },
    sendBtn: { width: sz(40), height: sz(40), borderRadius: sz(20), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", marginBottom: sz(2) }
  });
};