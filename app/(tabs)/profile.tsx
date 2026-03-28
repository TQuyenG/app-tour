/**
 * app/(tabs)/profile.tsx  –  Profile Guest
 * - Đọc dữ liệu Role + Chat 100% từ DB (Loại bỏ dữ liệu tĩnh)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GuestProfile {
  name: string; email: string; phone: string; dob: string;
  address: string; loyaltyPoints: number; loyaltyTier: string;
  voucher: string; avatarColor: string;
}

interface ChatMessage {
  from: 'staff' | 'guest' | 'guide';
  text: string; time: string;
}

interface ChatSession {
  id: string; topic?: string; guideName?: string; tourName?: string;
  lastMessage?: string; lastTime?: string; unread: number;
  color?: string; messages: ChatMessage[];
}

const DEFAULT_PROFILE: GuestProfile = {
  name: 'Nguyễn An', email: 'guest1@gmail.com', phone: '0901 234 567',
  dob: '01/01/1995', address: 'TP. Hồ Chí Minh', loyaltyPoints: 1200,
  loyaltyTier: 'Loyal', voucher: 'SUMMER2026', avatarColor: '#4f7cff',
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [profile,      setProfile]      = useState<GuestProfile>(DEFAULT_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  const [form,         setForm]         = useState<GuestProfile>(DEFAULT_PROFILE);
  const [saving,       setSaving]       = useState(false);
  
  const [isGuideAlso,  setIsGuideAlso]  = useState(false);
  const [guideReqStatus, setGuideReqStatus] = useState<'none' | 'pending' | 'rejected'>('none');
  const [guideReqNote, setGuideReqNote] = useState('');

  const [activeTab,    setActiveTab]    = useState<'profile' | 'chat_staff' | 'chat_guide'>('profile');
  const flatRef = useRef<FlatList>(null);

  const [staffChatSessions, setStaffChatSessions] = useState<ChatSession[]>([]);
  const [activeStaffChat, setActiveStaffChat]     = useState<string | null>(null);
  const [staffChatInput, setStaffChatInput]       = useState('');
  const [staffMsgs, setStaffMsgs]                 = useState<ChatMessage[]>([]);

  const [guideChatSessions, setGuideChatSessions] = useState<ChatSession[]>([]);
  const [activeGuideChat, setActiveGuideChat]     = useState<string | null>(null);
  const [guideChatInput, setGuideChatInput]       = useState('');
  const [guideMsgs, setGuideMsgs]                 = useState<ChatMessage[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // 1. TẢI CHAT TỪ LOCAL (Không dùng dữ liệu cứng)
          const rawStaffChats = await AsyncStorage.getItem('@guest_staff_chats');
          if (rawStaffChats) setStaffChatSessions(JSON.parse(rawStaffChats));
          const rawGuideChats = await AsyncStorage.getItem('@guest_guide_chats');
          if (rawGuideChats) setGuideChatSessions(JSON.parse(rawGuideChats));

          // 2. TẢI THÔNG TIN CÁ NHÂN
          let currentEmail = '';
          const rawProfile = await AsyncStorage.getItem('@app_profile');
          if (rawProfile) {
            const p = { ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) };
            setProfile(p); setForm(p);
            currentEmail = p.email;
          }
          
          // 3. TẢI VÀ KIỂM TRA QUYỀN TRUY CẬP (ROLE) TỪ DATABASE
          let hasGuideRole = false;
          let accId = '';
          
          // Lấy dữ liệu user hiện tại
          const rawUser = await AsyncStorage.getItem('@app_current_user');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            accId = u.accountId;
            if (u.roles && u.roles.includes('guide')) {
              hasGuideRole = true;
              setIsGuideAlso(true);
            }
          }

          // Kiểm tra db admin requests nếu chưa có quyền guide
          if (!hasGuideRole) {
            const rawReqs = await AsyncStorage.getItem('@admin_guide_requests');
            if (rawReqs) {
              const reqs = JSON.parse(rawReqs);
              const myReqs = reqs.filter((r: any) => (accId && r.accountId === accId) || r.email === currentEmail);
              if (myReqs.length > 0) {
                const latestReq = myReqs[0]; // Request mới nhất (đã unshift lên đầu)
                if (latestReq.status === 'pending') {
                  setGuideReqStatus('pending');
                } else if (latestReq.status === 'rejected') {
                  setGuideReqStatus('rejected');
                  setGuideReqNote(latestReq.adminNote || latestReq.note || 'Hồ sơ chưa đạt yêu cầu hệ thống.');
                } else if (latestReq.status === 'approved') {
                  setIsGuideAlso(true);
                }
              } else {
                 setGuideReqStatus('none');
              }
            }
          }
        } catch (e) {}
      };
      loadData();
    }, [])
  );

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Lỗi', 'Vui lòng điền họ tên.'); return; }
    setSaving(true);
    await AsyncStorage.setItem('@app_profile', JSON.stringify(form));
    setProfile(form);
    setSaving(false);
    setModalVisible(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@current_user_role');
    router.replace('/login' as any);
  };

  const handleSwitchToGuide = async () => {
    await AsyncStorage.setItem('@current_user_role', 'guide');
    router.replace('/guide-home' as any);
  };

  const setField = (key: keyof GuestProfile, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const tierColors: Record<string, string> = { Member: '#7a8cc2', Loyal: '#ffbe40', Gold: '#f59e0b', Platinum: '#a855f7' };
  const tierColor = tierColors[profile.loyaltyTier] ?? '#4f7cff';

  const openStaffChat = (session: ChatSession) => {
    setActiveStaffChat(session.id);
    setStaffMsgs(session.messages || []);
    setStaffChatSessions(prev => prev.map(s => s.id === session.id ? { ...s, unread: 0 } : s));
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendStaffMsg = async () => {
    if (!staffChatInput.trim() || !activeStaffChat) return;
    const newMsg: ChatMessage = { from: 'guest', text: staffChatInput.trim(), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    setStaffMsgs(prev => [...prev, newMsg]);
    
    const updatedSessions = staffChatSessions.map(s => s.id === activeStaffChat ? { ...s, lastMessage: newMsg.text, lastTime: 'Vừa xong', messages: [...s.messages, newMsg] } : s);
    setStaffChatSessions(updatedSessions);
    await AsyncStorage.setItem('@guest_staff_chats', JSON.stringify(updatedSessions));
    
    setStaffChatInput('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const openGuideChat = (session: ChatSession) => {
    setActiveGuideChat(session.id);
    setGuideMsgs(session.messages || []);
    setGuideChatSessions(prev => prev.map(s => s.id === session.id ? { ...s, unread: 0 } : s));
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendGuideMsg = async () => {
    if (!guideChatInput.trim() || !activeGuideChat) return;
    const newMsg: ChatMessage = { from: 'guest', text: guideChatInput.trim(), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    setGuideMsgs(prev => [...prev, newMsg]);
    
    const updatedSessions = guideChatSessions.map(s => s.id === activeGuideChat ? { ...s, lastMessage: newMsg.text, lastTime: 'Vừa xong', messages: [...s.messages, newMsg] } : s);
    setGuideChatSessions(updatedSessions);
    await AsyncStorage.setItem('@guest_guide_chats', JSON.stringify(updatedSessions));

    setGuideChatInput('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const activeStaffSession = staffChatSessions.find(s => s.id === activeStaffChat);
  const activeGuideSession = guideChatSessions.find(s => s.id === activeGuideChat);
  const staffUnreadTotal   = staffChatSessions.reduce((n, s) => n + (s.unread || 0), 0);
  const guideUnreadTotal   = guideChatSessions.reduce((n, s) => n + (s.unread || 0), 0);

  if (activeTab === 'chat_staff' && activeStaffChat && activeStaffSession) {
    return (
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.chatTopBar, { paddingTop: insets.top + Math.round(10 * scale) }]}>
          <TouchableOpacity onPress={() => setActiveStaffChat(null)} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={Math.round(22 * scale)} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[s.chatAvatar, { backgroundColor: '#f59e0b' }]}><Ionicons name="headset" size={Math.round(16 * scale)} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatName}>CSKH - LocalMate</Text>
            <Text style={s.chatSub}>{activeStaffSession.topic || "Hỗ trợ khách hàng"}</Text>
          </View>
        </View>
        <FlatList ref={flatRef} data={staffMsgs} keyExtractor={(_, i) => String(i)} contentContainerStyle={s.msgListContent}
          renderItem={({ item }) => {
            const isStaff = item.from === 'staff';
            return (
              <View style={[s.msgRow, isStaff ? s.msgRowOther : s.msgRowSelf]}>
                {isStaff && <View style={[s.miniAvatar, { backgroundColor: '#f59e0b' }]}><Ionicons name="headset" size={Math.round(12 * scale)} color="#fff" /></View>}
                <View style={isStaff ? s.bubbleColLeft : s.bubbleColRight}>
                  <View style={[s.bubble, isStaff ? s.bubbleLeft : s.bubbleRight]}><Text style={[s.bubbleTxt, isStaff ? s.bubbleTxtLeft : s.bubbleTxtRight]}>{item.text}</Text></View>
                  <Text style={[s.timeStamp, isStaff ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, Math.round(10 * scale)) }]}>
          <TextInput style={s.chatInput} value={staffChatInput} onChangeText={setStaffChatInput} placeholder="Nhắn tin cho CSKH..." placeholderTextColor="#b0bdd8" multiline />
          <TouchableOpacity style={[s.sendBtn, !staffChatInput.trim() && s.sendBtnOff]} onPress={sendStaffMsg} disabled={!staffChatInput.trim()}><Ionicons name="send" size={Math.round(16 * scale)} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (activeTab === 'chat_guide' && activeGuideChat && activeGuideSession) {
    return (
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.chatTopBar, { paddingTop: insets.top + Math.round(10 * scale) }]}>
          <TouchableOpacity onPress={() => setActiveGuideChat(null)} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={Math.round(22 * scale)} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[s.chatAvatar, { backgroundColor: activeGuideSession.color || '#4f7cff' }]}><Text style={s.chatAvatarTxt}>{(activeGuideSession.guideName || 'U').charAt(0)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.chatName}>{activeGuideSession.guideName}</Text>
            <Text style={s.chatSub}>{activeGuideSession.tourName || "Tour hệ thống"}</Text>
          </View>
        </View>
        <FlatList ref={flatRef} data={guideMsgs} keyExtractor={(_, i) => String(i)} contentContainerStyle={s.msgListContent}
          renderItem={({ item }) => {
            const isGuide = item.from === 'guide';
            return (
              <View style={[s.msgRow, isGuide ? s.msgRowOther : s.msgRowSelf]}>
                {isGuide && <View style={[s.miniAvatar, { backgroundColor: activeGuideSession.color || '#4f7cff' }]}><Text style={{ color: '#fff', fontSize: Math.round(10 * scale), fontWeight: '800' }}>{(activeGuideSession.guideName || 'U').charAt(0)}</Text></View>}
                <View style={isGuide ? s.bubbleColLeft : s.bubbleColRight}>
                  <View style={[s.bubble, isGuide ? s.bubbleLeft : s.bubbleRight]}><Text style={[s.bubbleTxt, isGuide ? s.bubbleTxtLeft : s.bubbleTxtRight]}>{item.text}</Text></View>
                  <Text style={[s.timeStamp, isGuide ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, Math.round(10 * scale)) }]}>
          <TextInput style={s.chatInput} value={guideChatInput} onChangeText={setGuideChatInput} placeholder="Nhắn tin cho HDV..." placeholderTextColor="#b0bdd8" multiline />
          <TouchableOpacity style={[s.sendBtn, !guideChatInput.trim() && s.sendBtnOff]} onPress={sendGuideMsg} disabled={!guideChatInput.trim()}><Ionicons name="send" size={Math.round(16 * scale)} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + Math.round(14 * scale), paddingBottom: Math.round(100 * scale) }]}>
      <Text style={s.title}>Tài khoản</Text>

      <View style={s.tabRow}>
        {([
          { key: 'profile',    label: 'Hồ sơ',    icon: 'person-outline' },
          { key: 'chat_staff', label: 'CSKH',     icon: 'headset-outline', badge: staffUnreadTotal },
          { key: 'chat_guide', label: 'HDV',      icon: 'map-outline',     badge: guideUnreadTotal },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.key} style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={Math.round(15 * scale)} color={activeTab === tab.key ? '#4f7cff' : '#7a8cc2'} />
            <Text style={[s.tabBtnTxt, activeTab === tab.key && s.tabBtnTxtActive]}>{tab.label}</Text>
            {'badge' in tab && (tab.badge ?? 0) > 0 && <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{(tab as any).badge}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'chat_staff' && (
        <View>
          {staffChatSessions.length === 0 && <View style={s.emptyChat}><Ionicons name="chatbubbles-outline" size={Math.round(48 * scale)} color="#cbd5e1" style={{marginBottom: 10}} /><Text style={s.emptyChatTxt}>Chưa có cuộc trò chuyện nào.</Text></View>}
          {staffChatSessions.map(session => (
            <TouchableOpacity key={session.id} style={[s.chatCard, session.unread > 0 && s.chatCardUnread]} onPress={() => openStaffChat(session)} activeOpacity={0.85}>
              <View style={[s.chatCardAvatar, { backgroundColor: '#f59e0b' }]}><Ionicons name="headset" size={Math.round(20 * scale)} color="#fff" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.chatCardName} numberOfLines={1}>CSKH - {session.topic || "Hỗ trợ"}</Text><Text style={s.chatCardTime}>{session.lastTime}</Text></View>
                <Text style={[s.chatCardLast, session.unread > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{session.lastMessage}</Text>
              </View>
              {session.unread > 0 && <View style={s.chatUnreadDot}><Text style={s.chatUnreadTxt}>{session.unread}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'chat_guide' && (
        <View>
          {guideChatSessions.length === 0 && <View style={s.emptyChat}><Ionicons name="chatbubbles-outline" size={Math.round(48 * scale)} color="#cbd5e1" style={{marginBottom: 10}} /><Text style={s.emptyChatTxt}>Chưa có cuộc trò chuyện nào.</Text></View>}
          {guideChatSessions.map(session => (
            <TouchableOpacity key={session.id} style={[s.chatCard, session.unread > 0 && s.chatCardUnread]} onPress={() => openGuideChat(session)} activeOpacity={0.85}>
              <View style={[s.chatCardAvatar, { backgroundColor: session.color || '#4f7cff' }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: Math.round(18 * scale) }}>{(session.guideName || 'U').charAt(0)}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.chatCardName} numberOfLines={1}>{session.guideName}</Text><Text style={s.chatCardTime}>{session.lastTime}</Text></View>
                <Text style={s.chatCardSub} numberOfLines={1}>{session.tourName}</Text>
                <Text style={[s.chatCardLast, session.unread > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{session.lastMessage}</Text>
              </View>
              {session.unread > 0 && <View style={s.chatUnreadDot}><Text style={s.chatUnreadTxt}>{session.unread}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'profile' && <>
      <View style={s.profileCard}>
        <View style={[s.avatar, { backgroundColor: profile.avatarColor }]}><Text style={s.avatarInitial}>{(profile.name || 'U').trim().charAt(0).toUpperCase()}</Text></View>
        <View style={s.profileInfo}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.email}>{profile.email}</Text>
          {!!profile.phone && <Text style={s.phone}>{profile.phone}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}><Ionicons name="log-out-outline" size={Math.round(22 * scale)} color="#7a8cc2" /></TouchableOpacity>
      </View>

      <View style={s.crmCard}>
        <View style={s.crmRow}><Text style={s.crmTitle}>Điểm tích lũy</Text><Text style={[s.crmPoints, { color: '#4f7cff' }]}>{profile.loyaltyPoints.toLocaleString('vi-VN')} điểm</Text></View>
        <View style={s.crmRow}>
          <Text style={s.crmMeta}>Cấp thành viên</Text>
          <View style={[s.tierBadge, { backgroundColor: tierColor + '22' }]}><Text style={[s.tierTxt, { color: tierColor }]}>{profile.loyaltyTier}</Text></View>
        </View>
        {!!profile.voucher && (
          <View style={s.voucherRow}><Ionicons name="ticket-outline" size={Math.round(14 * scale)} color="#4f7cff" /><Text style={s.voucherTxt}>Voucher: <Text style={s.voucherCode}>{profile.voucher}</Text></Text></View>
        )}
        <View style={s.progressWrap}>
          <View style={s.progressBg}><View style={[s.progressFill, { width: `${Math.min((profile.loyaltyPoints % 1000) / 10, 100)}%` as any }]} /></View>
          <Text style={s.progressHint}>{1000 - (profile.loyaltyPoints % 1000)} điểm đến tier tiếp theo</Text>
        </View>
      </View>

      <TouchableOpacity style={s.editBtn} onPress={() => { setForm(profile); setModalVisible(true); }}>
        <Ionicons name="create-outline" size={Math.round(17 * scale)} color="#4f7cff" />
        <Text style={s.editBtnTxt}>Chỉnh sửa thông tin cá nhân</Text>
      </TouchableOpacity>

      {([
        { href: '/guest_chat_center',   icon: 'chatbubbles-outline',   label: 'Live Chat (Hỗ trợ)',      color: '#f59e0b' },
        { href: '/guest_notifications', icon: 'notifications-outline', label: 'Thông báo',               color: '#4f7cff' },
        { href: '/guest_favorites',     icon: 'heart-outline',         label: 'Tour yêu thích',          color: '#ec4899' },
        { href: '/bookings',            icon: 'receipt-outline',       label: 'Lịch sử đặt tour',       color: '#2856d6' },
        { href: '/guest_loyalty',       icon: 'star-outline',          label: 'Điểm thưởng & Hạng',     color: '#f59e0b' },
        { href: '/guest_vouchers',      icon: 'ticket-outline',        label: 'Kho Voucher của tôi',     color: '#16a34a' },
        { href: '/guest_refund',        icon: 'refresh-outline',       label: 'Yêu cầu Hoàn tiền',      color: '#8b5cf6' },
        { href: '/guest_complaints',    icon: 'warning-outline',       label: 'Khiếu nại & Tranh chấp', color: '#dc2626' },
        { href: '/guest_booking_flow',  icon: 'map-outline',           label: 'Đặt tour mới',            color: '#06b6d4' },
      ] as const).map(item => (
        <TouchableOpacity key={item.href} style={s.menuItem} onPress={() => router.push(item.href as any)}>
          <View style={[s.menuIcon, { backgroundColor: (item as any).color + '18' }]}><Ionicons name={item.icon} size={Math.round(20 * scale)} color={(item as any).color} /></View>
          <Text style={s.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {/* DUAL ROLE: Cập nhật giao diện tự động theo trạng thái Admin */}
      <View style={s.dualCard}>
        <Text style={s.dualTitle}>Vai trò & Tài khoản</Text>
        {isGuideAlso ? (
          <TouchableOpacity style={s.dualRow} onPress={handleSwitchToGuide}>
            <View style={[s.dualIcon, { backgroundColor: '#edf9f0' }]}><Ionicons name="map-outline" size={Math.round(20 * scale)} color="#16a34a" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualLabel}>Chuyển sang tài khoản HDV</Text><Text style={s.dualSub}>Quản lý lịch, nhận tour, thu nhập</Text></View>
            <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
          </TouchableOpacity>
        ) : guideReqStatus === 'pending' ? (
          <View style={s.dualRow}>
            <View style={[s.dualIcon, { backgroundColor: '#fffbeb' }]}><Ionicons name="time-outline" size={Math.round(20 * scale)} color="#d97706" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.dualLabel}>Đang chờ xét duyệt HDV</Text>
              <Text style={s.dualSub}>Hồ sơ của bạn đang được Admin kiểm tra.</Text>
            </View>
          </View>
        ) : guideReqStatus === 'rejected' ? (
          <TouchableOpacity style={s.dualRow} onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[s.dualIcon, { backgroundColor: '#fef2f2' }]}><Ionicons name="close-circle-outline" size={Math.round(20 * scale)} color="#ef4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dualLabel, { color: '#ef4444' }]}>Hồ sơ HDV bị từ chối</Text>
              <Text style={[s.dualSub, { color: '#ef4444', fontStyle: 'italic' }]}>Lý do: {guideReqNote}</Text>
              <Text style={{ color: '#4f7cff', fontWeight: '800', marginTop: Math.round(4 * scale), fontSize: Math.round(12 * scale) }}>Nhấn để đăng ký lại</Text>
            </View>
            <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.dualRow} onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[s.dualIcon, { backgroundColor: '#edf2ff' }]}><Ionicons name="person-add-outline" size={Math.round(20 * scale)} color="#4f7cff" /></View>
            <View style={{ flex: 1 }}><Text style={s.dualLabel}>Đăng ký làm Hướng dẫn viên</Text><Text style={s.dualSub}>Kiếm thu nhập từ đam mê du lịch</Text></View>
            <Ionicons name="chevron-forward" size={Math.round(16 * scale)} color="#c0cbe8" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={Math.round(18 * scale)} color="#ef4444" />
        <Text style={s.logoutTxt}>Đăng xuất khỏi thiết bị</Text>
      </TouchableOpacity>
      </>}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.mheader}>
              <Text style={s.mtitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={Math.round(20 * scale)} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.mbody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.formLabel}>Màu avatar</Text>
              <View style={s.colorRow}>
                {['#4f7cff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'].map(c => (
                  <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, form.avatarColor === c && s.colorDotActive]} onPress={() => setField('avatarColor', c)}>
                    {form.avatarColor === c && <Ionicons name="checkmark" size={Math.round(14 * scale)} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.formLabel}>Họ và tên *</Text>
              <TextInput style={s.input} value={form.name} onChangeText={v => setField('name', v)} placeholder="Nguyễn Văn A" placeholderTextColor="#b0bdd8" />
              <Text style={s.formLabel}>Email</Text>
              <TextInput style={s.input} value={form.email} onChangeText={v => setField('email', v)} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#b0bdd8" />
              <Text style={s.formLabel}>Số điện thoại</Text>
              <TextInput style={s.input} value={form.phone} onChangeText={v => setField('phone', v)} keyboardType="phone-pad" placeholderTextColor="#b0bdd8" />
              <Text style={s.formLabel}>Ngày sinh</Text>
              <TextInput style={s.input} value={form.dob} onChangeText={v => setField('dob', v)} placeholder="VD: 01/01/1995" placeholderTextColor="#b0bdd8" />
              <Text style={s.formLabel}>Địa chỉ</Text>
              <TextInput style={s.input} value={form.address} onChangeText={v => setField('address', v)} placeholder="VD: TP. Hồ Chí Minh" placeholderTextColor="#b0bdd8" />
              <Text style={s.formLabel}>Voucher</Text>
              <TextInput style={s.input} value={form.voucher} onChangeText={v => setField('voucher', v.toUpperCase())} autoCapitalize="characters" placeholder="VD: SUMMER2026" placeholderTextColor="#b0bdd8" />
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Ionicons name="checkmark-circle-outline" size={Math.round(18 * scale)} color="#fff" /><Text style={s.saveBtnTxt}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
              </TouchableOpacity>
              <View style={{ height: Math.round(24 * scale) }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen:  { flex: 1, backgroundColor: '#f3f7ff' },
    content: { padding: sz(18) },
    title:   { color: '#1f2a58', fontSize: sz(26), fontWeight: '700', marginBottom: sz(14) },
    profileCard: { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), flexDirection: 'row', alignItems: 'center', gap: sz(12), marginBottom: sz(14) },
    avatar:        { width: sz(56), height: sz(56), borderRadius: sz(16), alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#fff', fontSize: sz(22), fontWeight: '800' },
    profileInfo:   { flex: 1 },
    name:          { color: '#1f2a58', fontWeight: '700', fontSize: sz(16) },
    email:         { color: '#7a8cc2', marginTop: sz(3), fontSize: sz(13) },
    phone:         { color: '#5f73a9', marginTop: sz(2), fontSize: sz(12) },
    crmCard:      { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(16), marginBottom: sz(14), gap: sz(10) },
    crmRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    crmTitle:     { color: '#1f2a58', fontWeight: '700', fontSize: sz(14) },
    crmPoints:    { fontWeight: '800', fontSize: sz(16) },
    crmMeta:      { color: '#7a8cc2', fontSize: sz(13) },
    tierBadge:    { borderRadius: sz(10), paddingHorizontal: sz(10), paddingVertical: sz(4) },
    tierTxt:      { fontWeight: '800', fontSize: sz(13) },
    voucherRow:   { flexDirection: 'row', alignItems: 'center', gap: sz(6) },
    voucherTxt:   { color: '#7a8cc2', fontSize: sz(13) },
    voucherCode:  { color: '#4f7cff', fontWeight: '700' },
    progressWrap: { gap: sz(5) },
    progressBg:   { height: sz(5), backgroundColor: '#e4ebff', borderRadius: sz(4), overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4f7cff', borderRadius: sz(4) },
    progressHint: { color: '#7a8cc2', fontSize: sz(11) },
    editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1.5, borderColor: '#dfe7ff', paddingVertical: sz(12), marginBottom: sz(18) },
    editBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(14) },
    menuItem: { marginBottom: sz(10), borderRadius: sz(14), backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), flexDirection: 'row', alignItems: 'center', gap: sz(12) },
    menuIcon: { width: sz(36), height: sz(36), borderRadius: sz(10), backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
    menuText: { color: '#1f2a58', fontWeight: '600', flex: 1, fontSize: sz(14) },
    dualCard:  { backgroundColor: '#fff', borderRadius: sz(16), borderWidth: 1, borderColor: '#e4ebff', padding: sz(14), marginBottom: sz(12) },
    dualTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: sz(10), fontSize: sz(14) },
    dualRow:   { flexDirection: 'row', alignItems: 'center', gap: sz(12), paddingVertical: sz(8) },
    dualIcon:  { width: sz(40), height: sz(40), borderRadius: sz(12), alignItems: 'center', justifyContent: 'center' },
    dualLabel: { color: '#1f2a58', fontWeight: '700', fontSize: sz(14) },
    dualSub:   { color: '#7a8cc2', fontSize: sz(12), marginTop: sz(2) },
    logoutBtn: { marginTop: sz(6), borderRadius: sz(14), backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', padding: sz(14), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(10) },
    logoutTxt: { color: '#ef4444', fontWeight: '700', fontSize: sz(15) },
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
    sheet:    { backgroundColor: '#fff', borderTopLeftRadius: sz(28), borderTopRightRadius: sz(28), maxHeight: '90%' },
    handle:   { width: sz(40), height: sz(4), backgroundColor: '#e4ebff', borderRadius: sz(2), alignSelf: 'center', marginTop: sz(12) },
    mheader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(20), paddingVertical: sz(16), borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    mtitle:   { fontSize: sz(17), fontWeight: '800', color: '#1f2a58' },
    closeBtn: { width: sz(32), height: sz(32), borderRadius: sz(10), backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
    mbody:    { paddingHorizontal: sz(20), paddingTop: sz(8) },
    formLabel:     { color: '#1f2a58', fontSize: sz(13), fontWeight: '700', marginBottom: sz(6), marginTop: sz(14) },
    input:         { backgroundColor: '#f3f7ff', borderRadius: sz(12), borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: sz(14), paddingVertical: sz(11), color: '#1f2a58', fontSize: sz(14), marginBottom: sz(12) },
    colorRow:      { flexDirection: 'row', gap: sz(10), flexWrap: 'wrap', marginBottom: sz(4) },
    colorDot:      { width: sz(36), height: sz(36), borderRadius: sz(18), alignItems: 'center', justifyContent: 'center' },
    colorDotActive:{ borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
    saveBtn:       { marginTop: sz(20), backgroundColor: '#4f7cff', borderRadius: sz(14), paddingVertical: sz(14), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(8), marginBottom: sz(30) },
    saveBtnTxt:    { color: '#fff', fontSize: sz(15), fontWeight: '800' },
    tabRow:         { flexDirection: 'row', backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', padding: sz(4), marginBottom: sz(14), gap: sz(4) },
    tabBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sz(5), paddingVertical: sz(9), borderRadius: sz(10) },
    tabBtnActive:   { backgroundColor: '#edf2ff' },
    tabBtnTxt:      { color: '#7a8cc2', fontSize: sz(12), fontWeight: '600' },
    tabBtnTxtActive:{ color: '#4f7cff', fontWeight: '700' },
    tabBadge:       { minWidth: sz(16), height: sz(16), borderRadius: sz(8), backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: sz(3) },
    tabBadgeTxt:    { color: '#fff', fontSize: sz(9), fontWeight: '800' },
    chatCard:        { flexDirection: 'row', alignItems: 'center', gap: sz(10), backgroundColor: '#fff', borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff', padding: sz(12), marginBottom: sz(8) },
    chatCardUnread:  { borderColor: '#dbeafe', backgroundColor: '#f0f7ff' },
    chatCardAvatar:  { width: sz(46), height: sz(46), borderRadius: sz(14), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chatCardName:    { fontSize: sz(13), fontWeight: '700', color: '#1f2a58', flex: 1 },
    chatCardTime:    { fontSize: sz(11), color: '#94a3b8', marginLeft: 'auto', paddingLeft: sz(4) },
    chatCardSub:     { fontSize: sz(11), color: '#4f7cff', fontWeight: '600', marginBottom: sz(2) },
    chatCardLast:    { fontSize: sz(12), color: '#94a3b8' },
    chatUnreadDot:   { minWidth: sz(18), height: sz(18), borderRadius: sz(9), backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: sz(3) },
    chatUnreadTxt:   { color: '#fff', fontSize: sz(10), fontWeight: '800' },
    emptyChat:       { alignItems: 'center', paddingTop: sz(60), gap: sz(10) },
    emptyChatTxt:    { color: '#7a8cc2', fontSize: sz(13) },
    chatTopBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sz(12), paddingBottom: sz(10), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', gap: sz(8) },
    iconBtn:        { width: sz(34), height: sz(34), borderRadius: sz(9), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    chatAvatar:     { width: sz(34), height: sz(34), borderRadius: sz(10), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chatAvatarTxt:  { color: '#fff', fontWeight: '800', fontSize: sz(14) },
    chatName:       { color: '#1f2a58', fontWeight: '800', fontSize: sz(14) },
    chatSub:        { color: '#7a8cc2', fontSize: sz(11) },
    msgListContent: { paddingHorizontal: sz(12), paddingTop: sz(12), paddingBottom: sz(10), gap: sz(8) },
    msgRow:         { flexDirection: 'row', gap: sz(7) },
    msgRowSelf:     { alignSelf: 'flex-end', maxWidth: '88%', flexDirection: 'row-reverse' },
    msgRowOther:    { alignSelf: 'flex-start', maxWidth: '88%' },
    miniAvatar:     { width: sz(26), height: sz(26), borderRadius: sz(7), alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end' },
    bubbleColLeft:  { flexShrink: 1, gap: sz(2), alignItems: 'flex-start' },
    bubbleColRight: { flexShrink: 1, gap: sz(2), alignItems: 'flex-end' },
    bubble:         { borderRadius: sz(14), paddingHorizontal: sz(12), paddingVertical: sz(9) },
    bubbleLeft:     { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderBottomLeftRadius: sz(4) },
    bubbleRight:    { backgroundColor: '#4f7cff', borderBottomRightRadius: sz(4) },
    bubbleTxt:      { fontSize: sz(13), lineHeight: sz(19), flexShrink: 1, flexWrap: 'wrap' },
    bubbleTxtLeft:  { color: '#1f2a58' },
    bubbleTxtRight: { color: '#fff' },
    timeStamp:      { fontSize: sz(10), color: '#94a3b8' },
    inputBar:       { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4ebff', flexDirection: 'row', alignItems: 'center', gap: sz(8), paddingHorizontal: sz(12), paddingTop: sz(8) },
    chatInput:      { flex: 1, backgroundColor: '#f1f5f9', borderRadius: sz(18), borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: sz(14), paddingVertical: sz(9), color: '#1f2a58', fontSize: sz(13), maxHeight: sz(88) },
    sendBtn:        { width: sz(38), height: sz(38), borderRadius: sz(19), backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center' },
    sendBtnOff:     { backgroundColor: '#e2e8f0' },
  });
};