/**
 * app/(tabs)/explore.tsx
 * Trang Khám phá - Lấy Data Local, Fix Crash Rating, Responsive
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOUR_CATEGORIES } from '@/constants/travel-data';

interface AppTour {
  id: string; name: string; category: string; departure: string;
  duration: string; date?: string; price: string; priceRaw?: number;
  rating: number; seatsLeft: number; status: string;
  tags?: string[]; color?: string; image?: string;
}

const BUDGET_OPTIONS = ['Tất cả', '< 2 triệu', '2 - 4 triệu', '> 4 triệu'] as const;
const DURATION_OPTIONS = ['Tất cả', '1-2 ngày', '3-4 ngày', '5+ ngày'] as const;
const RATING_OPTIONS = ['Tất cả', '4.5+', '4.8+'] as const;

export default function GuestExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [tours, setTours] = useState<AppTour[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedBudget, setSelectedBudget] = useState<(typeof BUDGET_OPTIONS)[number]>('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>('Tất cả');
  const [selectedRating, setSelectedRating] = useState<(typeof RATING_OPTIONS)[number]>('Tất cả');

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@app_tours').then(raw => {
      if (raw) {
        setTours(JSON.parse(raw));
      }
    });
  }, []));

  const parsePrice = (p: any) => typeof p === 'number' ? p : Number(String(p).replace(/\./g, '').replace('đ', '')) || 0;
  const parseDays = (d: string) => Number(d.split(' ')[0]) || 0;
  const fmtPrice = (p: any) => { const n = parsePrice(p); return n > 0 ? `${n.toLocaleString('vi-VN')}đ` : p; };

  const filteredTours = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tours.filter(t => {
      if (t.status === 'draft') return false;
      const matchCat = selectedCategory === 'Tất cả' || t.category === selectedCategory;
      const matchKw = !kw || t.name.toLowerCase().includes(kw) || t.departure.toLowerCase().includes(kw);
      
      const price = t.priceRaw ?? parsePrice(t.price);
      const matchBudget = selectedBudget === 'Tất cả' ||
        (selectedBudget === '< 2 triệu' && price < 2000000) ||
        (selectedBudget === '2 - 4 triệu' && price >= 2000000 && price <= 4000000) ||
        (selectedBudget === '> 4 triệu' && price > 4000000);
      
      const days = parseDays(t.duration);
      const matchDur = selectedDuration === 'Tất cả' ||
        (selectedDuration === '1-2 ngày' && days <= 2) ||
        (selectedDuration === '3-4 ngày' && days >= 3 && days <= 4) ||
        (selectedDuration === '5+ ngày' && days >= 5);
      
      const safeRating = t.rating || 0;
      const matchRating = selectedRating === 'Tất cả' ||
        (selectedRating === '4.5+' && safeRating >= 4.5) ||
        (selectedRating === '4.8+' && safeRating >= 4.8);
        
      return matchCat && matchKw && matchBudget && matchDur && matchRating;
    });
  }, [tours, keyword, selectedCategory, selectedBudget, selectedDuration, selectedRating]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 14 }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={s.headerRow}>
        <Text style={s.title}>Khám phá tour</Text>
        <Text style={s.subtitle}>Hàng trăm điểm đến đang chờ đón</Text>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color="#8ea0d6" />
        <TextInput style={s.input} placeholder="Tìm tour, điểm đến..." value={keyword} onChangeText={setKeyword} placeholderTextColor="#b0bdd8" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {['Tất cả', ...TOUR_CATEGORIES].map(c => (
          <TouchableOpacity key={c} style={[s.filter, selectedCategory === c && s.activeFilter]} onPress={() => setSelectedCategory(c)}>
            <Text style={[s.filterText, selectedCategory === c && s.activeFilterText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Kết quả */}
      <View style={s.resultRow}>
        <Text style={s.resultText}>Hiển thị <Text style={{ color: '#4f7cff', fontWeight: '700' }}>{filteredTours.length}</Text> kết quả</Text>
      </View>

      {filteredTours.map((t) => (
        <TouchableOpacity key={t.id} style={s.tourCard} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}>
          <View style={s.thumbWrap}>
            <Image source={{ uri: t.image || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b' }} style={s.thumbImg} />
            <View style={s.ratingOverlay}><Ionicons name="star" size={11} color="#fbbf24" /><Text style={s.ratingOverlayTxt}>{(t.rating || 0).toFixed(1)}</Text></View>
          </View>
          <View style={s.cardBody}>
            <Text style={s.tourName} numberOfLines={2}>{t.name}</Text>
            <View style={s.metaRow}><Ionicons name="location-outline" size={11} color="#7a8cc2" /><Text style={s.metaTxt}>{t.departure}</Text></View>
            <View style={s.metaRow}><Ionicons name="time-outline" size={11} color="#7a8cc2" /><Text style={s.metaTxt}>{t.duration}</Text></View>
            <View style={s.cardFooter}>
              <Text style={s.price}>{fmtPrice(t.price)}</Text>
              <View style={s.bookBtn}><Text style={s.bookBtnTxt}>Xem</Text></View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      
      {filteredTours.length === 0 && (
         <View style={{ alignItems: 'center', marginTop: 40 }}><Text style={{ color: '#7a8cc2' }}>Không tìm thấy tour phù hợp.</Text></View>
      )}
    </ScrollView>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f3f7ff' },
    content: { padding: sz(16), paddingBottom: sz(100) },
    headerRow: { marginBottom: sz(14) },
    title: { color: '#1f2a58', fontSize: sz(24), fontWeight: '900' },
    subtitle: { color: '#7a8cc2', marginTop: sz(4), fontSize: sz(13) },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: sz(8), backgroundColor: '#fff', borderRadius: sz(14), paddingHorizontal: sz(12), paddingVertical: sz(10), marginBottom: sz(14), borderWidth: 1, borderColor: '#dfe7ff' },
    input: { flex: 1, fontSize: sz(14) },
    filters: { gap: sz(8), marginBottom: sz(14), flexDirection: 'row' },
    filter: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: sz(8), paddingHorizontal: sz(14) },
    activeFilter: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
    filterText: { color: '#6c7fb7', fontSize: sz(13), fontWeight: '600' },
    activeFilterText: { color: '#fff' },
    resultRow: { marginBottom: sz(10) },
    resultText: { color: '#7a8cc2', fontSize: sz(13) },
    tourCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: sz(16), overflow: 'hidden', marginBottom: sz(12), borderWidth: 1, borderColor: '#e4ebff' },
    thumbWrap: { width: sz(110), position: 'relative' },
    thumbImg: { ...StyleSheet.absoluteFillObject },
    ratingOverlay: { position: 'absolute', bottom: sz(8), left: sz(8), flexDirection: 'row', alignItems: 'center', gap: sz(3), backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: sz(6), paddingHorizontal: sz(6), paddingVertical: sz(3) },
    ratingOverlayTxt: { color: '#fff', fontSize: sz(11), fontWeight: '800' },
    cardBody: { flex: 1, padding: sz(12) },
    tourName: { color: '#1f2a58', fontWeight: '900', fontSize: sz(14), marginBottom: sz(6) },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(4), marginBottom: sz(4) },
    metaTxt: { color: '#7a8cc2', fontSize: sz(12) },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: sz(8) },
    price: { color: '#10b981', fontSize: sz(15), fontWeight: '900' },
    bookBtn: { backgroundColor: '#4f7cff', borderRadius: sz(8), paddingHorizontal: sz(12), paddingVertical: sz(6) },
    bookBtnTxt: { color: '#fff', fontWeight: '800', fontSize: sz(12) }
  });
};