/**
 * app/guide-notifications.tsx
 * Thông báo HDV - Tự động cập nhật từ Lịch hẹn và Tin nhắn thực tế
 * Đã kết nối: Nhấn để xem Chi tiết Đơn hoặc Vào phòng Chat
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, Modal, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppNotification {
  id: string;
  type: 'booking' | 'chat' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
  relatedId: string; // ID của Booking hoặc Session Chat
}

export default function GuideNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ visible: false });

  useFocusEffect(useCallback(() => {
    const syncNotifications = async () => {
      setLoading(true);
      try {
        const guideRaw = await AsyncStorage.getItem("@guide_profile");
        const guideId = guideRaw ? JSON.parse(guideRaw).guideId : "";

        // 1. QUÉT DỮ LIỆU LỊCH HẸN (@guest_bookings)
        const bookingsRaw = await AsyncStorage.getItem("@guest_bookings");
        let bookingNotifs: AppNotification[] = [];
        if (bookingsRaw) {
          const bookings = JSON.parse(bookingsRaw).filter((b: any) => b.guideId === guideId);
          bookingNotifs = bookings.map((b: any) => ({
            id: `notif-b-${b.id}`,
            type: 'booking',
            title: "Lịch hẹn mới",
            body: `Bạn có chuyến đi "${b.tourName}" cùng khách ${b.customerName || 'ẩn danh'}.`,
            time: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : "Gần đây",
            read: false,
            relatedId: b.id
          }));
        }

        // 2. QUÉT DỮ LIỆU TIN NHẮN (@chat_sessions)
        const chatsRaw = await AsyncStorage.getItem("@chat_sessions");
        let chatNotifs: AppNotification[] = [];
        if (chatsRaw) {
          const sessions = JSON.parse(chatsRaw);
          // Giả định HDV nhận được tin nhắn từ khách (role !== guide)
          chatNotifs = sessions.filter((s: any) => s.lastSenderRole === 'guest').map((s: any) => ({
            id: `notif-c-${s.sessionId}`,
            type: 'chat',
            title: "Tin nhắn mới",
            body: `Khách hàng vừa nhắn: "${s.lastMessage}"`,
            time: "Vừa xong",
            read: s.unreadCount === 0,
            relatedId: s.sessionId
          }));
        }

        // Gộp và sắp xếp (Bạn có thể thêm thông báo hệ thống tĩnh ở đây)
        const allNotifs = [...bookingNotifs, ...chatNotifs].sort((a, b) => b.id.localeCompare(a.id));
        setNotifs(allNotifs);
      } catch (e) {
        console.error("Lỗi cập nhật thông báo:", e);
      } finally {
        setLoading(false);
      }
    };

    syncNotifications();
  }, []));

  const handleNotifPress = (notif: AppNotification) => {
    // Đánh dấu đã đọc (tạm thời trong state)
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));

    if (notif.type === 'booking') {
      router.push({ pathname: '/shared-booking-detail', params: { bookingId: notif.relatedId } } as any);
    } else if (notif.type === 'chat') {
      // Điều hướng đến danh sách chat hoặc chi tiết chat nếu bạn có link cụ thể
      router.push('/guide_chat_list' as any);
    }
  };

  const clearAll = () => {
    setNotifs([]);
    setConfirmModal({ visible: false });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={() => setConfirmModal({ visible: true })}>
          <Text style={s.clearTxt}>Xóa hết</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color="#4f7cff" style={{ marginTop: 40 }} />
        ) : notifs.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="notifications-off-outline" size={60} color="#cbd5e1" />
            <Text style={s.emptyTxt}>Bạn chưa có thông báo nào mới.</Text>
          </View>
        ) : (
          notifs.map((n) => (
            <TouchableOpacity 
              key={n.id} 
              style={[s.card, !n.read && s.unreadCard]} 
              onPress={() => handleNotifPress(n)}
            >
              <View style={[s.iconWrap, { backgroundColor: n.type === 'booking' ? '#eaf0ff' : '#f3e8ff' }]}>
                <Ionicons 
                  name={n.type === 'booking' ? "calendar" : "chatbubble-ellipses"} 
                  size={24} 
                  color={n.type === 'booking' ? "#4f7cff" : "#a855f7"} 
                />
              </View>
              <View style={s.cardBody}>
                <Text style={s.notifTitle}>{n.title}</Text>
                <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                <Text style={s.notifTime}>{n.time}</Text>
              </View>
              {!n.read && <View style={s.dot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal xác nhận xóa */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Xóa tất cả thông báo?</Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmModal({ visible: false })}>
                <Text style={s.modalCancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalDelete} onPress={clearAll}>
                <Text style={s.modalDeleteTxt}>Xóa sạch</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-notifications" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  clearTxt: { color: "#ef4444", fontSize: 13, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e4ebff" },
  unreadCard: { borderColor: "#4f7cff", backgroundColor: "#f0f4ff" },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardBody: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 2 },
  notifBody: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  notifTime: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4f7cff", marginLeft: 8 },

  emptyBox: { alignItems: "center", marginTop: 100 },
  emptyTxt: { color: "#94a3b8", marginTop: 16, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", padding: 24, borderRadius: 20, width: "80%" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", textAlign: "center", marginBottom: 24 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, padding: 12, alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 12 },
  modalCancelTxt: { fontWeight: "700", color: "#64748b" },
  modalDelete: { flex: 1, padding: 12, alignItems: "center", backgroundColor: "#ef4444", borderRadius: 12 },
  modalDeleteTxt: { fontWeight: "700", color: "#fff" }
});