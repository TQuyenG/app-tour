/**
 * app/(tabs)/index.tsx
 *
 * ĐỌC TRỰC TIẾP từ AsyncStorage:
 *   @app_tours  – admin ghi, guest đọc
 *   @app_guides – admin ghi, guest đọc
 *   @app_profile – profile khách
 *   @guest_notifications – badge unread
 *
 * Seed: nếu @app_tours chưa có → tạo từ TOURS tĩnh
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUIDES as STATIC_GUIDES, TOURS as STATIC_TOURS, TOUR_CATEGORIES } from '@/constants/travel-data';

// ─────────────────────────────────────────────────────
// Types (khớp với admin-tour-management + admin-guide-management)
// ─────────────────────────────────────────────────────
interface AppTour {
  id: string; name: string; category: string; departure: string;
  duration: string; date?: string; price: string; priceRaw?: number;
  rating: number; seatsLeft: number; seats?: number;
  status: 'active' | 'full' | 'draft';
  description?: string; tags?: string[]; color?: string;
}

interface AppGuide {
  id: string; name: string; location: string; experience: string;
  skills: string[]; rating: number; tours: number; match: number;
  status?: 'active' | 'busy' | 'inactive';
  phone?: string; email?: string;
}

interface AppProfile { name: string; [key: string]: any; }

// ─────────────────────────────────────────────────────
// Seed helpers – chỉ chạy lần đầu nếu @app_tours chưa có
// ─────────────────────────────────────────────────────
const TOUR_COLORS = ['#99bbff', '#93d5ff', '#b5f0c0', '#ffd6a5', '#d0b3ff'];

function seedTours(): AppTour[] {
  return STATIC_TOURS.map((t, i) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    departure: t.departure,
    duration: t.duration,
    date: (t as any).date ?? '',
    price: t.price,
    priceRaw: Number(t.price.replace(/\./g, '').replace('đ', '')) || 0,
    rating: t.rating,
    seatsLeft: t.seatsLeft,
    seats: t.seatsLeft + 5,
    status: (t.seatsLeft === 0 ? 'full' : 'active') as AppTour['status'],
    description: (t as any).description ?? '',
    tags: (t as any).tags ?? [],
    color: (t as any).color ?? TOUR_COLORS[i % TOUR_COLORS.length],
  }));
}

function seedGuides(): AppGuide[] {
  return STATIC_GUIDES.map(g => ({
    id: g.id, name: g.name, location: g.location,
    experience: g.experience, skills: g.skills,
    rating: g.rating, tours: g.tours, match: g.match,
    status: 'active' as const, phone: '', email: '',
  }));
}

async function loadTours(): Promise<AppTour[]> {
  try {
    const raw = await AsyncStorage.getItem('@app_tours');
    if (raw) return JSON.parse(raw);
    const seeded = seedTours();
    await AsyncStorage.setItem('@app_tours', JSON.stringify(seeded));
    return seeded;
  } catch { return seedTours(); }
}

async function loadGuides(): Promise<AppGuide[]> {
  try {
    const raw = await AsyncStorage.getItem('@app_guides');
    if (raw) return JSON.parse(raw);
    const seeded = seedGuides();
    await AsyncStorage.setItem('@app_guides', JSON.stringify(seeded));
    return seeded;
  } catch { return seedGuides(); }
}

async function loadProfile(): Promise<AppProfile> {
  try {
    const raw = await AsyncStorage.getItem('@app_profile');
    return raw ? JSON.parse(raw) : { name: 'bạn' };
  } catch { return { name: 'bạn' }; }
}

// ─────────────────────────────────────────────────────
// Filter constants
// ─────────────────────────────────────────────────────
const BUDGET_OPTIONS   = ['Tất cả', '< 2 triệu', '2 - 4 triệu', '> 4 triệu'] as const;
const DURATION_OPTIONS = ['Tất cả', '1-2 ngày', '3-4 ngày', '5+ ngày'] as const;
const RATING_OPTIONS   = ['Tất cả', '4.5+', '4.8+'] as const;
const SEAT_OPTIONS     = ['Tất cả', '≤ 5 chỗ', '≤ 10 chỗ'] as const;

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tours,       setTours]       = useState<AppTour[]>([]);
  const [guides,      setGuides]      = useState<AppGuide[]>([]);
  const [guestName,   setGuestName]   = useState('bạn');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  const [keyword,          setKeyword]          = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedBudget,   setSelectedBudget]   = useState<typeof BUDGET_OPTIONS[number]>('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState<typeof DURATION_OPTIONS[number]>('Tất cả');
  const [selectedRating,   setSelectedRating]   = useState<typeof RATING_OPTIONS[number]>('Tất cả');
  const [selectedSeat,     setSelectedSeat]     = useState<typeof SEAT_OPTIONS[number]>('Tất cả');

  // Reload mỗi khi quay về tab này
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadTours(),
      loadGuides(),
      loadProfile(),
      AsyncStorage.getItem('@guest_notifications').catch(() => null),
    ]).then(([t, g, profile, notifRaw]) => {
      if (!active) return;
      setTours(t.filter(tour => tour.status !== 'draft'));
      setGuides(g.filter(guide => guide.status !== 'inactive'));
      setGuestName((profile.name || 'bạn').trim().split(' ').pop() || 'bạn');
      if (notifRaw) {
        try { setUnreadCount(JSON.parse(notifRaw).filter((n: any) => !n.read).length); } catch {}
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  // Filter logic
  const parsePriceNum = (p: string | number) =>
    typeof p === 'number' ? p : Number(String(p).replace(/[^0-9]/g, '')) || 0;
  const parseDays = (d: string) => Number(d.split(' ')[0]) || 0;

  const filteredTours = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tours.filter(t => {
      if (selectedCategory !== 'Tất cả' && t.category !== selectedCategory) return false;
      if (kw && !t.name.toLowerCase().includes(kw) && !t.departure.toLowerCase().includes(kw) &&
          !(t.tags ?? []).join(' ').toLowerCase().includes(kw)) return false;
      const price = t.priceRaw ?? parsePriceNum(t.price);
      if (selectedBudget === '< 2 triệu'   && price >= 2000000) return false;
      if (selectedBudget === '2 - 4 triệu' && (price < 2000000 || price > 4000000)) return false;
      if (selectedBudget === '> 4 triệu'   && price <= 4000000) return false;
      const days = parseDays(t.duration);
      if (selectedDuration === '1-2 ngày' && days > 2) return false;
      if (selectedDuration === '3-4 ngày' && (days < 3 || days > 4)) return false;
      if (selectedDuration === '5+ ngày'  && days < 5) return false;
      if (selectedRating === '4.5+' && t.rating < 4.5) return false;
      if (selectedRating === '4.8+' && t.rating < 4.8) return false;
      if (selectedSeat === '≤ 5 chỗ'  && t.seatsLeft > 5)  return false;
      if (selectedSeat === '≤ 10 chỗ' && t.seatsLeft > 10) return false;
      return true;
    });
  }, [tours, keyword, selectedCategory, selectedBudget, selectedDuration, selectedRating, selectedSeat]);

  const filteredGuides = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return guides;
    return guides.filter(g =>
      g.name.toLowerCase().includes(kw) ||
      g.location.toLowerCase().includes(kw) ||
      g.skills.join(' ').toLowerCase().includes(kw)
    );
  }, [guides, keyword]);

  const resetFilters = () => {
    setSelectedBudget('Tất cả'); setSelectedDuration('Tất cả');
    setSelectedRating('Tất cả'); setSelectedSeat('Tất cả');
  };

  const formatDisplayPrice = (t: AppTour) => {
    if (t.price && t.price.includes('đ')) return t.price;
    const n = t.priceRaw ?? parsePriceNum(t.price);
    return n > 0 ? `${n.toLocaleString('vi-VN')}đ` : t.price;
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#4f7cff" />
        <Text style={s.loadingTxt}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 14, paddingBottom: 100 }]}>

      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.greeting}>Xin chào, {guestName} 👋</Text>
          <Text style={s.heading}>Chọn chuyến đi của bạn</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/guest_notifications' as any)}>
            <Ionicons name="notifications-outline" size={20} color="#4f7cff" />
            {unreadCount > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/guest_favorites' as any)}>
            <Ionicons name="heart-outline" size={20} color="#4f7cff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero */}
      <View style={s.heroCard}>
        <View>
          <Text style={s.heroTitle}>Ưu đãi mùa hè</Text>
          <Text style={s.heroSubtitle}>Giảm tới 35% cho tour biển và cao nguyên</Text>
        </View>
        {tours.length > 0 && (
          <TouchableOpacity style={s.heroBtn}
            onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tours[0].id } })}>
            <Text style={s.heroBtnTxt}>Xem tour</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm địa điểm, thành phố, tour..."
          value={keyword} onChangeText={setKeyword} placeholderTextColor="#8ea0d6" />
        {!!keyword && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Ionicons name="close-circle" size={16} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick shortcuts */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickItem} onPress={() => router.push('/explore')}>
          <MaterialCommunityIcons name="island" size={20} color="#4f7cff" />
          <Text style={s.quickTxt}>Biển</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickItem} onPress={() => router.push('/explore')}>
          <MaterialCommunityIcons name="pine-tree" size={20} color="#4f7cff" />
          <Text style={s.quickTxt}>Núi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickItem} onPress={() => router.push('/bookings')}>
          <Ionicons name="ticket-outline" size={20} color="#4f7cff" />
          <Text style={s.quickTxt}>Vé của tôi</Text>
        </TouchableOpacity>
      </View>

      {/* Find guide CTA */}
      <TouchableOpacity style={s.findGuideBtn} onPress={() => router.push('/guest_search_guide' as any)}>
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={s.findGuideTxt}>Tìm Hướng dẫn viên AI ngay</Text>
        <Ionicons name="flash" size={15} color="#ffe07a" />
      </TouchableOpacity>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {['Tất cả', ...TOUR_CATEGORIES].map(cat => (
          <TouchableOpacity key={cat}
            style={[s.chip, selectedCategory === cat && s.chipActive]}
            onPress={() => setSelectedCategory(cat)}>
            <Text style={[s.chipTxt, selectedCategory === cat && s.chipTxtActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Advanced filters */}
      <View style={s.advRow}>
        <Text style={s.advTitle}>Bộ lọc nâng cao</Text>
        <TouchableOpacity onPress={resetFilters}><Text style={s.resetTxt}>Đặt lại</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {BUDGET_OPTIONS.map(opt => (
          <TouchableOpacity key={opt} style={[s.chip, selectedBudget === opt && s.chipActive]} onPress={() => setSelectedBudget(opt)}>
            <Text style={[s.chipTxt, selectedBudget === opt && s.chipTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.miniRow}>
        {DURATION_OPTIONS.map(opt => (
          <TouchableOpacity key={opt} style={[s.miniChip, selectedDuration === opt && s.miniChipActive]} onPress={() => setSelectedDuration(opt)}>
            <Text style={[s.miniTxt, selectedDuration === opt && s.miniTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.miniRow}>
        {RATING_OPTIONS.map(opt => (
          <TouchableOpacity key={opt} style={[s.miniChip, selectedRating === opt && s.miniChipActive]} onPress={() => setSelectedRating(opt)}>
            <Text style={[s.miniTxt, selectedRating === opt && s.miniTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
        {SEAT_OPTIONS.map(opt => (
          <TouchableOpacity key={opt} style={[s.miniChip, selectedSeat === opt && s.miniChipActive]} onPress={() => setSelectedSeat(opt)}>
            <Text style={[s.miniTxt, selectedSeat === opt && s.miniTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── TOUR LIST ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Tour nổi bật</Text>
        <Text style={s.resultTxt}>{filteredTours.length} tour</Text>
      </View>

      {filteredTours.map((t, idx) => (
        <TouchableOpacity key={t.id} style={s.tourCard} activeOpacity={0.9}
          onPress={() => router.push('/guest_booking_flow' as any)}>
          <View style={[s.tourImg, { backgroundColor: t.color ?? (idx % 2 ? '#93d5ff' : '#99bbff') }]} />
          <View style={s.tourBody}>
            <Text style={s.tourName}>{t.name}</Text>
            <Text style={s.tourMeta}>{t.departure} · {t.duration}</Text>
            <Text style={s.tourCat}>{t.category}</Text>
            <View style={s.tourBottom}>
              <Text style={s.tourPrice}>{formatDisplayPrice(t)}</Text>
              <View style={s.ratingRow}>
                <Ionicons name="star" size={13} color="#ffbe40" />
                <Text style={s.ratingTxt}>{t.rating.toFixed(1)}</Text>
                {t.seatsLeft > 0 && t.seatsLeft <= 3 && (
                  <Text style={s.seatsAlert}> · {t.seatsLeft} chỗ!</Text>
                )}
                {t.seatsLeft === 0 && <Text style={s.fullTxt}> · Hết</Text>}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {filteredTours.length === 0 && (
        <View style={s.emptyCard}>
          <Text style={s.emptyTxt}>Không tìm thấy tour phù hợp, thử đổi bộ lọc.</Text>
        </View>
      )}

      {/* ── GUIDE LIST ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Hướng dẫn viên</Text>
        <TouchableOpacity onPress={() => router.push('/guest_search_guide' as any)}>
          <Text style={s.linkTxt}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {filteredGuides.map(g => (
        <TouchableOpacity key={g.id} style={s.guideCard} activeOpacity={0.9}
          onPress={() => router.push('/guest_search_guide' as any)}>
          <View style={s.guideAvatar} />
          <View style={s.guideBody}>
            <View style={s.guideTopRow}>
              <Text style={s.guideName}>{g.name}</Text>
              <View style={s.matchBadge}>
                <Ionicons name="flash" size={12} color="#4f7cff" />
                <Text style={s.matchTxt}>{g.match}%</Text>
              </View>
            </View>
            <Text style={s.guideMeta}>{g.location} · {g.experience}</Text>
            <Text style={s.guideSkill}>{(g.skills ?? []).slice(0, 2).join(' · ')}</Text>
          </View>
          <View style={[s.statusDot, { backgroundColor: g.status === 'busy' ? '#d97706' : '#16a34a' }]} />
          <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {filteredGuides.length === 0 && (
        <View style={s.emptyCard}>
          <Text style={s.emptyTxt}>Không có hướng dẫn viên phù hợp từ khóa tìm kiếm</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff', gap: 12 },
  loadingTxt: { color: '#7a8cc2', fontWeight: '600' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#7a8cc2', fontSize: 13 },
  heading: { color: '#1f2a58', fontSize: 23, fontWeight: '700', marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#f3f7ff' },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  heroCard: { marginTop: 16, borderRadius: 20, padding: 18, backgroundColor: '#4f7cff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '700', marginBottom: 6 },
  heroSubtitle: { color: '#dfe8ff', maxWidth: 190, lineHeight: 20 },
  heroBtn: { backgroundColor: '#fff', borderRadius: 12, height: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  heroBtnTxt: { color: '#4f7cff', fontWeight: '700' },

  searchBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#1f2a58' },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  quickItem: { flex: 1, marginHorizontal: 4, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  quickTxt: { color: '#5f73a9', fontSize: 12, fontWeight: '600' },

  findGuideBtn: { marginTop: 16, height: 48, borderRadius: 14, backgroundColor: '#1a55e8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  findGuideTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  chipRow: { gap: 8, marginTop: 14, marginBottom: 2 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  chipTxt: { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },

  advRow: { marginTop: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  advTitle: { color: '#1f2a58', fontWeight: '700' },
  resetTxt: { color: '#4f7cff', fontWeight: '600' },

  miniRow: { gap: 8, marginBottom: 10 },
  miniChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  miniChipActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  miniTxt: { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  miniTxtActive: { color: '#fff' },

  sectionHeader: { marginTop: 22, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#1f2a58', fontSize: 18, fontWeight: '700' },
  linkTxt: { color: '#4f7cff', fontWeight: '600' },
  resultTxt: { color: '#7a8cc2', fontSize: 12 },

  tourCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 10, gap: 12 },
  tourImg: { width: 88, height: 88, borderRadius: 12 },
  tourBody: { flex: 1 },
  tourName: { color: '#1f2a58', fontWeight: '700' },
  tourMeta: { color: '#7a8cc2', fontSize: 12, marginTop: 6 },
  tourCat: { color: '#93a3d1', fontSize: 11, marginTop: 4 },
  tourBottom: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourPrice: { color: '#4f7cff', fontWeight: '700', fontSize: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { color: '#7a8cc2', fontWeight: '600' },
  seatsAlert: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  fullTxt: { color: '#7a8cc2', fontSize: 11 },

  guideCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 10 },
  guideAvatar: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#9cc3ff' },
  guideBody: { flex: 1 },
  guideTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  guideName: { color: '#1f2a58', fontWeight: '700' },
  guideMeta: { color: '#7a8cc2', fontSize: 12, marginTop: 4 },
  guideSkill: { color: '#5f73a9', fontSize: 12, marginTop: 3 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#edf2ff', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  matchTxt: { color: '#4f7cff', fontSize: 11, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center' },
  emptyTxt: { color: '#7a8cc2' },
});