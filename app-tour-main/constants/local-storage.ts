import * as SecureStore from 'expo-secure-store';

export type FavoriteTourIds = string[];

export type ServiceSelection = {
  id: string;
  label: string;
  unitPrice: number;
  selected: boolean;
  type?: 'main' | 'cross'; // cross: dịch vụ phụ trợ (xe, máy ảnh, eSIM)
};

export type CheckoutDraft = {
  tourId: string;
  guideId?: string;
  guests: number;
  basePrice: number;
  serviceSelections: ServiceSelection[];
  paymentMethod?: 'card' | 'bank' | 'wallet';
  savedAt: string;
};

export type BookingRecord = {
  id: string;
  tourId: string;
  guideId?: string;
  guests: number;
  basePrice: number;
  servicesTotal: number;
  totalAmount: number;
  paymentMethod: 'card' | 'bank' | 'wallet';
  status: 'pending' | 'paid' | 'checked-in' | 'on-tour' | 'completed' | 'cancelled';
  createdAt: string;
  holdUntil?: string; // ISO timestamp for booking hold expiration
  loyaltyPoint?: number; // CRM: tích điểm
  customerType?: 'new' | 'frequent' | 'loyal' | 'vip'; // CRM: phân cấp khách hàng
  voucherCode?: string; // CRM: mã giảm giá
};
// CRM API: tích điểm, tặng voucher, phân cấp khách hàng
export async function addLoyaltyPoint(bookingId: string, point: number): Promise<void> {
  const records = await getBookingRecords();
  const next = records.map((recordItem) =>
    recordItem.id === bookingId
      ? { ...recordItem, loyaltyPoint: (recordItem.loyaltyPoint || 0) + point }
      : recordItem
  );
  await writeJson(STORAGE_KEYS.bookings, next);
}

export async function assignCustomerType(bookingId: string, type: 'new' | 'frequent' | 'loyal' | 'vip'): Promise<void> {
  const records = await getBookingRecords();
  const next = records.map((recordItem) =>
    recordItem.id === bookingId
      ? { ...recordItem, customerType: type }
      : recordItem
  );
  await writeJson(STORAGE_KEYS.bookings, next);
}

export async function assignVoucher(bookingId: string, code: string): Promise<void> {
  const records = await getBookingRecords();
  const next = records.map((recordItem) =>
    recordItem.id === bookingId
      ? { ...recordItem, voucherCode: code }
      : recordItem
  );
  await writeJson(STORAGE_KEYS.bookings, next);
}

export type ReviewRecord = {
  id: string;
  bookingId?: string;
  overallRating: number;
  criteria: {
    attitude: number;
    knowledge: number;
    punctual: number;
    professional: number;
  };
  comment: string;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const STORAGE_KEYS = {
  favorites: 'tourapp_favorite_tour_ids',
  checkoutDraft: 'tourapp_checkout_draft',
  bookings: 'tourapp_booking_records',
  reviews: 'tourapp_review_records',
  notifications: 'tourapp_notifications',
} as const;

const DEFAULT_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'n1',
    message: 'Đơn gần nhất của bạn đã được xác nhận thành công.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    message: 'Có ưu đãi mới cho tour Biển đảo trong tuần này.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n3',
    message: 'Đừng quên hoàn tất đánh giá chuyến đi để nhận điểm thưởng.',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function getFavoriteTourIds(): Promise<FavoriteTourIds> {
  return readJson<FavoriteTourIds>(STORAGE_KEYS.favorites, []);
}

export async function saveFavoriteTourIds(ids: FavoriteTourIds): Promise<void> {
  await writeJson(STORAGE_KEYS.favorites, ids);
}

export async function toggleFavoriteTourId(tourId: string): Promise<FavoriteTourIds> {
  const current = await getFavoriteTourIds();
  const next = current.includes(tourId) ? current.filter((idItem) => idItem !== tourId) : [...current, tourId];
  await saveFavoriteTourIds(next);
  return next;
}

export async function getCheckoutDraft(): Promise<CheckoutDraft | null> {
  return readJson<CheckoutDraft | null>(STORAGE_KEYS.checkoutDraft, null);
}

export async function saveCheckoutDraft(draft: CheckoutDraft): Promise<void> {
  await writeJson(STORAGE_KEYS.checkoutDraft, draft);
}

export async function deleteCheckoutDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.checkoutDraft);
}

export async function getBookingRecords(): Promise<BookingRecord[]> {
  return readJson<BookingRecord[]>(STORAGE_KEYS.bookings, []);
}

export async function addBookingRecord(record: BookingRecord): Promise<void> {
  const records = await getBookingRecords();
  await writeJson(STORAGE_KEYS.bookings, [record, ...records]);
}

export async function updateBookingStatus(bookingId: string, status: BookingRecord['status']): Promise<void> {
  const records = await getBookingRecords();
  const next = records.map((recordItem) => (recordItem.id === bookingId ? { ...recordItem, status } : recordItem));
  await writeJson(STORAGE_KEYS.bookings, next);
}

export async function markLatestPaidBookingCompleted(preferredBookingId?: string): Promise<BookingRecord | null> {
  const records = await getBookingRecords();
  const preferredIndex = preferredBookingId ? records.findIndex((recordItem) => recordItem.id === preferredBookingId) : -1;
  const index =
    preferredIndex >= 0
      ? preferredIndex
      : records.findIndex(
          (recordItem) =>
            recordItem.status === 'on-tour' ||
            recordItem.status === 'checked-in' ||
            recordItem.status === 'paid' ||
            recordItem.status === 'pending'
        );
  if (index < 0) {
    return null;
  }
  const updated = { ...records[index], status: 'completed' as const };
  records[index] = updated;
  await writeJson(STORAGE_KEYS.bookings, records);
  return updated;
}

export async function getReviewRecords(): Promise<ReviewRecord[]> {
  return readJson<ReviewRecord[]>(STORAGE_KEYS.reviews, []);
}

export async function addReviewRecord(record: ReviewRecord): Promise<void> {
  const records = await getReviewRecords();
  await writeJson(STORAGE_KEYS.reviews, [record, ...records]);
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const stored = await readJson<NotificationRecord[] | null>(STORAGE_KEYS.notifications, null);
  if (stored && stored.length > 0) {
    return stored;
  }
  await writeJson(STORAGE_KEYS.notifications, DEFAULT_NOTIFICATIONS);
  return DEFAULT_NOTIFICATIONS;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationRecord[]> {
  const current = await getNotifications();
  const next = current.map((item) => (item.id === notificationId ? { ...item, read: true } : item));
  await writeJson(STORAGE_KEYS.notifications, next);
  return next;
}

export async function clearAllNotifications(): Promise<void> {
  await writeJson(STORAGE_KEYS.notifications, []);
}

export function createBookingId(): string {
  const stamp = Date.now().toString().slice(-6);
  return `BK${stamp}`;
}

export function createReviewId(): string {
  const stamp = Date.now().toString().slice(-6);
  return `RV${stamp}`;
}
