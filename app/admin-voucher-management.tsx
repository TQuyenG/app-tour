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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_vouchers";

type VoucherStatus = "active" | "full" | "expired";
type VoucherType = "percent" | "fixed";
interface Voucher {
  id: string;
  code: string;
  description: string;
  discount: string;
  type: VoucherType;
  minOrder: string;
  maxDiscount: string;
  used: number;
  limit: number;
  expiry: string;
  status: VoucherStatus;
  color: string;
}

const SEED: Voucher[] = [
  {
    id: "1",
    code: "SUMMER35",
    description: "Ưu đãi mùa hè – Giảm 35% tất cả tour biển",
    discount: "35",
    type: "percent",
    minOrder: "2000000",
    maxDiscount: "500000",
    used: 28,
    limit: 100,
    expiry: "31/08/2025",
    status: "active",
    color: "#4f7cff",
  },
  {
    id: "2",
    code: "NEWUSER200",
    description: "Chào mừng thành viên mới – Giảm 200.000đ",
    discount: "200000",
    type: "fixed",
    minOrder: "1500000",
    maxDiscount: "200000",
    used: 67,
    limit: 200,
    expiry: "31/12/2025",
    status: "active",
    color: "#10b981",
  },
  {
    id: "3",
    code: "FLASH50",
    description: "Flash sale 50% – Tour cao nguyên cuối tuần",
    discount: "50",
    type: "percent",
    minOrder: "3000000",
    maxDiscount: "800000",
    used: 50,
    limit: 50,
    expiry: "15/07/2025",
    status: "full",
    color: "#f59e0b",
  },
  {
    id: "4",
    code: "HANOI100",
    description: "Đặc quyền khách Hà Nội – Giảm 100.000đ",
    discount: "100000",
    type: "fixed",
    minOrder: "1000000",
    maxDiscount: "100000",
    used: 12,
    limit: 80,
    expiry: "01/06/2025",
    status: "expired",
    color: "#8b5cf6",
  },
  {
    id: "5",
    code: "VIP20",
    description: "Dành cho khách VIP – Giảm 20% không giới hạn",
    discount: "20",
    type: "percent",
    minOrder: "5000000",
    maxDiscount: "1000000",
    used: 5,
    limit: 30,
    expiry: "31/12/2025",
    status: "active",
    color: "#ef4444",
  },
];

const STATUS_OPTIONS: VoucherStatus[] = ["active", "full", "expired"];
const STATUS_MAP = {
  active: { label: "Đang dùng", color: "#16a34a", bg: "#dcfce7" },
  full: { label: "Hết lượt", color: "#d97706", bg: "#fef9c3" },
  expired: { label: "Hết hạn", color: "#dc2626", bg: "#fee2e2" },
};
const ACCENT_COLORS = [
  "#4f7cff",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];
const EMPTY: Omit<Voucher, "id"> = {
  code: "",
  description: "",
  discount: "",
  type: "percent",
  minOrder: "",
  maxDiscount: "",
  used: 0,
  limit: 100,
  expiry: "",
  status: "active",
  color: "#4f7cff",
};

export default function AdminVoucherManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState("");
  const [selStatus, setSelStatus] = useState<string>("Tất cả");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<Omit<Voucher, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setVouchers(JSON.parse(raw));
        else {
          setVouchers(SEED);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        }
      })
      .catch(() => setVouchers(SEED));
  }, []);

  const persist = useCallback(async (data: Voucher[]) => {
    setVouchers(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(
      () => {},
    );
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalVisible(true);
  };
  const openEdit = (v: Voucher) => {
    setEditing(v);
    setForm({
      code: v.code,
      description: v.description,
      discount: v.discount,
      type: v.type,
      minOrder: v.minOrder,
      maxDiscount: v.maxDiscount,
      used: v.used,
      limit: v.limit,
      expiry: v.expiry,
      status: v.status,
      color: v.color,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discount.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền Mã voucher và Mức giảm.");
      return;
    }
    setSaving(true);
    const codeUpper = form.code.toUpperCase().trim();
    const duplicate = vouchers.find(
      (v) => v.code === codeUpper && v.id !== editing?.id,
    );
    if (duplicate) {
      Alert.alert("Trùng mã", `Mã "${codeUpper}" đã tồn tại.`);
      setSaving(false);
      return;
    }
    const updated = editing
      ? vouchers.map((v) =>
          v.id === editing.id
            ? { ...form, code: codeUpper, id: editing.id }
            : v,
        )
      : [...vouchers, { ...form, code: codeUpper, id: Date.now().toString() }];
    await persist(updated);
    setSaving(false);
    setModalVisible(false);
  };

  const handleDelete = (v: Voucher) =>
    Alert.alert(
      "Xóa voucher",
      `Bạn có chắc muốn xóa voucher "${v.code}"?\nHành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => persist(vouchers.filter((x) => x.id !== v.id)),
        },
      ],
    );

  const f = (k: keyof Omit<Voucher, "id">, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const filtered = vouchers.filter((v) => {
    const matchStatus = selStatus === "Tất cả" || v.status === selStatus;
    const matchSearch =
      !search.trim() ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalUsed = vouchers.reduce((s, v) => s + v.used, 0);

  return (
    <View style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Voucher</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: "#4f7cff" }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { l: "Tổng", v: vouchers.length, c: "#1f2a58" },
          {
            l: "Đang dùng",
            v: vouchers.filter((x) => x.status === "active").length,
            c: "#16a34a",
          },
          { l: "Lượt dùng", v: totalUsed, c: "#4f7cff" },
          {
            l: "Hết hạn",
            v: vouchers.filter((x) => x.status === "expired").length,
            c: "#dc2626",
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

      <View style={s.searchWrap}>
        <MaterialCommunityIcons
          name="ticket-percent-outline"
          size={16}
          color="#8ea0d6"
        />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm mã voucher, mô tả..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#8ea0d6"
          autoCapitalize="characters"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {["Tất cả", ...STATUS_OPTIONS].map((st) => {
          const label =
            st === "Tất cả" ? "Tất cả" : STATUS_MAP[st as VoucherStatus].label;
          return (
            <TouchableOpacity
              key={st}
              style={[s.filterChip, selStatus === st && s.filterActive]}
              onPress={() => setSelStatus(st)}
            >
              <Text
                style={[s.filterTxt, selStatus === st && s.filterTxtActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.resultText}>{filtered.length} voucher</Text>

      <ScrollView contentContainerStyle={s.list}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons
              name="ticket-percent-outline"
              size={56}
              color="#c0cbe8"
            />
            <Text style={s.emptyText}>Không tìm thấy voucher nào</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Text style={s.emptyBtnText}>+ Tạo voucher mới</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map((voucher) => {
          const st = STATUS_MAP[voucher.status];
          const isOpen = expandedId === voucher.id;
          const usedPct = Math.min(
            Math.round((voucher.used / voucher.limit) * 100),
            100,
          );
          return (
            <TouchableOpacity
              key={voucher.id}
              style={s.card}
              activeOpacity={0.88}
              onPress={() => setExpandedId(isOpen ? null : voucher.id)}
            >
              <View style={[s.cardAccent, { backgroundColor: voucher.color }]}>
                <MaterialCommunityIcons
                  name="ticket-percent-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={s.discountTxt}>
                  {voucher.type === "percent"
                    ? `${voucher.discount}%`
                    : `${Number(voucher.discount).toLocaleString("vi-VN")}đ`}
                </Text>
                <Text style={s.typeTxt}>
                  {voucher.type === "percent" ? "%" : "Cố định"}
                </Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.cardTopRow}>
                  <Text style={s.codeText}>{voucher.code}</Text>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                <Text style={s.descText} numberOfLines={2}>
                  {voucher.description}
                </Text>
                <View style={s.progressWrap}>
                  <View style={s.progressBg}>
                    <View
                      style={[
                        s.progressFill,
                        {
                          width: `${usedPct}%`,
                          backgroundColor: voucher.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.progressTxt}>
                    {voucher.used}/{voucher.limit}
                  </Text>
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="calendar-outline" size={11} color="#8ea0d6" />
                  <Text style={s.metaTxt}>HSD: {voucher.expiry}</Text>
                  <Text style={s.dot}>·</Text>
                  <Ionicons name="pricetag-outline" size={11} color="#8ea0d6" />
                  <Text style={s.metaTxt}>
                    ≥{Number(voucher.minOrder).toLocaleString("vi-VN")}đ
                  </Text>
                </View>
                {isOpen && (
                  <View style={s.expandSection}>
                    <Text style={s.detailTxt}>
                      Giảm tối đa:{" "}
                      <Text style={{ color: "#1f2a58", fontWeight: "700" }}>
                        {Number(voucher.maxDiscount).toLocaleString("vi-VN")}đ
                      </Text>
                    </Text>
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.btnEdit}
                        onPress={() => {
                          setExpandedId(null);
                          openEdit(voucher);
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
                        onPress={() => handleDelete(voucher)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#dc2626"
                        />
                        <Text style={s.btnDelTxt}>Xóa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.btnCopy}
                        onPress={() => {
                          openAdd();
                          setForm((p) => ({
                            ...p,
                            code: voucher.code + "_COPY",
                            description: voucher.description,
                            type: voucher.type,
                            discount: voucher.discount,
                            minOrder: voucher.minOrder,
                            maxDiscount: voucher.maxDiscount,
                            limit: voucher.limit,
                            color: voucher.color,
                          }));
                        }}
                      >
                        <Ionicons
                          name="copy-outline"
                          size={14}
                          color="#d97706"
                        />
                        <Text style={s.btnCopyTxt}>Sao chép</Text>
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
                {editing ? "Chỉnh sửa voucher" : "Tạo voucher mới"}
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
              <FL t="Mã voucher *" />
              <TextInput
                style={s.input}
                value={form.code}
                onChangeText={(v) => f("code", v.toUpperCase())}
                placeholder="VD: SUMMER35"
                placeholderTextColor="#b0bdd8"
                autoCapitalize="characters"
              />
              <FL t="Mô tả" />
              <TextInput
                style={s.input}
                value={form.description}
                onChangeText={(v) => f("description", v)}
                placeholder="VD: Ưu đãi mùa hè giảm 35%"
                placeholderTextColor="#b0bdd8"
              />

              <FL t="Loại giảm giá" />
              <View style={s.optionRow}>
                {(["percent", "fixed"] as VoucherType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeOpt, form.type === t && s.typeOptActive]}
                    onPress={() => f("type", t)}
                  >
                    <Text
                      style={[
                        s.typeOptTxt,
                        form.type === t && s.typeOptTxtActive,
                      ]}
                    >
                      {t === "percent" ? "% Phần trăm" : "Cố định (đ)"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FL
                t={
                  form.type === "percent"
                    ? "Mức giảm (%) *"
                    : "Mức giảm (VNĐ) *"
                }
              />
              <TextInput
                style={s.input}
                value={form.discount}
                onChangeText={(v) => f("discount", v)}
                placeholder={form.type === "percent" ? "VD: 35" : "VD: 200000"}
                keyboardType="numeric"
                placeholderTextColor="#b0bdd8"
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FL t="Đơn tối thiểu (đ)" />
                  <TextInput
                    style={s.input}
                    value={form.minOrder}
                    onChangeText={(v) => f("minOrder", v)}
                    placeholder="VD: 2000000"
                    keyboardType="numeric"
                    placeholderTextColor="#b0bdd8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FL t="Giảm tối đa (đ)" />
                  <TextInput
                    style={s.input}
                    value={form.maxDiscount}
                    onChangeText={(v) => f("maxDiscount", v)}
                    placeholder="VD: 500000"
                    keyboardType="numeric"
                    placeholderTextColor="#b0bdd8"
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FL t="Tổng lượt" />
                  <TextInput
                    style={s.input}
                    value={String(form.limit)}
                    onChangeText={(v) => f("limit", Number(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FL t="Đã dùng" />
                  <TextInput
                    style={s.input}
                    value={String(form.used)}
                    onChangeText={(v) => f("used", Number(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FL t="Ngày hết hạn" />
              <TextInput
                style={s.input}
                value={form.expiry}
                onChangeText={(v) => f("expiry", v)}
                placeholder="VD: 31/12/2025"
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

              <FL t="Màu accent" />
              <View style={s.colorRow}>
                {ACCENT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.colorDot,
                      { backgroundColor: c },
                      form.color === c && s.colorDotActive,
                    ]}
                    onPress={() => f("color", c)}
                  >
                    {form.color === c && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

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
                      : "Tạo voucher"}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterRow: { gap: 8, paddingHorizontal: 14, marginBottom: 8 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
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
    marginBottom: 12,
    overflow: "hidden",
  },
  cardAccent: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 4,
  },
  discountTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  typeTxt: { color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: "600" },
  cardBody: { flex: 1, padding: 12 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  codeText: {
    color: "#1f2a58",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  descText: { color: "#5f73a9", fontSize: 12, marginTop: 4, lineHeight: 17 },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#eaf0ff",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  metaTxt: { color: "#7a8cc2", fontSize: 11 },
  dot: { color: "#c0cbe8" },
  expandSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f4ff",
  },
  detailTxt: { color: "#7a8cc2", fontSize: 12, marginBottom: 10 },
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
  btnCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#fef9c3",
  },
  btnCopyTxt: { fontSize: 12, fontWeight: "700", color: "#d97706" },
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
  typeOpt: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#dfe7ff",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  typeOptActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  typeOptTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "700" },
  typeOptTxtActive: { color: "#4f7cff" },
  statusOpt: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#dfe7ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusOptTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "700" },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
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
