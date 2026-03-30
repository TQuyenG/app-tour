/**
 * app/guide-reviews.tsx
 * Quản lý Đánh giá & Phản hồi dành cho HDV
 * ĐÃ FIX: Bỏ bar đen, Sắp xếp theo Tour, Nhấn vào Tour xem chi tiết, Dùng Custom Popup
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; // Đã đồng bộ storage-helper
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideReviews() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0, fiveStars: 0 });
  const [selectedReview, setSelectedReview] = useState<any>(null); // Dùng cho Custom Popup

  useFocusEffect(useCallback(() => {
    const loadReviews = async () => {
      try {
        let currentGuideId = "";
        let currentGuideName = "";
        const pRaw = await AsyncStorage.getItem("@guide_profile");
        if (pRaw) {
          const p = JSON.parse(pRaw);
          currentGuideId = p.guideId || "";
          currentGuideName = p.name || "";
        }

        const rRaw = await AsyncStorage.getItem('@app_reviews');
        if (rRaw) {
          const allReviews = JSON.parse(rRaw);
          
          // Lọc ra các review thuộc về HDV này (không lấy các review bị ẩn)
          let myReviews = allReviews.filter((r: any) => 
            !r.isHidden && (r.guideId === currentGuideId || r.guideName === currentGuideName)
          );

          // Sắp xếp: Ưu tiên theo tên Tour, sau đó đến thời gian mới nhất
          myReviews.sort((a: any, b: any) => {
            const tourA = a.tourName || "";
            const tourB = b.tourName || "";
            if (tourA < tourB) return -1;
            if (tourA > tourB) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          setReviews(myReviews);

          if (myReviews.length > 0) {
            let sum = 0;
            let fiveCount = 0;
            myReviews.forEach((r: any) => {
              const rt = Number(r.guideRating || r.overallRating || r.rating || 5);
              sum += rt;
              if (rt >= 4.8) fiveCount++;
            });
            setStats({
              avg: Number((sum / myReviews.length).toFixed(1)),
              total: myReviews.length,
              fiveStars: fiveCount
            });
          }
        }
      } catch (e) {
        console.log("Lỗi tải review:", e);
      }
    };
    loadReviews();
  }, []));

  const renderReviewItem = ({ item }: { item: any }) => {
    const guideRating = item.guideRating || item.overallRating || item.rating || 5;
    const tourRating = item.tourRating || item.rating || 5;

    return (
      <View style={s.reviewCard}>
        <View style={s.cardHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(item.guestName || "K").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.headerInfo}>
            <Text style={s.guestName}>{item.guestName || "Khách hàng"}</Text>
            <Text style={s.dateTxt}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : "Gần đây"}</Text>
          </View>
        </View>

        <View style={s.ratingsRow}>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={14} color="#d97706" />
            <Text style={s.ratingBadgeTxt}>HDV: {guideRating}</Text>
          </View>
          <View style={[s.ratingBadge, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="map" size={14} color="#16a34a" />
            <Text style={[s.ratingBadgeTxt, { color: '#16a34a' }]}>Tour: {tourRating}</Text>
          </View>
        </View>

        {/* NÚT LIÊN KẾT ĐẾN TRANG TOUR */}
        <TouchableOpacity style={s.tourLinkBox} onPress={() => item.tourId ? router.push({ pathname: '/tour/[id]', params: { id: item.tourId } } as any) : null}>
          <Ionicons name="location" size={14} color="#4f7cff" />
          <Text style={s.tourLinkTxt} numberOfLines={1}>{item.tourName || "Tour không xác định"}</Text>
          <Ionicons name="chevron-forward" size={14} color="#4f7cff" />
        </TouchableOpacity>

        {/* NỘI DUNG ĐÁNH GIÁ -> BẤM ĐỂ HIỆN FULL POPUP */}
        <TouchableOpacity style={s.commentBox} onPress={() => setSelectedReview(item)}>
          <Text style={s.reviewText} numberOfLines={3}>"{item.reviewText || item.comment || "Khách không để lại nhận xét."}"</Text>
          <Text style={s.readMoreTxt}>Đọc thêm</Text>
        </TouchableOpacity>

        {item.isReplied && item.replyText && (
          <View style={s.replyBox}>
            <View style={s.replyHeader}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#16a34a" />
              <Text style={s.replyTitle}>LocalMate đã phản hồi:</Text>
            </View>
            <Text style={s.replyText} numberOfLines={2}>{item.replyText}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Đánh giá & Phản hồi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.statsCard}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.avg}</Text>
          <View style={s.stars}><Ionicons name="star" size={14} color="#f59e0b" /><Text style={s.statLabel}>Điểm TB</Text></View>
        </View>
        <View style={s.divider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.total}</Text>
          <Text style={s.statLabel}>Lượt đánh giá</Text>
        </View>
        <View style={s.divider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.fiveStars}</Text>
          <Text style={s.statLabel}>Tuyệt vời (5⭐)</Text>
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={60} color="#cbd5e1" />
          <Text style={s.emptyTxt}>Bạn chưa có đánh giá nào.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={s.listContent}
          data={reviews}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderReviewItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* POPUP CHI TIẾT ĐÁNH GIÁ (THAY THẾ ALERT) */}
      <Modal visible={!!selectedReview} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                 <View style={[s.avatar, { width: 36, height: 36, borderRadius: 10 }]}><Text style={s.avatarTxt}>{(selectedReview?.guestName || "K").charAt(0)}</Text></View>
                 <View>
                    <Text style={s.guestName}>{selectedReview?.guestName}</Text>
                    <Text style={s.dateTxt}>{selectedReview?.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString('vi-VN') : ""}</Text>
                 </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedReview(null)} style={s.closeBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: 400, width: '100%', marginVertical: 16}} showsVerticalScrollIndicator={false}>
              <Text style={s.modalSectionTitle}>Chi tiết Điểm số</Text>
              <View style={s.modalRatingsRow}>
                 <Text style={s.modalRatingLabel}>Chất lượng Tour:</Text>
                 <Text style={s.modalRatingVal}>{selectedReview?.tourRating || selectedReview?.rating || 5} ⭐</Text>
              </View>
              <View style={s.modalRatingsRow}>
                 <Text style={s.modalRatingLabel}>Chất lượng HDV:</Text>
                 <Text style={s.modalRatingVal}>{selectedReview?.guideRating || selectedReview?.overallRating || selectedReview?.rating || 5} ⭐</Text>
              </View>
              {selectedReview?.tipAmount > 0 && (
                <View style={s.modalRatingsRow}>
                   <Text style={s.modalRatingLabel}>Tiền Tip nhận được:</Text>
                   <Text style={[s.modalRatingVal, {color: '#10b981'}]}>+ {selectedReview.tipAmount.toLocaleString('vi-VN')}đ</Text>
                </View>
              )}

              <Text style={[s.modalSectionTitle, {marginTop: 16}]}>Nội dung Đánh giá</Text>
              <View style={s.modalCommentBox}>
                 <Text style={s.modalCommentTxt}>"{selectedReview?.reviewText || selectedReview?.comment || "Khách không viết nhận xét"}"</Text>
              </View>

              {selectedReview?.isReplied && selectedReview?.replyText && (
                 <>
                   <Text style={[s.modalSectionTitle, {marginTop: 16}]}>Phản hồi từ Ban quản lý</Text>
                   <View style={s.modalReplyBox}>
                      <Text style={s.modalReplyTxt}>{selectedReview.replyText}</Text>
                   </View>
                 </>
              )}
            </ScrollView>

            <TouchableOpacity style={s.modalClosePrimaryBtn} onPress={() => setSelectedReview(null)}>
              <Text style={s.modalClosePrimaryTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-profile" />
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f3f7ff" },
    topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
    iconBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: sz(18), fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
    
    statsCard: { flexDirection: 'row', backgroundColor: '#fff', margin: sz(16), borderRadius: sz(20), padding: sz(16), elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: sz(24), fontWeight: '900', color: '#1f2a58' },
    statLabel: { fontSize: sz(11), color: '#7a8cc2', marginTop: sz(4), fontWeight: '600' },
    stars: { flexDirection: 'row', alignItems: 'center', gap: sz(4), marginTop: sz(4) },
    divider: { width: 1, backgroundColor: '#e4ebff', marginHorizontal: sz(10) },
    
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: sz(100) },
    emptyTxt: { color: '#94a3b8', fontSize: sz(14), fontWeight: '600', marginTop: sz(12) },

    listContent: { paddingHorizontal: sz(16), paddingBottom: sz(100) },
    reviewCard: { backgroundColor: "#fff", padding: sz(16), borderRadius: sz(20), marginBottom: sz(14), borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: sz(12) },
    avatar: { width: sz(44), height: sz(44), borderRadius: sz(14), backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    avatarTxt: { color: '#fff', fontSize: sz(18), fontWeight: '800' },
    headerInfo: { flex: 1 },
    guestName: { fontSize: sz(15), fontWeight: "800", color: "#1f2a58" },
    dateTxt: { fontSize: sz(12), color: '#94a3b8', marginTop: sz(2) },
    
    ratingsRow: { flexDirection: 'row', gap: sz(8), marginBottom: sz(12) },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(8), gap: sz(4), borderWidth: 1, borderColor: '#fef3c7' },
    ratingBadgeTxt: { fontSize: sz(13), fontWeight: '800', color: '#d97706' },

    tourLinkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8faff', padding: sz(10), borderRadius: sz(8), marginBottom: sz(12), borderWidth: 1, borderColor: '#e4ebff' },
    tourLinkTxt: { flex: 1, color: '#4f7cff', fontWeight: '700', fontSize: sz(13), marginHorizontal: sz(6) },

    commentBox: { backgroundColor: '#f1f5f9', padding: sz(12), borderRadius: sz(12) },
    reviewText: { color: '#475569', fontSize: sz(14), lineHeight: sz(22), fontStyle: 'italic' },
    readMoreTxt: { color: '#4f7cff', fontSize: sz(12), fontWeight: '700', marginTop: sz(6), alignSelf: 'flex-end' },

    replyBox: { marginTop: sz(12), backgroundColor: '#f0fdf4', padding: sz(12), borderRadius: sz(10), borderLeftWidth: 3, borderLeftColor: '#16a34a' },
    replyHeader: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginBottom: sz(4) },
    replyTitle: { color: '#16a34a', fontWeight: '800', fontSize: sz(12) },
    replyText: { color: '#15803d', fontSize: sz(13), lineHeight: sz(20) },

    // Modal (Popup) Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'center', alignItems: 'center', padding: sz(20) },
    modalBox: { backgroundColor: '#fff', width: '100%', borderRadius: sz(24), padding: sz(24), elevation: 10, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f4ff', paddingBottom: sz(16) },
    closeBtn: { width: sz(32), height: sz(32), backgroundColor: '#f1f5f9', borderRadius: sz(10), alignItems: 'center', justifyContent: 'center' },
    
    modalSectionTitle: { fontSize: sz(14), fontWeight: '800', color: '#1f2a58', marginBottom: sz(8) },
    modalRatingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: sz(8), borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
    modalRatingLabel: { color: '#64748b', fontSize: sz(14), fontWeight: '600' },
    modalRatingVal: { color: '#d97706', fontSize: sz(14), fontWeight: '900' },
    
    modalCommentBox: { backgroundColor: '#f8faff', padding: sz(16), borderRadius: sz(14), borderWidth: 1, borderColor: '#e4ebff' },
    modalCommentTxt: { color: '#1f2a58', fontSize: sz(15), lineHeight: sz(24), fontStyle: 'italic' },
    
    modalReplyBox: { backgroundColor: '#f0fdf4', padding: sz(16), borderRadius: sz(14), borderWidth: 1, borderColor: '#bbf7d0' },
    modalReplyTxt: { color: '#15803d', fontSize: sz(14), lineHeight: sz(22) },

    modalClosePrimaryBtn: { backgroundColor: '#4f7cff', width: '100%', height: sz(50), borderRadius: sz(14), alignItems: 'center', justifyContent: 'center', marginTop: sz(10) },
    modalClosePrimaryTxt: { color: '#fff', fontWeight: '900', fontSize: sz(15) },
  });
};