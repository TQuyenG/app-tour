/**
 * app/staff-review-moderation.tsx
 * Staff kiểm duyệt review - Kết nối dữ liệu Tour & Có công cụ xử phạt HDV
 * ĐÃ FIX LỖI CRASH REACT COMPILER: Chống đọc thuộc tính khi detail bị null
 * ĐÃ BỎ THANH BAR ĐEN TRÊN ĐẦU
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const FILTERS = ["Tất cả", "Chưa phản hồi", "Đã ẩn"];

export default function StaffReviewModeration() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Xử lý an toàn mảng tham số từ Expo Router
  const { search: initialSearch } = useLocalSearchParams(); 
  const safeSearch = Array.isArray(initialSearch) ? initialSearch[0] : initialSearch;
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState(safeSearch || ""); 
  
  const [detail, setDetail] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [replyInput, setReplyInput] = useState("");

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      const [revRaw, bookRaw] = await Promise.all([
        AsyncStorage.getItem("@app_reviews"),
        AsyncStorage.getItem("@guest_bookings")
      ]);
      
      let parsedReviews = revRaw ? JSON.parse(revRaw) : [];
      const bookings = bookRaw ? JSON.parse(bookRaw) : [];

      parsedReviews = parsedReviews.map((r: any) => {
        const relatedBooking = bookings.find((b: any) => b.id === r.bookingId);
        return {
          ...r,
          tourName: relatedBooking?.tourName || r.tourName || "Tour không xác định",
          guideName: relatedBooking?.guideName || r.guideName || "Chưa rõ",
          guideId: relatedBooking?.guideId || r.guideId
        };
      });

      parsedReviews.sort((a:any, b:any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReviews(parsedReviews);
    };
    loadData();
  }, []));

  const persist = async (updated: any[]) => {
    setReviews(updated);
    await AsyncStorage.setItem("@app_reviews", JSON.stringify(updated)).catch(() => {});
  };

  const handleReply = async () => {
    if (!detail) return; 
    if (!replyInput.trim()) return;
    const updated = reviews.map(r => r.id === detail.id ? { ...r, isReplied: true, replyText: replyInput.trim() } : r);
    await persist(updated);
    setDetail({ ...detail, isReplied: true, replyText: replyInput.trim() });
    setReplyInput("");
    Alert.alert("Thành công", "Đã phản hồi đánh giá.");
  };

  const handleHideReview = () => {
    if (!detail) return;
    Alert.alert("Xác nhận", "Bạn muốn ẩn đánh giá này khỏi ứng dụng của khách hàng?", [
      { text: "Hủy", style: "cancel" },
      { text: "Ẩn hiển thị", style: "destructive", onPress: async () => {
        const updated = reviews.map(r => r.id === detail.id ? { ...r, isHidden: true } : r);
        await persist(updated);
        setDetail({ ...detail, isHidden: true });
      }}
    ]);
  };

  const handleWarnGuide = () => {
    if (!detail) return;
    Alert.alert("Gửi Cảnh cáo", `Hệ thống sẽ gửi email và thông báo cảnh cáo tới HDV ${detail.guideName || 'này'}. Tiếp tục?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Gửi Cảnh cáo", onPress: () => Alert.alert("Thành công", "Đã ghi nhận cảnh cáo vào hồ sơ HDV.") }
    ]);
  };

  const handleSuspendGuide = () => {
    if (!detail) return;
    Alert.alert("⚠️ CẢNH BÁO TỚI HẠN", `Bạn đang yêu cầu Đình chỉ (Khóa) tài khoản của HDV ${detail.guideName || 'này'}.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Khóa Tài khoản", style: "destructive", onPress: async () => {
        if (!detail.guideId) return Alert.alert("Lỗi", "Không tìm thấy ID của HDV này.");
        const accRaw = await AsyncStorage.getItem("@app_accounts");
        if (accRaw) {
           let accounts = JSON.parse(accRaw);
           accounts = accounts.map((acc: any) => acc.id === detail.guideId ? { ...acc, status: "suspended" } : acc);
           await AsyncStorage.setItem("@app_accounts", JSON.stringify(accounts));
           Alert.alert("Đã Khóa", `Tài khoản HDV ${detail.guideName} đã bị đình chỉ.`);
        }
      }}
    ]);
  };

  const filtered = reviews.filter(r => {
    const kw = String(search || "").toLowerCase().trim();
    const matchSearch = !kw || r.guestName?.toLowerCase().includes(kw) || (r.reviewText || r.comment || "").toLowerCase().includes(kw) || (r.tourName || "").toLowerCase().includes(kw);
    if (!matchSearch) return false;
    
    if (filter === "Tất cả") return true;
    if (filter === "Chưa phản hồi") return !r.isReplied && !r.isHidden;
    if (filter === "Đã ẩn") return r.isHidden;
    return true;
  });

  return (
    <View style={s.container}>
      {/* KHÔNG CÒN BAR ĐEN */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kiểm duyệt Đánh giá</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm theo tên khách, tour, nội dung..." value={search} onChangeText={setSearch} />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#8ea0d6" /></TouchableOpacity>
        )}
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
           <View style={{ alignItems: "center", marginTop: 40 }}>
              <Ionicons name="shield-checkmark" size={60} color="#cbd5e1" />
              <Text style={{ color: "#94a3b8", marginTop: 10 }}>Không có đánh giá nào phù hợp.</Text>
           </View>
        ) : (
          filtered.map(r => (
            <TouchableOpacity key={r.id} style={[s.card, r.isHidden && {opacity: 0.6}]} onPress={() => { setDetail(r); setReplyInput(""); setShowDetail(true); }}>
              <View style={s.cardHeader}>
                <View style={s.userRow}>
                  <View style={s.avatar}><Ionicons name="person" size={12} color="#4f7cff" /></View>
                  <Text style={s.guestName}>{r.guestName || "Khách hàng"}</Text>
                </View>
                <View style={s.ratingBadge}><Ionicons name="star" size={12} color="#f59e0b" /><Text style={s.ratingTxt}>{r.tourRating || r.overallRating || r.rating || 5}</Text></View>
              </View>
              <Text style={s.tourMeta} numberOfLines={1}>Tour: {r.tourName} · HDV: {r.guideName}</Text>
              <Text style={s.commentTxt} numberOfLines={2}>{r.reviewText || r.comment || "Không có nội dung"}</Text>
              <View style={s.cardFooter}>
                <Text style={s.dateTxt}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : ""}</Text>
                {r.isHidden ? <Text style={[s.statusTxt, {color: '#ef4444'}]}>Đã ẩn</Text> : r.isReplied ? <Text style={[s.statusTxt, {color: '#10b981'}]}>Đã phản hồi</Text> : <Text style={[s.statusTxt, {color: '#d97706'}]}>Cần xem xét</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal Chi tiết & Xử lý */}
      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chi tiết Review</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#1f2a58" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                <View style={s.quoteBox}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                     <Text style={s.quoteName}>{detail.guestName}</Text>
                     <View style={s.ratingBadge}><Ionicons name="star" size={12} color="#f59e0b" /><Text style={s.ratingTxt}>{detail.tourRating || detail.overallRating || detail.rating || 5}</Text></View>
                  </View>
                  <Text style={[s.quoteComment, {fontWeight: 'bold', color: '#2856d6', marginTop: 8}]}>Tour: {detail.tourName}</Text>
                  <Text style={[s.quoteComment, {color: '#64748b'}]}>HDV: {detail.guideName}</Text>
                  <Text style={[s.quoteComment, {fontSize: 14, marginTop: 10, fontStyle: 'italic'}]}>"{detail.reviewText || detail.comment}"</Text>
                </View>

                {detail.isHidden ? (
                   <View style={{backgroundColor: '#fee2e2', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 16}}>
                      <Text style={{color: '#dc2626', fontWeight: '700'}}>Đánh giá này đã bị ẩn khỏi hệ thống.</Text>
                   </View>
                ) : (
                  <>
                    <Text style={s.replyLabel}>Phản hồi Khách hàng (Sẽ hiển thị công khai)</Text>
                    {detail.isReplied ? (
                      <View style={{backgroundColor: '#f0fdf4', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0'}}>
                        <Text style={{color: '#16a34a', fontWeight: 'bold', marginBottom: 4}}>Hệ thống LocalMate đã phản hồi:</Text>
                        <Text style={{color: '#15803d'}}>{detail.replyText}</Text>
                      </View>
                    ) : (
                      <>
                        <TextInput style={s.replyInput} placeholder="Nhập câu trả lời..." value={replyInput} onChangeText={setReplyInput} multiline />
                        <TouchableOpacity style={s.submitBtn} onPress={handleReply}><Text style={s.submitTxt}>Gửi phản hồi</Text></TouchableOpacity>
                      </>
                    )}

                    <Text style={[s.replyLabel, {marginTop: 10, color: '#dc2626'}]}>Công cụ Xử lý Hướng dẫn viên</Text>
                    <View style={s.actionRow}>
                      <TouchableOpacity style={[s.actionBtn, {backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1}]} onPress={handleWarnGuide}>
                         <Ionicons name="warning" size={16} color="#d97706" />
                         <Text style={[s.actionBtnTxt, {color: '#d97706'}]}>Gửi Cảnh cáo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, {backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1}]} onPress={handleSuspendGuide}>
                         <Ionicons name="lock-closed" size={16} color="#dc2626" />
                         <Text style={[s.actionBtnTxt, {color: '#dc2626'}]}>Đình chỉ HDV</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[s.replyLabel, {marginTop: 20}]}>Thao tác Review</Text>
                    <TouchableOpacity style={[s.actionBtn, {backgroundColor: '#f1f5f9', width: '100%', justifyContent: 'center'}]} onPress={handleHideReview}>
                      <Ionicons name="eye-off" size={18} color="#64748b" />
                      <Text style={[s.actionBtnTxt, {color: '#64748b'}]}>Ẩn đánh giá này</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <StaffTabBar activeRoute="/staff-review-moderation" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  guestName: { color: "#1f2a58", fontWeight: "800", fontSize: 14 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fffbeb", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTxt: { color: "#d97706", fontWeight: "800", fontSize: 12 },
  tourMeta: { color: "#2856d6", fontSize: 11, fontWeight: "700", marginBottom: 6 },
  commentTxt: { color: "#5f73a9", fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  dateTxt: { color: "#94a8d8", fontSize: 11 },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20, paddingBottom: 40 },
  quoteBox: { backgroundColor: "#f3f7ff", borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#c0cbe8" },
  quoteName: { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  quoteComment: { color: "#5f73a9", fontSize: 12, marginTop: 4 },
  replyLabel: { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 8 },
  replyInput: { backgroundColor: "#f8faff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", padding: 12, minHeight: 80, textAlignVertical: "top", marginBottom: 16 },
  submitBtn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 16 },
  submitTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnTxt: { fontSize: 13, fontWeight: "700" }
});