/**
 * app/admin-flash-sale.tsx
 * Admin quản lý các chương trình Flash Sale / Deal Hot
 * Code chuẩn UI Xanh Dương, an toàn dữ liệu, Custom Popup, Ẩn Header
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
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

const STORAGE_KEY = "@admin_flash_sales";

type SaleStatus = "active" | "upcoming" | "ended";

interface FlashSale {
  id: string; title: string; discount: string;
  startTime: string; endTime: string; status: SaleStatus; color: string;
}

const SEED: FlashSale[] = [
  { id: "fs1", title: "Flash Sale Hè Rực Rỡ", discount: "Đồng giá 1.990K", startTime: "01/06/2026", endTime: "05/06/2026", status: "upcoming", color: "#f59e0b" },
  { id: "fs2", title: "Deal Đêm Khuya 12H", discount: "Giảm 50%", startTime: "Hôm nay 00:00", endTime: "Hôm nay 02:00", status: "active", color: "#ef4444" }
];

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

export default function AdminFlashSaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sales, setSales] = useState<FlashSale[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSale, setEditingSale] = useState<Partial<FlashSale>>({});

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error";
    title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [])
  );

  const loadSales = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setSales(JSON.parse(raw) || []);
      else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        setSales(SEED);
      }
    } catch (e) {
      setSales([]);
    }
  };

  const openModal = (item?: FlashSale) => {
    if (item) setEditingSale(item);
    else setEditingSale({
      id: `fs-${Date.now()}`, title: "", discount: "",
      startTime: "", endTime: "", status: "upcoming", color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
    setModalVisible(true);
  };

  const saveSale = async () => {
    if (!editingSale.title || !editingSale.discount) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu thông tin", message: "Vui lòng nhập Tên chương trình và Mức giảm." });
      return;
    }
    try {
      let updatedList = [...sales];
      const isNew = !sales.find(s => s.id === editingSale.id);
      if (isNew) updatedList.unshift(editingSale as FlashSale);
      else updatedList = updatedList.map((s) => s.id === editingSale.id ? editingSale as FlashSale : s);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setSales(updatedList);
      setModalVisible(false);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã lưu chương trình Flash Sale." });
    } catch (error) {}
  };

  const promptDelete = (id: string, title: string) => {
    setConfirmPopup({
      visible: true, type: "delete", title: "Xóa chương trình",
      message: `Xóa Flash Sale "${title || "N/A"}" khỏi hệ thống? Hành động không thể hoàn tác.`, targetId: id
    });
  };

  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = sales.filter((s) => s.id !== confirmPopup.targetId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSales(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Chương trình đã được xóa." });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Flash Sale</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sales.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={[styles.cardHeader, { backgroundColor: (item.color || "#4f7cff") + "15" }]}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="flash" size={20} color={item.color || "#4f7cff"} />
                <Text style={[styles.cardTitle, { color: item.color || "#4f7cff" }]}>{item.title || "N/A"}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "active" ? "#d1fae5" : item.status === "upcoming" ? "#fef3c7" : "#f1f5f9" }]}>
                <Text style={[styles.statusTxt, { color: item.status === "active" ? "#059669" : item.status === "upcoming" ? "#d97706" : "#64748b" }]}>
                  {item.status === "active" ? "Đang diễn ra" : item.status === "upcoming" ? "Sắp diễn ra" : "Đã kết thúc"}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={16} color="#7a8cc2" />
                <Text style={styles.infoTxt}>Mức giảm: <Text style={{ fontWeight: "800", color: "#ef4444" }}>{item.discount || "0"}</Text></Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#7a8cc2" />
                <Text style={styles.infoTxt}>{item.startTime || "..."} - {item.endTime || "..."}</Text>
              </View>
            </View>

            <View style={styles.cardActionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(item)} activeOpacity={0.6}>
                <Ionicons name="create-outline" size={18} color="#f59e0b" />
                <Text style={[styles.actionBtnTxt, { color: "#f59e0b" }]}>Sửa</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={() => promptDelete(item.id, item.title)} activeOpacity={0.6}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.actionBtnTxt, { color: "#ef4444" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal Thêm Sửa */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{(editingSale?.id || "").startsWith("fs-") && !sales.find(s=>s.id===editingSale?.id) ? "Tạo Flash Sale" : "Sửa Flash Sale"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên chương trình</Text>
              <TextInput style={styles.input} value={editingSale?.title || ""} onChangeText={(t) => setEditingSale(prev => ({...prev, title: t}))} placeholder="VD: Deal Đêm Khuya 12H" />

              <Text style={styles.inputLabel}>Mức giảm (Text hiển thị)</Text>
              <TextInput style={styles.input} value={editingSale?.discount || ""} onChangeText={(t) => setEditingSale(prev => ({...prev, discount: t}))} placeholder="VD: Giảm 50% hoặc Đồng giá 1.990K" />

              <View style={styles.rowGrid}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Bắt đầu</Text>
                  <TextInput style={styles.input} value={editingSale?.startTime || ""} onChangeText={(t) => setEditingSale(prev => ({...prev, startTime: t}))} placeholder="01/06/2026" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Kết thúc</Text>
                  <TextInput style={styles.input} value={editingSale?.endTime || ""} onChangeText={(t) => setEditingSale(prev => ({...prev, endTime: t}))} placeholder="05/06/2026" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Trạng thái</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {(["upcoming", "active", "ended"] as const).map(st => (
                  <TouchableOpacity key={st} style={[styles.typeBtn, editingSale?.status === st && styles.typeBtnActive]} onPress={() => setEditingSale(prev => ({...prev, status: st}))}>
                    <Text style={[styles.typeTxt, editingSale?.status === st && styles.typeTxtActive]}>
                      {st === "upcoming" ? "Sắp tới" : st === "active" ? "Đang chạy" : "Đã xong"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveSale}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu chương trình</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Confirm Popup An toàn */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "delete" && { backgroundColor: "#fee2e2" },
              confirmPopup.type === "success" && { backgroundColor: "#d1fae5" },
              confirmPopup.type === "error" && { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={confirmPopup.type === "delete" ? "trash" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"} 
                size={32} 
                color={confirmPopup.type === "delete" || confirmPopup.type === "error" ? "#ef4444" : "#10b981"} 
              />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>

            {confirmPopup.type === "success" || confirmPopup.type === "error" ? (
              <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmActionRow}>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={styles.confirmCancelBtnTxt}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeDelete}>
                  <Text style={styles.confirmSubmitBtnTxt}>Xóa ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-flash-sale" />
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
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, overflow: "hidden" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  cardBody: { padding: 16, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoTxt: { fontSize: 14, color: "#1f2a58", fontWeight: "600" },

  cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f0f4ff", backgroundColor: "#fafbff" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  actionBtnTxt: { fontSize: 13, fontWeight: "800" },
  actionDivider: { width: 1, backgroundColor: "#f0f4ff", marginVertical: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14, marginBottom: 12 },
  rowGrid: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  typeBtn: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 14, alignItems: "center" },
  typeBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  typeTxt: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  typeTxtActive: { color: "#4f7cff", fontWeight: "700" },
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
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