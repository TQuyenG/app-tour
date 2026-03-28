/**
 * app/admin-tour-management.tsx
 * Quản lý Tour - Đồng bộ UI, Badge thông báo HDV xin nhận, Responsive
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  FlatList,
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

import { TOURS, GUIDES } from "@/constants/travel-data";

const STORAGE_KEY = "@app_tours";

type TourStatus = "active" | "full" | "draft";
interface AppliedGuide { id: string; name: string; note: string; }

interface Tour {
  id: string; name: string; category: string; duration: string;
  price: string; priceRaw: number;
  rating: number; reviewCount: number;
  totalBookings: number;
  departure: string; status: TourStatus; tags: string[]; color: string;
  description: string;
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[];
}

const CATEGORIES = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];

const generateSeedTours = (): Tour[] => {
  return TOURS.map((t, index) => {
    let assigned: string[] = [];
    let applied: AppliedGuide[] = [];
    if (index === 0) assigned = [GUIDES[0].name];
    if (index === 1) applied = [{ id: GUIDES[1].id, name: GUIDES[1].name, note: "Tôi chuyên dẫn tuyến này, thuộc từng ngóc ngách." }];
    if (index === 2) applied = [
      { id: GUIDES[2].id, name: GUIDES[2].name, note: "Đã dẫn đoàn gia đình nhiều lần." },
      { id: GUIDES[3].id, name: GUIDES[3].name, note: "Sẵn sàng nhận tour tuần này." },
    ];
    return {
      id: t.id, name: t.name, category: t.category, duration: t.duration,
      price: t.price, priceRaw: parseInt(t.price.replace(/\D/g, "")) || 0,
      rating: t.rating, reviewCount: Math.floor(Math.random() * 200) + 15,
      totalBookings: Math.floor(Math.random() * 500) + 50, departure: t.departure,
      status: "active" as TourStatus, tags: t.tags, color: t.color,
      description: t.summary || "Chưa có mô tả chi tiết.",
      assignedGuideNames: assigned, appliedGuides: applied,
    };
  });
};

const docTien = (number: number) => {
  if (!number || number === 0) return "0 đồng";
  let result = ""; let temp = number;
  if (temp >= 1000000000) { result += Math.floor(temp / 1000000000) + " tỷ "; temp %= 1000000000; }
  if (temp >= 1000000) { result += Math.floor(temp / 1000000) + " triệu "; temp %= 1000000; }
  if (temp >= 1000) { result += Math.floor(temp / 1000) + " nghìn "; temp %= 1000; }
  if (temp > 0) result += temp + " ";
  return result.trim() + " đồng";
};

export default function AdminTourManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [tours, setTours] = useState<Tour[]>([]);
  const [filterCat, setFilterCat] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState<TourStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTour, setEditingTour] = useState<Partial<Tour>>({});
  const [priceInput, setPriceInput] = useState("");

  const [biddingTour, setBiddingTour] = useState<Tour | null>(null);
  const [guideModal, setGuideModal] = useState<{ visible: boolean; guideName: string; note: string }>({ visible: false, guideName: "", note: "" });

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error"; title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadTours(); }, []));

  const loadTours = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setTours(JSON.parse(raw));
      else {
        const seedData = generateSeedTours();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
        setTours(seedData);
      }
    } catch (e) { setTours([]); }
  };

  useEffect(() => {
    if (tours.length > 0 && params.openTourId) {
      const target = tours.find(t => t.id === params.openTourId);
      if (target) { setFilterCat("Tất cả"); setFilterStatus("all"); openModal(target); }
    }
  }, [tours, params.openTourId]);

  const handlePriceChange = (val: string) => {
    const numericOnly = val.replace(/\D/g, "");
    if (!numericOnly) { setPriceInput(""); setEditingTour(prev => ({ ...prev, priceRaw: 0, price: "0đ" })); return; }
    const formatted = parseInt(numericOnly, 10).toLocaleString("vi-VN");
    setPriceInput(formatted);
    setEditingTour(prev => ({ ...prev, priceRaw: parseInt(numericOnly, 10), price: `${formatted}đ` }));
  };

  const openModal = (tour?: Tour) => {
    if (tour) { setEditingTour(tour); setPriceInput(tour.priceRaw.toLocaleString("vi-VN")); }
    else {
      setEditingTour({
        id: `t-${Date.now()}`, name: "", category: "Biển đảo", duration: "1N1Đ", status: "active",
        totalBookings: 0, departure: "TP. HCM", rating: 0, reviewCount: 0, description: "",
        assignedGuideNames: [], appliedGuides: [], tags: [], color: "#4f7cff", priceRaw: 0, price: "0đ",
      });
      setPriceInput("");
    }
    setModalVisible(true);
  };

  const saveTour = async () => {
    if (!editingTour.name || !editingTour.priceRaw) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu thông tin", message: "Vui lòng nhập Tên Tour và Giá tiền." });
      return;
    }
    try {
      let updated = [...tours];
      const isNew = !tours.find(t => t.id === editingTour.id);
      if (isNew) updated.unshift(editingTour as Tour);
      else updated = updated.map((t) => t.id === editingTour.id ? editingTour as Tour : t);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTours(updated);
      setModalVisible(false);
      setConfirmPopup({ visible: true, type: "success", title: "Đã lưu", message: "Thông tin Tour đã được cập nhật thành công." });
    } catch (error) {}
  };

  const promptDelete = (id: string, name: string) => {
    setConfirmPopup({ visible: true, type: "delete", title: "Xóa Tour", message: `Bạn có chắc muốn xóa tour "${name}"?`, targetId: id });
  };

  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = tours.filter((t) => t.id !== confirmPopup.targetId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTours(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Tour đã được xóa khỏi hệ thống." });
  };

  const handleApproveProposal = async (tourId: string) => {
    const updated = tours.map(t => t.id === tourId ? { ...t, status: "active" as TourStatus, description: `[Đề xuất từ HDV] ${t.description || ""}` } : t);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTours(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã phê duyệt", message: "Đề xuất Tour đã được xuất bản lên hệ thống." });
  };

  const handleApproveGuide = async (guide: AppliedGuide) => {
    if (!biddingTour) return;
    try {
      const updatedTour = {
        ...biddingTour,
        appliedGuides: biddingTour.appliedGuides.filter(g => g.id !== guide.id),
        assignedGuideNames: [...(biddingTour.assignedGuideNames || []), guide.name],
      };
      const updatedTours = tours.map(t => t.id === updatedTour.id ? updatedTour : t);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTours));
      setTours(updatedTours);
      setBiddingTour(updatedTour);
      setConfirmPopup({ visible: true, type: "success", title: "Đã phân công", message: `Đã cấp quyền dẫn tour cho ${guide.name}.` });
    } catch (e) {}
  };

  const handleRejectGuide = async (guideId: string) => {
    if (!biddingTour) return;
    try {
      const updatedTour = { ...biddingTour, appliedGuides: biddingTour.appliedGuides.filter(g => g.id !== guideId) };
      const updatedTours = tours.map(t => t.id === updatedTour.id ? updatedTour : t);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTours));
      setTours(updatedTours);
      setBiddingTour(updatedTour);
      setConfirmPopup({ visible: true, type: "success", title: "Đã từ chối", message: "Đã từ chối yêu cầu nhận tour của HDV này." });
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể thực hiện lúc này." });
    }
  };

  const filteredTours = tours.filter((t) => {
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch = (t.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  // ✅ Thống kê nhanh để hiện notification banner
  const pendingApplied = tours.reduce((sum, t) => sum + (t.appliedGuides?.length || 0), 0);
  const pendingDrafts = tours.filter(t => t.status === "draft").length;
  const totalPending = pendingApplied + pendingDrafts;

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>Quản lý Tour</Text>
          <Text style={st.headerSub}>{tours.length} tour trong hệ thống</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ✅ NOTIFICATION BANNER - hiện khi có yêu cầu chờ */}
      {totalPending > 0 && (
        <TouchableOpacity
          style={st.notifBanner}
          activeOpacity={0.85}
          onPress={() => setFilterStatus("draft")}
        >
          <View style={st.notifLeft}>
            <View style={st.notifIconBox}>
              <Ionicons name="notifications" size={16} color="#fff" />
            </View>
            <View>
              <Text style={st.notifTitle}>Cần xử lý</Text>
              <Text style={st.notifSub}>
                {pendingApplied > 0 && `${pendingApplied} HDV xin nhận tour`}
                {pendingApplied > 0 && pendingDrafts > 0 && " · "}
                {pendingDrafts > 0 && `${pendingDrafts} đề xuất tour mới`}
              </Text>
            </View>
          </View>
          <View style={st.notifBadge}>
            <Text style={st.notifBadgeTxt}>{totalPending}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* SEARCH */}
      <View style={st.searchRow}>
        <View style={st.searchBox}>
          <Ionicons name="search" size={18} color="#94a8d8" />
          <TextInput
            style={st.searchInput}
            placeholder="Tìm kiếm tour..."
            placeholderTextColor="#94a8d8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a8d8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTERS */}
      <View style={st.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterCatScroll} style={{ marginBottom: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[st.filterChip, filterCat === cat && st.filterChipActive]} onPress={() => setFilterCat(cat)}>
              <Text style={[st.filterTxt, filterCat === cat && st.filterTxtActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATUS TABS - compact với badge */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.statusTabScroll}>
          {(["all", "active", "full", "draft"] as const).map(st_ => {
            const isActive = filterStatus === st_;
            const label = st_ === "all" ? "Tất cả" : st_ === "active" ? "Đang mở" : st_ === "full" ? "Đã đầy" : "Đề xuất HDV";
            const count = st_ === "draft" ? pendingDrafts : st_ === "all" ? tours.length : tours.filter(t => t.status === st_).length;
            return (
              <TouchableOpacity key={st_} style={[st.statusTabBtn, isActive && st.statusTabBtnActive]} onPress={() => setFilterStatus(st_)}>
                <Text style={[st.statusTabTxt, isActive && st.statusTabTxtActive]}>{label}</Text>
                <View style={[st.statusTabCount, isActive && st.statusTabCountActive]}>
                  <Text style={[st.statusTabCountTxt, isActive && st.statusTabCountTxtActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOUR LIST */}
      <FlatList
        data={filteredTours}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Ionicons name="map-outline" size={48} color="#c0cbe8" />
            <Text style={{ color: "#94a8d8", marginTop: 10, fontSize: 14 }}>Không tìm thấy tour nào.</Text>
          </View>
        }
        renderItem={({ item: tour }) => (
          <View style={st.tourCard}>
            {/* BANNER DRAFT */}
            {tour.status === "draft" && (
              <View style={st.draftBanner}>
                <Ionicons name="bulb-outline" size={13} color="#c2410c" />
                <Text style={st.draftBannerTxt}>ĐỀ XUẤT MỚI TỪ HDV · Chờ phê duyệt</Text>
              </View>
            )}

            <View style={st.cardHeader}>
              <View style={st.catBadge}>
                <View style={[st.catDot, { backgroundColor: tour.color || "#4f7cff" }]} />
                <Text style={st.catTxt}>{tour.category}</Text>
              </View>
              <View style={[st.statusBadge, {
                backgroundColor: tour.status === "active" ? "#d1fae5" : tour.status === "full" ? "#fee2e2" : "#fff7ed",
              }]}>
                <Text style={[st.statusTxt, {
                  color: tour.status === "active" ? "#059669" : tour.status === "full" ? "#dc2626" : "#c2410c",
                }]}>
                  {tour.status === "active" ? "MỞ BÁN" : tour.status === "full" ? "ĐÃ ĐẦY" : "CHỜ DUYỆT"}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => openModal(tour)} activeOpacity={0.7}>
              <Text style={st.tourName} numberOfLines={2}>{tour.name}</Text>
              <Text style={st.tourDesc} numberOfLines={2}>{tour.description}</Text>

              <View style={st.reviewRow}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={st.reviewScore}>{tour.rating > 0 ? tour.rating.toFixed(1) : "Chưa có"}</Text>
                <Text style={st.reviewCount}>({tour.reviewCount} đánh giá)</Text>
              </View>

              {/* META GRID - compact */}
              <View style={st.metaGrid}>
                <View style={st.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#7a8cc2" />
                  <Text style={st.metaTxt}>{tour.duration}</Text>
                </View>
                <View style={st.metaItem}>
                  <Ionicons name="wallet-outline" size={12} color="#7a8cc2" />
                  <Text style={st.metaTxt}>{tour.price}</Text>
                </View>
                <View style={st.metaItem}>
                  <Ionicons name="people-outline" size={12} color="#7a8cc2" />
                  <Text style={st.metaTxt}>{tour.totalBookings} lượt</Text>
                </View>
              </View>

              <View style={st.guideRow}>
                <View style={st.guideIcon}><Ionicons name="person" size={12} color="#4f7cff" /></View>
                <Text style={st.guideNameTxt} numberOfLines={1}>
                  HDV: <Text style={{ fontWeight: "700", color: "#1f2a58" }}>
                    {tour.assignedGuideNames?.length > 0 ? tour.assignedGuideNames.join(", ") : "Chưa có"}
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* ✅ NOTIFICATION BUTTON khi có HDV xin nhận */}
            {tour.appliedGuides?.length > 0 && (
              <TouchableOpacity style={st.biddingBtn} onPress={() => setBiddingTour(tour)} activeOpacity={0.8}>
                <View style={st.biddingBtnLeft}>
                  <View style={st.biddingBellBox}>
                    <Ionicons name="notifications" size={14} color="#fff" />
                    <View style={st.biddingDot} />
                  </View>
                  <Text style={st.biddingBtnTxt}>{tour.appliedGuides.length} HDV xin nhận tour này</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#fff" style={{ opacity: 0.8 }} />
              </TouchableOpacity>
            )}

            {/* CARD ACTIONS */}
            <View style={st.cardActionsRow}>
              {tour.status === "draft" ? (
                <TouchableOpacity style={[st.actionBtn, { backgroundColor: "#d1fae5" }]} onPress={() => handleApproveProposal(tour.id)}>
                  <Ionicons name="checkmark-circle" size={15} color="#059669" />
                  <Text style={[st.actionBtnTxt, { color: "#059669" }]}>PHÊ DUYỆT</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={st.actionBtn} onPress={() => openModal(tour)}>
                  <Ionicons name="create-outline" size={15} color="#f59e0b" />
                  <Text style={[st.actionBtnTxt, { color: "#f59e0b" }]}>Sửa Tour</Text>
                </TouchableOpacity>
              )}
              <View style={st.actionDivider} />
              <TouchableOpacity style={st.actionBtn} onPress={() => promptDelete(tour.id, tour.name)}>
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                <Text style={[st.actionBtnTxt, { color: "#ef4444" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* MODAL EDIT/CREATE TOUR */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{!tours.find(t => t.id === editingTour.id) ? "Tạo Tour Mới" : "Sửa Tour"}</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Tên Tour <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={st.input} value={editingTour.name} onChangeText={(t) => setEditingTour(prev => ({ ...prev, name: t }))} placeholder="VD: Sapa 3N2Đ..." placeholderTextColor="#b0bdd8" />

              <Text style={st.inputLabel}>Mô tả chi tiết</Text>
              <TextInput
                style={[st.input, { height: 75, textAlignVertical: "top" }]}
                multiline
                value={editingTour.description || ""}
                onChangeText={(t) => setEditingTour(prev => ({ ...prev, description: t }))}
                placeholder="Nhập lịch trình tóm tắt..."
                placeholderTextColor="#b0bdd8"
              />

              <View style={st.rowGrid}>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Giá (VNĐ) <Text style={{ color: "#ef4444" }}>*</Text></Text>
                  <TextInput style={[st.input, { marginBottom: 3 }]} keyboardType="numeric" value={priceInput} onChangeText={handlePriceChange} placeholder="2.500.000" placeholderTextColor="#b0bdd8" />
                  <Text style={st.priceReadingTxt}>{docTien(editingTour.priceRaw || 0)}</Text>
                </View>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Thời lượng</Text>
                  <TextInput style={st.input} value={editingTour.duration || ""} onChangeText={(t) => setEditingTour(prev => ({ ...prev, duration: t }))} placeholder="3N2Đ" placeholderTextColor="#b0bdd8" />
                </View>
              </View>

              <Text style={st.inputLabel}>Trạng thái</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["active", "full", "draft"] as const).map(s => (
                  <TouchableOpacity key={s} style={[st.statusSelectBtn, editingTour.status === s && st.statusSelectBtnActive]} onPress={() => setEditingTour(prev => ({ ...prev, status: s }))}>
                    <Text style={[st.statusSelectTxt, editingTour.status === s && st.statusSelectTxtActive]}>
                      {s === "active" ? "Đang mở" : s === "full" ? "Đã đầy" : "Nháp"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={st.inputLabel}>HDV phụ trách</Text>
              <View style={st.guideAssignBox}>
                {editingTour.assignedGuideNames?.map(name => (
                  <View key={name} style={st.assignedRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={st.assignedName}>{name}</Text>
                    <TouchableOpacity onPress={() => {
                      const assigned = editingTour.assignedGuideNames?.filter(n => n !== name) || [];
                      setEditingTour(prev => ({ ...prev, assignedGuideNames: assigned }));
                    }}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {(!editingTour.assignedGuideNames || editingTour.assignedGuideNames.length === 0) && (
                  <Text style={{ color: "#94a8d8", fontSize: 12, fontStyle: "italic" }}>Chưa phân công HDV.</Text>
                )}
              </View>

              <TouchableOpacity style={st.saveBtn} onPress={saveTour}>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={st.saveBtnTxt}>Lưu Thông tin</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DUYỆT HDV */}
      <Modal visible={!!biddingTour} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: "85%" }]}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Duyệt HDV Nhận Tour</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setBiddingTour(null)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="map-outline" size={14} color="#4f7cff" />
                <Text style={{ color: "#1f2a58", fontWeight: "700", fontSize: 14, flex: 1 }} numberOfLines={1}>{biddingTour?.name}</Text>
              </View>
              <Text style={{ color: "#7a8cc2", fontSize: 12, marginTop: 3 }}>{biddingTour?.appliedGuides?.length || 0} HDV đang chờ xét duyệt</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {biddingTour?.appliedGuides?.map(guide => (
                <View key={guide.id} style={st.biddingCard}>
                  <View style={st.biddingHeader}>
                    <View style={st.biddingAvatar}>
                      <Ionicons name="person" size={20} color="#4f7cff" />
                    </View>
                    <Text style={st.biddingName}>{guide.name}</Text>
                    <TouchableOpacity style={st.biddingProfileBtn} onPress={() => setGuideModal({ visible: true, guideName: guide.name, note: guide.note })}>
                      <Text style={st.biddingProfileTxt}>Hồ sơ</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={st.biddingNoteBox}>
                    <Text style={st.biddingNoteLabel}>Lý do xin nhận:</Text>
                    <Text style={st.biddingNoteTxt}>"{guide.note}"</Text>
                  </View>
                  <View style={st.biddingActions}>
                    <TouchableOpacity style={st.biddingRejectBtn} onPress={() => handleRejectGuide(guide.id)}>
                      <Ionicons name="close" size={14} color="#dc2626" />
                      <Text style={st.biddingRejectTxt}>Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.biddingApproveBtn} onPress={() => handleApproveGuide(guide)}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={st.biddingApproveTxt}>Cấp quyền dẫn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {(!biddingTour?.appliedGuides || biddingTour.appliedGuides.length === 0) && (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <Ionicons name="checkmark-done-circle" size={40} color="#10b981" />
                  <Text style={{ color: "#94a8d8", marginTop: 10 }}>Đã xử lý hết yêu cầu.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL HỒ SƠ HDV */}
      <Modal visible={guideModal.visible} transparent animationType="fade">
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <View style={[st.confirmIconWrap, { backgroundColor: "#eaf0ff" }]}>
              <Ionicons name="person" size={30} color="#4f7cff" />
            </View>
            <Text style={st.confirmTitle}>{guideModal.guideName}</Text>
            <View style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, width: "100%", marginBottom: 18 }}>
              <Text style={{ color: "#64748b", fontSize: 11, marginBottom: 4, fontWeight: "700" }}>LÝ DO XIN NHẬN TOUR:</Text>
              <Text style={{ color: "#1f2a58", fontSize: 13, fontStyle: "italic", lineHeight: 19 }}>"{guideModal.note}"</Text>
            </View>
            <TouchableOpacity style={st.confirmSingleBtn} onPress={() => setGuideModal({ ...guideModal, visible: false })}>
              <Text style={st.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRM / SUCCESS / ERROR POPUP */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <View style={[st.confirmIconWrap, {
              backgroundColor: confirmPopup.type === "delete" ? "#fee2e2" : confirmPopup.type === "success" ? "#d1fae5" : "#fee2e2",
            }]}>
              <Ionicons
                name={confirmPopup.type === "delete" ? "trash" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"}
                size={30}
                color={confirmPopup.type === "success" ? "#10b981" : "#ef4444"}
              />
            </View>
            <Text style={st.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={st.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "success" || confirmPopup.type === "error" ? (
              <TouchableOpacity style={st.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={st.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            ) : (
              <View style={st.confirmActionRow}>
                <TouchableOpacity style={st.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={st.confirmCancelBtnTxt}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeDelete}>
                  <Text style={st.confirmSubmitBtnTxt}>Xóa ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-tour-management" />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },

  // HEADER
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e4ebff",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58", textAlign: "center" },
  headerSub: { fontSize: 11, color: "#94a8d8", textAlign: "center", marginTop: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  addBtn: { width: 40, height: 40, backgroundColor: "#4f7cff", borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 4 },

  // ✅ NOTIFICATION BANNER
  notifBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1f2a58", marginHorizontal: 14, marginTop: 10, marginBottom: 2,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    elevation: 3,
  },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  notifIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  notifTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  notifSub: { color: "#94a8d8", fontSize: 11, marginTop: 1 },
  notifBadge: { backgroundColor: "#ef4444", borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  notifBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },

  // SEARCH
  searchRow: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: "#e4ebff", gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#1f2a58" },

  // FILTERS
  filtersWrapper: { paddingBottom: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  filterCatScroll: { paddingHorizontal: 14, gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  filterTxtActive: { color: "#fff" },
  statusTabScroll: { paddingHorizontal: 14, gap: 7 },
  statusTabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f7ff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff" },
  statusTabBtnActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  statusTabTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "700" },
  statusTabTxtActive: { color: "#fff" },
  statusTabCount: { backgroundColor: "#e4ebff", borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  statusTabCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  statusTabCountTxt: { color: "#4f7cff", fontSize: 10, fontWeight: "800" },
  statusTabCountTxtActive: { color: "#fff" },

  // LIST
  listContent: { padding: 14, paddingBottom: 100 },

  // TOUR CARD
  tourCard: {
    backgroundColor: "#fff", borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "#e4ebff", elevation: 2,
    shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8,
    overflow: "hidden",
  },
  draftBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff7ed", paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#fed7aa",
  },
  draftBannerTxt: { color: "#c2410c", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0, marginBottom: 8 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTxt: { fontSize: 12, fontWeight: "700", color: "#1f2a58" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  tourName: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 3, paddingHorizontal: 14, lineHeight: 22 },
  tourDesc: { fontSize: 12, color: "#64748b", paddingHorizontal: 14, marginBottom: 8, lineHeight: 17 },
  reviewRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 8, gap: 3 },
  reviewScore: { fontSize: 12, fontWeight: "800", color: "#1f2a58" },
  reviewCount: { fontSize: 12, color: "#7a8cc2" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10, paddingHorizontal: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  metaTxt: { fontSize: 11, color: "#1f2a58", fontWeight: "600" },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  guideIcon: { width: 22, height: 22, borderRadius: 5, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  guideNameTxt: { fontSize: 12, color: "#7a8cc2", flex: 1 },

  // ✅ BIDDING BUTTON - nổi bật
  biddingBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#f59e0b", paddingVertical: 9, paddingHorizontal: 14,
    marginHorizontal: 12, marginBottom: 10, borderRadius: 10, elevation: 2,
  },
  biddingBtnLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  biddingBellBox: { position: "relative", width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  biddingDot: { position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#f59e0b" },
  biddingBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },

  cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f0f4ff", backgroundColor: "#fafbff" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  actionBtnTxt: { fontSize: 12, fontWeight: "800" },
  actionDivider: { width: 1, backgroundColor: "#f0f4ff", marginVertical: 6 },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "92%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, width: "100%" },
  handle: { width: 36, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 18 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#1f2a58", marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 13, marginBottom: 4 },
  priceReadingTxt: { fontSize: 11, color: "#10b981", fontStyle: "italic", fontWeight: "600", marginBottom: 8 },
  rowGrid: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  statusSelectBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  statusSelectBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  statusSelectTxt: { color: "#64748b", fontWeight: "700", fontSize: 12 },
  statusSelectTxtActive: { color: "#4f7cff" },
  guideAssignBox: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 16 },
  assignedRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  assignedName: { flex: 1, fontSize: 13, color: "#1f2a58", fontWeight: "600" },
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 12, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, marginBottom: 28 },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // BIDDING CARDS
  biddingCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 12 },
  biddingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  biddingAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  biddingName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#1f2a58" },
  biddingProfileBtn: { backgroundColor: "#eaf0ff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  biddingProfileTxt: { color: "#4f7cff", fontSize: 11, fontWeight: "700" },
  biddingNoteBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 12 },
  biddingNoteLabel: { fontSize: 11, color: "#64748b", marginBottom: 3, fontWeight: "700" },
  biddingNoteTxt: { fontSize: 13, color: "#1f2a58", fontStyle: "italic", lineHeight: 18 },
  biddingActions: { flexDirection: "row", gap: 8 },
  biddingRejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#fecaca" },
  biddingRejectTxt: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  biddingApproveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 9, backgroundColor: "#10b981", elevation: 2 },
  biddingApproveTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // CONFIRM POPUP
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 340, borderRadius: 22, padding: 22, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 6, textAlign: "center" },
  confirmMessage: { fontSize: 13, color: "#7a8cc2", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  confirmActionRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 44, borderRadius: 11, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 14, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 44, borderRadius: 11, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 14, fontWeight: "800" },
});