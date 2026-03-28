/**
 * app/(tabs)/index.tsx
 * Trang chủ Guest — Phiên bản Premium
 * - Banner có ảnh thật từ Unsplash (giống admin preview)
 * - Màu chủ đạo: #4f7cff (xanh dương đẹp như bản gốc)
 * - Hình ảnh tour, HDV, điểm đến đều có ảnh minh họa
 * - Spacing đồng nhất, chuyên nghiệp
 * - ~1800 dòng
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GUIDES as STATIC_GUIDES,
  TOURS as STATIC_TOURS,
  TOUR_CATEGORIES,
} from '@/constants/travel-data';

const { width: W } = Dimensions.get('window');
const CARD_W = W;

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
interface AppTour {
  id: string; name: string; category: string; departure: string;
  duration: string; date?: string; price: string; priceRaw?: number;
  rating: number; seatsLeft: number; seats?: number;
  status: 'active' | 'full' | 'draft';
  description?: string; tags?: string[]; color?: string; image?: string;
}
interface AppGuide {
  id: string; name: string; location: string; experience: string;
  skills: string[]; rating: number; tours: number; match: number;
  status?: 'active' | 'busy' | 'inactive'; avatar?: string;
}
interface AppProfile { name: string; avatar?: string; [key: string]: any; }

// ─────────────────────────────────────────────────────
// Ảnh Unsplash — tour, điểm đến, HDV
// ─────────────────────────────────────────────────────
const TOUR_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80', // Đà Lạt
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80', // Phú Quốc
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80', // Hội An
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', // Sapa
  'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80', // Hạ Long
  'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=400&q=80', // Nha Trang
  'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400&q=80', // Huế
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80', // Núi rừng
  'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400&q=80', // Biển
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', // Đảo
];

const GUIDE_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
];

// ─────────────────────────────────────────────────────
// Banner data — đồng bộ với admin (ảnh thật)
// ─────────────────────────────────────────────────────
const BANNERS = [
  {
    id: 'b1',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=85',
    tag: '🔥 Flash Sale',
    title: 'Ưu đãi mùa hè',
    subtitle: 'Giảm tới 35% tour biển & cao nguyên',
    cta: 'Xem tour',
    badge: 'HOT',
    discount: '-35%',
  },
  {
    id: 'b2',
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=85',
    tag: '⭐ Tour mới',
    title: 'Khám phá Đà Lạt',
    subtitle: 'Săn mây, chill cafe, đạp xe vườn hoa',
    cta: 'Đặt ngay',
    badge: 'MỚI',
    discount: '',
  },
  {
    id: 'b3',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=85',
    tag: '⛵ Vịnh kỳ quan',
    title: 'Hạ Long 3N2Đ',
    subtitle: 'Cruise 5 sao, kayak, thám hiểm hang động',
    cta: 'Khám phá',
    badge: 'BEST',
    discount: '-20%',
  },
  {
    id: 'b4',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=85',
    tag: '🏝️ Nghỉ dưỡng',
    title: 'Phú Quốc Resort',
    subtitle: 'Bãi biển trong vắt, snorkeling, thư giãn',
    cta: 'Xem ngay',
    badge: 'HOT',
    discount: '-15%',
  },
];

// ─────────────────────────────────────────────────────
// Điểm đến phổ biến — có ảnh thật
// ─────────────────────────────────────────────────────
const DESTINATIONS = [
  { name: 'Đà Lạt',   count: 24, img: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=300&q=80' },
  { name: 'Phú Quốc', count: 18, img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=300&q=80' },
  { name: 'Hội An',   count: 15, img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=300&q=80' },
  { name: 'Sapa',     count: 12, img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=80' },
  { name: 'Hạ Long',  count: 20, img: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=300&q=80' },
  { name: 'Nha Trang',count: 16, img: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=300&q=80' },
];

// ─────────────────────────────────────────────────────
// Quick actions
// ─────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: 'island'        as const, label: 'Biển',       color: '#0284c7', bg: '#e0f2fe' },
  { icon: 'pine-tree'     as const, label: 'Núi',        color: '#16a34a', bg: '#dcfce7' },
  { icon: 'city'          as const, label: 'Thành phố',  color: '#7c3aed', bg: '#ede9fe' },
  { icon: 'food'          as const, label: 'Ẩm thực',    color: '#d97706', bg: '#fef3c7' },
];

// ─────────────────────────────────────────────────────
// Trust stats
// ─────────────────────────────────────────────────────
const TRUST_STATS = [
  { icon: '🛡️', value: '100%',  label: 'Hoàn tiền', sub: 'Hủy trước 48h' },
  { icon: '⭐', value: '4.9',   label: 'Đánh giá',  sub: '12.000+ khách' },
  { icon: '🏆', value: '500+',  label: 'Tours',      sub: 'Toàn quốc' },
];

// ─────────────────────────────────────────────────────
// Filter options
// ─────────────────────────────────────────────────────
const BUDGET_OPTIONS   = ['Tất cả', '< 2 triệu', '2–4 triệu', '> 4 triệu'] as const;
const DURATION_OPTIONS = ['Tất cả', '1–2 ngày', '3–4 ngày', '5+ ngày']     as const;
const RATING_OPTIONS   = ['Tất cả', '4.5+', '4.8+']                         as const;
const SORT_OPTIONS     = ['Mặc định', 'Giá thấp', 'Giá cao', 'Đánh giá']   as const;

// ─────────────────────────────────────────────────────
// Seed helpers
// ─────────────────────────────────────────────────────
function seedTours(): AppTour[] {
  return STATIC_TOURS.map((t, i) => ({
    id: t.id, name: t.name, category: t.category, departure: t.departure,
    duration: t.duration, date: (t as any).date ?? '',
    price: t.price,
    priceRaw: Number(t.price.replace(/\./g, '').replace('đ', '').replace(/[^0-9]/g, '')) || 0,
    rating: t.rating, seatsLeft: t.seatsLeft, seats: t.seatsLeft + 5,
    status: (t.seatsLeft === 0 ? 'full' : 'active') as AppTour['status'],
    description: (t as any).description ?? '',
    tags: (t as any).tags ?? [],
    color: (t as any).color ?? '#4f7cff',
    image: TOUR_IMAGES[i % TOUR_IMAGES.length],
  }));
}
function seedGuides(): AppGuide[] {
  return STATIC_GUIDES.map((g, i) => ({
    id: g.id, name: g.name, location: g.location,
    experience: g.experience, skills: g.skills,
    rating: g.rating, tours: g.tours, match: g.match,
    status: 'active' as const,
    avatar: GUIDE_AVATARS[i % GUIDE_AVATARS.length],
  }));
}
async function loadTours(): Promise<AppTour[]> {
  try {
    const raw = await AsyncStorage.getItem('@app_tours');
    if (raw) {
      const parsed: AppTour[] = JSON.parse(raw);
      return parsed.map((t, i) => ({ ...t, image: t.image || TOUR_IMAGES[i % TOUR_IMAGES.length] }));
    }
    const seeded = seedTours();
    await AsyncStorage.setItem('@app_tours', JSON.stringify(seeded));
    return seeded;
  } catch { return seedTours(); }
}
async function loadGuides(): Promise<AppGuide[]> {
  try {
    const raw = await AsyncStorage.getItem('@app_guides');
    if (raw) {
      const parsed: AppGuide[] = JSON.parse(raw);
      return parsed.map((g, i) => ({ ...g, avatar: g.avatar || GUIDE_AVATARS[i % GUIDE_AVATARS.length] }));
    }
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
// Helpers
// ─────────────────────────────────────────────────────
const parsePriceNum = (p: string | number) =>
  typeof p === 'number' ? p : Number(String(p).replace(/[^0-9]/g, '')) || 0;
const parseDays = (d: string) => Number(d.split(' ')[0]) || 0;
const fmtPrice  = (t: AppTour) => {
  if (t.price?.includes('đ')) return t.price;
  const n = t.priceRaw ?? parsePriceNum(t.price);
  return n > 0 ? `${n.toLocaleString('vi-VN')}đ` : t.price;
};
const getInitials = (name: string) =>
  name.split(' ').slice(-2).map(w => w[0] ?? '').join('').toUpperCase();

const AVATAR_COLORS = ['#4f7cff', '#0284c7', '#7c3aed', '#d97706', '#dc2626', '#16a34a', '#0891b2', '#be185d'];

// ─────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bannerRef = useRef<ScrollView>(null);

const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data state
  const [tours,       setTours]       = useState<AppTour[]>([]);
  const [guides,      setGuides]      = useState<AppGuide[]>([]);
  const [guestName,   setGuestName]   = useState('bạn');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [bannerIdx,   setBannerIdx]   = useState(0);

  // Filter state
  const [keyword,          setKeyword]          = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedBudget,   setSelectedBudget]   = useState<typeof BUDGET_OPTIONS[number]>('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState<typeof DURATION_OPTIONS[number]>('Tất cả');
  const [selectedRating,   setSelectedRating]   = useState<typeof RATING_OPTIONS[number]>('Tất cả');
  const [selectedSort,     setSelectedSort]     = useState<typeof SORT_OPTIONS[number]>('Mặc định');
  const [showFilters,      setShowFilters]       = useState(false);
  const [favorites,        setFavorites]         = useState<Set<string>>(new Set());

  // Load data
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadTours(), loadGuides(), loadProfile(),
      AsyncStorage.getItem('@guest_notifications').catch(() => null),
      AsyncStorage.getItem('@guest_favorites').catch(() => null),
    ]).then(([t, g, profile, notifRaw, favRaw]) => {
      if (!active) return;
      setTours(t.filter(tour => tour.status !== 'draft'));
      setGuides(g.filter(guide => guide.status !== 'inactive'));
      setGuestName((profile.name || 'bạn').trim().split(' ').pop() || 'bạn');
      if (notifRaw) {
        try { setUnreadCount(JSON.parse(notifRaw).filter((n: any) => !n.read).length); } catch {}
      }
      if (favRaw) {
        try { setFavorites(new Set(JSON.parse(favRaw))); } catch {}
      }
      setLoading(false);
    });
    // Auto-scroll banner mỗi 3 giây
    bannerTimer.current = setInterval(() => {
      setBannerIdx(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * W, animated: true });
        return next;
      });
    }, 8000);

    return () => {
      active = false;
      if (bannerTimer.current) clearInterval(bannerTimer.current);
    };
  }, []));

  // Toggle favorite
  const toggleFav = async (id: string) => {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
    await AsyncStorage.setItem('@guest_favorites', JSON.stringify([...next])).catch(() => {});
  };

  // Filter + sort tours
  const filteredTours = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let result = tours.filter(t => {
      if (selectedCategory !== 'Tất cả' && t.category !== selectedCategory) return false;
      if (kw && !t.name.toLowerCase().includes(kw) && !t.departure.toLowerCase().includes(kw) &&
          !(t.tags ?? []).join(' ').toLowerCase().includes(kw)) return false;
      const price = t.priceRaw ?? parsePriceNum(t.price);
      if (selectedBudget === '< 2 triệu'  && price >= 2000000) return false;
      if (selectedBudget === '2–4 triệu'  && (price < 2000000 || price > 4000000)) return false;
      if (selectedBudget === '> 4 triệu'  && price <= 4000000) return false;
      const days = parseDays(t.duration);
      if (selectedDuration === '1–2 ngày' && days > 2) return false;
      if (selectedDuration === '3–4 ngày' && (days < 3 || days > 4)) return false;
      if (selectedDuration === '5+ ngày'  && days < 5) return false;
      if (selectedRating === '4.5+' && t.rating < 4.5) return false;
      if (selectedRating === '4.8+' && t.rating < 4.8) return false;
      return true;
    });
    if (selectedSort === 'Giá thấp') result = [...result].sort((a, b) => (a.priceRaw ?? 0) - (b.priceRaw ?? 0));
    if (selectedSort === 'Giá cao')  result = [...result].sort((a, b) => (b.priceRaw ?? 0) - (a.priceRaw ?? 0));
    if (selectedSort === 'Đánh giá') result = [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [tours, keyword, selectedCategory, selectedBudget, selectedDuration, selectedRating, selectedSort]);

  const filteredGuides = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return guides.slice(0, 6);
    return guides.filter(g =>
      g.name.toLowerCase().includes(kw) ||
      g.location.toLowerCase().includes(kw) ||
      g.skills.join(' ').toLowerCase().includes(kw)
    ).slice(0, 6);
  }, [guides, keyword]);

  const resetFilters = () => {
    setSelectedBudget('Tất cả'); setSelectedDuration('Tất cả');
    setSelectedRating('Tất cả'); setSelectedSort('Mặc định');
    setSelectedCategory('Tất cả');
  };

  const activeFilterCount = [
    selectedBudget !== 'Tất cả', selectedDuration !== 'Tất cả',
    selectedRating !== 'Tất cả', selectedSort !== 'Mặc định',
    selectedCategory !== 'Tất cả',
  ].filter(Boolean).length;

  const featuredTours = filteredTours.filter(t => t.rating >= 4.7).slice(0, 5);
  const hotTours      = filteredTours.filter(t => t.seatsLeft > 0 && t.seatsLeft <= 5);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
  };

  const onBannerTouchStart = () => {
    if (bannerTimer.current) clearInterval(bannerTimer.current);
  };

  const onBannerTouchEnd = () => {
    bannerTimer.current = setInterval(() => {
      setBannerIdx(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollTo({ x: next * CARD_W, animated: true });
        return next;
      });
    }, 3000);
  };

  // ── Loading screen ──
  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
        <View style={s.loadingCard}>
          <Text style={s.loadingLogo}>TourGo</Text>
          <Text style={s.loadingTagline}>Khám phá Việt Nam cùng chúng tôi</Text>
          <ActivityIndicator size="large" color="#4f7cff" style={{ marginTop: 28 }} />
          <Text style={s.loadingTxt}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a3fb0" />

      {/* ════════════════════════════════════════════════
          HEADER — xanh đậm như admin
      ════════════════════════════════════════════════ */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        {/* Top row */}
        <View style={s.headerTop}>
          <View>
            <View style={s.locationRow}>
              <Ionicons name="location" size={12} color="#93c5fd" />
              <Text style={s.locationTxt}>Việt Nam</Text>
            </View>
            <Text style={s.greeting}>
              Xin chào, <Text style={s.greetBold}>{guestName}</Text> 👋
            </Text>
          </View>
          <View style={s.headerBtns}>
            <TouchableOpacity
              style={s.hBtn}
              onPress={() => router.push('/guest_notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.hBtn}
              onPress={() => router.push('/guest_favorites' as any)}
            >
              <Ionicons name="heart-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="#7a8cc2" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm điểm đến, tour, HDV..."
              value={keyword}
              onChangeText={v => { setKeyword(v); }}
              placeholderTextColor="#a0b0d4"
              returnKeyType="search"
            />
            {!!keyword && (
              <TouchableOpacity onPress={() => setKeyword('')}>
                <Ionicons name="close-circle" size={16} color="#a0b0d4" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setShowFilters(v => !v)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#4f7cff'} />
            {activeFilterCount > 0 && (
              <View style={s.filterDot}>
                <Text style={s.filterDotTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════════════
          FILTER PANEL (collapsible)
      ════════════════════════════════════════════════ */}
      {showFilters && (
        <View style={s.filterPanel}>
          <View style={s.filterPanelHead}>
            <Text style={s.filterPanelTitle}>Bộ lọc nâng cao</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={s.resetTxt}>Đặt lại tất cả</Text>
            </TouchableOpacity>
          </View>
          {/* Budget */}
          <Text style={s.filterGroupLabel}>💰 Ngân sách</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {BUDGET_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.fChip, selectedBudget === opt && s.fChipOn]}
                onPress={() => setSelectedBudget(opt)}
              >
                <Text style={[s.fChipTxt, selectedBudget === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Duration */}
          <Text style={s.filterGroupLabel}>🕐 Thời gian</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.fChip, selectedDuration === opt && s.fChipOn]}
                onPress={() => setSelectedDuration(opt)}
              >
                <Text style={[s.fChipTxt, selectedDuration === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Rating */}
          <Text style={s.filterGroupLabel}>⭐ Đánh giá</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {RATING_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.fChip, selectedRating === opt && s.fChipOn]}
                onPress={() => setSelectedRating(opt)}
              >
                <Text style={[s.fChipTxt, selectedRating === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Sort */}
          <Text style={s.filterGroupLabel}>↕️ Sắp xếp</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.fChip, selectedSort === opt && s.fChipOn]}
                onPress={() => setSelectedSort(opt)}
              >
                <Text style={[s.fChipTxt, selectedSort === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ════════════════════════════════════════════════
          BODY
      ════════════════════════════════════════════════ */}
      <View style={s.body}>

        {/* ── BANNER CAROUSEL — có ảnh thật, giống admin ── */}
        <View style={s.bannerSection}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            onTouchStart={onBannerTouchStart}
            onTouchEnd={onBannerTouchEnd}
            contentContainerStyle={{ gap: 0 }}
          >
          
          
            {BANNERS.map((b, bi) => (
              <TouchableOpacity
                key={b.id}
                style={[s.bannerCard, { width: W - 36, marginHorizontal: 18 }]}
                activeOpacity={0.93}
                onPress={() => router.push('/guest_booking_flow' as any)}
              >
                {/* Real photo */}
                <Image
                  source={{ uri: b.image }}
                  style={s.bannerImg}
                  resizeMode="cover"
                />
                {/* Dark gradient overlay */}
                <View style={s.bannerOverlay} />
                {/* Badge HOT/MỚI */}
                <View style={[s.bannerBadge,
                  b.badge === 'HOT'  && { backgroundColor: '#ef4444' },
                  b.badge === 'MỚI'  && { backgroundColor: '#16a34a' },
                  b.badge === 'BEST' && { backgroundColor: '#d97706' },
                ]}>
                  {b.badge === 'HOT' && <Ionicons name="flame" size={10} color="#fff" />}
                  <Text style={s.bannerBadgeTxt}>{b.badge}</Text>
                </View>
                {/* Discount pill */}
                {!!b.discount && (
                  <View style={s.bannerDiscount}>
                    <Text style={s.bannerDiscountTxt}>{b.discount}</Text>
                  </View>
                )}
                {/* Content */}
                <View style={s.bannerContent}>
                  <View style={s.bannerTag}>
                    <Text style={s.bannerTagTxt}>{b.tag}</Text>
                  </View>
                  <Text style={s.bannerTitle}>{b.title}</Text>
                  <Text style={s.bannerSub}>{b.subtitle}</Text>
                  <View style={s.bannerCta}>
                    <Text style={s.bannerCtaTxt}>{b.cta}</Text>
                    <Ionicons name="arrow-forward" size={13} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={s.dotsRow}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[s.dot, bannerIdx === i && s.dotOn]} />
            ))}
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={s.quickRow}>
          {QUICK_ACTIONS.map(q => (
            <TouchableOpacity
              key={q.label}
              style={[s.quickItem, { backgroundColor: q.bg }]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={q.icon} size={24} color={q.color} />
              <Text style={[s.quickTxt, { color: q.color }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── AI GUIDE CTA ── */}
        <TouchableOpacity
          style={s.aiCta}
          onPress={() => router.push('/guest_search_guide' as any)}
          activeOpacity={0.9}
        >
          <View style={s.aiLeft}>
            <View style={s.aiIconWrap}>
              <Ionicons name="flash" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={s.aiTitle}>Tìm HDV bằng AI</Text>
              <Text style={s.aiSub}>Ghép cặp thông minh trong 30 giây</Text>
            </View>
          </View>
          <View style={s.aiBtn}>
            <Text style={s.aiBtnTxt}>Thử ngay</Text>
            <Ionicons name="arrow-forward" size={13} color="#1a3fb0" />
          </View>
        </TouchableOpacity>

        {/* ── TRUST STATS ── */}
        <View style={s.trustRow}>
          {TRUST_STATS.map((t, i) => (
            <View key={i} style={s.trustCard}>
              <Text style={s.trustIcon}>{t.icon}</Text>
              <Text style={s.trustValue}>{t.value}</Text>
              <Text style={s.trustLabel}>{t.label}</Text>
              <Text style={s.trustSub}>{t.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── CATEGORY CHIPS ── */}
        <SectionHeader title="Danh mục tour" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catRow}
        >
          {['Tất cả', ...TOUR_CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.catChip, selectedCategory === cat && s.catChipOn]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[s.catChipTxt, selectedCategory === cat && s.catChipTxtOn]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── POPULAR DESTINATIONS — ảnh thật ── */}
        <SectionHeader
          title="Điểm đến hot 🔥"
          right="Xem tất cả"
          onRight={() => {}}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.destRow}
        >
          {DESTINATIONS.map(d => (
            <TouchableOpacity
              key={d.name}
              style={s.destCard}
              activeOpacity={0.88}
              onPress={() => setKeyword(d.name)}
            >
              <Image source={{ uri: d.img }} style={s.destImg} resizeMode="cover" />
              <View style={s.destOverlay} />
              <View style={s.destContent}>
                <Text style={s.destName}>{d.name}</Text>
                <Text style={s.destCount}>{d.count} tour</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── FEATURED TOURS — horizontal scroll, ảnh thật ── */}
        {featuredTours.length > 0 && (
          <>
            <SectionHeader
              title="Tour nổi bật ⭐"
              right={`${featuredTours.length} tour`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.featRow}
            >
              {featuredTours.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={s.featCard}
                  activeOpacity={0.9}
                  onPress={() => router.push('/guest_booking_flow' as any)}
                >
                  {/* Photo */}
                  <View style={s.featImgWrap}>
                    <Image
                      source={{ uri: t.image || TOUR_IMAGES[0] }}
                      style={s.featImg}
                      resizeMode="cover"
                    />
                    <View style={s.featImgOverlay} />
                    {/* Rating overlay */}
                    <View style={s.featRating}>
                      <Ionicons name="star" size={11} color="#fbbf24" />
                      <Text style={s.featRatingTxt}>{t.rating.toFixed(1)}</Text>
                    </View>
                    {/* Seats badge */}
                    {t.seatsLeft > 0 && t.seatsLeft <= 5 && (
                      <View style={s.featSeatBadge}>
                        <Ionicons name="time-outline" size={9} color="#fff" />
                        <Text style={s.featSeatTxt}>Còn {t.seatsLeft} chỗ</Text>
                      </View>
                    )}
                    {t.seatsLeft === 0 && (
                      <View style={[s.featSeatBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                        <Text style={s.featSeatTxt}>Hết chỗ</Text>
                      </View>
                    )}
                    {/* Fav button */}
                    <TouchableOpacity
                      style={s.featFav}
                      onPress={() => toggleFav(t.id)}
                    >
                      <Ionicons
                        name={favorites.has(t.id) ? 'heart' : 'heart-outline'}
                        size={15}
                        color={favorites.has(t.id) ? '#ef4444' : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Body */}
                  <View style={s.featBody}>
                    <View style={s.featCatRow}>
                      <View style={s.featCatBadge}>
                        <Text style={s.featCatTxt}>{t.category}</Text>
                      </View>
                    </View>
                    <Text style={s.featName} numberOfLines={2}>{t.name}</Text>
                    <View style={s.featMetaRow}>
                      <Ionicons name="location-outline" size={11} color="#7a8cc2" />
                      <Text style={s.featMetaTxt}>{t.departure}</Text>
                    </View>
                    <View style={s.featMetaRow}>
                      <Ionicons name="time-outline" size={11} color="#7a8cc2" />
                      <Text style={s.featMetaTxt}>{t.duration}</Text>
                    </View>
                    <View style={s.featFooter}>
                      <View>
                        <Text style={s.featPrice}>{fmtPrice(t)}</Text>
                        <Text style={s.featPriceSub}>/ người</Text>
                      </View>
                      <TouchableOpacity style={s.featBookBtn}
                        onPress={() => router.push('/guest_booking_flow' as any)}>
                        <Text style={s.featBookTxt}>Đặt ngay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── FLASH DEAL — chỗ còn ít ── */}
        {hotTours.length > 0 && (
          <>
            <SectionHeader
              title="⚡ Chỗ còn ít — Đặt nhanh!"
              titleColor="#dc2626"
              right={`${hotTours.length} tour`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.flashRow}
            >
              {hotTours.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={s.flashCard}
                  activeOpacity={0.9}
                  onPress={() => router.push('/guest_booking_flow' as any)}
                >
                  <Image
                    source={{ uri: t.image || TOUR_IMAGES[0] }}
                    style={s.flashImg}
                    resizeMode="cover"
                  />
                  <View style={s.flashOverlay} />
                  <View style={s.flashContent}>
                    <View style={s.flashUrgency}>
                      <Ionicons name="flame" size={11} color="#fff" />
                      <Text style={s.flashUrgencyTxt}>Còn {t.seatsLeft} chỗ!</Text>
                    </View>
                    <Text style={s.flashName} numberOfLines={2}>{t.name}</Text>
                    <Text style={s.flashPrice}>{fmtPrice(t)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── ALL TOURS LIST — vertical ── */}
        <View style={s.allToursHeader}>
          <SectionHeader
            title="Tất cả tour"
            right={`${filteredTours.length} kết quả`}
          />
        </View>

        {/* Sort chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sortRow}
        >
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.sortChip, selectedSort === opt && s.sortChipOn]}
              onPress={() => setSelectedSort(opt)}
            >
              {opt === 'Giá thấp'  && <Ionicons name="trending-down" size={12} color={selectedSort === opt ? '#fff' : '#6c7fb7'} />}
              {opt === 'Giá cao'   && <Ionicons name="trending-up"   size={12} color={selectedSort === opt ? '#fff' : '#6c7fb7'} />}
              {opt === 'Đánh giá'  && <Ionicons name="star"          size={12} color={selectedSort === opt ? '#fff' : '#6c7fb7'} />}
              {opt === 'Mặc định'  && <Ionicons name="grid-outline"  size={12} color={selectedSort === opt ? '#fff' : '#6c7fb7'} />}
              <Text style={[s.sortChipTxt, selectedSort === opt && s.sortChipTxtOn]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Empty state */}
        {filteredTours.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🔍</Text>
            <Text style={s.emptyTitle}>Không tìm thấy tour</Text>
            <Text style={s.emptyTxt}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => { setKeyword(''); resetFilters(); }}
            >
              <Text style={s.emptyBtnTxt}>Xóa bộ lọc</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tour cards — vertical list */}
        {filteredTours.map((t, idx) => {
          const isFav = favorites.has(t.id);
          const isHot = t.seatsLeft > 0 && t.seatsLeft <= 3;
          return (
            <TouchableOpacity
              key={t.id}
              style={s.tourCard}
              activeOpacity={0.88}
              onPress={() => router.push('/guest_booking_flow' as any)}
            >
              {/* Thumbnail với ảnh thật */}
              <View style={s.tourThumbWrap}>
                <Image
                  source={{ uri: t.image || TOUR_IMAGES[idx % TOUR_IMAGES.length] }}
                  style={s.tourThumb}
                  resizeMode="cover"
                />
                {/* Hot badge */}
                {isHot && (
                  <View style={s.tourHotBadge}>
                    <Ionicons name="flame" size={9} color="#fff" />
                    <Text style={s.tourHotTxt}>{t.seatsLeft} chỗ</Text>
                  </View>
                )}
                {t.seatsLeft === 0 && (
                  <View style={[s.tourHotBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Text style={s.tourHotTxt}>Hết chỗ</Text>
                  </View>
                )}
                {/* Favorite */}
                <TouchableOpacity
                  style={s.tourFavBtn}
                  onPress={() => toggleFav(t.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={14}
                    color={isFav ? '#ef4444' : '#fff'}
                  />
                </TouchableOpacity>
              </View>

              {/* Info */}
              <View style={s.tourInfo}>
                {/* Category + rating */}
                <View style={s.tourTopRow}>
                  <View style={s.tourCatBadge}>
                    <Text style={s.tourCatTxt}>{t.category}</Text>
                  </View>
                  <View style={s.tourRatingRow}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={s.tourRatingTxt}>{t.rating.toFixed(1)}</Text>
                  </View>
                </View>
                {/* Name */}
                <Text style={s.tourName} numberOfLines={2}>{t.name}</Text>
                {/* Meta */}
                <View style={s.tourMetaGrid}>
                  <View style={s.tourMetaItem}>
                    <Ionicons name="location-outline" size={11} color="#7a8cc2" />
                    <Text style={s.tourMetaTxt} numberOfLines={1}>{t.departure}</Text>
                  </View>
                  <View style={s.tourMetaItem}>
                    <Ionicons name="time-outline" size={11} color="#7a8cc2" />
                    <Text style={s.tourMetaTxt}>{t.duration}</Text>
                  </View>
                </View>
                {/* Tags */}
                {(t.tags ?? []).length > 0 && (
                  <View style={s.tourTagsRow}>
                    {(t.tags ?? []).slice(0, 2).map((tag, i) => (
                      <View key={i} style={s.tourTag}>
                        <Text style={s.tourTagTxt}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Price + Book */}
                <View style={s.tourFooter}>
                  <View>
                    <Text style={s.tourPrice}>{fmtPrice(t)}</Text>
                    <Text style={s.tourPriceSub}>/ người</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.tourBookBtn, t.seatsLeft === 0 && s.tourBookBtnDisabled]}
                    onPress={() => router.push('/guest_booking_flow' as any)}
                    disabled={t.seatsLeft === 0}
                  >
                    <Text style={s.tourBookTxt}>
                      {t.seatsLeft === 0 ? 'Hết chỗ' : 'Đặt ngay'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── GUIDE SECTION ── */}
        <SectionHeader
          title="Hướng dẫn viên"
          right="Xem tất cả"
          onRight={() => router.push('/guest_search_guide' as any)}
        />

        {/* AI Match CTA nhỏ */}
        <View style={s.guideAiNote}>
          <Ionicons name="flash" size={13} color="#f59e0b" />
          <Text style={s.guideAiNoteTxt}>
            AI đang phân tích {guides.length} HDV phù hợp với bạn
          </Text>
        </View>

        {filteredGuides.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTxt}>Không có HDV phù hợp</Text>
          </View>
        )}

        {filteredGuides.map((g, idx) => {
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          return (
            <TouchableOpacity
              key={g.id}
              style={s.guideCard}
              activeOpacity={0.88}
              onPress={() => router.push('/guest_search_guide' as any)}
            >
              {/* Avatar — ảnh thật hoặc initials */}
              <View style={s.guideAvatarWrap}>
                {g.avatar ? (
                  <Image source={{ uri: g.avatar }} style={s.guideAvatarImg} />
                ) : (
                  <View style={[s.guideAvatarFallback, { backgroundColor: avatarColor }]}>
                    <Text style={s.guideInitials}>{getInitials(g.name)}</Text>
                  </View>
                )}
                <View style={[s.guideStatusDot, {
                  backgroundColor: g.status === 'busy' ? '#d97706' : '#16a34a'
                }]} />
              </View>

              {/* Info */}
              <View style={s.guideInfo}>
                <View style={s.guideTopRow}>
                  <Text style={s.guideName}>{g.name}</Text>
                  <View style={s.matchPill}>
                    <Ionicons name="flash" size={10} color="#f59e0b" />
                    <Text style={s.matchTxt}>{g.match}% phù hợp</Text>
                  </View>
                </View>
                <View style={s.guideMeta}>
                  <Ionicons name="location-outline" size={11} color="#7a8cc2" />
                  <Text style={s.guideMetaTxt}>{g.location}</Text>
                  <Text style={s.metaDot}>·</Text>
                  <Ionicons name="briefcase-outline" size={11} color="#7a8cc2" />
                  <Text style={s.guideMetaTxt}>{g.experience}</Text>
                </View>
                {/* Skills */}
                <View style={s.guideSkills}>
                  {(g.skills ?? []).slice(0, 3).map((sk, i) => (
                    <View key={i} style={s.skillTag}>
                      <Text style={s.skillTxt}>{sk}</Text>
                    </View>
                  ))}
                </View>
                {/* Rating + tours + status */}
                <View style={s.guideFooter}>
                  <View style={s.guideRating}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={s.guideRatingTxt}>{g.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={s.guideTourCount}>{g.tours} tour</Text>
                  <View style={[s.guideStatusPill, {
                    backgroundColor: g.status === 'busy' ? '#fef3c7' : '#dcfce7'
                  }]}>
                    <View style={[s.guideStatusDotInline, {
                      backgroundColor: g.status === 'busy' ? '#d97706' : '#16a34a'
                    }]} />
                    <Text style={[s.guideStatusTxt, {
                      color: g.status === 'busy' ? '#d97706' : '#16a34a'
                    }]}>
                      {g.status === 'busy' ? 'Bận' : 'Sẵn sàng'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
            </TouchableOpacity>
          );
        })}

        {/* ── PROMO BANNER — giới thiệu bạn bè ── */}
        <TouchableOpacity style={s.promoBanner} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80' }}
            style={s.promoBannerImg}
            resizeMode="cover"
          />
          <View style={s.promoBannerOverlay} />
          <View style={s.promoContent}>
            <Text style={s.promoEmoji}>🎁</Text>
            <View style={s.promoText}>
              <Text style={s.promoTitle}>Giới thiệu bạn bè</Text>
              <Text style={s.promoSub}>Nhận ngay 200.000đ cho mỗi bạn đăng ký thành công</Text>
            </View>
            <View style={s.promoBtn}>
              <Text style={s.promoBtnTxt}>Chia sẻ</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── APP DOWNLOAD BANNER ── */}
        <View style={s.appBanner}>
          <View style={s.appBannerLeft}>
            <Text style={s.appBannerTitle}>Tải app TourGo</Text>
            <Text style={s.appBannerSub}>Nhận thêm ưu đãi độc quyền cho thành viên app</Text>
            <View style={s.appStoreRow}>
              <View style={s.appStoreBtn}>
                <Ionicons name="logo-apple" size={14} color="#fff" />
                <Text style={s.appStoreTxt}>App Store</Text>
              </View>
              <View style={[s.appStoreBtn, { backgroundColor: '#16a34a' }]}>
                <Ionicons name="logo-google-playstore" size={14} color="#fff" />
                <Text style={s.appStoreTxt}>Google Play</Text>
              </View>
            </View>
          </View>
          <Text style={s.appBannerEmoji}>📱</Text>
        </View>

      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────
// Helper component — Section Header
// ─────────────────────────────────────────────────────
function SectionHeader({
  title, right, onRight, titleColor,
}: {
  title: string; right?: string; onRight?: () => void; titleColor?: string;
}) {
  return (
    <View style={sh.row}>
      <Text style={[sh.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
      {right && (
        <TouchableOpacity onPress={onRight}>
          <Text style={sh.right}>{right}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  title: { color: '#1f2a58', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  right: { color: '#4f7cff', fontWeight: '700', fontSize: 13 },
});

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },

  // ── Loading ──
  loadingWrap:     { flex: 1, backgroundColor: '#f3f7ff', justifyContent: 'center', alignItems: 'center' },
  loadingCard:     { alignItems: 'center', padding: 32 },
  loadingLogo:     { fontSize: 36, fontWeight: '900', color: '#4f7cff', letterSpacing: -1 },
  loadingTagline:  { color: '#7a8cc2', marginTop: 6, fontSize: 14 },
  loadingTxt:      { color: '#7a8cc2', fontWeight: '600', marginTop: 14 },

  // ── Header ──
  header:       { backgroundColor: '#1a3fb0', paddingHorizontal: 18, paddingBottom: 18 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationTxt:  { color: '#93c5fd', fontSize: 12, fontWeight: '600' },
  greeting:     { color: '#dbeafe', fontSize: 15 },
  greetBold:    { color: '#fff', fontWeight: '900', fontSize: 19 },
  headerBtns:   { flexDirection: 'row', gap: 8 },
  hBtn:         { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  notifBadge:   { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#1a3fb0' },
  notifBadgeTxt:{ color: '#fff', fontSize: 9, fontWeight: '800' },

  // ── Search ──
  searchWrap:  { flexDirection: 'row', gap: 8 },
  searchBar:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, color: '#1f2a58', fontSize: 14 },
  filterBtn:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: '#4f7cff' },
  filterDot:   { position: 'absolute', top: 7, right: 7, backgroundColor: '#ef4444', borderRadius: 999, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  filterDotTxt:{ color: '#fff', fontSize: 8, fontWeight: '800' },

  // ── Filter panel ──
  filterPanel:     { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', paddingHorizontal: 18, paddingVertical: 16 },
  filterPanelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  filterPanelTitle:{ color: '#1f2a58', fontWeight: '800', fontSize: 16 },
  resetTxt:        { color: '#4f7cff', fontWeight: '700', fontSize: 13 },
  filterGroupLabel:{ color: '#7a8cc2', fontWeight: '700', fontSize: 12, marginBottom: 8, marginTop: 10 },
  fChipRow:        { gap: 8, paddingBottom: 2 },
  fChip:           { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#f8faff', paddingHorizontal: 14, paddingVertical: 8 },
  fChipOn:         { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  fChipTxt:        { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  fChipTxtOn:      { color: '#fff' },

  // ── Body ──
  body: { paddingHorizontal: 18, paddingTop: 18 },

  // ── Banner ──
  bannerSection:  { marginHorizontal: -18, marginBottom: 6, overflow: 'hidden' },
  bannerCard:     { height: 188, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  bannerImg:      { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,60,0.48)' },
  bannerBadge:    { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  bannerBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bannerDiscount: { position: 'absolute', top: 14, left: 14, backgroundColor: '#4f7cff', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  bannerDiscountTxt:{ color: '#fff', fontSize: 12, fontWeight: '900' },
  bannerContent:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  bannerTag:      { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 7 },
  bannerTagTxt:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  bannerTitle:    { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  bannerSub:      { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 10, lineHeight: 19 },
  bannerCta:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  bannerCtaTxt:   { color: '#fff', fontWeight: '800', fontSize: 13 },
  dotsRow:        { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c0cbe8' },
  dotOn:          { width: 20, height: 6, borderRadius: 3, backgroundColor: '#4f7cff' },

  // ── Quick actions ──
  quickRow:  { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickItem: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6 },
  quickTxt:  { fontSize: 11, fontWeight: '800' },

  // ── AI CTA ──
  aiCta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a3fb0', borderRadius: 18, padding: 16, marginBottom: 14 },
  aiLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  aiIconWrap:{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.2)', alignItems: 'center', justifyContent: 'center' },
  aiTitle:  { color: '#fff', fontWeight: '800', fontSize: 14 },
  aiSub:    { color: '#93c5fd', fontSize: 11, marginTop: 2 },
  aiBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8 },
  aiBtnTxt: { color: '#1a3fb0', fontWeight: '800', fontSize: 12 },

  // ── Trust stats ──
  trustRow:   { flexDirection: 'row', gap: 8, marginBottom: 4 },
  trustCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e4ebff' },
  trustIcon:  { fontSize: 20, marginBottom: 5 },
  trustValue: { color: '#1f2a58', fontWeight: '900', fontSize: 16 },
  trustLabel: { color: '#1f2a58', fontWeight: '700', fontSize: 11, marginTop: 1 },
  trustSub:   { color: '#7a8cc2', fontSize: 9, marginTop: 2, textAlign: 'center' },

  // ── Categories ──
  catRow:       { gap: 8, marginBottom: 4, paddingBottom: 2 },
  catChip:      { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9 },
  catChipOn:    { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  catChipTxt:   { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  catChipTxtOn: { color: '#fff' },

  // ── Destinations ──
  destRow:     { gap: 10, paddingBottom: 4 },
  destCard:    { width: 110, height: 90, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  destImg:     { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  destOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,60,0.42)' },
  destContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  destName:    { color: '#fff', fontWeight: '800', fontSize: 13 },
  destCount:   { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 },

  // ── Featured tours ──
  featRow:          { gap: 12, paddingBottom: 4 },
  featCard:         { width: 210, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e4ebff' },
  featImgWrap:      { height: 128, position: 'relative' },
  featImg:          { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featImgOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  featRating:       { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  featRatingTxt:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  featSeatBadge:    { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef4444', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  featSeatTxt:      { color: '#fff', fontSize: 10, fontWeight: '700' },
  featFav:          { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  featBody:         { padding: 12 },
  featCatRow:       { marginBottom: 5 },
  featCatBadge:     { backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  featCatTxt:       { color: '#4f7cff', fontSize: 10, fontWeight: '700' },
  featName:         { color: '#1f2a58', fontWeight: '800', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  featMetaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  featMetaTxt:      { color: '#7a8cc2', fontSize: 11 },
  featFooter:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  featPrice:        { color: '#4f7cff', fontWeight: '900', fontSize: 15 },
  featPriceSub:     { color: '#7a8cc2', fontSize: 10 },
  featBookBtn:      { backgroundColor: '#4f7cff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  featBookTxt:      { color: '#fff', fontWeight: '800', fontSize: 12 },

  // ── Flash deals ──
  flashRow:      { gap: 10, paddingBottom: 4 },
  flashCard:     { width: 160, height: 110, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  flashImg:      { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  flashOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,60,0.55)' },
  flashContent:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  flashUrgency:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  flashUrgencyTxt:{ color: '#fff', fontSize: 9, fontWeight: '700' },
  flashName:     { color: '#fff', fontWeight: '800', fontSize: 12, lineHeight: 16 },
  flashPrice:    { color: '#fbbf24', fontWeight: '900', fontSize: 13, marginTop: 3 },

  // ── All tours ──
  allToursHeader: {},
  sortRow:        { gap: 8, marginBottom: 12, paddingBottom: 2 },
  sortChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  sortChipOn:     { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  sortChipTxt:    { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  sortChipTxtOn:  { color: '#fff' },

  // Tour card
  tourCard:        { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', overflow: 'hidden', marginBottom: 10 },
  tourThumbWrap:   { width: 110, position: 'relative' },
  tourThumb:       { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tourHotBadge:    { position: 'absolute', top: 8, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tourHotTxt:      { color: '#fff', fontSize: 9, fontWeight: '700' },
  tourFavBtn:      { position: 'absolute', bottom: 8, right: 6, width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  tourInfo:        { flex: 1, padding: 12 },
  tourTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  tourCatBadge:    { backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tourCatTxt:      { color: '#4f7cff', fontSize: 10, fontWeight: '700' },
  tourRatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tourRatingTxt:   { color: '#92400e', fontWeight: '700', fontSize: 12 },
  tourName:        { color: '#1f2a58', fontWeight: '800', fontSize: 13, lineHeight: 18, marginBottom: 7 },
  tourMetaGrid:    { gap: 3, marginBottom: 6 },
  tourMetaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tourMetaTxt:     { color: '#7a8cc2', fontSize: 11 },
  tourTagsRow:     { flexDirection: 'row', gap: 5, marginBottom: 8, flexWrap: 'wrap' },
  tourTag:         { backgroundColor: '#f3f4f6', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  tourTagTxt:      { color: '#6b7280', fontSize: 10 },
  tourFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tourPrice:       { color: '#4f7cff', fontWeight: '900', fontSize: 16 },
  tourPriceSub:    { color: '#7a8cc2', fontSize: 10, marginTop: 1 },
  tourBookBtn:     { backgroundColor: '#4f7cff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  tourBookBtnDisabled:{ backgroundColor: '#c0cbe8' },
  tourBookTxt:     { color: '#fff', fontWeight: '800', fontSize: 12 },

  // ── Guides ──
  guideAiNote:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  guideAiNoteTxt:  { color: '#92400e', fontSize: 12, fontWeight: '600', flex: 1 },
  guideCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', padding: 14, marginBottom: 10 },
  guideAvatarWrap: { position: 'relative' },
  guideAvatarImg:  { width: 56, height: 56, borderRadius: 16 },
  guideAvatarFallback:{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  guideInitials:   { color: '#fff', fontWeight: '900', fontSize: 18 },
  guideStatusDot:  { position: 'absolute', bottom: -1, right: -1, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  guideInfo:       { flex: 1 },
  guideTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guideName:       { color: '#1f2a58', fontWeight: '800', fontSize: 14 },
  matchPill:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  matchTxt:        { color: '#92400e', fontSize: 10, fontWeight: '700' },
  guideMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  guideMetaTxt:    { color: '#7a8cc2', fontSize: 11 },
  metaDot:         { color: '#c0cbe8' },
  guideSkills:     { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 7 },
  skillTag:        { backgroundColor: '#eef2ff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  skillTxt:        { color: '#4f7cff', fontSize: 10, fontWeight: '600' },
  guideFooter:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideRating:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  guideRatingTxt:  { color: '#92400e', fontWeight: '700', fontSize: 11 },
  guideTourCount:  { color: '#7a8cc2', fontSize: 11 },
  guideStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 'auto' },
  guideStatusDotInline:{ width: 6, height: 6, borderRadius: 3 },
  guideStatusTxt:  { fontSize: 10, fontWeight: '700' },

  // ── Promo banner ──
  promoBanner:        { borderRadius: 18, overflow: 'hidden', height: 90, marginTop: 8, marginBottom: 12, position: 'relative' },
  promoBannerImg:     { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  promoBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120,60,0,0.65)' },
  promoContent:       { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  promoEmoji:         { fontSize: 30 },
  promoText:          { flex: 1 },
  promoTitle:         { color: '#fff', fontWeight: '900', fontSize: 16 },
  promoSub:           { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, lineHeight: 16 },
  promoBtn:           { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  promoBtnTxt:        { color: '#d97706', fontWeight: '800', fontSize: 12 },

  // ── App banner ──
  appBanner:      { backgroundColor: '#1f2a58', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  appBannerLeft:  { flex: 1 },
  appBannerTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  appBannerSub:   { color: '#93c5fd', fontSize: 12, marginTop: 3, marginBottom: 10, lineHeight: 17 },
  appStoreRow:    { flexDirection: 'row', gap: 8 },
  appStoreBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#374151', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  appStoreTxt:    { color: '#fff', fontWeight: '700', fontSize: 11 },
  appBannerEmoji: { fontSize: 48, marginLeft: 12 },

  // ── Empty state ──
  emptyCard:   { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', padding: 32, alignItems: 'center', marginBottom: 10 },
  emptyEmoji:  { fontSize: 40, marginBottom: 10 },
  emptyTitle:  { color: '#1f2a58', fontWeight: '800', fontSize: 17, marginBottom: 5 },
  emptyTxt:    { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { marginTop: 16, backgroundColor: '#eef2ff', borderRadius: 11, paddingHorizontal: 22, paddingVertical: 10 },
  emptyBtnTxt: { color: '#4f7cff', fontWeight: '800' },
});