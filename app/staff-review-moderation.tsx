/**
 * app/staff-review-moderation.tsx
 * Staff kiểm duyệt review
 * Không Header Đen - Nút Back Về Home - 100% Data Thực
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

const FILTERS = ["Tất cả", "Chưa phản hồi", "Đã phản hồi", "Bị gắn cờ"];

export default function StaffReviewModeration() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [replyInput, setReplyInput] = useState("");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_reviews").then(raw => {
      if (raw) {
        let parsed = JSON.parse(raw);
        parsed = parsed.filter((r: any) => !["1", "2", "3"].includes(r.id));
        setReviews(parsed);
      } else setReviews([]);
    }).catch(() => setReviews([]));
  }, []));

  const persist = async (updated: any[]) => {
    setReviews(updated);
    await AsyncStorage.setItem("@guide_reviews", JSON.stringify(updated)).catch(() => {});
  };

  const handleAction = (reviewId: string, action: "flag" | "remove") => {
    const title = action === "flag" ? "Gắn cờ vi phạm?" : "Ẩn đánh giá này?";
    Alert.alert("Xác nhận", title, [
      { text: "Hủy", style: "cancel" },
      { text: "Đồng ý", style: "destructive", onPress: async () => {
          const updated = reviews.map(r => r.id === reviewId ? { ...r, flagged: action === "flag", removed: action === "remove" } : r);
          await persist(updated);
          setShowDetail(false);
      }}
    ]);
  };

  const submitReply = async () => {
    if (!detail || !replyInput.trim()) return;
    const time = new Date().toLocaleDateString("vi-VN");
    const updated = reviews.map(r => r.id === detail.id ? { ...r, staffReply: replyInput.trim(), repliedAt: time } : r);
    await persist(updated);
    setDetail({ ...detail, staffReply: replyInput.trim(), repliedAt: time });
    Alert.alert("Thành công", "Đã gửi phản hồi.");
  };

  const filtered = reviews.filter(r => {
    const kw = search.toLowerCase();
    const match = !kw || r.customerName?.toLowerCase().includes(kw) || r.tourName?.toLowerCase().includes(kw);
    if (!match || r.removed) return false;
    if (filter === "Chưa phản hồi") return !r.staffReply && !r.flagged;
    if (filter === "Đã phản hồi") return !!r.staffReply;
    if (filter === "Bị gắn cờ") return !!r.flagged;
    return true;
  });

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Detail Modal */}
      {detail && (
        <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
          <View style={s.modalOverlay}>
            <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chi tiết Đánh giá</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.modalBody}>
                <View style={s.quoteBox}>
                  <Text style={s.quoteName}>{detail.customerName} - {detail.rating}★</Text>
                  <Text style={s.quoteComment}>{detail.comment}</Text>
                </View>
                <Text style={s.replyLabel}>Phản hồi với tư cách CSKH:</Text>
                <TextInput style={s.replyInput} value={replyInput} onChangeText={setReplyInput} placeholder="Nhập phản hồi công khai..." multiline />
                <TouchableOpacity style={[s.submitBtn, !replyInput.trim() && {opacity: 0.5}]} onPress={submitReply}><Text style={s.submitTxt}>Gửi Phản Hồi</Text></TouchableOpacity>
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.flagBtn} onPress={() => handleAction(detail.id, "flag")}><Ionicons name="flag-outline" size={16} color="#d97706"/><Text style={s.flagTxt}>Gắn cờ</Text></TouchableOpacity>
                  <TouchableOpacity style={s.removeBtn} onPress={() => handleAction(detail.id, "remove")}><Ionicons name="trash-outline" size={16} color="#dc2626"/><Text style={s.removeTxt}>Xóa/Ẩn</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/staff-home" as any)} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.headerTitle}>Kiểm duyệt Review</Text></View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm khách hàng, tour..." value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={{ flexGrow: 0, minHeight: 60 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map(r => (
          <TouchableOpacity key={r.id} style={s.card} activeOpacity={0.8} onPress={() => { setDetail(r); setReplyInput(r.staffReply || ""); setShowDetail(true); }}>
            <View style={s.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={s.avatar}><Ionicons name="person" size={16} color="#7c3aed" /></View>
                <View><Text style={s.cName}>{r.customerName}</Text><Text style={s.cTour}>{r.tourName}</Text></View>
              </View>
              <View style={s.ratingBox}><Ionicons name="star" size={12} color="#f59e0b"/><Text style={s.ratingTxt}>{r.rating}</Text></View>
            </View>
            <Text style={s.commentTxt}>{r.comment}</Text>
            {r.flagged && <View style={s.flagAlert}><Ionicons name="warning" size={12} color="#dc2626"/><Text style={s.flagAlertTxt}>Đã gắn cờ</Text></View>}
            {r.staffReply && <View style={s.replyBox}><Text style={s.replyTag}>CSKH Phản hồi:</Text><Text style={s.replyContent}>{r.staffReply}</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <StaffTabBar activeRoute="/staff-review-moderation" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8 },
  filterActive: { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt: { color: "#7a8cc2", fontSize: 13, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  avatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  cName: { fontSize: 14, fontWeight: "800", color: "#1f2a58" },
  cTour: { fontSize: 11, color: "#7a8cc2" },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTxt: { color: "#d97706", fontWeight: "700", fontSize: 12 },
  commentTxt: { color: "#1f2a58", fontSize: 13, lineHeight: 20 },
  flagAlert: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fee2e2", padding: 6, borderRadius: 6, marginTop: 8 },
  flagAlertTxt: { color: "#dc2626", fontSize: 11, fontWeight: "700" },
  replyBox: { backgroundColor: "#f8faff", borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: "#2856d6" },
  replyTag: { color: "#2856d6", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  replyContent: { color: "#5f73a9", fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.55)" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1f2a58" },
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
  flagBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fef9c3", padding: 12, borderRadius: 10 },
  flagTxt: { color: "#d97706", fontWeight: "700" },
  removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fee2e2", padding: 12, borderRadius: 10 },
  removeTxt: { color: "#dc2626", fontWeight: "700" }
});