/**
 * constants/tracking-store.ts
 * Trạm trung chuyển tín hiệu thực thi Tour (On-tour)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_EVENTS_KEY = '@tour_tracking_events';

export interface TrackingEvent {
  bookingId: string;
  type: 'guide_ended_tour' | 'guest_confirmed_end' | 'sos_alert';
  timestamp: string;
  reason?: string;
}

// Đẩy một sự kiện mới vào trạm tín hiệu
export const emitTrackingEvent = async (event: TrackingEvent) => {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_EVENTS_KEY);
    const events: TrackingEvent[] = raw ? JSON.parse(raw) : [];
    // Ghi đè sự kiện cùng loại của cùng 1 booking
    const filtered = events.filter(e => !(e.bookingId === event.bookingId && e.type === event.type));
    filtered.push(event);
    await AsyncStorage.setItem(TRACKING_EVENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Lỗi gửi tín hiệu tracking:", error);
  }
};

// Đọc tín hiệu mới nhất của một tour
export const getTrackingEvents = async (bookingId: string): Promise<TrackingEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_EVENTS_KEY);
    const events: TrackingEvent[] = raw ? JSON.parse(raw) : [];
    return events.filter(e => e.bookingId === bookingId);
  } catch (error) {
    return [];
  }
};

// Xóa tín hiệu khi tour đã hoàn thành hẳn
export const clearTrackingEvents = async (bookingId: string) => {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_EVENTS_KEY);
    const events: TrackingEvent[] = raw ? JSON.parse(raw) : [];
    const filtered = events.filter(e => e.bookingId !== bookingId);
    await AsyncStorage.setItem(TRACKING_EVENTS_KEY, JSON.stringify(filtered));
  } catch (error) {}
};