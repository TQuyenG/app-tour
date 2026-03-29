/**
 * app/admin-guide-management.tsx
 * Quản lý HDV - ĐÃ FIX LỖI ĐỒNG BỘ DỮ LIỆU (SKILLS ARRAY) VỚI DATA-STORE
 * Tích hợp VNeID, CCCD, Danh sách Tour đảm nhận và Navigation liên kết
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

const STORAGE_KEY = "@app_guides";

type GuideStatus = "active" | "busy" | "inactive";

interface Guide {
  id: string; name: string; location: string; experience: string;
  skills: string[] | string; // FIX: Chấp nhận cả array (từ DB) và chuỗi (khi đang gõ)
  rating: number; tours: number; phone: string; email: string;
  status: GuideStatus; note: string;
  vneidVerified: boolean;
  cccd: string;
  assignedTours: { id: string; name: string }[];
}

export default function AdminGuideManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [guides, setGuides] = useState<Guide[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<GuideStatus | "all">("all");
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Partial<Guide>>({});

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error"; title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadGuides(); }, []));

  const loadGuides = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setGuides(JSON.parse(raw));
      } else {
        // Nếu chưa có data thì mượn kho trung tâm (nếu có thể) hoặc mảng rỗng
        setGuides([]);
      }
    } catch (e) { setGuides([]); }
  };

  const openModal = (guide?: Guide) => {
    if (guide) {
      setEditingGuide({
        ...guide,
        // FIX: Đưa Array về chuỗi (cách nhau bởi dấu phẩy) để hiển thị trong TextInput dễ sửa
        skills: Array.isArray(guide.skills) ? guide.skills.join(", ") : (guide.skills || "")
      });
    } else {
      setEditingGuide({
        id: `g${Date.now()}`, name: "", location: "", experience: "", skills: "",
        rating: 5.0, tours: 0, phone: "", email: "", status: "active", note: "", vneidVerified: false, cccd: "", assignedTours: []
      });
    }
    setModalVisible(true);
  };

  const saveGuide = async () => {
    if (!editingGuide.name || !editingGuide.phone) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu thông tin", message: "Vui lòng nhập Tên và Số điện thoại hợp lệ." });
      return;
    }
    try {
      // BƯỚC CHUẨN HÓA: Ép skills về dạng Array ['Kỹ năng 1', 'Kỹ năng 2'] để chuẩn hóa với hệ thống App
      const normalizedGuide = {
        ...editingGuide,
        skills: typeof editingGuide.skills === 'string' 
          ? editingGuide.skills.split(',').map(s => s.trim()).filter(Boolean) 
          : editingGuide.skills
      };

      let updated = [...guides];
      const isNew = !guides.find(g => g.id === editingGuide.id);
      if (isNew) updated.unshift(normalizedGuide as Guide);
      else updated = updated.map((g) => (g.id === editingGuide.id ? (normalizedGuide as Guide) : g));
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setGuides(updated);
      setModalVisible(false);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã lưu thông tin HDV thành công." });
    } catch (error) {}
  };

  const promptDelete = (id: string, name: string) => {
    setConfirmPopup({ visible: true, type: "delete", title: "Xóa Hướng dẫn viên", message: `Bạn có chắc chắn muốn xóa HDV "${name}" khỏi hệ thống?`, targetId: id });
  };

  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = guides.filter((g) => g.id !== confirmPopup.targetId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setGuides(updated);
    setModalVisible(false);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Đã xóa Hướng dẫn viên thành công." });
  };

  const navigateToTour = (tourId: string) => {
    setModalVisible(false);
    setTimeout(() => {
      router.push({ pathname: "/admin-tour-management", params: { openTourId: tourId } });
    }, 300);
  };

  const filteredGuides = guides.filter((g) => {
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    const matchSearch = (g.name||"").toLowerCase().includes(searchQuery.toLowerCase()) || (g.phone||"").includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Hướng dẫn viên</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a8d8" />
          <TextInput style={styles.searchInput} placeholder="Tìm theo tên, số điện thoại..." placeholderTextColor="#94a8d8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterCatScroll}>
          {(["all", "active", "busy", "inactive"] as const).map((st) => {
            const isActive = filterStatus === st;
            let label = "Tất cả"; if(st === "active") label = "Sẵn sàng"; if(st === "busy") label = "Đang bận"; if(st === "inactive") label = "Ngưng hoạt động";
            return (
              <TouchableOpacity key={st} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFilterStatus(st)}>
                <Text style={[styles.filterTxt, isActive && styles.filterTxtActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredGuides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{textAlign: 'center', color: '#94a8d8', marginTop: 40}}>Chưa có dữ liệu HDV.</Text>}
        renderItem={({ item: guide }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => openModal(guide)} activeOpacity={0.7}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, guide.status === "inactive" && { backgroundColor: "#f1f5f9" }]}>
                  <Text style={[styles.avatarTxt, guide.status === "inactive" && { color: "#64748b" }]}>{(guide.name||"U").charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{guide.name}</Text>
                  <Text style={styles.sub}>{guide.phone || "---"} • {guide.location || "---"}</Text>
                </View>
                <View style={[styles.statusBadge, guide.status === "active" ? { backgroundColor: "#eaf0ff" } : guide.status === "busy" ? { backgroundColor: "#fef3c7" } : { backgroundColor: "#f1f5f9" }]}>
                  <Text style={[styles.statusBadgeTxt, guide.status === "active" ? { color: "#4f7cff" } : guide.status === "busy" ? { color: "#d97706" } : { color: "#64748b" }]}>
                    {guide.status === "active" ? "Sẵn sàng" : guide.status === "busy" ? "Đang bận" : "Ngưng HĐ"}
                  </Text>
                </View>
              </View>

              {/* VNeID Badge */}
              <View style={styles.securityRow}>
                {guide.vneidVerified ? (
                  <View style={styles.vneidBadge}><Ionicons name="checkmark-circle" size={14} color="#10b981" /><Text style={styles.vneidTxt}>Đã xác thực VNeID</Text></View>
                ) : (
                  <View style={[styles.vneidBadge, {backgroundColor: "#fef2f2"}]}><Ionicons name="warning" size={14} color="#ef4444" /><Text style={[styles.vneidTxt, {color: "#ef4444"}]}>Chưa định danh</Text></View>
                )}
                <View style={styles.vneidBadge}><Ionicons name="star" size={14} color="#f59e0b" /><Text style={styles.vneidTxt}>{guide.rating} ({guide.tours} tours)</Text></View>
              </View>
              
              <View style={styles.cardBottom}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Kinh nghiệm</Text>
                  <Text style={styles.metaValue}>{guide.experience || "---"}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Kỹ năng nổi bật</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {/* Xử lý an toàn: Nếu là mảng thì join, nếu là chuỗi thì in ra */}
                    {Array.isArray(guide.skills) ? guide.skills.join(", ") : (guide.skills || "---")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(guide)} activeOpacity={0.6}>
                <Ionicons name="create-outline" size={18} color="#f59e0b" /><Text style={[styles.actionBtnTxt, { color: "#f59e0b" }]}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={() => promptDelete(guide.id, guide.name)} activeOpacity={0.6}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" /><Text style={[styles.actionBtnTxt, { color: "#ef4444" }]}>Xóa HDV</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{(editingGuide.id||"").startsWith("g") && !guides.find(g=>g.id===editingGuide.id) ? "Thêm HDV Mới" : "Hồ sơ HDV"}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Họ và tên <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={styles.input} value={editingGuide.name} onChangeText={(t) => setEditingGuide(prev => ({...prev, name: t}))} placeholder="Nhập tên HDV" />

              <View style={styles.rowGrid}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Số điện thoại <Text style={{ color: "#ef4444" }}>*</Text></Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" value={editingGuide.phone} onChangeText={(t) => setEditingGuide(prev => ({...prev, phone: t}))} placeholder="090..." />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>CCCD / CMND</Text>
                  <TextInput style={styles.input} value={editingGuide.cccd} onChangeText={(t) => setEditingGuide(prev => ({...prev, cccd: t}))} placeholder="0790..." />
                </View>
              </View>

              <View style={styles.rowGrid}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Kinh nghiệm</Text>
                  <TextInput style={styles.input} value={editingGuide.experience} onChangeText={(t) => setEditingGuide(prev => ({...prev, experience: t}))} placeholder="Ví dụ: 3 năm" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Nơi hoạt động</Text>
                  <TextInput style={styles.input} value={editingGuide.location} onChangeText={(t) => setEditingGuide(prev => ({...prev, location: t}))} placeholder="Đà Lạt" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Email liên hệ</Text>
              <TextInput style={styles.input} keyboardType="email-address" value={editingGuide.email} onChangeText={(t) => setEditingGuide(prev => ({...prev, email: t}))} placeholder="email@example.com" />

              <Text style={styles.inputLabel}>Kỹ năng (cách nhau bởi dấu phẩy)</Text>
              <TextInput style={styles.input} value={editingGuide.skills as string} onChangeText={(t) => setEditingGuide(prev => ({...prev, skills: t}))} placeholder="VD: Chụp ảnh, Trekking, Tiếng Anh" />

              <Text style={styles.inputLabel}>Trạng thái hoạt động</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {(["active", "busy", "inactive"] as const).map(st => (
                  <TouchableOpacity key={st} style={[styles.statusSelectBtn, editingGuide.status === st && styles.statusSelectBtnActive]} onPress={() => setEditingGuide(prev => ({...prev, status: st}))}>
                    <Text style={[styles.statusSelectTxt, editingGuide.status === st && styles.statusSelectTxtActive]}>
                      {st === "active" ? "Sẵn sàng" : st === "busy" ? "Đang bận" : "Ngưng HĐ"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Các Tour đang đảm nhận ({editingGuide.assignedTours?.length || 0})</Text>
              <View style={styles.toursBox}>
                {editingGuide.assignedTours?.map(tour => (
                  <TouchableOpacity key={tour.id} style={styles.tourLinkItem} onPress={() => navigateToTour(tour.id)}>
                    <Ionicons name="map" size={16} color="#4f7cff" />
                    <Text style={styles.tourLinkTxt}>{tour.name}</Text>
                    <Ionicons name="open-outline" size={16} color="#94a8d8" />
                  </TouchableOpacity>
                ))}
                {(!editingGuide.assignedTours || editingGuide.assignedTours.length === 0) && (
                  <Text style={{color: "#94a8d8", fontSize: 13, fontStyle: "italic"}}>HDV này chưa nhận tour nào.</Text>
                )}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveGuide}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu thông tin</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
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

      <AdminTabBar role="admin" activeRoute="admin-guide-management" />
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

  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarTxt: { color: "#4f7cff", fontSize: 20, fontWeight: "900" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  sub: { fontSize: 12, color: "#7a8cc2" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { fontSize: 11, fontWeight: "800" },
  
  securityRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  vneidBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  vneidTxt: { color: "#059669", fontSize: 11, fontWeight: "700" },

  cardBottom: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingVertical: 12, paddingHorizontal: 16 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 11, color: "#94a8d8", fontWeight: "600", marginBottom: 4 },
  metaValue: { fontSize: 13, color: "#1f2a58", fontWeight: "700" },
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
  rowGrid: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  statusSelectBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  statusSelectBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  statusSelectTxt: { color: "#64748b", fontWeight: "700", fontSize: 13 },
  statusSelectTxtActive: { color: "#4f7cff" },

  toursBox: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 20 },
  tourLinkItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 8 },
  tourLinkTxt: { flex: 1, marginLeft: 10, color: "#1f2a58", fontWeight: "600", fontSize: 14 },

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