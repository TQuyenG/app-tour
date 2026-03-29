/**
 * app/staff-refund-management.tsx
 * Staff xử lý yêu cầu hủy tour và hoàn tiền
 * ĐÃ FIX TOÀN BỘ: Lỗi TypeScript, UX/UI Modal, và Lỗi kẹt trạng thái "Unknown"
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

interface RefundRequest {
  id: string; bookingId: string; tourName: string;
  guestName?: string; customerName?: string; 
  guestPhone?: string; customerPhone?: string;
  amount: number; refundPercent: number; feeAmount: number;
  reason: string; category: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string; evidence?: string; priority: "high" | "normal" | "low";
  image?: string; tourImage?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Chờ duyệt",     color: "#d97706", bg: "#fef9c3" },
  approved:   { label: "Đã hoàn tiền",  color: "#16a34a", bg: "#dcfce7" },
  rejected:   { label: "Từ chối",       color: "#dc2626", bg: "#fee2e2" },
};

const FILTERS = ["Tất cả", "Chờ duyệt", "Đã hoàn", "Từ chối"];
const fmt = (n: number) => `${(n || 0).toLocaleString("vi-VN")}đ`;

// --- COMPONENT POPUP THÔNG BÁO ---
const Popup = ({ visible, type, title, message, onClose }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={s.popupOverlay}>
      <View style={s.popupContent}>
        <Ionicons name={type === 'success' ? 'checkmark-circle' : 'warning'} size={50} color={type === 'success' ? '#16a34a' : '#dc2626'} />
        <Text style={s.popupTitle}>{title}</Text>
        <Text style={s.popupMessage}>{message}</Text>
        <TouchableOpacity style={[s.popupBtn, { backgroundColor: type === 'success' ? '#16a34a' : '#dc2626' }]} onPress={onClose}>
          <Text style={s.popupBtnTxt}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// --- COMPONENT POPUP XÁC NHẬN ---
const ConfirmPopup = ({ visible, title, message, onCancel, onConfirm, isDestructive }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={s.popupOverlay}>
      <View style={s.popupContent}>
        <Ionicons name="help-circle" size={50} color="#0284c7" />
        <Text style={s.popupTitle}>{title}</Text>
        <Text style={s.popupMessage}>{message}</Text>
        <View style={s.popupActionRow}>
          <TouchableOpacity style={[s.popupBtn, { flex: 1, backgroundColor: '#f1f5f9' }]} onPress={onCancel}>
            <Text style={[s.popupBtnTxt, { color: '#475569' }]}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.popupBtn, { flex: 1, backgroundColor: isDestructive ? '#dc2626' : '#0284c7' }]} onPress={onConfirm}>
            <Text style={s.popupBtnTxt}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function StaffRefundManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");
  
  const [detail, setDetail] = useState<RefundRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [popup, setPopup] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [confirmPopup, setConfirmPopup] = useState({ visible: false, title: '', message: '', targetStatus: '' as any, reqData: null as any });

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@staff_refunds").then(raw => {
      if (raw) {
        let parsed: RefundRequest[] = JSON.parse(raw);
        
        // 1. Dọn rác dữ liệu mẫu cứng cũ
        const fakeIds = ["rf001", "rf002", "rf003"];
        parsed = parsed.filter(r => !fakeIds.includes(r.id));
        
        // 2. FIX LỖI UNKNOWN: Ép các đơn cũ đang kẹt 'processing' về 'pending'
        parsed = parsed.map(r => {
          if ((r.status as any) === 'processing') {
            return { ...r, status: 'pending' };
          }
          return r;
        });
        
        // 3. Sắp xếp theo thời gian mới nhất
        parsed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        // 4. Lưu ngược lại vào máy để dọn sạch lỗi vĩnh viễn
        AsyncStorage.setItem("@staff_refunds", JSON.stringify(parsed)).catch(() => {});
        
        setRefunds(parsed);
      } else {
        setRefunds([]);
      }
    }).catch(() => setRefunds([]));
  }, []));

  const persist = async (updated: RefundRequest[]) => {
    setRefunds(updated);
    await AsyncStorage.setItem("@staff_refunds", JSON.stringify(updated)).catch(() => {});
  };

  const handlePromptUpdate = (req: RefundRequest, newStatus: RefundRequest["status"]) => {
    if (newStatus === "rejected" && !rejectReason.trim()) {
      setShowDetail(false); 
      setTimeout(() => {
        setPopup({ visible: true, type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập lý do từ chối trước khi thực hiện.' });
      }, 350);
      return;
    }
    
    const label = STATUS_META[newStatus].label;
    
    setShowDetail(false);
    setTimeout(() => {
      setConfirmPopup({
        visible: true,
        title: 'Xác nhận xử lý',
        message: `Cập nhật yêu cầu #${req.id} sang trạng thái "${label}"?`,
        targetStatus: newStatus,
        reqData: req
      });
    }, 350);
  };

  const executeUpdateStatus = async () => {
    const { reqData, targetStatus } = confirmPopup;
    setConfirmPopup({ ...confirmPopup, visible: false });

    if (reqData && targetStatus) {
      const updated = refunds.map(r => r.id === reqData.id ? { ...r, status: targetStatus } : r);
      await persist(updated);
      
      if (detail && detail.id === reqData.id) {
        setDetail({ 
          ...detail, 
          status: targetStatus as RefundRequest["status"] 
        });
      }
      
      setShowDetail(false);
      setRejectReason("");
      
      setTimeout(() => {
        setPopup({ visible: true, type: 'success', title: 'Thành công', message: `Đã cập nhật trạng thái yêu cầu #${reqData.id}.` });
      }, 350);
    }
  };

  const filtered = refunds.filter(r => {
    const kw = search.toLowerCase();
    const cName = (r.guestName || r.customerName || "").toLowerCase();
    const matchSearch = !kw || r.id.toLowerCase().includes(kw) || r.tourName.toLowerCase().includes(kw) || cName.includes(kw);
    
    if (!matchSearch) return false;
    if (filter === "Tất cả") return true;
    if (filter === "Chờ duyệt") return r.status === "pending";
    if (filter === "Đã hoàn") return r.status === "approved";
    if (filter === "Từ chối") return r.status === "rejected";
    return true;
  });

  const pendingCount = refunds.filter(r => r.status === "pending").length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Detail Modal */}
      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Chi tiết Yêu cầu</Text>
                  <Text style={s.modalSub}>#{detail.id} · Đặt chỗ: {detail.bookingId}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[s.modalStatusBar, { backgroundColor: STATUS_META[detail.status].bg }]}>
                  <View style={[s.statusDot, { backgroundColor: STATUS_META[detail.status].color }]} />
                  <Text style={[s.modalStatusTxt, { color: STATUS_META[detail.status].color }]}>{STATUS_META[detail.status].label}</Text>
                  {detail.priority === "high" && (
                    <View style={s.priorityBadge}><Text style={s.priorityTxt}>Ưu tiên cao</Text></View>
                  )}
                </View>

                <View style={s.infoSection}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Khách hàng</Text>
                    <Text style={s.detailValue}>{detail.guestName || detail.customerName || "Khách hàng"}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Số điện thoại</Text>
                    <Text style={s.detailValue}>{detail.guestPhone || detail.customerPhone || "---"}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Lý do hủy</Text>
                    <Text style={s.detailValue}>{detail.reason}</Text>
                  </View>
                </View>

                <View style={s.moneyBox}>
                  <View style={s.moneyRow}>
                    <Text style={s.moneyLabel}>Đã thanh toán</Text>
                    <Text style={s.moneyValue}>{fmt(detail.amount)}</Text>
                  </View>
                  <View style={s.moneyRow}>
                    <Text style={s.moneyLabel}>Phí phạt hủy ({100 - detail.refundPercent}%)</Text>
                    <Text style={[s.moneyValue, { color: "#dc2626" }]}>-{fmt(detail.feeAmount)}</Text>
                  </View>
                  <View style={[s.moneyRow, { borderTopWidth: 1, borderTopColor: "#e4ebff", paddingTop: 10, marginTop: 4 }]}>
                    <Text style={[s.moneyLabel, { fontWeight: "800", color: "#1f2a58" }]}>Thực hoàn khách</Text>
                    <Text style={[s.moneyValue, { color: "#16a34a", fontSize: 18, fontWeight: "900" }]}>{fmt(detail.amount - detail.feeAmount)}</Text>
                  </View>
                </View>

                {detail.status === "pending" && (
                  <View style={s.actionSection}>
                    <Text style={s.actionTitle}>Xử lý yêu cầu</Text>
                    <View style={s.actionBtns}>
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#16a34a" }]} onPress={() => handlePromptUpdate(detail, "approved")}>
                        <Text style={s.actionBtnTxt}>Duyệt hoàn tiền</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.rejectBox}>
                      <TextInput 
                        style={s.rejectInput} placeholder="Lý do từ chối (bắt buộc)..." 
                        value={rejectReason} onChangeText={setRejectReason} multiline 
                      />
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dc2626", marginTop: 8 }]} onPress={() => handlePromptUpdate(detail, "rejected")}>
                        <Text style={[s.actionBtnTxt, { color: "#dc2626" }]}>Từ chối yêu cầu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Main UI */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Yêu cầu Hoàn tiền</Text>
        </View>
        {pendingCount > 0 && (
          <View style={s.badgeTop}><Text style={s.badgeTopTxt}>{pendingCount} chờ</Text></View>
        )}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm mã, khách hàng, tour..." value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 60 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="refresh-circle-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có yêu cầu hoàn tiền nào</Text>
          </View>
        ) : (
          filtered.map(r => {
            const meta = STATUS_META[r.status] || { label: "Unknown", color: "#ccc", bg: "#f0f0f0" };
            const imgUrl = r.image || r.tourImage || "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80";
            return (
              <TouchableOpacity key={r.id} style={s.card} activeOpacity={0.8} onPress={() => { setDetail(r); setShowDetail(true); }}>
                <View style={s.cardTop}>
                  <Text style={s.cardId}>#{r.id}</Text>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <View style={s.cardBody}>
                  <Image source={{ uri: imgUrl }} style={s.cardImg} />
                  <View style={s.cardInfo}>
                    <Text style={s.tourName} numberOfLines={2}>{r.tourName}</Text>
                    <Text style={s.guestName}><Ionicons name="person" size={11}/> {r.guestName || r.customerName || "Khách hàng"}</Text>
                    <Text style={s.reason} numberOfLines={1}>Lý do: {r.category}</Text>
                  </View>
                </View>
                <View style={s.cardBottom}>
                  <Text style={s.dateTxt}>{r.createdAt}</Text>
                  <Text style={s.amountTxt}>Hoàn: <Text style={{ color: "#16a34a", fontWeight: "800" }}>{fmt(r.amount - r.feeAmount)}</Text></Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
      <StaffTabBar activeRoute="/staff-refund-management" />

      {/* --- RENDER POPUPS --- */}
      <ConfirmPopup 
        visible={confirmPopup.visible} 
        title={confirmPopup.title} 
        message={confirmPopup.message} 
        isDestructive={confirmPopup.targetStatus === 'rejected'}
        onCancel={() => {
          setConfirmPopup({ ...confirmPopup, visible: false });
          setTimeout(() => setShowDetail(true), 350);
        }} 
        onConfirm={executeUpdateStatus} 
      />
      <Popup 
        visible={popup.visible} 
        type={popup.type} 
        title={popup.title} 
        message={popup.message} 
        onClose={() => {
          setPopup({ ...popup, visible: false });
          if (popup.type === 'error') {
            setTimeout(() => setShowDetail(true), 350);
          }
        }} 
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  badgeTop: { backgroundColor: "#fef9c3", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#fde68a" },
  badgeTopTxt: { color: "#d97706", fontSize: 12, fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyTxt: { color: "#7a8cc2", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardId: { color: "#1f2a58", fontWeight: "800", fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  cardBody: { flexDirection: "row", gap: 12, marginBottom: 12 },
  cardImg: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#eaf0ff" },
  cardInfo: { flex: 1, justifyContent: "center" },
  tourName: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  guestName: { color: "#7a8cc2", fontSize: 12, marginBottom: 2 },
  reason: { color: "#dc2626", fontSize: 11, fontStyle: "italic" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  dateTxt: { color: "#94a8d8", fontSize: 11 },
  amountTxt: { color: "#1f2a58", fontSize: 13, fontWeight: "600" },

  // Modal Detail
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  modalSub: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStatusBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  modalStatusTxt: { fontWeight: "800", fontSize: 14, flex: 1 },
  priorityBadge: { backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityTxt: { color: "#dc2626", fontSize: 10, fontWeight: "700" },
  infoSection: { backgroundColor: "#f8faff", borderRadius: 12, padding: 14, gap: 10, marginBottom: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#7a8cc2", fontSize: 12, flex: 1 },
  detailValue: { color: "#1f2a58", fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },
  moneyBox: { borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 14, gap: 8, marginBottom: 20 },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  moneyLabel: { color: "#5f73a9", fontSize: 13 },
  moneyValue: { color: "#1f2a58", fontSize: 14, fontWeight: "700" },
  actionSection: { borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 16 },
  actionTitle: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 12 },
  actionBtns: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rejectBox: { backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" },
  rejectInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#fca5a5", borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: "top" },

  // Custom Popups Styles
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  popupContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 5 },
  popupTitle: { fontSize: 18, fontWeight: '800', color: '#1f2a58', marginTop: 15, marginBottom: 8, textAlign: 'center' },
  popupMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  popupActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  popupBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 120, alignItems: 'center', justifyContent: 'center' },
  popupBtnTxt: { fontSize: 15, color: 'white', fontWeight: '800' },
});