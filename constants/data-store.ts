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
// LIVE CHAT (Bổ sung để sửa lỗi staff-livechat)
// ─────────────────────────────────────────
const CHATS_KEY = '@shared_chat_sessions';

export interface SharedChatMessage {
  from: "guest" | "staff";
  text: string;
  time: string;
  type?: "text" | "image" | "voice" | "booking_ref" | "system";
}

export interface SharedChatSession {
  id: string;
  guestName: string;
  guestId: string;
  lastMessage: string; 
  lastTime: string;    // Quan trọng: profile.tsx dùng trường này
  unread: number;      // Quan trọng: profile.tsx dùng trường này làm tổng số tin chưa đọc
  unreadForStaff: number; 
  unreadForGuest: number; 
  resolved: boolean;
  createdAt: string;
  topic: string;
  bookingRef?: string;
  priority: "urgent" | "normal" | "low";
  messages: SharedChatMessage[];
}

/** Lấy danh sách chat */
export async function getSharedChatSessions(): Promise<SharedChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** * Staff gửi tin nhắn (Dùng cho staff-livechat.tsx)
 */
export async function staffSendMessage(sessionId: string, text: string) {
  const sessions = await getSharedChatSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const newMessage: SharedChatMessage = {
    from: 'staff',
    text,
    time: now
  };

  sessions[idx].messages.push(newMessage);
  sessions[idx].lastMessage = text;
  sessions[idx].lastTime = now;
  sessions[idx].unreadForGuest += 1; // Báo cho Guest có tin mới
  sessions[idx].unread = sessions[idx].unreadForGuest; 

  await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
}

/** * Guest gửi tin nhắn (Dùng cho profile.tsx)
 */
export async function guestSendMessage(sessionId: string, text: string) {
  const sessions = await getSharedChatSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const newMessage: SharedChatMessage = {
    from: 'guest',
    text,
    time: now
  };

  sessions[idx].messages.push(newMessage);
  sessions[idx].lastMessage = text;
  sessions[idx].lastTime = now;
  sessions[idx].unreadForStaff += 1; // Báo cho Staff có tin mới

  await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
}



/** Đánh dấu Staff đã đọc (Chỉ giữ lại 1 bản này) */
export async function staffMarkChatRead(sessionId: string) {
  const sessions = await getSharedChatSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].unreadForStaff = 0;
    await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  }
}

/** Đánh dấu Guest đã đọc */
export async function guestMarkChatRead(sessionId: string) {
  const sessions = await getSharedChatSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].unreadForGuest = 0;
    sessions[idx].unread = 0;
    await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
  }
}