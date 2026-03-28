/**
 * app/admin-guide-requests.tsx
 * Admin xét duyệt yêu cầu đăng ký HDV
 * Đã fix lỗi undefined 'charAt', sửa 'adminNote' thành 'note', thêm 'confirmOverlay'
 */
import {
  approveGuideRequest,
  getPendingGuideRequests,
  rejectGuideRequest,
  type GuideRequest,
} from "@/constants/app-accounts";
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
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

export default function AdminGuideRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<GuideRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [detail, setDetail] = useState<GuideRequest | null>(null);
  
  const [rejectNote, setRejectNote] = useState("");
  const [rejectModal, setRejectModal] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean;
    type: "approve" | "success" | "error";
    title: string;
    message: string;
    targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    getPendingGuideRequests().then((res) => {
      setRequests(res || []);
    }).catch(() => setRequests([]));
  };

  const visibleReqs = requests.filter((r) => filter === "all" || r.status === filter);

  const promptApprove = (reqId: string) => {
    setConfirmPopup({
      visible: true,
      type: "approve",
      title: "Phê duyệt HDV",
      message: "Cấp quyền Hướng dẫn viên cho người dùng này? Tài khoản sẽ có thể đăng nhập vào khu vực HDV ngay lập tức.",
      targetId: reqId,
    });
  };

  const executeApprove = async () => {
    if (!confirmPopup.targetId) return;
    try {
      await approveGuideRequest(confirmPopup.targetId);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã phê duyệt tài khoản thành Hướng dẫn viên." });
      setDetail(null);
      loadData();
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể phê duyệt yêu cầu này." });
    }
  };

  const executeReject = async () => {
    if (!detail) return;
    if (!rejectNote.trim()) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu lý do", message: "Vui lòng nhập lý do từ chối để thông báo cho người dùng." });
      return;
    }
    try {
      await rejectGuideRequest(detail.id, rejectNote);
      setRejectModal(false);
      setRejectNote("");
      setDetail(null);
      setConfirmPopup({ visible: true, type: "success", title: "Đã từ chối", message: "Yêu cầu đã bị từ chối và đã ghi chú lý do." });
      loadData();
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể từ chối yêu cầu này." });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return { bg: "#fef3c7", txt: "#d97706", label: "Chờ duyệt" };
      case "approved": return { bg: "#d1fae5", txt: "#059669", label: "Đã duyệt" };
      case "rejected": return { bg: "#fee2e2", txt: "#dc2626", label: "Từ chối" };
      default: return { bg: "#f1f5f9", txt: "#64748b", label: "Tất cả" };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt Hướng dẫn viên</Text>
        <View style={{ width: 44 }} />
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

      <ScrollView contentContainerStyle={styles.listContent}>
        {visibleReqs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#c0cbe8" />
            <Text style={styles.emptyTxt}>Không có yêu cầu nào trong mục này.</Text>
          </View>
        ) : (
          visibleReqs.map((req) => {
            const stColor = getStatusColor(req.status);
            const safeName = req.name || "User"; 
            return (
              <TouchableOpacity key={req.id} style={styles.card} onPress={() => setDetail(req)} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{safeName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{safeName}</Text>
                    <Text style={styles.sub}>{req.email || "Chưa cập nhật email"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: stColor.bg }]}>
                    <Text style={[styles.statusBadgeTxt, { color: stColor.txt }]}>{stColor.label}</Text>
                  </View>
                </View>
                <Text style={styles.reqDate}>Gửi lúc: {req.createdAt || "Gần đây"}</Text>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* Modal Chi tiết Yêu cầu */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            {detail && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết Hồ sơ</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setDetail(null)}>
                    <Ionicons name="close" size={24} color="#1f2a58" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Họ và tên</Text>
                      <Text style={styles.detailValue}>{detail.name || "Không rõ"}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{detail.email || "Không rõ"}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số điện thoại</Text>
                      <Text style={styles.detailValue}>{detail.phone || "Không rõ"}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Kinh nghiệm & Kỹ năng</Text>
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Kinh nghiệm</Text>
                      <Text style={styles.detailValue}>{detail.experience || "Chưa cập nhật"}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Kỹ năng</Text>
                      <Text style={styles.detailValue}>{detail.skills || "Chưa cập nhật"}</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Giới thiệu bản thân</Text>
                  <View style={styles.bioBox}>
                    <Text style={styles.bioTxt}>{detail.bio || "Người dùng chưa viết giới thiệu bản thân."}</Text>
                  </View>

                  {/* Fix lỗi property: dùng detail.note thay vì detail.adminNote */}
                  {detail.status === "rejected" && detail.note && (
                    <View style={styles.rejectReasonBox}>
                      <Text style={styles.rejectReasonTitle}>Lý do từ chối:</Text>
                      <Text style={styles.rejectReasonTxt}>{detail.note}</Text>
                    </View>
                  )}

                  {detail.status === "pending" && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectModal(true)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                        <Text style={styles.rejectBtnTxt}>Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => promptApprove(detail.id)}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.approveBtnTxt}>Phê duyệt</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Nhập lý do từ chối */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.confirmBox}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Từ chối hồ sơ</Text>
            <Text style={styles.confirmMessage}>Vui lòng nhập lý do từ chối để người dùng khắc phục (Bắt buộc):</Text>
            
            <TextInput
              style={styles.rejectInput}
              placeholder="VD: Cần bổ sung thêm chứng chỉ ngoại ngữ..."
              placeholderTextColor="#94a8d8"
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
            />

            <View style={styles.confirmActionRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setRejectModal(false)}>
                <Text style={styles.confirmCancelBtnTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeReject}>
                <Text style={styles.confirmSubmitBtnTxt}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* CUSTOM POPUP CONFIRM */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "approve" && { backgroundColor: "#eaf0ff" },
              confirmPopup.type === "success" && { backgroundColor: "#d1fae5" },
              confirmPopup.type === "error" && { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={confirmPopup.type === "approve" ? "checkmark-done-circle" : confirmPopup.type === "success" ? "checkmark-circle" : "warning"} 
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
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: "#4f7cff" }]} onPress={executeApprove}>
                  <Text style={styles.confirmSubmitBtnTxt}>Phê duyệt ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-guide-requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  filtersWrapper: { flexShrink: 0, paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  filterTxtActive: { color: "#fff" },

  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyTxt: { color: "#94a8d8", fontSize: 14, marginTop: 12 },
  
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarTxt: { color: "#4f7cff", fontSize: 20, fontWeight: "900" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  sub: { fontSize: 12, color: "#7a8cc2" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { fontSize: 11, fontWeight: "800" },
  reqDate: { fontSize: 11, color: "#94a8d8", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1f2a58", marginBottom: 10, marginTop: 16 },
  detailCard: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  detailLabel: { color: "#64748b", fontSize: 13, fontWeight: "600", width: 100 },
  detailValue: { flex: 1, color: "#1f2a58", fontSize: 13, fontWeight: "700", textAlign: "right" },
  detailDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 10 },
  
  bioBox: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 16 },
  bioTxt: { color: "#1f2a58", fontSize: 14, lineHeight: 22 },

  rejectReasonBox: { backgroundColor: "#fef2f2", borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", padding: 16, marginTop: 16 },
  rejectReasonTitle: { color: "#dc2626", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  rejectReasonTxt: { color: "#b91c1c", fontSize: 14, lineHeight: 20 },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 30, marginBottom: 20 },
  rejectBtn: { flex: 1, height: 54, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#fecaca", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rejectBtnTxt: { color: "#dc2626", fontSize: 15, fontWeight: "800" },
  approveBtn: { flex: 1, height: 54, borderRadius: 14, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  approveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  rejectInput: { width: "100%", height: 100, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, color: "#1f2a58", fontSize: 14, textAlignVertical: "top", marginBottom: 24 },

  // ĐÃ BỔ SUNG CÁC STYLE CỦA POPUP XÁC NHẬN
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