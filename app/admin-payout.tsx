/**
 * app/admin-payout.tsx
 * Admin quản lý và phê duyệt lệnh rút tiền
 * ĐÃ ĐỒNG BỘ: Sử dụng storage-helper, đồng thời Cập nhật/Hoàn tiền vào ví HDV khi xử lý lệnh
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; // <-- FIX QUAN TRỌNG: Đồng bộ kho lưu trữ
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_payouts";

type PayoutStatus = "pending" | "approved" | "rejected";

interface BankInfo { bankName: string; accountNumber: string; accountName: string; }
interface PayoutRequest {
  id: string; guideId: string; guideName: string; amount: number;
  requestDate: string; status: PayoutStatus; bankInfo: BankInfo; processedDate?: string;
}

const SEED_PAYOUTS: PayoutRequest[] = [
  { id: "po-101", guideId: "acc-guide-1", guideName: "Trần Minh Khoa", amount: 4500000, requestDate: "27/03/2026 09:30", status: "pending", bankInfo: { bankName: "Vietcombank", accountNumber: "0123456789", accountName: "TRAN MINH KHOA" } },
  { id: "po-102", guideId: "acc-guide-2", guideName: "Lê Văn Tám", amount: 12000000, requestDate: "26/03/2026 14:15", status: "pending", bankInfo: { bankName: "Techcombank", accountNumber: "19034567891234", accountName: "LE VAN TAM" } },
];

export default function AdminPayoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState<PayoutStatus | "all">("pending");
  const [selectedReq, setSelectedReq] = useState<PayoutRequest | null>(null);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean;
    type: "approve" | "reject" | "success" | "error";
    title: string;
    message: string;
    targetId?: string;
    actionType?: "approved" | "rejected";
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadPayouts();
    }, [])
  );

  const loadPayouts = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setRequests(JSON.parse(raw) || []);
      else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PAYOUTS));
        setRequests(SEED_PAYOUTS);
      }
    } catch (e) {
      setRequests([]);
    }
  };

  const promptAction = (id: string, newStatus: "approved" | "rejected") => {
    setConfirmPopup({
      visible: true,
      type: newStatus === "approved" ? "approve" : "reject",
      title: newStatus === "approved" ? "Xác nhận chuyển khoản" : "Từ chối rút tiền",
      message: newStatus === "approved" ? "Bạn xác nhận đã chuyển khoản thành công số tiền này cho HDV?" : "Hệ thống sẽ hoàn lại số tiền này vào Ví của HDV. Xác nhận từ chối?",
      targetId: id,
      actionType: newStatus
    });
  };

  const executeAction = async () => {
    if (!confirmPopup.targetId || !confirmPopup.actionType) return;
    try {
      const targetReq = requests.find(r => r.id === confirmPopup.targetId);
      
      // 1. Cập nhật phiếu bên Admin
      const updated = requests.map(req => {
        if (req.id === confirmPopup.targetId) {
          return { ...req, status: confirmPopup.actionType as PayoutStatus, processedDate: new Date().toLocaleString("vi-VN") };
        }
        return req;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRequests(updated);

      // 2. ĐỒNG BỘ NGƯỢC VỀ VÍ HDV (@guide_wallet)
      // Trong thực tế sẽ map bằng guideId, ở demo này dùng @guide_wallet cục bộ
      if (targetReq) {
        const wRaw = await AsyncStorage.getItem('@guide_wallet');
        if (wRaw) {
          let wallet = JSON.parse(wRaw);
          let txIndex = wallet.transactions.findIndex((t: any) => t.id === targetReq.id);
          
          if (txIndex > -1) {
            wallet.transactions[txIndex].status = confirmPopup.actionType;
            
            if (confirmPopup.actionType === 'rejected') {
               // Nếu Admin từ chối -> Hoàn lại tiền vào số dư khả dụng
               wallet.balance += targetReq.amount;
               wallet.transactions[txIndex].desc = 'Bị từ chối: Lệnh rút tiền bị hủy (Đã hoàn tiền)';
               wallet.transactions[txIndex].type = 'rejected'; // Đổi type để hiện icon hoàn tiền
            } else {
               // Nếu Admin duyệt -> Cập nhật mô tả thành công
               wallet.transactions[txIndex].desc = 'Thành công: Đã chuyển tiền về Tài khoản Ngân hàng';
            }
            await AsyncStorage.setItem('@guide_wallet', JSON.stringify(wallet));
          }
        }
      }

      setSelectedReq(null);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: `Đã cập nhật trạng thái lệnh rút tiền.` });
    } catch (error) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể cập nhật trạng thái." });
    }
  };

  const formatVND = (val: number) => val.toLocaleString("vi-VN") + "đ";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return { bg: "#fef3c7", txt: "#d97706", label: "Chờ chuyển khoản" };
      case "approved": return { bg: "#d1fae5", txt: "#059669", label: "Đã thanh toán" };
      case "rejected": return { bg: "#fee2e2", txt: "#dc2626", label: "Đã từ chối" };
      default: return { bg: "#f1f5f9", txt: "#64748b", label: "Tất cả" };
    }
  };

  const filteredData = requests.filter(r => filter === "all" || r.status === filter);
  const pendingAmount = requests.filter(r => r.status === "pending").reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt Rút Tiền</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tổng tiền chờ duyệt</Text>
        <Text style={styles.summaryValue}>{formatVND(pendingAmount)}</Text>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(["pending", "approved", "rejected", "all"] as const).map((st) => {
            const isActive = filter === st;
            return (
              <TouchableOpacity key={st} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFilter(st)}>
                <Text style={[styles.filterTxt, isActive && styles.filterTxtActive]}>{getStatusColor(st).label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color="#c0cbe8" />
            <Text style={styles.emptyTxt}>Không có lệnh rút tiền nào.</Text>
          </View>
        ) : (
          filteredData.map(req => {
            const stColor = getStatusColor(req.status);
            const safeGuideName = req.guideName || "Guide"; 
            return (
              <TouchableOpacity key={req.id} style={styles.card} onPress={() => setSelectedReq(req)} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <Text style={styles.reqId}>Mã: {req.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: stColor.bg }]}>
                    <Text style={[styles.statusTxt, { color: stColor.txt }]}>{stColor.label}</Text>
                  </View>
                </View>
                
                <View style={styles.guideRow}>
                  <View style={styles.guideAvatar}>
                    <Text style={styles.guideAvatarTxt}>{safeGuideName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.guideInfo}>
                    <Text style={styles.guideName}>{safeGuideName}</Text>
                    <Text style={styles.reqDate}>{req.requestDate || "Mới đây"}</Text>
                  </View>
                  <Text style={styles.amountTxt}>{formatVND(req.amount || 0)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal Chi tiết */}
      <Modal visible={!!selectedReq} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            {selectedReq && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết Lệnh rút tiền</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedReq(null)}>
                    <Ionicons name="close" size={24} color="#1f2a58" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Số tiền yêu cầu</Text>
                    <Text style={styles.amountBoxValue}>{formatVND(selectedReq.amount || 0)}</Text>
                  </View>

                  <Text style={styles.sectionTitle}>Thông tin nhận tiền (Bank)</Text>
                  <View style={styles.bankBox}>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Ngân hàng</Text>
                      <Text style={styles.bankValue}>{selectedReq.bankInfo?.bankName || "Chưa cập nhật"}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Số tài khoản</Text>
                      <Text style={[styles.bankValue, { color: "#4f7cff", fontSize: 16 }]}>{selectedReq.bankInfo?.accountNumber || "N/A"}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Chủ tài khoản</Text>
                      <Text style={styles.bankValue}>{selectedReq.bankInfo?.accountName || "N/A"}</Text>
                    </View>
                  </View>

                  {selectedReq.status === "pending" ? (
                    <View style={styles.actionGrid}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => promptAction(selectedReq.id, "rejected")}>
                        <Text style={styles.rejectBtnTxt}>Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => promptAction(selectedReq.id, "approved")}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.approveBtnTxt}>Đã chuyển khoản</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.statusResultBox, { backgroundColor: getStatusColor(selectedReq.status).bg }]}>
                      <Text style={[styles.statusResultTxt, { color: getStatusColor(selectedReq.status).txt }]}>
                        Lệnh này {getStatusColor(selectedReq.status).label.toLowerCase()} lúc {selectedReq.processedDate || "N/A"}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Confirm Popup */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "approve" && { backgroundColor: "#eaf0ff" },
              confirmPopup.type === "reject" && { backgroundColor: "#fee2e2" },
              confirmPopup.type === "success" && { backgroundColor: "#d1fae5" },
              confirmPopup.type === "error" && { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={confirmPopup.type === "approve" ? "card" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"} 
                size={32} 
                color={confirmPopup.type === "approve" ? "#4f7cff" : confirmPopup.type === "success" ? "#10b981" : "#ef4444"} 
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
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: confirmPopup.type === "approve" ? "#4f7cff" : "#ef4444" }]} onPress={executeAction}>
                  <Text style={styles.confirmSubmitBtnTxt}>{confirmPopup.type === "approve" ? "Xác nhận" : "Từ chối"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-payout" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  summaryCard: { backgroundColor: "#1f2a58", marginHorizontal: 16, borderRadius: 16, padding: 20, marginBottom: 12, elevation: 6, shadowColor: "#1f2a58", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  summaryLabel: { color: "#94a8d8", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  summaryValue: { color: "#fff", fontSize: 28, fontWeight: "900" },
  
  filtersWrapper: { flexShrink: 0, paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  filterTxtActive: { color: "#fff" },

  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyTxt: { color: "#94a8d8", fontSize: 14, marginTop: 12 },
  
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff", paddingBottom: 10 },
  reqId: { fontSize: 12, color: "#7a8cc2", fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  guideRow: { flexDirection: "row", alignItems: "center" },
  guideAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  guideAvatarTxt: { color: "#4f7cff", fontSize: 18, fontWeight: "900" },
  guideInfo: { flex: 1 },
  guideName: { color: "#1f2a58", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  reqDate: { color: "#7a8cc2", fontSize: 12 },
  amountTxt: { color: "#ef4444", fontSize: 16, fontWeight: "900" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: "50%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  amountBox: { backgroundColor: "#fef2f2", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "#fecaca" },
  amountBoxLabel: { color: "#ef4444", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  amountBoxValue: { color: "#b91c1c", fontSize: 32, fontWeight: "900" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1f2a58", marginBottom: 12 },
  bankBox: { backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 24 },
  bankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  bankLabel: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  bankValue: { color: "#1f2a58", fontSize: 14, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 4 },
  actionGrid: { flexDirection: "row", gap: 12 },
  rejectBtn: { flex: 1, height: 54, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#fecaca", alignItems: "center", justifyContent: "center" },
  rejectBtnTxt: { color: "#dc2626", fontSize: 15, fontWeight: "800" },
  approveBtn: { flex: 2, height: 54, borderRadius: 14, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  approveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  statusResultBox: { padding: 16, borderRadius: 12, alignItems: "center" },
  statusResultTxt: { fontSize: 14, fontWeight: "700" },

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