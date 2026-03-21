import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MONTHLY_REVENUE = [
  { month: 'T7', value: 82, label: '82tr' },
  { month: 'T8', value: 95, label: '95tr' },
  { month: 'T9', value: 68, label: '68tr' },
  { month: 'T10', value: 110, label: '110tr' },
  { month: 'T11', value: 130, label: '130tr' },
  { month: 'T12', value: 160, label: '160tr' },
];

const MAX_VALUE = 200;

const TOP_TOURS = [
  { name: 'Phú Quốc 4N3Đ', bookings: 48, revenue: '216tr', trend: 'up' },
  { name: 'Đà Lạt mộng mơ', bookings: 35, revenue: '98tr', trend: 'up' },
  { name: 'Sapa trekking', bookings: 29, revenue: '92tr', trend: 'down' },
  { name: 'Hội An cổ kính', bookings: 22, revenue: '42tr', trend: 'up' },
];

const TOP_GUIDES = [
  { name: 'Lê Minh Tuấn', tours: 28, rating: 4.9, revenue: '126tr' },
  { name: 'Nguyễn Văn Hùng', tours: 22, rating: 4.8, revenue: '98tr' },
  { name: 'Trần Thị Lan', tours: 18, rating: 4.7, revenue: '76tr' },
];

const PERIOD_OPTIONS = ['Tháng này', 'Quý này', 'Năm nay'];

export default function AdminReport() {
  const router = useRouter();
  const [period, setPeriod] = useState('Tháng này');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê & Báo cáo</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Ionicons name="download-outline" size={20} color="#4f7cff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: '#4f7cff' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color="#fff" />
            <Text style={styles.kpiValue}>1.45 tỷ</Text>
            <Text style={styles.kpiLabel}>Doanh thu</Text>
            <View style={styles.kpiTrend}>
              <Ionicons name="trending-up" size={13} color="#a5f3fc" />
              <Text style={styles.kpiTrendText}>+18%</Text>
            </View>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#10b981' }]}>
            <Ionicons name="ticket-outline" size={22} color="#fff" />
            <Text style={styles.kpiValue}>234</Text>
            <Text style={styles.kpiLabel}>Booking</Text>
            <View style={styles.kpiTrend}>
              <Ionicons name="trending-up" size={13} color="#a5f3fc" />
              <Text style={styles.kpiTrendText}>+24%</Text>
            </View>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="people-outline" size={22} color="#fff" />
            <Text style={styles.kpiValue}>512</Text>
            <Text style={styles.kpiLabel}>Khách hàng</Text>
            <View style={styles.kpiTrend}>
              <Ionicons name="trending-up" size={13} color="#a5f3fc" />
              <Text style={styles.kpiTrendText}>+11%</Text>
            </View>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="star-outline" size={22} color="#fff" />
            <Text style={styles.kpiValue}>4.8</Text>
            <Text style={styles.kpiLabel}>Đánh giá TB</Text>
            <View style={styles.kpiTrend}>
              <Ionicons name="trending-up" size={13} color="#a5f3fc" />
              <Text style={styles.kpiTrendText}>+0.2</Text>
            </View>
          </View>
        </View>

        {/* Revenue Bar Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doanh thu 6 tháng gần nhất</Text>
            <MaterialCommunityIcons name="chart-bar" size={18} color="#4f7cff" />
          </View>
          <View style={styles.chartWrap}>
            {MONTHLY_REVENUE.map((item) => {
              const barH = Math.round((item.value / MAX_VALUE) * 120);
              return (
                <View key={item.month} style={styles.barGroup}>
                  <Text style={styles.barLabel}>{item.label}</Text>
                  <View style={[styles.bar, { height: barH }]} />
                  <Text style={styles.barMonth}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Booking Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trạng thái Booking</Text>
            <MaterialCommunityIcons name="chart-donut" size={18} color="#4f7cff" />
          </View>
          <View style={styles.bookingStatusRow}>
            {[
              { label: 'Hoàn thành', value: 148, color: '#10b981', pct: '63%' },
              { label: 'Đang chờ', value: 52, color: '#f59e0b', pct: '22%' },
              { label: 'Đã hủy', value: 34, color: '#ef4444', pct: '15%' },
            ].map((item) => (
              <View key={item.label} style={styles.bookingStatusCard}>
                <View style={[styles.bookingDot, { backgroundColor: item.color }]} />
                <Text style={styles.bookingValue}>{item.value}</Text>
                <Text style={styles.bookingLabel}>{item.label}</Text>
                <Text style={[styles.bookingPct, { color: item.color }]}>{item.pct}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Tours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tour nổi bật</Text>
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#f59e0b" />
          </View>
          {TOP_TOURS.map((tour, i) => (
            <View key={tour.name} style={styles.rankRow}>
              <View style={[styles.rankBadge, i < 3 && { backgroundColor: ['#f59e0b', '#94a3b8', '#b45309'][i] }]}>
                <Text style={styles.rankNum}>{i + 1}</Text>
              </View>
              <View style={styles.rankBody}>
                <Text style={styles.rankName}>{tour.name}</Text>
                <Text style={styles.rankMeta}>{tour.bookings} booking</Text>
              </View>
              <View style={styles.rankRight}>
                <Text style={styles.rankRevenue}>{tour.revenue}</Text>
                <Ionicons
                  name={tour.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={tour.trend === 'up' ? '#10b981' : '#ef4444'}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Top Guides */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hướng dẫn viên xuất sắc</Text>
            <Ionicons name="ribbon-outline" size={18} color="#4f7cff" />
          </View>
          {TOP_GUIDES.map((guide, i) => (
            <View key={guide.name} style={styles.guideRow}>
              <View style={styles.guideAvatar}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <View style={styles.guideInfo}>
                <Text style={styles.guideName}>{guide.name}</Text>
                <View style={styles.guideMetaRow}>
                  <Ionicons name="star" size={11} color="#f59e0b" />
                  <Text style={styles.guideMeta}>{guide.rating}</Text>
                  <Text style={styles.guideDot}>·</Text>
                  <Text style={styles.guideMeta}>{guide.tours} tour</Text>
                </View>
              </View>
              <Text style={styles.guideRevenue}>{guide.revenue}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1f2a58' },
  exportBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 40 },
  periodRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: '#e4ebff',
  },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#4f7cff' },
  periodText: { color: '#7a8cc2', fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    borderRadius: 16, padding: 16, width: '47%',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  kpiLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  kpiTrendText: { color: '#a5f3fc', fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#e4ebff',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { color: '#1f2a58', fontSize: 15, fontWeight: '700' },
  chartWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 4 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', backgroundColor: '#4f7cff', borderRadius: 6, minHeight: 4 },
  barLabel: { color: '#7a8cc2', fontSize: 9, fontWeight: '600' },
  barMonth: { color: '#1f2a58', fontSize: 11, fontWeight: '700' },
  bookingStatusRow: { flexDirection: 'row', gap: 10 },
  bookingStatusCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#f8faff',
    borderRadius: 12, padding: 14, gap: 4,
  },
  bookingDot: { width: 10, height: 10, borderRadius: 5 },
  bookingValue: { fontSize: 20, fontWeight: '800', color: '#1f2a58' },
  bookingLabel: { fontSize: 11, color: '#7a8cc2', fontWeight: '600' },
  bookingPct: { fontSize: 13, fontWeight: '800' },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4ff',
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#e4ebff', alignItems: 'center', justifyContent: 'center',
  },
  rankNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rankBody: { flex: 1 },
  rankName: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  rankMeta: { color: '#7a8cc2', fontSize: 12, marginTop: 2 },
  rankRight: { alignItems: 'flex-end', gap: 4 },
  rankRevenue: { color: '#4f7cff', fontWeight: '700', fontSize: 14 },
  guideRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4ff',
  },
  guideAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center',
  },
  guideInfo: { flex: 1 },
  guideName: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  guideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  guideMeta: { color: '#7a8cc2', fontSize: 12 },
  guideDot: { color: '#c0cbe8' },
  guideRevenue: { color: '#10b981', fontWeight: '700', fontSize: 14 },
});