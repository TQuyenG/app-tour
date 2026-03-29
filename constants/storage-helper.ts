/**
 * constants/storage-helper.ts
 * Màng lọc tự động tách dữ liệu cá nhân theo từng User ID.
 */
import RealAsyncStorage from '@react-native-async-storage/async-storage';

// CHỈ những key nằm trong danh sách này mới được tách riêng cho từng User
const PERSONAL_KEYS = [
  '@app_profile',
  '@guest_favorites',
  '@guest_notifications',
  '@guest_loyalty_history',
  '@guide_wallet',
  '@guest_last_checkin',
];

const getDynamicKey = async (key: string) => {
  if (PERSONAL_KEYS.includes(key)) {
    try {
      // Đọc xem ai đang đăng nhập
      const session = await RealAsyncStorage.getItem('@app_current_user');
      if (session) {
        const user = JSON.parse(session);
        if (user && user.accountId) {
          // Gắn đuôi ID vào key (Ví dụ: @app_profile_acc-guest-1)
          return `${key}_${user.accountId}`;
        }
      }
    } catch (e) {}
  }
  // Các key dùng chung (như @guest_bookings, @app_tours) sẽ giữ nguyên
  return key;
};

// "Giả danh" bản gốc để lừa toàn bộ App
const AsyncStorage = {
  getItem: async (key: string) => RealAsyncStorage.getItem(await getDynamicKey(key)),
  setItem: async (key: string, value: string) => RealAsyncStorage.setItem(await getDynamicKey(key), value),
  removeItem: async (key: string) => RealAsyncStorage.removeItem(await getDynamicKey(key)),
  clear: async () => RealAsyncStorage.clear(),
  getAllKeys: async () => RealAsyncStorage.getAllKeys(),
};

export default AsyncStorage;