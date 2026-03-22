/**
 * app/staff-voucher-send.tsx
 * Staff gửi voucher bồi thường cho khách — Phiên bản nâng cấp
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

interface VoucherRecord {
  id: string; code: string; value: number; type: "fixed" | "percent";
  guestId: string; guestName: string; guestPhone?: string;
  reason: string; category: string;
  createdAt: string; used: boolean; expiresAt: string;
  staffName: string;
}

const VOUCHER_TEMPLATES = [
  { label: "Bồi thường 50k",    sublabel: "Sự cố nhỏ",         value: 50000,  type: "fixed"   as const, reason: "Xin lỗi vì sự cố nhỏ", category: "Bồi thường", icon: "ribbon-outline",   color: "#94a3b8" },
  { label: "Bồi thường 100k",   sublabel: "HDV trễ / thiếu SV", value: 100000, type: "fixed"   as const, reason: "Bồi thường HDV đến trễ hoặc thiếu dịch vụ", category: "Bồi thường", icon: "gift-outline", color: "#f59e0b" },
  { label: "Bồi thường 200k",   sublabel: "Dịch vụ không đúng", value: 200000, type: "fixed"   as const, reason: "Dịch vụ không đúng mô tả so với hợp đồng", category: "Bồi thường", icon: "gift-outline", color: "#d97706" },
  { label: "Bồi thường 500k",   sublabel: "Sự cố nghiêm trọng", value: 500000, type: "fixed"   as const, reason: "Bồi thường sự cố nghiêm trọng gây thiệt hại", category: "Bồi thường", icon: "medal-outline", color: "#dc2626" },
  { label: "Giảm 10% tour sau", sublabel: "Khách VIP / cảm ơn", value: 10,    type: "percent" as const, reason: "Cảm ơn sự thông cảm và tin dùng dịch vụ", category: "Khách hàng thân thiết", icon: "star-outline", color: "#2856d6" },
  { label: "Giảm 20% tour sau", sublabel: "Bồi thường lớn",     value: 20,    type: "percent" as const, reason: "Bồi thường sự cố lớn — ưu đãi đặc biệt", category: "Bồi thường lớn", icon: "trophy-outline", color: "#7c3aed" },
];

const PRESET_REASONS = [
  "HDV đến trễ so với lịch hẹn",
  "Dịch vụ không đúng mô tả hợp đồng",
  "Xe đón sai loại so với đặt",
  "Phòng khách sạn sai tiêu chuẩn",
  "Thiếu bữa ăn / dịch vụ đã cam kết",
  "Tour bị hủy đột ngột",
  "Bồi thường thiện chí cho khách VIP",
];

const genCode = () => `CSKH${Math.floor(Math.random() * 900000 + 100000)}`;
const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const addDays = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toLocaleDateString("vi-VN");
};

export default function StaffVoucherSend() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vouchers, setVouchers]         = useState<VoucherRecord[]>([]);
  const [guestName, setGuestName]       = useState("");
  const [guestPhone, setGuestPhone]     = useState("");
  const [reason, setReason]             = useState("");
  const [selected, setSelected]         = useState<typeof VOUCHER_TEMPLATES[0] | null>(null);
  const [tab, setTab]                   = useState<"send" | "history">("send");
  const [showPresetReasons, setShowPresetReasons] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_vouchers").then(raw => {
      setVouchers(raw ? JSON.parse(raw) : []);
    }).catch(() => {});
  }, []));

  const handleSend = async () => {
    if (!guestName.trim()) { Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khách hàng"); return; }
    if (!selected)          { Alert.alert("Thiếu thông tin", "Vui lòng chọn loại voucher"); return; }

    const code = genCode();
    const expiresAt = addDays(30);
    const voucher: VoucherRecord = {
      id: `v${Date.now()}`, code,
      value: selected.value, type: selected.type,
      guestId: `guest-${Date.now()}`,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      reason: reason.trim() || selected.reason,
      category: selected.category,
      createdAt: new Date().toISOString(),
      used: false, expiresAt,
      staffName: "Lê Thị CSKH",
    };

    const updated = [voucher, ...vouchers];
    setVouchers(updated);
    await AsyncStorage.setItem("@staff_vouchers", JSON.stringify(updated)).catch(() => {});

    // Save promo code for guest use
    const pRaw = await AsyncStorage.getItem("@promo_codes").catch(() => null);
    const pList = pRaw ? JSON.parse(pRaw) : [];
    pList.unshift({ id: voucher.id, code, type: selected.type, value: selected.value, guestName: guestName.trim(), active: true, createdAt: voucher.createdAt, expiresAt });
    await AsyncStorage.setItem("@promo_codes", JSON.stringify(pList)).catch(() => {});

    // Guest notification
    const nRaw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const nList = nRaw ? JSON.parse(nRaw) : [];
    nList.unshift({
      id: `n${Date.now()}`,
      message: `🎁 CSKH gửi voucher ${selected.type === "fixed" ? fmt(selected.value) : `${selected.value}%`} cho bạn! Mã: ${code}. HSD: ${expiresAt}. Lý do: ${voucher.reason}`,
      read: false, createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(nList)).catch(() => {});

    Alert.alert(
      "✅ Đã gửi voucher thành công",
      `Mã voucher: ${code}\nGửi đến: ${guestName}${guestPhone ? ` · ${guestPhone}` : ""}\nGiá trị: ${selected.type === "fixed" ? fmt(selected.value) : `${selected.value}%`}\nHSD: ${expiresAt}`
    );
    setGuestName(""); setGuestPhone(""); setReason(""); setSelected(null);
  };

  const usedCount     = vouchers.filter(v => v.used).length;
  const unusedCount   = vouchers.filter(v => !v.used).length;
  const totalValue    = vouchers.filter(v => v.type === "fixed").reduce((a, v) => a + v.value, 0);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Gửi Voucher</Text>
          <Text style={s.headerSub}>{vouchers.length} đã gửi · {unusedCount} chưa dùng</Text>
        </View>
      </View>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <View style={s.segmentRow}>
        <TouchableOpacity style={[s.segment, tab === "send" && s.segmentActive]} onPress={() => setTab("send")}>
          <Ionicons name="paper-plane-outline" size={15} color={tab === "send" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.segmentTxt, tab === "send" && s.segmentTxtActive]}>Gửi voucher mới</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.segment, tab === "history" && s.segmentActive]} onPress={() => setTab("history")}>
          <Ionicons name="time-outline" size={15} color={tab === "history" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.segmentTxt, tab === "history" && s.segmentTxtActive]}>Lịch sử ({vouchers.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 96 }]} showsVerticalScrollIndicator={false}>
        {tab === "send" ? (
          <>
            {/* Guest Info */}
            <Text style={s.sectionTitle}>Thông tin khách hàng</Text>
            <View style={s.formCard}>
              <View style={s.inputRow}>
                <View style={s.inputIcon}><Ionicons name="person-outline" size={16} color="#f59e0b" /></View>
                <TextInput
                  style={s.input} placeholder="Tên khách hàng *"
                  value={guestName} onChangeText={setGuestName}
                  placeholderTextColor="#b0bdd8"
                />
              </View>
              <View style={s.inputDivider} />
              <View style={s.inputRow}>
                <View style={s.inputIcon}><Ionicons name="call-outline" size={16} color="#f59e0b" /></View>
                <TextInput
                  style={s.input} placeholder="Số điện thoại (tùy chọn)"
                  value={guestPhone} onChangeText={setGuestPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#b0bdd8"
                />
              </View>
              <View style={s.inputDivider} />
              <View style={[s.inputRow, { alignItems: "flex-start", paddingTop: 14 }]}>
                <View style={[s.inputIcon, { marginTop: 2 }]}><Ionicons name="chatbox-outline" size={16} color="#f59e0b" /></View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[s.input, { minHeight: 50 }]}
                    placeholder="Lý do gửi voucher"
                    value={reason} onChangeText={setReason}
                    multiline
                    placeholderTextColor="#b0bdd8"
                  />
                  <TouchableOpacity style={s.presetBtn} onPress={() => setShowPresetReasons(v => !v)}>
                    <Ionicons name={showPresetReasons ? "chevron-up" : "chevron-down"} size={13} color="#2856d6" />
                    <Text style={s.presetBtnTxt}>Lý do mẫu</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showPresetReasons && (
                <View style={s.presetList}>
                  {PRESET_REASONS.map((pr, i) => (
                    <TouchableOpacity key={i} style={s.presetItem} onPress={() => { setReason(pr); setShowPresetReasons(false); }}>
                      <Ionicons name="arrow-forward-outline" size={12} color="#2856d6" />
                      <Text style={s.presetItemTxt}>{pr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Voucher Templates */}
            <Text style={s.sectionTitle}>Chọn loại voucher</Text>
            {VOUCHER_TEMPLATES.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={[s.templateCard, selected?.label === t.label && s.templateCardActive]}
                onPress={() => setSelected(t)}
                activeOpacity={0.8}
              >
                <View style={[s.templateIcon, { backgroundColor: t.color + "18" }, selected?.label === t.label && { backgroundColor: t.color }]}>
                  <Ionicons name={t.icon as any} size={20} color={selected?.label === t.label ? "#fff" : t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.templateLabel, selected?.label === t.label && { color: t.color }]}>{t.label}</Text>
                  <Text style={s.templateSublabel}>{t.sublabel}</Text>
                  <Text style={s.templateReason} numberOfLines={1}>{t.reason}</Text>
                </View>
                <View style={[s.templateValue, { backgroundColor: t.color + "15" }]}>
                  <Text style={[s.templateValueTxt, { color: t.color }]}>
                    {t.type === "fixed" ? fmt(t.value) : `${t.value}%`}
                  </Text>
                </View>
                {selected?.label === t.label && (
                  <Ionicons name="checkmark-circle" size={22} color={t.color} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}

            {/* Preview */}
            {selected && guestName.trim() && (
              <View style={s.previewCard}>
                <View style={s.previewHeader}>
                  <Ionicons name="ticket-outline" size={18} color="#f59e0b" />
                  <Text style={s.previewTitle}>Xem trước voucher</Text>
                </View>
                <View style={s.previewBody}>
                  <View style={s.previewRow}>
                    <Text style={s.previewLabel}>Khách hàng</Text>
                    <Text style={s.previewValue}>{guestName}</Text>
                  </View>
                  <View style={s.previewRow}>
                    <Text style={s.previewLabel}>Loại voucher</Text>
                    <Text style={s.previewValue}>{selected.label}</Text>
                  </View>
                  <View style={s.previewRow}>
                    <Text style={s.previewLabel}>Giá trị</Text>
                    <Text style={[s.previewValue, { color: "#f59e0b", fontWeight: "800" }]}>
                      {selected.type === "fixed" ? fmt(selected.value) : `${selected.value}% giảm`}
                    </Text>
                  </View>
                  <View style={s.previewRow}>
                    <Text style={s.previewLabel}>HSD</Text>
                    <Text style={s.previewValue}>30 ngày kể từ hôm nay</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Send Button */}
            <TouchableOpacity
              style={[s.sendBtn, (!guestName.trim() || !selected) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!guestName.trim() || !selected}
            >
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={s.sendBtnTxt}>Gửi voucher ngay</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* History Stats */}
            {vouchers.length > 0 && (
              <View style={s.historyStatsRow}>
                <View style={[s.historyStat, { backgroundColor: "#fef9c3", borderColor: "#fde68a" }]}>
                  <Text style={[s.historyStatValue, { color: "#d97706" }]}>{unusedCount}</Text>
                  <Text style={s.historyStatLabel}>Chưa dùng</Text>
                </View>
                <View style={[s.historyStat, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
                  <Text style={[s.historyStatValue, { color: "#16a34a" }]}>{usedCount}</Text>
                  <Text style={s.historyStatLabel}>Đã dùng</Text>
                </View>
                <View style={[s.historyStat, { flex: 1.5, backgroundColor: "#eaf0ff", borderColor: "#bfcfff" }]}>
                  <Text style={[s.historyStatValue, { color: "#2856d6", fontSize: 13 }]}>{totalValue > 0 ? fmt(totalValue) : "—"}</Text>
                  <Text style={s.historyStatLabel}>Tổng giá trị cố định</Text>
                </View>
              </View>
            )}

            {vouchers.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="ticket-outline" size={48} color="#c0cbe8" />
                <Text style={s.emptyTxt}>Chưa gửi voucher nào</Text>
              </View>
            ) : (
              vouchers.map(v => (
                <View key={v.id} style={s.historyCard}>
                  <View style={s.historyHeader}>
                    <View style={s.codeWrap}>
                      <Ionicons name="ticket" size={14} color="#f59e0b" />
                      <Text style={s.voucherCode}>{v.code}</Text>
                    </View>
                    <View style={[s.usedBadge, { backgroundColor: v.used ? "#dcfce7" : "#fef9c3" }]}>
                      <Text style={[s.usedTxt, { color: v.used ? "#16a34a" : "#d97706" }]}>
                        {v.used ? "Đã dùng" : "Chưa dùng"}
                      </Text>
                    </View>
                  </View>

                  <View style={s.historyInfoRow}>
                    <View style={s.historyInfoItem}>
                      <Ionicons name="person-outline" size={12} color="#7a8cc2" />
                      <Text style={s.historyInfoTxt}>{v.guestName}</Text>
                    </View>
                    {v.guestPhone && (
                      <View style={s.historyInfoItem}>
                        <Ionicons name="call-outline" size={12} color="#7a8cc2" />
                        <Text style={s.historyInfoTxt}>{v.guestPhone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.historyValueRow}>
                    <View style={[s.historyValueBadge, { backgroundColor: "#fef3c7" }]}>
                      <Text style={[s.historyValueTxt, { color: "#d97706" }]}>
                        {v.type === "fixed" ? fmt(v.value) : `${v.value}% giảm`}
                      </Text>
                    </View>
                    <View style={[s.historyValueBadge, { backgroundColor: "#eaf0ff" }]}>
                      <Text style={[s.historyValueTxt, { color: "#2856d6" }]}>{v.category}</Text>
                    </View>
                    <Text style={s.historyExpiry}>HSD: {v.expiresAt}</Text>
                  </View>

                  <Text style={s.historyReason} numberOfLines={2}>{v.reason}</Text>
                  <Text style={s.historyMeta}>Gửi bởi: {v.staffName} · {new Date(v.createdAt).toLocaleDateString("vi-VN")}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
      <StaffTabBar activeRoute="/staff-voucher-send" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:             { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:        { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub:          { fontSize: 11, color: "#7a8cc2", marginTop: 2, fontWeight: "500" },
  segmentRow:         { flexDirection: "row", marginHorizontal: 16, marginVertical: 12, backgroundColor: "#fff", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  segment:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 12, gap: 6 },
  segmentActive:      { backgroundColor: "#f59e0b" },
  segmentTxt:         { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  segmentTxtActive:   { color: "#fff" },
  content:            { paddingHorizontal: 16 },
  sectionTitle:       { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10, marginTop: 6 },

  // Form
  formCard:           { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 18, overflow: "hidden" },
  inputRow:           { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 13 },
  inputIcon:          { width: 30, height: 30, borderRadius: 9, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" },
  input:              { flex: 1, color: "#1f2a58", fontSize: 14, fontWeight: "500" },
  inputDivider:       { height: 1, backgroundColor: "#f0f4ff", marginHorizontal: 16 },
  presetBtn:          { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 6 },
  presetBtnTxt:       { color: "#2856d6", fontSize: 11, fontWeight: "700" },
  presetList:         { backgroundColor: "#f8faff", borderTopWidth: 1, borderTopColor: "#e4ebff", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  presetItem:         { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  presetItemTxt:      { color: "#2856d6", fontSize: 12, fontWeight: "600", flex: 1 },

  // Templates
  templateCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 8 },
  templateCardActive: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
  templateIcon:       { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  templateLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 14 },
  templateSublabel:   { color: "#7a8cc2", fontSize: 11, marginTop: 2, fontWeight: "500" },
  templateReason:     { color: "#94a3b8", fontSize: 10, marginTop: 3, lineHeight: 14 },
  templateValue:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center", flexShrink: 0 },
  templateValueTxt:   { fontSize: 13, fontWeight: "800" },

  // Preview
  previewCard:        { backgroundColor: "#fffbeb", borderRadius: 16, borderWidth: 1, borderColor: "#fde68a", padding: 14, marginTop: 8, marginBottom: 16 },
  previewHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  previewTitle:       { color: "#1f2a58", fontWeight: "700", fontSize: 14 },
  previewBody:        { gap: 8 },
  previewRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel:       { color: "#7a8cc2", fontSize: 12, fontWeight: "500" },
  previewValue:       { color: "#1f2a58", fontSize: 13, fontWeight: "700" },

  // Send Button
  sendBtn:            { height: 54, borderRadius: 16, backgroundColor: "#f59e0b", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 16, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  sendBtnTxt:         { color: "#fff", fontWeight: "800", fontSize: 15 },

  // History
  historyStatsRow:    { flexDirection: "row", gap: 8, marginBottom: 14 },
  historyStat:        { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center" },
  historyStatValue:   { fontWeight: "900", fontSize: 18, letterSpacing: -0.5 },
  historyStatLabel:   { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2, textAlign: "center" },
  emptyCard:          { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 40, alignItems: "center", gap: 10 },
  emptyTxt:           { color: "#7a8cc2", fontWeight: "600" },
  historyCard:        { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 8 },
  historyHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  codeWrap:           { flexDirection: "row", alignItems: "center", gap: 6 },
  voucherCode:        { color: "#f59e0b", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  usedBadge:          { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  usedTxt:            { fontSize: 11, fontWeight: "700" },
  historyInfoRow:     { flexDirection: "row", gap: 14, marginBottom: 8 },
  historyInfoItem:    { flexDirection: "row", alignItems: "center", gap: 4 },
  historyInfoTxt:     { color: "#7a8cc2", fontSize: 12, fontWeight: "500" },
  historyValueRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  historyValueBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyValueTxt:    { fontSize: 12, fontWeight: "700" },
  historyExpiry:      { color: "#94a3b8", fontSize: 11, fontWeight: "500" },
  historyReason:      { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  historyMeta:        { color: "#94a3b8", fontSize: 10, fontWeight: "500" },
});