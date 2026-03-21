import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = '@guide_bookings';

interface Booking { id: string; customerName: string; tourName: string; date: string; price: string; status: string; }

const MONTHLY_MOCK = [
  { month: 'T10', value: 72 }, { month: 'T11', value: 88 },
  { month: 'T12', value: 105 }, { month: 'T1', value: 64 },
  { month: 'T2', value: 91 }, { month: 'T3', value: 118 },
];
const MAX_BAR = 140;
const PERIODS = ['Tháng này', 'Quý này', 'Năm nay'];

export default function GuideEarnings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [period, setPeriod] = useState('Tháng này');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => { if (raw) setBookings(JSON.parse(raw)); }).catch(() => {});
  }, []);

  const doneBookings = bookings.filter(b => b.status === 'done');
  const totalEarned = doneBookings.reduce((s, b) => s + Number(b.price), 0);
  const avgPerTour = doneBookings.length ? Math.round(totalEarned / doneBookings.length) : 0;
  const pendingAmount = bookings.filter(b => b.status === 'accepted' || b.status === 'ongoing').reduce((s, b) => s + Number(b.price), 0);

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1a2f7a" /></TouchableOpacity>
        <Text style={s.headerTitle}>Thu nhập</Text>
        <TouchableOpacity style={s.iconBtn}><Ionicons name="download-outline" size={20} color="#2856d6" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Period selector */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodActive]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodTxt, period === p && s.periodTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero total */}
        <View style={s.heroCard}>
          <MaterialCommunityIcons name="cash-multiple" size={32} color="rgba(255,255,255,0.7)" />
          <Text style={s.heroLabel}>Tổng thu nhập thực nhận</Text>
          <Text style={s.heroAmount}>{totalEarned.toLocaleString('vi-VN')}đ</Text>
          <View style={s.heroMeta}>
            <View style={s.heroMetaItem}><Text style={s.heroMetaVal}>{doneBookings.length}</Text><Text style={s.heroMetaLbl}>Tour xong</Text></View>
            <View style={s.heroMetaDivider} />
            <View style={s.heroMetaItem}><Text style={s.heroMetaVal}>{avgPerTour.toLocaleString('vi-VN')}đ</Text><Text style={s.heroMetaLbl}>TB/tour</Text></View>
            <View style={s.heroMetaDivider} />
            <View style={s.heroMetaItem}><Text style={s.heroMetaVal}>{pendingAmount.toLocaleString('vi-VN')}đ</Text><Text style={s.heroMetaLbl}>Chờ thanh toán</Text></View>
          </View>
        </View>

        {/* KPI cards */}
        <View style={s.kpiRow}>
          <View style={[s.kpiCard, { backgroundColor: '#eaf0ff' }]}>
            <Ionicons name="trending-up" size={20} color="#2856d6" />
            <Text style={[s.kpiVal, { color: '#2856d6' }]}>+18%</Text>
            <Text style={s.kpiLbl}>So tháng trước</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="star" size={20} color="#16a34a" />
            <Text style={[s.kpiVal, { color: '#16a34a' }]}>4.8⭐</Text>
            <Text style={s.kpiLbl}>Đánh giá TB</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: '#fef9c3' }]}>
            <Ionicons name="people-outline" size={20} color="#d97706" />
            <Text style={[s.kpiVal, { color: '#d97706' }]}>{bookings.length}</Text>
            <Text style={s.kpiLbl}>Tổng booking</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={s.chartSection}>
          <Text style={s.sectionTitle}>Doanh thu 6 tháng (triệu đồng)</Text>
          <View style={s.chartWrap}>
            {MONTHLY_MOCK.map(item => {
              const barH = Math.round((item.value / MAX_BAR) * 100);
              return (
                <View key={item.month} style={s.barGroup}>
                  <Text style={s.barValLbl}>{item.value}tr</Text>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { height: `${barH}%` }]} />
                  </View>
                  <Text style={s.barMonth}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Transaction history */}
        <View style={s.historySection}>
          <Text style={s.sectionTitle}>Lịch sử giao dịch</Text>
          {doneBookings.length === 0 && <Text style={s.emptyTxt}>Chưa có giao dịch hoàn thành.</Text>}
          {doneBookings.map(b => (
            <View key={b.id} style={s.txRow}>
              <View style={s.txIcon}><Ionicons name="checkmark-circle" size={18} color="#16a34a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.txTitle}>{b.tourName}</Text>
                <Text style={s.txMeta}>{b.customerName} · {b.date}</Text>
              </View>
              <Text style={s.txAmount}>+{Number(b.price).toLocaleString('vi-VN')}đ</Text>
            </View>
          ))}
          {/* Pending */}
          {bookings.filter(b => b.status === 'accepted' || b.status === 'ongoing').map(b => (
            <View key={b.id} style={s.txRow}>
              <View style={[s.txIcon, { backgroundColor: '#fef9c3' }]}><Ionicons name="time-outline" size={18} color="#d97706" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.txTitle}>{b.tourName}</Text>
                <Text style={s.txMeta}>{b.customerName} · {b.date}</Text>
              </View>
              <Text style={[s.txAmount, { color: '#d97706' }]}>~{Number(b.price).toLocaleString('vi-VN')}đ</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a2f7a' },
  content: { padding: 16 },
  periodRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#e4ebff' },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodActive: { backgroundColor: '#2856d6' },
  periodTxt: { color: '#7a8cc2', fontSize: 13, fontWeight: '600' },
  periodTxtActive: { color: '#fff' },
  heroCard: { backgroundColor: '#2856d6', borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#2856d6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 },
  heroAmount: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4, marginBottom: 16 },
  heroMeta: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 14 },
  heroMetaItem: { flex: 1, alignItems: 'center' },
  heroMetaVal: { color: '#fff', fontWeight: '800', fontSize: 14 },
  heroMetaLbl: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 2 },
  heroMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  kpiVal: { fontSize: 16, fontWeight: '800' },
  kpiLbl: { color: '#7a8cc2', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  chartSection: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  sectionTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 14, marginBottom: 14 },
  chartWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barValLbl: { color: '#7a8cc2', fontSize: 9, fontWeight: '600' },
  barBg: { width: '75%', height: 80, backgroundColor: '#eaf0ff', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#2856d6', borderRadius: 6 },
  barMonth: { color: '#1a2f7a', fontSize: 11, fontWeight: '700' },
  historySection: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  emptyTxt: { color: '#7a8cc2', textAlign: 'center', paddingVertical: 16 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  txIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  txTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 13 },
  txMeta: { color: '#7a8cc2', fontSize: 11, marginTop: 2 },
  txAmount: { color: '#16a34a', fontWeight: '800', fontSize: 14 },
});