/**
 * constants/chat-store.ts
 * Quản lý chung dữ liệu Chat giữa Guest và Guide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_STORAGE_KEY = '@app_shared_chats';

export interface ChatMessage {
  from: 'guest' | 'guide' | 'system';
  text: string;
  time: string;
}

export interface ChatSession {
  id: string; // Thường dùng luôn bookingId làm id phòng chat
  bookingId: string;
  guestId: string;
  guestName: string;
  guideId: string;
  guideName: string;
  tourName: string;
  messages: ChatMessage[];
  lastMessage: string;
  lastTime: string;
  unreadGuest: number; // Số tin chưa đọc của Khách
  unreadGuide: number; // Số tin chưa đọc của HDV
}

// Lấy toàn bộ danh sách Chat
export const getAllChats = async (): Promise<ChatSession[]> => {
  try {
    const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

// Khởi tạo phòng chat mới (hoặc lấy phòng cũ) dựa trên Booking
export const initOrGetChatSession = async (booking: any): Promise<ChatSession> => {
  const chats = await getAllChats();
  const existingIndex = chats.findIndex(c => c.bookingId === booking.id);
  
  if (existingIndex > -1) {
    return chats[existingIndex];
  }

  const newSession: ChatSession = {
    id: booking.id,
    bookingId: booking.id,
    guestId: booking.customerId || 'guest_temp', // Tạm thời nếu chưa có ID
    guestName: booking.customerName || 'Khách hàng',
    guideId: booking.guideId,
    guideName: booking.guideName || 'Hướng dẫn viên',
    tourName: booking.tourName || 'Tour',
    messages: [{
      from: 'system',
      text: `Phòng chat cho chuyến đi ${booking.tourName || ''} đã được tạo. Bạn có thể bắt đầu trao đổi!`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }],
    lastMessage: 'Phòng chat đã được tạo',
    lastTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    unreadGuest: 0,
    unreadGuide: 1, // Báo cho HDV biết có chat mới
  };

  chats.unshift(newSession);
  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  return newSession;
};

// Gửi tin nhắn
export const sendMessage = async (bookingId: string, senderRole: 'guest' | 'guide', text: string) => {
  const chats = await getAllChats();
  const idx = chats.findIndex(c => c.bookingId === bookingId);
  if (idx === -1) return null;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  
  // Gán đúng role người gửi vào tin nhắn
  const newMsg: ChatMessage = { 
    from: senderRole, 
    text, 
    time: now 
  };

  chats[idx].messages.push(newMsg);
  chats[idx].lastMessage = text;
  chats[idx].lastTime = now;
  
  // Cập nhật số tin chưa đọc cho bên đối diện
  if (senderRole === 'guest') chats[idx].unreadGuide += 1;
  else chats[idx].unreadGuest += 1;

  const [updatedChat] = chats.splice(idx, 1);
  chats.unshift(updatedChat);

  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  return updatedChat;
};

// Đánh dấu đã đọc
export const markAsRead = async (bookingId: string, role: 'guest' | 'guide') => {
  const chats = await getAllChats();
  const idx = chats.findIndex(c => c.bookingId === bookingId);
  if (idx === -1) return;

  if (role === 'guest') chats[idx].unreadGuest = 0;
  if (role === 'guide') chats[idx].unreadGuide = 0;

  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
};