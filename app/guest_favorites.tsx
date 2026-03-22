/**
 * guest_favorites.tsx
 * Đổi tên từ: favorites.tsx
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPublicTours, type AppTour } from '@/constants/data-store';

export default function GuestFavoritesScreen() {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [allTours, setAllTours]       = useState<AppTour[]>([]);
  const [sort, setSort]               = useState<'default' | 'price_asc' | 'rating'>('default');

  useFocusEffect(useCallback(() => {
    getPublicTours().then(tours => {
      setAllTours(tours);
      AsyncStorage.getItem('@guest_favorites').then(raw => {
        if (raw) {
          const ids = JSON.parse(raw);
          // Nếu đã có data thì dùng, nếu rỗng thì seed 4 tour đầu
          setFavoriteIds(ids.length > 0 ? ids : tours.slice(0, 4).map((t: any) => t.id));
        } else {
          // Lần đầu: seed 4 tour đầu làm yêu thích mẫu
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
    const next = favoriteIds.includes(id) ? favoriteIds.filter(x => x !== id) : [...favoriteIds, id];
    setFavoriteIds(next);
    await AsyncStorage.setItem('@guest_favorites', JSON.stringify(next)).catch(() => {});
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={st.content}>
      <Text style={st.title}>Tour yêu thích</Text>
      <Text style={st.subtitle}>Danh sách tour bạn đã lưu</Text>

      {/* Sort bar */}
      {favoriteTours.length > 0 && (
        <View style={st.sortRow}>
          {([['default','Mặc định'],['price_asc','Giá thấp nhất'],['rating','Rating cao']] as const).map(([k,l]) => (
            <TouchableOpacity key={k} style={[st.sortChip, sort === k && st.sortChipActive]} onPress={() => setSort(k)}>
              <Text style={[st.sortChipTxt, sort === k && st.sortChipTxtActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {favoriteTours.map(tour => (
        <TouchableOpacity key={tour.id} style={st.card}
          onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })}>
          <View style={[st.image, { backgroundColor: tour.color }]} />
          <View style={st.body}>
            <Text style={st.name}>{tour.name}</Text>
            <Text style={st.meta}>Khởi hành: {tour.departure} · {tour.price}</Text>
          </View>
          <TouchableOpacity onPress={() => onToggle(tour.id)}>
            <Ionicons name="heart" size={18} color="#ff6f9f" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {favoriteTours.length === 0 && (
        <View style={st.empty}>
          <Ionicons name="heart-outline" size={48} color="#c0cbe8" />
          <Text style={st.emptyTxt}>Bạn chưa lưu tour nào. Hãy bấm tim ở trang chi tiết tour để lưu.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 10, marginBottom: 10 },
  image: { width: 66, height: 66, borderRadius: 10 },
  body: { flex: 1 },
  name: { color: '#1f2a58', fontWeight: '700' },
  meta: { color: '#7a8cc2', marginTop: 5, fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
  sortRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sortChip:     { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6 },
  sortChipActive:{ backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  sortChipTxt:  { color: '#6c7fb7', fontSize: 11, fontWeight: '600' },
  sortChipTxtActive: { color: '#fff' },
});