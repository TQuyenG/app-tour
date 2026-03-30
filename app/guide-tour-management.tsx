/**
 * app/guide-tour-management.tsx
 * Quản lý Tour của HDV — giao diện đồng bộ với Admin, có chip chọn loại tour trong form
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
  FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@app_tours";
const PROFILE_KEY = "@guide_profile";

// Đồng bộ với admin
const CATEGORIES_FILTER = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];
const CATEGORIES_FORM   = ["Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];

const CATEGORY_COLORS: Record<string, string> = {
  "Biển đảo":  "#0ea5e9",
  "Núi rừng":  "#10b981",
  "Văn hóa":   "#8b5cf6",
  "Nghỉ dưỡng":"#f59e0b",
  "Phiêu lưu": "#ef4444",
  "Gia đình":  "#ec4899",
};

const ALL_TAGS = [
  "Săn mây", "Chụp ảnh", "Ẩm thực", "Biển", "Nghỉ dưỡng",
  "Hoàng hôn", "Lặn biển", "Gia đình", "Relax", "Ruộng bậc thang",
  "Văn hóa", "Trekking nhẹ", "Di sản", "Đêm phố cổ", "Lịch sử",
  "Di tích", "Resort", "Cuối tuần", "Phượt", "Cảnh núi", "Roadtrip",
  "Sông nước", "Check-in", "Ảnh đẹp", "Vui chơi", "Mát mẻ",
];

interface AppliedGuide  { id: string; name: string; note: string; vneidVerified?: boolean; }
interface RejectedGuide { id: string; name: string; reason: string; }

interface GuideTour {
  id: string; name: string; category: string; duration: string;
  departure: string; price: string; priceRaw: number;
  status: string; description: string; image?: string;
  tags?: string[]; color?: string;
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[];
  rejectedGuides?: RejectedGuide[];
  proposedByGuideId?: string;
  proposedByGuideName?: string;
  rejectionReason?: string;
  resubmitNote?: string;
}

const docTien = (n: number) => {
  if (!n) return "0 đồng";
  let r = ""; let t = n;
  if (t >= 1000000000) { r += Math.floor(t / 1000000000) + " tỷ "; t %= 1000000000; }
  if (t >= 1000000)    { r += Math.floor(t / 1000000)    + " triệu "; t %= 1000000; }
  if (t >= 1000)       { r += Math.floor(t / 1000)       + " nghìn "; t %= 1000; }
  if (t > 0)             r += t + " ";
  return r.trim() + " đồng";
};

export default function GuideTourManagementScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [tours,          setTours]          = useState<GuideTour[]>([]);
  const [profile,        setProfile]        = useState<any>({});
  const [activeTab,      setActiveTab]      = useState<"assigned" | "market" | "proposed">("assigned");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery,    setSearchQuery]    = useState("");

  // Form đề xuất / chỉnh sửa tour
  const [proposeModal,  setProposeModal]  = useState(false);
  const [proposeForm,   setProposeForm]   = useState<Partial<GuideTour>>({});
  const [priceInput,    setPriceInput]    = useState("");

  // Popup kết quả
  const [popup, setPopup] = useState<{
    visible: boolean; type: "success" | "error"; title: string; message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  const showPopup = (type: "success" | "error", title: string, message: string) =>
    setPopup({ visible: true, type, title, message });

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const pRaw = await AsyncStorage.getItem(PROFILE_KEY);
      if (pRaw) setProfile(JSON.parse(pRaw));
      const tRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (tRaw) setTours(JSON.parse(tRaw));
    } catch (e) {}
  };

  const saveTours = async (data: GuideTour[]) => {
    setTours(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const notifyAdmin = async (title: string, message: string) => {
    try {
      const raw = await AsyncStorage.getItem("@admin_notifications");
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({ id: `an-${Date.now()}`, type: "tour_proposal", title, message, createdAt: new Date().toISOString(), read: false });
      await AsyncStorage.setItem("@admin_notifications", JSON.stringify(list));
    } catch {}
  };

  // ─── Filters ──────────────────────────────────────────────────────────────
  const assignedTours = useMemo(() =>
    tours.filter(t => t.status === "active" && t.assignedGuideNames?.includes(profile.name)),
  [tours, profile.name]);

  const marketTours = useMemo(() =>
    tours.filter(t => {
      if (t.status !== "active") return false;
      if (t.assignedGuideNames?.includes(profile.name)) return false;
      if (t.rejectedGuides?.some(g => g.id === profile.guideId)) return false;
      if (activeCategory !== "Tất cả" && t.category !== activeCategory) return false;
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }),
  [tours, profile, activeCategory, searchQuery]);

  const proposedTours = useMemo(() =>
    tours.filter(t => t.proposedByGuideId === profile.guideId),
  [tours, profile.guideId]);

  // ─── Open form ────────────────────────────────────────────────────────────
  const openProposeModal = (tour?: GuideTour) => {
    if (tour) {
      setProposeForm({ ...tour, resubmitNote: "" });
      setPriceInput((tour.priceRaw || 0).toLocaleString("vi-VN"));
    } else {
      setProposeForm({
        id: `T${Date.now()}`, name: "", category: "Văn hóa", duration: "1 ngày",
        price: "", priceRaw: 0, departure: "", status: "pending_approval",
        description: "", image: "",
        assignedGuideNames: [profile.name], appliedGuides: [],
        proposedByGuideId: profile.guideId, proposedByGuideName: profile.name,
      });
      setPriceInput("");
    }
    setProposeModal(true);
  };

  const handlePriceChange = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) { setPriceInput(""); setProposeForm(p => ({ ...p, priceRaw: 0, price: "0đ" })); return; }
    const fmt = parseInt(num, 10).toLocaleString("vi-VN");
    setPriceInput(fmt);
    setProposeForm(p => ({ ...p, priceRaw: parseInt(num, 10), price: `${fmt}đ` }));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const submitProposal = async () => {
    if (!proposeForm.name?.trim()) return showPopup("error", "Thiếu thông tin", "Vui lòng nhập Tên Tour.");
    if (!proposeForm.priceRaw)     return showPopup("error", "Thiếu thông tin", "Vui lòng nhập Giá vé.");
    if (!proposeForm.departure?.trim()) return showPopup("error", "Thiếu thông tin", "Vui lòng nhập Nơi khởi hành.");

    const isResubmit = proposeForm.status === "rejected";
    const finalForm: GuideTour = {
      ...(proposeForm as GuideTour),
      status: "pending_approval",
      color: CATEGORY_COLORS[proposeForm.category || ""] || "#4f7cff",
    };

    let updated = [...tours];
    const idx = updated.findIndex(t => t.id === finalForm.id);
    if (idx > -1) updated[idx] = finalForm;
    else updated.unshift(finalForm);

    await saveTours(updated);
    await notifyAdmin(
      isResubmit ? "Đề xuất lại Tour" : "Đề xuất Tour mới",
      `HDV ${profile.name} vừa ${isResubmit ? "chỉnh sửa và đề xuất lại" : "đề xuất"} tour "${finalForm.name}".`
    );
    setProposeModal(false);
    showPopup("success", isResubmit ? "Đã gửi lại" : "Đã gửi đề xuất",
      isResubmit ? "Đề xuất đã được gửi lại cho Admin." : "Đề xuất mới đã gửi. Chờ Admin phê duyệt.");
  };

  // ─── Market actions ───────────────────────────────────────────────────────
  const handleApply = async (tourId: string) => {
    const updated = tours.map(t => {
      if (t.id !== tourId) return t;
      const already = t.appliedGuides?.some(g => g.id === profile.guideId);
      if (already) return t;
      return { ...t, appliedGuides: [...(t.appliedGuides || []), { id: profile.guideId, name: profile.name, note: "Sẵn sàng nhận tour", vneidVerified: profile.vneidVerified }] };
    });
    await saveTours(updated);
    showPopup("success", "Đã gửi yêu cầu", "Yêu cầu dẫn tour đã được gửi đến Admin.");
  };

  const handleCancelApply = async (tourId: string) => {
    const updated = tours.map(t =>
      t.id === tourId ? { ...t, appliedGuides: (t.appliedGuides || []).filter(g => g.id !== profile.guideId) } : t
    );
    await saveTours(updated);
  };

  // ─── Status helper ────────────────────────────────────────────────────────
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending_approval": return { label: "Chờ duyệt",  color: "#d97706", bg: "#fef3c7", border: "#fde68a" };
      case "rejected":         return { label: "Từ chối",    color: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
      case "active":           return { label: "Đã duyệt",   color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" };
      default:                 return { label: "Bản nháp",   color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
    }
  };

  // ─── Tab counts ───────────────────────────────────────────────────────────
  const pendingProposals = proposedTours.filter(t => t.status === "pending_approval").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── POPUP ── */}
      <Modal visible={popup.visible} transparent animationType="fade">
        <View style={st.popupOverlay}>
          <View style={st.popupBox}>
            <View style={[st.popupIconWrap, { backgroundColor: popup.type === "success" ? "#d1fae5" : "#fee2e2" }]}>
              <Ionicons name={popup.type === "success" ? "checkmark-circle" : "warning"} size={30}
                color={popup.type === "success" ? "#10b981" : "#ef4444"} />
            </View>
            <Text style={st.popupTitle}>{popup.title}</Text>
            <Text style={st.popupMsg}>{popup.message}</Text>
            <TouchableOpacity style={st.popupBtn} onPress={() => setPopup(p => ({ ...p, visible: false }))}>
              <Text style={st.popupBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── HEADER ── */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.replace("/guide-home" as any)}>
          <Ionicons name="chevron-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>Quản lý Tour</Text>
          <Text style={st.headerSub}>{assignedTours.length} tour đang dẫn</Text>
        </View>
        {/* Nút đề xuất nhanh */}
        <TouchableOpacity style={st.addBtn} onPress={() => { setActiveTab("proposed"); openProposeModal(); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── TABS ── */}
      <View style={st.tabBar}>
        {(["assigned","market","proposed"] as const).map(tab => {
          const labels: Record<string, string> = { assigned: "Của tôi", market: "Chợ Tour", proposed: "Đề xuất" };
          const counts: Record<string, number> = { assigned: assignedTours.length, market: marketTours.length, proposed: proposedTours.length };
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[st.tabBtn, isActive && st.tabBtnActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[st.tabTxt, isActive && st.tabTxtActive]}>{labels[tab]}</Text>
              <View style={[st.tabCount, isActive && st.tabCountActive]}>
                <Text style={[st.tabCountTxt, isActive && st.tabCountTxtActive]}>{counts[tab]}</Text>
              </View>
              {tab === "proposed" && pendingProposals > 0 && (
                <View style={st.tabDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── SEARCH + FILTER (market tab) ── */}
      {activeTab === "market" && (
        <>
          <View style={st.searchRow}>
            <View style={st.searchBox}>
              <Ionicons name="search" size={16} color="#94a8d8" />
              <TextInput style={st.searchInput} placeholder="Tìm tour..." placeholderTextColor="#94a8d8"
                value={searchQuery} onChangeText={setSearchQuery} />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterScroll} style={{ flexGrow: 0, height: 48 }}>
            {CATEGORIES_FILTER.map(c => (
              <TouchableOpacity key={c}
                style={[st.filterChip, activeCategory === c && st.filterChipActive]}
                onPress={() => setActiveCategory(c)}>
                <Text style={[st.filterTxt, activeCategory === c && st.filterTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* ══════════════════════ LIST CONTENT ══════════════════════ */}
      <FlatList
        data={
          activeTab === "assigned" ? assignedTours :
          activeTab === "market"   ? marketTours   :
          proposedTours
        }
        keyExtractor={item => item.id}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          activeTab === "proposed" ? (
            <TouchableOpacity style={st.addNewBtn} onPress={() => openProposeModal()}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={st.addNewBtnTxt}>Đề xuất Tour mới</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={st.emptyBox}>
            <Ionicons name={
              activeTab === "assigned"  ? "map-outline" :
              activeTab === "market"    ? "search-outline" :
              "document-text-outline"} size={64} color="#cbd5e1" />
            <Text style={st.emptyTxt}>
              {activeTab === "assigned"  ? "Bạn chưa được phân bổ tour nào." :
               activeTab === "market"    ? "Không có tour nào đang tuyển HDV." :
               "Bạn chưa có đề xuất tour nào."}
            </Text>
          </View>
        }
        renderItem={({ item: t }) => {
          const catColor = CATEGORY_COLORS[t.category] || "#4f7cff";

          // ── TAB: Của tôi ──
          if (activeTab === "assigned") return (
            <View style={st.tourCard}>
              <View style={st.cardHeader}>
                <View style={st.catBadge}>
                  <View style={[st.catDot, { backgroundColor: catColor }]} />
                  <Text style={st.catTxt}>{t.category}</Text>
                </View>
                <View style={[st.statusBadge, { backgroundColor: "#d1fae5" }]}>
                  <Text style={[st.statusTxt, { color: "#059669" }]}>ĐANG DẪN</Text>
                </View>
              </View>
              <Text style={st.tourName} numberOfLines={2}>{t.name}</Text>
              <View style={st.metaGrid}>
                <View style={st.metaItem}><Ionicons name="location-outline" size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.departure}</Text></View>
                <View style={st.metaItem}><Ionicons name="time-outline"     size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.duration}</Text></View>
                <View style={st.metaItem}><Ionicons name="wallet-outline"   size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.price}</Text></View>
              </View>
            </View>
          );

          // ── TAB: Chợ Tour ──
          if (activeTab === "market") {
            const isApplied = t.appliedGuides?.some(g => g.id === profile.guideId);
            return (
              <View style={st.tourCard}>
                <View style={st.cardHeader}>
                  <View style={st.catBadge}>
                    <View style={[st.catDot, { backgroundColor: catColor }]} />
                    <Text style={st.catTxt}>{t.category}</Text>
                  </View>
                  {isApplied ? (
                    <View style={[st.statusBadge, { backgroundColor: "#fef3c7" }]}><Text style={[st.statusTxt, { color: "#d97706" }]}>CHỜ DUYỆT</Text></View>
                  ) : (
                    <View style={[st.statusBadge, { backgroundColor: "#d1fae5" }]}><Text style={[st.statusTxt, { color: "#059669" }]}>TUYỂN HDV</Text></View>
                  )}
                </View>
                <Text style={st.tourName} numberOfLines={2}>{t.name}</Text>
                <View style={st.metaGrid}>
                  <View style={st.metaItem}><Ionicons name="location-outline" size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.departure}</Text></View>
                  <View style={st.metaItem}><Ionicons name="time-outline"     size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.duration}</Text></View>
                </View>
                <View style={st.cardActionsRow}>
                  <Text style={st.priceText}>{(t.priceRaw || 0).toLocaleString("vi-VN")}đ</Text>
                  {isApplied ? (
                    <TouchableOpacity style={st.cancelBtn} onPress={() => handleCancelApply(t.id)}>
                      <Text style={st.cancelBtnTxt}>Hủy yêu cầu</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={st.applyBtn} onPress={() => handleApply(t.id)}>
                      <Ionicons name="hand-right-outline" size={14} color="#fff" />
                      <Text style={st.applyBtnTxt}>Nhận tour này</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }

          // ── TAB: Đề xuất ──
          const sd = getStatusDisplay(t.status);
          return (
            <TouchableOpacity style={st.tourCard} onPress={() => openProposeModal(t)}
              disabled={t.status === "active"} activeOpacity={0.7}>
              {t.status === "pending_approval" && (
                <View style={st.draftBanner}>
                  <Ionicons name="time-outline" size={12} color="#c2410c" />
                  <Text style={st.draftBannerTxt}>ĐANG CHỜ ADMIN PHÊ DUYỆT</Text>
                </View>
              )}
              <View style={st.cardHeader}>
                <View style={st.catBadge}>
                  <View style={[st.catDot, { backgroundColor: catColor }]} />
                  <Text style={st.catTxt}>{t.category}</Text>
                </View>
                <View style={[st.statusBadge, { backgroundColor: sd.bg, borderWidth: 1, borderColor: sd.border }]}>
                  <Text style={[st.statusTxt, { color: sd.color }]}>{sd.label.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={st.tourName} numberOfLines={2}>{t.name}</Text>
              <View style={st.metaGrid}>
                <View style={st.metaItem}><Ionicons name="location-outline" size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{t.departure}</Text></View>
                <View style={st.metaItem}><Ionicons name="wallet-outline"   size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{(t.priceRaw || 0).toLocaleString("vi-VN")}đ</Text></View>
              </View>
              {t.status === "rejected" && t.rejectionReason && (
                <View style={st.rejectBox}>
                  <Ionicons name="close-circle" size={14} color="#dc2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rejectTitle}>Lý do từ chối:</Text>
                    <Text style={st.rejectTxt}>{t.rejectionReason}</Text>
                    <Text style={st.rejectHint}>Nhấn để sửa và gửi lại →</Text>
                  </View>
                </View>
              )}
              {t.status === "active" && (
                <View style={st.approvedBadgeRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={st.approvedTxt}>Đã xuất bản và đang nhận khách</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* ══════════════════════ FORM ĐỀ XUẤT TOUR ══════════════════════ */}
      <Modal visible={proposeModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={st.sheet}>
            <View style={st.sheetHandle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>
                {proposeForm.status === "rejected" ? "Sửa & Đề xuất lại" :
                 proposeForm.id?.startsWith("T")   ? "Đề xuất Tour mới"  : "Chi tiết Đề xuất"}
              </Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setProposeModal(false)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}>

              {/* Banner từ chối */}
              {proposeForm.status === "rejected" && (
                <View style={st.rejectBanner}>
                  <Ionicons name="warning" size={16} color="#dc2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rejectBannerTitle}>Admin từ chối vì:</Text>
                    <Text style={st.rejectBannerTxt}>{proposeForm.rejectionReason}</Text>
                  </View>
                </View>
              )}

              {/* Tên tour */}
              <Text style={st.inputLabel}>Tên Tour <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={st.input} value={proposeForm.name}
                onChangeText={t => setProposeForm(p => ({ ...p, name: t }))}
                placeholder="VD: Sapa 3N2Đ, Phú Quốc 4N3Đ..." placeholderTextColor="#b0bdd8" />

              {/* Ảnh URL */}
              <Text style={st.inputLabel}>Ảnh đại diện (Link URL)</Text>
              <TextInput style={st.input} value={proposeForm.image || ""}
                onChangeText={t => setProposeForm(p => ({ ...p, image: t }))}
                placeholder="https://..." placeholderTextColor="#b0bdd8" />

              {/* ── LOẠI TOUR — chip chọn ── */}
              <Text style={st.inputLabel}>Loại Tour <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <View style={st.chipRow}>
                {CATEGORIES_FORM.map(cat => {
                  const isSelected = proposeForm.category === cat;
                  const color = CATEGORY_COLORS[cat] || "#4f7cff";
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[st.chip, isSelected && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setProposeForm(p => ({ ...p, category: cat }))}>
                      {isSelected && <View style={[st.chipDot, { backgroundColor: "#fff" }]} />}
                      <Text style={[st.chipTxt, isSelected && st.chipTxtActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Nơi khởi hành + Thời lượng */}
              <View style={st.rowGrid}>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Nơi khởi hành <Text style={{ color: "#ef4444" }}>*</Text></Text>
                  <TextInput style={st.input} value={proposeForm.departure}
                    onChangeText={t => setProposeForm(p => ({ ...p, departure: t }))}
                    placeholder="TP. HCM, Hà Nội..." placeholderTextColor="#b0bdd8" />
                </View>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Thời lượng</Text>
                  <TextInput style={st.input} value={proposeForm.duration}
                    onChangeText={t => setProposeForm(p => ({ ...p, duration: t }))}
                    placeholder="3N2Đ, 5 tiếng..." placeholderTextColor="#b0bdd8" />
                </View>
              </View>

              {/* Giá vé */}
              <Text style={st.inputLabel}>Giá vé (VNĐ) <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={st.input} keyboardType="numeric" value={priceInput}
                onChangeText={handlePriceChange} placeholder="2.500.000" placeholderTextColor="#b0bdd8" />
              {(proposeForm.priceRaw || 0) > 0 && (
                <Text style={st.priceReading}>{docTien(proposeForm.priceRaw || 0)}</Text>
              )}

              {/* Mô tả */}
              <Text style={st.inputLabel}>Mô tả chi tiết Tour</Text>
              <TextInput style={[st.input, { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
                multiline value={proposeForm.description}
                onChangeText={t => setProposeForm(p => ({ ...p, description: t }))}
                placeholder="Lịch trình, điểm tham quan, bao gồm/không bao gồm..." placeholderTextColor="#b0bdd8" />

              {/* ══ TAGS — chọn nhiều ══ */}
              <Text style={st.inputLabel}>Tags đặc trưng <Text style={{ color: "#94a3b8", fontWeight: "500" }}>(chọn nhiều)</Text></Text>
              <View style={st.tagRow}>
                {ALL_TAGS.map(tag => {
                  const isSelected = (proposeForm.tags || []).includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[st.tagChip, isSelected && st.tagChipActive]}
                      onPress={() => {
                        const current = proposeForm.tags || [];
                        const next = current.includes(tag)
                          ? current.filter(t => t !== tag)
                          : [...current, tag];
                        setProposeForm(p => ({ ...p, tags: next }));
                      }}>
                      <Text style={[st.tagChipTxt, isSelected && st.tagChipTxtActive]}>
                        {isSelected ? "✓ " : ""}{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Ghi chú gửi lại (chỉ khi bị từ chối) */}
              {proposeForm.status === "rejected" && (
                <>
                  <Text style={[st.inputLabel, { color: "#4f7cff" }]}>Ghi chú gửi lại Admin</Text>
                  <TextInput
                    style={[st.input, { height: 72, textAlignVertical: "top", paddingTop: 12, borderColor: "#4f7cff" }]}
                    multiline value={proposeForm.resubmitNote}
                    onChangeText={t => setProposeForm(p => ({ ...p, resubmitNote: t }))}
                    placeholder="Báo cho Admin biết bạn đã sửa những gì..." placeholderTextColor="#b0bdd8" />
                </>
              )}

              {proposeForm.status !== "active" && (
                <TouchableOpacity style={st.saveBtn} onPress={submitProposal}>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={st.saveBtnTxt}>
                    {proposeForm.status === "rejected" ? "Gửi lại đề xuất" : "Gửi đề xuất cho Admin"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GuideTabBar activeRoute="guide-tour-management" />
    </View>
  );
}

const st = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#f3f7ff" },

  // Header — giống admin
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle:   { fontSize: 18, fontWeight: "900", color: "#1f2a58", textAlign: "center" },
  headerSub:     { fontSize: 11, color: "#94a8d8", textAlign: "center", marginTop: 1 },
  addBtn:        { width: 40, height: 40, backgroundColor: "#10b981", borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 4 },

  // Tabs — giống admin
  tabBar:        { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 14, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  tabBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", position: "relative" },
  tabBtnActive:  { borderBottomColor: "#4f7cff" },
  tabTxt:        { fontSize: 13, fontWeight: "700", color: "#7a8cc2" },
  tabTxtActive:  { color: "#4f7cff" },
  tabCount:      { backgroundColor: "#f1f5f9", borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabCountActive:{ backgroundColor: "#eaf0ff" },
  tabCountTxt:   { color: "#94a8d8", fontSize: 10, fontWeight: "800" },
  tabCountTxtActive: { color: "#4f7cff" },
  tabDot:        { position: "absolute", top: 8, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },

  // Search + Filter
  searchRow:     { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, backgroundColor: "#fff" },
  searchBox:     { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f7ff", borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: "#e4ebff", gap: 8 },
  searchInput:   { flex: 1, fontSize: 13, color: "#1f2a58" },
  filterScroll:  { paddingHorizontal: 14, gap: 7, paddingVertical: 8, backgroundColor: "#fff" },
  filterChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt:     { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  filterTxtActive: { color: "#fff" },

  // List
  listContent:   { padding: 14, paddingBottom: 100 },
  emptyBox:      { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTxt:      { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  addNewBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10b981", paddingVertical: 13, borderRadius: 14, marginBottom: 14, gap: 8, elevation: 2 },
  addNewBtnTxt:  { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Tour card — đồng bộ admin
  tourCard:      { backgroundColor: "#fff", borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, overflow: "hidden" },
  draftBanner:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff7ed", paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#fed7aa" },
  draftBannerTxt:{ color: "#c2410c", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  cardHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0, marginBottom: 8 },
  catBadge:      { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot:        { width: 8, height: 8, borderRadius: 4 },
  catTxt:        { fontSize: 12, fontWeight: "700", color: "#1f2a58" },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt:     { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  tourName:      { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 6, paddingHorizontal: 14, lineHeight: 22 },
  metaGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12, paddingHorizontal: 14 },
  metaItem:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  metaTxt:       { fontSize: 11, color: "#1f2a58", fontWeight: "600" },
  cardActionsRow:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", backgroundColor: "#fafbff", paddingHorizontal: 14, paddingVertical: 10 },
  priceText:     { fontSize: 16, fontWeight: "900", color: "#10b981" },
  applyBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#4f7cff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, elevation: 1 },
  applyBtnTxt:   { color: "#fff", fontSize: 13, fontWeight: "800" },
  cancelBtn:     { backgroundColor: "#f1f5f9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  cancelBtnTxt:  { color: "#64748b", fontSize: 13, fontWeight: "700" },
  rejectBox:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fef2f2", marginHorizontal: 14, marginBottom: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fecaca" },
  rejectTitle:   { fontSize: 11, fontWeight: "800", color: "#1f2a58" },
  rejectTxt:     { fontSize: 12, color: "#dc2626", marginTop: 2 },
  rejectHint:    { fontSize: 11, color: "#4f7cff", fontWeight: "700", marginTop: 4 },
  approvedBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  approvedTxt:   { fontSize: 12, color: "#059669", fontWeight: "700" },

  // Form modal
  overlay:       { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.5)" },
  sheet:         { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  sheetHandle:   { width: 36, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:    { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn:      { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:     { padding: 18 },
  inputLabel:    { fontSize: 12, fontWeight: "700", color: "#1f2a58", marginBottom: 6, marginTop: 12 },
  input:         { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, height: 48, color: "#1f2a58", fontSize: 13 },
  priceReading:  { fontSize: 11, color: "#10b981", fontStyle: "italic", fontWeight: "600", marginTop: 4, marginBottom: 4 },
  rowGrid:       { flexDirection: "row", gap: 10 },
  col:           { flex: 1 },

  // Category chips trong form
  chipRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9", borderWidth: 1.5, borderColor: "#e2e8f0" },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipTxt:       { fontSize: 12, color: "#475569", fontWeight: "600" },
  chipTxtActive: { color: "#fff" },

  // Tag chips trong form
  tagRow:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  tagChip:       { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  tagChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  tagChipTxt:    { fontSize: 12, fontWeight: "600", color: "#475569" },
  tagChipTxtActive: { color: "#fff" },

  rejectBanner:  { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", marginBottom: 4 },
  rejectBannerTitle: { fontSize: 12, fontWeight: "800", color: "#1f2a58", marginBottom: 2 },
  rejectBannerTxt:   { fontSize: 12, color: "#dc2626" },

  saveBtn:       { marginTop: 20, backgroundColor: "#4f7cff", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 3 },
  saveBtnTxt:    { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Popup
  popupOverlay:  { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  popupBox:      { backgroundColor: "#fff", width: "100%", maxWidth: 340, borderRadius: 22, padding: 22, alignItems: "center", elevation: 10 },
  popupIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  popupTitle:    { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 6, textAlign: "center" },
  popupMsg:      { fontSize: 13, color: "#7a8cc2", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  popupBtn:      { width: "100%", height: 44, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  popupBtnTxt:   { color: "#1f2a58", fontSize: 14, fontWeight: "700" },
});