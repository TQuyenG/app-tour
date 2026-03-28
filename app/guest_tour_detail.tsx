/**
 * guest_tour_detail.tsx
 * Đổi tên từ: tour-detail.tsx
 * Thêm: nút "Đặt tour" → vào guest_booking_flow
 *       nút "Chọn HDV trước" → vào guest_search_guide
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GuestTourDetailScreen() {
  const router = useRouter();

  return (
    <ScrollView style={st.screen} contentContainerStyle={st.content}>
      <View style={st.banner}>
        <View style={st.bannerTopRow}>
          <TouchableOpacity style={st.circleBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.circleBtn} onPress={() => router.push('/guest_favorites' as any)}>
            <Ionicons name="heart-outline" size={20} color="#4f7cff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={st.title}>Đà Lạt 3N2Đ – Săn mây & Chill</Text>
      <Text style={st.meta}>Khởi hành từ TP.HCM · 18/04/2026</Text>

      <View style={st.infoRow}>
        {[
          { icon: <Ionicons name="star" size={16} color="#ffbe40" />, text: '4.8 (1.2k)' },
          { icon: <MaterialCommunityIcons name="clock-outline" size={16} color="#4f7cff" />, text: '3 ngày 2 đêm' },
          { icon: <Ionicons name="people-outline" size={16} color="#4f7cff" />, text: 'Nhóm nhỏ' },
        ].map((item, i) => (
          <View key={i} style={st.infoItem}>
            {item.icon}
            <Text style={st.infoText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={st.sectionCard}>
        <Text style={st.sectionTitle}>Lịch trình nổi bật</Text>
        <Text style={st.sectionText}>• Ngày 1: Check-in homestay, khám phá trung tâm</Text>
        <Text style={st.sectionText}>• Ngày 2: Săn mây đồi chè, tham quan vườn hoa</Text>
        <Text style={st.sectionText}>• Ngày 3: Chợ đặc sản và quay về</Text>
      </View>

      <View style={st.sectionCard}>
        <Text style={st.sectionTitle}>Bao gồm</Text>
        <Text style={st.sectionText}>Xe đưa đón, khách sạn 3 sao, ăn sáng, hướng dẫn viên</Text>
      </View>

      {/* CTA block */}
      <View style={st.ctaCard}>
        <View>
          <Text style={st.priceLabel}>Giá từ</Text>
          <Text style={st.price}>2.990.000đ</Text>
        </View>
        <View style={st.ctaBtns}>
          <TouchableOpacity style={st.secondaryBtn} onPress={() => router.push('/guest_search_guide' as any)}>
            <Ionicons name="person-add-outline" size={15} color="#4f7cff" />
            <Text style={st.secondaryBtnTxt}>Chọn HDV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.bookBtn} onPress={() => router.push('/guest_booking_flow' as any)}>
            <Text style={st.bookBtnTxt}>Đặt tour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18, paddingBottom: 30 },
  banner: { height: 220, borderRadius: 20, backgroundColor: '#9cc3ff', marginBottom: 14 },
  bannerTopRow: { marginTop: 14, marginHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between' },
  circleBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { color: '#1f2a58', fontSize: 23, fontWeight: '700' },
  meta: { color: '#7a8cc2', marginTop: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 10 },
  infoText: { color: '#5f73a9', fontSize: 12 },
  sectionCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 14, marginBottom: 10 },
  sectionTitle: { color: '#1f2a58', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: '#6f83bb', lineHeight: 22 },
  ctaCard: { marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { color: '#7a8cc2', fontSize: 12 },
  price: { color: '#4f7cff', fontWeight: '700', fontSize: 20, marginTop: 4 },
  ctaBtns: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#4f7cff', paddingHorizontal: 14, backgroundColor: '#edf2ff' },
  secondaryBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 13 },
  bookBtn: { height: 44, borderRadius: 12, backgroundColor: '#4f7cff', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  bookBtnTxt: { color: '#fff', fontWeight: '700' },
});