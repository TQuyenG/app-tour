/**
 * guest_favorites.tsx — Nâng cấp: ảnh thực, animation, rating, badge
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicTours, type AppTour } from '@/constants/data-store';

/* ── Ảnh mỗi tour theo id / tên ──────────────────────────────── */
const TOUR_IMGS: Record<string, string> = {
  t001: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', // Đà Lạt
  t002: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', // Phú Quốc
  t003: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&q=80', // Nha Trang
  t004: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=600&q=80', // Sapa
  t005: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', // Hạ Long
  t006: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80',    // Hội An
  t007: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=600&q=80', // Đà Nẵng
  t008: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',    // Mũi Né
};

function getTourImg(tour: AppTour): string {
  if (TOUR_IMGS[tour.id]) return TOUR_IMGS[tour.id];
  const n = tour.name.toLowerCase();
  if (n.includes('đà lạt'))   return TOUR_IMGS.t001;
  if (n.includes('phú quốc')) return TOUR_IMGS.t002;
  if (n.includes('nha trang'))return TOUR_IMGS.t003;
  if (n.includes('sapa'))     return TOUR_IMGS.t004;
  if (n.includes('hạ long'))  return TOUR_IMGS.t005;
  if (n.includes('hội an'))   return TOUR_IMGS.t006;
  if (n.includes('đà nẵng'))  return TOUR_IMGS.t007;
  if (n.includes('mũi né'))   return TOUR_IMGS.t008;
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=80';
}

const fmt = (p: string | number) => {
  const n = Number(String(p).replace(/\./g, '').replace('đ', ''));
  return isNaN(n) ? String(p) : `${n.toLocaleString('vi-VN')}đ`;
};

/* ── Card component với animation ───────────────────────────── */
function FavCard({
  tour, index, isFav, onToggle, onPress,
}: {
  tour: AppTour; index: number; isFav: boolean;
  onToggle: () => void; onPress: () => void;
}) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleToggle = () => {
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartAnim, { toValue: 1,   useNativeDriver: true, speed: 50 }),
    ]).start();
    onToggle();
  };

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 50 }).start();

  const stars = Math.round(tour.rating);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={st.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Ảnh bên trái */}
        <View style={st.imgWrap}>
          <Image source={{ uri: getTourImg(tour) }} style={st.img} resizeMode="cover" />
          {/* Badge trạng thái */}
          {tour.status === 'full' && (
            <View style={st.fullBadge}><Text style={st.fullBadgeTxt}>Hết chỗ</Text></View>
          )}
        </View>

        {/* Nội dung */}
        <View style={st.body}>
          <Text style={st.name} numberOfLines={2}>{tour.name}</Text>

          {/* Rating stars */}
          <View style={st.starsRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name={s <= stars ? 'star' : 'star-outline'} size={11} color={s <= stars ? '#f59e0b' : '#d1d5db'} />
            ))}
            <Text style={st.ratingTxt}>{tour.rating.toFixed(1)}</Text>
          </View>

          <Text style={st.meta}>
            <Ionicons name="location-outline" size={11} color="#7a8cc2" /> {tour.departure}
          </Text>
          <Text style={st.meta}>
            <Ionicons name="time-outline" size={11} color="#7a8cc2" /> {tour.duration}
          </Text>

          <View style={st.cardFooter}>
            <Text style={st.price}>{fmt(tour.price)}</Text>
            <View style={st.seatsBadge}>
              <Ionicons name="people-outline" size={10} color="#2856d6" />
              <Text style={st.seatsTxt}>{tour.seatsLeft} chỗ</Text>
            </View>
          </View>
        </View>

        {/* Nút tim */}
        <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
          <TouchableOpacity style={st.heartBtn} onPress={handleToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#ff6f9f' : '#c0cbe8'} />
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function GuestFavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [allTours, setAllTours]       = useState<AppTour[]>([]);
  const [sort, setSort]               = useState<'default' | 'price_asc' | 'rating'>('default');

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => {
    getPublicTours().then(tours => {
      setAllTours(tours);
      AsyncStorage.getItem('@guest_favorites').then(raw => {
        if (raw) {
          const ids = JSON.parse(raw);
          setFavoriteIds(ids.length > 0 ? ids : tours.slice(0, 4).map((t: any) => t.id));
        } else {
          const seedIds = tours.slice(0, 4).map((t: any) => t.id);
          setFavoriteIds(seedIds);
          AsyncStorage.setItem('@guest_favorites', JSON.stringify(seedIds)).catch(() => {});
        }
      }).catch(() => {});
    });
  }, []));

  const favoriteTours = useMemo(() => {
    const list = allTours.filter(t => favoriteIds.includes(t.id));
    if (sort === 'price_asc') return [...list].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'rating')    return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [allTours, favoriteIds, sort]);

  const onToggle = async (id: string) => {
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter(x => x !== id)
      : [...favoriteIds, id];
    setFavoriteIds(next);
    await AsyncStorage.setItem('@guest_favorites', JSON.stringify(next)).catch(() => {});
  };

  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: Animated.subtract(new Animated.Value(16), Animated.multiply(headerAnim, new Animated.Value(16))) }] }}>
          <Text style={st.title}>Tour yêu thích</Text>
          <Text style={st.subtitle}>
            {favoriteTours.length > 0
              ? `${favoriteTours.length} tour bạn đã lưu`
              : 'Danh sách tour bạn đã lưu'}
          </Text>
        </Animated.View>

        {/* Sort bar */}
        {favoriteTours.length > 0 && (
          <View style={st.sortRow}>
            {([['default','Mặc định'],['price_asc','Giá thấp nhất'],['rating','Rating cao']] as const).map(([k, l]) => (
              <TouchableOpacity
                key={k}
                style={[st.sortChip, sort === k && st.sortChipActive]}
                onPress={() => setSort(k)}
              >
                {sort === k && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
                <Text style={[st.sortChipTxt, sort === k && st.sortChipTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Danh sách */}
        {favoriteTours.map((tour, i) => (
          <FavCard
            key={tour.id}
            tour={tour}
            index={i}
            isFav={favoriteIds.includes(tour.id)}
            onToggle={() => onToggle(tour.id)}
            onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })}
          />
        ))}

        {/* Empty state */}
        {favoriteTours.length === 0 && (
          <Animated.View style={[st.empty, { opacity: headerAnim }]}>
            <View style={st.emptyIconWrap}>
              <Ionicons name="heart-outline" size={52} color="#ffb3cc" />
            </View>
            <Text style={st.emptyTitle}>Chưa có tour yêu thích</Text>
            <Text style={st.emptyTxt}>Bấm ❤️ ở trang chi tiết tour để lưu vào đây</Text>
            <TouchableOpacity style={st.exploreBtn} onPress={() => router.push('/explore' as any)}>
              <Ionicons name="compass-outline" size={16} color="#fff" />
              <Text style={st.exploreBtnTxt}>Khám phá tour ngay</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#f3f7ff' },
  content:          { paddingHorizontal: 18 },
  title:            { color: '#1f2a58', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:         { color: '#7a8cc2', marginTop: 5, marginBottom: 16, fontSize: 13 },

  // Sort
  sortRow:          { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  sortChip:         { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  sortChipActive:   { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  sortChipTxt:      { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  sortChipTxtActive:{ color: '#fff' },

  // Card
  card:             { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 10, marginBottom: 12, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 4 },
  imgWrap:          { width: 90, height: 90, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  img:              { width: '100%', height: '100%' },
  fullBadge:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(220,38,38,0.82)', paddingVertical: 3, alignItems: 'center' },
  fullBadgeTxt:     { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Body
  body:             { flex: 1, gap: 3 },
  name:             { color: '#1f2a58', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  starsRow:         { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  ratingTxt:        { color: '#f59e0b', fontSize: 11, fontWeight: '700', marginLeft: 3 },
  meta:             { color: '#7a8cc2', fontSize: 11, marginTop: 1 },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price:            { color: '#4f7cff', fontWeight: '800', fontSize: 14 },
  seatsBadge:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eaf0ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  seatsTxt:         { color: '#2856d6', fontSize: 10, fontWeight: '700' },

  // Heart
  heartBtn:         { padding: 4 },

  // Empty
  empty:            { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyIconWrap:    { width: 90, height: 90, borderRadius: 999, backgroundColor: '#fff0f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ffd6e5' },
  emptyTitle:       { color: '#1f2a58', fontWeight: '700', fontSize: 17 },
  emptyTxt:         { color: '#7a8cc2', textAlign: 'center', lineHeight: 20, fontSize: 13, paddingHorizontal: 20 },
  exploreBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#4f7cff', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  exploreBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});