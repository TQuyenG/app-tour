/**
 * app/guest_booking_flow.tsx
 * Xác nhận Thông tin & Dịch vụ thêm (Add-ons)
 * UI: Borderless (Không viền), Nổi khối.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ADD_ONS = [
  { id: "a1", name: "Thợ chụp ảnh chuyên nghiệp", price: 500000, icon: "camera" },
  { id: "a2", name: "Xe đưa đón tận nơi", price: 350000, icon: "car" },
  { id: "a3", name: "Bảo hiểm du lịch", price: 50000, icon: "shield-checkmark" },
];

export default function GuestBookingFlowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { tourId, guideId, schStart, schEnd } = useLocalSearchParams();
  const [tour, setTour] = useState<any>({});
  const [guide, setGuide] = useState<any>({});
  
  const [guests, setGuests] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@app_tours').then(raw => {
      if (raw) {
        const found = JSON.parse(raw).find((x:any) => x.id === tourId);
        if (found) setTour(found);
      }
    });
    AsyncStorage.getItem('@app_guides').then(raw => {
      if (raw) {
        const found = JSON.parse(raw).find((x:any) => x.id === guideId);
        if (found) setGuide(found);
      }
    });
  }, [tourId, guideId]));

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) setSelectedAddons(selectedAddons.filter(a => a !== id));
    else setSelectedAddons([...selectedAddons, id]);
  };

  const tourPrice = (tour.priceRaw || 0) * guests;
  const addonTotal = ADD_ONS.filter(a => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
  const finalTotal = tourPrice + addonTotal;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + Math.round(10 * scale) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.title}>Thiết lập chuyến đi</Text>
        <View style={{ width: Math.round(40 * scale) }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* TÓM TẮT */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Đã lựa chọn</Text>
          <View style={s.row}>
             <View style={s.iconWrap}><Ionicons name="map" size={16} color="#4f7cff"/></View>
             <Text style={s.rowTxt} numberOfLines={1}>{tour.name}</Text>
          </View>
          <View style={s.row}>
             <View style={s.iconWrap}><Ionicons name="calendar" size={16} color="#4f7cff"/></View>
             <Text style={s.rowTxt}>{new Date(schStart as string).toLocaleString('vi-VN')} - {new Date(schEnd as string).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</Text>
          </View>
          <View style={s.row}>
             <View style={s.iconWrap}><Ionicons name="person" size={16} color="#4f7cff"/></View>
             <Text style={s.rowTxt}>HDV: {guide.name}</Text>
          </View>
        </View>

        {/* SỐ LƯỢNG KHÁCH */}
        <Text style={s.sectionTitle}>Số lượng hành khách</Text>
        <View style={s.guestCard}>
           <Text style={s.guestLabel}>Người lớn / Trẻ em</Text>
           <View style={s.counter}>
              <TouchableOpacity style={s.countBtn} onPress={() => setGuests(Math.max(1, guests - 1))}><Ionicons name="remove" size={20} color="#1f2a58" /></TouchableOpacity>
              <Text style={s.countTxt}>{guests}</Text>
              <TouchableOpacity style={s.countBtn} onPress={() => setGuests(guests + 1)}><Ionicons name="add" size={20} color="#1f2a58" /></TouchableOpacity>
           </View>
        </View>

        {/* DỊCH VỤ THÊM */}
        <Text style={s.sectionTitle}>Nâng cấp trải nghiệm</Text>
        {ADD_ONS.map(a => (
          <TouchableOpacity key={a.id} style={[s.addonCard, selectedAddons.includes(a.id) && s.addonCardActive]} onPress={() => toggleAddon(a.id)}>
            <View style={[s.addonIconWrap, selectedAddons.includes(a.id) && { backgroundColor: '#10b981' }]}>
              <Ionicons name={a.icon as any} size={20} color={selectedAddons.includes(a.id) ? "#fff" : "#4f7cff"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.addonName, selectedAddons.includes(a.id) && { color: '#fff' }]}>{a.name}</Text>
              <Text style={[s.addonPrice, selectedAddons.includes(a.id) && { color: 'rgba(255,255,255,0.8)' }]}>+{a.price.toLocaleString('vi-VN')}đ</Text>
            </View>
            {selectedAddons.includes(a.id) && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FLOAT BAR */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Math.round(14 * scale)) }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#7a8cc2', fontSize: Math.round(12 * scale), fontWeight: '600' }}>Tạm tính ({guests} khách)</Text>
          <Text style={{ color: '#10b981', fontSize: Math.round(20 * scale), fontWeight: '900' }}>{finalTotal.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => router.push({ 
            pathname: '/guest_checkout', 
            params: { tourId, guideId, schStart, schEnd, guests, addons: JSON.stringify(selectedAddons), total: finalTotal } 
          })}>
          <Text style={s.btnTxt}>Tới Thanh toán</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sz(16), paddingBottom: sz(14), backgroundColor: '#f8faff' },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(14), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    title: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    content: { padding: sz(20), paddingBottom: sz(120) },
    
    summaryCard: { backgroundColor: '#fff', borderRadius: sz(20), padding: sz(18), elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: {width: 0, height: 5}, marginBottom: sz(24) },
    summaryTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    row: { flexDirection: 'row', alignItems: 'center', gap: sz(10), marginBottom: sz(10) },
    iconWrap: { width: sz(32), height: sz(32), borderRadius: sz(10), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
    rowTxt: { fontSize: sz(14), color: '#1f2a58', fontWeight: '700', flex: 1 },

    guestCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), marginBottom: sz(24), elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    guestLabel: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58' },
    counter: { flexDirection: 'row', alignItems: 'center', gap: sz(16) },
    countBtn: { width: sz(36), height: sz(36), borderRadius: sz(10), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    countTxt: { fontSize: sz(18), fontWeight: '900', color: '#4f7cff' },

    sectionTitle: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginBottom: sz(12) },
    addonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), marginBottom: sz(12), elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    addonCardActive: { backgroundColor: '#4f7cff' },
    addonIconWrap: { width: sz(44), height: sz(44), borderRadius: sz(14), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center', marginRight: sz(14) },
    addonName: { fontSize: sz(15), fontWeight: '900', color: '#1f2a58' },
    addonPrice: { fontSize: sz(13), color: '#10b981', fontWeight: '800', marginTop: sz(4) },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: sz(20), paddingTop: sz(14), elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: {width: 0, height: -10} },
    btn: { flexDirection: 'row', gap: sz(8), backgroundColor: '#4f7cff', borderRadius: sz(14), paddingHorizontal: sz(24), height: sz(54), alignItems: 'center', justifyContent: 'center' },
    btnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '900' },
  });
};