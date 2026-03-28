/**
 * app/(tabs)/explore.tsx  (guest_explore.tsx)
 * - Đọc tours từ data-store (AsyncStorage), phản ánh admin CRUD
 * - useFocusEffect → reload mỗi khi focus tab
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AppTour, getPublicTours } from '@/constants/data-store';
import { TOUR_CATEGORIES } from '@/constants/travel-data';

// ── Ảnh Unsplash theo tour ID (đồng bộ với index.tsx & tour/[id].tsx) ──
const TOUR_IMG_MAP: Record<string, string> = {
  't1':  'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=500&q=80', // Đà Lạt
  't2':  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500&q=80', // Phú Quốc
  't3':  'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=500&q=80', // Nha Trang
  't4':  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80', // Sapa
  't5':  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=500&q=80', // Hội An
  't6':  'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=500&q=80', // Huế
  't7':  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80', // Mũi Né
  't8':  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500&q=80', // Hà Giang
  't9':  'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=500&q=80', // Cần Thơ
  't10': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80', // Quy Nhơn
  't11': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500&q=80', // Bà Nà
  't12': 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=500&q=80', // Côn Đảo
};

// Fallback ảnh theo tên tour nếu ID không có trong map
function getTourImg(id: string, name?: string, color?: string): string {
  if (TOUR_IMG_MAP[id]) return TOUR_IMG_MAP[id];
  const n = (name || '').toLowerCase();
  if (n.includes('đà lạt'))   return TOUR_IMG_MAP['t1'];
  if (n.includes('phú quốc')) return TOUR_IMG_MAP['t2'];
  if (n.includes('nha trang')) return TOUR_IMG_MAP['t3'];
  if (n.includes('sapa') || n.includes('sa pa')) return TOUR_IMG_MAP['t4'];
  if (n.includes('hội an'))   return TOUR_IMG_MAP['t5'];
  if (n.includes('huế'))      return TOUR_IMG_MAP['t6'];
  if (n.includes('mũi né'))   return TOUR_IMG_MAP['t7'];
  if (n.includes('hà giang')) return TOUR_IMG_MAP['t8'];
  if (n.includes('cần thơ'))  return TOUR_IMG_MAP['t9'];
  if (n.includes('quy nhơn')) return TOUR_IMG_MAP['t10'];
  if (n.includes('bà nà'))    return TOUR_IMG_MAP['t11'];
  if (n.includes('côn đảo'))  return TOUR_IMG_MAP['t12'];
  if (n.includes('hạ long'))  return 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=500&q=80';
  if (n.includes('đà nẵng'))  return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500&q=80';
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=500&q=80';
}

// Category icon map
const CAT_ICON: Record<string, string> = {
  'Biển đảo':  '🏖️',
  'Núi rừng':  '🏔️',
  'Văn hóa':   '🏛️',
  'Gia đình':  '👨‍👩‍👧',
  'Nghỉ dưỡng':'🌴',
  'Phiêu lưu': '🧗',
};

const BUDGET_OPTIONS   = ['Tất cả', '< 2 triệu', '2 - 4 triệu', '> 4 triệu'] as const;
const DURATION_OPTIONS = ['Tất cả', '1-2 ngày', '3-4 ngày', '5+ ngày'] as const;
const RATING_OPTIONS   = ['Tất cả', '4.5+', '4.8+'] as const;
const SEAT_OPTIONS     = ['Tất cả', '≤ 5 chỗ', '≤ 10 chỗ'] as const;

export default function GuestExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tours, setTours] = useState<AppTour[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedBudget, setSelectedBudget]     = useState<(typeof BUDGET_OPTIONS)[number]>('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>('Tất cả');
  const [selectedRating, setSelectedRating]     = useState<(typeof RATING_OPTIONS)[number]>('Tất cả');
  const [selectedSeat, setSelectedSeat]         = useState<(typeof SEAT_OPTIONS)[number]>('Tất cả');
  const [favorites, setFavorites]               = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    // Load favorites từ AsyncStorage
    AsyncStorage.getItem('@guest_favorites').then(raw => {
      if (raw) {
        try {
          const favData = JSON.parse(raw);
          setFavorites(Array.isArray(favData) ? favData.map((f: any) => f.id || f) : []);
        } catch {}
      }
    }).catch(() => {});
    getPublicTours().then(setTours);
  }, []));

  const parsePrice = (p: string) => Number(String(p).replace(/\./g, '').replace('đ', ''));
  const parseDays  = (d: string) => Number(d.split(' ')[0]);
  const fmtPrice   = (p: string) => { const n = Number(p); return isNaN(n) ? p : `${n.toLocaleString('vi-VN')}đ`; };

  const toggleFavorite = async (tour: AppTour) => {
    const raw = await AsyncStorage.getItem('@guest_favorites').catch(() => null);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const exists = list.find((f: any) => (f.id || f) === tour.id);
    let updated: any[];
    if (exists) {
      updated = list.filter((f: any) => (f.id || f) !== tour.id);
      setFavorites(prev => prev.filter(id => id !== tour.id));
    } else {
      updated = [{ id: tour.id, name: tour.name, price: tour.price, category: tour.category, rating: tour.rating, seatsLeft: tour.seatsLeft, duration: tour.duration, departure: tour.departure, color: tour.color, tags: tour.tags }, ...list];
      setFavorites(prev => [tour.id, ...prev]);
    }
    await AsyncStorage.setItem('@guest_favorites', JSON.stringify(updated)).catch(() => {});
  };

  const filteredTours = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tours.filter(t => {
      const matchCat = selectedCategory === 'Tất cả' || t.category === selectedCategory;
      const matchKw  = !kw || t.name.toLowerCase().includes(kw) || t.departure.toLowerCase().includes(kw) || (t.tags || []).join(' ').toLowerCase().includes(kw);
      const price = parsePrice(t.price);
      const matchBudget =
        selectedBudget === 'Tất cả' ||
        (selectedBudget === '< 2 triệu' && price < 2000000) ||
        (selectedBudget === '2 - 4 triệu' && price >= 2000000 && price <= 4000000) ||
        (selectedBudget === '> 4 triệu' && price > 4000000);
      const days = parseDays(t.duration);
      const matchDur =
        selectedDuration === 'Tất cả' ||
        (selectedDuration === '1-2 ngày' && days <= 2) ||
        (selectedDuration === '3-4 ngày' && days >= 3 && days <= 4) ||
        (selectedDuration === '5+ ngày' && days >= 5);
      const matchRating =
        selectedRating === 'Tất cả' ||
        (selectedRating === '4.5+' && t.rating >= 4.5) ||
        (selectedRating === '4.8+' && t.rating >= 4.8);
      const matchSeats =
        selectedSeat === 'Tất cả' ||
        (selectedSeat === '≤ 5 chỗ' && t.seatsLeft <= 5) ||
        (selectedSeat === '≤ 10 chỗ' && t.seatsLeft <= 10);
      return matchCat && matchKw && matchBudget && matchDur && matchRating && matchSeats;
    });
  }, [tours, keyword, selectedCategory, selectedBudget, selectedDuration, selectedRating, selectedSeat]);

  const resetFilters = () => {
    setSelectedBudget('Tất cả'); setSelectedDuration('Tất cả');
    setSelectedRating('Tất cả'); setSelectedSeat('Tất cả');
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>

      {/* ── Header ── */}
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Khám phá tour</Text>
          <Text style={st.subtitle}>Tìm điểm đến phù hợp theo ngân sách và thời gian</Text>
        </View>
        <TouchableOpacity style={st.favHeaderBtn} onPress={() => router.push('/guest_favorites' as any)}>
          <Ionicons name="heart" size={18} color="#ef4444" />
          {favorites.length > 0 && (
            <View style={st.favHeaderBadge}>
              <Text style={st.favHeaderBadgeTxt}>{favorites.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color="#8ea0d6" />
        <TextInput
          style={st.input}
          placeholder="Tìm tour, điểm đến..."
          placeholderTextColor="#b0bdd8"
          value={keyword}
          onChangeText={setKeyword}
        />
        {!!keyword && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Ionicons name="close-circle" size={16} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {['Tất cả', ...TOUR_CATEGORIES].map(c => (
          <TouchableOpacity
            key={c}
            style={[st.filter, selectedCategory === c && st.activeFilter]}
            onPress={() => setSelectedCategory(c)}
          >
            {CAT_ICON[c] && <Text style={{ fontSize: 13 }}>{CAT_ICON[c]}</Text>}
            <Text style={[st.filterText, selectedCategory === c && st.activeFilterText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Advanced filters ── */}
      <View style={st.advancedHeader}>
        <Text style={st.advancedTitle}>Bộ lọc nâng cao</Text>
        <TouchableOpacity onPress={resetFilters} style={st.resetBtn}>
          <Ionicons name="refresh-outline" size={13} color="#4f7cff" />
          <Text style={st.resetText}>Đặt lại</Text>
        </TouchableOpacity>
      </View>

      {/* Giá */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {BUDGET_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filter, selectedBudget === o && st.activeFilter]} onPress={() => setSelectedBudget(o)}>
            <Text style={[st.filterText, selectedBudget === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Thời gian */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filtersMini}>
        {DURATION_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filterMini, selectedDuration === o && st.activeFilterMini]} onPress={() => setSelectedDuration(o)}>
            <Text style={[st.filterMiniText, selectedDuration === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rating + Chỗ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filtersMini}>
        {RATING_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filterMini, selectedRating === o && st.activeFilterMini]} onPress={() => setSelectedRating(o)}>
            <Text style={[st.filterMiniText, selectedRating === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
        {SEAT_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filterMini, selectedSeat === o && st.activeFilterMini]} onPress={() => setSelectedSeat(o)}>
            <Text style={[st.filterMiniText, selectedSeat === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Result count ── */}
      <View style={st.resultRow}>
        <Ionicons name="list-outline" size={14} color="#7a8cc2" />
        <Text style={st.resultText}>Hiển thị <Text style={{ color: '#4f7cff', fontWeight: '700' }}>{filteredTours.length}</Text> tour phù hợp</Text>
      </View>

      {/* ── Tour cards ── */}
      {filteredTours.map((t) => {
        const imgUrl   = getTourImg(t.id, t.name, t.color);
        const isFav    = favorites.includes(t.id);
        const isFull   = t.seatsLeft === 0 || t.status === 'full';
        const isLow    = t.seatsLeft > 0 && t.seatsLeft <= 5;
        const catIcon  = CAT_ICON[t.category] || '📍';

        return (
          <TouchableOpacity
            key={t.id}
            style={st.tourCard}
            onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}
            activeOpacity={0.88}
          >
            {/* ── Ảnh thumbnail ── */}
            <View style={st.thumbWrap}>
              <Image source={{ uri: imgUrl }} style={st.thumbImg} resizeMode="cover" />
              {/* Overlay gradient nhẹ */}
              <View style={st.thumbOverlay} />

              {/* Badge trạng thái chỗ */}
              {isFull ? (
                <View style={st.fullBadge}>
                  <Text style={st.fullBadgeTxt}>Hết chỗ</Text>
                </View>
              ) : isLow ? (
                <View style={st.hotBadge}>
                  <Ionicons name="flame-outline" size={9} color="#fff" />
                  <Text style={st.hotBadgeTxt}>Còn {t.seatsLeft} chỗ</Text>
                </View>
              ) : null}

              {/* Nút yêu thích */}
              <TouchableOpacity
                style={st.favBtn}
                onPress={() => toggleFavorite(t)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={isFav ? '#ef4444' : '#fff'} />
              </TouchableOpacity>

              {/* Rating overlay */}
              <View style={st.ratingOverlay}>
                <Ionicons name="star" size={11} color="#fbbf24" />
                <Text style={st.ratingOverlayTxt}>{t.rating.toFixed(1)}</Text>
              </View>
            </View>

            {/* ── Nội dung card ── */}
            <View style={st.cardBody}>
              {/* Category badge */}
              <View style={st.catBadgeRow}>
                <View style={st.catBadge}>
                  <Text style={st.catBadgeTxt}>{catIcon} {t.category}</Text>
                </View>
              </View>

              <Text style={st.tourName} numberOfLines={2}>{t.name}</Text>

              {/* Meta info */}
              <View style={st.metaRow}>
                <Ionicons name="location-outline" size={11} color="#7a8cc2" />
                <Text style={st.metaTxt}>{t.departure}</Text>
              </View>
              <View style={st.metaRow}>
                <Ionicons name="time-outline" size={11} color="#7a8cc2" />
                <Text style={st.metaTxt}>{t.duration}</Text>
                <Text style={st.metaDot}>·</Text>
                <Ionicons name="people-outline" size={11} color={isLow ? '#ef4444' : '#7a8cc2'} />
                <Text style={[st.metaTxt, isLow && { color: '#ef4444', fontWeight: '700' }]}>
                  {isFull ? 'Hết chỗ' : `${t.seatsLeft} chỗ`}
                </Text>
              </View>

              {/* Tags */}
              {(t.tags || []).length > 0 && (
                <View style={st.tagsRow}>
                  {(t.tags || []).slice(0, 2).map(tag => (
                    <View key={tag} style={st.tagChip}>
                      <Text style={st.tagTxt}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Footer: giá + nút */}
              <View style={st.cardFooter}>
                <View>
                  <Text style={st.priceSub}>Từ</Text>
                  <Text style={st.price}>{fmtPrice(t.price)}</Text>
                </View>
                <TouchableOpacity
                  style={[st.bookBtn, isFull && st.bookBtnDisabled]}
                  disabled={isFull}
                  onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}
                >
                  <Text style={st.bookBtnTxt}>{isFull ? 'Hết chỗ' : 'Đặt ngay'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* ── Empty state ── */}
      {filteredTours.length === 0 && (
        <View style={st.emptyCard}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
          <Text style={st.emptyTitle}>Không tìm thấy tour</Text>
          <Text style={st.emptyText}>Thử đổi từ khóa hoặc bộ lọc khác</Text>
          <TouchableOpacity style={st.emptyResetBtn} onPress={() => { setKeyword(''); resetFilters(); setSelectedCategory('Tất cả'); }}>
            <Text style={st.emptyResetTxt}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Nút yêu thích ── */}
      <TouchableOpacity style={st.outlineButton} onPress={() => router.push('/guest_favorites' as any)}>
        <Ionicons name="heart" size={18} color="#ef4444" />
        <Text style={st.outlineText}>Xem {favorites.length > 0 ? `${favorites.length} tour` : ''} yêu thích</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#f3f7ff' },
  content:      { padding: 16, paddingBottom: 26 },

  // Header
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title:        { color: '#1f2a58', fontSize: 24, fontWeight: '800' },
  subtitle:     { color: '#7a8cc2', marginTop: 4, fontSize: 13 },
  favHeaderBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  favHeaderBadge:   { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  favHeaderBadgeTxt:{ color: '#fff', fontSize: 9, fontWeight: '800' },

  // Search
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  input:        { flex: 1, color: '#1f2a58', fontSize: 14 },

  // Filters
  filters:      { gap: 8, marginBottom: 12, flexDirection: 'row' },
  filter:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 13 },
  filterText:   { color: '#6c7fb7', fontSize: 13 },
  activeFilter: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  activeFilterText: { color: '#fff', fontWeight: '700' },

  advancedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  advancedTitle:  { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  resetBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText:      { color: '#4f7cff', fontWeight: '600', fontSize: 13 },

  filtersMini:     { gap: 7, marginBottom: 10, flexDirection: 'row' },
  filterMini:      { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12 },
  activeFilterMini:{ backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  filterMiniText:  { color: '#6c7fb7', fontSize: 12 },

  // Result row
  resultRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  resultText:   { color: '#7a8cc2', fontSize: 12 },

  // Tour card
  tourCard:     { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 18, overflow: 'hidden', marginBottom: 12, shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },

  // Thumbnail
  thumbWrap:    { width: 110, position: 'relative', minHeight: 130 },
  thumbImg:     { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,25,60,0.08)' },
  hotBadge:     { position: 'absolute', top: 8, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  hotBadgeTxt:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  fullBadge:    { position: 'absolute', top: 8, left: 7, backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  fullBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  favBtn:       { position: 'absolute', top: 8, right: 7, width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  ratingOverlay:{ position: 'absolute', bottom: 8, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  ratingOverlayTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Card body
  cardBody:     { flex: 1, padding: 11 },
  catBadgeRow:  { marginBottom: 5 },
  catBadge:     { backgroundColor: '#eef2ff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  catBadgeTxt:  { color: '#4f7cff', fontSize: 10, fontWeight: '700' },
  tourName:     { color: '#1f2a58', fontWeight: '800', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaTxt:      { color: '#7a8cc2', fontSize: 11 },
  metaDot:      { color: '#c0cbe8', fontSize: 11 },
  tagsRow:      { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 6 },
  tagChip:      { backgroundColor: '#f3f4f6', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt:       { color: '#6b7280', fontSize: 10 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  priceSub:     { color: '#94a3b8', fontSize: 10, fontWeight: '500' },
  price:        { color: '#4f7cff', fontSize: 15, fontWeight: '900' },
  bookBtn:      { backgroundColor: '#4f7cff', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  bookBtnDisabled: { backgroundColor: '#c0cbe8' },
  bookBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 11 },

  // Empty
  emptyCard:    { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', padding: 32, alignItems: 'center', marginBottom: 12 },
  emptyTitle:   { color: '#1f2a58', fontWeight: '800', fontSize: 16, marginBottom: 6 },
  emptyText:    { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
  emptyResetBtn:{ marginTop: 14, backgroundColor: '#eef2ff', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9 },
  emptyResetTxt:{ color: '#4f7cff', fontWeight: '700' },

  // Outline button
  outlineButton:{ marginTop: 4, borderWidth: 1, borderColor: '#fca5a5', borderRadius: 13, height: 46, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: '#fff5f5' },
  outlineText:  { color: '#ef4444', fontWeight: '700' },
});