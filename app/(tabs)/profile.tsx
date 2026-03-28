/**
 * app/(tabs)/profile.tsx  –  Profile Guest
 *
 * - Không dùng @/constants/shared-data (tránh lỗi module not found)
 * - Đọc/ghi trực tiếp AsyncStorage: @app_profile
 * - Đọc @app_current_user để biết có role guide không
 * - Dual role: nút "Chuyển sang HDV" hoặc "Đăng ký làm HDV"
 * - Modal edit đầy đủ thông tin + chọn màu avatar
 * - Logout gọi logoutAccount() từ app-accounts
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser, logoutAccount, switchRole } from '@/constants/app-accounts';
import {
  getSharedChatSessions, 
  staffSendMessage as guestSendMessage, 
  staffMarkChatRead as guestMarkChatRead,
  type SharedChatSession,
} from '@/constants/data-store';

// ─── Types (tự định nghĩa, không import từ shared-data) ──────
interface GuestProfile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  voucher: string;
  avatarColor: string;
}

const DEFAULT_PROFILE: GuestProfile = {
  name: 'Nguyễn An',
  email: 'guest1@gmail.com',
  phone: '0901 234 567',
  dob: '01/01/1995',
  address: 'TP. Hồ Chí Minh',
  loyaltyPoints: 1200,
  loyaltyTier: 'Loyal',
  voucher: 'SUMMER2026',
  avatarColor: '#4f7cff',
};
// ── THÊM MỚI DỮ LIỆU MẪU Ở ĐÂY (NGOÀI COMPONENT) ──
const GUIDE_CHAT_SEED = [
  { id: 'gc1', guideName: 'Phạm Văn Hùng', tourName: 'Tour Núi Bà Đen', lastMsg: 'Chúng tôi xuất phát lúc 6h sáng nhé!', time: '08:30', unread: 1, color: '#10b981',
    messages: [
      { from: 'guide', text: 'Xin chào! Tôi là HDV cho tour của bạn.', time: '08:00' },
      { from: 'guest', text: 'Chào anh, điểm đón ở đâu ạ?', time: '08:20' },
      { from: 'guide', text: 'Chúng tôi xuất phát lúc 6h sáng nhé! Điểm đón: Cổng Bến xe Miền Đông.', time: '08:30' },
    ],
  },
  { id: 'gc2', guideName: 'Nguyễn Thị Mai', tourName: 'Đà Lạt Mộng Mơ 3N2D', lastMsg: 'Tour bao gồm ăn sáng và ăn trưa ạ.', time: 'Hôm qua', unread: 0, color: '#f59e0b',
    messages: [
      { from: 'guest', text: 'Tour có bao gồm ăn tối không ạ?', time: '14:00' },
      { from: 'guide', text: 'Tour bao gồm ăn sáng và ăn trưa ạ. Ăn tối tự túc nhé bạn.', time: '14:05' },
    ],
  },
];

// ─── AsyncStorage helpers ─────────────────────────────────────
async function loadProfile(): Promise<GuestProfile> {
  try {
    const raw = await AsyncStorage.getItem('@app_profile');
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

async function persistProfile(p: GuestProfile): Promise<void> {
  try {
    await AsyncStorage.setItem('@app_profile', JSON.stringify(p));
  } catch {}
}

// ─── Component ────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile,      setProfile]      = useState<GuestProfile>(DEFAULT_PROFILE);
  const [modalVisible, setModalVisible] = useState(false);
  const [form,         setForm]         = useState<GuestProfile>(DEFAULT_PROFILE);
  const [saving,       setSaving]       = useState(false);
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  const [loaded,       setLoaded]       = useState(false);

  // Chat tab state
  const [activeTab,       setActiveTab]       = useState<'profile' | 'chat_staff' | 'chat_guide'>('profile');
  const [chatSessions,    setChatSessions]    = useState<SharedChatSession[]>([]);
  const [activeChatId,    setActiveChatId]    = useState<string | null>(null);
  const [chatInput,       setChatInput]       = useState('');
  const flatRef = useRef<FlatList>(null);

  // ── THÊM MỚI STATE VÀ HÀM CỦA HDV VÀO ĐÂY ──
  const [guideChatSessions, setGuideChatSessions] = useState(GUIDE_CHAT_SEED);
  const [activeGuideChat, setActiveGuideChat]     = useState<string | null>(null);
  const [guideChatInput, setGuideChatInput]       = useState('');
  const [guideMsgs, setGuideMsgs]                 = useState<any[]>([]);

  const openGuideChat = (session: any) => {
    setActiveGuideChat(session.id);
    setGuideMsgs(session.messages || []);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendGuideMsg = () => {
    if (!guideChatInput.trim() || !activeGuideChat) return;
    
    const newMsg = { 
      from: 'guest', text: guideChatInput.trim(), 
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
    };

    setGuideMsgs((prev: any[]) => [...prev, newMsg]);

    setGuideChatSessions((prev: any[]) => prev.map((s: any) => 
      s.id === activeGuideChat 
        ? { ...s, lastMsg: guideChatInput.trim(), time: 'Vừa xong', messages: [...(s.messages || []), newMsg] } 
        : s
    ));

    setGuideChatInput('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Reload mỗi khi tab được focus
  useFocusEffect(
    useCallback(() => {
      loadProfile().then(p => {
        setProfile(p);
        setForm(p);
        setLoaded(true);
      });
      getCurrentUser().then(u => setCurrentUser(u));
      getSharedChatSessions().then(sessions => setChatSessions(sessions));
    }, [])
  );

  // ── Save profile ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền họ tên.');
      return;
    }
    setSaving(true);
    await persistProfile(form);
    setProfile(form);
    setSaving(false);
    setModalVisible(false);
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = async () => {
    await logoutAccount();
    router.replace('/login' as any);
  };

  // ── Switch to guide role ──────────────────────────────────
  const handleSwitchToGuide = async () => {
    if (!currentUser) return;
    const res = await switchRole(currentUser.accountId, 'guide');
    if (res.ok) router.replace('/guide-home' as any);
    else Alert.alert('Lỗi', res.error || 'Không thể chuyển đổi.');
  };

  // ── Derived state ─────────────────────────────────────────
  const isGuideAlso = currentUser?.roles?.includes('guide') ?? false;

  const setField = (key: keyof GuestProfile, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const tierColors: Record<string, string> = {
    Member: '#7a8cc2', Loyal: '#ffbe40', Gold: '#f59e0b', Platinum: '#a855f7',
  };
  const tierColor = tierColors[profile.loyaltyTier] ?? '#4f7cff';

  // ── Chat handlers ──────────────────────────────────────────
  const openChat = async (session: SharedChatSession) => {
    setActiveChatId(session.id);
    await guestMarkChatRead(session.id);
    setChatSessions(prev => prev.map(s => s.id === session.id ? { ...s, unread: 0 } : s));
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendChatMsg = async () => {
    if (!chatInput.trim() || !activeChatId) return;
    const text = chatInput.trim();
    setChatInput('');
    await guestSendMessage(activeChatId, text);
    const updated = await getSharedChatSessions();
    setChatSessions(updated);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  

  // ── Active chat session object ────────────────────────────
  const activeStaffSession = chatSessions.find(s => s.id === activeChatId);
  const activeGuideSession = guideChatSessions.find(s => s.id === activeGuideChat);
  const staffUnreadTotal   = chatSessions.reduce((n, s) => n + s.unread, 0);
  const guideUnreadTotal   = guideChatSessions.reduce((n, s) => n + s.unread, 0);

  // ── Render chat detail (Staff) ────────────────────────────
  if (activeTab === 'chat_staff' && activeChatId && activeStaffSession) {
    return (
      <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.chatTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => setActiveChatId(null)} style={st.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[st.chatAvatar, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="headset" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.chatName}>CSKH - LocalMate</Text>
            <Text style={st.chatSub}>{activeStaffSession.topic}</Text>
          </View>
        </View>
        <FlatList
          ref={flatRef}
          data={activeStaffSession.messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={st.msgListContent}
          renderItem={({ item }) => {
            const isStaff = item.from === 'staff';
            return (
              <View style={[st.msgRow, isStaff ? st.msgRowOther : st.msgRowSelf]}>
                {isStaff && <View style={[st.miniAvatar, { backgroundColor: '#f59e0b' }]}><Ionicons name="headset" size={12} color="#fff" /></View>}
                <View style={isStaff ? st.bubbleColLeft : st.bubbleColRight}>
                  <View style={[st.bubble, isStaff ? st.bubbleLeft : st.bubbleRight]}>
                    <Text style={[st.bubbleTxt, isStaff ? st.bubbleTxtLeft : st.bubbleTxtRight]}>{item.text}</Text>
                  </View>
                  <Text style={[st.timeStamp, isStaff ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={[st.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
          <TextInput style={st.chatInput} value={chatInput} onChangeText={setChatInput} placeholder="Nhắn tin cho CSKH..." placeholderTextColor="#b0bdd8" multiline />
          <TouchableOpacity style={[st.sendBtn, !chatInput.trim() && st.sendBtnOff]} onPress={sendChatMsg} disabled={!chatInput.trim()}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Render chat detail (Guide) ────────────────────────────
  if (activeTab === 'chat_guide' && activeGuideChat && activeGuideSession) {
    return (
      <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.chatTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => setActiveGuideChat(null)} style={st.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2a58" />
          </TouchableOpacity>
          <View style={[st.chatAvatar, { backgroundColor: activeGuideSession.color }]}>
            <Text style={st.chatAvatarTxt}>{activeGuideSession.guideName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.chatName}>{activeGuideSession.guideName}</Text>
            <Text style={st.chatSub}>{activeGuideSession.tourName}</Text>
          </View>
        </View>
        <FlatList
          ref={flatRef}
          data={guideMsgs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={st.msgListContent}
          renderItem={({ item }) => {
            const isGuide = item.from === 'guide';
            return (
              <View style={[st.msgRow, isGuide ? st.msgRowOther : st.msgRowSelf]}>
                {isGuide && <View style={[st.miniAvatar, { backgroundColor: activeGuideSession.color }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{activeGuideSession.guideName.charAt(0)}</Text></View>}
                <View style={isGuide ? st.bubbleColLeft : st.bubbleColRight}>
                  <View style={[st.bubble, isGuide ? st.bubbleLeft : st.bubbleRight]}>
                    <Text style={[st.bubbleTxt, isGuide ? st.bubbleTxtLeft : st.bubbleTxtRight]}>{item.text}</Text>
                  </View>
                  <Text style={[st.timeStamp, isGuide ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={[st.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
          <TextInput style={st.chatInput} value={guideChatInput} onChangeText={setGuideChatInput} placeholder="Nhắn tin cho HDV..." placeholderTextColor="#b0bdd8" multiline />
          <TouchableOpacity style={[st.sendBtn, !guideChatInput.trim() && st.sendBtnOff]} onPress={sendGuideMsg} disabled={!guideChatInput.trim()}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={st.screen}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>

      <Text style={st.title}>Tài khoản</Text>

      {/* ── Tab switcher ── */}
      <View style={st.tabRow}>
        {([
          { key: 'profile',    label: 'Hồ sơ',    icon: 'person-outline' },
          { key: 'chat_staff', label: 'CSKH',      icon: 'headset-outline', badge: staffUnreadTotal },
          { key: 'chat_guide', label: 'HDV',        icon: 'map-outline',     badge: guideUnreadTotal },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[st.tabBtn, activeTab === tab.key && st.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? '#4f7cff' : '#7a8cc2'} />
            <Text style={[st.tabBtnTxt, activeTab === tab.key && st.tabBtnTxtActive]}>{tab.label}</Text>
            {'badge' in tab && (tab.badge ?? 0) > 0 && (
              <View style={st.tabBadge}><Text style={st.tabBadgeTxt}>{(tab as any).badge}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: Chat CSKH ── */}
      {activeTab === 'chat_staff' && (
        <View>
          {chatSessions.length === 0 && (
            <View style={st.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={40} color="#c0cbe8" />
              <Text style={st.emptyChatTxt}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          )}
          {chatSessions.map(session => (
            <TouchableOpacity key={session.id} style={[st.chatCard, session.unread > 0 && st.chatCardUnread]} onPress={() => openChat(session)} activeOpacity={0.85}>
              <View style={[st.chatCardAvatar, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="headset" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={st.chatCardName} numberOfLines={1}>CSKH - {session.topic}</Text>
                  <Text style={st.chatCardTime}>{session.lastTime}</Text>
                </View>
                <Text style={[st.chatCardLast, session.unread > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{session.lastMessage}</Text>
              </View>
              {session.unread > 0 && <View style={st.chatUnreadDot}><Text style={st.chatUnreadTxt}>{session.unread}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── TAB: Chat HDV ── */}
      {activeTab === 'chat_guide' && (
        <View>
          {guideChatSessions.map(session => (
            <TouchableOpacity key={session.id} style={[st.chatCard, session.unread > 0 && st.chatCardUnread]} onPress={() => openGuideChat(session)} activeOpacity={0.85}>
              <View style={[st.chatCardAvatar, { backgroundColor: session.color }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{session.guideName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={st.chatCardName} numberOfLines={1}>{session.guideName}</Text>
                  <Text style={st.chatCardTime}>{session.time}</Text>
                </View>
                <Text style={st.chatCardSub} numberOfLines={1}>{session.tourName}</Text>
                <Text style={[st.chatCardLast, session.unread > 0 && { color: '#1f2a58', fontWeight: '700' }]} numberOfLines={1}>{session.lastMsg}</Text>
              </View>
              {session.unread > 0 && <View style={st.chatUnreadDot}><Text style={st.chatUnreadTxt}>{session.unread}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── TAB: Profile ── */}
      {activeTab === 'profile' && <>

      {/* ── Profile card ── */}
      <View style={st.profileCard}>
        <View style={[st.avatar, { backgroundColor: profile.avatarColor }]}>
          <Text style={st.avatarInitial}>{(profile.name || 'U').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={st.profileInfo}>
          <Text style={st.name}>{profile.name}</Text>
          <Text style={st.email}>{profile.email}</Text>
          {!!profile.phone && <Text style={st.phone}>{profile.phone}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#7a8cc2" />
        </TouchableOpacity>
      </View>

      {/* ── Loyalty card ── */}
      <View style={st.crmCard}>
        <View style={st.crmRow}>
          <Text style={st.crmTitle}>Điểm tích lũy</Text>
          <Text style={[st.crmPoints, { color: '#4f7cff' }]}>
            {profile.loyaltyPoints.toLocaleString('vi-VN')} điểm
          </Text>
        </View>
        <View style={st.crmRow}>
          <Text style={st.crmMeta}>Cấp thành viên</Text>
          <View style={[st.tierBadge, { backgroundColor: tierColor + '22' }]}>
            <Text style={[st.tierTxt, { color: tierColor }]}>{profile.loyaltyTier}</Text>
          </View>
        </View>
        {!!profile.voucher && (
          <View style={st.voucherRow}>
            <Ionicons name="ticket-outline" size={14} color="#4f7cff" />
            <Text style={st.voucherTxt}>
              Voucher: <Text style={st.voucherCode}>{profile.voucher}</Text>
            </Text>
          </View>
        )}
        <View style={st.progressWrap}>
          <View style={st.progressBg}>
            <View
              style={[
                st.progressFill,
                { width: `${Math.min((profile.loyaltyPoints % 1000) / 10, 100)}%` as any },
              ]}
            />
          </View>
          <Text style={st.progressHint}>
            {1000 - (profile.loyaltyPoints % 1000)} điểm đến tier tiếp theo
          </Text>
        </View>
      </View>

      {/* ── Edit button ── */}
      <TouchableOpacity
        style={st.editBtn}
        onPress={() => { setForm(profile); setModalVisible(true); }}>
        <Ionicons name="create-outline" size={17} color="#4f7cff" />
        <Text style={st.editBtnTxt}>Chỉnh sửa thông tin cá nhân</Text>
      </TouchableOpacity>

      {/* ── Menu items ── */}
      {([
        { href: '/guest_chat_center',   icon: 'chatbubbles-outline',   label: 'Live Chat (Hỗ trợ)',      color: '#f59e0b' }, // <-- THÊM DÒNG NÀY
        { href: '/guest_notifications', icon: 'notifications-outline', label: 'Thông báo',               color: '#4f7cff' },
        { href: '/guest_favorites',     icon: 'heart-outline',         label: 'Tour yêu thích',          color: '#ec4899' },
        { href: '/bookings',            icon: 'receipt-outline',       label: 'Lịch sử đặt tour',       color: '#2856d6' },
        { href: '/guest_loyalty',       icon: 'star-outline',          label: 'Điểm thưởng & Hạng',     color: '#f59e0b' },
        { href: '/guest_vouchers',      icon: 'ticket-outline',        label: 'Kho Voucher của tôi',     color: '#16a34a' },
        { href: '/guest_refund',        icon: 'refresh-outline',       label: 'Yêu cầu Hoàn tiền',      color: '#8b5cf6' },
        { href: '/guest_complaints',    icon: 'warning-outline',       label: 'Khiếu nại & Tranh chấp', color: '#dc2626' },
        { href: '/guest_booking_flow',  icon: 'map-outline',           label: 'Đặt tour mới',            color: '#06b6d4' },
      ] as const).map(item => (
        <TouchableOpacity
          key={item.href}
          style={st.menuItem}
          onPress={() => router.push(item.href as any)}>
          <View style={[st.menuIcon, { backgroundColor: (item as any).color + '18' }]}>
            <Ionicons name={item.icon} size={20} color={(item as any).color} />
          </View>
          <Text style={st.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {/* ── Dual role card ── */}
      <View style={st.dualCard}>
        <Text style={st.dualTitle}>Vai trò & Tài khoản</Text>
        {isGuideAlso ? (
          <TouchableOpacity style={st.dualRow} onPress={handleSwitchToGuide}>
            <View style={[st.dualIcon, { backgroundColor: '#edf9f0' }]}>
              <Ionicons name="map-outline" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dualLabel}>Chuyển sang tài khoản HDV</Text>
              <Text style={st.dualSub}>Quản lý lịch, nhận tour, thu nhập</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={st.dualRow}
            onPress={() => router.push('/guest-become-guide' as any)}>
            <View style={[st.dualIcon, { backgroundColor: '#edf2ff' }]}>
              <Ionicons name="person-add-outline" size={20} color="#4f7cff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.dualLabel}>Đăng ký làm Hướng dẫn viên</Text>
              <Text style={st.dualSub}>Kiếm thu nhập từ đam mê du lịch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={st.logoutTxt}>Đăng xuất</Text>
      </TouchableOpacity>

      </> /* end activeTab === 'profile' */}

      {/* ── Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={st.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={st.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.mheader}>
              <Text style={st.mtitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={st.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={st.mbody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              {/* Avatar color picker */}
              <Label t="Màu avatar" />
              <View style={st.colorRow}>
                {['#4f7cff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[st.colorDot, { backgroundColor: c }, form.avatarColor === c && st.colorDotActive]}
                    onPress={() => setField('avatarColor', c)}>
                    {form.avatarColor === c && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Label t="Họ và tên *" />
              <TextInput
                style={st.input}
                value={form.name}
                onChangeText={v => setField('name', v)}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Email" />
              <TextInput
                style={st.input}
                value={form.email}
                onChangeText={v => setField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Số điện thoại" />
              <TextInput
                style={st.input}
                value={form.phone}
                onChangeText={v => setField('phone', v)}
                keyboardType="phone-pad"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Ngày sinh" />
              <TextInput
                style={st.input}
                value={form.dob}
                onChangeText={v => setField('dob', v)}
                placeholder="VD: 01/01/1995"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Địa chỉ" />
              <TextInput
                style={st.input}
                value={form.address}
                onChangeText={v => setField('address', v)}
                placeholder="VD: TP. Hồ Chí Minh"
                placeholderTextColor="#b0bdd8"
              />

              <Label t="Voucher" />
              <TextInput
                style={st.input}
                value={form.voucher}
                onChangeText={v => setField('voucher', v.toUpperCase())}
                autoCapitalize="characters"
                placeholder="VD: SUMMER2026"
                placeholderTextColor="#b0bdd8"
              />

              <TouchableOpacity
                style={[st.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={st.saveBtnTxt}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ─── Small helpers ────────────────────────────────────────────
const Label = ({ t }: { t: string }) => <Text style={st.formLabel}>{t}</Text>;

// ─── Styles ───────────────────────────────────────────────────
const st = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  title:   { color: '#1f2a58', fontSize: 26, fontWeight: '700', marginBottom: 14 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e4ebff', padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12, marginBottom: 14,
  },
  avatar:        { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo:   { flex: 1 },
  name:          { color: '#1f2a58', fontWeight: '700', fontSize: 16 },
  email:         { color: '#7a8cc2', marginTop: 3, fontSize: 13 },
  phone:         { color: '#5f73a9', marginTop: 2, fontSize: 12 },

  crmCard:      { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 16, marginBottom: 14, gap: 10 },
  crmRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crmTitle:     { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  crmPoints:    { fontWeight: '800', fontSize: 16 },
  crmMeta:      { color: '#7a8cc2', fontSize: 13 },
  tierBadge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tierTxt:      { fontWeight: '800', fontSize: 13 },
  voucherRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voucherTxt:   { color: '#7a8cc2', fontSize: 13 },
  voucherCode:  { color: '#4f7cff', fontWeight: '700' },
  progressWrap: { gap: 5 },
  progressBg:   { height: 5, backgroundColor: '#e4ebff', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f7cff', borderRadius: 4 },
  progressHint: { color: '#7a8cc2', fontSize: 11 },

  editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#dfe7ff', paddingVertical: 12, marginBottom: 18 },
  editBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 14 },

  menuItem: { marginBottom: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  menuText: { color: '#1f2a58', fontWeight: '600', flex: 1 },

  dualCard:  { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 12 },
  dualTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  dualRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dualIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dualLabel: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  dualSub:   { color: '#7a8cc2', fontSize: 12, marginTop: 2 },

  logoutBtn: { marginTop: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutTxt: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle:   { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  mheader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  mtitle:   { fontSize: 17, fontWeight: '800', color: '#1f2a58' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  mbody:    { paddingHorizontal: 20, paddingTop: 8 },

  formLabel:     { color: '#1f2a58', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input:         { backgroundColor: '#f3f7ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1f2a58', fontSize: 14 },
  colorRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  colorDot:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorDotActive:{ borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  saveBtn:       { marginTop: 20, backgroundColor: '#4f7cff', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt:    { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Tab switcher ─────────────────────────────────────────
  tabRow:         { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', padding: 4, marginBottom: 14, gap: 4 },
  tabBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabBtnActive:   { backgroundColor: '#edf2ff' },
  tabBtnTxt:      { color: '#7a8cc2', fontSize: 12, fontWeight: '600' },
  tabBtnTxtActive:{ color: '#4f7cff', fontWeight: '700' },
  tabBadge:       { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt:    { color: '#fff', fontSize: 9, fontWeight: '800' },

  // ── Chat list cards ──────────────────────────────────────
  chatCard:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 8 },
  chatCardUnread:  { borderColor: '#dbeafe', backgroundColor: '#f0f7ff' },
  chatCardAvatar:  { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chatCardName:    { fontSize: 13, fontWeight: '700', color: '#1f2a58', flex: 1 },
  chatCardTime:    { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' as const, paddingLeft: 4 },
  chatCardSub:     { fontSize: 11, color: '#4f7cff', fontWeight: '600', marginBottom: 2 },
  chatCardLast:    { fontSize: 12, color: '#94a3b8' },
  chatUnreadDot:   { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  chatUnreadTxt:   { color: '#fff', fontSize: 10, fontWeight: '800' },
  emptyChat:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyChatTxt:    { color: '#7a8cc2', fontSize: 13 },

  // ── Chat detail screen ───────────────────────────────────
  chatTopBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', gap: 8 },
  iconBtn:        { width: 34, height: 34, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  chatAvatar:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chatAvatarTxt:  { color: '#fff', fontWeight: '800', fontSize: 14 },
  chatName:       { color: '#1f2a58', fontWeight: '800', fontSize: 14 },
  chatSub:        { color: '#7a8cc2', fontSize: 11 },
  msgListContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, gap: 8 },
  msgRow:         { flexDirection: 'row', gap: 7 },
  msgRowSelf:     { alignSelf: 'flex-end' as const,   maxWidth: '88%', flexDirection: 'row-reverse' },
  msgRowOther:    { alignSelf: 'flex-start' as const,  maxWidth: '88%' },
  miniAvatar:     { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end' as const },
  bubbleColLeft:  { flexShrink: 1, gap: 2, alignItems: 'flex-start' as const },
  bubbleColRight: { flexShrink: 1, gap: 2, alignItems: 'flex-end' as const },
  bubble:         { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleLeft:     { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderBottomLeftRadius: 4 },
  bubbleRight:    { backgroundColor: '#4f7cff', borderBottomRightRadius: 4 },
  bubbleTxt:      { fontSize: 13, lineHeight: 19, flexShrink: 1, flexWrap: 'wrap' as const },
  bubbleTxtLeft:  { color: '#1f2a58' },
  bubbleTxtRight: { color: '#fff' },
  timeStamp:      { fontSize: 10, color: '#94a3b8' },
  inputBar:       { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4ebff', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  chatInput:      { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 9, color: '#1f2a58', fontSize: 13, maxHeight: 88 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:     { backgroundColor: '#e2e8f0' },
});