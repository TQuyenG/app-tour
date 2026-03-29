/**
 * app/(tabs)/index.tsx
 * Trang chủ Guest - FIX LỖI: GUIDE_AVATARS, Loại bỏ Emoji Text, Thay bằng Vector Icons
 * Lấy 100% dữ liệu từ Local Storage
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Image, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDES as STATIC_GUIDES, TOURS as STATIC_TOURS, TOUR_CATEGORIES } from '@/constants/travel-data';

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

const TOUR_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80',
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80',
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80',
];

const GUIDE_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
];

const BANNERS = [
  { id: 'b1', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=85', tag: 'Flash Sale', icon: 'flash', title: 'Ưu đãi mùa hè', subtitle: 'Giảm tới 35% tour biển', cta: 'Xem tour', badge: 'HOT', discount: '-35%' },
  { id: 'b2', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=85', tag: 'Tour mới', icon: 'star', title: 'Khám phá Đà Lạt', subtitle: 'Săn mây, chill cafe', cta: 'Đặt ngay', badge: 'MỚI', discount: '' },
];

const DESTINATIONS = [
  { name: 'Đà Lạt', count: 24, img: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=300&q=80' },
  { name: 'Phú Quốc', count: 18, img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=300&q=80' },
  { name: 'Hội An', count: 15, img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=300&q=80' },
];

const QUICK_ACTIONS = [
  { icon: 'island' as const, label: 'Biển', color: '#0284c7', bg: '#e0f2fe' },
  { icon: 'pine-tree' as const, label: 'Núi', color: '#16a34a', bg: '#dcfce7' },
  { icon: 'city' as const, label: 'Thành phố', color: '#7c3aed', bg: '#ede9fe' },
  { icon: 'food' as const, label: 'Ẩm thực', color: '#d97706', bg: '#fef3c7' },
];

const TRUST_STATS = [
  { icon: 'shield-checkmark-outline', value: '100%', label: 'Hoàn tiền', sub: 'Hủy trước 48h' },
  { icon: 'star-outline', value: '4.9', label: 'Đánh giá', sub: '12.000+ khách' },
  { icon: 'trophy-outline', value: '500+', label: 'Tours', sub: 'Toàn quốc' },
];

const BUDGET_OPTIONS = ['Tất cả', '< 2 triệu', '2–4 triệu', '> 4 triệu'] as const;
const DURATION_OPTIONS = ['Tất cả', '1–2 ngày', '3–4 ngày', '5+ ngày'] as const;
const RATING_OPTIONS = ['Tất cả', '4.5+', '4.8+'] as const;
const SORT_OPTIONS = ['Mặc định', 'Giá thấp', 'Giá cao', 'Đánh giá'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2); 
  const s = useMemo(() => getStyles(scale), [scale]);
  
  const bannerRef = useRef<ScrollView>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tours, setTours] = useState<AppTour[]>([]);
  const [guides, setGuides] = useState<AppGuide[]>([]);
  const [guestName, setGuestName] = useState('bạn');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedBudget, setSelectedBudget] = useState<typeof BUDGET_OPTIONS[number]>('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState<typeof DURATION_OPTIONS[number]>('Tất cả');
  const [selectedRating, setSelectedRating] = useState<typeof RATING_OPTIONS[number]>('Tất cả');
  const [selectedSort, setSelectedSort] = useState<typeof SORT_OPTIONS[number]>('Mặc định');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    
    const loadAll = async () => {
      let loadedTours = STATIC_TOURS as any[];
      const rawTours = await AsyncStorage.getItem('@app_tours');
      if (rawTours) loadedTours = JSON.parse(rawTours);
      
      let loadedGuides = STATIC_GUIDES as any[];
      const rawGuideProfile = await AsyncStorage.getItem('@guide_profile');
      if (rawGuideProfile) {
        const gp = JSON.parse(rawGuideProfile);
        // ✅ FIX: Dùng guideId thật, không fallback về g_me_01
        if (gp.guideId && gp.name) {
          const realGuide = {
            id: gp.guideId, name: gp.name, location: gp.location,
            experience: gp.experience, skills: gp.skills ? gp.skills.split(',').map((x:string) => x.trim()) : [],
            rating: 5.0, tours: 10, match: 98, status: 'active', avatar: gp.avatarUrl || GUIDE_AVATARS[0],
          };
          // Loại trùng theo cả id lẫn tên
          loadedGuides = [
            realGuide,
            ...loadedGuides.filter(g =>
              g.id !== realGuide.id &&
              g.name?.trim().toLowerCase() !== realGuide.name.trim().toLowerCase()
            ),
          ];
        }
      }

      await AsyncStorage.setItem('@app_guides', JSON.stringify(loadedGuides));

      const profile = await AsyncStorage.getItem('@app_profile').then(r => r ? JSON.parse(r) : { name: 'bạn' });
      const notifRaw = await AsyncStorage.getItem('@guest_notifications');
      const favRaw = await AsyncStorage.getItem('@guest_favorites');

      if (!active) return;
      
      setTours(loadedTours.map((t, i) => ({ ...t, image: t.image || TOUR_IMAGES[i % TOUR_IMAGES.length] })));
      setGuides(loadedGuides);
      setGuestName((profile.name || 'bạn').trim().split(' ').pop() || 'bạn');
      if (notifRaw) setUnreadCount(JSON.parse(notifRaw).filter((n: any) => !n.read).length);
      if (favRaw) setFavorites(new Set(JSON.parse(favRaw)));
      setLoading(false);
    };

    loadAll();

    bannerTimer.current = setInterval(() => {
      bannerRef.current?.scrollTo({ x: ((Math.random() > 0.5 ? 1 : 0) * (width - 36)), animated: true });
    }, 5000);

    return () => { active = false; if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [width]));

  const toggleFav = async (id: string) => {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
    await AsyncStorage.setItem('@guest_favorites', JSON.stringify([...next]));
  };

  const parsePriceNum = (p: any) => typeof p === 'number' ? p : Number(String(p).replace(/[^0-9]/g, '')) || 0;
  const parseDays = (d: string) => Number(d.split(' ')[0]) || 0;
  const fmtPrice = (t: AppTour) => {
    const n = t.priceRaw ?? parsePriceNum(t.price);
    return n > 0 ? `${n.toLocaleString('vi-VN')}đ` : (t.price || 'Đang cập nhật');
  };

  const filteredTours = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let result = tours.filter(t => {
      if (t.status === 'draft') return false;
      if (selectedCategory !== 'Tất cả' && t.category !== selectedCategory) return false;
      if (kw && !t.name.toLowerCase().includes(kw) && !t.departure.toLowerCase().includes(kw)) return false;
      
      const price = t.priceRaw ?? parsePriceNum(t.price);
      if (selectedBudget === '< 2 triệu' && price >= 2000000) return false;
      if (selectedBudget === '2–4 triệu' && (price < 2000000 || price > 4000000)) return false;
      if (selectedBudget === '> 4 triệu' && price <= 4000000) return false;
      
      const days = parseDays(t.duration);
      if (selectedDuration === '1–2 ngày' && days > 2) return false;
      if (selectedDuration === '3–4 ngày' && (days < 3 || days > 4)) return false;
      if (selectedDuration === '5+ ngày' && days < 5) return false;
      
      const safeRating = t.rating || 0;
      if (selectedRating === '4.5+' && safeRating < 4.5) return false;
      if (selectedRating === '4.8+' && safeRating < 4.8) return false;
      return true;
    });

    if (selectedSort === 'Giá thấp') result.sort((a, b) => (a.priceRaw ?? 0) - (b.priceRaw ?? 0));
    if (selectedSort === 'Giá cao') result.sort((a, b) => (b.priceRaw ?? 0) - (a.priceRaw ?? 0));
    if (selectedSort === 'Đánh giá') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    return result;
  }, [tours, keyword, selectedCategory, selectedBudget, selectedDuration, selectedRating, selectedSort]);

  const featuredTours = filteredTours.filter(t => (t.rating || 0) >= 4.5).slice(0, 5);
  const activeFilterCount = [selectedBudget !== 'Tất cả', selectedDuration !== 'Tất cả', selectedRating !== 'Tất cả', selectedSort !== 'Mặc định', selectedCategory !== 'Tất cả'].filter(Boolean).length;
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff' }}>
        <ActivityIndicator size="large" color="#4f7cff" />
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3fb0" />
      
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerTop}>
          <View>
            <View style={s.locationRow}><Ionicons name="location" size={12} color="#93c5fd" /><Text style={s.locationTxt}>Việt Nam</Text></View>
            <View style={s.greetingRow}>
              <Text style={s.greeting}>Xin chào, <Text style={s.greetBold}>{guestName}</Text></Text>
              <Ionicons name="hand-left" size={18} color="#fcd34d" />
            </View>
          </View>
        </View>

        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="#7a8cc2" />
            <TextInput style={s.searchInput} placeholder="Tìm điểm đến, tour..." value={keyword} onChangeText={setKeyword} placeholderTextColor="#a0b0d4" />
            {!!keyword && <TouchableOpacity onPress={() => setKeyword('')}><Ionicons name="close-circle" size={16} color="#a0b0d4" /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]} onPress={() => setShowFilters(v => !v)}>
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#4f7cff'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTER PANEL */}
      {showFilters && (
        <View style={s.filterPanel}>
          <View style={s.filterPanelHead}>
            <Text style={s.filterPanelTitle}>Bộ lọc nâng cao</Text>
            <TouchableOpacity onPress={() => { setSelectedBudget('Tất cả'); setSelectedDuration('Tất cả'); setSelectedRating('Tất cả'); setSelectedSort('Mặc định'); setSelectedCategory('Tất cả'); }}>
              <Text style={s.resetTxt}>Đặt lại</Text>
            </TouchableOpacity>
          </View>
          <View style={s.filterGroupLabelRow}><Ionicons name="wallet-outline" size={14} color="#7a8cc2" /><Text style={s.filterGroupLabel}>Ngân sách</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {BUDGET_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={[s.fChip, selectedBudget === opt && s.fChipOn]} onPress={() => setSelectedBudget(opt)}>
                <Text style={[s.fChipTxt, selectedBudget === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.filterGroupLabelRow}><Ionicons name="time-outline" size={14} color="#7a8cc2" /><Text style={s.filterGroupLabel}>Thời gian</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={[s.fChip, selectedDuration === opt && s.fChipOn]} onPress={() => setSelectedDuration(opt)}>
                <Text style={[s.fChipTxt, selectedDuration === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.filterGroupLabelRow}><Ionicons name="swap-vertical-outline" size={14} color="#7a8cc2" /><Text style={s.filterGroupLabel}>Sắp xếp</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fChipRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} style={[s.fChip, selectedSort === opt && s.fChipOn]} onPress={() => setSelectedSort(opt)}>
                <Text style={[s.fChipTxt, selectedSort === opt && s.fChipTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.body}>
        {/* BANNER */}
        <View style={s.bannerSection}>
          <ScrollView ref={bannerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
            {BANNERS.map((b) => (
              <TouchableOpacity key={b.id} style={[s.bannerCard, { width: width - 36, marginHorizontal: 18 }]} activeOpacity={0.93}>
                <Image source={{ uri: b.image }} style={s.bannerImg} resizeMode="cover" />
                <View style={s.bannerOverlay} />
                <View style={s.bannerContent}>
                  <View style={s.bannerTag}>
                    <Ionicons name={b.icon as any} size={12} color="#fff" />
                    <Text style={s.bannerTagTxt}>{b.tag}</Text>
                  </View>
                  <Text style={s.bannerTitle}>{b.title}</Text>
                  <Text style={s.bannerSub}>{b.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* QUICK ACTIONS */}
        <View style={s.quickRow}>
          {QUICK_ACTIONS.map(q => (
            <TouchableOpacity key={q.label} style={[s.quickItem, { backgroundColor: q.bg }]} activeOpacity={0.8}>
              <MaterialCommunityIcons name={q.icon} size={24} color={q.color} />
              <Text style={[s.quickTxt, { color: q.color }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TRUST STATS */}
        <View style={s.trustRow}>
          {TRUST_STATS.map((t, i) => (
            <View key={i} style={s.trustCard}>
              <Ionicons name={t.icon as any} size={22} color="#4f7cff" style={{ marginBottom: 4 }} />
              <Text style={s.trustValue}>{t.value}</Text>
              <Text style={s.trustLabel}>{t.label}</Text>
              <Text style={s.trustSub}>{t.sub}</Text>
            </View>
          ))}
        </View>

        {/* FEATURED TOURS */}
        {featuredTours.length > 0 && (
          <>
            <View style={s.sectionHeader}>
               <Text style={s.sectionTitle}>Tour nổi bật</Text>
               <Ionicons name="star" size={20} color="#f59e0b" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featRow}>
              {featuredTours.map((t) => (
                <TouchableOpacity key={t.id} style={s.featCard} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}>
                  <View style={s.featImgWrap}>
                    <Image source={{ uri: t.image || TOUR_IMAGES[0] }} style={s.featImg} resizeMode="cover" />
                    <View style={s.featRating}><Ionicons name="star" size={11} color="#fbbf24" /><Text style={s.featRatingTxt}>{(t.rating || 0).toFixed(1)}</Text></View>
                    <TouchableOpacity style={s.featFav} onPress={() => toggleFav(t.id)}>
                      <Ionicons name={favorites.has(t.id) ? 'heart' : 'heart-outline'} size={15} color={favorites.has(t.id) ? '#ef4444' : '#fff'} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.featBody}>
                    <Text style={s.featCatTxt}>{t.category}</Text>
                    <Text style={s.featName} numberOfLines={2}>{t.name}</Text>
                    <View style={s.featMetaRow}><Ionicons name="time-outline" size={11} color="#7a8cc2" /><Text style={s.featMetaTxt}>{t.duration}</Text></View>
                    <Text style={s.featPrice}>{fmtPrice(t)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* HƯỚNG DẪN VIÊN TỪ LOCAL */}
        <View style={s.sectionHeader}>
           <Text style={s.sectionTitle}>Hướng dẫn viên đề xuất</Text>
        </View>
        {guides.slice(0, 5).map((g) => (
          <TouchableOpacity key={g.id} style={s.guideCard} onPress={() => router.push({ pathname: '/public-guide-profile', params: { id: g.id } })}>
            <Image source={{ uri: g.avatar }} style={s.guideAvatarImg} />
            <View style={s.guideInfo}>
              <Text style={s.guideName}>{g.name}</Text>
              <View style={s.guideMetaRow}><Ionicons name="location-outline" size={11} color="#7a8cc2" /><Text style={s.guideMetaTxt}>{g.location} · {g.experience}</Text></View>
              <View style={s.guideFooter}>
                 <Ionicons name="star" size={12} color="#f59e0b" />
                 <Text style={s.guideRatingTxt}>{(g.rating || 0).toFixed(1)}</Text>
                 <Text style={s.guideMetaTxt}> ({g.tours || 0} tour)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// Responsive Styles
const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f3f7ff' },
    header: { backgroundColor: '#1a3fb0', paddingHorizontal: sz(18), paddingBottom: sz(18) },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sz(14) },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: sz(4), marginBottom: sz(4) },
    locationTxt: { color: '#93c5fd', fontSize: sz(12), fontWeight: '600' },
    greetingRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6) },
    greeting: { color: '#dbeafe', fontSize: sz(15) },
    greetBold: { color: '#fff', fontWeight: '900', fontSize: sz(19) },
    searchWrap: { flexDirection: 'row', gap: sz(8) },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: sz(8), backgroundColor: '#fff', borderRadius: sz(14), paddingHorizontal: sz(14), paddingVertical: sz(12) },
    searchInput: { flex: 1, color: '#1f2a58', fontSize: sz(14) },
    filterBtn: { width: sz(48), height: sz(48), borderRadius: sz(14), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    filterBtnActive: { backgroundColor: '#4f7cff' },
    
    filterPanel: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff', paddingHorizontal: sz(18), paddingVertical: sz(16) },
    filterPanelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sz(14) },
    filterPanelTitle: { color: '#1f2a58', fontWeight: '900', fontSize: sz(16) },
    resetTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(13) },
    filterGroupLabelRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginTop: sz(10), marginBottom: sz(8) },
    filterGroupLabel: { color: '#1f2a58', fontWeight: '700', fontSize: sz(13) },
    fChipRow: { gap: sz(8), paddingBottom: sz(4) },
    fChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#f8faff', paddingHorizontal: sz(14), paddingVertical: sz(8) },
    fChipOn: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
    fChipTxt: { color: '#6c7fb7', fontSize: sz(12), fontWeight: '600' },
    fChipTxtOn: { color: '#fff' },

    body: { paddingHorizontal: sz(18), paddingTop: sz(18) },
    
    bannerSection: { marginHorizontal: sz(-18), marginBottom: sz(16) },
    bannerCard: { height: sz(160), borderRadius: sz(20), overflow: 'hidden', position: 'relative' },
    bannerImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,60,0.4)' },
    bannerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: sz(18) },
    bannerTag: { flexDirection: 'row', alignItems: 'center', gap: sz(4), backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: sz(6), paddingHorizontal: sz(8), paddingVertical: sz(4), alignSelf: 'flex-start', marginBottom: sz(6) },
    bannerTagTxt: { color: '#fff', fontSize: sz(11), fontWeight: '800' },
    bannerTitle: { color: '#fff', fontSize: sz(20), fontWeight: '900', marginBottom: sz(4) },
    bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: sz(13) },

    quickRow: { flexDirection: 'row', gap: sz(8), marginBottom: sz(16) },
    quickItem: { flex: 1, borderRadius: sz(16), paddingVertical: sz(14), alignItems: 'center', gap: sz(6) },
    quickTxt: { fontSize: sz(11), fontWeight: '800' },

    trustRow: { flexDirection: 'row', gap: sz(8), marginBottom: sz(10) },
    trustCard: { flex: 1, backgroundColor: '#fff', borderRadius: sz(14), padding: sz(12), alignItems: 'center', borderWidth: 1, borderColor: '#e4ebff' },
    trustValue: { color: '#1f2a58', fontWeight: '900', fontSize: sz(16) },
    trustLabel: { color: '#1f2a58', fontWeight: '700', fontSize: sz(11), marginTop: sz(2) },
    trustSub: { color: '#7a8cc2', fontSize: sz(9), marginTop: sz(2), textAlign: 'center' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginTop: sz(10), marginBottom: sz(12) },
    sectionTitle: { color: '#1f2a58', fontSize: sz(18), fontWeight: '900' },

    featRow: { gap: sz(12), paddingBottom: sz(10) },
    featCard: { width: sz(200), backgroundColor: '#fff', borderRadius: sz(18), overflow: 'hidden', borderWidth: 1, borderColor: '#e4ebff' },
    featImgWrap: { height: sz(120), position: 'relative' },
    featImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    featRating: { position: 'absolute', bottom: sz(8), left: sz(8), flexDirection: 'row', alignItems: 'center', gap: sz(3), backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: sz(6), paddingHorizontal: sz(6), paddingVertical: sz(3) },
    featRatingTxt: { color: '#fff', fontSize: sz(11), fontWeight: '700' },
    featFav: { position: 'absolute', top: sz(8), right: sz(8), width: sz(28), height: sz(28), borderRadius: sz(8), backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    featBody: { padding: sz(12) },
    featCatTxt: { color: '#4f7cff', fontSize: sz(10), fontWeight: '800', marginBottom: sz(4) },
    featName: { color: '#1f2a58', fontWeight: '800', fontSize: sz(13), marginBottom: sz(6) },
    featMetaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(4), marginBottom: sz(4) },
    featMetaTxt: { color: '#7a8cc2', fontSize: sz(11) },
    featPrice: { color: '#10b981', fontWeight: '900', fontSize: sz(15), marginTop: sz(4) },

    guideCard: { flexDirection: 'row', alignItems: 'center', gap: sz(12), backgroundColor: '#fff', borderRadius: sz(16), padding: sz(12), marginBottom: sz(10), borderWidth: 1, borderColor: '#e4ebff' },
    guideAvatarImg: { width: sz(56), height: sz(56), borderRadius: sz(16) },
    guideInfo: { flex: 1 },
    guideName: { color: '#1f2a58', fontWeight: '800', fontSize: sz(14), marginBottom: sz(2) },
    guideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(4) },
    guideMetaTxt: { color: '#7a8cc2', fontSize: sz(11) },
    guideFooter: { flexDirection: 'row', alignItems: 'center', marginTop: sz(4) },
    guideRatingTxt: { color: '#f59e0b', fontWeight: '700', fontSize: sz(11), marginLeft: sz(3) },
  });
};