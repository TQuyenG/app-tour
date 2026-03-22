/**
 * guest_favorites.tsx
 * Đổi tên từ: favorites.tsx
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getFavoriteTourIds, toggleFavoriteTourId } from '@/constants/local-storage';
import { TOURS } from '@/constants/travel-data';

export default function GuestFavoritesScreen() {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useFocusEffect(useCallback(() => { getFavoriteTourIds().then(setFavoriteIds); }, []));

  const favoriteTours = TOURS.filter(t => favoriteIds.includes(t.id));
  const onToggle = async (id: string) => setFavoriteIds(await toggleFavoriteTourId(id));

  return (
    <ScrollView style={st.screen} contentContainerStyle={st.content}>
      <Text style={st.title}>Tour yêu thích</Text>
      <Text style={st.subtitle}>Danh sách tour bạn đã lưu</Text>

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
});