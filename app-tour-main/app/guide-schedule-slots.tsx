/**
 * app/guide-schedule-slots.tsx
 * Quản lý slot và giá theo từng ngày
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

type SlotStatus = "open" | "full" | "blocked" | "booked";

interface DaySlot {
  id: string; date: string; dayLabel: string;
  status: SlotStatus; maxSlots: number; bookedSlots: number;
  price: number; priceNote: string;
  tourName?: string;
}

const STATUS_META: Record<SlotStatus, { label: string; color: string; bg: string }> = {
  open:    { label: "Mở đặt",   color: "#16a34a", bg: "#dcfce7" },
  full:    { label: "Hết chỗ",  color: "#dc2626", bg: "#fee2e2" },
  blocked: { label: "Khóa",     color: "#94a3b8", bg: "#f1f5f9" },
  booked:  { label: "Đã đặt",  color: "#2856d6", bg: "#eaf0ff" },
};

function genNext30Days(): DaySlot[] {
  const days: DaySlot[] = [];
  const labels = ["CN","T2","T3","T4","T5","T6","T7"];
  const basePrice = 2800000;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const day   = String(d.getDate()).padStart(2,"0");
    const month = String(d.getMonth()+1).padStart(2,"0");
    const year  = d.getFullYear();
    const date  = `${day}/${month}/${year}`;
    const dow   = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const status: SlotStatus = i < 2 ? "booked" : i === 5 ? "blocked" : i === 8 ? "full" : "open";
    days.push({
      id: `slot${i}`,
      date,
      dayLabel: labels[dow],
      status,
      maxSlots: isWeekend ? 15 : 10,
      bookedSlots: status === "booked" ? (isWeekend ? 15 : 10) : status === "full" ? (isWeekend ? 15 : 10) : Math.floor(Math.random() * 4),
      price: isWeekend ? Math.round(basePrice * 1.2) : basePrice,
      priceNote: isWeekend ? "Cuối tuần +20%" : "Ngày thường",
      tourName: status === "booked" ? "Tour Đà Lạt 3N2Đ" : undefined,
    });
  }
  return days;
}

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export default function GuideScheduleSlots() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [slots, setSlots]       = useState<DaySlot[]>([]);
  const [selected, setSelected] = useState<DaySlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editMax, setEditMax]   = useState("");
  const [filter, setFilter]     = useState<"all" | SlotStatus>("all");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_slots").then(raw => {
      setSlots(raw ? JSON.parse(raw) : genNext30Days());
    }).catch(() => setSlots(genNext30Days()));
  }, []));

  const persist = async (data: DaySlot[]) => {
    setSlots(data);
    await AsyncStorage.setItem("@guide_slots", JSON.stringify(data)).catch(() => {});
  };

  const openEdit = (slot: DaySlot) => {
    setSelected(slot);
    setEditPrice(String(slot.price));
    setEditMax(String(slot.maxSlots));
    setShowModal(true);
  };

  const saveSlot = async () => {
    if (!selected) return;
    const price = parseInt(editPrice.replace(/\D/g,""));
    const max   = parseInt(editMax);
    if (isNaN(price) || price < 0) { Alert.alert("Lỗi", "Giá không hợp lệ"); return; }
    if (isNaN(max) || max < 1)     { Alert.alert("Lỗi", "Số slot không hợp lệ"); return; }
    await persist(slots.map(s => s.id === selected.id ? { ...s, price, maxSlots: max } : s));
    setShowModal(false);
    Alert.alert("✅ Đã lưu", `Cập nhật slot ${selected.date} thành công.`);
  };

  const toggleBlock = async (slot: DaySlot) => {
    if (slot.status === "booked") { Alert.alert("Không thể", "Ngày này đã có booking."); return; }
    const newStatus: SlotStatus = slot.status === "blocked" ? "open" : "blocked";
    await persist(slots.map(s => s.id === slot.id ? { ...s, status: newStatus } : s));
  };

  const bulkWeekend = async () => {
    Alert.alert("Cập nhật hàng loạt", "Tăng giá cuối tuần lên +20% cho tất cả ngày Thứ 7 & CN?", [
      { text: "Hủy", style: "cancel" },
      { text: "Áp dụng", onPress: async () => {
        const base = 2800000;
        await persist(slots.map(s => {
          const dow = ["CN","T2","T3","T4","T5","T6","T7"].indexOf(s.dayLabel);
          if (dow === 0 || dow === 6) return { ...s, price: Math.round(base * 1.2), priceNote: "Cuối tuần +20%" };
          return s;
        }));
        Alert.alert("✅ Đã cập nhật tất cả cuối tuần.");
      }},
    ]);
  };

  const filtered = slots.filter(s => filter === "all" || s.status === filter);
  const openCount    = slots.filter(s => s.status === "open").length;
  const bookedCount  = slots.filter(s => s.status === "booked" || s.status === "full").length;
  const blockedCount = slots.filter(s => s.status === "blocked").length;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowModal(false)} />
          {selected && (
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chỉnh sửa: {selected.date} ({selected.dayLabel})</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              <View style={s.modalBody}>
                <Text style={s.fieldLabel}>Giá tour (đ)</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  keyboardType="numeric"
                  placeholder="VD: 2800000"
                  placeholderTextColor="#b0bdd8"
                />
                <Text style={s.fieldLabel}>Số slot tối đa</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editMax}
                  onChangeText={setEditMax}
                  keyboardType="numeric"
                  placeholder="VD: 10"
                  placeholderTextColor="#b0bdd8"
                />
                <View style={s.modalInfo}>
                  <Ionicons name="information-circle-outline" size={14} color="#7a8cc2" />
                  <Text style={s.modalInfoTxt}>Đã đặt: {selected.bookedSlots} / {selected.maxSlots} slot</Text>
                </View>
                <TouchableOpacity style={s.saveBtn} onPress={saveSlot}>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={s.saveBtnTxt}>Lưu thay đổi</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Slots & Giá</Text>
        <TouchableOpacity style={s.bulkBtn} onPress={bulkWeekend}>
          <Ionicons name="flash-outline" size={16} color="#f59e0b" />
          <Text style={s.bulkBtnTxt}>Hàng loạt</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Mở đặt",   value: openCount,    color: "#16a34a" },
          { label: "Đã đặt",  value: bookedCount,  color: "#2856d6" },
          { label: "Khóa",     value: blockedCount, color: "#94a3b8" },
          { label: "30 ngày",  value: slots.length, color: "#1f2a58" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {[["all","Tất cả"],["open","Mở đặt"],["booked","Đã đặt"],["full","Hết chỗ"],["blocked","Khóa"]].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.filterChip, filter === k && s.filterActive]} onPress={() => setFilter(k as any)}>
            <Text style={[s.filterTxt, filter === k && s.filterTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {filtered.map(slot => {
          const meta = STATUS_META[slot.status];
          const pct  = slot.maxSlots > 0 ? (slot.bookedSlots / slot.maxSlots) * 100 : 0;
          return (
            <View key={slot.id} style={s.card}>
              <View style={s.cardLeft}>
                <Text style={s.cardDay}>{slot.dayLabel}</Text>
                <Text style={s.cardDate}>{slot.date.slice(0,5)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardTopRow}>
                  <Text style={[s.price, { color: "#10b981" }]}>{fmt(slot.price)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={s.priceNote}>{slot.priceNote}</Text>
                {slot.tourName && <Text style={s.tourName}>📌 {slot.tourName}</Text>}
                <View style={s.slotRow}>
                  <Text style={s.slotTxt}>{slot.bookedSlots}/{slot.maxSlots} slot</Text>
                  <Text style={s.slotPct}>{pct.toFixed(0)}%</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? "#dc2626" : "#10b981" }]} />
                </View>
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(slot)}>
                  <Ionicons name="pencil-outline" size={15} color="#4f7cff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.lockBtn, { backgroundColor: slot.status === "blocked" ? "#dcfce7" : "#f1f5f9" }]}
                  onPress={() => toggleBlock(slot)}
                >
                  <Ionicons name={slot.status === "blocked" ? "lock-open-outline" : "lock-closed-outline"} size={15} color={slot.status === "blocked" ? "#16a34a" : "#94a3b8"} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <AdminTabBar role="guide" activeRoute="/guide-schedule-slots" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  bulkBtn:         { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  bulkBtnTxt:      { color: "#d97706", fontWeight: "700", fontSize: 12 },
  summaryRow:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:     { alignItems: "center", flex: 1 },
  summaryValue:    { fontSize: 18, fontWeight: "900" },
  summaryLabel:    { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  filterRow:       { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:      { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:    { backgroundColor: "#10b981", borderColor: "#10b981" },
  filterTxt:       { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  content:         { padding: 14, paddingTop: 0 },
  card:            { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  cardLeft:        { width: 44, alignItems: "center" },
  cardDay:         { color: "#1f2a58", fontWeight: "800", fontSize: 13 },
  cardDate:        { color: "#7a8cc2", fontSize: 11 },
  cardTopRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  price:           { fontSize: 15, fontWeight: "900" },
  statusBadge:     { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:       { fontSize: 10, fontWeight: "700" },
  priceNote:       { color: "#94a3b8", fontSize: 10, marginBottom: 3 },
  tourName:        { color: "#2856d6", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  slotRow:         { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  slotTxt:         { color: "#7a8cc2", fontSize: 11 },
  slotPct:         { color: "#1f2a58", fontWeight: "700", fontSize: 11 },
  progressBg:      { height: 5, backgroundColor: "#f0f4ff", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: "100%", borderRadius: 3 },
  cardActions:     { gap: 6 },
  editBtn:         { width: 32, height: 32, borderRadius: 9, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  lockBtn:         { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  modalOverlay:    { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  modalSheet:      { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHandle:     { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:      { fontSize: 15, fontWeight: "800", color: "#1f2a58", flex: 1 },
  closeBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:       { padding: 20, paddingBottom: 36 },
  fieldLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 13, marginBottom: 6, marginTop: 12 },
  fieldInput:      { backgroundColor: "#f3f7ff", borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 11, color: "#1f2a58", fontSize: 15, fontWeight: "700" },
  modalInfo:       { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 8 },
  modalInfoTxt:    { color: "#7a8cc2", fontSize: 12 },
  saveBtn:         { height: 50, borderRadius: 14, backgroundColor: "#10b981", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
  saveBtnTxt:      { color: "#fff", fontWeight: "700", fontSize: 15 },
});