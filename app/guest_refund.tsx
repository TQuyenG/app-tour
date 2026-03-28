/**
 * app/guest_refund.tsx
 * Khách yêu cầu hoàn tiền và theo dõi trạng thái
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
  Modal, // <-- THÊM CHỮ NÀY VÀO ĐÂY
} from "react-native";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Booking {
  id: string; tourName: string; totalAmount: number;
  status: string; tourDate: string; guideName?: string;
}
interface RefundRequest {
  id: string; bookingId: string; tourName: string;
  amount: number; reason: string; reasonType: string;
  status: "pending" | "approved" | "rejected" | "processing";
  createdAt: string; resolvedAt?: string; note?: string;
}

const REASON_TYPES = [
  { id: "cancel",   label: "Tôi muốn hủy tour",          icon: "close-circle-outline",  color: "#dc2626" },
  { id: "guide",    label: "Vấn đề với HDV",              icon: "person-outline",        color: "#8b5cf6" },
  { id: "quality",  label: "Chất lượng không đúng mô tả", icon: "alert-circle-outline",  color: "#f59e0b" },
  { id: "payment",  label: "Lỗi thanh toán / tính 2 lần", icon: "card-outline",          color: "#ef4444" },
  { id: "weather",  label: "Tour bị hủy do thời tiết",    icon: "thunderstorm-outline",  color: "#06b6d4" },
  { id: "other",    label: "Lý do khác",                  icon: "help-circle-outline",   color: "#64748b" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: "Chờ duyệt",    color: "#d97706", bg: "#fef9c3", icon: "time-outline" },
  approved:   { label: "Đã duyệt",     color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  rejected:   { label: "Từ chối",      color: "#dc2626", bg: "#fee2e2", icon: "close-circle-outline" },
  processing: { label: "Đang xử lý",  color: "#2856d6", bg: "#eaf0ff", icon: "refresh-outline" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

const TOUR_IMAGES: Record<string, string> = {
  "rf001": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "rf002": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "rf003": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80",
  "rf004": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
  "rf005": "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&q=80",
  "rf006": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
  "rf007": "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80",
  "rf008": "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&q=80",
};

// Fallback ảnh theo tên tour
function getTourImageByName(tourName: string): string {
  const name = tourName.toLowerCase();
  if (name.includes("hội an"))   return "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80";
  if (name.includes("nha trang")) return "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80";
  if (name.includes("phú quốc")) return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80";
  if (name.includes("đà nẵng") || name.includes("da nang")) return "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80";
  if (name.includes("sapa") || name.includes("sa pa")) return "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&q=80";
  if (name.includes("hạ long"))  return "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80";
  if (name.includes("đà lạt"))   return "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80";
  if (name.includes("huế"))      return "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&q=80";
  return "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80";
}

const SEED_REFUNDS: RefundRequest[] = [
  { id: "rf001", bookingId: "BK001001", tourName: "Đà Lạt 3N2Đ - Thành phố ngàn hoa",    amount: 2990000,  reason: "Gia đình có việc đột xuất, tôi bị sốt cao không đi được",           reasonType: "cancel",  status: "approved",   createdAt: "05/04/2026", resolvedAt: "07/04/2026", note: "Đã duyệt hoàn 80% theo chính sách hủy trước 3 ngày." },
  { id: "rf002", bookingId: "BK001002", tourName: "Phú Quốc 4N3Đ - Resort biển xanh",     amount: 4690000,  reason: "HDV không đúng hẹn, đến trễ 2 tiếng so với lịch hẹn",              reasonType: "guide",   status: "pending",    createdAt: "12/04/2026" },
  { id: "rf005", bookingId: "BK001005", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan",          amount: 3500000,  reason: "Dịch vụ không đúng mô tả, thiếu 2 bữa ăn, phòng khách sạn sai loại", reasonType: "quality", status: "pending",    createdAt: "13/04/2026" },
  { id: "rf003", bookingId: "BK001003", tourName: "Sapa 3N2Đ - Mùa lúa chín",             amount: 3590000,  reason: "Tour bị hủy do thời tiết xấu, mưa lớn liên tục",                   reasonType: "weather", status: "approved",   createdAt: "08/04/2026", resolvedAt: "09/04/2026", note: "Hoàn 100% do lỗi thời tiết bất khả kháng." },
  { id: "rf008", bookingId: "BK001008", tourName: "Đà Nẵng 3N2Đ - Cầu Vàng kỳ vĩ",       amount: 3600000,  reason: "Thẻ bị tính tiền 2 lần khi thanh toán, cần hoàn lại 1 lần",          reasonType: "payment", status: "processing", createdAt: "10/04/2026" },
];

export default function GuestRefund() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab]               = useState<"request" | "history">("history");
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [refunds, setRefunds]       = useState<RefundRequest[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedReason, setSelectedReason]   = useState("");
  const [reasonText, setReasonText]           = useState("");
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

 useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // 1. Load danh sách Bookings để chọn
          const rawBookings = await AsyncStorage.getItem("@guest_bookings");
          if (rawBookings) {
            const all = JSON.parse(rawBookings);
            const eligible = all.filter((b: any) =>
              ["completed", "cancelled", "on_tour", "paid", "guide_accepted", "done", "checked_in", "checked-in", "on-tour", "accepted"].includes(b.status)
            );
            setBookings(eligible);
          }

          // 2. Load danh sách Refund (Lịch sử)
          const rawRefunds = await AsyncStorage.getItem("@guest_refunds");
          if (rawRefunds) {
            const parsed = JSON.parse(rawRefunds);
            // Nếu có dữ liệu trong máy thì dùng dữ liệu đó
            setRefunds(parsed);
          } else {
            // Nếu máy chưa có gì (lần đầu) mới dùng dữ liệu mẫu SEED_REFUNDS
            setRefunds(SEED_REFUNDS);
            await AsyncStorage.setItem("@guest_refunds", JSON.stringify(SEED_REFUNDS));
          }
        } catch (error) {
          console.error("Lỗi khi tải dữ liệu:", error);
        }
      };

      loadData();
    }, [])
  );

  const submitRefund = async () => {
    // 1. Kiểm tra nhanh đầu vào (Validation)
    if (!selectedReason) { 
      alert("Vui lòng chọn lý do hoàn tiền."); // Dùng alert thuần của web để test nhanh
      return; 
    }
    if (!reasonText.trim()) { 
      alert("Vui lòng nhập mô tả chi tiết."); 
      return; 
    }

    // 2. Xác định thông tin Booking (Nếu không chọn thì lấy mặc định)
    const bookingRef = selectedBooking || {
      id: `BK-MANUAL-${Date.now()}`,
      tourName: "Yêu cầu hoàn tiền",
      totalAmount: 0,
    };

    try {
      // 3. Tạo đối tượng Refund mới
      const newRefund: RefundRequest = {
        id: `rf${Date.now()}`,
        bookingId: bookingRef.id,
        tourName:  bookingRef.tourName,
        amount:    bookingRef.totalAmount,
        reason:    reasonText.trim(),
        reasonType: selectedReason,
        status:    "pending",
        createdAt: new Date().toLocaleDateString("vi-VN"),
      };

      // 4. Lưu vào Storage (Lấy dữ liệu cũ -> Thêm mới -> Ghi đè)
      const raw = await AsyncStorage.getItem("@guest_refunds");
      const list = raw ? JSON.parse(raw) : [];
      const updatedList = [newRefund, ...list];
      await AsyncStorage.setItem("@guest_refunds", JSON.stringify(updatedList));

      // 5. Cập nhật giao diện ngay lập tức
      setRefunds(updatedList);
      setSelectedBooking(null);
      setSelectedReason("");
      setReasonText("");

      // 6. Hiện Modal thông báo đẹp mắt
      setShowSuccessModal(true);
      
      // Tự động chuyển tab sau khi lưu (tùy chọn, hoặc để khách nhấn nút mới chuyển)
      // setTab("history");

    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Yêu cầu Hoàn tiền</Text>
        {refunds.filter(r => r.status === "pending").length > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingBadgeTxt}>{refunds.filter(r=>r.status==="pending").length} chờ</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Tổng yêu cầu", value: refunds.length,                                  color: "#2856d6" },
          { label: "Chờ duyệt",    value: refunds.filter(r=>r.status==="pending").length,   color: "#d97706" },
          { label: "Đã duyệt",     value: refunds.filter(r=>r.status==="approved").length,  color: "#16a34a" },
          { label: "Tổng hoàn",    value: `${(refunds.filter(r=>r.status==="approved").reduce((s,r)=>s+r.amount,0)/1000000).toFixed(1)}tr`, color: "#4f7cff" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")}>
          <Text style={[s.tabBtnTxt, tab === "history" && s.tabBtnTxtActive]}>Lịch sử ({refunds.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "request" && s.tabBtnActive]} onPress={() => setTab("request")}>
          <Ionicons name="add-circle-outline" size={14} color={tab === "request" ? "#fff" : "#7a8cc2"} />
          <Text style={[s.tabBtnTxt, tab === "request" && s.tabBtnTxtActive]}>Tạo yêu cầu mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        {tab === "history" ? (
          <>
            {refunds.length === 0 && (
              <View style={s.emptyCard}>
                <Ionicons name="refresh-outline" size={48} color="#c0cbe8" />
                <Text style={s.emptyTxt}>Chưa có yêu cầu hoàn tiền nào</Text>
                <TouchableOpacity style={s.newBtn} onPress={() => setTab("request")}>
                  <Text style={s.newBtnTxt}>Tạo yêu cầu mới</Text>
                </TouchableOpacity>
              </View>
            )}
            {refunds.map(r => {
              const meta = STATUS_META[r.status];
              const reasonMeta = REASON_TYPES.find(x => x.id === r.reasonType);
              const imgUrl = TOUR_IMAGES[r.id] || getTourImageByName(r.tourName);
              const refundAmt = r.status === "approved" ? r.amount : null;
              const isExpanded = expandedId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={s.card}
                  onPress={() => setExpandedId(isExpanded ? null : r.id)}
                  activeOpacity={0.92}
                >
                  {/* Ảnh tour banner */}
                  <View style={s.cardImgWrap}>
                    <Image source={{ uri: imgUrl }} style={s.cardImg} resizeMode="cover" />
                    <View style={s.cardImgOverlay} />
                    <View style={[s.statusBadgeFloat, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={s.cardImgId}>#{r.id}</Text>
                    {/* Nút mở rộng */}
                    <View style={s.expandBtn}>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#fff" />
                    </View>
                  </View>

                  <View style={s.cardBody}>
                    <Text style={s.tourName}>{r.tourName}</Text>

                    {/* Số tiền */}
                    <View style={s.amountRow2}>
                      <View>
                        <Text style={s.amountLabelSm}>Giá trị yêu cầu</Text>
                        <Text style={s.amount}>{fmt(r.amount)}</Text>
                      </View>
                      {refundAmt !== null && (
                        <View style={s.refundAmtBox}>
                          <Text style={s.refundAmtLabel}>Đã hoàn</Text>
                          <Text style={s.refundAmt}>{fmt(refundAmt)}</Text>
                        </View>
                      )}
                    </View>

                    {/* Lý do (luôn hiện) */}
                    {reasonMeta && (
                      <View style={[s.reasonRow, { backgroundColor: reasonMeta.color + "12", borderRadius: 8, padding: 6, marginBottom: 6 }]}>
                        <Ionicons name={reasonMeta.icon as any} size={13} color={reasonMeta.color} />
                        <Text style={[s.reasonTxt, { color: reasonMeta.color, fontWeight: "700" }]}>{reasonMeta.label}</Text>
                      </View>
                    )}
                    <Text style={s.descTxt} numberOfLines={isExpanded ? undefined : 2}>{r.reason}</Text>

                    {/* Chi tiết mở rộng */}
                    {isExpanded && (
                      <>
                        {/* Mã booking */}
                        <View style={s.detailRow}>
                          <Ionicons name="receipt-outline" size={13} color="#7a8cc2" />
                          <Text style={s.detailLabel}>Mã booking:</Text>
                          <Text style={s.detailValue}>{r.bookingId || `BK-${r.id}`}</Text>
                        </View>

                        {/* Chính sách áp dụng */}
                        <View style={[s.policyMiniBox, { marginBottom: 8 }]}>
                          <Ionicons name="shield-checkmark-outline" size={13} color="#16a34a" />
                          <Text style={s.policyMiniTxt}>
                            {r.status === "approved"
                              ? "✅ Hoàn 80% theo chính sách hủy trước 3 ngày"
                              : r.status === "rejected"
                              ? "❌ Không đủ điều kiện hoàn theo chính sách"
                              : r.status === "processing"
                              ? "⏳ Đang chuyển Kế toán xử lý – 3-5 ngày"
                              : "📋 Hủy trước 3 ngày: 80% · 1 ngày: 50% · Cùng ngày: 20%"}
                          </Text>
                        </View>

                        {/* Ghi chú staff/admin */}
                        {r.note && (
                          <View style={s.noteBox}>
                            <Ionicons name="information-circle-outline" size={13} color="#2856d6" />
                            <Text style={s.noteTxt}>{r.note}</Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Ngày */}
                    <View style={s.dateRow}>
                      <View style={s.datePill}>
                        <Ionicons name="calendar-outline" size={11} color="#7a8cc2" />
                        <Text style={s.dateTxt}>Gửi: {r.createdAt}</Text>
                      </View>
                      {r.resolvedAt && (
                        <View style={[s.datePill, { backgroundColor: "#dcfce7" }]}>
                          <Ionicons name="checkmark-circle-outline" size={11} color="#16a34a" />
                          <Text style={[s.dateTxt, { color: "#16a34a" }]}>Xong: {r.resolvedAt}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <>
            {/* Bước 1: Chọn booking — tuỳ chọn, không bắt buộc */}
            <Text style={s.stepTitle}>1. Chọn booking (tuỳ chọn)</Text>
            {bookings.length === 0 ? (
              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={16} color="#4f7cff" />
                <Text style={s.hintTxt}>Không tìm thấy booking. Bạn vẫn có thể gửi yêu cầu không kèm booking.</Text>
              </View>
            ) : (
              bookings.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[s.bookingPick, selectedBooking?.id === b.id && s.bookingPickActive]}
                  onPress={() => setSelectedBooking(b)}
                >
                  {/* Ảnh thumbnail tour */}
                  <View style={s.bookingPickThumb}>
                    <Image
                      source={{ uri: getTourImageByName(b.tourName) }}
                      style={s.bookingPickThumbImg}
                      resizeMode="cover"
                    />
                    {selectedBooking?.id === b.id && (
                      <View style={s.bookingPickThumbOverlay}>
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bookingPickName, selectedBooking?.id === b.id && { color: "#fff" }]} numberOfLines={1}>{b.tourName}</Text>
                    <Text style={[s.bookingPickMeta, selectedBooking?.id === b.id && { color: "rgba(255,255,255,0.8)" }]}>#{b.id} · {fmt(b.totalAmount)}</Text>
                  </View>
                  {selectedBooking?.id === b.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              ))
            )}

            {/* Bước 2: Chọn lý do */}
            <Text style={s.stepTitle}>2. Lý do hoàn tiền</Text>
            <View style={s.reasonGrid}>
              {REASON_TYPES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.reasonCard, selectedReason === r.id && s.reasonCardActive, selectedReason === r.id && { borderColor: r.color }]}
                  onPress={() => setSelectedReason(r.id)}
                >
                  <Ionicons name={r.icon as any} size={20} color={selectedReason === r.id ? r.color : "#94a3b8"} />
                  <Text style={[s.reasonLabel, selectedReason === r.id && { color: r.color, fontWeight: "700" }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bước 3: Mô tả chi tiết */}
            <Text style={s.stepTitle}>3. Mô tả chi tiết</Text>
            <TextInput
              style={s.reasonInput}
              value={reasonText}
              onChangeText={setReasonText}
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải để CSKH xử lý nhanh hơn..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#b0bdd8"
            />

            <View style={s.policyBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" />
              <Text style={s.policyTxt}>Hủy trước 3 ngày: hoàn 80% · Hủy trước 1 ngày: hoàn 50% · Hủy cùng ngày: hoàn 20%</Text>
            </View>

            <TouchableOpacity
              style={[
                s.submitBtn, 
                (!selectedReason || !reasonText.trim()) && { opacity: 0.7 } // Làm mờ nhẹ nếu chưa đủ thông tin
              ]}
              onPress={submitRefund} // Gọi trực tiếp hàm submitRefund
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={s.submitBtnTxt}>Gửi yêu cầu hoàn tiền</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      {/* ── Modal thông báo thành công đẹp mắt ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.successCard}>
            <View style={s.successIconCircle}>
              <Ionicons name="checkmark-sharp" size={40} color="#fff" />
            </View>
            <Text style={s.successTitle}>Gửi thành công!</Text>
            <Text style={s.successSub}>Yêu cầu hoàn tiền của bạn đã được hệ thống ghi nhận và đang chờ xử lý.</Text>
            
            <TouchableOpacity 
              style={s.successBtn} 
              onPress={() => {
                setShowSuccessModal(false);
                setTab("history"); // Chuyển sang lịch sử sau khi đóng
              }}
            >
              <Text style={s.successBtnTxt}>Xem lịch sử ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View> // Kết thúc thẻ View của toàn bộ screen
  );
} // Kết thúc function GuestRefund



const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  pendingBadge:    { backgroundColor: "#fef9c3", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  summaryRow:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:     { alignItems: "center", flex: 1 },
  summaryValue:    { fontSize: 16, fontWeight: "900" },
  summaryLabel:    { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  tabRow:          { flexDirection: "row", margin: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff" },
  tabBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabBtnActive:    { backgroundColor: "#4f7cff" },
  tabBtnTxt:       { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  tabBtnTxtActive: { color: "#fff" },
  content:         { padding: 14, paddingTop: 0 },
  emptyCard:       { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:        { color: "#7a8cc2" },
  newBtn:          { backgroundColor: "#4f7cff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  newBtnTxt:       { color: "#fff", fontWeight: "700" },
  card:            { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden", marginBottom: 12, shadowColor: "#a0b4e8", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.13, shadowRadius: 8, elevation: 3 },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardId:          { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  statusBadge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt:       { fontSize: 11, fontWeight: "700" },
  tourName:        { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 3 },
  amount:          { color: "#dc2626", fontWeight: "900", fontSize: 16, marginBottom: 6 },
  reasonRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  reasonTxt:       { color: "#5f73a9", fontSize: 12, fontWeight: "600" },
  descTxt:         { color: "#7a8cc2", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  noteBox:         { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#eaf0ff", borderRadius: 8, padding: 8, marginBottom: 6 },
  noteTxt:         { flex: 1, color: "#2856d6", fontSize: 11, lineHeight: 16 },
  dateRow:         { flexDirection: "row", justifyContent: "space-between" },
  dateTxt:         { color: "#94a3b8", fontSize: 11 },
  stepTitle:       { color: "#1f2a58", fontWeight: "800", fontSize: 15, marginBottom: 10, marginTop: 6 },
  hintBox:         { flexDirection: "row", gap: 8, backgroundColor: "#edf2ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  hintTxt:         { flex: 1, color: "#4f7cff", fontSize: 13 },
  bookingPick:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  bookingPickActive:{ backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  bookingPickIcon:          { width: 38, height: 38, borderRadius: 12, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  bookingPickThumb:         { width: 52, height: 52, borderRadius: 12, overflow: "hidden", position: "relative" },
  bookingPickThumbImg:      { width: "100%", height: "100%" },
  bookingPickThumbOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(79,124,255,0.55)", alignItems: "center", justifyContent: "center" },  bookingPickName: { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  bookingPickMeta: { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  reasonGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  reasonCard:      { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e4ebff", padding: 10 },
  reasonCardActive:{ backgroundColor: "#f8faff" },
  reasonLabel:     { flex: 1, color: "#7a8cc2", fontSize: 11, lineHeight: 16 },
  reasonInput:     { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 14, minHeight: 110, marginBottom: 12 },
  policyBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, marginBottom: 14 },
  policyTxt:       { flex: 1, color: "#166534", fontSize: 12, lineHeight: 18 },
  submitBtn:       { height: 52, borderRadius: 14, backgroundColor: "#4f7cff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  submitBtnOff:    { backgroundColor: "#c0cbe8", elevation: 0, shadowOpacity: 0 },
  submitBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Card ảnh
  cardImgWrap:     { borderRadius: 14, overflow: "hidden", height: 140, marginBottom: 0 },
  cardImg:         { width: "100%", height: "100%" },
  cardImgOverlay:  { position: "absolute", bottom: 0, left: 0, right: 0, height: 60, backgroundColor: "rgba(15,25,60,0.35)" },
  cardImgId:       { position: "absolute", bottom: 10, left: 12, color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.9 },
  statusBadgeFloat:{ position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cardBody:        { padding: 12 },
  amountRow2:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  amountLabelSm:   { color: "#94a3b8", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  refundAmtBox:    { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "flex-end" },
  refundAmtLabel:  { color: "#16a34a", fontSize: 10, fontWeight: "600" },
  refundAmt:       { color: "#16a34a", fontWeight: "900", fontSize: 14 },
  datePill:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f7ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  expandBtn:       { position: "absolute", bottom: 10, right: 12, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 10, padding: 4 },
  detailRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  detailLabel:     { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  detailValue:     { color: "#1f2a58", fontSize: 11, fontWeight: "700", flex: 1 },
  policyMiniBox:   { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8 },
  policyMiniTxt:   { flex: 1, color: "#166534", fontSize: 11, lineHeight: 16 },
  // Styles mới cho Modal thành công
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 25, 88, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 6, borderColor: '#dcfce7' },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#1f2a58', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#7a8cc2', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  successBtn: { backgroundColor: '#4f7cff', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 16, width: '100%', alignItems: 'center' },
  successBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});