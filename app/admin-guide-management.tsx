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

// Dùng chung key @app_guides với guest home để đồng bộ real-time
const STORAGE_KEY = "@app_guides";

type GuideStatus = "active" | "busy" | "inactive";
interface Guide {
  id: string;
  name: string;
  location: string;
  experience: string;
  skills: string;
  rating: number;
  tours: number;
  phone: string;
  email: string;
  status: GuideStatus;
  note: string;
}

const SEED: Guide[] = [
  {
    id: "1",
    name: "Nguyễn Văn Hùng",
    location: "TP. Hồ Chí Minh",
    experience: "5 năm",
    skills: "Biển đảo, Cao nguyên, Tiếng Anh",
    rating: 4.9,
    tours: 87,
    phone: "0901 234 567",
    email: "hung@hdv.vn",
    status: "active",
    note: "HDV xuất sắc tháng 2.",
  },
  {
    id: "2",
    name: "Trần Thị Lan",
    location: "Hà Nội",
    experience: "3 năm",
    skills: "Di sản, Tiếng Pháp, Lịch sử",
    rating: 4.7,
    tours: 54,
    phone: "0912 345 678",
    email: "lan@hdv.vn",
    status: "active",
    note: "",
  },
  {
    id: "3",
    name: "Lê Minh Tuấn",
    location: "Đà Nẵng",
    experience: "7 năm",
    skills: "Trekking, Núi rừng, Sinh tồn",
    rating: 4.8,
    tours: 120,
    phone: "0933 456 789",
    email: "tuan@hdv.vn",
    status: "busy",
    note: "Đang dẫn tour Sapa 3N2Đ.",
  },
  {
    id: "4",
    name: "Phạm Thu Hà",
    location: "Cần Thơ",
    experience: "2 năm",
    skills: "Miền Tây, Ẩm thực, Tiếng Anh",
    rating: 4.5,
    tours: 28,
    phone: "0944 567 890",
    email: "ha@hdv.vn",
    status: "active",
    note: "",
  },
  {
    id: "5",
    name: "Hoàng Đức Bình",
    location: "Huế",
    experience: "6 năm",
    skills: "Cố đô, Di sản, Tiếng Nhật",
    rating: 4.6,
    tours: 95,
    phone: "0955 678 901",
    email: "binh@hdv.vn",
    status: "inactive",
    note: "Tạm nghỉ do sức khỏe.",
  },
];

const STATUS_OPTIONS: GuideStatus[] = ["active", "busy", "inactive"];
const STATUS_MAP = {
  active: { label: "Hoạt động", color: "#16a34a", bg: "#dcfce7" },
  busy: { label: "Đang dẫn", color: "#4f7cff", bg: "#eaf0ff" },
  inactive: { label: "Tạm nghỉ", color: "#d97706", bg: "#fef9c3" },
};
const SKILL_BG = ["#eaf0ff", "#fef9c3", "#dcfce7", "#fce7f3", "#f3e8ff"];
const EMPTY: Omit<Guide, "id"> = {
  name: "",
  location: "",
  experience: "",
  skills: "",
  rating: 5,
  tours: 0,
  phone: "",
  email: "",
  status: "active",
  note: "",
};

export default function AdminGuideManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState("");
  const [selStatus, setSelStatus] = useState<string>("Tất cả");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [form, setForm] = useState<Omit<Guide, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setGuides(JSON.parse(raw));
        else {
          setGuides(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setGuides(SEED));
  }, []);

  const persist = useCallback(async (data: Guide[]) => {
    setGuides(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalVisible(true);
  };
  const openEdit = (g: Guide) => {
    setEditing(g);
    setForm({
      name: g.name,
      location: g.location,
      experience: g.experience,
      skills: g.skills,
      rating: g.rating,
      tours: g.tours,
      phone: g.phone,
      email: g.email,
      status: g.status,
      note: g.note,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền Họ tên và Số điện thoại.");
      return;
    }
    setSaving(true);
    const updated = editing
      ? guides.map((g) =>
          g.id === editing.id ? { ...form, id: editing.id } : g,
        )
      : [...guides, { ...form, id: Date.now().toString() }];
    await persist(updated);
    setSaving(false);
    setModalVisible(false);
  };

  const handleDelete = (g: Guide) =>
    Alert.alert(
      "Xóa hướng dẫn viên",
      `Bạn có chắc muốn xóa "${g.name}"?\nHành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => persist(guides.filter((x) => x.id !== g.id)),
        },
      ],
    );

  const f = (k: keyof Omit<Guide, "id">, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const filtered = guides.filter((g) => {
    const matchStatus = selStatus === "Tất cả" || g.status === selStatus;
    // Normalize skills to string for search
    const skillsStr = Array.isArray(g.skills)
      ? g.skills.join(", ")
      : typeof g.skills === "string"
        ? g.skills
        : "";
    const matchSearch =
      !search.trim() ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.location.toLowerCase().includes(search.toLowerCase()) ||
      skillsStr.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const avgRating = guides.length
    ? (guides.reduce((s, g) => s + g.rating, 0) / guides.length).toFixed(1)
    : "—";

  return (
    <View style={s.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý HDV</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: "#4f7cff" }]}
          onPress={openAdd}
        >
          <Ionicons name="person-add" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { l: "Tổng", v: guides.length, c: "#1f2a58" },
          {
            l: "Hoạt động",
            v: guides.filter((g) => g.status === "active").length,
            c: "#16a34a",
          },
          {
            l: "Đang dẫn",
            v: guides.filter((g) => g.status === "busy").length,
            c: "#4f7cff",
          },
          { l: "Đ.giá TB", v: avgRating, c: "#f59e0b" },
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

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm tên, kỹ năng, địa điểm..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#8ea0d6"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {["Tất cả", ...STATUS_OPTIONS].map((st) => {
            const label =
              st === "Tất cả" ? "Tất cả" : STATUS_MAP[st as GuideStatus].label;
            return (
              <TouchableOpacity
                key={st}
                style={[s.filterChip, selStatus === st && s.filterActive]}
                onPress={() => setSelStatus(st)}
              >
                <Text
                  numberOfLines={1}
                  style={[s.filterTxt, selStatus === st && s.filterTxtActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={s.resultText}>{filtered.length} hướng dẫn viên</Text>

      <ScrollView contentContainerStyle={s.list}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="people-outline" size={56} color="#c0cbe8" />
            <Text style={s.emptyText}>Không tìm thấy HDV nào</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Text style={s.emptyBtnText}>+ Thêm HDV mới</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map((guide) => {
          const st = STATUS_MAP[guide.status];
          const isOpen = expandedId === guide.id;
          // Fix: skills có thể là string hoặc string[] tùy nguồn data
          const skills = Array.isArray(guide.skills)
            ? guide.skills.filter(Boolean)
            : typeof guide.skills === "string"
              ? guide.skills
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [];
          return (
            <TouchableOpacity
              key={guide.id}
              style={s.card}
              activeOpacity={0.88}
              onPress={() => setExpandedId(isOpen ? null : guide.id)}
            >
              <View style={s.avatarWrap}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={22} color="#fff" />
                </View>
                <View style={[s.statusDot, { backgroundColor: st.color }]} />
              </View>
              <View style={s.cardBody}>
                <View style={s.cardTopRow}>
                  <Text style={s.guideName}>{guide.name}</Text>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={12} color="#8ea0d6" />
                  <Text style={s.metaText}>{guide.location}</Text>
                  <Text style={s.dot}>·</Text>
                  <Text style={s.metaText}>{guide.experience} kinh nghiệm</Text>
                </View>
                <View style={s.skillsRow}>
                  {skills.slice(0, 3).map((sk, i) => (
                    <View
                      key={sk}
                      style={[
                        s.skillChip,
                        { backgroundColor: SKILL_BG[i % SKILL_BG.length] },
                      ]}
                    >
                      <Text style={s.skillTxt}>{sk}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.statsRow2}>
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={s.ratingTxt}>{guide.rating}</Text>
                  </View>
                  <Text style={s.toursTxt}>{guide.tours} tour</Text>
                  <View style={s.matchBadge}>
                    <Ionicons name="call-outline" size={11} color="#4f7cff" />
                    <Text style={s.matchTxt}>{guide.phone}</Text>
                  </View>
                </View>
                {isOpen && (
                  <View style={s.expandSection}>
                    {!!guide.note && (
                      <Text style={s.noteText}>📝 {guide.note}</Text>
                    )}
                    <Text style={s.emailText}>✉️ {guide.email}</Text>
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.btnEdit}
                        onPress={() => {
                          setExpandedId(null);
                          openEdit(guide);
                        }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color="#4f7cff"
                        />
                        <Text style={s.btnEditTxt}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.btnDel}
                        onPress={() => handleDelete(guide)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#dc2626"
                        />
                        <Text style={s.btnDelTxt}>Xóa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.btnLock}
                        onPress={() =>
                          persist(
                            guides.map((g) =>
                              g.id === guide.id
                                ? {
                                    ...g,
                                    status:
                                      g.status === "inactive"
                                        ? "active"
                                        : "inactive",
                                  }
                                : g,
                            ),
                          )
                        }
                      >
                        <Ionicons
                          name={
                            guide.status === "inactive"
                              ? "lock-open-outline"
                              : "ban-outline"
                          }
                          size={14}
                          color="#d97706"
                        />
                        <Text style={s.btnLockTxt}>
                          {guide.status === "inactive" ? "Mở khóa" : "Tạm khóa"}
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
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editing ? "Chỉnh sửa HDV" : "Thêm HDV mới"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FL t="Họ và tên *" />
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={(v) => f("name", v)}
                placeholder="VD: Nguyễn Văn A"
                placeholderTextColor="#b0bdd8"
              />
              <FL t="Số điện thoại *" />
              <TextInput
                style={s.input}
                value={form.phone}
                onChangeText={(v) => f("phone", v)}
                placeholder="VD: 0901 234 567"
                keyboardType="phone-pad"
                placeholderTextColor="#b0bdd8"
              />
              <FL t="Email" />
              <TextInput
                style={s.input}
                value={form.email}
                onChangeText={(v) => f("email", v)}
                placeholder="VD: guide@email.com"
                keyboardType="email-address"
                placeholderTextColor="#b0bdd8"
                autoCapitalize="none"
              />
              <FL t="Địa điểm hoạt động" />
              <TextInput
                style={s.input}
                value={form.location}
                onChangeText={(v) => f("location", v)}
                placeholder="VD: TP. Hồ Chí Minh"
                placeholderTextColor="#b0bdd8"
              />
              <FL t="Kinh nghiệm" />
              <TextInput
                style={s.input}
                value={form.experience}
                onChangeText={(v) => f("experience", v)}
                placeholder="VD: 5 năm"
                placeholderTextColor="#b0bdd8"
              />
              <FL t="Kỹ năng (cách nhau bằng dấu phẩy)" />
              <TextInput
                style={s.input}
                value={form.skills}
                onChangeText={(v) => f("skills", v)}
                placeholder="VD: Biển đảo, Tiếng Anh, Trekking"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Trạng thái" />
              <View style={s.optionRow}>
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
                      onPress={() => f("status", st)}
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
                  <FL t="Đánh giá (1–5)" />
                  <TextInput
                    style={s.input}
                    value={String(form.rating)}
                    onChangeText={(v) => f("rating", parseFloat(v) || 5)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FL t="Số tour đã dẫn" />
                  <TextInput
                    style={s.input}
                    value={String(form.tours)}
                    onChangeText={(v) => f("tours", Number(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FL t="Ghi chú nội bộ" />
              <TextInput
                style={[s.input, { minHeight: 70, paddingTop: 12 }]}
                value={form.note}
                onChangeText={(v) => f("note", v)}
                placeholder="Ghi chú về HDV này..."
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
                    editing ? "checkmark-circle-outline" : "person-add-outline"
                  }
                  size={18}
                  color="#fff"
                />
                <Text style={s.saveBtnTxt}>
                  {saving
                    ? "Đang lưu..."
                    : editing
                      ? "Lưu thay đổi"
                      : "Thêm HDV"}
                </Text>
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
          const isActive = tab.route === "/admin-guide-management";
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
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
  statNum: { fontSize: 20, fontWeight: "800" },
  statLbl: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterWrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#f3f7ff",
    borderRadius: 12,
    overflow: "hidden",
  },
  filterRow: {
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
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt: {
    color: "#6c7fb7",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 0,
  },
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
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#4f7cff",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#4f7cff",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  guideName: { color: "#1f2a58", fontWeight: "700", fontSize: 15, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaText: { color: "#7a8cc2", fontSize: 12 },
  dot: { color: "#c0cbe8", fontSize: 12 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 },
  skillChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  skillTxt: { fontSize: 11, color: "#1f2a58", fontWeight: "600" },
  statsRow2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "600" },
  toursTxt: { color: "#7a8cc2", fontSize: 12 },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#edf2ff",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  matchTxt: { color: "#4f7cff", fontSize: 11, fontWeight: "600" },
  expandSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f4ff",
  },
  noteText: { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginBottom: 4 },
  emailText: {
    color: "#5f73a9",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#eaf0ff",
  },
  btnEditTxt: { fontSize: 12, fontWeight: "700", color: "#4f7cff" },
  btnDel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  btnDelTxt: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  btnLock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#fef9c3",
  },
  btnLockTxt: { fontSize: 12, fontWeight: "700", color: "#d97706" },
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
    maxHeight: "92%",
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
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f3f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  formLabel: {
    color: "#1f2a58",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#f3f7ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4ebff",
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#1f2a58",
    fontSize: 14,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  statusOpt: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#dfe7ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusOptTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "700" },
  saveBtn: {
    marginTop: 20,
    backgroundColor: "#4f7cff",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
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
