/**
 * guest_notifications.tsx — Nâng cấp với type, filter, seed data
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = '@guest_notifications';

type NotifType = 'booking' | 'payment' | 'promo' | 'review' | 'system';

interface GuestNotif {
  id: string; message: string; read: boolean;
  createdAt: string; type?: NotifType;
}

const TYPE_META: Record<NotifType, { icon: string; color: string; bg: string; label: string }> = {
  booking: { icon: 'airplane-outline',       color: '#2856d6', bg: '#eaf0ff', label: 'Booking' },
  payment: { icon: 'card-outline',           color: '#16a34a', bg: '#dcfce7', label: 'Thanh toán' },
  promo:   { icon: 'pricetag-outline',       color: '#f59e0b', bg: '#fef9c3', label: 'Khuyến mãi' },
  review:  { icon: 'star-outline',           color: '#8b5cf6', bg: '#ede9fe', label: 'Đánh giá' },
  system:  { icon: 'information-circle-outline', color: '#64748b', bg: '#f1f5f9', label: 'Hệ thống' },
};

const SEED_NOTIFS: GuestNotif[] = [
  { id: "n1",  message: "✅ Booking #BK001001 tour Đà Lạt 3N2Đ đã được HDV Trần Minh Khoa xác nhận!",             read: false, createdAt: new Date().toISOString(),                       type: "booking" },
  { id: "n2",  message: "💰 Thanh toán thành công 8.970.000đ cho tour Đà Lạt 3N2Đ. Mã booking: BK001001.",        read: false, createdAt: new Date(Date.now()-3600000).toISOString(),        type: "payment" },
  { id: "n3",  message: "🎁 Ưu đãi mùa hè: Giảm 35% tour biển & cao nguyên! Dùng mã SUMMER35. HSD: 30/06/2026.", read: false, createdAt: new Date(Date.now()-7200000).toISOString(),        type: "promo" },
  { id: "n4",  message: "⭐ Cảm ơn bạn đã đánh giá tour Phú Quốc. Bạn vừa nhận +50 điểm thưởng!",               read: true,  createdAt: new Date(Date.now()-86400000).toISOString(),        type: "review" },
  { id: "n5",  message: "🎫 Voucher sinh nhật BDAY100 (100.000đ) đã được thêm vào kho voucher của bạn 🎂",         read: true,  createdAt: new Date(Date.now()-172800000).toISOString(),       type: "promo" },
  { id: "n6",  message: "✈️ Tour Sapa 3N2Đ khởi hành trong 2 ngày nữa. Nhớ chuẩn bị hành lý phù hợp nhé!",       read: true,  createdAt: new Date(Date.now()-259200000).toISOString(),       type: "booking" },
  { id: "n7",  message: "🔔 Hệ thống bảo trì vào 02:00-04:00 ngày 20/04/2026. Xin lỗi vì sự bất tiện.",           read: true,  createdAt: new Date(Date.now()-432000000).toISOString(),       type: "system" },
  { id: "n8",  message: "✅ Yêu cầu hoàn tiền #rf001 đã được duyệt. Tiền sẽ về tài khoản trong 3-5 ngày.",        read: true,  createdAt: new Date(Date.now()-518400000).toISOString(),       type: "payment" },
  { id: "n9",  message: "⚡ Flash Sale! Tour Hội An giảm 40% chỉ còn 24 giờ. Đặt ngay!",                          read: true,  createdAt: new Date(Date.now()-604800000).toISOString(),       type: "promo" },
  { id: "n10", message: "🏆 Chúc mừng! Bạn đã đạt hạng Bạc với 1.200 điểm. Quyền lợi mới đang chờ bạn!",         read: true,  createdAt: new Date(Date.now()-691200000).toISOString(),       type: "system" },
];

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all",     label: "Tất cả" },
  { key: "booking", label: "Booking" },
  { key: "payment", label: "Thanh toán" },
  { key: "promo",   label: "Khuyến mãi" },
  { key: "system",  label: "Hệ thống" },
];

export default function GuestNotificationsScreen() {
  const [notifs, setNotifs] = useState<GuestNotif[]>([]);
  const [filter, setFilter] = useState("all");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const parsed = JSON.parse(raw);
        setNotifs(parsed.length > 0 ? parsed : SEED_NOTIFS);
      } else {
        setNotifs(SEED_NOTIFS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFS)).catch(() => {});
      }
    }).catch(() => setNotifs(SEED_NOTIFS));
  }, []));

  const markRead = async (id: string) => {
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const markAllRead = async () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const clearAll = async () => {
    setNotifs([]);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const filtered = notifs.filter(n => filter === "all" || n.type === filter);
  const unread   = notifs.filter(n => !n.read).length;

  return (
    <ScrollView style={st.screen} contentContainerStyle={st.content}>
      <Text style={st.title}>Thông báo</Text>
      <Text style={st.subtitle}>Cập nhật mới nhất về đặt tour và ưu đãi</Text>

      <View style={st.topRow}>
        <View style={st.topLeft}>
          {unread > 0 && <View style={st.unreadBadge}><Text style={st.unreadTxt}>{unread} chưa đọc</Text></View>}
        </View>
        <View style={st.topRight}>
          {unread > 0 && (
            <TouchableOpacity style={st.markAllBtn} onPress={markAllRead}>
              <Text style={st.markAllTxt}>Đọc hết</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearAll}><Text style={st.clearTxt}>Xóa tất cả</Text></TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[st.filterChip, filter === f.key && st.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[st.filterTxt, filter === f.key && st.filterTxtActive]}>{f.label}</Text>
            {f.key !== "all" && notifs.filter(n => n.type === f.key && !n.read).length > 0 && (
              <View style={st.filterDot} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.map(item => {
        const typeMeta = TYPE_META[item.type ?? "system"];
        return (
          <TouchableOpacity
            key={item.id}
            style={[st.item, item.read && st.itemRead]}
            onPress={() => markRead(item.id)}
          >
            <View style={[st.iconWrap, { backgroundColor: typeMeta.bg }]}>
              <Ionicons name={typeMeta.icon as any} size={18} color={typeMeta.color} />
            </View>
            <View style={st.itemBody}>
              <Text style={[st.itemText, !item.read && { fontWeight: '700', color: '#1f2a58' }]}>
                {item.message}
              </Text>
              <View style={st.itemFooter}>
                <View style={[st.typePill, { backgroundColor: typeMeta.bg }]}>
                  <Text style={[st.typePillTxt, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                </View>
                <Text style={st.itemMeta}>{item.read ? 'Đã đọc' : 'Chưa đọc'}</Text>
              </View>
            </View>
            {!item.read && <View style={st.unreadDot} />}
          </TouchableOpacity>
        );
      })}

      {filtered.length === 0 && (
        <View style={st.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#c0cbe8" />
          <Text style={st.emptyTxt}>Không có thông báo nào.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#f3f7ff' },
  content:       { padding: 18, paddingBottom: 40 },
  title:         { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle:      { color: '#7a8cc2', marginTop: 6, marginBottom: 14 },
  topRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unreadBadge:   { backgroundColor: '#edf2ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  unreadTxt:     { color: '#4f7cff', fontWeight: '700', fontSize: 12 },
  markAllBtn:    { backgroundColor: '#edf2ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  markAllTxt:    { color: '#4f7cff', fontWeight: '600', fontSize: 12 },
  clearTxt:      { color: '#dc2626', fontWeight: '600', fontSize: 12 },
  filterRow:     { gap: 8, marginBottom: 14 },
  filterChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:  { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  filterTxt:     { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  filterTxtActive:{ color: '#fff' },
  filterDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  item:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 12, marginBottom: 8 },
  itemRead:      { backgroundColor: '#f7faff', borderColor: '#eef3ff' },
  iconWrap:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemBody:      { flex: 1 },
  itemText:      { color: '#5f73a9', lineHeight: 20, marginBottom: 6 },
  itemFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill:      { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typePillTxt:   { fontSize: 10, fontWeight: '700' },
  itemMeta:      { color: '#94a3b8', fontSize: 11 },
  unreadDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f7cff', marginTop: 6 },
  empty:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt:      { color: '#7a8cc2', textAlign: 'center' },
});