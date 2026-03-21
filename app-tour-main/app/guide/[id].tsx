// app/guide/[id].tsx

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGuideById } from '@/constants/travel-data';

export default function GuideDetailByIdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const guideItem = getGuideById(id || '');

  if (!guideItem) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Không tìm thấy hướng dẫn viên</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 32 }]}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#4f7cff" />
        <Text style={styles.backText}>Danh sách HDV</Text>
      </TouchableOpacity>

      <View style={styles.profileHeader}>
        <View style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{guideItem.name}</Text>
          <Text style={styles.location}>{guideItem.location}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.matchBadge}>
              <Ionicons name="flash" size={13} color="#4f7cff" />
              <Text style={styles.matchText}>{guideItem.match}% phù hợp</Text>
            </View>
            {guideItem.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#3dc87d" />
                <Text style={styles.verifiedText}>eKYC đã xác thực</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{guideItem.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Đánh giá</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{guideItem.tours}</Text>
          <Text style={styles.statLabel}>Tours</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{guideItem.experience}</Text>
          <Text style={styles.statLabel}>Kinh nghiệm</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Giới thiệu</Text>
        <Text style={styles.reviewText}>{guideItem.bio}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Kỹ năng & Sở thích</Text>
        <View style={styles.tagRow}>
          {guideItem.skills.map((skillItem) => (
            <Text key={skillItem} style={styles.tag}>{skillItem}</Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ngôn ngữ</Text>
        <View style={styles.tagRow}>
          {guideItem.languages.map((languageItem) => (
            <Text key={languageItem} style={styles.tag}>{languageItem}</Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Đánh giá gần đây</Text>
        {guideItem.reviews.map((reviewItem) => (
          <View key={`${reviewItem.user}-${reviewItem.text}`} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewUser}>{reviewItem.user}</Text>
              <View style={styles.stars}>
                {Array.from({ length: reviewItem.stars }).map((_, index) => (
                  <Ionicons key={index} name="star" size={12} color="#ffbe40" />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>{reviewItem.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Giá dịch vụ</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Nửa ngày (4h)</Text>
          <Text style={styles.priceVal}>{guideItem.halfDayPrice}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Cả ngày (8h)</Text>
          <Text style={styles.priceVal}>{guideItem.fullDayPrice}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.bookButton} onPress={() => router.push({ pathname: '/services', params: { guideId: guideItem.id } })}>
        <MaterialCommunityIcons name="calendar-check" size={18} color="#fff" />
        <Text style={styles.bookText}>Chọn HDV này</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  emptyScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f7ff', padding: 20 },
  emptyTitle: { color: '#1f2a58', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  backButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#4f7cff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: '#4f7cff', fontWeight: '600' },
  profileHeader: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#9cc3ff' },
  headerInfo: { flex: 1 },
  name: { color: '#1f2a58', fontSize: 22, fontWeight: '700' },
  location: { color: '#7a8cc2', marginTop: 4, fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#edf2ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchText: { color: '#4f7cff', fontSize: 12, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#edf9f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { color: '#3dc87d', fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4ebff',
    padding: 14,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#4f7cff', fontSize: 20, fontWeight: '700' },
  statLabel: { color: '#7a8cc2', marginTop: 4, fontSize: 12 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4ebff',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { color: '#1f2a58', fontWeight: '700', marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    color: '#4f7cff',
    backgroundColor: '#edf2ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: '#f0f4ff',
    paddingTop: 10,
    marginTop: 10,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { color: '#1f2a58', fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewText: { color: '#7a8cc2', marginTop: 6, lineHeight: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  priceLabel: { color: '#7a8cc2' },
  priceVal: { color: '#4f7cff', fontWeight: '700' },
  bookButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#4f7cff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookText: { color: '#fff', fontWeight: '700' },
});
