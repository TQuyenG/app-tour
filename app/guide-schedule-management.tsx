import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

const STORAGE_KEY = '@guide_schedule';
type DayStatus = 'available' | 'busy' | 'booked';
interface ScheduleDay { date: string; status: DayStatus; label: string; }
interface ScheduleEvent { id: string; date: string; title: string; time: string; type: 'tour' | 'block' | 'personal'; note: string; }

// Generate days for current month
function genDays(): ScheduleDay[] {
  const today = new Date();
  const year = today.getFullYear(); const month = today.getMonth();
  const days: ScheduleDay[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const dateStr = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    days.push({ date: dateStr, status: 'available', label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dt.getDay()] });
  }
  return days;
}

const SEED_EVENTS: ScheduleEvent[] = [
  { id: '1', date: '20/03/2025', title: 'Tour Núi Bà Đen', time: '07:00', type: 'tour', note: '4 khách, xe đón tại Bến xe Miền Đông.' },
  { id: '2', date: '22/03/2025', title: 'Tour Đà Lạt 2N1Đ', time: '06:00', type: 'tour', note: '2 khách, nghỉ tại khách sạn Đà Lạt Palace.' },
  { id: '3', date: '25/03/2025', title: 'Khám sức khỏe định kỳ', time: '09:00', type: 'personal', note: 'Bệnh viện Chợ Rẫy.' },
  { id: '4', date: '28/03/2025', title: 'Ngày nghỉ gia đình', time: 'Cả ngày', type: 'block', note: '' },
];

const DAY_STATUS_MAP: Record<DayStatus, { color: string; bg: string; label: string }> = {
  available: { color: '#16a34a', bg: '#dcfce7', label: 'Rảnh' },
  busy:      { color: '#d97706', bg: '#fef9c3', label: 'Bận' },
  booked:    { color: '#2856d6', bg: '#eaf0ff', label: 'Có tour' },
};
const EVENT_TYPE_MAP = {
  tour:     { color: '#2856d6', bg: '#eaf0ff', icon: 'map-outline' as const, label: 'Tour' },
  block:    { color: '#d97706', bg: '#fef9c3', icon: 'ban-outline' as const, label: 'Chặn lịch' },
  personal: { color: '#a855f7', bg: '#f3e8ff', icon: 'person-outline' as const, label: 'Cá nhân' },
};
const EMPTY_EVENT: Omit<ScheduleEvent, 'id'> = { date: '', title: '', time: '', type: 'block', note: '' };

export default function GuideScheduleManagement() {
  const router = useRouter();
  const [days, setDays] = useState<ScheduleDay[]>(genDays());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [form, setForm] = useState<Omit<ScheduleEvent, 'id'>>(EMPTY_EVENT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) { const d = JSON.parse(raw); setDays(d.days || genDays()); setEvents(d.events || SEED_EVENTS); }
      else { setEvents(SEED_EVENTS); persist(genDays(), SEED_EVENTS); }
    }).catch(() => setEvents(SEED_EVENTS));
  }, []);

  const persist = useCallback(async (d: ScheduleDay[], e: ScheduleEvent[]) => {
    setDays(d); setEvents(e);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ days: d, events: e })).catch(() => {});
  }, []);

  const toggleDayStatus = (date: string) => {
    const order: DayStatus[] = ['available', 'busy', 'booked'];
    const updated = days.map(d => {
      if (d.date !== date) return d;
      const next = order[(order.indexOf(d.status) + 1) % order.length];
      return { ...d, status: next };
    });
    persist(updated, events);
  };

  const openAddEvent = (date?: string) => {
    setEditingEvent(null);
    setForm({ ...EMPTY_EVENT, date: date || '' });
    setModalVisible(true);
  };
  const openEditEvent = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    setForm({ date: ev.date, title: ev.title, time: ev.time, type: ev.type, note: ev.note });
    setModalVisible(true);
  };
  const handleSave = () => {
    if (!form.title.trim() || !form.date.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng điền Tiêu đề và Ngày.'); return; }
    const updated = editingEvent
      ? events.map(e => e.id === editingEvent.id ? { ...form, id: editingEvent.id } : e)
      : [...events, { ...form, id: Date.now().toString() }];
    persist(days, updated); setModalVisible(false);
  };
  const handleDeleteEvent = (ev: ScheduleEvent) => Alert.alert('Xóa sự kiện', `Xóa "${ev.title}"?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => persist(days, events.filter(e => e.id !== ev.id)) },
  ]);

  const f = (k: keyof Omit<ScheduleEvent, 'id'>, v: string) => setForm(p => ({ ...p, [k]: v }));

  const today = new Date();
  const monthLabel = `Tháng ${today.getMonth() + 1} / ${today.getFullYear()}`;
  const selectedEvents = events.filter(e => e.date === selectedDate);

  // Week rows for calendar
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const calendarCells: (ScheduleDay | null)[] = [...Array(firstDay).fill(null), ...days];

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1a2f7a" /></TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Lịch</Text>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#2856d6' }]} onPress={() => openAddEvent(selectedDate || undefined)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Legend */}
        <View style={s.legendRow}>
          {Object.entries(DAY_STATUS_MAP).map(([k, v]) => (
            <View key={k} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: v.color }]} />
              <Text style={s.legendTxt}>{v.label}</Text>
            </View>
          ))}
          <Text style={s.legendHint}>Nhấn ngày để thay đổi</Text>
        </View>

        {/* Calendar */}
        <View style={s.calendarCard}>
          <Text style={s.calendarMonth}>{monthLabel}</Text>
          <View style={s.weekHeader}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <Text key={d} style={s.weekDay}>{d}</Text>)}
          </View>
          <View style={s.calendarGrid}>
            {calendarCells.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={s.calCell} />;
              const st = DAY_STATUS_MAP[day.status];
              const isSelected = day.date === selectedDate;
              const dayNum = day.date.split('/')[0];
              const hasEvents = events.some(e => e.date === day.date);
              return (
                <TouchableOpacity key={day.date} style={[s.calCell, isSelected && s.calCellSelected]} onPress={() => { setSelectedDate(day.date); }}
                  onLongPress={() => toggleDayStatus(day.date)}>
                  <View style={[s.calDot, { backgroundColor: st.bg, borderColor: isSelected ? st.color : 'transparent', borderWidth: 2 }]}>
                    <Text style={[s.calDayNum, { color: isSelected ? st.color : '#1a2f7a' }]}>{dayNum}</Text>
                  </View>
                  {hasEvents && <View style={[s.eventIndicator, { backgroundColor: st.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={s.hintTxt}>💡 Nhấn giữ ngày để thay đổi trạng thái rảnh / bận / có tour</Text>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {[
            { label: 'Ngày rảnh', val: days.filter(d => d.status === 'available').length, color: '#16a34a' },
            { label: 'Ngày bận', val: days.filter(d => d.status === 'busy').length, color: '#d97706' },
            { label: 'Có tour', val: days.filter(d => d.status === 'booked').length, color: '#2856d6' },
            { label: 'Sự kiện', val: events.length, color: '#a855f7' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[s.stripItem, i < arr.length - 1 && s.stripBorder]}>
              <Text style={[s.stripNum, { color: item.color }]}>{item.val}</Text>
              <Text style={s.stripLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day events */}
        {selectedDate && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>📅 {selectedDate}</Text>
              <TouchableOpacity style={s.addEventBtn} onPress={() => openAddEvent(selectedDate)}>
                <Ionicons name="add" size={14} color="#2856d6" /><Text style={s.addEventTxt}>Thêm</Text>
              </TouchableOpacity>
            </View>
            {selectedEvents.length === 0 && <Text style={s.noEventTxt}>Không có sự kiện nào. Nhấn + để thêm.</Text>}
            {selectedEvents.map(ev => {
              const tp = EVENT_TYPE_MAP[ev.type];
              return (
                <View key={ev.id} style={[s.eventCard, { borderLeftColor: tp.color }]}>
                  <View style={[s.eventTypeDot, { backgroundColor: tp.bg }]}><Ionicons name={tp.icon} size={14} color={tp.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.eventTitle}>{ev.title}</Text>
                    <View style={s.eventMeta}><Ionicons name="time-outline" size={11} color="#8ea0d6" /><Text style={s.eventMetaTxt}>{ev.time}</Text></View>
                    {!!ev.note && <Text style={s.eventNote}>{ev.note}</Text>}
                  </View>
                  <View style={s.eventActions}>
                    <TouchableOpacity onPress={() => openEditEvent(ev)} style={s.evActBtn}><Ionicons name="create-outline" size={16} color="#4f7cff" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEvent(ev)} style={s.evActBtn}><Ionicons name="trash-outline" size={16} color="#dc2626" /></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* All upcoming events */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sự kiện sắp tới</Text>
          {events.slice(0, 5).map(ev => {
            const tp = EVENT_TYPE_MAP[ev.type];
            return (
              <View key={ev.id} style={[s.eventCard, { borderLeftColor: tp.color }]}>
                <View style={[s.eventTypeDot, { backgroundColor: tp.bg }]}><Ionicons name={tp.icon} size={14} color={tp.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{ev.title}</Text>
                  <View style={s.eventMeta}>
                    <Ionicons name="calendar-outline" size={11} color="#8ea0d6" /><Text style={s.eventMetaTxt}>{ev.date}</Text>
                    <Text style={s.dot}>·</Text>
                    <Ionicons name="time-outline" size={11} color="#8ea0d6" /><Text style={s.eventMetaTxt}>{ev.time}</Text>
                  </View>
                  {!!ev.note && <Text style={s.eventNote}>{ev.note}</Text>}
                </View>
                <View style={[s.badge, { backgroundColor: tp.bg }]}><Text style={[s.badgeTxt, { color: tp.color }]}>{tp.label}</Text></View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.mbackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={s.sheet}>
            <View style={s.shandle} />
            <View style={s.mheader}>
              <Text style={s.mtitle}>{editingEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.mbody} keyboardShouldPersistTaps="handled">
              <FL t="Tiêu đề *" /><TextInput style={s.input} value={form.title} onChangeText={v => f('title', v)} placeholder="VD: Tour Đà Lạt" placeholderTextColor="#b0bdd8" />
              <FL t="Ngày (dd/mm/yyyy) *" /><TextInput style={s.input} value={form.date} onChangeText={v => f('date', v)} placeholder="VD: 20/03/2025" placeholderTextColor="#b0bdd8" />
              <FL t="Giờ" /><TextInput style={s.input} value={form.time} onChangeText={v => f('time', v)} placeholder="VD: 07:00" placeholderTextColor="#b0bdd8" />
              <FL t="Loại" />
              <View style={s.optionRow}>
                {(Object.keys(EVENT_TYPE_MAP) as Array<keyof typeof EVENT_TYPE_MAP>).map(k => {
                  const tp = EVENT_TYPE_MAP[k];
                  return <TouchableOpacity key={k} style={[s.typeChip, form.type === k && { backgroundColor: tp.bg, borderColor: tp.color }]} onPress={() => f('type', k)}>
                    <Ionicons name={tp.icon} size={13} color={form.type === k ? tp.color : '#7a8cc2'} /><Text style={[s.typeChipTxt, form.type === k && { color: tp.color }]}>{tp.label}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              <FL t="Ghi chú" /><TextInput style={[s.input, { minHeight: 80, paddingTop: 12 }]} value={form.note} onChangeText={v => f('note', v)} placeholder="Chi tiết thêm..." multiline placeholderTextColor="#b0bdd8" textAlignVertical="top" />
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Ionicons name={editingEvent ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>{editingEvent ? 'Lưu thay đổi' : 'Thêm sự kiện'}</Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const FL = ({ t }: { t: string }) => <Text style={s.formLabel}>{t}</Text>;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a2f7a' },
  content: { padding: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: '#5f73a9', fontSize: 11, fontWeight: '600' },
  legendHint: { color: '#b0bdd8', fontSize: 10, marginLeft: 4 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  calendarMonth: { color: '#1a2f7a', fontWeight: '800', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', color: '#94a8d8', fontSize: 11, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calCellSelected: {},
  calDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calDayNum: { fontSize: 13, fontWeight: '700' },
  eventIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  hintTxt: { color: '#94a8d8', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 16, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  stripItem: { flex: 1, alignItems: 'center' },
  stripBorder: { borderRightWidth: 1, borderRightColor: '#e4ebff' },
  stripNum: { fontSize: 18, fontWeight: '800' },
  stripLbl: { fontSize: 10, color: '#7a8cc2', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 15 },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eaf0ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addEventTxt: { color: '#2856d6', fontWeight: '700', fontSize: 12 },
  noEventTxt: { color: '#7a8cc2', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderLeftWidth: 4, shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  eventTypeDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: '#1a2f7a', fontWeight: '700', fontSize: 13, marginBottom: 3 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaTxt: { color: '#7a8cc2', fontSize: 11 },
  eventNote: { color: '#5f73a9', fontSize: 11, marginTop: 4, lineHeight: 16 },
  eventActions: { flexDirection: 'row', gap: 4 },
  evActBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  dot: { color: '#c0cbe8' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  mbackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  shandle: { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  mheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  mtitle: { fontSize: 17, fontWeight: '800', color: '#1a2f7a' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0f4ff', alignItems: 'center', justifyContent: 'center' },
  mbody: { paddingHorizontal: 20, paddingTop: 8 },
  formLabel: { color: '#1a2f7a', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f0f4ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1a2f7a', fontSize: 14 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, borderColor: '#dfe7ff', paddingHorizontal: 12, paddingVertical: 8 },
  typeChipTxt: { color: '#7a8cc2', fontSize: 13, fontWeight: '700' },
  saveBtn: { marginTop: 20, backgroundColor: '#2856d6', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});