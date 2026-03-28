/**
 * app/guide-schedule-management.tsx
 * Quản lý Lịch làm việc HDV - Đã FIX lỗi Array Filter và đồng bộ dữ liệu thực tế
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCHEDULE_STORAGE = "@guide_schedule";
const BOOKING_STORAGE = "@app_bookings_history";

export default function GuideScheduleManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('vi-VN'));
  
  const [personalSchedule, setPersonalSchedule] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [resSchedule, resBookings] = await Promise.all([
        AsyncStorage.getItem(SCHEDULE_STORAGE),
        AsyncStorage.getItem(BOOKING_STORAGE)
      ]);

      // FIX: Kiểm tra kỹ dữ liệu trước khi parse để tránh lỗi .filter()
      if (resSchedule) {
        const parsed = JSON.parse(resSchedule);
        setPersonalSchedule(Array.isArray(parsed) ? parsed : []);
      } else {
        setPersonalSchedule([]);
      }

      if (resBookings) {
        const parsedB = JSON.parse(resBookings);
        setBookings(Array.isArray(parsedB) ? parsedB : []);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Lỗi load dữ liệu lịch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tính toán các sự kiện trong ngày
  const dayEvents = useMemo(() => {
    // Luôn đảm bảo là mảng trước khi filter
    const safeSchedule = Array.isArray(personalSchedule) ? personalSchedule : [];
    const safeBookings = Array.isArray(bookings) ? bookings : [];

    const personal = safeSchedule.filter(i => i.date === selectedDateStr);
    const tours = safeBookings.filter(b => b.date === selectedDateStr); 
    
    return [
      ...personal.map(p => ({ ...p, isTour: false })),
      ...tours.map(t => ({ 
        ...t, 
        isTour: true, 
        title: t.tourName || "Tour hệ thống", 
        time: t.time || "Cả ngày",
        tourId: t.id 
      }))
    ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [selectedDateStr, personalSchedule, bookings]);

  const toggleLockDate = async () => {
    const safeSchedule = Array.isArray(personalSchedule) ? personalSchedule : [];
    const exists = safeSchedule.find(i => i.date === selectedDateStr && i.type === 'lock');
    let updated;
    
    if (exists) {
      updated = safeSchedule.filter(i => !(i.date === selectedDateStr && i.type === 'lock'));
    } else {
      updated = [...safeSchedule, { date: selectedDateStr, type: 'lock', title: "Khóa lịch cá nhân", time: "00:00" }];
    }
    
    setPersonalSchedule(updated);
    await AsyncStorage.setItem(SCHEDULE_STORAGE, JSON.stringify(updated));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`empty-${i}`} style={s.cell} />);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      const isToday = new Date().toLocaleDateString('vi-VN') === dateStr;
      const isSelected = selectedDateStr === dateStr;
      
      const safeSchedule = Array.isArray(personalSchedule) ? personalSchedule : [];
      const safeBookings = Array.isArray(bookings) ? bookings : [];

      const hasTour = safeBookings.some(b => b.date === dateStr);
      const isLocked = safeSchedule.some(p => p.date === dateStr && p.type === 'lock');

      cells.push(
        <TouchableOpacity key={dateStr} style={s.cell} onPress={() => setSelectedDateStr(dateStr)}>
          <View style={[s.dateBox, isSelected && s.selectedBox, isToday && s.todayBox]}>
            <Text style={[s.dateText, (isSelected || isToday) && { color: '#fff' }]}>{d}</Text>
            <View style={s.dotContainer}>
              {hasTour && <View style={[s.dot, { backgroundColor: '#4f7cff' }]} />}
              {isLocked && <View style={[s.dot, { backgroundColor: '#ef4444' }]} />}
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return cells;
  };

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4f7cff" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
            <Ionicons name="chevron-back" size={20} color="#4f7cff" />
          </TouchableOpacity>
          <Text style={s.monthTitle}>Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}</Text>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
            <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')} style={s.viewBtn}>
          <Ionicons name={viewMode === 'calendar' ? "list" : "calendar"} size={22} color="#4f7cff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
        {viewMode === 'calendar' && (
          <View style={s.calendarCard}>
            <View style={s.weekRow}>
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(w => <Text key={w} style={s.weekText}>{w}</Text>)}
            </View>
            <View style={s.grid}>{renderCalendar()}</View>
          </View>
        )}

        <View style={s.actionRow}>
           <Text style={s.selectedFullDate}>Ngày {selectedDateStr}</Text>
           <TouchableOpacity style={[s.miniBtn, { backgroundColor: '#fee2e2' }]} onPress={toggleLockDate}>
             <Ionicons name="lock-closed" size={16} color="#ef4444" />
             <Text style={{ color: '#ef4444', fontWeight: '700', marginLeft: 4 }}>Khóa/Mở</Text>
           </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Lịch trình chi tiết</Text>
        {dayEvents.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="cafe-outline" size={40} color="#cbd5e1" />
            <Text style={s.emptyTxt}>Ngày này bạn đang rảnh.</Text>
          </View>
        ) : (
          dayEvents.map((ev, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[s.eventCard, ev.isTour && s.tourCard, ev.type === 'lock' && s.lockCard]}
              onPress={() => ev.isTour && router.push(`/guide-booking-management` as any)}
            >
              <View style={s.timeCol}>
                <Text style={s.timeTxt}>{ev.time === "00:00" ? "Cả ngày" : ev.time}</Text>
                <View style={s.timeLine} />
              </View>
              <View style={s.eventMain}>
                <Text style={s.eventTitle}>{ev.title}</Text>
                {ev.isTour ? (
                  <View style={s.tourBadge}><Text style={s.tourBadgeTxt}>ĐANG NHẬN TOUR</Text></View>
                ) : (
                  <Text style={s.personalTxt}>{ev.type === 'lock' ? "Nghỉ cá nhân" : "Việc riêng"}</Text>
                )}
              </View>
              {ev.isTour && <Ionicons name="chevron-forward" size={18} color="#4f7cff" />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <GuideTabBar activeRoute="guide-schedule-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faff" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#1f2a58' },
  viewBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: "center" },
  scrollBody: { padding: 16, paddingBottom: 120 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  weekRow: { flexDirection: 'row', marginBottom: 15 },
  weekText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100/7}%`, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  dateBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedBox: { backgroundColor: '#1f2a58' },
  todayBox: { backgroundColor: '#4f7cff' },
  dateText: { fontSize: 15, fontWeight: '700', color: '#1f2a58' },
  dotContainer: { flexDirection: 'row', gap: 2, marginTop: 2, position: 'absolute', bottom: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  selectedFullDate: { fontSize: 15, fontWeight: '800', color: '#1f2a58' },
  miniBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2a58', marginBottom: 12 },
  eventCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  tourCard: { borderColor: '#4f7cff', borderLeftWidth: 5 },
  lockCard: { borderColor: '#ef4444', borderLeftWidth: 5, opacity: 0.8 },
  timeCol: { width: 60, alignItems: 'center' },
  timeTxt: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  timeLine: { width: 2, flex: 1, backgroundColor: '#f1f5f9', marginTop: 4 },
  eventMain: { flex: 1, paddingLeft: 10 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#1f2a58' },
  tourBadge: { backgroundColor: '#eaf0ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  tourBadgeTxt: { color: '#4f7cff', fontSize: 10, fontWeight: '900' },
  personalTxt: { color: '#94a8d8', fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', padding: 40, opacity: 0.5 },
  emptyTxt: { color: '#64748b', marginTop: 10, fontWeight: '600' }
});