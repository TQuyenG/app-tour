import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@guide_notifications";
type NotifType =
  | "booking_new"
  | "booking_cancel"
  | "review"
  | "payment"
  | "system";
interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const SEED: Notif[] = [
  {
    id: "1",
    type: "booking_new",
    title: "Booking mới từ Hoàng Thị F",
    body: "Tour Trekking Langbiang · 25/03/2025 · 5 khách · 1.500.000đ",
    time: "1 giờ trước",
    read: false,
  },
  {
    id: "2",
    type: "booking_new",
    title: "Booking mới từ Trần Thị B",
    body: "Tour Núi Bà Đen · 20/03/2025 · 4 khách · 1.200.000đ",
    time: "5 giờ trước",
    read: false,
  },
  {
    id: "3",
    type: "review",
    title: "Đánh giá 5⭐ mới từ Nguyễn Thị D",
    body: '"Tour tuyệt vời, anh dẫn rất chuyên nghiệp!"',
    time: "Hôm qua",
    read: true,
  },
  {
    id: "4",
    type: "payment",
    title: "Thanh toán thành công",
    body: "Tour Mũi Né biển đã được thanh toán: 3.600.000đ",
    time: "2 ngày trước",
    read: true,
  },
  {
    id: "5",
    type: "booking_cancel",
    title: "Booking bị hủy",
    body: "Phạm Văn E đã hủy Tour Vũng Tàu · Lý do: Thời tiết xấu",
    time: "3 ngày trước",
    read: true,
  },
  {
    id: "6",
    type: "system",
    title: "Cập nhật ứng dụng mới",
    body: "Phiên bản 2.1.0 đã ra mắt với nhiều tính năng mới. Cập nhật ngay!",
    time: "5 ngày trước",
    read: true,
  },
];

const TYPE_MAP: Record<NotifType, { icon: string; color: string; bg: string }> =
  {
    booking_new: { icon: "calendar", color: "#2856d6", bg: "#eaf0ff" },
    booking_cancel: { icon: "close-circle", color: "#dc2626", bg: "#fee2e2" },
    review: { icon: "star", color: "#f59e0b", bg: "#fef9c3" },
    payment: { icon: "cash", color: "#16a34a", bg: "#dcfce7" },
    system: { icon: "information-circle", color: "#7a8cc2", bg: "#f0f4ff" },
  };

const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "booking_new", label: "Booking" },
  { key: "review", label: "Đánh giá" },
  { key: "payment", label: "Thanh toán" },
];

export default function GuideNotifications() {
  const tabs: Array<{
    icon: string;
    iconA: string;
    label: string;
    route: string;
  }> = [
    {
      icon: "home-outline",
      iconA: "home",
      label: "Tổng quan",
      route: "/guide-home",
    },
    {
      icon: "calendar-outline",
      iconA: "calendar",
      label: "Booking",
      route: "/guide-booking-management",
    },
    {
      icon: "time-outline",
      iconA: "time",
      label: "Lịch",
      route: "/guide-schedule-management",
    },
    {
      icon: "cash-outline",
      iconA: "cash",
      label: "Thu nhập",
      route: "/guide-earnings",
    },
    {
      icon: "person-outline",
      iconA: "person",
      label: "Hồ sơ",
      route: "/guide-profile",
    },
    {
      icon: "notifications-outline",
      iconA: "notifications",
      label: "Thông báo",
      route: "/guide-notifications",
    },
  ];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setNotifs(JSON.parse(raw));
        else {
          setNotifs(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setNotifs(SEED));
  }, []);

  const persist = useCallback(async (data: Notif[]) => {
    setNotifs(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const markRead = (id: string) =>
    persist(notifs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => persist(notifs.map((n) => ({ ...n, read: true })));
  const deleteNotif = (id: string) =>
    persist(notifs.filter((n) => n.id !== id));
  const clearAll = () =>
    Alert.alert("Xóa tất cả", "Xóa toàn bộ thông báo?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => persist([]) },
    ]);

  const filtered = notifs.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={s.container}>
        <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#1a2f7a" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Thông báo</Text>
          <View style={s.topActions}>
            {unreadCount > 0 && (
              <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
                <Text style={s.markAllTxt}>Đọc tất cả</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.iconBtn} onPress={clearAll}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        {unreadCount > 0 && (
          <View style={s.unreadBanner}>
            <Ionicons name="notifications" size={16} color="#2856d6" />
            <Text style={s.unreadBannerTxt}>
              Bạn có {unreadCount} thông báo chưa đọc
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterChip, filter === tab.key && s.filterActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text
                style={[s.filterTxt, filter === tab.key && s.filterTxtActive]}
              >
                {tab.label}
              </Text>
              {tab.key === "unread" && unreadCount > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeTxt}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={s.list}>
          {filtered.length === 0 && (
            <View style={s.emptyWrap}>
              <Ionicons
                name="notifications-off-outline"
                size={56}
                color="#c0cbe8"
              />
              <Text style={s.emptyTxt}>Không có thông báo nào</Text>
            </View>
          )}
          {filtered.map((notif) => {
            const tp = TYPE_MAP[notif.type];
            return (
              <TouchableOpacity
                key={notif.id}
                style={[s.card, !notif.read && s.cardUnread]}
                activeOpacity={0.85}
                onPress={() => markRead(notif.id)}
              >
                <View style={[s.iconWrap, { backgroundColor: tp.bg }]}>
                  <Ionicons name={tp.icon as any} size={20} color={tp.color} />
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTopRow}>
                    <Text
                      style={[s.notifTitle, !notif.read && s.notifTitleUnread]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    {!notif.read && <View style={s.unreadDot} />}
                  </View>
                  <Text style={s.notifBody} numberOfLines={2}>
                    {notif.body}
                  </Text>
                  <Text style={s.notifTime}>{notif.time}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteNotif(notif.id)}
                  style={s.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#c0cbe8" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
        <View
          style={[
            tabSt.bar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
          ]}
        >
          {tabs.map(
            (tab: {
              icon: string;
              iconA: string;
              label: string;
              route: string;
            }) => {
              const isActive = tab.route === "/guide-notifications";
              return (
                <TouchableOpacity
                  key={tab.route}
                  style={tabSt.item}
                  onPress={() => router.push(tab.route as any)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[tabSt.iconWrap, isActive && tabSt.iconWrapActive]}
                  >
                    <Ionicons
                      name={(isActive ? tab.iconA : tab.icon) as any}
                      size={20}
                      color={isActive ? "#fff" : "#94a8d8"}
                    />
                  </View>
                  <Text style={[tabSt.label, isActive && tabSt.labelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4ff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1a2f7a" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  markAllBtn: {
    backgroundColor: "#eaf0ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllTxt: { color: "#2856d6", fontWeight: "700", fontSize: 12 },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eaf0ff",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  unreadBannerTxt: { color: "#2856d6", fontWeight: "600", fontSize: 13 },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  countBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },
  list: { paddingHorizontal: 14, paddingTop: 4 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e4ebff",
  },
  cardUnread: { backgroundColor: "#f7f9ff", borderColor: "#c5d3ff" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  notifTitle: { color: "#5f73a9", fontWeight: "600", fontSize: 13, flex: 1 },
  notifTitleUnread: { color: "#1a2f7a", fontWeight: "800" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2856d6",
  },
  notifBody: { color: "#7a8cc2", fontSize: 12, lineHeight: 18 },
  notifTime: { color: "#b0bdd8", fontSize: 11, marginTop: 4 },
  deleteBtn: { padding: 4 },
});

const tabSt = StyleSheet.create({
  bar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e8eeff",
    shadowColor: "#2a4caf",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#10b981" },
  label: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  labelActive: { color: "#10b981" },
});
