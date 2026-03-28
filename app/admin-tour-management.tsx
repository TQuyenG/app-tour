/**
 * app/admin-tour-management.tsx
 * Quản lý Tour - Sử dụng Data thực, Đọc số tiền, Bộ lọc trạng thái, Bổ sung Mô tả chi tiết
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

// Nạp dữ liệu thực từ file travel-data.ts
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
  description: string; // Thêm trường mô tả chi tiết
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[]; 
}

const CATEGORIES = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];

// Khởi tạo dữ liệu mẫu phong phú từ travel-data
const generateSeedTours = (): Tour[] => {
  return TOURS.map((t, index) => {
    let assigned: string[] = [];
    let applied: AppliedGuide[] = [];

    // Giả lập một số tour có HDV ứng tuyển hoặc đã phân công để test
    if (index === 0) assigned = [GUIDES[0].name];
    if (index === 1) applied = [{ id: GUIDES[1].id, name: GUIDES[1].name, note: "Tôi chuyên dẫn tuyến này, thuộc từng ngóc ngách." }];
    if (index === 2) applied = [
      { id: GUIDES[2].id, name: GUIDES[2].name, note: "Đã dẫn đoàn gia đình nhiều lần." },
      { id: GUIDES[3].id, name: GUIDES[3].name, note: "Sẵn sàng nhận tour tuần này." }
    ];

    return {
      id: t.id,
      name: t.name,
      category: t.category,
      duration: t.duration,
      price: t.price,
      priceRaw: parseInt(t.price.replace(/\D/g, "")) || 0,
      rating: t.rating,
      reviewCount: Math.floor(Math.random() * 200) + 15,
      totalBookings: Math.floor(Math.random() * 500) + 50,
      departure: t.departure,
      status: "active",
      tags: t.tags,
      color: t.color,
      description: t.summary || "Chưa có mô tả chi tiết.", // Lấy summary làm description
      assignedGuideNames: assigned,
      appliedGuides: applied,
    };
  });
};

// Hàm hỗ trợ đọc số tiền sang chữ
const docTien = (number: number) => {
  if (!number || number === 0) return "0 đồng";
  let result = "";
  let temp = number;
  if (temp >= 1000000000) { result += Math.floor(temp / 1000000000) + " tỷ "; temp %= 1000000000; }
  if (temp >= 1000000) { result += Math.floor(temp / 1000000) + " triệu "; temp %= 1000000; }
  if (temp >= 1000) { result += Math.floor(temp / 1000) + " nghìn "; temp %= 1000; }
  if (temp > 0) { result += temp + " "; }
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
      if (target) {
        setFilterCat("Tất cả"); 
        setFilterStatus("all");
        openModal(target);
      }
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
        id: `t-${Date.now()}`, name: "", category: "Biển đảo", duration: "1N1Đ", status: "draft",
        totalBookings: 0, departure: "TP. HCM", rating: 0, reviewCount: 0, description: "",
        assignedGuideNames: [], appliedGuides: [], tags: [], color: "#4f7cff", priceRaw: 0, price: "0đ"
      });
      setPriceInput("");
    }
    setModalVisible(true);
  };

  const saveTour = async () => {
    if (!editingTour.name || !editingTour.priceRaw) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Vui lòng nhập Tên Tour và Giá tiền." });
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
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã lưu thông tin Tour." });
    } catch (error) {}
  };

  const promptDelete = (id: string, name: string) => {
    setConfirmPopup({ visible: true, type: "delete", title: "Xóa Tour", message: `Bạn có chắc chắn muốn xóa tour "${name}"? Các booking cũ vẫn được giữ lại.`, targetId: id });
  };

  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = tours.filter((t) => t.id !== confirmPopup.targetId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTours(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Tour đã được xóa khỏi hệ thống." });
  };

  const handleApproveGuide = async (guide: AppliedGuide) => {
    if (!biddingTour) return;
    try {
      const updatedTour = { ...biddingTour };
      updatedTour.appliedGuides = updatedTour.appliedGuides.filter(g => g.id !== guide.id);
      updatedTour.assignedGuideNames = [...(updatedTour.assignedGuideNames || []), guide.name];

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
      const updatedTour = { ...biddingTour };
      updatedTour.appliedGuides = updatedTour.appliedGuides.filter(g => g.id !== guideId);

      const updatedTours = tours.map(t => t.id === updatedTour.id ? updatedTour : t);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTours));
      
      setTours(updatedTours);
      setBiddingTour(updatedTour);
      setConfirmPopup({ visible: true, type: "success", title: "Đã từ chối", message: "Đã từ chối yêu cầu nhận tour của HDV này." });
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể từ chối lúc này." });
    }
  };

  const filteredTours = tours.filter((t) => {
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch = (t.name||"").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Tour</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a8d8" />
          <TextInput style={styles.searchInput} placeholder="Tìm kiếm tour..." placeholderTextColor="#94a8d8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterCatScroll} style={{ marginBottom: 10 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[styles.filterChip, filterCat === cat && styles.filterChipActive]} onPress={() => setFilterCat(cat)}>
              <Text style={[styles.filterTxt, filterCat === cat && styles.filterTxtActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.statusFilterRow}>
          {(["all", "active", "full", "draft"] as const).map(st => {
            const isActive = filterStatus === st;
            let label = "Tất cả";
            if(st === "active") label = "Đang mở";
            if(st === "full") label = "Đã đầy";
            if(st === "draft") label = "Bản nháp";
            
            return (
              <TouchableOpacity key={st} style={[styles.statusTabBtn, isActive && styles.statusTabBtnActive]} onPress={() => setFilterStatus(st)}>
                <Text style={[styles.statusTabTxt, isActive && styles.statusTabTxtActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <FlatList
        data={filteredTours}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="map-outline" size={48} color="#c0cbe8" />
            <Text style={{ color: "#94a8d8", marginTop: 10 }}>Không tìm thấy tour nào.</Text>
          </View>
        }
        renderItem={({ item: tour }) => (
          <View style={styles.tourCard}>
            <View style={styles.cardHeader}>
              <View style={styles.catBadge}><View style={[styles.catDot, { backgroundColor: tour.color || "#4f7cff" }]} /><Text style={styles.catTxt}>{tour.category}</Text></View>
              <View style={[styles.statusBadge, { backgroundColor: tour.status === "active" ? "#d1fae5" : tour.status === "full" ? "#fee2e2" : "#f1f5f9" }]}>
                <Text style={[styles.statusTxt, { color: tour.status === "active" ? "#059669" : tour.status === "full" ? "#dc2626" : "#64748b" }]}>
                  {tour.status === "active" ? "Đang mở" : tour.status === "full" ? "Đã đầy" : "Bản nháp"}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => openModal(tour)} activeOpacity={0.7}>
              <Text style={styles.tourName} numberOfLines={2}>{tour.name}</Text>
              {/* Hiển thị mô tả tóm tắt */}
              <Text style={styles.tourDesc} numberOfLines={2}>{tour.description}</Text>
              
              <View style={styles.reviewRow}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.reviewScore}>{tour.rating > 0 ? tour.rating.toFixed(1) : "Chưa có"}</Text>
                <Text style={styles.reviewCount}>({tour.reviewCount} đánh giá)</Text>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#7a8cc2" />
                  <Text style={styles.metaTxt}>{tour.duration}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="wallet-outline" size={16} color="#7a8cc2" />
                  <Text style={styles.metaTxt}>{tour.price}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={16} color="#7a8cc2" />
                  <Text style={styles.metaTxt}>{tour.totalBookings} lượt khách</Text>
                </View>
              </View>

              <View style={styles.guideRow}>
                <View style={styles.guideIcon}><Ionicons name="person" size={14} color="#4f7cff" /></View>
                <Text style={styles.guideNameTxt} numberOfLines={1}>
                  HDV có quyền dẫn: <Text style={{ fontWeight: "700" }}>{tour.assignedGuideNames?.length > 0 ? tour.assignedGuideNames.join(", ") : "Chưa có"}</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {tour.appliedGuides?.length > 0 && (
              <TouchableOpacity style={styles.biddingActionBtn} onPress={() => setBiddingTour(tour)} activeOpacity={0.8}>
                <Ionicons name="notifications" size={18} color="#fff" />
                <Text style={styles.biddingActionTxt}>Có {tour.appliedGuides.length} HDV xin nhận Tour</Text>
              </TouchableOpacity>
            )}

            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(tour)}><Ionicons name="create-outline" size={18} color="#f59e0b" /><Text style={[styles.actionBtnTxt, { color: "#f59e0b" }]}>Sửa Tour</Text></TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={() => promptDelete(tour.id, tour.name)}><Ionicons name="trash-outline" size={18} color="#ef4444" /><Text style={[styles.actionBtnTxt, { color: "#ef4444" }]}>Xóa</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{(editingTour.id||"").startsWith("t-") && !tours.find(t=>t.id===editingTour.id) ? "Tạo Tour Mới" : "Sửa Tour"}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.inputLabel}>Tên Tour <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={styles.input} value={editingTour.name} onChangeText={(t) => setEditingTour(prev => ({...prev, name: t}))} placeholder="VD: Sapa 3N2Đ..." />

              <Text style={styles.inputLabel}>Mô tả chi tiết</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: "top" }]} 
                multiline 
                value={editingTour.description || ""} 
                onChangeText={(t) => setEditingTour(prev => ({...prev, description: t}))} 
                placeholder="Nhập giới thiệu, lịch trình tóm tắt..." 
              />

              <View style={styles.rowGrid}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Giá cơ bản (VNĐ) <Text style={{ color: "#ef4444" }}>*</Text></Text>
                  <TextInput style={[styles.input, {marginBottom: 4}]} keyboardType="numeric" value={priceInput} onChangeText={handlePriceChange} placeholder="2.500.000" />
                  <Text style={styles.priceReadingTxt}>{docTien(editingTour.priceRaw || 0)}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Thời lượng</Text>
                  <TextInput style={styles.input} value={editingTour.duration || ""} onChangeText={(t) => setEditingTour(prev => ({...prev, duration: t}))} placeholder="VD: 3N2Đ" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Trạng thái Tour</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {(["active", "full", "draft"] as const).map(st => (
                  <TouchableOpacity key={st} style={[styles.statusSelectBtn, editingTour.status === st && styles.statusSelectBtnActive]} onPress={() => setEditingTour(prev => ({...prev, status: st}))}>
                    <Text style={[styles.statusSelectTxt, editingTour.status === st && styles.statusSelectTxtActive]}>
                      {st === "active" ? "Đang mở" : st === "full" ? "Đã đầy" : "Bản nháp"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Đội ngũ HDV phụ trách</Text>
              <View style={styles.guideAssignBox}>
                {editingTour.assignedGuideNames?.map(name => (
                  <View key={name} style={styles.assignedRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.assignedName}>{name}</Text>
                    <TouchableOpacity onPress={() => {
                      let assigned = editingTour.assignedGuideNames?.filter(n => n !== name) || [];
                      setEditingTour(prev => ({ ...prev, assignedGuideNames: assigned }));
                    }}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
                  </View>
                ))}
                {(!editingTour.assignedGuideNames || editingTour.assignedGuideNames.length === 0) && <Text style={{color: "#94a8d8", fontSize: 13, fontStyle: "italic", marginBottom: 4}}>Chưa cấp quyền dẫn tour cho ai.</Text>}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveTour}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu Thông tin</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={!!biddingTour} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Duyệt HDV Nhận Tour</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setBiddingTour(null)}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" }}>
              <Text style={{ color: "#1f2a58", fontWeight: "700", fontSize: 15 }}>Tour: {biddingTour?.name}</Text>
              <Text style={{ color: "#7a8cc2", fontSize: 13, marginTop: 4 }}>Danh sách các HDV muốn nhận dẫn Tour này:</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {biddingTour?.appliedGuides?.map(guide => (
                <View key={guide.id} style={styles.biddingCard}>
                  <View style={styles.biddingHeader}>
                    <Ionicons name="person-circle" size={28} color="#4f7cff" />
                    <Text style={styles.biddingName}>{guide.name}</Text>
                    <TouchableOpacity style={styles.biddingProfileBtn} onPress={() => setGuideModal({visible: true, guideName: guide.name, note: guide.note})}>
                      <Text style={styles.biddingProfileTxt}>Xem hồ sơ</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.biddingNoteBox}>
                    <Text style={styles.biddingNoteLabel}>Ghi chú ứng tuyển:</Text>
                    <Text style={styles.biddingNoteTxt}>"{guide.note}"</Text>
                  </View>
                  <View style={styles.biddingActions}>
                    <TouchableOpacity style={styles.biddingRejectBtn} onPress={() => handleRejectGuide(guide.id)}>
                      <Text style={styles.biddingRejectTxt}>Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.biddingApproveBtn} onPress={() => handleApproveGuide(guide)}>
                      <Text style={styles.biddingApproveTxt}>Cấp quyền dẫn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {(!biddingTour?.appliedGuides || biddingTour.appliedGuides.length === 0) && (
                <Text style={{ textAlign: "center", color: "#94a8d8", marginTop: 20 }}>Đã xử lý hết yêu cầu.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={guideModal.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, {backgroundColor: "#eaf0ff"}]}>
              <Ionicons name="person" size={32} color="#4f7cff" />
            </View>
            <Text style={styles.confirmTitle}>{guideModal.guideName}</Text>
            <View style={{backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, width: "100%", marginBottom: 20}}>
              <Text style={{color: "#64748b", fontSize: 12, marginBottom: 4}}>Lý do xin nhận tour:</Text>
              <Text style={{color: "#1f2a58", fontSize: 14, fontStyle: "italic"}}>"{guideModal.note}"</Text>
            </View>
            <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setGuideModal({...guideModal, visible: false})}>
              <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, confirmPopup.type === "delete" ? { backgroundColor: "#fee2e2" } : confirmPopup.type === "success" ? { backgroundColor: "#d1fae5" } : { backgroundColor: "#fee2e2" }]}>
              <Ionicons name={confirmPopup.type === "delete" ? "trash" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"} size={32} color={confirmPopup.type === "delete" || confirmPopup.type === "error" ? "#ef4444" : "#10b981"} />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "success" || confirmPopup.type === "error" ? (
              <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={styles.confirmSingleBtnTxt}>Đóng</Text></TouchableOpacity>
            ) : (
              <View style={styles.confirmActionRow}>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={styles.confirmCancelBtnTxt}>Hủy bỏ</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeDelete}><Text style={styles.confirmSubmitBtnTxt}>Xóa ngay</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-tour-management" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#e4ebff" },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1f2a58" },
  
  filtersWrapper: { flexShrink: 0, paddingBottom: 10 },
  filterCatScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  filterTxtActive: { color: "#fff" },

  statusFilterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginTop: 10 },
  statusTabBtn: { flex: 1, alignItems: "center", paddingVertical: 8, backgroundColor: "#eaf0ff", borderRadius: 8 },
  statusTabBtnActive: { backgroundColor: "#4f7cff" },
  statusTabTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "700" },
  statusTabTxtActive: { color: "#fff" },

  listContent: { padding: 16, paddingBottom: 100 },
  tourCard: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: "hidden" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 0, marginBottom: 10 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catTxt: { fontSize: 12, fontWeight: "700", color: "#1f2a58" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  tourName: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 4, paddingHorizontal: 16, lineHeight: 24 },
  tourDesc: { fontSize: 13, color: "#64748b", paddingHorizontal: 16, marginBottom: 10, lineHeight: 18 },
  
  reviewRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 4 },
  reviewScore: { fontSize: 13, fontWeight: "800", color: "#1f2a58" },
  reviewCount: { fontSize: 13, color: "#7a8cc2" },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12, paddingHorizontal: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f8fafc", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaTxt: { fontSize: 12, color: "#1f2a58", fontWeight: "600" },

  guideRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  guideIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  guideNameTxt: { fontSize: 13, color: "#7a8cc2", flex: 1 },

  biddingActionBtn: { backgroundColor: "#f59e0b", paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, borderRadius: 10 },
  biddingActionTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },

  cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f0f4ff", backgroundColor: "#fafbff" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  actionBtnTxt: { fontSize: 13, fontWeight: "800" },
  actionDivider: { width: 1, backgroundColor: "#f0f4ff", marginVertical: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14, marginBottom: 12 },
  priceReadingTxt: { fontSize: 12, color: "#10b981", fontStyle: "italic", marginLeft: 4, marginBottom: 12, fontWeight: "600" },
  rowGrid: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  statusSelectBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  statusSelectBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  statusSelectTxt: { color: "#64748b", fontWeight: "700", fontSize: 13 },
  statusSelectTxtActive: { color: "#4f7cff" },

  guideAssignBox: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 20 },
  assignedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  assignedName: { flex: 1, fontSize: 14, color: "#1f2a58", fontWeight: "600" },

  biddingCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 14 },
  biddingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  biddingName: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2a58" },
  biddingProfileBtn: { backgroundColor: "#eaf0ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  biddingProfileTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "700" },
  biddingNoteBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 16 },
  biddingNoteLabel: { fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: "600" },
  biddingNoteTxt: { fontSize: 13, color: "#1f2a58", fontStyle: "italic" },
  biddingActions: { flexDirection: "row", gap: 10 },
  biddingRejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fecaca", alignItems: "center" },
  biddingRejectTxt: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
  biddingApproveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#10b981", alignItems: "center", elevation: 2 },
  biddingApproveTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});