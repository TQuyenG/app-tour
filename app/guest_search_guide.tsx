/**
 * app/guest_search_guide.tsx
 * Tìm & Chọn HDV - Truyền ID chuẩn sang Public Profile hoặc Booking Flow
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@/constants/storage-helper';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDES } from '@/constants/travel-data';

export default function GuestSearchGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);
  
  // Nếu có ID Tour truyền sang từ Trang Chi tiết
  const { tourId } = useLocalSearchParams();

  const [keyword, setKeyword] = useState('');
  const [guides, setGuides] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    const loadGuides = async () => {
      let sysGuides = GUIDES as any[];
      const raw = await AsyncStorage.getItem('@app_guides');
      if (raw) sysGuides = JSON.parse(raw);
      setGuides(sysGuides);
    };
    loadGuides();
  }, []));

  const filteredGuides = useMemo(() => {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return guides;
    return guides.filter(g => 
      g.name.toLowerCase().includes(kw) || g.location.toLowerCase().includes(kw) || 
      (g.skills && g.skills.join(' ').toLowerCase().includes(kw))
    );
  }, [keyword, guides]);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.title}>Chọn Hướng dẫn viên</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color="#7a8cc2" />
        <TextInput style={s.input} placeholder="Tìm tên, kỹ năng, địa điểm..." value={keyword} onChangeText={setKeyword} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {filteredGuides.map(g => (
          <View key={g.id} style={s.card}>
            <View style={s.cardTop}>
              <TouchableOpacity onPress={() => router.push({ pathname: '/public-guide-profile', params: { id: g.id } })}>
                <Image source={{ uri: g.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' }} style={s.avatar} />
              </TouchableOpacity>
              <View style={s.info}>
                <Text style={s.name}>{g.name}</Text>
                <Text style={s.meta}><Ionicons name="location-outline" size={12} /> {g.location} · {g.experience}</Text>
                <View style={s.stats}>
                   <Text style={s.statTxt}>⭐ {(g.rating || 5.0).toFixed(1)}</Text>
                   <Text style={s.statTxt}>🎒 {g.tours || 0} tours</Text>
                </View>
              </View>
            </View>
            <View style={s.cardBottom}>
              <TouchableOpacity style={s.viewBtn} onPress={() => router.push({ pathname: '/public-guide-profile', params: { id: g.id } })}>
                 <Text style={s.viewBtnTxt}>Xem hồ sơ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.selectBtn} onPress={() => router.push({ pathname: '/guest_booking_flow', params: { tourId, guideId: g.id } })}>
                 <Text style={s.selectBtnTxt}>Chọn HDV này</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(10), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: sz(18), fontWeight: '800', color: '#1f2a58' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: sz(10), backgroundColor: '#fff', margin: sz(16), borderRadius: sz(14), paddingHorizontal: sz(14), paddingVertical: sz(12), borderWidth: 1, borderColor: '#e4ebff', elevation: 2 },
    input: { flex: 1, fontSize: sz(14), color: '#1f2a58' },
    content: { paddingHorizontal: sz(16), paddingBottom: sz(40) },
    card: { backgroundColor: '#fff', borderRadius: sz(18), padding: sz(16), marginBottom: sz(14), borderWidth: 1, borderColor: '#e4ebff', elevation: 2 },
    cardTop: { flexDirection: 'row', gap: sz(14), marginBottom: sz(16) },
    avatar: { width: sz(64), height: sz(64), borderRadius: sz(16), borderWidth: 2, borderColor: '#eef2ff' },
    info: { flex: 1 },
    name: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(4) },
    meta: { fontSize: sz(12), color: '#7a8cc2', marginBottom: sz(6) },
    stats: { flexDirection: 'row', gap: sz(12) },
    statTxt: { fontSize: sz(12), fontWeight: '700', color: '#f59e0b' },
    cardBottom: { flexDirection: 'row', gap: sz(10) },
    viewBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: sz(44), borderRadius: sz(12), backgroundColor: '#eaf0ff' },
    viewBtnTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(13) },
    selectBtn: { flex: 1.5, alignItems: 'center', justifyContent: 'center', height: sz(44), borderRadius: sz(12), backgroundColor: '#4f7cff' },
    selectBtnTxt: { color: '#fff', fontWeight: '800', fontSize: sz(13) },
  });
};