/**
 * guest_search_guide.tsx
 * Đổi tên từ: search-guide.tsx
 * Điều hướng: sau khi chọn HDV → đi thẳng vào guest_booking_flow
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDES } from '@/constants/travel-data';

/* Ảnh avatar HDV theo id */
const GUIDE_AVATARS: Record<string, string> = {
  g001: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  g002: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  g003: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  g004: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80',
  g005: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
  g006: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=300&q=80',
  g007: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80',
  g008: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
};

/* Ảnh nền cover theo điểm đến */
const LOCATION_BG: Record<string, string> = {
  'đà lạt':    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
  'phú quốc':  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  'nha trang': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&q=80',
  'sapa':      'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=600&q=80',
  'hạ long':   'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
  'hội an':    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80',
  'đà nẵng':   'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=600&q=80',
  'mũi né':    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'huế':       'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=600&q=80',
  'côn đảo':   'https://images.unsplash.com/photo-1540202403-b7abd6747a18?w=600&q=80',
};
const DEFAULT_BG = 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=80';

function getGuideAvatar(id: string, name: string): string {
  return GUIDE_AVATARS[id] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f7cff&color=fff&size=300`;
}
function getLocationBg(location: string): string {
  const l = location.toLowerCase();
  for (const key of Object.keys(LOCATION_BG)) {
    if (l.includes(key)) return LOCATION_BG[key];
  }
  return DEFAULT_BG;
}

/* Badge màu theo match% */
function matchColor(pct: number): string {
  if (pct >= 90) return '#16a34a';
  if (pct >= 75) return '#4f7cff';
  return '#d97706';
}

function GuideCard({ g, index, mc, onPress }: {
  g: any; index: number; mc: string; onPress: () => void;
}) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useMemo(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, delay: index * 70, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 60 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 60 }).start();

  const skills: string[] = Array.isArray(g.skills)
    ? g.skills
    : typeof g.skills === 'string'
    ? g.skills.split(',').map((s: string) => s.trim())
    : [];

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={st.guideCard}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Ảnh cover nền điểm đến */}
        <View style={st.cardCover}>
          <Image
            source={{ uri: getLocationBg(g.location) }}
            style={st.coverImg}
            resizeMode="cover"
          />
          <View style={st.coverOverlay} />

          {/* Match badge trên ảnh */}
          <View style={[st.matchBadgeFloat, { backgroundColor: mc }]}>
            <Ionicons name="flash" size={11} color="#fff" />
            <Text style={st.matchBadgeFloatTxt}>{g.match}% phù hợp</Text>
          </View>

          {/* Rating badge góc phải */}
          <View style={st.ratingBadgeFloat}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={st.ratingBadgeFloatTxt}>{g.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={st.cardBody}>
          {/* Avatar + Info row */}
          <View style={st.cardTopRow}>
            {/* Avatar */}
            <View style={st.avatarWrap}>
              <Image
                source={{ uri: getGuideAvatar(g.id, g.name) }}
                style={st.avatarImg}
                resizeMode="cover"
              />
              {/* Online dot */}
              <View style={st.onlineDot} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={st.guideName}>{g.name}</Text>
              <View style={st.locRow}>
                <Ionicons name="location-outline" size={12} color="#8ea0d6" />
                <Text style={st.guideLoc}>{g.location}</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#c0cbe8" />
          </View>

          {/* Skills tags */}
          <View style={st.tagRow}>
            {skills.slice(0, 3).map(sk => (
              <View key={sk} style={st.skillChip}>
                <Text style={st.guideTag}>{sk}</Text>
              </View>
            ))}
          </View>

          {/* Footer: tours + experience */}
          <View style={st.cardFooter}>
            <View style={st.footerItem}>
              <Ionicons name="map-outline" size={12} color="#7a8cc2" />
              <Text style={st.footerTxt}>{g.tours} tour</Text>
            </View>
            <View style={st.footerDot} />
            <View style={st.footerItem}>
              <Ionicons name="time-outline" size={12} color="#7a8cc2" />
              <Text style={st.footerTxt}>{g.experience}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function GuestSearchGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [locationKeyword, setLocationKeyword] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('2');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Chụp ảnh']);
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'tours'>('match');
  const [searched, setSearched] = useState(false);

  const availableTags = ['Chụp ảnh', 'Ẩm thực', 'Lịch sử', 'Trekking', 'Biển', 'Gia đình'];

  const filteredGuides = useMemo(() => {
    const kw = locationKeyword.trim().toLowerCase();
    const list = GUIDES.filter(g => {
      const matchLoc = !kw || g.location.toLowerCase().includes(kw) || g.name.toLowerCase().includes(kw);
      const matchTags = selectedTags.length === 0 || selectedTags.some(t => g.skills.join(' ').toLowerCase().includes(t.toLowerCase()));
      return matchLoc && matchTags;
    });
    return list.sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : sortBy === 'tours' ? b.tours - a.tours : b.match - a.match);
  }, [locationKeyword, selectedTags, sortBy]);

  const onToggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 32 }]}>
      <TouchableOpacity style={st.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#4f7cff" />
        <Text style={st.backText}>Quay lại</Text>
      </TouchableOpacity>

      <Text style={st.title}>Tìm Hướng dẫn viên</Text>
      <Text style={st.subtitle}>AI sẽ gợi ý người phù hợp nhất với hành trình của bạn</Text>

      <View style={st.aiBadge}>
        <MaterialCommunityIcons name="brain" size={16} color="#4f7cff" />
        <Text style={st.aiBadgeText}>Smart Matching · Hybrid AI · Cosine Similarity</Text>
      </View>

      <View style={st.filterGroup}>
        <View style={st.inputRow}>
          <Ionicons name="location-outline" size={17} color="#8ea0d6" />
          <TextInput style={st.input} placeholder="Địa điểm (VD: Đà Lạt)" value={locationKeyword} onChangeText={setLocationKeyword} />
        </View>
        <View style={st.rowTwo}>
          <View style={[st.inputRow, { flex: 1 }]}>
            <Ionicons name="calendar-outline" size={17} color="#8ea0d6" />
            <TextInput style={st.input} placeholder="Ngày đi" value={date} onChangeText={setDate} />
          </View>
          <View style={[st.inputRow, { flex: 1 }]}>
            <Ionicons name="people-outline" size={17} color="#8ea0d6" />
            <TextInput style={st.input} placeholder="Số khách" keyboardType="number-pad" value={guests} onChangeText={setGuests} />
          </View>
        </View>
      </View>

      <Text style={st.sectionTitle}>Sở thích & Bộ lọc</Text>
      <View style={st.tagGrid}>
        {availableTags.map(tag => (
          <TouchableOpacity key={tag} style={selectedTags.includes(tag) ? st.tagActive : st.tag} onPress={() => onToggleTag(tag)}>
            <Text style={selectedTags.includes(tag) ? st.tagActiveTxt : st.tagTxt}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.sortRow}>
        {[['match','Ưu tiên phù hợp'],['rating','Đánh giá cao'],['tours','Nhiều tour']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[st.sortChip, sortBy === key && st.sortChipActive]} onPress={() => setSortBy(key as any)}>
            <Text style={[st.sortChipTxt, sortBy === key && st.sortChipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={st.searchBtn} onPress={() => setSearched(true)}>
        <Ionicons name="search" size={18} color="#fff" />
        <Text style={st.searchTxt}>Tìm kiếm với AI</Text>
      </TouchableOpacity>

      <Text style={st.resultHeader}>Kết quả cho bạn ({filteredGuides.length})</Text>

      {searched && (
        <View style={st.metaBanner}>
          <Text style={st.metaTxt}>AI đã chạy matching theo {selectedTags.length} sở thích và {guests || '0'} khách.</Text>
        </View>
      )}


      {filteredGuides.map((g, index) => {
        const mc = matchColor(g.match);
        return (
          <GuideCard
            key={g.id}
            g={g}
            index={index}
            mc={mc}
            onPress={() => router.push({ pathname: '/guide/[id]', params: { id: g.id } } as any)}
          />
        );
      })}

      {filteredGuides.length === 0 && (
        <View style={st.empty}>
          <Text style={st.emptyTxt}>Không tìm thấy HDV phù hợp. Hãy đổi từ khóa hoặc tag sở thích.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:               { flex: 1, backgroundColor: '#f3f7ff' },
  content:              { padding: 18 },
  backRow:              { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText:             { color: '#4f7cff', fontWeight: '600' },
  title:                { color: '#1f2a58', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:             { color: '#7a8cc2', marginTop: 6, marginBottom: 12, fontSize: 13 },
  aiBadge:              { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', borderRadius: 12, padding: 10, marginBottom: 14 },
  aiBadgeText:          { color: '#4f7cff', fontWeight: '600', fontSize: 12 },
  filterGroup:          { gap: 10, marginBottom: 14 },
  rowTwo:               { flexDirection: 'row', gap: 10 },
  inputRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 12, paddingHorizontal: 12 },
  input:                { flex: 1, paddingVertical: 10, color: '#1f2a58' },
  sectionTitle:         { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  tagGrid:              { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag:                  { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8 },
  tagActive:            { borderRadius: 999, borderWidth: 1, borderColor: '#4f7cff', backgroundColor: '#4f7cff', paddingHorizontal: 14, paddingVertical: 8 },
  tagTxt:               { color: '#6c7fb7', fontSize: 13 },
  tagActiveTxt:         { color: '#fff', fontSize: 13, fontWeight: '700' },
  sortRow:              { gap: 8, marginBottom: 12 },
  sortChip:             { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  sortChipActive:       { borderColor: '#4f7cff', backgroundColor: '#edf2ff' },
  sortChipTxt:          { color: '#6c7fb7', fontSize: 12 },
  sortChipTxtActive:    { color: '#4f7cff', fontWeight: '700' },
  searchBtn:            { height: 50, borderRadius: 14, backgroundColor: '#4f7cff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  searchTxt:            { color: '#fff', fontWeight: '700', fontSize: 15 },
  resultHeader:         { color: '#1f2a58', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  metaBanner:           { borderRadius: 10, borderWidth: 1, borderColor: '#d0dbff', backgroundColor: '#edf2ff', padding: 8, marginBottom: 10 },
  metaTxt:              { color: '#4f7cff', fontSize: 12, fontWeight: '600' },

  // Card mới có ảnh
  guideCard:            { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e4ebff', marginBottom: 14, overflow: 'hidden', shadowColor: '#a0b4e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 4 },
  cardCover:            { height: 100, position: 'relative' },
  coverImg:             { width: '100%', height: '100%' },
  coverOverlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,60,0.32)' },
  matchBadgeFloat:      { position: 'absolute', top: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  matchBadgeFloatTxt:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  ratingBadgeFloat:     { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  ratingBadgeFloatTxt:  { color: '#f59e0b', fontWeight: '800', fontSize: 11 },

  cardBody:             { padding: 12 },
  cardTopRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarWrap:           { width: 52, height: 52, borderRadius: 14, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: '#dfe7ff' },
  avatarImg:            { width: '100%', height: '100%' },
  onlineDot:            { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', borderWidth: 2, borderColor: '#fff' },
  guideName:            { color: '#1f2a58', fontWeight: '700', fontSize: 15 },
  locRow:               { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  guideLoc:             { color: '#7a8cc2', fontSize: 12 },

  tagRow:               { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  skillChip:            { backgroundColor: '#edf2ff', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  guideTag:             { fontSize: 11, color: '#4f7cff', fontWeight: '600' },

  cardFooter:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerItem:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerTxt:            { color: '#7a8cc2', fontSize: 11, fontWeight: '600' },
  footerDot:            { width: 3, height: 3, borderRadius: 2, backgroundColor: '#c0cbe8' },

  empty:                { borderRadius: 14, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8 },
  emptyTxt:             { color: '#7a8cc2', textAlign: 'center', lineHeight: 20 },
});