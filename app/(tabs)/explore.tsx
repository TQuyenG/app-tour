/**
 * app/(tabs)/explore.tsx  (guest_explore.tsx)
 * - Đọc tours từ data-store (AsyncStorage), phản ánh admin CRUD
 * - useFocusEffect → reload mỗi khi focus tab
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AppTour, getPublicTours } from '@/constants/data-store';
import { TOUR_CATEGORIES } from '@/constants/travel-data';

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

  useFocusEffect(useCallback(() => {
    getPublicTours().then(setTours);
  }, []));

  const parsePrice = (p: string) => Number(String(p).replace(/\./g, '').replace('đ', ''));
  const parseDays  = (d: string) => Number(d.split(' ')[0]);
  const fmtPrice   = (p: string) => { const n = Number(p); return isNaN(n) ? p : `${n.toLocaleString('vi-VN')}đ`; };

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
      <Text style={st.title}>Khám phá tour</Text>
      <Text style={st.subtitle}>Tìm điểm đến phù hợp theo ngân sách và thời gian</Text>

      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color="#8ea0d6" />
        <TextInput style={st.input} placeholder="Tìm tour, điểm đến..." value={keyword} onChangeText={setKeyword} />
        {!!keyword && <TouchableOpacity onPress={() => setKeyword('')}><Ionicons name="close-circle" size={16} color="#8ea0d6" /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {['Tất cả', ...TOUR_CATEGORIES].map(c => (
          <TouchableOpacity key={c} style={[st.filter, selectedCategory === c && st.activeFilter]} onPress={() => setSelectedCategory(c)}>
            <Text style={[st.filterText, selectedCategory === c && st.activeFilterText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={st.advancedHeader}>
        <Text style={st.advancedTitle}>Bộ lọc nâng cao</Text>
        <TouchableOpacity onPress={resetFilters}><Text style={st.resetText}>Đặt lại</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {BUDGET_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filter, selectedBudget === o && st.activeFilter]} onPress={() => setSelectedBudget(o)}>
            <Text style={[st.filterText, selectedBudget === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filtersMini}>
        {DURATION_OPTIONS.map(o => (
          <TouchableOpacity key={o} style={[st.filterMini, selectedDuration === o && st.activeFilterMini]} onPress={() => setSelectedDuration(o)}>
            <Text style={[st.filterMiniText, selectedDuration === o && st.activeFilterText]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      <Text style={st.resultText}>Hiển thị {filteredTours.length} tour phù hợp</Text>

      {filteredTours.map((t, idx) => (
        <TouchableOpacity key={t.id} style={st.tourCard}
          onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}>
          <View style={[st.thumb, { backgroundColor: t.color || (idx % 2 === 0 ? '#98c9ff' : '#93d5ff') }]} />
          <View style={st.cardBody}>
            <Text style={st.tourName}>{t.name}</Text>
            <Text style={st.meta}>{t.departure} · {t.category}</Text>
            <Text style={st.meta}>Còn {t.seatsLeft} chỗ · {t.duration}</Text>
            <View style={st.cardFooter}>
              <Text style={st.price}>{fmtPrice(t.price)}</Text>
              <View style={st.rateWrap}>
                <Ionicons name="star" size={14} color="#ffbe40" />
                <Text style={st.rate}>{t.rating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {filteredTours.length === 0 && (
        <View style={st.emptyCard}>
          <Text style={st.emptyText}>Không tìm thấy tour phù hợp, thử đổi phân loại hoặc từ khóa.</Text>
        </View>
      )}

      <TouchableOpacity style={st.outlineButton} onPress={() => router.push('/guest_favorites' as any)}>
        <Ionicons name="heart-outline" size={18} color="#4f7cff" />
        <Text style={st.outlineText}>Xem danh sách yêu thích</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18, paddingBottom: 26 },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, color: '#1f2a58' },
  filters: { gap: 10, marginTop: 14, marginBottom: 14 },
  filter: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 14 },
  filterText: { color: '#6c7fb7' },
  activeFilter: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  activeFilterText: { color: '#fff', fontWeight: '600' },
  advancedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  advancedTitle: { color: '#1f2a58', fontWeight: '700' },
  resetText: { color: '#4f7cff', fontWeight: '600' },
  filtersMini: { gap: 8, marginBottom: 10 },
  filterMini: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 12 },
  activeFilterMini: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  filterMiniText: { color: '#6c7fb7', fontSize: 12 },
  resultText: { color: '#7a8cc2', marginBottom: 10, fontSize: 12 },
  tourCard: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 16, padding: 12, marginBottom: 10, gap: 12 },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  cardBody: { flex: 1 },
  tourName: { color: '#1f2a58', fontWeight: '700' },
  meta: { color: '#7a8cc2', marginTop: 4, fontSize: 12 },
  cardFooter: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#4f7cff', fontSize: 16, fontWeight: '700' },
  rateWrap: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  rate: { color: '#7a8cc2', fontWeight: '600' },
  outlineButton: { marginTop: 8, borderWidth: 1, borderColor: '#4f7cff', borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: '#edf2ff' },
  outlineText: { color: '#4f7cff', fontWeight: '700' },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'center' },
  emptyText: { color: '#7a8cc2', textAlign: 'center' },
});