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

// Dùng chung key @app_tours với guest home để đồng bộ real-time
const STORAGE_KEY = "@app_tours";

type TourStatus = "active" | "full" | "draft";
interface Tour {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: string;
  priceRaw: number;
  rating: number;
  seats: number;
  seatsLeft: number;
  departure: string;
  status: TourStatus;
  description: string;
  tags: string[];
  color: string;
  date: string;
}

const COLORS = ["#99bbff", "#93d5ff", "#b5f0c0", "#ffd6a5", "#d0b3ff"];

const SEED: Tour[] = [
  // ... (Tour seed data, see previous versions for full data)
];

const CATEGORIES = [
  "Biển đảo",
  "Cao nguyên",
  "Di sản",
  "Núi rừng",
  "Thành phố",
];
const STATUS_OPTIONS: TourStatus[] = ["active", "full", "draft"];
const STATUS_MAP = {
  active: { label: "Đang mở", color: "#16a34a", bg: "#dcfce7" },
  full: { label: "Hết chỗ", color: "#dc2626", bg: "#fee2e2" },
  draft: { label: "Nháp", color: "#d97706", bg: "#fef9c3" },
};
const EMPTY: Omit<Tour, "id"> = {
  name: "",
  category: "Biển đảo",
  duration: "",
  price: "",
  priceRaw: 0,
  rating: 5,
  seats: 10,
  seatsLeft: 10,
  departure: "",
  status: "draft",
  description: "",
  tags: [],
  color: "#99bbff",
  date: "",
};

function formatPrice(raw: number | string): string {
  if (typeof raw === "number" && raw > 0)
    return `${raw.toLocaleString("vi-VN")}đ`;
  const s = String(raw);
  if (s.includes("đ")) return s;
  const n = Number(s.replace(/\./g, "").replace("đ", "").trim());
  return n > 0 ? `${n.toLocaleString("vi-VN")}đ` : s;
}

export default function AdminTourManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [selSt, setSelSt] = useState<"all" | TourStatus>("all");
  const [selCat, setSelCat] = useState("Tất cả");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [form, setForm] = useState<Omit<Tour, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setTours(JSON.parse(raw));
        } else {
          setTours(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setTours(SEED));
  }, []);

  const persist = useCallback(async (data: Tour[]) => {
    setTours(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalVisible(true);
  };
  const openEdit = (t: Tour) => {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      duration: t.duration,
      price: t.price,
      priceRaw: t.priceRaw,
      rating: t.rating,
      seats: t.seats,
      seatsLeft: t.seatsLeft,
      departure: t.departure,
      status: t.status,
      description: t.description,
      tags: t.tags,
      color: t.color,
      date: t.date,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim() || !form.departure.trim()) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng điền Tên, Giá và Điểm xuất phát.",
      );
      return;
    }
    setSaving(true);
    const rawNum =
      Number(form.price.replace(/\./g, "").replace("đ", "").trim()) || 0;
    const colorIdx = tours.length % COLORS.length;
    const full: Omit<Tour, "id"> = {
      ...form,
      priceRaw: rawNum,
      price: rawNum > 0 ? `${rawNum.toLocaleString("vi-VN")}đ` : form.price,
      color: form.color || COLORS[colorIdx],
      tags: form.tags?.length > 0 ? form.tags : [form.category.toLowerCase()],
      date: form.date || "",
    };
    const updated = editing
      ? tours.map((t) =>
          t.id === editing.id ? { ...full, id: editing.id } : t,
        )
      : [...tours, { ...full, id: Date.now().toString() }];
    await persist(updated);
    setSaving(false);
    setModalVisible(false);
  };

  const handleDelete = (t: Tour) =>
    Alert.alert("Xóa tour", `Xóa "${t.name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => persist(tours.filter((x) => x.id !== t.id)),
      },
    ]);

  const setF = (k: keyof Omit<Tour, "id">, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const filtered = tours.filter((t) => {
    const matchSt = selSt === "all" || t.status === selSt;
    const matchCat = selCat === "Tất cả" || t.category === selCat;
    const kw = search.trim().toLowerCase();
    const matchKw =
      !kw ||
      t.name.toLowerCase().includes(kw) ||
      t.departure.toLowerCase().includes(kw);
    return matchSt && matchCat && matchKw;
  });

  const counts = {
    all: tours.length,
    active: tours.filter((t) => t.status === "active").length,
    full: tours.filter((t) => t.status === "full").length,
    draft: tours.filter((t) => t.status === "draft").length,
  };

  return (
    <View style={s.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      {/* ── TOP BAR ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Tour</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: "#4f7cff" }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── STATS ROW ── */}
      <View style={s.statsRow}>
        {(
          [
            { l: "Tổng", v: counts.all, c: "#1f2a58" },
            { l: "Mở", v: counts.active, c: "#16a34a" },
            { l: "Hết chỗ", v: counts.full, c: "#dc2626" },
            { l: "Nháp", v: counts.draft, c: "#d97706" },
          ] as const
        ).map((item, i, arr) => (
          <View
            key={item.l}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Text style={[s.statNum, { color: item.c }]}>{item.v}</Text>
            <Text style={s.statLbl}>{item.l}</Text>
          </View>
        ))}
      </View>

      {/* ── SEARCH ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color="#8ea0d6" />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm tour, điểm xuất phát..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#8ea0d6"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── STATUS FILTER ── */}
      <View style={s.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {(
            [
              { key: "all", label: `Tất cả (${counts.all})` },
              { key: "active", label: `Đang mở (${counts.active})` },
              { key: "full", label: `Hết chỗ (${counts.full})` },
              { key: "draft", label: `Nháp (${counts.draft})` },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.filterChip, selSt === item.key && s.filterChipActive]}
              onPress={() => setSelSt(item.key)}
            >
              <Text
                style={[s.filterTxt, selSt === item.key && s.filterTxtActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── CATEGORY FILTER ── */}
      <View style={s.catWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catRow}
        >
          {["Tất cả", ...CATEGORIES].map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.catChip, selCat === c && s.catActive]}
              onPress={() => setSelCat(c)}
            >
              <Text
                numberOfLines={1}
                style={[s.catTxt, selCat === c && s.catTxtActive]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={s.resultText}>{filtered.length} tour</Text>

      {/* ── LIST ── */}
      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons
              name="map-search-outline"
              size={52}
              color="#c0cbe8"
            />
            <Text style={s.emptyText}>Không tìm thấy tour nào</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Text style={s.emptyBtnTxt}>+ Thêm tour mới</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map((tour) => {
          const st = STATUS_MAP[tour.status];
          const isOpen = expandedId === tour.id;
          return (
            <TouchableOpacity
              key={tour.id}
              style={s.card}
              activeOpacity={0.88}
              onPress={() => setExpandedId(isOpen ? null : tour.id)}
            >
              <View
                style={[
                  s.cardThumb,
                  { backgroundColor: tour.color || "#eaf0ff" },
                ]}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={22}
                  color="rgba(255,255,255,0.7)"
                />
              </View>
              <View style={s.cardBody}>
                <View style={s.cardTopRow}>
                  <Text style={s.tourName} numberOfLines={1}>
                    {tour.name}
                  </Text>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={[s.badgeTxt, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={11} color="#8ea0d6" />
                  <Text style={s.metaTxt}>{tour.departure}</Text>
                  <Text style={s.dot}>·</Text>
                  <Ionicons name="time-outline" size={11} color="#8ea0d6" />
                  <Text style={s.metaTxt}>{tour.duration}</Text>
                </View>
                <View style={s.cardBottom}>
                  <Text style={s.price}>
                    {formatPrice(tour.priceRaw || tour.price)}
                  </Text>
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={s.ratingTxt}>{tour.rating}</Text>
                    <Text style={s.seatsTxt}>
                      · {tour.seatsLeft}/{tour.seats} chỗ
                    </Text>
                  </View>
                </View>
                {isOpen && (
                  <View style={s.expandSection}>
                    {!!tour.description && (
                      <Text style={s.descTxt}>{tour.description}</Text>
                    )}
                    {!!tour.date && (
                      <Text style={s.dateTxt}>📅 Khởi hành: {tour.date}</Text>
                    )}
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.btnEdit}
                        onPress={() => {
                          setExpandedId(null);
                          openEdit(tour);
                        }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={13}
                          color="#4f7cff"
                        />
                        <Text style={s.btnEditTxt}>Chỉnh sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.btnDel}
                        onPress={() => handleDelete(tour)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={13}
                          color="#dc2626"
                        />
                        <Text style={s.btnDelTxt}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── MODAL FORM ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[s.sheet, { paddingBottom: insets.bottom }]}>
            <View style={s.sheetHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editing ? "Chỉnh sửa tour" : "Thêm tour mới"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={18} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FL t="Tên tour *" />
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={(v) => setF("name", v)}
                placeholder="VD: Tour Đà Nẵng 3N2Đ"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Điểm xuất phát *" />
              <TextInput
                style={s.input}
                value={form.departure}
                onChangeText={(v) => setF("departure", v)}
                placeholder="VD: TP.HCM"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Giá (VNĐ) *" />
              <TextInput
                style={s.input}
                value={form.price}
                onChangeText={(v) => setF("price", v)}
                placeholder="VD: 2800000"
                keyboardType="numeric"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Thời gian" />
              <TextInput
                style={s.input}
                value={form.duration}
                onChangeText={(v) => setF("duration", v)}
                placeholder="VD: 3 ngày 2 đêm"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Ngày khởi hành" />
              <TextInput
                style={s.input}
                value={form.date}
                onChangeText={(v) => setF("date", v)}
                placeholder="VD: 22/04/2025"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Danh mục" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 4 }}
              >
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, form.category === c && s.chipActive]}
                    onPress={() => setF("category", c)}
                  >
                    <Text
                      style={[
                        s.chipTxt,
                        form.category === c && s.chipTxtActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FL t="Trạng thái" />
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                {STATUS_OPTIONS.map((st) => {
                  const info = STATUS_MAP[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        s.statusOpt,
                        form.status === st && {
                          backgroundColor: info.bg,
                          borderColor: info.color,
                        },
                      ]}
                      onPress={() => setF("status", st)}
                    >
                      <Text
                        style={[
                          s.statusOptTxt,
                          form.status === st && { color: info.color },
                        ]}
                      >
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FL t="Tổng chỗ" />
                  <TextInput
                    style={s.input}
                    value={String(form.seats)}
                    onChangeText={(v) => setF("seats", Number(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FL t="Chỗ còn" />
                  <TextInput
                    style={s.input}
                    value={String(form.seatsLeft)}
                    onChangeText={(v) => setF("seatsLeft", Number(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FL t="Mô tả ngắn" />
              <TextInput
                style={[s.input, { minHeight: 76, paddingTop: 12 }]}
                value={form.description}
                onChangeText={(v) => setF("description", v)}
                placeholder="Mô tả điểm nổi bật..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#b0bdd8"
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Ionicons
                  name={
                    editing ? "checkmark-circle-outline" : "add-circle-outline"
                  }
                  size={18}
                  color="#fff"
                />
                <Text style={s.saveBtnTxt}>
                  {saving
                    ? "Đang lưu..."
                    : editing
                      ? "Lưu thay đổi"
                      : "Thêm tour"}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── BOTTOM TAB BAR ── */}
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
              route: "/admin-home",
            },
            {
              icon: "map-outline",
              iconA: "map",
              label: "Tour",
              route: "/admin-tour-management",
            },
            {
              icon: "people-outline",
              iconA: "people",
              label: "HDV",
              route: "/admin-guide-management",
            },
            {
              icon: "bar-chart-outline",
              iconA: "bar-chart",
              label: "Báo cáo",
              route: "/admin-report",
            },
            {
              icon: "person-outline",
              iconA: "person",
              label: "Profile",
              route: "/admin-profile",
            },
          ] as const
        ).map((tab) => {
          const isActive = tab.route === "/admin-tour-management";
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
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
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
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1f2a58" },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
  },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#e4ebff" },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLbl: { fontSize: 10, color: "#7a8cc2", marginTop: 2 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 13 },

  // Filter wrapper Views (background + radius ở đây, KHÔNG đặt trong contentContainerStyle)
  filterWrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#f3f7ff",
    borderRadius: 12,
    overflow: "hidden",
  },
  filterRow: {
    // contentContainerStyle: chỉ layout chips, KHÔNG có background/borderRadius
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0, // không bị thu nhỏ
  },
  filterChipActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt: {
    color: "#6c7fb7",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  filterTxtActive: { color: "#fff" },

  catWrap: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#f3f7ff",
    borderRadius: 12,
    overflow: "hidden",
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  catChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0, // không bị thu nhỏ
  },
  catActive: { backgroundColor: "#1a55e8", borderColor: "#1a55e8" },
  catTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "700", flexShrink: 0 },
  catTxtActive: { color: "#fff" },

  resultText: {
    color: "#7a8cc2",
    fontSize: 12,
    paddingHorizontal: 14,
    marginBottom: 5,
  },
  list: { paddingHorizontal: 12 },

  emptyWrap: { alignItems: "center", paddingTop: 50, gap: 12 },
  emptyText: { color: "#7a8cc2", fontSize: 14, fontWeight: "600" },
  emptyBtn: {
    backgroundColor: "#4f7cff",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 10,
    marginBottom: 9,
    gap: 10,
  },
  cardThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 4,
  },
  tourName: { color: "#1f2a58", fontWeight: "700", fontSize: 13, flex: 1 },
  badge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeTxt: { fontSize: 10, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 3,
    flexWrap: "wrap",
  },
  metaTxt: { color: "#7a8cc2", fontSize: 11 },
  dot: { color: "#c0cbe8", marginHorizontal: 2 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  price: { color: "#4f7cff", fontWeight: "700", fontSize: 13 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  seatsTxt: { color: "#7a8cc2", fontSize: 11 },
  expandSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f4ff",
  },
  descTxt: { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  dateTxt: { color: "#7a8cc2", fontSize: 11, marginBottom: 8 },
  actionRow: { flexDirection: "row", gap: 8 },
  btnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eaf0ff",
  },
  btnEditTxt: { fontSize: 11, fontWeight: "700", color: "#4f7cff" },
  btnDel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  btnDelTxt: { fontSize: 11, fontWeight: "700", color: "#dc2626" },

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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#e4ebff",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4ff",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#f3f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 18, paddingTop: 6 },
  formLabel: {
    color: "#1f2a58",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f3f7ff",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#e4ebff",
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: "#1f2a58",
    fontSize: 13,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  chipTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  statusOpt: {
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#dfe7ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusOptTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "700" },
  saveBtn: {
    marginTop: 18,
    backgroundColor: "#4f7cff",
    borderRadius: 13,
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
  iconWrapActive: { backgroundColor: "#4f7cff" },
  label: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  labelActive: { color: "#4f7cff" },
});
