// app/tour/[id].tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView, Share, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppTour {
  id: string; name: string; category: string; departure: string;
  duration: string; date?: string; price: string; priceRaw?: number;
  rating: number; seatsLeft: number; color?: string;
  description?: string; tags?: string[];
  summary?: string; itinerary?: string[]; includes?: string[];
  groupType?: string;
}

async function getTourFromStorage(id: string): Promise<AppTour | null> {
  try {
    const raw = await AsyncStorage.getItem('@app_tours');
    if (!raw) return null;
    const tours: AppTour[] = JSON.parse(raw);
    return tours.find(t => t.id === id) ?? null;
  } catch { return null; }
}

async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem('@guest_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function toggleFavorite(id: string): Promise<string[]> {
  const current = await getFavorites();
  const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
  await AsyncStorage.setItem('@guest_favorites', JSON.stringify(next)).catch(() => {});
  return next;
}

export default function TourDetailByIdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tour,       setTour]       = useState<AppTour | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notFound,   setNotFound]   = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    getTourFromStorage(id).then(t => {
      if (!t) { setNotFound(true); return; }
      setTour(t);
      getFavorites().then(ids => setIsFavorite(ids.includes(t.id)));
    });
  }, [id]);

  const onToggleFavorite = async () => {
    if (!tour) return;
    const next = await toggleFavorite(tour.id);
    setIsFavorite(next.includes(tour.id));
  };

  const onShareTour = async () => {
    if (!tour) return;
    await Share.share({
      message: `Tour ${tour.name}\nKhởi hành: ${tour.departure} · ${tour.date || ''}\nGiá: ${tour.price}\nĐánh giá: ${tour.rating.toFixed(1)}⭐`,
      title: tour.name,
    });
  };

  if (notFound || (!tour && !notFound)) {
    return (
      <View style={st.emptyScreen}>
        {notFound ? (
          <>
            <Ionicons name="map-outline" size={64} color="#c0cbe8" />
            <Text style={st.emptyTitle}>Không tìm thấy tour</Text>
            <TouchableOpacity style={st.backButton} onPress={() => router.back()}>
              <Text style={st.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </>
        ) : (
          <MaterialCommunityIcons name="loading" size={36} color="#4f7cff" />
        )}
      </View>
    );
  }

  const itinerary  = tour!.itinerary  ?? [`Ngày 1: Khởi hành từ ${tour!.departure}`, `Ngày ${tour!.duration.split(' ')[0]}: Kết thúc & trở về`];
  const includes   = tour!.includes   ?? ['Vé tham quan', 'Hướng dẫn viên', 'Bảo hiểm du lịch'];
  const groupType  = tour!.groupType  ?? 'Nhóm nhỏ';
  const summary    = tour!.summary    ?? tour!.description ?? 'Chuyến đi khám phá điểm đến tuyệt vời cùng hướng dẫn viên địa phương chuyên nghiệp.';
  const tags       = tour!.tags       ?? [tour!.category];
  const formatPrice = () => {
    if (tour!.price.includes('đ')) return tour!.price;
    const n = tour!.priceRaw ?? Number(String(tour!.price).replace(/[^0-9]/g, ''));
    return n > 0 ? `${n.toLocaleString('vi-VN')}đ` : tour!.price;
  };

  return (
    <ScrollView
      style={st.screen}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 30 }]}>

      {/* Banner */}
      <View style={[st.banner, { backgroundColor: tour!.color || '#99bbff' }]}>
        <View style={st.bannerTopRow}>
          <TouchableOpacity style={st.circleBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.circleBtn} onPress={onToggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ff6f9f' : '#4f7cff'} />
          </TouchableOpacity>
        </View>
        {/* Category badge */}
        <View style={st.categoryBadge}>
          <Text style={st.categoryBadgeTxt}>{tour!.category}</Text>
        </View>
      </View>

      {/* Action row */}
      <View style={st.actionRow}>
        <TouchableOpacity style={st.actionBtn} onPress={onShareTour}>
          <Ionicons name="share-social-outline" size={16} color="#4f7cff" />
          <Text style={st.actionTxt}>Chia sẻ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.actionBtn} onPress={() => router.push('/guest_favorites' as any)}>
          <Ionicons name="bookmark-outline" size={16} color="#4f7cff" />
          <Text style={st.actionTxt}>Yêu thích</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.actionBtn}
          onPress={() => router.push('/guest_search_guide' as any)}>
          <Ionicons name="person-outline" size={16} color="#4f7cff" />
          <Text style={st.actionTxt}>Tìm HDV</Text>
        </TouchableOpacity>
      </View>

      <Text style={st.title}>{tour!.name}</Text>
      <Text style={st.meta}>Khởi hành {tour!.departure}{tour!.date ? ` · ${tour!.date}` : ''}</Text>

      {/* Info chips */}
      <View style={st.infoRow}>
        <View style={st.infoItem}>
          <Ionicons name="star" size={15} color="#ffbe40" />
          <Text style={st.infoTxt}>{tour!.rating.toFixed(1)}</Text>
        </View>
        <View style={st.infoItem}>
          <MaterialCommunityIcons name="clock-outline" size={15} color="#4f7cff" />
          <Text style={st.infoTxt}>{tour!.duration}</Text>
        </View>
        <View style={st.infoItem}>
          <Ionicons name="people-outline" size={15} color="#4f7cff" />
          <Text style={st.infoTxt}>{groupType}</Text>
        </View>
        <View style={[st.infoItem, tour!.seatsLeft <= 3 && { borderColor: '#fecaca', backgroundColor: '#fff5f5' }]}>
          <Ionicons name="ticket-outline" size={15} color={tour!.seatsLeft <= 3 ? '#ef4444' : '#4f7cff'} />
          <Text style={[st.infoTxt, tour!.seatsLeft <= 3 && { color: '#ef4444' }]}>
            {tour!.seatsLeft > 0 ? `${tour!.seatsLeft} chỗ` : 'Hết chỗ'}
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View style={st.sectionCard}>
        <Text style={st.sectionTitle}>Tổng quan</Text>
        <Text style={st.sectionText}>{summary}</Text>
      </View>

      {/* Itinerary */}
      <View style={st.sectionCard}>
        <Text style={st.sectionTitle}>Lịch trình chi tiết</Text>
        {itinerary.map((line, i) => (
          <View key={i} style={st.bulletRow}>
            <View style={st.bulletDot} />
            <Text style={st.sectionText}>{line}</Text>
          </View>
        ))}
      </View>

      {/* Includes */}
      <View style={st.sectionCard}>
        <Text style={st.sectionTitle}>Dịch vụ bao gồm</Text>
        {includes.map((line, i) => (
          <View key={i} style={st.bulletRow}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={st.sectionText}>{line}</Text>
          </View>
        ))}
      </View>

      {/* Tags */}
      <View style={st.tagRow}>
        {tags.map(tag => (
          <Text key={tag} style={st.tag}>{tag}</Text>
        ))}
      </View>

      {/* Footer */}
      <View style={st.footerRow}>
        <View>
          <Text style={st.priceLabel}>Giá từ</Text>
          <Text style={st.price}>{formatPrice()}</Text>
        </View>
        <View style={st.footerBtns}>
          {/* Chọn HDV trước */}
          <TouchableOpacity style={st.outlineBtn}
            onPress={() => router.push('/guest_search_guide' as any)}>
            <Ionicons name="person-outline" size={15} color="#4f7cff" />
            <Text style={st.outlineBtnTxt}>Chọn HDV</Text>
          </TouchableOpacity>
          {/* Đặt tour (chọn tour trước → booking flow) */}
          <TouchableOpacity style={[st.bookBtn, tour!.seatsLeft === 0 && { backgroundColor: '#c0cbe8' }]}
            disabled={tour!.seatsLeft === 0}
            onPress={() => router.push('/guest_booking_flow' as any)}>
            <Text style={st.bookBtnTxt}>{tour!.seatsLeft === 0 ? 'Hết chỗ' : 'Đặt tour'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  emptyScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff', gap: 14, padding: 20 },
  emptyTitle: { color: '#1f2a58', fontSize: 20, fontWeight: '700' },
  backButton: { height: 42, borderRadius: 12, backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  backButtonText: { color: '#fff', fontWeight: '700' },

  banner: { height: 220, borderRadius: 20, marginBottom: 14, justifyContent: 'space-between', padding: 14 },
  bannerTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  circleBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  categoryBadgeTxt: { color: '#1f2a58', fontWeight: '700', fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  actionTxt: { color: '#4f7cff', fontWeight: '600', fontSize: 12 },

  title: { color: '#1f2a58', fontSize: 22, fontWeight: '700' },
  meta: { color: '#7a8cc2', marginTop: 6, marginBottom: 12 },

  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 10 },
  infoTxt: { color: '#5f73a9', fontSize: 12 },

  sectionCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 14, marginBottom: 10, gap: 6 },
  sectionTitle: { color: '#1f2a58', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionText: { color: '#6f83bb', lineHeight: 21, flex: 1 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4f7cff', marginTop: 7 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag: { color: '#4f7cff', backgroundColor: '#edf2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '600' },

  footerRow: { borderRadius: 16, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { color: '#7a8cc2', fontSize: 12 },
  price: { color: '#4f7cff', fontWeight: '700', fontSize: 20, marginTop: 4 },
  footerBtns: { flexDirection: 'row', gap: 8 },
  outlineBtn: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#4f7cff', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  outlineBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 13 },
  bookBtn: { height: 44, borderRadius: 12, backgroundColor: '#4f7cff', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  bookBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});