/**
 * guest_search_guide.tsx
 * Đổi tên từ: search-guide.tsx
 * Điều hướng: sau khi chọn HDV → đi thẳng vào guest_booking_flow
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUIDES } from '@/constants/travel-data';

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

      {filteredGuides.map(g => (
        <TouchableOpacity key={g.id} style={st.guideCard}
          onPress={() => router.push({ pathname: '/guide/[id]', params: { id: g.id } } as any)}
          activeOpacity={0.9}>
          <View style={st.avatar} />
          <View style={st.guideInfo}>
            <View style={st.nameRow}>
              <Text style={st.guideName}>{g.name}</Text>
              <View style={st.matchBadge}><Ionicons name="flash" size={12} color="#4f7cff" /><Text style={st.matchTxt}>{g.match}% phù hợp</Text></View>
            </View>
            <Text style={st.guideLoc}>{g.location}</Text>
            <View style={st.tagRow}>
              {g.skills.slice(0, 2).map(sk => <Text key={sk} style={st.guideTag}>{sk}</Text>)}
            </View>
            <View style={st.guideMetaRow}>
              <Ionicons name="star" size={13} color="#ffbe40" />
              <Text style={st.guideMeta}>{g.rating.toFixed(1)} · {g.tours} tour</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#c0cbe8" />
        </TouchableOpacity>
      ))}

      {filteredGuides.length === 0 && (
        <View style={st.empty}>
          <Text style={st.emptyTxt}>Không tìm thấy HDV phù hợp. Hãy đổi từ khóa hoặc tag sở thích.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: '#4f7cff', fontWeight: '600' },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 12 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', borderRadius: 12, padding: 10, marginBottom: 14 },
  aiBadgeText: { color: '#4f7cff', fontWeight: '600', fontSize: 12 },
  filterGroup: { gap: 10, marginBottom: 14 },
  rowTwo: { flexDirection: 'row', gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, color: '#1f2a58' },
  sectionTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8 },
  tagActive: { borderRadius: 999, borderWidth: 1, borderColor: '#4f7cff', backgroundColor: '#4f7cff', paddingHorizontal: 14, paddingVertical: 8 },
  tagTxt: { color: '#6c7fb7', fontSize: 13 },
  tagActiveTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sortRow: { gap: 8, marginBottom: 12 },
  sortChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  sortChipActive: { borderColor: '#4f7cff', backgroundColor: '#edf2ff' },
  sortChipTxt: { color: '#6c7fb7', fontSize: 12 },
  sortChipTxtActive: { color: '#4f7cff', fontWeight: '700' },
  searchBtn: { height: 48, borderRadius: 14, backgroundColor: '#4f7cff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 },
  searchTxt: { color: '#fff', fontWeight: '700' },
  resultHeader: { color: '#1f2a58', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  metaBanner: { borderRadius: 10, borderWidth: 1, borderColor: '#d0dbff', backgroundColor: '#edf2ff', padding: 8, marginBottom: 10 },
  metaTxt: { color: '#4f7cff', fontSize: 12, fontWeight: '600' },
  guideCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 58, height: 58, borderRadius: 14, backgroundColor: '#9cc3ff' },
  guideInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  guideName: { color: '#1f2a58', fontWeight: '700', fontSize: 15 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#edf2ff', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  matchTxt: { color: '#4f7cff', fontSize: 11, fontWeight: '700' },
  guideLoc: { color: '#7a8cc2', fontSize: 12, marginTop: 4 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  guideTag: { fontSize: 11, color: '#6c7fb7', backgroundColor: '#edf2ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  guideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  guideMeta: { color: '#7a8cc2', fontSize: 12 },
  empty: { borderRadius: 12, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 12 },
  emptyTxt: { color: '#7a8cc2', textAlign: 'center' },
});