/**
 * constants/chat-store.ts
 * Quản lý chung dữ liệu Chat (Guest-Guide VÀ Hỗ trợ CSKH)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// 1. CHAT GIỮA KHÁCH VÀ HDV (Giữ nguyên)
// ==========================================
const CHAT_STORAGE_KEY = '@app_shared_chats';
export interface ChatMessage { from: 'guest' | 'guide' | 'system'; text: string; time: string; }
export interface ChatSession {
  id: string; bookingId: string; guestId: string; guestName: string;
  guideId: string; guideName: string; tourName: string;
  messages: ChatMessage[]; lastMessage: string; lastTime: string;
  unreadGuest: number; unreadGuide: number;
}
export const getAllChats = async (): Promise<ChatSession[]> => {
  try { const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch (error) { return []; }
};
export const initOrGetChatSession = async (booking: any): Promise<ChatSession> => {
  const chats = await getAllChats();
  const existing = chats.find(c => c.bookingId === booking.id);
  if (existing) return existing;
  const newSession: ChatSession = {
    id: booking.id, bookingId: booking.id,
    guestId: booking.guestId || 'guest-1', guestName: booking.customerName || 'Khách',
    guideId: booking.guideId || 'guide-1', guideName: booking.guideName || 'HDV',
    tourName: booking.tourName || 'Tour', messages: [],
    lastMessage: 'Đã tạo phòng chat', lastTime: new Date().toLocaleTimeString('vi-VN'),
    unreadGuest: 0, unreadGuide: 0
  };
  chats.unshift(newSession);
  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  return newSession;
};
export const sendMessage = async (bookingId: string, senderRole: 'guest' | 'guide', text: string) => {
  const chats = await getAllChats();
  const idx = chats.findIndex(c => c.bookingId === bookingId);
  if (idx === -1) return null;
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  chats[idx].messages.push({ from: senderRole, text, time: now });
  chats[idx].lastMessage = text; chats[idx].lastTime = now;
  if (senderRole === 'guest') chats[idx].unreadGuide += 1; else chats[idx].unreadGuest += 1;
  const [updatedChat] = chats.splice(idx, 1); chats.unshift(updatedChat);
  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  return updatedChat;
};
export const markAsRead = async (bookingId: string, reader: 'guest' | 'guide') => {
  const chats = await getAllChats();
  const idx = chats.findIndex(c => c.bookingId === bookingId);
  if (idx !== -1) {
    if (reader === 'guest') chats[idx].unreadGuest = 0; else chats[idx].unreadGuide = 0;
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  }
};

// ==========================================
// 2. CHAT HỖ TRỢ CSKH (STAFF <-> GUEST/GUIDE)
// ==========================================
const SUPPORT_CHAT_KEY = '@app_support_chats';

export interface SupportMessage {
  from: 'user' | 'staff' | 'system';
  text: string;
  time: string;
}

export interface SupportSession {
  id: string; // userId của người cần hỗ trợ
  userId: string;
  userName: string;
  userRole: 'guest' | 'guide';
  messages: SupportMessage[];
  lastMessage: string;
  lastTime: string;
  unreadStaff: number;
  unreadUser: number;
  resolved: boolean;
}

export const getAllSupportChats = async (): Promise<SupportSession[]> => {
  try {
    const raw = await AsyncStorage.getItem(SUPPORT_CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

// Dành cho Guest hoặc Staff khi muốn chủ động tạo Ticket chat
export const initOrGetSupportChat = async (user: {id: string, name: string, role: 'guest' | 'guide'}): Promise<SupportSession> => {
  const chats = await getAllSupportChats();
  const existing = chats.find(c => c.userId === user.id);
  if (existing) return existing;

  const newSession: SupportSession = {
    id: user.id, userId: user.id, userName: user.name, userRole: user.role,
    messages: [], lastMessage: 'Hệ thống đã kết nối bộ phận CSKH',
    lastTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    unreadStaff: 0, unreadUser: 0, resolved: false
  };
  chats.unshift(newSession);
  await AsyncStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(chats));
  return newSession;
};

export const sendSupportMessage = async (userId: string, sender: 'user' | 'staff' | 'system', text: string) => {
  const chats = await getAllSupportChats();
  const idx = chats.findIndex(c => c.userId === userId);
  if (idx === -1) return null;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  chats[idx].messages.push({ from: sender, text, time: now });
  chats[idx].lastMessage = text;
  chats[idx].lastTime = now;
  chats[idx].resolved = false; // Mở lại ticket nếu có tin nhắn mới

  if (sender === 'user') chats[idx].unreadStaff += 1;
  else if (sender === 'staff') chats[idx].unreadUser += 1;

  const [updatedChat] = chats.splice(idx, 1);
  chats.unshift(updatedChat);
  await AsyncStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(chats));
  return updatedChat;
};

export const markSupportChatRead = async (userId: string, reader: 'user' | 'staff') => {
  const chats = await getAllSupportChats();
  const idx = chats.findIndex(c => c.userId === userId);
  if (idx !== -1) {
    if (reader === 'user') chats[idx].unreadUser = 0;
    else chats[idx].unreadStaff = 0;
    await AsyncStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(chats));
  }
};

export const resolveSupportChat = async (userId: string) => {
  const chats = await getAllSupportChats();
  const idx = chats.findIndex(c => c.userId === userId);
  if (idx !== -1) {
    chats[idx].resolved = true;
    await AsyncStorage.setItem(SUPPORT_CHAT_KEY, JSON.stringify(chats));
  }
};