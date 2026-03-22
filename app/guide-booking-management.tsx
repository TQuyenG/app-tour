import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@guide_bookings";
type BookingStatus = "pending" | "accepted" | "ongoing" | "done" | "cancelled";
interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  tourName: string;
  date: string;
  duration: string;
  guests: number;
  price: string;
  status: BookingStatus;
  note: string;
  createdAt: string;
}

const SEED: Booking[] = [
  {
    id: "1",
    customerName: "Trần Thị B",
    customerPhone: "0901 111 222",
    tourName: "Tour Núi Bà Đen",
    date: "20/03/2025",
    duration: "1 ngày",
    guests: 4,
    price: "1200000",
    status: "pending",
    note: "Khách cần hướng dẫn tiếng Anh.",
    createdAt: "5 giờ trước",
  },
  {
    id: "2",
    customerName: "Lê Văn C",
    customerPhone: "0912 333 444",
    tourName: "Tour Đà Lạt 2N1Đ",
    date: "22/03/2025",
    duration: "2 ngày 1 đêm",
    guests: 2,
    price: "2800000",
    status: "accepted",
    note: "",
    createdAt: "Hôm qua",
  },
  {
    id: "3",
    customerName: "Nguyễn Thị D",
    customerPhone: "0933 555 666",
    tourName: "Tour Mũi Né biển",
    date: "15/03/2025",
    duration: "2 ngày 1 đêm",
    guests: 6,
    price: "3600000",
    status: "done",
    note: "Khách rất hài lòng.",
    createdAt: "3 ngày trước",
  },
  {
    id: "4",
    customerName: "Phạm Văn E",
    customerPhone: "0944 777 888",
    tourName: "Tour Vũng Tàu",
    date: "10/03/2025",
    duration: "1 ngày",
    guests: 3,
    price: "900000",
    status: "cancelled",
    note: "Khách hủy do thời tiết.",
    createdAt: "5 ngày trước",
  },
  {
    id: "5",
    customerName: "Hoàng Thị F",
    customerPhone: "0955 999 000",
    tourName: "Trekking Langbiang",
    date: "25/03/2025",
    duration: "1 ngày",
    guests: 5,
    price: "1500000",
    status: "pending",
    note: "",
    createdAt: "1 giờ trước",
  },
];

const STATUS_MAP: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Chờ xác nhận", color: "#d97706", bg: "#fef9c3" },
  accepted: { label: "Đã nhận", color: "#4f7cff", bg: "#eaf0ff" },
  ongoing: { label: "Đang dẫn", color: "#a855f7", bg: "#f3e8ff" },
  done: { label: "Hoàn thành", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { label: "Đã hủy", color: "#dc2626", bg: "#fee2e2" },
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ" },
  { key: "accepted", label: "Đã nhận" },
  { key: "ongoing", label: "Đang dẫn" },
  { key: "done", label: "Xong" },
  { key: "cancelled", label: "Hủy" },
];

export default function GuideBookingManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<Booking | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setBookings(JSON.parse(raw));
        else {
          setBookings(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setBookings(SEED));
  }, []);

  const persist = useCallback(async (data: Booking[]) => {
    setBookings(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const updateStatus = (id: string, status: BookingStatus) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    Alert.alert(
      "Xác nhận",
      `Chuyển booking "${b.customerName}" sang "${STATUS_MAP[status].label}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: () =>
            persist(bookings.map((x) => (x.id === id ? { ...x, status } : x))),
        },
      ],
    );
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const pending = bookings.filter((b) => b.status === "pending").length;
  const totalEarned = bookings
    .filter((b) => b.status === "done")
    .reduce((s, b) => s + Number(b.price), 0);

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
          <Text style={s.headerTitle}>Quản lý Booking</Text>
          {pending > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingTxt}>{pending} mới</Text>
            </View>
          )}
        </View>

        <View style={s.statsRow}>
          {[
            { l: "Tổng", v: bookings.length, c: "#1a2f7a" },
            { l: "Chờ xác nhận", v: pending, c: "#d97706" },
            {
              l: "Đang dẫn",
              v: bookings.filter((b) => b.status === "ongoing").length,
              c: "#a855f7",
            },
            {
              l: "Thu nhập",
              v: `${(totalEarned / 1000000).toFixed(1)}tr`,
              c: "#16a34a",
            },
          ].map((item, i, arr) => (
            <View
              key={item.l}
              style={[s.statItem, i < arr.length - 1 && s.statBorder]}
            >
              <Text style={[s.statNum, { color: item.c }]}>{item.v}</Text>
              <Text style={s.statLbl}>{item.l}</Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, filter === f.key && s.filterActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[s.filterTxt, filter === f.key && s.filterTxtActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.resultText}>{filtered.length} booking</Text>

        <ScrollView contentContainerStyle={s.list}>
          {filtered.length === 0 && (
            <View style={s.emptyWrap}>
              <Ionicons name="calendar-outline" size={56} color="#c0cbe8" />
              <Text style={s.emptyText}>Không có booking nào</Text>
            </View>
          )}
          {filtered.map((booking) => {
            const st = STATUS_MAP[booking.status];
            const isOpen = expandedId === booking.id;
            return (
              <TouchableOpacity
                key={booking.id}
                style={s.card}
                activeOpacity={0.88}
                onPress={() => setExpandedId(isOpen ? null : booking.id)}
              >
                <View style={[s.stripe, { backgroundColor: st.color }]} />
                <View style={s.cardBody}>
                  <View style={s.cardTopRow}>
                    <View style={s.custRow}>
                      <View style={s.custAvatar}>
                        <Ionicons name="person" size={14} color="#fff" />
                      </View>
                      <View>
                        <Text style={s.custName}>{booking.customerName}</Text>
                        <Text style={s.custPhone}>{booking.customerPhone}</Text>
                      </View>
                    </View>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <Text style={[s.badgeTxt, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.tourName}>{booking.tourName}</Text>
                  <View style={s.metaRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color="#8ea0d6"
                    />
                    <Text style={s.metaTxt}>{booking.date}</Text>
                    <Text style={s.dot}>·</Text>
                    <Ionicons name="people-outline" size={12} color="#8ea0d6" />
                    <Text style={s.metaTxt}>{booking.guests} khách</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.metaTxt}>{booking.duration}</Text>
                  </View>
                  <View style={s.cardBottom}>
                    <Text style={s.price}>
                      {Number(booking.price).toLocaleString("vi-VN")}đ
                    </Text>
                    <Text style={s.createdAt}>{booking.createdAt}</Text>
                  </View>
                  {isOpen && (
                    <View style={s.expandSection}>
                      {!!booking.note && (
                        <View style={s.noteBox}>
                          <Ionicons
                            name="document-text-outline"
                            size={13}
                            color="#4f7cff"
                          />
                          <Text style={s.noteTxt}>{booking.note}</Text>
                        </View>
                      )}
                      <View style={s.actionRow}>
                        {booking.status === "pending" && (
                          <>
                            <TouchableOpacity
                              style={[
                                s.actionBtn,
                                { backgroundColor: "#dcfce7" },
                              ]}
                              onPress={() =>
                                updateStatus(booking.id, "accepted")
                              }
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={14}
                                color="#16a34a"
                              />
                              <Text style={[s.actionTxt, { color: "#16a34a" }]}>
                                Nhận tour
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                s.actionBtn,
                                { backgroundColor: "#fee2e2" },
                              ]}
                              onPress={() =>
                                updateStatus(booking.id, "cancelled")
                              }
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={14}
                                color="#dc2626"
                              />
                              <Text style={[s.actionTxt, { color: "#dc2626" }]}>
                                Từ chối
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {booking.status === "accepted" && (
                          <TouchableOpacity
                            style={[
                              s.actionBtn,
                              { backgroundColor: "#f3e8ff" },
                            ]}
                            onPress={() => updateStatus(booking.id, "ongoing")}
                          >
                            <Ionicons
                              name="play-circle-outline"
                              size={14}
                              color="#a855f7"
                            />
                            <Text style={[s.actionTxt, { color: "#a855f7" }]}>
                              Bắt đầu dẫn
                            </Text>
                          </TouchableOpacity>
                        )}
                        {booking.status === "ongoing" && (
                          <TouchableOpacity
                            style={[
                              s.actionBtn,
                              { backgroundColor: "#dcfce7" },
                            ]}
                            onPress={() => updateStatus(booking.id, "done")}
                          >
                            <Ionicons
                              name="flag-outline"
                              size={14}
                              color="#16a34a"
                            />
                            <Text style={[s.actionTxt, { color: "#16a34a" }]}>
                              Hoàn thành
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: "#eaf0ff" }]}
                          onPress={() => {
                            setNoteText(booking.note);
                            setNoteModal(booking);
                          }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color="#4f7cff"
                          />
                          <Text style={[s.actionTxt, { color: "#4f7cff" }]}>
                            Ghi chú
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: "#e8eeff" }]}
                          onPress={() =>
                            Alert.alert(
                              "Gọi điện",
                              `${booking.customerName}\n${booking.customerPhone}`,
                            )
                          }
                        >
                          <Ionicons
                            name="call-outline"
                            size={14}
                            color="#2856d6"
                          />
                          <Text style={[s.actionTxt, { color: "#2856d6" }]}>
                            Gọi
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>

        <Modal
          visible={!!noteModal}
          animationType="slide"
          transparent
          onRequestClose={() => setNoteModal(null)}
        >
          <KeyboardAvoidingView
            style={s.overlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              style={s.backdrop}
              activeOpacity={1}
              onPress={() => setNoteModal(null)}
            />
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Ghi chú booking</Text>
                <TouchableOpacity
                  onPress={() => setNoteModal(null)}
                  style={s.closeBtn}
                >
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              <View style={s.modalBody}>
                <TextInput
                  style={[s.input, { minHeight: 100, paddingTop: 12 }]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Nhập ghi chú về booking..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#b0bdd8"
                  textAlignVertical="top"
                  autoFocus
                />
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={() => {
                    if (noteModal) {
                      persist(
                        bookings.map((x) =>
                          x.id === noteModal.id ? { ...x, note: noteText } : x,
                        ),
                      );
                      setNoteModal(null);
                    }
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.saveBtnTxt}>Lưu ghi chú</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <View
          style={[
            tabSt.bar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
          ]}
        >
          {(
            [
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
            ] as const
          ).map((tab) => {
            const isActive = tab.route === "/guide-booking-management";
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
                    name={isActive ? (tab.iconA as any) : (tab.icon as any)}
                    size={20}
                    color={isActive ? "#fff" : "#94a8d8"}
                  />
                </View>
                <Text style={[tabSt.label, isActive && tabSt.labelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    gap: 12,
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
  pendingBadge: {
    backgroundColor: "#fef9c3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
  },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#e4ebff" },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLbl: {
    fontSize: 10,
    color: "#7a8cc2",
    marginTop: 2,
    textAlign: "center",
  },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip: {
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
  resultText: {
    color: "#7a8cc2",
    fontSize: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  list: { paddingHorizontal: 14 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#7a8cc2", fontSize: 15, fontWeight: "600" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ebff",
    marginBottom: 10,
    overflow: "hidden",
  },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: 12 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  custRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  custAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2856d6",
    alignItems: "center",
    justifyContent: "center",
  },
  custName: { color: "#1a2f7a", fontWeight: "700", fontSize: 14 },
  custPhone: { color: "#7a8cc2", fontSize: 11, marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  tourName: {
    color: "#2856d6",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { color: "#7a8cc2", fontSize: 12 },
  dot: { color: "#c0cbe8", fontSize: 12 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: { color: "#16a34a", fontWeight: "800", fontSize: 15 },
  createdAt: { color: "#b0bdd8", fontSize: 11 },
  expandSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f4ff",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f0f4ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  noteTxt: { color: "#5f73a9", fontSize: 12, lineHeight: 18, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionTxt: { fontSize: 12, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,18,50,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e4ebff",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4ff",
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1a2f7a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { padding: 20 },
  input: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4ebff",
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#1a2f7a",
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: "#2856d6",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
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
