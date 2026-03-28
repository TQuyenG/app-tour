/**
 * app/staff-review-moderation.tsx
 * Staff kiểm duyệt review — Phiên bản nâng cấp
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

interface Review {
  id: string; customerName: string; tourName: string; guideName: string;
  rating: number; comment: string; date: string;
  flagged?: boolean; flagReason?: string; removed?: boolean;
  staffReply?: string; repliedAt?: string;
  verified?: boolean; helpful?: number;
}

const SEED_REVIEWS: Review[] = [
  { id: "1",  customerName: "Trần Thị B",    tourName: "Đà Lạt 3N2Đ - Săn mây",        guideName: "Trần Minh Khoa",  rating: 5, comment: "Anh HDV Trần Minh Khoa rất nhiệt tình, am hiểu địa phương. Tour được tổ chức chuyên nghiệp, lịch trình hợp lý. Sẽ giới thiệu bạn bè!", date: "15/03/2026", verified: true, helpful: 12 },
  { id: "2",  customerName: "Fake User 123",  tourName: "Phú Quốc 4N3Đ",                guideName: "Nguyễn Thu Hà",   rating: 1, comment: "Tour xấu lắm mua review giả aaaa !!!! spam spam spam aaa bbb ccc", date: "14/03/2026", flagged: true, flagReason: "Spam / Giả mạo", helpful: 0 },
  { id: "3",  customerName: "Lê Văn X",       tourName: "Nha Trang 3N2Đ",               guideName: "Lê Quang Dũng",   rating: 2, comment: "Lừa đảo! Không đúng mô tả. Báo công an luôn! Đây là công ty lừa đảo!", date: "13/03/2026", flagged: true, flagReason: "Ngôn từ không phù hợp", helpful: 0 },
  { id: "4",  customerName: "Nguyễn Minh D",  tourName: "Sapa 3N2Đ - Mùa lúa chín",    guideName: "Phạm Hoài Nam",   rating: 5, comment: "Cảnh đẹp quá, HDV Phạm Hoài Nam dẫn tour rất chuyên nghiệp và vui tính. Sẽ đặt lại vào mùa xuân năm sau!", date: "12/03/2026", verified: true, helpful: 8 },
  { id: "5",  customerName: "Bot_Account99",  tourName: "Hội An 2N1Đ",                  guideName: "Đỗ Trúc Ly",      rating: 5, comment: "good good good good good good good nice nice nice", date: "11/03/2026", flagged: true, flagReason: "Spam / Giả mạo", helpful: 0 },
  { id: "6",  customerName: "Hoàng Thị F",    tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan", guideName: "Nguyễn Thu Hà",   rating: 4, comment: "Cảnh vịnh Hạ Long đẹp không thể tả. HDV nhiệt tình, thuyền sạch sẽ. Chỉ tiếc thức ăn trên tàu hơi ít so với giá tour.", date: "10/03/2026", verified: true, helpful: 15 },
  { id: "7",  customerName: "Phạm Văn Spam",  tourName: "Đà Lạt 3N2Đ",                 guideName: "Trần Minh Khoa",  rating: 1, comment: "Xem thêm tour rẻ hơn tại www.tourgiatot.com nhé!!! Giảm 50% code SALE50", date: "09/03/2026", flagged: true, flagReason: "Quảng cáo trái phép", helpful: 0 },
  { id: "8",  customerName: "Lý Thu H",       tourName: "Côn Đảo 4N3Đ",                guideName: "Lê Quang Dũng",   rating: 5, comment: "Thiên đường thật sự! HDV tận tâm, thức ăn ngon, khách sạn sạch đẹp view biển tuyệt vời. 10/10 sẽ quay lại!", date: "08/03/2026", verified: true, helpful: 20 },
  { id: "9",  customerName: "Trần Quang I",   tourName: "Mũi Né 2N1Đ",                 guideName: "Đinh Hồng Linh",  rating: 3, comment: "Tour ổn nhưng xe đón bị trễ 1 tiếng so với lịch hẹn. Đồi cát đẹp, trải nghiệm lướt cát vui. Cần cải thiện đúng giờ.", date: "07/03/2026", helpful: 5 },
  { id: "10", customerName: "FakeReview2026", tourName: "Phú Quốc 4N3Đ",               guideName: "Nguyễn Thu Hà",   rating: 5, comment: "Tốt lắm tốt lắm tốt lắm tốt lắm tốt lắm!!! 5 sao!!!", date: "06/03/2026", flagged: true, flagReason: "Spam / Giả mạo", helpful: 0 },
  { id: "11", customerName: "Vũ Ngọc An",     tourName: "Cần Thơ 2N1Đ - Chợ nổi",     guideName: "Đinh Hồng Linh",  rating: 4, comment: "Chợ nổi Cái Răng đẹp hơn mong đợi. Sáng sớm ra chợ rất thú vị, không khí miền Tây mộc mạc. HDV giới thiệu rất hay.", date: "05/03/2026", verified: true, helpful: 9, staffReply: "Cảm ơn bạn đã chia sẻ trải nghiệm! Chúng tôi rất vui vì tour đạt kỳ vọng. Hẹn gặp lại bạn sớm nhé!", repliedAt: "06/03/2026" },
  { id: "12", customerName: "Lê Bảo Châu",    tourName: "Đà Nẵng 3N2Đ - Cầu Vàng",    guideName: "Vũ Ngọc Anh",    rating: 2, comment: "Tour cam kết xe Limousine nhưng đón bằng xe 16 chỗ cũ. Phòng khách sạn không đúng view biển như quảng cáo. Cần cải thiện nhiều.", date: "04/03/2026", flagged: true, flagReason: "Nội dung sai sự thật", helpful: 7 },
];

const FLAG_REASONS = [
  "Spam / Giả mạo",
  "Ngôn từ không phù hợp",
  "Nội dung sai sự thật",
  "Quảng cáo trái phép",
  "Nội dung thù địch",
  "Thông tin cá nhân / vi phạm quyền riêng tư",
];

const FILTERS = ["Tất cả", "Vi phạm", "Bình thường", "Đã phản hồi", "Đã xóa"];

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons key={i} name={i < rating ? "star" : "star-outline"} size={12} color={i < rating ? "#f59e0b" : "#e4ebff"} />
  ));
}

export default function StaffReviewModeration() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [filter, setFilter]                 = useState("Tất cả");
  const [search, setSearch]                 = useState("");
  const [replyTarget, setReplyTarget]       = useState<Review | null>(null);
  const [replyText, setReplyText]           = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_reviews").then(raw => {
      if (raw) {
        const parsed: Review[] = JSON.parse(raw);
        setReviews(parsed.length > 0 ? parsed : SEED_REVIEWS);
      } else {
        setReviews(SEED_REVIEWS);
        AsyncStorage.setItem("@guide_reviews", JSON.stringify(SEED_REVIEWS)).catch(() => {});
      }
    }).catch(() => setReviews(SEED_REVIEWS));
  }, []));

  const persist = async (data: Review[]) => {
    setReviews(data);
    await AsyncStorage.setItem("@guide_reviews", JSON.stringify(data)).catch(() => {});
  };

  const flagReview = (r: Review) => {
    Alert.alert(
      "🚩 Gắn cờ vi phạm",
      `Review của "${r.customerName}"\n"${r.comment.slice(0, 60)}..."\n\nChọn lý do vi phạm:`,
      [
        ...FLAG_REASONS.map(reason => ({
          text: reason,
          onPress: async () => {
            await persist(reviews.map(x => x.id === r.id ? { ...x, flagged: true, flagReason: reason } : x));
            Alert.alert("✅ Đã gắn cờ", `Lý do: "${reason}"`);
          },
        })),
        { text: "Hủy", style: "cancel" },
      ]
    );
  };

  const unflagReview = (id: string) => {
    Alert.alert("Bỏ cờ vi phạm", "Xác nhận bỏ đánh dấu vi phạm?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xác nhận", onPress: async () => await persist(reviews.map(x => x.id === id ? { ...x, flagged: false, flagReason: undefined } : x)) },
    ]);
  };

  const removeReview = (r: Review) => {
    Alert.alert(
      "🗑️ Xóa review",
      `Xóa vĩnh viễn review của "${r.customerName}"?\n\n⚠️ Không thể khôi phục!`,
      [
        { text: "Hủy bỏ", style: "cancel" },
        {
          text: "Xóa vĩnh viễn", style: "destructive",
          onPress: async () => {
            await persist(reviews.map(x => x.id === r.id ? { ...x, removed: true, flagged: false } : x));
            Alert.alert("✅ Đã xóa", "Review đã được xóa vĩnh viễn.");
          },
        },
      ]
    );
  };

  const openReply = (r: Review) => {
    setReplyTarget(r);
    setReplyText(r.staffReply || "");
    setShowReplyModal(true);
  };

  const submitReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    await persist(reviews.map(x =>
      x.id === replyTarget.id
        ? { ...x, staffReply: replyText.trim(), repliedAt: new Date().toLocaleDateString("vi-VN") }
        : x
    ));
    setShowReplyModal(false);
    setReplyText("");
    Alert.alert("✅ Đã gửi phản hồi", "Phản hồi của CSKH đã được lưu.");
  };

  const filtered = reviews
    .filter(r => !r.removed)
    .filter(r => {
      const matchFilter =
        filter === "Tất cả"      ? true :
        filter === "Vi phạm"     ? r.flagged :
        filter === "Bình thường" ? !r.flagged :
        filter === "Đã phản hồi" ? !!r.staffReply :
        filter === "Đã xóa"      ? false : true;
      const q = search.toLowerCase();
      const matchSearch = !q || r.customerName.toLowerCase().includes(q) || r.tourName.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

  const flaggedCount   = reviews.filter(r => r.flagged && !r.removed).length;
  const removedCount   = reviews.filter(r => r.removed).length;
  const repliedCount   = reviews.filter(r => r.staffReply && !r.removed).length;
  const avgRating      = reviews.filter(r => !r.removed).length > 0
    ? (reviews.filter(r => !r.removed).reduce((a, r) => a + r.rating, 0) / reviews.filter(r => !r.removed).length).toFixed(1)
    : "—";

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kiểm duyệt Review</Text>
          <Text style={s.headerSub}>{reviews.filter(r => !r.removed).length} review · {flaggedCount} vi phạm</Text>
        </View>
        {flaggedCount > 0 && (
          <View style={s.flagBadge}>
            <Ionicons name="flag" size={12} color="#dc2626" />
            <Text style={s.flagBadgeTxt}>{flaggedCount} vi phạm</Text>
          </View>
        )}
      </View>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <View style={s.kpiRow}>
        <View style={[s.kpiCard, { backgroundColor: "#fef9c3", borderColor: "#fde68a" }]}>
          <Text style={[s.kpiValue, { color: "#f59e0b" }]}>{avgRating}★</Text>
          <Text style={s.kpiLabel}>Điểm trung bình</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#fee2e2", borderColor: "#fecaca" }]}>
          <Text style={[s.kpiValue, { color: "#dc2626" }]}>{flaggedCount}</Text>
          <Text style={s.kpiLabel}>Vi phạm</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
          <Text style={[s.kpiValue, { color: "#16a34a" }]}>{repliedCount}</Text>
          <Text style={s.kpiLabel}>Đã phản hồi</Text>
        </View>
        <View style={[s.kpiCard, { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" }]}>
          <Text style={[s.kpiValue, { color: "#64748b" }]}>{removedCount}</Text>
          <Text style={s.kpiLabel}>Đã xóa</Text>
        </View>
      </View>

      {/* ── Search ──────────────────────────────────────────── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#8ea0d6" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm theo tên, tour, nội dung review..."
            placeholderTextColor="#b0bdd8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#b0bdd8" /></TouchableOpacity>}
        </View>
      </View>

      {/* ── Filters ─────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => {
          const cnt = f === "Tất cả" ? reviews.filter(r => !r.removed).length
            : f === "Vi phạm" ? flaggedCount
            : f === "Bình thường" ? reviews.filter(r => !r.flagged && !r.removed).length
            : f === "Đã phản hồi" ? repliedCount
            : removedCount;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filter === f && s.filterActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
              <View style={[s.filterCount, filter === f && s.filterCountActive]}>
                <Text style={[s.filterCountTxt, filter === f && { color: "#fff" }]}>{cnt}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 96 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.resultInfo}>Hiển thị {filtered.length} review</Text>

        {filtered.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có review nào</Text>
          </View>
        )}

        {filtered.map(r => (
          <View key={r.id} style={[s.card, r.flagged && s.cardFlagged]}>
            {/* Card Header */}
            <View style={s.cardHeader}>
              <View style={s.authorRow}>
                <View style={[s.avatar, { backgroundColor: r.flagged ? "#fee2e2" : r.rating >= 4 ? "#dcfce7" : "#f1f5f9" }]}>
                  <Text style={[s.avatarTxt, { color: r.flagged ? "#dc2626" : r.rating >= 4 ? "#16a34a" : "#64748b" }]}>
                    {r.customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.authorName}>{r.customerName}</Text>
                    {r.verified && (
                      <View style={s.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
                        <Text style={s.verifiedTxt}>Đã xác minh</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.tourName} numberOfLines={1}>{r.tourName}</Text>
                  <Text style={s.guideName}>HDV: {r.guideName}</Text>
                </View>
              </View>
              <View style={s.ratingCol}>
                <View style={s.starRow}>{renderStars(r.rating)}</View>
                <Text style={s.dateText}>{r.date}</Text>
                {(r.helpful || 0) > 0 && (
                  <View style={s.helpfulRow}>
                    <Ionicons name="thumbs-up-outline" size={10} color="#94a3b8" />
                    <Text style={s.helpfulTxt}>{r.helpful}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Comment */}
            <Text style={s.comment}>{r.comment}</Text>

            {/* Flag Reason */}
            {r.flagged && (
              <View style={s.flagBox}>
                <Ionicons name="flag" size={13} color="#dc2626" />
                <Text style={s.flagTxt}>Vi phạm: {r.flagReason}</Text>
              </View>
            )}

            {/* Staff Reply */}
            {r.staffReply && (
              <View style={s.replyBox}>
                <View style={s.replyHeader}>
                  <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
                  <Text style={s.replyHeaderTxt}>CSKH phản hồi • {r.repliedAt}</Text>
                </View>
                <Text style={s.replyContent}>{r.staffReply}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={s.actionRow}>
              {!r.flagged ? (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => flagReview(r)}>
                  <Ionicons name="flag-outline" size={12} color="#dc2626" />
                  <Text style={[s.actionTxt, { color: "#dc2626" }]}>Gắn cờ</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#dcfce7" }]} onPress={() => unflagReview(r.id)}>
                  <Ionicons name="flag-outline" size={12} color="#16a34a" />
                  <Text style={[s.actionTxt, { color: "#16a34a" }]}>Bỏ cờ</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#eaf0ff" }]} onPress={() => openReply(r)}>
                <Ionicons name="chatbubble-outline" size={12} color="#2856d6" />
                <Text style={[s.actionTxt, { color: "#2856d6" }]}>{r.staffReply ? "Sửa" : "Phản hồi"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => removeReview(r)}>
                <Ionicons name="trash-outline" size={12} color="#dc2626" />
                <Text style={[s.actionTxt, { color: "#dc2626" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Reply Modal ────────────────────────────────────────── */}
      <Modal visible={showReplyModal} transparent animationType="slide" onRequestClose={() => setShowReplyModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowReplyModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{replyTarget?.staffReply ? "Sửa phản hồi" : "Phản hồi review"}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={18} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              {replyTarget && (
                <View style={s.quoteBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={s.starRow}>{renderStars(replyTarget.rating)}</View>
                    <Text style={s.quoteName}>{replyTarget.customerName}</Text>
                  </View>
                  <Text style={s.quoteComment} numberOfLines={3}>{replyTarget.comment}</Text>
                </View>
              )}
              <Text style={s.replyLabel}>Phản hồi của CSKH</Text>
              <TextInput
                style={s.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Nhập phản hồi chuyên nghiệp, lịch sự..."
                placeholderTextColor="#b0bdd8"
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[s.replySubmitBtn, !replyText.trim() && { opacity: 0.5 }]}
                onPress={submitReply}
                disabled={!replyText.trim()}
              >
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={s.replySubmitTxt}>Gửi phản hồi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StaffTabBar activeRoute="/staff-review-moderation" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub:       { fontSize: 11, color: "#7a8cc2", marginTop: 2, fontWeight: "500" },
  flagBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  flagBadgeTxt:    { color: "#dc2626", fontWeight: "800", fontSize: 11 },
  kpiRow:          { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  kpiCard:         { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center" },
  kpiValue:        { fontWeight: "900", fontSize: 17, letterSpacing: -0.5 },
  kpiLabel:        { color: "#7a8cc2", fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },
  searchWrap:      { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10 },
  searchBox:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:     { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow:       { gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  filterChip:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#f8faff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:    { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  filterTxt:       { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  filterCount:     { backgroundColor: "#eaf0ff", borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountActive:{ backgroundColor: "rgba(255,255,255,0.3)" },
  filterCountTxt:  { color: "#2856d6", fontSize: 10, fontWeight: "800" },
  content:         { padding: 14 },
  resultInfo:      { color: "#94a3b8", fontSize: 11, marginBottom: 10, fontWeight: "500" },
  emptyCard:       { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 40, alignItems: "center", gap: 10 },
  emptyTxt:        { color: "#7a8cc2", fontWeight: "600" },
  card:            { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10 },
  cardFlagged:     { borderColor: "#fecaca", borderLeftWidth: 3, borderLeftColor: "#dc2626", backgroundColor: "#fffafa" },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  authorRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  avatar:          { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarTxt:       { fontWeight: "800", fontSize: 18 },
  authorName:      { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  verifiedBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#dcfce7", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  verifiedTxt:     { color: "#16a34a", fontSize: 9, fontWeight: "700" },
  tourName:        { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  guideName:       { color: "#94a3b8", fontSize: 10, marginTop: 2, fontWeight: "500" },
  ratingCol:       { alignItems: "flex-end", gap: 3 },
  starRow:         { flexDirection: "row", gap: 1 },
  dateText:        { color: "#94a3b8", fontSize: 10, fontWeight: "500" },
  helpfulRow:      { flexDirection: "row", alignItems: "center", gap: 3 },
  helpfulTxt:      { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  comment:         { color: "#334155", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  flagBox:         { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fee2e2", borderRadius: 8, padding: 8, marginBottom: 10 },
  flagTxt:         { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  replyBox:        { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  replyHeader:     { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  replyHeaderTxt:  { color: "#16a34a", fontSize: 11, fontWeight: "700" },
  replyContent:    { color: "#166534", fontSize: 12, lineHeight: 18 },
  actionRow:       { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  actionBtn:       { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  actionTxt:       { fontSize: 11, fontWeight: "700" },
  // Modal
  modalOverlay:    { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet:      { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHandle:     { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:      { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
  closeBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:       { padding: 20, paddingBottom: 40 },
  quoteBox:        { backgroundColor: "#f3f7ff", borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#c0cbe8" },
  quoteName:       { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  quoteComment:    { color: "#5f73a9", fontSize: 12, lineHeight: 18, marginTop: 4 },
  replyLabel:      { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 8 },
  replyInput:      { backgroundColor: "#f3f7ff", borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 14, minHeight: 120, marginBottom: 14, textAlignVertical: "top" },
  replySubmitBtn:  { height: 52, borderRadius: 14, backgroundColor: "#2856d6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  replySubmitTxt:  { color: "#fff", fontWeight: "700", fontSize: 15 },
});