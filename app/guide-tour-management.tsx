import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

const STORAGE_KEY = "@guide_tours";

type TourStatus = "assigned" | "registered" | "ongoing" | "done" | "cancelled";

interface GuideTour {
  id: string;
  name: string;
  category: string;
  date: string;
  duration: string;
  meetingPoint: string;
  guests: number;
  maxGuests: number;
  price: string;
  status: TourStatus;
  customerNames: string;
  itinerary: string;
  note: string;
  assignedBy: string; // 'system' | 'admin' | 'self'
}

const SEED: GuideTour[] = [
  {
    id: "1",
    name: "Tour Đà Lạt mộng mơ 3N2Đ",
    category: "Cao nguyên",
    date: "22/03/2025",
    duration: "3 ngày 2 đêm",
    meetingPoint: "Bến xe Miền Đông, TP.HCM",
    guests: 8,
    maxGuests: 12,
    price: "2800000",
    status: "assigned",
    customerNames: "Lê Văn C, Nguyễn Thị E và 6 người khác",
    itinerary:
      "Ngày 1: Xuất phát TP.HCM – Đà Lạt, tham quan Hồ Xuân Hương.\nNgày 2: Thác Datanla, Làng hoa Vạn Thành, chợ đêm.\nNgày 3: Đồi chè Cầu Đất, trở về TP.HCM.",
    note: "Khách có 2 trẻ em, cần chú ý an toàn tại thác nước.",
    assignedBy: "admin",
  },
  {
    id: "2",
    name: "Trekking Langbiang 1 ngày",
    category: "Núi rừng",
    date: "25/03/2025",
    duration: "1 ngày",
    meetingPoint: "Cổng Langbiang, Lạc Dương",
    guests: 5,
    maxGuests: 10,
    price: "1500000",
    status: "assigned",
    customerNames: "Hoàng Thị F và 4 người",
    itinerary:
      "Sáng: Xuất phát leo núi Langbiang – ngắm cảnh.\nTrưa: Picnic trên đỉnh.\nChiều: Xuống núi, trả khách.",
    note: "",
    assignedBy: "system",
  },
  {
    id: "3",
    name: "Tour Núi Bà Đen khám phá",
    category: "Tâm linh",
    date: "15/03/2025",
    duration: "1 ngày",
    meetingPoint: "Khu du lịch Núi Bà Đen, Tây Ninh",
    guests: 4,
    maxGuests: 4,
    price: "1200000",
    status: "done",
    customerNames: "Trần Thị B và 3 người",
    itinerary: "Cáp treo lên đỉnh, tham quan chùa, xuống bằng đường bộ.",
    note: "Đã hoàn thành tốt, khách hài lòng.",
    assignedBy: "system",
  },
  {
    id: "4",
    name: "Tour Mũi Né biển xanh 2N1Đ",
    category: "Biển đảo",
    date: "10/03/2025",
    duration: "2 ngày 1 đêm",
    meetingPoint: "Ga Phan Thiết",
    guests: 6,
    maxGuests: 15,
    price: "3600000",
    status: "done",
    customerNames: "Nguyễn Thị D và 5 người",
    itinerary:
      "Ngày 1: Đồi cát đỏ, Làng chài Mũi Né, Suối Tiên.\nNgày 2: Đồi cát trắng, tắm biển, trở về.",
    note: "",
    assignedBy: "admin",
  },
  {
    id: "5",
    name: "Hành trình Hội An cổ kính",
    category: "Di sản",
    date: "01/04/2025",
    duration: "2 ngày 1 đêm",
    meetingPoint: "Sân bay Đà Nẵng",
    guests: 0,
    maxGuests: 10,
    price: "2200000",
    status: "registered",
    customerNames: "",
    itinerary:
      "Ngày 1: Phố cổ Hội An, Chùa Cầu, thả đèn hoa đăng.\nNgày 2: Làng gốm Thanh Hà, về Đà Nẵng.",
    note: "Đã đăng ký nhận tour này từ hệ thống, chờ xác nhận.",
    assignedBy: "self",
  },
];

const STATUS_MAP: Record<
  TourStatus,
  { label: string; color: string; bg: string }
> = {
  assigned: { label: "Được phân công", color: "#2856d6", bg: "#eaf0ff" },
  registered: { label: "Chờ xác nhận", color: "#d97706", bg: "#fef9c3" },
  ongoing: { label: "Đang dẫn", color: "#a855f7", bg: "#f3e8ff" },
  done: { label: "Hoàn thành", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { label: "Đã hủy", color: "#dc2626", bg: "#fee2e2" },
};

const ASSIGNED_BY_LABEL: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin phân công", color: "#2856d6" },
  system: { label: "Hệ thống giao", color: "#a855f7" },
  self: { label: "Tự đăng ký", color: "#16a34a" },
};

const CATEGORIES = [
  "Tất cả",
  "Biển đảo",
  "Cao nguyên",
  "Di sản",
  "Núi rừng",
  "Tâm linh",
  "Thành phố",
];
const FILTER_STATUS = [
  { key: "all", label: "Tất cả" },
  { key: "assigned", label: "Được giao" },
  { key: "registered", label: "Chờ duyệt" },
  { key: "ongoing", label: "Đang dẫn" },
  { key: "done", label: "Hoàn thành" },
];

export default function GuideTourManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tours, setTours] = useState<GuideTour[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("Tất cả");
  const [detailModal, setDetailModal] = useState<GuideTour | null>(null);
  const [noteModal, setNoteModal] = useState<GuideTour | null>(null);
  const [noteText, setNoteText] = useState("");
  const [registerModal, setRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    date: "",
    duration: "",
    meetingPoint: "",
    category: "Biển đảo",
    maxGuests: "10",
    note: "",
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setTours(JSON.parse(raw));
        else {
          setTours(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setTours(SEED));
  }, []);

  const persist = useCallback(async (data: GuideTour[]) => {
    setTours(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const updateStatus = (id: string, status: TourStatus) => {
    const t = tours.find((x) => x.id === id);
    if (!t) return;
    Alert.alert(
      "Xác nhận",
      `Chuyển "${t.name}" sang "${STATUS_MAP[status].label}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: () =>
            persist(tours.map((x) => (x.id === id ? { ...x, status } : x))),
        },
      ],
    );
  };

  const cancelTour = (id: string) => {
    const t = tours.find((x) => x.id === id);
    if (!t) return;
    Alert.alert(
      "Hủy tour",
      `Bạn muốn hủy tham gia "${t.name}"?\nHành động này sẽ thông báo cho quản trị viên.`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy tour",
          style: "destructive",
          onPress: () =>
            persist(
              tours.map((x) =>
                x.id === id ? { ...x, status: "cancelled" } : x,
              ),
            ),
        },
      ],
    );
  };

  const handleRegisterTour = () => {
    if (!regForm.name.trim() || !regForm.date.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền tên tour và ngày.");
      return;
    }
    const newTour: GuideTour = {
      id: Date.now().toString(),
      name: regForm.name,
      category: regForm.category,
      date: regForm.date,
      duration: regForm.duration,
      meetingPoint: regForm.meetingPoint,
      guests: 0,
      maxGuests: Number(regForm.maxGuests) || 10,
      price: "0",
      status: "registered",
      customerNames: "",
      itinerary: "",
      note: regForm.note,
      assignedBy: "self",
    };
    persist([...tours, newTour]);
    setRegisterModal(false);
    setRegForm({
      name: "",
      date: "",
      duration: "",
      meetingPoint: "",
      category: "Biển đảo",
      maxGuests: "10",
      note: "",
    });
    Alert.alert(
      "Đã gửi đăng ký",
      "Yêu cầu đăng ký tour đã được gửi. Chờ admin xác nhận.",
    );
  };

  const saveNote = (id: string, note: string) => {
    persist(tours.map((x) => (x.id === id ? { ...x, note } : x)));
    setNoteModal(null);
  };

  const rf = (k: keyof typeof regForm, v: string) =>
    setRegForm((p) => ({ ...p, [k]: v }));

  const filtered = tours.filter((t) => {
    const matchSt = filterStatus === "all" || t.status === filterStatus;
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    return matchSt && matchCat;
  });

  const doneTours = tours.filter((t) => t.status === "done").length;
  const assignedTours = tours.filter((t) => t.status === "assigned").length;
  const totalEarned = tours
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + Number(t.price), 0);

  return (
    <View style={s.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a2f7a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tour của tôi</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: "#2856d6" }]}
          onPress={() => setRegisterModal(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          {
            l: "Tổng",
            v: tours.filter((t) => t.status !== "cancelled").length,
            c: "#1a2f7a",
          },
          { l: "Được giao", v: assignedTours, c: "#2856d6" },
          { l: "Hoàn thành", v: doneTours, c: "#16a34a" },
          {
            l: "Thu nhập",
            v: `${(totalEarned / 1000000).toFixed(1)}tr`,
            c: "#f59e0b",
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

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTER_STATUS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filterStatus === f.key && s.filterActive]}
            onPress={() => setFilterStatus(f.key)}
          >
            <Text
              style={[s.filterTxt, filterStatus === f.key && s.filterTxtActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.filterRow, { paddingTop: 0 }]}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[s.catChip, filterCat === c && s.catActive]}
            onPress={() => setFilterCat(c)}
          >
            <Text style={[s.catTxt, filterCat === c && s.catTxtActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.resultText}>{filtered.length} tour</Text>

      <ScrollView contentContainerStyle={s.list}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons
              name="map-search-outline"
              size={56}
              color="#c0cbe8"
            />
            <Text style={s.emptyText}>Không có tour nào</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => setRegisterModal(true)}
            >
              <Text style={s.emptyBtnTxt}>+ Đăng ký nhận tour mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map((tour) => {
          const st = STATUS_MAP[tour.status];
          const ab = ASSIGNED_BY_LABEL[tour.assignedBy];
          const isOpen = expandedId === tour.id;
          const fillPct =
            tour.maxGuests > 0
              ? Math.round((tour.guests / tour.maxGuests) * 100)
              : 0;

          return (
            <TouchableOpacity
              key={tour.id}
              style={s.card}
              activeOpacity={0.88}
              onPress={() => setExpandedId(isOpen ? null : tour.id)}
            >
              {/* Top section */}
              <View style={s.cardHeader}>
                <View style={s.cardHeaderLeft}>
                  <View style={[s.catBadge, { backgroundColor: "#eaf0ff" }]}>
                    <Text style={s.catBadgeTxt}>{tour.category}</Text>
                  </View>
                  <View style={[s.assignedBadge]}>
                    <Text style={[s.assignedTxt, { color: ab.color }]}>
                      {ab.label}
                    </Text>
                  </View>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.color }]}>
                    {st.label}
                  </Text>
                </View>
              </View>

              <Text style={s.tourName}>{tour.name}</Text>

              {/* Meta row */}
              <View style={s.metaGrid}>
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#8ea0d6" />
                  <Text style={s.metaTxt}>{tour.date}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#8ea0d6" />
                  <Text style={s.metaTxt}>{tour.duration}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={12} color="#8ea0d6" />
                  <Text style={s.metaTxt} numberOfLines={1}>
                    {tour.meetingPoint}
                  </Text>
                </View>
              </View>

              {/* Guests progress */}
              <View style={s.guestsRow}>
                <Ionicons name="people-outline" size={13} color="#7a8cc2" />
                <View style={s.progressBg}>
                  <View
                    style={[s.progressFill, { width: `${fillPct}%` as any }]}
                  />
                </View>
                <Text style={s.guestsTxt}>
                  {tour.guests}/{tour.maxGuests} khách
                </Text>
              </View>

              {/* Price */}
              <View style={s.priceRow}>
                <Text style={s.price}>
                  {Number(tour.price) > 0
                    ? `${Number(tour.price).toLocaleString("vi-VN")}đ/người`
                    : "Chưa có giá"}
                </Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#c0cbe8"
                />
              </View>

              {/* Expanded */}
              {isOpen && (
                <View style={s.expandSection}>
                  {!!tour.customerNames && (
                    <View style={s.infoBlock}>
                      <Text style={s.infoBlockLabel}>👥 Khách hàng</Text>
                      <Text style={s.infoBlockValue}>{tour.customerNames}</Text>
                    </View>
                  )}
                  {!!tour.itinerary && (
                    <View style={s.infoBlock}>
                      <Text style={s.infoBlockLabel}>🗺️ Lịch trình</Text>
                      <Text style={s.infoBlockValue}>{tour.itinerary}</Text>
                    </View>
                  )}
                  {!!tour.note && (
                    <View style={s.infoBlock}>
                      <Text style={s.infoBlockLabel}>📝 Ghi chú</Text>
                      <Text style={s.infoBlockValue}>{tour.note}</Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={s.actionRow}>
                    {tour.status === "assigned" && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: "#f3e8ff" }]}
                        onPress={() => updateStatus(tour.id, "ongoing")}
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
                    {tour.status === "ongoing" && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: "#dcfce7" }]}
                        onPress={() => updateStatus(tour.id, "done")}
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
                        setNoteText(tour.note);
                        setNoteModal(tour);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color="#2856d6"
                      />
                      <Text style={[s.actionTxt, { color: "#2856d6" }]}>
                        Ghi chú
                      </Text>
                    </TouchableOpacity>
                    {(tour.status === "assigned" ||
                      tour.status === "registered") && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: "#fee2e2" }]}
                        onPress={() => cancelTour(tour.id)}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={14}
                          color="#dc2626"
                        />
                        <Text style={[s.actionTxt, { color: "#dc2626" }]}>
                          Hủy tham gia
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Note Modal ── */}
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
            <View style={s.mheader}>
              <Text style={s.mtitle}>Ghi chú tour</Text>
              <TouchableOpacity
                onPress={() => setNoteModal(null)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <View style={s.mbody}>
              <TextInput
                style={[s.input, { minHeight: 100, paddingTop: 12 }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ghi chú nội bộ về tour này..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#b0bdd8"
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={s.saveBtn}
                onPress={() => noteModal && saveNote(noteModal.id, noteText)}
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

      {/* ── Register Tour Modal ── */}
      <Modal
        visible={registerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRegisterModal(false)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={() => setRegisterModal(false)}
          />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.mheader}>
              <Text style={s.mtitle}>Đăng ký nhận tour</Text>
              <TouchableOpacity
                onPress={() => setRegisterModal(false)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.mbody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.regHint}>
                💡 Điền thông tin tour bạn muốn nhận dẫn. Admin sẽ xem xét và
                xác nhận.
              </Text>

              <FL t="Tên tour *" />
              <TextInput
                style={s.input}
                value={regForm.name}
                onChangeText={(v) => rf("name", v)}
                placeholder="VD: Tour Phú Quốc 3N2Đ"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Ngày khởi hành *" />
              <TextInput
                style={s.input}
                value={regForm.date}
                onChangeText={(v) => rf("date", v)}
                placeholder="VD: 05/04/2025"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Thời gian" />
              <TextInput
                style={s.input}
                value={regForm.duration}
                onChangeText={(v) => rf("duration", v)}
                placeholder="VD: 3 ngày 2 đêm"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Điểm tập hợp" />
              <TextInput
                style={s.input}
                value={regForm.meetingPoint}
                onChangeText={(v) => rf("meetingPoint", v)}
                placeholder="VD: Sân bay Tân Sơn Nhất"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Danh mục" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.optionRow}
              >
                {[
                  "Biển đảo",
                  "Cao nguyên",
                  "Di sản",
                  "Núi rừng",
                  "Tâm linh",
                  "Thành phố",
                ].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.optionChip,
                      regForm.category === c && s.optionActive,
                    ]}
                    onPress={() => rf("category", c)}
                  >
                    <Text
                      style={[
                        s.optionTxt,
                        regForm.category === c && s.optionTxtActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FL t="Số khách tối đa" />
              <TextInput
                style={s.input}
                value={regForm.maxGuests}
                onChangeText={(v) => rf("maxGuests", v)}
                keyboardType="numeric"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Ghi chú thêm" />
              <TextInput
                style={[s.input, { minHeight: 70, paddingTop: 12 }]}
                value={regForm.note}
                onChangeText={(v) => rf("note", v)}
                placeholder="Lý do đăng ký, kỹ năng phù hợp..."
                multiline
                placeholderTextColor="#b0bdd8"
                textAlignVertical="top"
              />

              <TouchableOpacity style={s.saveBtn} onPress={handleRegisterTour}>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Gửi đăng ký</Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
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
            {
              icon: "star-outline",
              iconA: "star",
              label: "Tour",
              route: "/guide-tour-management",
            },
          ] as const
        ).map((tab) => {
          const isActive = tab.route === "/guide-tour-management";
          return (
            <TouchableOpacity
              key={tab.route}
              style={tabSt.item}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.75}
            >
              <View style={[tabSt.iconWrap, isActive && tabSt.iconWrapActive]}>
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
  );
}

const FL = ({ t }: { t: string }) => <Text style={s.formLabel}>{t}</Text>;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4ff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1a2f7a" },

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

  catChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catActive: { backgroundColor: "#eaf0ff", borderColor: "#2856d6" },
  catTxt: { color: "#6c7fb7", fontSize: 11, fontWeight: "600" },
  catTxtActive: { color: "#2856d6" },

  resultText: {
    color: "#7a8cc2",
    fontSize: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  list: { paddingHorizontal: 14 },

  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#7a8cc2", fontSize: 15, fontWeight: "600" },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#2856d6",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#4f7cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: "row", gap: 6 },
  catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeTxt: { color: "#2856d6", fontSize: 11, fontWeight: "700" },
  assignedBadge: {
    borderRadius: 8,
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  assignedTxt: { fontSize: 11, fontWeight: "600" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 11, fontWeight: "700" },

  tourName: {
    color: "#1a2f7a",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 10,
    lineHeight: 22,
  },

  metaGrid: { gap: 5, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTxt: { color: "#7a8cc2", fontSize: 12, flex: 1 },

  guestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#eaf0ff",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#2856d6", borderRadius: 4 },
  guestsTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600", width: 56 },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { color: "#16a34a", fontWeight: "800", fontSize: 14 },

  expandSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f4ff",
  },
  infoBlock: {
    backgroundColor: "#f7f9ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoBlockLabel: {
    color: "#7a8cc2",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoBlockValue: { color: "#334155", fontSize: 12, lineHeight: 19 },

  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionTxt: { fontSize: 12, fontWeight: "700" },

  // Modals
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
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e4ebff",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  mheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4ff",
  },
  mtitle: { fontSize: 17, fontWeight: "800", color: "#1a2f7a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  mbody: { paddingHorizontal: 20, paddingTop: 8 },

  regHint: {
    backgroundColor: "#eaf0ff",
    borderRadius: 12,
    padding: 12,
    color: "#2856d6",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 4,
  },

  formLabel: {
    color: "#1a2f7a",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 14,
  },
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

  optionRow: { gap: 8, marginBottom: 4 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  optionActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  optionTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  optionTxtActive: { color: "#fff" },

  saveBtn: {
    marginTop: 20,
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
    borderTopColor: "#e4ebff",
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
