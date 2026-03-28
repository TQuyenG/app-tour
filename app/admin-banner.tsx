/**
 * app/admin-banner.tsx
 * Admin quản lý Banner - Bổ sung tải ảnh Banner (Image URL), thiết kế thẻ thực tế
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
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

const STORAGE_KEY = "@admin_banners";

interface AppBanner {
  id: string; title: string; subtitle: string; position: number; status: "active" | "hidden";
  imageUrl: string; 
}

const SEED: AppBanner[] = [
  { id: "b1", title: "Mùa hè sôi động", subtitle: "Khám phá biển xanh vẫy gọi", position: 1, status: "active", imageUrl: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=600&auto=format&fit=crop" },
  { id: "b2", title: "Đà Lạt săn mây", subtitle: "Tour trọn gói từ 1.990k", position: 2, status: "active", imageUrl: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=600&auto=format&fit=crop" }
];

export default function AdminBannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<AppBanner>>({});

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error"; title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadBanners(); }, []));

  const loadBanners = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setBanners(JSON.parse(raw) || []);
      else { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); setBanners(SEED); }
    } catch (e) { setBanners([]); }
  };

  const openModal = (item?: AppBanner) => {
    if (item) setEditingBanner(item);
    else setEditingBanner({
      id: `ban-${Date.now()}`, title: "", subtitle: "", position: banners.length + 1,
      status: "active", imageUrl: ""
    });
    setModalVisible(true);
  };

  const saveBanner = async () => {
    if (!editingBanner.title || !editingBanner.imageUrl) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Tiêu đề và Link ảnh không được để trống." });
      return;
    }
    try {
      let updated = [...banners];
      const isNew = !banners.find(b => b.id === editingBanner.id);
      if (isNew) updated.push(editingBanner as AppBanner);
      else updated = updated.map((b) => b.id === editingBanner.id ? editingBanner as AppBanner : b);
      
      updated.sort((a, b) => a.position - b.position);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setBanners(updated);
      setModalVisible(false);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã cập nhật Banner." });
    } catch (error) {}
  };

  const promptDelete = (id: string, title: string) => {
    setConfirmPopup({ visible: true, type: "delete", title: "Xóa Banner", message: `Bạn muốn xóa banner "${title || "N/A"}"?`, targetId: id });
  };

  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = banners.filter((b) => b.id !== confirmPopup.targetId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBanners(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Banner đã được xóa." });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Banner</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.infoTxtMain}>Banner sẽ hiển thị trực tiếp ở đầu trang chủ ứng dụng của Khách Hàng.</Text>
        
        {banners.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.bannerPreview}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
              ) : (
                <View style={styles.noImagePlaceholder}><Ionicons name="image-outline" size={40} color="#94a8d8" /></View>
              )}
              <View style={styles.overlayDark}>
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>{item.title}</Text>
                  <Text style={styles.previewSub}>{item.subtitle}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={styles.metaTxt}>Vị trí: <Text style={{ fontWeight: "800", color: "#1f2a58" }}>#{item.position}</Text></Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === "active" ? "#d1fae5" : "#f1f5f9" }]}>
                  <Text style={[styles.statusTxt, { color: item.status === "active" ? "#059669" : "#64748b" }]}>
                    {item.status === "active" ? "Đang hiện" : "Đã ẩn"}
                  </Text>
                </View>
              </View>
              <View style={styles.actionRowLite}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openModal(item)}>
                  <Ionicons name="create" size={20} color="#f59e0b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => promptDelete(item.id, item.title)}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{(editingBanner?.id || "").startsWith("ban-") && !banners.find(b=>b.id===editingBanner?.id) ? "Thêm Banner" : "Sửa Banner"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tải ảnh lên (Image URL)</Text>
              <View style={styles.imgInputBox}>
                <Ionicons name="link" size={18} color="#94a8d8" style={{marginRight: 8}} />
                <TextInput style={styles.inputLite} value={editingBanner?.imageUrl || ""} onChangeText={(t) => setEditingBanner(prev => ({...prev, imageUrl: t}))} placeholder="https://domain.com/image.jpg" />
              </View>
              {editingBanner?.imageUrl ? (
                <Image source={{ uri: editingBanner.imageUrl }} style={styles.miniPreview} />
              ) : null}

              <Text style={styles.inputLabel}>Tiêu đề chính</Text>
              <TextInput style={styles.input} value={editingBanner?.title || ""} onChangeText={(t) => setEditingBanner(prev => ({...prev, title: t}))} placeholder="Tiêu đề to nổi bật" />

              <Text style={styles.inputLabel}>Tiêu đề phụ</Text>
              <TextInput style={styles.input} value={editingBanner?.subtitle || ""} onChangeText={(t) => setEditingBanner(prev => ({...prev, subtitle: t}))} placeholder="Nội dung khuyến mãi..." />

              <Text style={styles.inputLabel}>Vị trí sắp xếp (Thứ tự)</Text>
              <TextInput style={styles.input} value={editingBanner?.position?.toString() || "1"} keyboardType="numeric" onChangeText={(t) => setEditingBanner(prev => ({...prev, position: Number(t) || 1}))} />

              <Text style={styles.inputLabel}>Trạng thái hiển thị</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                <TouchableOpacity style={[styles.typeBtn, editingBanner?.status === "active" && styles.typeBtnActive]} onPress={() => setEditingBanner(prev => ({...prev, status: "active"}))}>
                  <Text style={[styles.typeTxt, editingBanner?.status === "active" && styles.typeTxtActive]}>Đang hiện</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, editingBanner?.status === "hidden" && styles.typeBtnActive]} onPress={() => setEditingBanner(prev => ({...prev, status: "hidden"}))}>
                  <Text style={[styles.typeTxt, editingBanner?.status === "hidden" && styles.typeTxtActive]}>Đã ẩn</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveBanner}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu Banner</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Popup */}
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

      <AdminTabBar role="admin" activeRoute="admin-banner" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  content: { padding: 16, paddingBottom: 100 },
  infoTxtMain: { fontSize: 13, color: "#7a8cc2", marginBottom: 16, fontStyle: "italic" },
  card: { backgroundColor: "#fff", borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e4ebff", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, overflow: "hidden" },
  bannerPreview: { height: 160, position: "relative", backgroundColor: "#e2e8f0" },
  bannerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  noImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlayDark: { position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end", padding: 16 },
  previewContent: { zIndex: 2 },
  previewTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
  previewSub: { color: "#fff", fontSize: 14, fontWeight: "600", textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
  
  cardInfo: { padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaTxt: { fontSize: 13, color: "#7a8cc2" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  actionRowLite: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14, marginBottom: 12 },
  imgInputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  inputLite: { flex: 1, fontSize: 14, color: "#4f7cff" },
  miniPreview: { width: "100%", height: 100, borderRadius: 12, marginBottom: 12, resizeMode: "cover", borderWidth: 1, borderColor: "#e2e8f0" },
  rowGrid: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  typeBtn: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 14, alignItems: "center" },
  typeBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  typeTxt: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  typeTxtActive: { color: "#4f7cff", fontWeight: "700" },
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
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