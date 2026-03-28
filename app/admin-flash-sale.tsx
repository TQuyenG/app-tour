/**
 * app/admin-flash-sale.tsx
 * Admin quản lý Flash Sale và Deal Hot
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

interface FlashSale {
  id: string; tourName: string; originalPrice: number;
  salePrice: number; discountPercent: number;
  totalSlots: number; soldSlots: number;
  startTime: string; endTime: string;
  active: boolean; color: string;
  clicks: number; orders: number;
}

const SEED_FLASH: FlashSale[] = [
  { id: "fs1", tourName: "Đà Lạt 3N2Đ - Săn mây & Chill",       originalPrice: 2990000, salePrice: 1944000, discountPercent: 35, totalSlots: 20, soldSlots: 14, startTime: "2026-04-12T08:00:00", endTime: "2026-04-12T23:59:00", active: true,  color: "#4f7cff", clicks: 432,  orders: 14 },
  { id: "fs2", tourName: "Phú Quốc 4N3Đ - Resort biển xanh",     originalPrice: 4690000, salePrice: 2814000, discountPercent: 40, totalSlots: 10, soldSlots: 8,  startTime: "2026-04-12T10:00:00", endTime: "2026-04-13T10:00:00", active: true,  color: "#ef4444", clicks: 891,  orders: 8 },
  { id: "fs3", tourName: "Sapa 3N2Đ - Mùa lúa chín",             originalPrice: 3590000, salePrice: 2513000, discountPercent: 30, totalSlots: 15, soldSlots: 5,  startTime: "2026-04-13T00:00:00", endTime: "2026-04-14T00:00:00", active: false, color: "#16a34a", clicks: 0,    orders: 0 },
  { id: "fs4", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng",       originalPrice: 2300000, salePrice: 1380000, discountPercent: 40, totalSlots: 30, soldSlots: 22, startTime: "2026-04-11T08:00:00", endTime: "2026-04-12T08:00:00", active: false, color: "#f59e0b", clicks: 1203, orders: 22 },
  { id: "fs5", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan",         originalPrice: 3500000, salePrice: 2100000, discountPercent: 40, totalSlots: 12, soldSlots: 3,  startTime: "2026-04-14T08:00:00", endTime: "2026-04-15T08:00:00", active: false, color: "#8b5cf6", clicks: 0,    orders: 0 },
  { id: "fs6", tourName: "Côn Đảo 4N3Đ - Thiên đường hoang sơ", originalPrice: 5300000, salePrice: 3710000, discountPercent: 30, totalSlots: 8,  soldSlots: 8,  startTime: "2026-04-10T00:00:00", endTime: "2026-04-11T00:00:00", active: false, color: "#dc2626", clicks: 2341, orders: 8 },
];

const TOUR_OPTIONS = [
  "Đà Lạt 3N2Đ - Săn mây & Chill",
  "Phú Quốc 4N3Đ - Resort biển xanh",
  "Nha Trang 3N2Đ - Lặn san hô",
  "Sapa 3N2Đ - Mùa lúa chín",
  "Hội An 2N1Đ - Phố cổ đèn lồng",
  "Hạ Long 3N2Đ - Vịnh kỳ quan",
  "Mũi Né 2N1Đ - Đồi cát vàng",
  "Côn Đảo 4N3Đ - Thiên đường hoang sơ",
];

const fmt    = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const fmtM   = (n: number) => `${(n / 1000000).toFixed(1)}tr`;

function useCountdown(endTime: string, active: boolean) {
  const [remaining, setRemaining] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!active) { setRemaining("Chưa chạy"); return; }
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Đã kết thúc"); clearInterval(intervalRef.current!); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [endTime, active]);
  return remaining;
}

function CountdownCell({ endTime, active }: { endTime: string; active: boolean }) {
  const t = useCountdown(endTime, active);
  return <Text style={[cst.countdown, !active && { color: "#94a3b8" }]}>{t}</Text>;
}
const cst = StyleSheet.create({ countdown: { color: "#ef4444", fontWeight: "800", fontSize: 12 } });

export default function AdminFlashSale() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sales, setSales]           = useState<FlashSale[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ tourName: "", originalPrice: "", discountPercent: "", totalSlots: "", startTime: "", endTime: "", color: "#ef4444" });
  const [tab, setTab]               = useState<"active" | "upcoming" | "ended">("active");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@admin_flash_sales").then(raw => {
      setSales(raw ? JSON.parse(raw) : SEED_FLASH);
    }).catch(() => setSales(SEED_FLASH));
  }, []));

  const persist = async (data: FlashSale[]) => {
    setSales(data);
    await AsyncStorage.setItem("@admin_flash_sales", JSON.stringify(data)).catch(() => {});
  };

  const createSale = async () => {
    if (!form.tourName || !form.originalPrice || !form.discountPercent) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đủ các trường bắt buộc *"); return;
    }
    const origPrice    = parseFloat(form.originalPrice.replace(/\D/g, ""));
    const discPct      = parseFloat(form.discountPercent);
    const salePrice    = Math.round(origPrice * (1 - discPct / 100));
    const newSale: FlashSale = {
      id: `fs${Date.now()}`,
      tourName: form.tourName,
      originalPrice: origPrice,
      salePrice,
      discountPercent: discPct,
      totalSlots: parseInt(form.totalSlots) || 10,
      soldSlots: 0,
      startTime: form.startTime || new Date().toISOString(),
      endTime:   form.endTime   || new Date(Date.now() + 86400000).toISOString(),
      active: false,
      color: form.color,
      clicks: 0, orders: 0,
    };
    await persist([newSale, ...sales]);
    setShowModal(false);
    setForm({ tourName: "", originalPrice: "", discountPercent: "", totalSlots: "", startTime: "", endTime: "", color: "#ef4444" });
    Alert.alert("✅ Đã tạo Flash Sale", `Tour "${form.tourName}" giảm ${discPct}%`);
  };

  const toggleActive = async (id: string) => {
    await persist(sales.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSale = (fs: FlashSale) => {
    Alert.alert("Xóa flash sale", `Xóa flash sale "${fs.tourName}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => await persist(sales.filter(s => s.id !== fs.id)) },
    ]);
  };

  const now = Date.now();
  const filtered = sales.filter(s => {
    const end   = new Date(s.endTime).getTime();
    const start = new Date(s.startTime).getTime();
    if (tab === "active")   return s.active && end > now;
    if (tab === "upcoming") return !s.active && start > now;
    return end <= now || s.soldSlots >= s.totalSlots;
  });

  const totalRevenue = sales.filter(s=>s.soldSlots>0).reduce((sum,s) => sum + s.salePrice * s.soldSlots, 0);
  const totalOrders  = sales.reduce((sum, s) => sum + s.orders, 0);
  const COLORS_PICK  = ["#ef4444","#4f7cff","#16a34a","#8b5cf6","#f59e0b","#dc2626","#06b6d4"];

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Tạo Flash Sale mới</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Tour picker */}
              <Text style={s.fieldLabel}>Chọn Tour *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                {TOUR_OPTIONS.map(t => (
                  <TouchableOpacity key={t} style={[s.tourPill, form.tourName === t && s.tourPillActive]} onPress={() => setForm(p => ({ ...p, tourName: t }))}>
                    <Text style={[s.tourPillTxt, form.tourName === t && s.tourPillTxtActive]} numberOfLines={1}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {[
                { label: "Giá gốc (đ) *",    key: "originalPrice",  placeholder: "2990000", kb: "numeric" },
                { label: "Giảm giá (%) *",    key: "discountPercent",placeholder: "30",      kb: "numeric" },
                { label: "Số slot",           key: "totalSlots",     placeholder: "20",      kb: "numeric" },
                { label: "Bắt đầu",           key: "startTime",      placeholder: "2026-04-15T08:00:00", kb: "default" },
                { label: "Kết thúc",          key: "endTime",        placeholder: "2026-04-15T23:59:00", kb: "default" },
              ].map((field, i) => (
                <View key={i} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={(form as any)[field.key]}
                    onChangeText={v => setForm(p => ({ ...p, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor="#b0bdd8"
                    keyboardType={field.kb as any}
                  />
                </View>
              ))}
              {/* Preview */}
              {form.originalPrice && form.discountPercent && (
                <View style={s.previewBox}>
                  <Text style={s.previewLabel}>Preview giá:</Text>
                  <Text style={s.previewOrig}>{fmt(parseFloat(form.originalPrice.replace(/\D/g,"")) || 0)}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#7a8cc2" />
                  <Text style={s.previewSale}>{fmt(Math.round((parseFloat(form.originalPrice.replace(/\D/g,""))||0) * (1 - (parseFloat(form.discountPercent)||0) / 100)))}</Text>
                  <View style={s.discBadge}><Text style={s.discTxt}>-{form.discountPercent}%</Text></View>
                </View>
              )}
              {/* Color */}
              <Text style={s.fieldLabel}>Màu nhãn</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {COLORS_PICK.map(c => (
                  <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, form.color === c && s.colorDotActive]} onPress={() => setForm(p => ({ ...p, color: c }))}>
                    {form.color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.createBtn} onPress={createSale}>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={s.createBtnTxt}>Tạo Flash Sale</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Flash Sale & Deal Hot</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Đang chạy",  value: sales.filter(s => s.active).length, color: "#ef4444" },
          { label: "Tổng đơn",   value: totalOrders,                          color: "#2856d6" },
          { label: "Doanh thu",  value: fmtM(totalRevenue),                   color: "#16a34a" },
          { label: "Slot đã bán",value: sales.reduce((s,x)=>s+x.soldSlots,0), color: "#f59e0b" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        {[["active","Đang chạy"],["upcoming","Sắp tới"],["ended","Đã kết thúc"]].map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.tabBtn, tab === k && s.tabBtnActive]} onPress={() => setTab(k as any)}>
            <Text style={[s.tabBtnTxt, tab === k && s.tabBtnTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {filtered.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="flash-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có flash sale nào</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnTxt}>Tạo flash sale mới</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map(fs => {
          const pct = fs.totalSlots > 0 ? (fs.soldSlots / fs.totalSlots) * 100 : 0;
          return (
            <View key={fs.id} style={s.card}>
              {/* Color bar */}
              <View style={[s.colorBar, { backgroundColor: fs.color }]} />
              <View style={{ flex: 1, padding: 12 }}>
                {/* Header row */}
                <View style={s.cardHeader}>
                  <View style={[s.discountBadge, { backgroundColor: fs.color }]}>
                    <Ionicons name="flash" size={12} color="#fff" />
                    <Text style={s.discountBadgeTxt}>-{fs.discountPercent}%</Text>
                  </View>
                  <CountdownCell endTime={fs.endTime} active={fs.active} />
                  <View style={[s.activePill, { backgroundColor: fs.active ? "#dcfce7" : "#f1f5f9" }]}>
                    <Text style={[s.activePillTxt, { color: fs.active ? "#16a34a" : "#94a3b8" }]}>
                      {fs.active ? "Đang chạy" : "Tạm dừng"}
                    </Text>
                  </View>
                </View>
                <Text style={s.tourName} numberOfLines={1}>{fs.tourName}</Text>
                {/* Price */}
                <View style={s.priceRow}>
                  <Text style={s.origPrice}>{fmt(fs.originalPrice)}</Text>
                  <Ionicons name="arrow-forward" size={12} color="#7a8cc2" />
                  <Text style={[s.salePrice, { color: fs.color }]}>{fmt(fs.salePrice)}</Text>
                </View>
                {/* Slot progress */}
                <View style={s.slotRow}>
                  <Text style={s.slotTxt}>{fs.soldSlots}/{fs.totalSlots} slot</Text>
                  <Text style={s.slotPct}>{pct.toFixed(0)}%</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : fs.color }]} />
                </View>
                {/* Stats */}
                <View style={s.statsRow}>
                  <Ionicons name="eye-outline" size={12} color="#7a8cc2" />
                  <Text style={s.statTxt}>{fs.clicks} lượt xem</Text>
                  <Ionicons name="receipt-outline" size={12} color="#7a8cc2" />
                  <Text style={s.statTxt}>{fs.orders} đơn</Text>
                  <Text style={s.revTxt}>Thu: {fmtM(fs.salePrice * fs.soldSlots)}</Text>
                </View>
                {/* Action buttons */}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: fs.active ? "#fef9c3" : "#dcfce7" }]}
                    onPress={() => toggleActive(fs.id)}
                  >
                    <Ionicons name={fs.active ? "pause-outline" : "play-outline"} size={14} color={fs.active ? "#d97706" : "#16a34a"} />
                    <Text style={[s.actionTxt, { color: fs.active ? "#d97706" : "#16a34a" }]}>
                      {fs.active ? "Tạm dừng" : "Kích hoạt"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => deleteSale(fs)}>
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    <Text style={[s.actionTxt, { color: "#dc2626" }]}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <AdminTabBar role="admin" activeRoute="/admin-flash-sale" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  addBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  summaryRow:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:     { alignItems: "center", flex: 1 },
  summaryValue:    { fontSize: 16, fontWeight: "900" },
  summaryLabel:    { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  tabRow:          { flexDirection: "row", margin: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive:    { backgroundColor: "#ef4444" },
  tabBtnTxt:       { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  tabBtnTxtActive: { color: "#fff" },
  content:         { paddingHorizontal: 14, paddingTop: 0 },
  emptyCard:       { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:        { color: "#7a8cc2" },
  emptyBtn:        { backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  emptyBtnTxt:     { color: "#fff", fontWeight: "700" },
  card:            { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 10, overflow: "hidden" },
  colorBar:        { width: 6 },
  cardHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  discountBadge:   { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  discountBadgeTxt:{ color: "#fff", fontWeight: "800", fontSize: 12 },
  activePill:      { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  activePillTxt:   { fontSize: 10, fontWeight: "700" },
  tourName:        { color: "#1f2a58", fontWeight: "800", fontSize: 13, marginBottom: 5 },
  priceRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  origPrice:       { color: "#94a3b8", fontSize: 12, textDecorationLine: "line-through" },
  salePrice:       { fontSize: 15, fontWeight: "900" },
  slotRow:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  slotTxt:         { color: "#7a8cc2", fontSize: 11 },
  slotPct:         { color: "#1f2a58", fontWeight: "700", fontSize: 11 },
  progressBg:      { height: 6, backgroundColor: "#f0f4ff", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill:    { height: "100%", borderRadius: 3 },
  statsRow:        { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  statTxt:         { color: "#7a8cc2", fontSize: 11 },
  revTxt:          { color: "#16a34a", fontWeight: "700", fontSize: 11, marginLeft: "auto" },
  actionRow:       { flexDirection: "row", gap: 8 },
  actionBtn:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionTxt:       { fontSize: 12, fontWeight: "700" },
  // Modal
  modalOverlay:    { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  modalSheet:      { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%" },
  modalHandle:     { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:      { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  closeBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:       { padding: 20, paddingBottom: 36 },
  fieldGroup:      { marginBottom: 12 },
  fieldLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  fieldInput:      { backgroundColor: "#f3f7ff", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 12, paddingVertical: 11, color: "#1f2a58", fontSize: 14 },
  tourPill:        { borderRadius: 10, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, maxWidth: 180 },
  tourPillActive:  { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  tourPillTxt:     { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  tourPillTxtActive:{ color: "#fff" },
  previewBox:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f7ff", borderRadius: 10, padding: 10, marginBottom: 14 },
  previewLabel:    { color: "#7a8cc2", fontSize: 12 },
  previewOrig:     { color: "#94a3b8", textDecorationLine: "line-through", fontSize: 13 },
  previewSale:     { color: "#ef4444", fontWeight: "900", fontSize: 16 },
  discBadge:       { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt:         { color: "#ef4444", fontWeight: "800", fontSize: 11 },
  colorDot:        { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  colorDotActive:  { borderWidth: 2.5, borderColor: "#1f2a58" },
  createBtn:       { height: 50, borderRadius: 14, backgroundColor: "#ef4444", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  createBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 15 },
});