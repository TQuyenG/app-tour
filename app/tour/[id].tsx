/**
 * app/tour/[id].tsx
 * Trang Chi tiết Tour (Guest) - Đọc Data thật theo ID, Responsive, Flow chuẩn
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOURS } from '@/constants/travel-data';

export default function TourDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);
  
  const { id } = useLocalSearchParams();
  const [tour, setTour] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchTour = async () => {
        try {
          // Lấy data từ Local Storage (do Admin cập nhật)
          const rawTours = await AsyncStorage.getItem('@app_tours');
          let allTours = TOURS as any[];
          if (rawTours) {
            allTours = JSON.parse(rawTours);
          }
          // Tìm đúng tour theo ID
          const found = allTours.find(t => t.id === id);
          setTour(found || null);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchTour();
    }, [id])
  );

  if (isLoading) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f7cff" />
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="map-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
        <Text style={{ color: '#7a8cc2', fontWeight: '600' }}>Không tìm thấy thông tin Tour.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
           <Text style={{ color: '#4f7cff', fontWeight: '800' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priceNum = typeof tour.priceRaw === 'number' ? tour.priceRaw : Number(String(tour.price).replace(/[^0-9]/g, '')) || 0;
  const displayPrice = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : tour.price;

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.round(100 * scale) }}>
        {/* BANNER ẢNH */}
        <ImageBackground source={{ uri: tour.image || 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80' }} style={[s.coverImage, { paddingTop: insets.top }]}>
          <View style={s.coverOverlay}>
            <TouchableOpacity style={s.circleBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.circleBtn}>
              <Ionicons name="heart-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={s.mainBody}>
          <View style={s.catBadge}>
            <Text style={s.catBadgeTxt}>{tour.category}</Text>
          </View>
          <Text style={s.title}>{tour.name}</Text>
          
          <View style={s.metaRow}>
            <Ionicons name="location" size={14} color="#4f7cff" />
            <Text style={s.metaTxt}>Khởi hành: {tour.departure}</Text>
          </View>

          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={s.statVal}>{(tour.rating || 5.0).toFixed(1)}</Text>
              <Text style={s.statLbl}>Đánh giá</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Ionicons name="time" size={18} color="#10b981" />
              <Text style={s.statVal}>{tour.duration}</Text>
              <Text style={s.statLbl}>Thời gian</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Ionicons name="people" size={18} color="#8b5cf6" />
              <Text style={s.statVal}>{tour.seatsLeft} chỗ</Text>
              <Text style={s.statLbl}>Còn nhận</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Điểm nhấn hành trình</Text>
            <Text style={s.descText}>{tour.description || tour.summary || "Đang cập nhật lịch trình chi tiết cho chuyến đi này."}</Text>
          </View>

          {tour.tags && tour.tags.length > 0 && (
             <View style={s.section}>
               <Text style={s.sectionTitle}>Tiện ích bao gồm</Text>
               <View style={s.tagsWrap}>
                 {tour.tags.map((tag: string, idx: number) => (
                   <View key={idx} style={s.tagBubble}>
                     <Ionicons name="checkmark-circle" size={14} color="#059669" />
                     <Text style={s.tagTxt}>{tag}</Text>
                   </View>
                 ))}
               </View>
             </View>
          )}
        </View>
      </ScrollView>

      {/* FLOATING BOTTOM BAR */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.priceCol}>
          <Text style={s.priceLbl}>Giá trọn gói</Text>
          <Text style={s.priceTxt}>{displayPrice}</Text>
        </View>
        <View style={s.actionBtns}>
          <TouchableOpacity style={s.guideBtn} onPress={() => router.push({ pathname: '/guest_search_guide', params: { tourId: tour.id } })}>
            <Ionicons name="person-add" size={18} color="#4f7cff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.bookBtn} onPress={() => router.push({ pathname: '/guest_booking_flow', params: { tourId: tour.id } })}>
            <Text style={s.bookBtnTxt}>Tiếp tục</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fff' },
    coverImage: { width: '100%', height: sz(280), justifyContent: 'flex-start' },
    coverOverlay: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: sz(16), paddingTop: sz(10) },
    circleBtn: { width: sz(44), height: sz(44), borderRadius: sz(22), backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    mainBody: { padding: sz(20), marginTop: sz(-30), backgroundColor: '#fff', borderTopLeftRadius: sz(30), borderTopRightRadius: sz(30) },
    catBadge: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: sz(10), paddingVertical: sz(5), borderRadius: sz(8), marginBottom: sz(10) },
    catBadgeTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(12) },
    title: { fontSize: sz(22), fontWeight: '900', color: '#1f2a58', lineHeight: sz(30), marginBottom: sz(10) },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6), marginBottom: sz(20) },
    metaTxt: { color: '#7a8cc2', fontSize: sz(14), fontWeight: '600' },
    statsRow: { flexDirection: 'row', backgroundColor: '#f8faff', borderRadius: sz(16), paddingVertical: sz(16), marginBottom: sz(24), borderWidth: 1, borderColor: '#e4ebff' },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#e4ebff' },
    statVal: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginTop: sz(4) },
    statLbl: { fontSize: sz(11), color: '#7a8cc2', marginTop: sz(2), fontWeight: '600' },
    section: { marginBottom: sz(24) },
    sectionTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    descText: { fontSize: sz(15), color: '#475569', lineHeight: sz(24) },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sz(10) },
    tagBubble: { flexDirection: 'row', alignItems: 'center', gap: sz(6), backgroundColor: '#d1fae5', paddingHorizontal: sz(12), paddingVertical: sz(8), borderRadius: sz(10) },
    tagTxt: { color: '#065f46', fontSize: sz(13), fontWeight: '700' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sz(20), paddingTop: sz(14), borderTopWidth: 1, borderTopColor: '#e4ebff', elevation: 10 },
    priceCol: { flex: 1 },
    priceLbl: { color: '#7a8cc2', fontSize: sz(12), fontWeight: '600', marginBottom: sz(2) },
    priceTxt: { color: '#4f7cff', fontSize: sz(20), fontWeight: '900' },
    actionBtns: { flexDirection: 'row', gap: sz(10) },
    guideBtn: { width: sz(50), height: sz(50), borderRadius: sz(14), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
    bookBtn: { flexDirection: 'row', alignItems: 'center', gap: sz(8), backgroundColor: '#4f7cff', borderRadius: sz(14), paddingHorizontal: sz(20), height: sz(50) },
    bookBtnTxt: { color: '#fff', fontSize: sz(15), fontWeight: '900' }
  });
};