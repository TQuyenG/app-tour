/**
 * app/guide_chat_detail.tsx
 * Màn hình Chat chi tiết dành cho HDV
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useMemo } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatSession, getAllChats, sendMessage, markAsRead } from "@/constants/chat-store";

export default function GuideChatDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { bookingId } = useLocalSearchParams();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState("");

  const loadChat = async () => {
    if (!bookingId) return;
    const chats = await getAllChats();
    const currentChat = chats.find(c => c.bookingId === bookingId);
    if (currentChat) {
      setSession(currentChat);
      await markAsRead(bookingId as string, 'guide');
    }
  };

  useFocusEffect(useCallback(() => {
    loadChat();
    const intervalId = setInterval(loadChat, 3000); 
    return () => clearInterval(intervalId);
  }, [bookingId]));

  const handleSendMessage = async () => {
    if (!inputText.trim() || !bookingId) return;
    const currentText = inputText.trim();
    setInputText(""); 
    
    const newMsg = { from: 'guide' as const, text: currentText, time: new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) };
    if (session) {
       setSession({ ...session, messages: [...session.messages, newMsg] });
       setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }

    await sendMessage(bookingId as string, 'guide', currentText);
    await loadChat();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/guide_chat_list"); // Trả về Danh sách Chat HDV
    }
  };

  if (!session) return <View style={s.screen} />;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(10*scale) }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={Math.round(24*scale)} color="#1f2a58" />
        </TouchableOpacity>
        <View style={s.avatar}><Text style={s.avatarTxt}>{session.guestName.charAt(0)}</Text></View>
        <View style={s.headerInfo}>
          <Text style={s.name} numberOfLines={1}>{session.guestName}</Text>
          <Text style={s.sub} numberOfLines={1}>Tour: {session.tourName}</Text>
        </View>
        <TouchableOpacity style={s.iconCircleBtn} onPress={() => router.push({ pathname: '/shared-booking-detail', params: { bookingId: session.bookingId } } as any)}>
            <Ionicons name="receipt-outline" size={Math.round(18*scale)} color="#10b981" />
        </TouchableOpacity>
      </View>

      <FlatList ref={flatListRef} data={session.messages} keyExtractor={(_, index) => `msg_${index}`} contentContainerStyle={s.messageList} showsVerticalScrollIndicator={false} onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.from === 'system') return <Text style={s.sysMsg}>{item.text}</Text>;
          const isSelf = item.from === "guide";
          return (
            <View style={[s.msgWrapper, isSelf ? s.msgWrapperRight : s.msgWrapperLeft]}>
              <View style={isSelf ? s.bubbleBlockRight : s.bubbleBlockLeft}>
                <View style={[s.bubble, isSelf ? s.bubbleSelf : s.bubbleOther]}><Text style={[s.bubbleText, isSelf ? s.bubbleTextSelf : s.bubbleTextOther]}>{item.text}</Text></View>
                <Text style={[s.msgTime, isSelf ? s.msgTimeRight : s.msgTimeLeft]}>{item.time}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, Math.round(12*scale)) }]}>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="add" size={Math.round(24*scale)} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="camera-outline" size={Math.round(22*scale)} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity style={s.toolBtn}><Ionicons name="happy-outline" size={Math.round(22*scale)} color="#64748b" /></TouchableOpacity>
        
        <View style={s.textInputWrapper}>
          <TextInput style={s.textInput} value={inputText} onChangeText={setInputText} placeholder="Trả lời khách..." placeholderTextColor="#94a3b8" multiline />
        </View>
        
        {inputText.trim() ? (
           <TouchableOpacity style={s.sendBtn} onPress={handleSendMessage}><Ionicons name="send" size={Math.round(16*scale)} color="#fff" /></TouchableOpacity>
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
    header: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: sz(12), paddingBottom: sz(12), borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    backBtn: { padding: sz(8) },
    avatar: { width: sz(40), height: sz(40), borderRadius: sz(14), backgroundColor: '#10b981', alignItems: "center", justifyContent: "center", marginLeft: sz(4), marginRight: sz(12) },
    avatarTxt: { color: "#fff", fontSize: sz(18), fontWeight: "800" },
    headerInfo: { flex: 1, minWidth: 0 },
    name: { fontSize: sz(16), fontWeight: "800", color: "#0f172a" },
    sub: { fontSize: sz(12), color: "#64748b", marginTop: sz(2) },
    iconCircleBtn: { width: sz(36), height: sz(36), borderRadius: sz(18), backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginLeft: sz(8) },
    
    messageList: { paddingHorizontal: sz(16), paddingTop: sz(16), paddingBottom: sz(20) },
    sysMsg: { textAlign: 'center', fontSize: sz(11), color: '#94a3b8', marginVertical: sz(10), backgroundColor: '#f1f5f9', alignSelf: 'center', paddingHorizontal: sz(12), paddingVertical: sz(4), borderRadius: sz(10) },

    msgWrapper: { flexDirection: "row", marginBottom: sz(16), maxWidth: "85%" },
    msgWrapperLeft: { alignSelf: "flex-start" },
    msgWrapperRight: { alignSelf: "flex-end", flexDirection: "row-reverse" },
    bubbleBlockLeft: { alignItems: "flex-start" },
    bubbleBlockRight: { alignItems: "flex-end" },
    bubble: { paddingHorizontal: sz(14), paddingVertical: sz(10), borderRadius: sz(20) },
    bubbleSelf: { backgroundColor: "#10b981", borderBottomRightRadius: sz(4) },
    bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: sz(4), borderWidth: 1, borderColor: "#e2e8f0" },
    bubbleText: { fontSize: sz(14), lineHeight: sz(20) },
    bubbleTextSelf: { color: "#fff" },
    bubbleTextOther: { color: "#0f172a" },
    msgTime: { fontSize: sz(10), color: "#94a3b8", marginTop: sz(4) },
    msgTimeLeft: { marginLeft: sz(4) },
    msgTimeRight: { marginRight: sz(4) },

    inputArea: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingHorizontal: sz(12), paddingTop: sz(10), gap: sz(8) },
    toolBtn: { width: sz(34), height: sz(34), alignItems: "center", justifyContent: "center", marginBottom: sz(4) },
    textInputWrapper: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: sz(20), borderWidth: 1, borderColor: "#e2e8f0", minHeight: sz(40), maxHeight: sz(100), justifyContent: "center" },
    textInput: { paddingHorizontal: sz(14), paddingTop: sz(10), paddingBottom: sz(10), fontSize: sz(14), color: "#0f172a" },
    sendBtn: { width: sz(40), height: sz(40), borderRadius: sz(20), backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginBottom: sz(2) }
  });
};