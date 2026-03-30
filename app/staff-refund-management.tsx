/**
 * app/staff-refund-management.tsx
 * Staff xử lý yêu cầu hủy tour và hoàn tiền
 * ĐÃ FIX LỖI CRASH: An toàn tuyệt đối khi truyền dữ liệu sang trang khác
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { useCallback, useState, useMemo } from "react";
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
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Chờ duyệt",     color: "#d97706", bg: "#fef9c3" },
  approved:   { label: "Đã hoàn tiền",  color: "#16a34a", bg: "#dcfce7" },
  rejected:   { label: "Từ chối",       color: "#dc2626", bg: "#fee2e2" },
};

const FILTERS = ["Tất cả", "Chờ duyệt", "Đã hoàn tiền", "Từ chối"];

export default function StaffRefundManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");

  const [detail, setDetail] = useState<RefundRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: "", message: "", type: "success" });

  useFocusEffect(useCallback(() => {
    const loadRefunds = async () => {
      const raw = await AsyncStorage.getItem("@staff_refunds");
      if (raw) {
        const list = JSON.parse(raw);
        list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRefunds(list);
      }
    };
    loadRefunds();
  }, []));

  const saveRefunds = async (newList: RefundRequest[]) => {
    setRefunds(newList);
    await AsyncStorage.setItem("@staff_refunds", JSON.stringify(newList));
  };

  const handleApprove = () => {
    if (!detail) return;
    const newList = refunds.map(r => r.id === detail.id ? { ...r, status: "approved" as const } : r);
    saveRefunds(newList);
    setDetail({ ...detail, status: "approved" });
    setAlert({ visible: true, title: "Thành công", message: `Đã duyệt hoàn tiền cho đơn ${detail.bookingId}`, type: "success" });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setAlert({ visible: true, title: "Lỗi", message: "Vui lòng nhập lý do từ chối.", type: "error" });
      return;
    }
    const newList = refunds.map(r => r.id === detail?.id ? { ...r, status: "rejected" as const, adminNote: rejectReason } : r);
    saveRefunds(newList);
    setDetail({ ...detail!, status: "rejected" });
    setShowRejectInput(false);
    setAlert({ visible: true, title: "Đã từ chối", message: "Yêu cầu hoàn tiền đã bị từ chối.", type: "success" });
  };

  const filteredData = useMemo(() => {
    return refunds.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const cName = (r.customerName || r.guestName || "").toLowerCase();
      const cPhone = r.customerPhone || r.guestPhone || "";
      const tName = (r.tourName || "").toLowerCase();
      const bId = (r.bookingId || "").toLowerCase();
      
      const matchSearch = !q || bId.includes(q) || tName.includes(q) || cName.includes(q) || cPhone.includes(q);
      const matchStatus = 
        filterStatus === "Tất cả" || 
        (filterStatus === "Chờ duyệt" && r.status === "pending") ||
        (filterStatus === "Đã hoàn tiền" && r.status === "approved") ||
        (filterStatus === "Từ chối" && r.status === "rejected");
        
      return matchSearch && matchStatus;
    });
  }, [refunds, searchQuery, filterStatus]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Xử lý Hoàn tiền</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm mã Booking, Tên tour, Khách hàng..." value={searchQuery} onChangeText={setSearchQuery} />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={18} color="#8ea0d6" /></TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 60 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filterStatus === f && s.filterActive]} onPress={() => setFilterStatus(f)}>
            <Text style={[s.filterTxt, filterStatus === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filteredData.length === 0 ? (
           <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons name="cash-outline" size={60} color="#cbd5e1" />
              <Text style={{ color: "#94a3b8", marginTop: 10 }}>Không có yêu cầu hoàn tiền nào.</Text>
           </View>
        ) : (
          filteredData.map(r => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const cName = r.customerName || r.guestName || "Khách hàng";
            return (
              <TouchableOpacity key={r.id} style={s.card} activeOpacity={0.8} onPress={() => { setDetail(r); setShowRejectInput(false); setRejectReason(""); setShowDetail(true); }}>
                <View style={s.cardHeader}>
                  <Text style={s.bookingId}>Booking: #{r.bookingId}</Text>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg }]}><Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text></View>
                </View>
                <Text style={s.tourName} numberOfLines={1}>{r.tourName || "Chưa xác định"}</Text>
                
                <View style={s.infoGrid}>
                  <View style={s.infoCol}>
                    <Text style={s.infoLbl}>Khách hàng</Text>
                    <Text style={s.infoVal} numberOfLines={1}>{cName}</Text>
                  </View>
                  <View style={s.infoCol}>
                    <Text style={s.infoLbl}>Số tiền hoàn</Text>
                    <Text style={[s.infoVal, { color: "#ef4444" }]}>{r.amount?.toLocaleString("vi-VN")}đ</Text>
                  </View>
                </View>
                
                <View style={s.cardFooter}>
                  <Text style={s.dateTxt}>{r.createdAt}</Text>
                  {r.priority === "high" && <View style={s.prioBadge}><Text style={s.prioTxt}>GẤP</Text></View>}
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Chi tiết Yêu cầu Hoàn tiền</Text>
                  <Text style={s.modalSub}>Phiếu YC: #{detail.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[s.modalStatusBar, { backgroundColor: STATUS_META[detail.status].bg }]}>
                  <Text style={[s.modalStatusTxt, { color: STATUS_META[detail.status].color }]}>Trạng thái: {STATUS_META[detail.status].label}</Text>
                </View>

                {/* FIX CHỐNG CRASH CHO KHU VỰC TRA CỨU */}
                <View style={s.crossLinkSection}>
                   <Text style={s.crossLinkTitle}>Tra cứu thông tin đối chứng</Text>
                   <TouchableOpacity style={s.linkBtn} onPress={() => { 
                       setShowDetail(false); 
                       if (detail.bookingId) router.push({ pathname: '/shared-booking-detail', params: { bookingId: detail.bookingId } } as any); 
                   }}>
                     <Ionicons name="receipt" size={16} color="#2856d6" />
                     <Text style={s.linkBtnTxt}>Xem Đơn đặt Tour gốc (#{detail.bookingId})</Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity style={[s.linkBtn, {backgroundColor: '#fef2f2', borderColor: '#fecaca'}]} onPress={() => { 
                       setShowDetail(false); 
                       if (detail.bookingId) router.push({ pathname: '/staff-complaints', params: { search: detail.bookingId } } as any); 
                       else router.push('/staff-complaints' as any);
                   }}>
                     <Ionicons name="warning" size={16} color="#dc2626" />
                     <Text style={[s.linkBtnTxt, {color: '#dc2626'}]}>Kiểm tra Khiếu nại liên quan</Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity style={[s.linkBtn, {backgroundColor: '#f3e8ff', borderColor: '#e9d5ff'}]} onPress={() => { 
                       setShowDetail(false); 
                       if (detail.tourName) router.push({ pathname: '/staff-review-moderation', params: { search: detail.tourName } } as any); 
                       else router.push('/staff-review-moderation' as any);
                   }}>
                     <Ionicons name="star" size={16} color="#7c3aed" />
                     <Text style={[s.linkBtnTxt, {color: '#7c3aed'}]}>Đánh giá của khách về Tour này</Text>
                   </TouchableOpacity>
                </View>

                <View style={s.infoBox}>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Tên Tour</Text><Text style={s.detailValue}>{detail.tourName || "---"}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Khách hàng</Text><Text style={s.detailValue}>{detail.customerName || detail.guestName}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Liên hệ</Text><Text style={s.detailValue}>{detail.customerPhone || detail.guestPhone}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Lý do hủy</Text><Text style={s.detailValue}>{detail.category}</Text></View>
                </View>

                <View style={s.descBox}>
                  <Text style={s.descTitle}>Chi tiết yêu cầu từ khách</Text>
                  <Text style={s.descContent}>{detail.reason}</Text>
                </View>

                <View style={s.financialBox}>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Tiền hoàn ({detail.refundPercent}%)</Text><Text style={[s.detailValue, { color: "#ef4444", fontSize: 16 }]}>{detail.amount?.toLocaleString("vi-VN")}đ</Text></View>
                  <View style={s.detailRow}><Text style={s.detailLabel}>Phí hủy tour</Text><Text style={s.detailValue}>{detail.feeAmount?.toLocaleString("vi-VN")}đ</Text></View>
                </View>

                {detail.status === "pending" && (
                  <View style={s.actionSection}>
                    <Text style={s.actionTitle}>Quyết định phê duyệt</Text>
                    {showRejectInput ? (
                      <View style={s.rejectBox}>
                        <TextInput style={s.rejectInput} placeholder="Lý do từ chối hoàn tiền..." value={rejectReason} onChangeText={setRejectReason} multiline />
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#f1f5f9", flex: 1 }]} onPress={() => setShowRejectInput(false)}><Text style={[s.actionBtnTxt, { color: "#64748b" }]}>Hủy</Text></TouchableOpacity>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#dc2626", flex: 1 }]} onPress={handleReject}><Text style={s.actionBtnTxt}>Xác nhận Từ chối</Text></TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={s.actionBtns}>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" }]} onPress={() => setShowRejectInput(true)}><Text style={[s.actionBtnTxt, { color: "#dc2626" }]}>Từ chối</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#10b981" }]} onPress={handleApprove}><Text style={s.actionBtnTxt}>Đồng ý Hoàn tiền</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={alert.visible} transparent animationType="fade">
        <View style={s.popupOverlayAlert}>
          <View style={s.popupContentAlert}>
            <Ionicons name={alert.type === "success" ? "checkmark-circle" : "warning"} size={50} color={alert.type === "success" ? "#10b981" : "#ef4444"} />
            <Text style={s.popupTitleAlert}>{alert.title}</Text>
            <Text style={{ textAlign: "center", color: "#64748b", marginBottom: 20 }}>{alert.message}</Text>
            <TouchableOpacity style={s.popupBtnAlert} onPress={() => setAlert({ ...alert, visible: false })}><Text style={s.popupBtnTxtAlert}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StaffTabBar activeRoute="/staff-refund-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginLeft: 12 },
  
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, height: 46, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14, height: '100%' },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  bookingId: { color: "#1f2a58", fontWeight: "900", fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  tourName: { color: "#1f2a58", fontWeight: "700", fontSize: 16, marginBottom: 12 },
  infoGrid: { flexDirection: "row", backgroundColor: "#f8faff", borderRadius: 10, padding: 10, marginBottom: 12 },
  infoCol: { flex: 1 },
  infoLbl: { fontSize: 11, color: "#7a8cc2", marginBottom: 2 },
  infoVal: { fontSize: 13, fontWeight: "700", color: "#1f2a58" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  dateTxt: { color: "#94a8d8", fontSize: 11 },
  prioBadge: { backgroundColor: "#fee2e2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  prioTxt: { color: "#dc2626", fontSize: 9, fontWeight: "800" },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  modalSub: { fontSize: 12, color: "#7a8cc2", marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalStatusBar: { flexDirection: "row", justifyContent: "center", padding: 12, borderRadius: 12, marginBottom: 16 },
  modalStatusTxt: { fontWeight: "800", fontSize: 14 },
  
  crossLinkSection: { marginBottom: 16, gap: 8 },
  crossLinkTitle: { fontSize: 13, fontWeight: "800", color: "#94a8d8", textTransform: 'uppercase', marginBottom: 4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eaf0ff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#dbeafe' },
  linkBtnTxt: { color: '#2856d6', fontWeight: '700', fontSize: 13 },

  infoBox: { backgroundColor: "#f8faff", borderRadius: 12, padding: 14, gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#7a8cc2", fontSize: 13 },
  detailValue: { color: "#1f2a58", fontSize: 14, fontWeight: "700", maxWidth: '70%', textAlign: 'right' },
  descBox: { backgroundColor: "#fff9f9", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#ffe4e6", marginTop: 16 },
  descTitle: { color: "#dc2626", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  descContent: { color: "#1f2a58", fontSize: 14, lineHeight: 20 },
  financialBox: { backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14, marginTop: 16, gap: 10, borderWidth: 1, borderColor: "#bbf7d0" },
  
  actionSection: { borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 20, marginTop: 20 },
  actionTitle: { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 12 },
  actionBtns: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  actionBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
  rejectBox: { backgroundColor: "#fef2f2", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#fecaca" },
  rejectInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#fca5a5", borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: "top", fontSize: 14 },

  popupOverlayAlert: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popupContentAlert: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', elevation: 10 },
  popupTitleAlert: { fontSize: 18, fontWeight: '900', color: '#1f2a58', marginTop: 16, marginBottom: 8 },
  popupBtnAlert: { width: '100%', height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  popupBtnTxtAlert: { color: '#64748b', fontWeight: '800', fontSize: 15 },
});