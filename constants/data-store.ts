/**
 * constants/data-store.ts
 *
 * Shared data layer cho toàn bộ app.
 * - Admin CRUD tour/guide → ghi vào AsyncStorage
 * - Guest home/explore đọc từ AsyncStorage (fallback sang seed data)
 * - Mọi bên đều dùng các hàm này thay vì import TOURS/GUIDES trực tiếp
 *
 * AsyncStorage keys:
 *   @app_tours   – danh sách tour (admin quản lý)
 *   @app_guides  – danh sách HDV  (admin quản lý)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUIDES as SEED_GUIDES, TOURS as SEED_TOURS } from './travel-data';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface AppTour {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: string;        // "2800000" (số, không có đ)
  rating: number;
  seats: number;
  seatsLeft: number;
  departure: string;
  status: 'active' | 'full' | 'draft';
  description: string;
  // trường tương thích với TOURS gốc
  date?: string;
  tags?: string[];
  color?: string;
}

export interface AppGuide {
  id: string;
  name: string;
  location: string;
  experience: string;
  skills: string[];     // array
  rating: number;
  tours: number;
  phone: string;
  email: string;
  status: 'active' | 'busy' | 'inactive';
  note: string;
  match?: number;       // AI match score, tính động hoặc random
}

const TOURS_KEY  = '@app_tours';
const GUIDES_KEY = '@app_guides';

// ─────────────────────────────────────────
// Convert seed data → AppTour / AppGuide
// ─────────────────────────────────────────
function seedToAppTour(t: (typeof SEED_TOURS)[number]): AppTour {
  const priceNum = Number(String(t.price).replace(/\./g, '').replace('đ', ''));
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    duration: t.duration,
    price: String(priceNum),
    rating: t.rating,
    seats: t.seatsLeft + 2,          // seed không có total seats, ước tính
    seatsLeft: t.seatsLeft,
    departure: t.departure,
    status: t.seatsLeft === 0 ? 'full' : 'active',
    description: t.tags?.join(', ') || '',
    date: (t as any).date || '',
    tags: t.tags || [],
    color: (t as any).color || '#9cc3ff',
  };
}

function seedToAppGuide(g: (typeof SEED_GUIDES)[number]): AppGuide {
  return {
    id: g.id,
    name: g.name,
    location: g.location,
    experience: g.experience,
    skills: g.skills,
    rating: g.rating,
    tours: g.tours,
    phone: '',
    email: '',
    status: 'active',
    note: '',
    match: g.match,
  };
}

// ─────────────────────────────────────────
// TOURS
// ─────────────────────────────────────────

/** Lấy tất cả tour (chỉ active + full, không lấy draft cho guest) */
export async function getPublicTours(): Promise<AppTour[]> {
  try {
    const raw = await AsyncStorage.getItem(TOURS_KEY);
    if (raw) {
      const all: AppTour[] = JSON.parse(raw);
      return all.filter(t => t.status !== 'draft');
    }
  } catch {}
  // Fallback: seed data
  return SEED_TOURS.map(seedToAppTour);
}

/** Lấy tất cả tour (kể cả draft) – dùng cho admin */
export async function getAllTours(): Promise<AppTour[]> {
  try {
    const raw = await AsyncStorage.getItem(TOURS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = SEED_TOURS.map(seedToAppTour);
  await AsyncStorage.setItem(TOURS_KEY, JSON.stringify(seeded)).catch(() => {});
  return seeded;
}

/** Lưu toàn bộ danh sách tour */
export async function saveTours(tours: AppTour[]): Promise<void> {
  await AsyncStorage.setItem(TOURS_KEY, JSON.stringify(tours)).catch(() => {});
}

/** Thêm hoặc cập nhật 1 tour */
export async function upsertTour(tour: AppTour): Promise<AppTour[]> {
  const all = await getAllTours();
  const idx = all.findIndex(t => t.id === tour.id);
  if (idx >= 0) all[idx] = tour; else all.unshift(tour);
  await saveTours(all);
  return all;
}

/** Xóa 1 tour */
export async function deleteTour(id: string): Promise<AppTour[]> {
  const all = await getAllTours();
  const updated = all.filter(t => t.id !== id);
  await saveTours(updated);
  return updated;
}

// ─────────────────────────────────────────
// GUIDES
// ─────────────────────────────────────────

/** Lấy HDV active/busy cho guest */
export async function getPublicGuides(): Promise<AppGuide[]> {
  try {
    const raw = await AsyncStorage.getItem(GUIDES_KEY);
    if (raw) {
      const all: AppGuide[] = JSON.parse(raw);
      return all.filter(g => g.status !== 'inactive');
    }
  } catch {}
  return SEED_GUIDES.map(seedToAppGuide);
}

/** Lấy tất cả HDV – dùng cho admin */
export async function getAllGuides(): Promise<AppGuide[]> {
  try {
    const raw = await AsyncStorage.getItem(GUIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = SEED_GUIDES.map(seedToAppGuide);
  await AsyncStorage.setItem(GUIDES_KEY, JSON.stringify(seeded)).catch(() => {});
  return seeded;
}

/** Lưu toàn bộ danh sách HDV */
export async function saveGuides(guides: AppGuide[]): Promise<void> {
  await AsyncStorage.setItem(GUIDES_KEY, JSON.stringify(guides)).catch(() => {});
}

/** Thêm hoặc cập nhật 1 HDV */
export async function upsertGuide(guide: AppGuide): Promise<AppGuide[]> {
  const all = await getAllGuides();
  const idx = all.findIndex(g => g.id === guide.id);
  if (idx >= 0) all[idx] = guide; else all.unshift(guide);
  await saveGuides(all);
  return all;
}

/** Xóa 1 HDV */
export async function deleteGuide(id: string): Promise<AppGuide[]> {
  const all = await getAllGuides();
  const updated = all.filter(g => g.id !== id);
  await saveGuides(updated);
  return updated;
}

// ─────────────────────────────────────────
// GUEST PROFILE
// ─────────────────────────────────────────
const PROFILE_KEY = '@guest_profile';

export interface GuestProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  loyaltyPoints: number;
  tier: string;         // 'New' | 'Loyal' | 'VIP'
  activeVoucher: string;
}

const DEFAULT_PROFILE: GuestProfile = {
  name: 'Nguyễn An', email: 'nguyenan@email.com',
  phone: '0901 234 567', avatar: '',
  loyaltyPoints: 1200, tier: 'Loyal', activeVoucher: 'SUMMER2026',
};

export async function getGuestProfile(): Promise<GuestProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PROFILE;
}

export async function saveGuestProfile(profile: GuestProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
}

// ─────────────────────────────────────────
// REFUND — shared key dùng chung guest ↔ staff
// ─────────────────────────────────────────
const GUEST_REFUND_KEY = "@guest_refunds";
const STAFF_REFUND_KEY = "@staff_refunds";

export async function getGuestRefunds(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_REFUND_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveGuestRefunds(list: any[]): Promise<void> {
  await AsyncStorage.setItem(GUEST_REFUND_KEY, JSON.stringify(list)).catch(() => {});
}

export async function getStaffRefunds(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(STAFF_REFUND_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveStaffRefunds(list: any[]): Promise<void> {
  await AsyncStorage.setItem(STAFF_REFUND_KEY, JSON.stringify(list)).catch(() => {});
}

/** Đồng bộ: khi guest tạo refund → tự push vào staff queue */
export async function pushRefundToStaff(refund: any, guestName: string): Promise<void> {
  const list = await getStaffRefunds();
  const exists = list.find((r: any) => r.id === refund.id);
  if (!exists) {
    list.unshift({ ...refund, guestName, guestPhone: "", refundPercent: 100, feeAmount: 0, priority: "normal" });
    await saveStaffRefunds(list);
  }
}

/** Đồng bộ ngược: khi staff duyệt → cập nhật status bên guest */
export async function syncRefundStatusToGuest(refundId: string, status: string, note?: string): Promise<void> {
  const list = await getGuestRefunds();
  const updated = list.map((r: any) =>
    r.id === refundId ? { ...r, status, note: note || r.note, resolvedAt: new Date().toLocaleDateString("vi-VN") } : r
  );
  await saveGuestRefunds(updated);
}

// ─────────────────────────────────────────
// ADMIN REFUND — key riêng cho admin (đọc từ staff_refunds, không ghi đè)
// ─────────────────────────────────────────
const ADMIN_REFUND_KEY = "@admin_refunds";

export async function getAdminRefunds(): Promise<any[]> {
  try {
    // Admin đọc từ staff_refunds để đồng bộ dữ liệu thực
    const staffRaw = await AsyncStorage.getItem(STAFF_REFUND_KEY);
    const staffList = staffRaw ? JSON.parse(staffRaw) : [];
    if (staffList.length > 0) return staffList;
    // fallback sang admin_refunds riêng nếu có
    const adminRaw = await AsyncStorage.getItem(ADMIN_REFUND_KEY);
    return adminRaw ? JSON.parse(adminRaw) : [];
  } catch { return []; }
}

export async function saveAdminRefunds(list: any[]): Promise<void> {
  // Ghi đồng thời vào cả staff_refunds để staff thấy thay đổi của admin
  await AsyncStorage.setItem(STAFF_REFUND_KEY, JSON.stringify(list)).catch(() => {});
  await AsyncStorage.setItem(ADMIN_REFUND_KEY, JSON.stringify(list)).catch(() => {});
}

/** Admin duyệt/từ chối → đồng bộ ngược về guest */
export async function adminSyncRefundToGuest(refundId: string, status: string, note?: string): Promise<void> {
  await syncRefundStatusToGuest(refundId, status, note);
}

// ─────────────────────────────────────────
// COMPLAINTS — shared key dùng chung guest ↔ staff ↔ admin
// AsyncStorage key: @complaints
// ─────────────────────────────────────────
const COMPLAINTS_KEY = "@complaints";

export async function getComplaints(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(COMPLAINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveComplaints(list: any[]): Promise<void> {
  await AsyncStorage.setItem(COMPLAINTS_KEY, JSON.stringify(list)).catch(() => {});
}

/** Guest tạo khiếu nại → push vào @complaints (staff/admin đọc cùng key) */
export async function pushComplaintToStaff(complaint: any): Promise<void> {
  const list = await getComplaints();
  const exists = list.find((c: any) => c.id === complaint.id);
  if (!exists) {
    list.unshift(complaint);
    await saveComplaints(list);
  }
}

/** Staff/Admin cập nhật trạng thái khiếu nại → đồng bộ về guest */
export async function syncComplaintStatusToGuest(
  complaintId: string,
  status: string,
  adminNote?: string
): Promise<void> {
  // Cập nhật trong @complaints (chung)
  const list = await getComplaints();
  const updated = list.map((c: any) =>
    c.id === complaintId
      ? { ...c, status, adminNote: adminNote || c.adminNote, resolvedAt: new Date().toLocaleDateString("vi-VN") }
      : c
  );
  await saveComplaints(updated);

  // Cập nhật trong @guest_complaints (riêng của guest để xem)
  try {
    const gRaw = await AsyncStorage.getItem("@guest_complaints");
    const gList = gRaw ? JSON.parse(gRaw) : [];
    const gUpdated = gList.map((c: any) =>
      c.id === complaintId
        ? { ...c, status, adminNote: adminNote || c.adminNote, resolvedAt: new Date().toLocaleDateString("vi-VN") }
        : c
    );
    await AsyncStorage.setItem("@guest_complaints", JSON.stringify(gUpdated));
  } catch {}
}

/** Lấy khiếu nại của 1 guest cụ thể (lọc theo guestName hoặc bookingId) */
export async function getGuestComplaints(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem("@guest_complaints");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─────────────────────────────────────────
// LIVE CHAT — shared key guest ↔ staff ↔ admin
// AsyncStorage key: @chat_sessions
// Mỗi session: { id, guestId, guestName, messages[], ... }
// ─────────────────────────────────────────
const CHAT_SESSIONS_KEY = "@chat_sessions";

export interface SharedChatMessage {
  from: "guest" | "staff";
  text: string;
  time: string;
  type?: "text" | "image" | "system";
}

export interface SharedChatSession {
  id: string;
  guestId: string;
  guestName: string;
  topic: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  unreadForStaff: number;
  resolved: boolean;
  priority: "urgent" | "normal" | "low";
  bookingRef?: string;
  tourName?: string;
  amount?: string;
  createdAt: string;
  messages: SharedChatMessage[];
}

const SEED_SHARED_CHATS: SharedChatSession[] = [
  {
    id: "ch001", guestId: "acc-guest-1", guestName: "Nguyễn An",
    topic: "Yêu cầu hoàn tiền khẩn", lastMessage: "Booking #BK001001 của tôi bị hủy, cần hoàn tiền gấp",
    lastTime: "09:16", unread: 0, unreadForStaff: 2,
    resolved: false, priority: "urgent", bookingRef: "BK001001",
    tourName: "Đà Lạt Mộng Mơ 3N2D", amount: "2.990.000đ",
    createdAt: new Date().toISOString(),
    messages: [
      { from: "guest", text: "Xin chào CSKH, tour Đà Lạt của tôi bị hủy đột ngột! Tôi không nhận được thông báo nào cả 😡", time: "09:15" },
      { from: "guest", text: "Booking #BK001001, tôi đã thanh toán 2.990.000đ, cần hoàn tiền gấp", time: "09:16" },
      { from: "staff", text: "Xin chào bạn Nguyễn An! Tôi rất tiếc về sự bất tiện này 🙏 Để tôi kiểm tra ngay nhé.", time: "13:40" },
      { from: "staff", text: "Booking #BK001001 sẽ được hoàn 100% = 2.990.000đ trong vòng 3–5 ngày làm việc.", time: "13:52" },
      { from: "guest", text: "Vậy khi nào tôi nhận được tiền? Thẻ sắp hết hạn 31/03 rồi!", time: "13:55" },
    ],
  },
  {
    id: "ch002", guestId: "acc-guest-2", guestName: "Trần Văn B",
    topic: "Khiếu nại HDV trễ giờ", lastMessage: "HDV đến trễ 2 tiếng, tôi lỡ mất buổi sáng",
    lastTime: "10:32", unread: 0, unreadForStaff: 3,
    resolved: false, priority: "urgent", bookingRef: "BK001002",
    tourName: "Phú Quốc Thiên Đường 4N3D", amount: "4.500.000đ",
    createdAt: new Date().toISOString(),
    messages: [
      { from: "guest", text: "Chào bạn, tôi muốn khiếu nại về chuyến đi Phú Quốc", time: "10:30" },
      { from: "guest", text: "HDV đến trễ 2 tiếng so với lịch hẹn 08:00, không thông báo trước", time: "10:31" },
      { from: "guest", text: "Tôi lỡ mất cả buổi sáng tham quan đảo, rất thất vọng!", time: "10:32" },
    ],
  },
  {
    id: "ch003", guestId: "acc-guest-3", guestName: "Lê Thị C",
    topic: "Tư vấn tour gia đình", lastMessage: "Cảm ơn bạn đã hỗ trợ nhiệt tình!",
    lastTime: "Hôm qua", unread: 0, unreadForStaff: 0,
    resolved: true, priority: "low",
    createdAt: new Date().toISOString(),
    messages: [
      { from: "guest", text: "Xin hỏi tour Hội An có phù hợp cho gia đình có trẻ nhỏ không?", time: "14:00" },
      { from: "staff", text: "Dạ có ạ! Tour Hội An rất thích hợp cho gia đình. Có xe đưa đón thoải mái.", time: "14:05" },
      { from: "guest", text: "Cảm ơn bạn đã hỗ trợ nhiệt tình!", time: "14:10" },
    ],
  },
  {
    id: "ch004", guestId: "acc-guest-4", guestName: "Phạm Quốc D",
    topic: "Hỏi chính sách hủy tour", lastMessage: "Tôi muốn hỏi về chính sách hủy tour trước 3 ngày",
    lastTime: "11:00", unread: 0, unreadForStaff: 1,
    resolved: false, priority: "normal",
    createdAt: new Date().toISOString(),
    messages: [
      { from: "guest", text: "Chào CSKH, cho tôi hỏi nếu hủy tour trước 3 ngày thì được hoàn bao nhiêu % tiền vậy?", time: "11:00" },
    ],
  },
  {
    id: "ch005", guestId: "acc-guest-5", guestName: "Võ Thị E",
    topic: "Yêu cầu nâng cấp phòng", lastMessage: "Tôi muốn nâng cấp lên phòng deluxe view biển",
    lastTime: "10:10", unread: 0, unreadForStaff: 0,
    resolved: false, priority: "normal", bookingRef: "BK001013",
    tourName: "Vũng Tàu Resort Weekend", amount: "2.100.000đ",
    createdAt: new Date().toISOString(),
    messages: [
      { from: "guest", text: "Xin chào, booking BK001013 của tôi đang ở phòng standard.", time: "10:00" },
      { from: "guest", text: "Tôi muốn nâng cấp lên phòng deluxe view biển, thêm bao nhiêu tiền?", time: "10:02" },
      { from: "staff", text: "Dạ chào bạn! Phòng Deluxe view biển chênh lệch 450.000đ/đêm ạ. Tour 3 đêm tổng thêm 1.350.000đ.", time: "10:08" },
      { from: "guest", text: "Để tôi suy nghĩ thêm và trả lời sau nhé bạn ơi", time: "10:10" },
    ],
  },
];

export async function getSharedChatSessions(): Promise<SharedChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(SEED_SHARED_CHATS)).catch(() => {});
  return SEED_SHARED_CHATS;
}

export async function saveSharedChatSessions(list: SharedChatSession[]): Promise<void> {
  await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(list)).catch(() => {});
}

/** Guest gửi tin → tăng unreadForStaff */
export async function guestSendMessage(sessionId: string, text: string): Promise<void> {
  const sessions = await getSharedChatSessions();
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const msg: SharedChatMessage = { from: "guest", text, time };
  const updated = sessions.map(s =>
    s.id === sessionId
      ? { ...s, messages: [...s.messages, msg], lastMessage: text, lastTime: time, unreadForStaff: s.unreadForStaff + 1 }
      : s
  );
  await saveSharedChatSessions(updated);
}

/** Staff gửi tin → tăng unread (cho guest) */
export async function staffSendMessage(sessionId: string, text: string): Promise<void> {
  const sessions = await getSharedChatSessions();
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const msg: SharedChatMessage = { from: "staff", text, time };
  const updated = sessions.map(s =>
    s.id === sessionId
      ? { ...s, messages: [...s.messages, msg], lastMessage: text, lastTime: time, unread: s.unread + 1 }
      : s
  );
  await saveSharedChatSessions(updated);
}

/** Guest mở chat → reset unread */
export async function guestMarkChatRead(sessionId: string): Promise<void> {
  const sessions = await getSharedChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, unread: 0 } : s);
  await saveSharedChatSessions(updated);
}

/** Staff mở chat → reset unreadForStaff */
export async function staffMarkChatRead(sessionId: string): Promise<void> {
  const sessions = await getSharedChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, unreadForStaff: 0 } : s);
  await saveSharedChatSessions(updated);
}

/** Guest tạo session mới (lần đầu liên hệ staff) */
export async function guestCreateChatSession(guestId: string, guestName: string, topic: string, firstMessage: string): Promise<SharedChatSession> {
  const sessions = await getSharedChatSessions();
  const existing = sessions.find(s => s.guestId === guestId && !s.resolved);
  if (existing) return existing;
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const newSession: SharedChatSession = {
    id: `ch${Date.now()}`, guestId, guestName, topic,
    lastMessage: firstMessage, lastTime: time,
    unread: 0, unreadForStaff: 1,
    resolved: false, priority: "normal",
    createdAt: new Date().toISOString(),
    messages: [{ from: "guest", text: firstMessage, time }],
  };
  await saveSharedChatSessions([newSession, ...sessions]);
  return newSession;
}