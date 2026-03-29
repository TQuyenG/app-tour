/**
 * app/guide-reviews.tsx
 * Quản lý Đánh giá & Phản hồi dành cho HDV
 * Đã đồng bộ Database @app_reviews
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideReviews() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0, fiveStars: 0 });

  useFocusEffect(useCallback(() => {
    const loadReviews = async () => {
      try {
        let currentGuideId = "";
        const pRaw = await AsyncStorage.getItem("@guide_profile");
        if (pRaw) currentGuideId = JSON.parse(pRaw).guideId || "";

        const rRaw = await AsyncStorage.getItem('@app_reviews');
        if (rRaw) {
          const allReviews = JSON.parse(rRaw);
          // Lọc review của đúng HDV này (Hoặc lấy tất cả nếu chưa có guideId để test)
          const myReviews = allReviews.filter((r: any) => r.guideId === currentGuideId || !r.guideId);
          setReviews(myReviews);

          if (myReviews.length > 0) {
            const totalScore = myReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
            const fiveStarsCount = myReviews.filter((r: any) => r.rating === 5).length;
            setStats({
              avg: Number((totalScore / myReviews.length).toFixed(1)),
              total: myReviews.length,
              fiveStars: fiveStarsCount
            });
          }
        }
      } catch (e) {}
    };
    loadReviews();
  }, []));

  const safeDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString('vi-VN');
  };

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={Math.round(24 * scale)} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.title}>Đánh giá & Phản hồi</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <View style={s.statsContainer}>
        <View style={s.avgBox}>
          <Text style={s.avgTxt}>{stats.avg > 0 ? stats.avg : '0.0'}</Text>
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= Math.round(stats.avg) ? "star" : "star-outline"} size={16} color="#f59e0b" />)}
          </View>
        </View>
        <View style={s.statsInfo}>
          <Text style={s.statsTotal}>{stats.total} bài đánh giá</Text>
          <Text style={s.statsSub}>{stats.fiveStars} đánh giá tuyệt đối (5 sao)</Text>
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="star-half-outline" size={60} color="#cbd5e1" style={{marginBottom: 10}}/>
          <Text style={s.emptyTxt}>Chưa có đánh giá nào.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <View style={s.reviewCard}>
              <View style={s.cardHeader}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{item.guestName.charAt(0)}</Text></View>
                <View style={s.headerInfo}>
                  <Text style={s.guestName}>{item.guestName}</Text>
                  <Text style={s.dateTxt}>{safeDate(item.createdAt)}</Text>
                </View>
                <View style={s.ratingBadge}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={s.ratingBadgeTxt}>{item.rating}</Text>
                </View>
              </View>
              
              {item.reviewText ? <Text style={s.reviewText}>{item.reviewText}</Text> : <Text style={[s.reviewText, {fontStyle: 'italic', color: '#94a3b8'}]}>Khách hàng không để lại nhận xét.</Text>}
              
              {item.tipAmount > 0 && (
                <View style={s.tipBadge}>
                  <Ionicons name="gift" size={14} color="#d97706" />
                  <Text style={s.tipTxt}>Đã tặng Tip: {(item.tipAmount).toLocaleString('vi-VN')}đ</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <GuideTabBar activeRoute="guide-reviews" />
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f3f7ff" },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: sz(16), paddingBottom: sz(12), backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
    title: { flex: 1, fontSize: sz(18), fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
    
    statsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(20), borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
    avgBox: { alignItems: 'center', marginRight: sz(20) },
    avgTxt: { fontSize: sz(40), fontWeight: '900', color: '#1f2a58', lineHeight: sz(44) },
    starsRow: { flexDirection: 'row', gap: sz(2) },
    statsInfo: { flex: 1 },
    statsTotal: { fontSize: sz(16), fontWeight: '800', color: '#1f2a58', marginBottom: sz(4) },
    statsSub: { fontSize: sz(13), color: '#64748b' },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTxt: { color: '#7a8cc2', fontSize: sz(15), fontWeight: '600' },

    listContent: { padding: sz(16), paddingBottom: sz(100) },
    reviewCard: { backgroundColor: "#fff", padding: sz(16), borderRadius: sz(20), marginBottom: sz(14), borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: sz(12) },
    avatar: { width: sz(44), height: sz(44), borderRadius: sz(14), backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center', marginRight: sz(12) },
    avatarTxt: { color: '#fff', fontSize: sz(18), fontWeight: '800' },
    headerInfo: { flex: 1 },
    guestName: { fontSize: sz(15), fontWeight: "800", color: "#1f2a58" },
    dateTxt: { fontSize: sz(12), color: '#94a3b8', marginTop: sz(2) },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(10), gap: sz(4) },
    ratingBadgeTxt: { fontSize: sz(14), fontWeight: '800', color: '#d97706' },
    
    reviewText: { fontSize: sz(14), color: "#334155", lineHeight: sz(22), marginBottom: sz(12) },
    tipBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fffbeb', paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(8), gap: sz(6), borderWidth: 1, borderColor: '#fde68a' },
    tipTxt: { fontSize: sz(12), fontWeight: '700', color: '#d97706' }
  });
};