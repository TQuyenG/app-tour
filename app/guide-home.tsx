import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 260;

type Route = '/guide-home' | '/guide-booking-management' | '/guide-schedule-management' | '/guide-earnings' | '/guide-profile';

const BOTTOM_TABS: { icon: string; label: string; route: Route }[] = [
  { icon: 'home',            label: 'Trang chủ', route: '/guide-home' },
  { icon: 'calendar',        label: 'Booking',   route: '/guide-booking-management' },
  { icon: 'time',            label: 'Lịch',      route: '/guide-schedule-management' },
  { icon: 'cash-outline',    label: 'Thu nhập',  route: '/guide-earnings' },
  { icon: 'person',          label: 'Profile',   route: '/guide-profile' },
];

const DRAWER_ITEMS = [
  { icon: 'home-outline',              label: 'Trang chủ',     route: '/guide-home' },
  { icon: 'calendar-outline',          label: 'Booking',       route: '/guide-booking-management' },
  { icon: 'map-outline',               label: 'Tour của tôi',  route: '/guide-tour-management' },
  { icon: 'time-outline',              label: 'Lịch cá nhân',  route: '/guide-schedule-management' },
  { icon: 'cash-outline',              label: 'Thu nhập',      route: '/guide-earnings' },
  { icon: 'star-outline',              label: 'Đánh giá',      route: '/guide-reviews' },
  { icon: 'notifications-outline',     label: 'Thông báo',     route: '/guide-notifications' },
  { icon: 'person-outline',            label: 'Profile',       route: '/guide-profile' },
  { icon: 'settings-outline',          label: 'Cài đặt',       route: '/settings' },
];

const QUICK_ACTIONS = [
  { icon: 'calendar-outline',      label: 'Booking mới',  route: '/guide-booking-management', color: '#2856d6', bg: '#eaf0ff' },
  { icon: 'map-outline',           label: 'Tour của tôi', route: '/guide-tour-management', color: '#16a34a', bg: '#dcfce7' },
  { icon: 'cash-outline',          label: 'Thu nhập',     route: '/guide-earnings', color: '#f59e0b', bg: '#fef9c3' },
  { icon: 'star-outline',          label: 'Đánh giá',     route: '/guide-reviews', color: '#a855f7', bg: '#f3e8ff' },
];

const RECENT_ACTIVITIES = [
  { icon: 'checkmark-circle' as const, color: '#16a34a', text: 'Tour Núi Bà Đen hoàn thành', time: '2 giờ trước' },
  { icon: 'calendar' as const,         color: '#2856d6', text: 'Booking mới từ Trần Thị B',  time: '5 giờ trước' },
  { icon: 'star' as const,             color: '#f59e0b', text: 'Nhận đánh giá 5⭐ từ khách', time: 'Hôm qua' },
  { icon: 'cash' as const,             color: '#16a34a', text: 'Thanh toán 3.600.000đ nhận được', time: '2 ngày trước' },
];

export default function GuideHome() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const stats = { rating: 4.8, experience: '5 năm', name: 'Nguyễn Văn A', totalTours: 142 };

  useEffect(() => {
    // Load pending bookings count
    AsyncStorage.getItem('@guide_bookings').then(raw => {
      if (raw) { const data = JSON.parse(raw); setPendingBookings(data.filter((b: any) => b.status === 'pending').length); }
    }).catch(() => {});
    // Load unread notifications count
    AsyncStorage.getItem('@guide_notifications').then(raw => {
      if (raw) { const data = JSON.parse(raw); setUnreadCount(data.filter((n: any) => !n.read).length); }
    }).catch(() => {});
  }, []);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={24} color="#1a2f7a" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Xin chào, {stats.name} 👋</Text>
            <Text style={styles.headTitle}>Dashboard HDV</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/guide-notifications' as any)}>
            <Ionicons name="notifications-outline" size={22} color="#2856d6" />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroSmall}>Tháng 3 · 2025</Text>
            <Text style={styles.heroTitle}>
              {pendingBookings > 0 ? `Bạn có ${pendingBookings} booking\nchờ xác nhận!` : 'Chào mừng trở lại!\nKiểm tra lịch hôm nay.'}
            </Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/guide-booking-management' as any)}>
              <Text style={styles.heroBtnText}>Xem ngay</Text>
              <Ionicons name="arrow-forward" size={14} color="#2856d6" />
            </TouchableOpacity>
          </View>
          <Ionicons name="map" size={80} color="rgba(255,255,255,0.2)" />
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: 'calendar-outline', label: 'Chờ xác nhận', value: pendingBookings, color: '#2856d6', bg: '#eef2ff', route: '/guide-booking-management' },
            { icon: 'time-outline',     label: 'Sự kiện hôm nay', value: 2,             color: '#16a34a', bg: '#f0fdf4', route: '/guide-schedule-management' },
            { icon: 'cash-outline',     label: 'Thu nhập (tr)',    value: '5.4',         color: '#f59e0b', bg: '#fffbeb', route: '/guide-earnings' },
            { icon: 'compass-outline',  label: 'Tours xong',       value: stats.totalTours, color: '#a855f7', bg: '#fdf4ff', route: '/guide-reviews' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.statCard, { backgroundColor: item.bg }]} onPress={() => router.push(item.route as any)}>
              <View style={[styles.statIconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={18} color="#fff" />
              </View>
              <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info row */}
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}><Ionicons name="briefcase-outline" size={20} color="#2856d6" /></View>
            <View><Text style={styles.infoCardLabel}>Kinh nghiệm</Text><Text style={styles.infoCardValue}>{stats.experience}</Text></View>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: '#fff8e1' }]}><Ionicons name="star" size={20} color="#f59e0b" /></View>
            <View><Text style={styles.infoCardLabel}>Đánh giá</Text><Text style={styles.infoCardValue}>{stats.rating} / 5.0</Text></View>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((qa, i) => (
            <TouchableOpacity key={i} style={[styles.quickCard, { backgroundColor: qa.bg }]} onPress={() => router.push(qa.route as any)}>
              <Ionicons name={qa.icon as any} size={22} color={qa.color} />
              <Text style={[styles.quickLabel, { color: qa.color }]}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
        <View style={styles.activityCard}>
          {RECENT_ACTIVITIES.map((a, i) => (
            <View key={i} style={[styles.activityRow, i < RECENT_ACTIVITIES.length - 1 && styles.activityBorder]}>
              <View style={[styles.activityDot, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={16} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{a.text}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {BOTTOM_TABS.map((tab, i) => {
          const active = activeTab === i;
          return (
            <TouchableOpacity key={i} style={styles.tabItem} activeOpacity={0.75}
              onPress={() => { setActiveTab(i); if (i !== 0) router.push(tab.route); }}>
              <View style={[styles.tabIconWrap, active && styles.tabIconActive]}>
                <Ionicons name={tab.icon as any} size={20} color={active ? '#fff' : '#94a8d8'} />
                {i === 1 && pendingBookings > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeTxt}>{pendingBookings}</Text></View>}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}><Ionicons name="person" size={30} color="#fff" /></View>
          <Text style={styles.drawerName}>{stats.name}</Text>
          <View style={styles.drawerBadge}><Text style={styles.drawerBadgeText}>HDV Đã xác minh</Text></View>
        </View>
        <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>
          {DRAWER_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.drawerItem, i === 0 && styles.drawerItemActive]}
              onPress={() => { closeDrawer(); if (i !== 0) router.push(item.route as any); }} activeOpacity={0.75}>
              <View style={[styles.drawerItemIcon, i === 0 && styles.drawerItemIconActive]}>
                <Ionicons name={item.icon as any} size={18} color={i === 0 ? '#fff' : '#4f7cff'} />
              </View>
              <Text style={[styles.drawerItemLabel, i === 0 && styles.drawerItemLabelActive]}>{item.label}</Text>
              {i === 5 && unreadCount > 0 && <View style={styles.drawerBadgeCount}><Text style={styles.drawerBadgeCountTxt}>{unreadCount}</Text></View>}
              {i === 0 && <View style={styles.drawerActivePill} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.drawerLogout} onPress={() => router.push('/login' as any)}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.drawerLogoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f4ff' },
  main: { flex: 1 },
  mainContent: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  menuBtn: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  headerCenter: { flex: 1 },
  greeting: { color: '#7a8cc2', fontSize: 12, fontWeight: '500' },
  headTitle: { color: '#1a2f7a', fontSize: 20, fontWeight: '800', marginTop: 1 },
  notifBtn: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  notifDot: { width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, position: 'absolute', top: 9, right: 9, borderWidth: 1.5, borderColor: '#fff' },
  heroBanner: { backgroundColor: '#2856d6', borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, shadowColor: '#2856d6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8, overflow: 'hidden' },
  heroTextCol: { flex: 1 },
  heroSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 16, alignSelf: 'flex-start' },
  heroBtnText: { color: '#2856d6', fontWeight: '700', fontSize: 13 },
  sectionTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { borderRadius: 20, padding: 16, alignItems: 'center', width: '47%', shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  statIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: '#7a8cc2', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  infoCards: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  infoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  infoIconWrap: { width: 40, height: 40, backgroundColor: '#eef2ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoCardLabel: { color: '#7a8cc2', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoCardValue: { color: '#1a2f7a', fontSize: 15, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  quickCard: { borderRadius: 16, padding: 16, alignItems: 'center', width: '47%', gap: 8, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  quickLabel: { fontSize: 13, fontWeight: '700' },
  activityCard: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 4, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  activityDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#1a2f7a', fontWeight: '600', fontSize: 13 },
  activityTime: { color: '#7a8cc2', fontSize: 11, marginTop: 2 },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#1a2f7a', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 16 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: '#2856d6' },
  tabLabel: { color: '#94a8d8', fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: '#2856d6' },
  tabBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#1a2f7a', zIndex: 20, borderTopRightRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 24, paddingBottom: 32 },
  drawerHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginBottom: 8 },
  drawerAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#2856d6', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 12 },
  drawerName: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 6 },
  drawerBadge: { backgroundColor: '#4f7cff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3 },
  drawerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  drawerNav: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 16, marginBottom: 4 },
  drawerItemActive: { backgroundColor: 'rgba(79,124,255,0.18)' },
  drawerItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(79,124,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  drawerItemIconActive: { backgroundColor: '#4f7cff' },
  drawerItemLabel: { color: '#94a8d8', fontWeight: '600', fontSize: 14, flex: 1 },
  drawerItemLabelActive: { color: '#fff' },
  drawerActivePill: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4f7cff' },
  drawerBadgeCount: { backgroundColor: '#ef4444', borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  drawerBadgeCountTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  drawerLogout: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)' },
  drawerLogoutText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});