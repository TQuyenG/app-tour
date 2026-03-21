import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

// Dùng chung key @app_tours với guest home để đồng bộ real-time
const STORAGE_KEY = '@app_tours';

type TourStatus = 'active' | 'full' | 'draft';
interface Tour {
  id: string; name: string; category: string; duration: string;
  price: string; priceRaw: number; rating: number; seats: number; seatsLeft: number;
  departure: string; status: TourStatus; description: string;
  tags: string[]; color: string; date: string;
}

const COLORS = ['#99bbff','#93d5ff','#b5f0c0','#ffd6a5','#d0b3ff'];

const SEED: Tour[] = [
  { id: '1', name: 'Khám phá Đà Lạt mộng mơ', category: 'Cao nguyên', duration: '3 ngày 2 đêm', price: '2.800.000đ', priceRaw: 2800000, rating: 4.8, seats: 12, seatsLeft: 4, departure: 'TP. HCM', status: 'active', description: 'Tour ngắm cảnh cao nguyên, thác nước, vườn hoa.', tags: ['cao nguyên', 'thiên nhiên'], color: '#99bbff', date: '22/04/2025' },
  { id: '2', name: 'Tour biển Phú Quốc 4N3Đ', category: 'Biển đảo', duration: '4 ngày 3 đêm', price: '4.500.000đ', priceRaw: 4500000, rating: 4.9, seats: 20, seatsLeft: 7, departure: 'Hà Nội', status: 'active', description: 'Nghỉ dưỡng biển đảo, lặn san hô, ẩm thực hải sản.', tags: ['biển', 'nghỉ dưỡng'], color: '#93d5ff', date: '25/04/2025' },
  { id: '3', name: 'Hành trình Hội An cổ kính', category: 'Di sản', duration: '2 ngày 1 đêm', price: '1.900.000đ', priceRaw: 1900000, rating: 4.7, seats: 15, seatsLeft: 0, departure: 'Đà Nẵng', status: 'full', description: 'Khám phá phố cổ, đèn lồng, ẩm thực miền Trung.', tags: ['di sản', 'văn hóa'], color: '#b5f0c0', date: '01/05/2025' },
  { id: '4', name: 'Sapa trekking mùa lúa vàng', category: 'Núi rừng', duration: '3 ngày 2 đêm', price: '3.200.000đ', priceRaw: 3200000, rating: 4.6, seats: 10, seatsLeft: 3, departure: 'Hà Nội', status: 'active', description: 'Trekking ruộng bậc thang, thăm bản làng dân tộc.', tags: ['trekking', 'núi rừng'], color: '#ffd6a5', date: '10/05/2025' },
  { id: '5', name: 'Hạ Long bay cruise 2N1Đ', category: 'Biển đảo', duration: '2 ngày 1 đêm', price: '3.600.000đ', priceRaw: 3600000, rating: 4.8, seats: 18, seatsLeft: 9, departure: 'Hà Nội', status: 'draft', description: 'Du thuyền vịnh Hạ Long, hang động, kayak.', tags: ['vịnh', 'du thuyền'], color: '#d0b3ff', date: '15/05/2025' },
];

const CATEGORIES = ['Biển đảo', 'Cao nguyên', 'Di sản', 'Núi rừng', 'Thành phố'];
const STATUS_OPTIONS: TourStatus[] = ['active', 'full', 'draft'];
const STATUS_MAP = {
  active: { label: 'Đang mở', color: '#16a34a', bg: '#dcfce7' },
  full:   { label: 'Hết chỗ', color: '#dc2626', bg: '#fee2e2' },
  draft:  { label: 'Nháp',    color: '#d97706', bg: '#fef9c3' },
};
const EMPTY: Omit<Tour, 'id'> = { name: '', category: 'Biển đảo', duration: '', price: '', priceRaw: 0, rating: 5, seats: 10, seatsLeft: 10, departure: '', status: 'draft', description: '', tags: [], color: '#99bbff', date: '' };

export default function AdminTourManagement() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('Tất cả');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [form, setForm] = useState<Omit<Tour, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) { setTours(JSON.parse(raw)); }
      else { setTours(SEED); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); }
    }).catch(() => setTours(SEED));
  }, []);

  const persist = useCallback(async (data: Tour[]) => {
    setTours(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalVisible(true); };
  const openEdit = (t: Tour) => {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      duration: t.duration,
      price: t.price,
      priceRaw: t.priceRaw,
      rating: t.rating,
      seats: t.seats,
      seatsLeft: t.seatsLeft,
      departure: t.departure,
      status: t.status,
      description: t.description,
      tags: t.tags,
      color: t.color,
      date: t.date,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim() || !form.departure.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền Tên tour, Giá và Điểm xuất phát.'); return;
    }
    setSaving(true);
    const rawNum = Number(form.price.replace(/\./g, '').replace('đ', '').trim()) || 0;
    const priceFormatted = rawNum > 0 ? `${rawNum.toLocaleString('vi-VN')}đ` : form.price;
    const colorIdx = tours.length % COLORS.length;
    const fullForm: Omit<Tour, 'id'> = {
      ...form,
      priceRaw: rawNum,
      price: priceFormatted,
      color: form.color || COLORS[colorIdx],
      tags: form.tags?.length > 0 ? form.tags : [form.category.toLowerCase()],
      date: form.date || '',
    };
    const updated = editing
      ? tours.map(t => t.id === editing.id ? { ...fullForm, id: editing.id } : t)
      : [...tours, { ...fullForm, id: Date.now().toString() }];
    await persist(updated);
    setSaving(false); setModalVisible(false);
  };

  const handleDelete = (t: Tour) => Alert.alert('Xóa tour', `Bạn có chắc muốn xóa "${t.name}"?\nHành động này không thể hoàn tác.`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => persist(tours.filter(x => x.id !== t.id)) },
  ]);

  const f = (k: keyof Omit<Tour, 'id'>, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const filtered = tours.filter(t => {
    const matchCat = selCat === 'Tất cả' || t.category === selCat;
    const matchSearch = !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()) || t.departure.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Tour</Text>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#4f7cff' }]} onPress={openAdd}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[{ l: 'Tổng', v: tours.length, c: '#1f2a58' }, { l: 'Đang mở', v: tours.filter(t => t.status === 'active').length, c: '#16a34a' }, { l: 'Hết chỗ', v: tours.filter(t => t.status === 'full').length, c: '#dc2626' }, { l: 'Nháp', v: tours.filter(t => t.status === 'draft').length, c: '#d97706' }].map((item, i, arr) => (
          <View key={item.l} style={[s.statItem, i < arr.length - 1 && s.statBorder]}>
            <Text style={[s.statNum, { color: item.c }]}>{item.v}</Text>
            <Text style={s.statLbl}>{item.l}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput style={s.searchInput} placeholder="Tìm tour, điểm xuất phát..." value={search} onChangeText={setSearch} placeholderTextColor="#8ea0d6" />
        {!!search && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#8ea0d6" /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {['Tất cả', ...CATEGORIES].map(c => (
          <TouchableOpacity key={c} style={[s.catChip, selCat === c && s.catActive]} onPress={() => setSelCat(c)}>
            <Text style={[s.catText, selCat === c && s.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.resultText}>{filtered.length} tour</Text>

      <ScrollView contentContainerStyle={s.list}>
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="map-search-outline" size={56} color="#c0cbe8" />
            <Text style={s.emptyText}>Không tìm thấy tour nào</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}><Text style={s.emptyBtnText}>+ Thêm tour mới</Text></TouchableOpacity>
          </View>
        )}
        {filtered.map(tour => {
          const st = STATUS_MAP[tour.status];
          const isOpen = expandedId === tour.id;
          return (
            <TouchableOpacity key={tour.id} style={s.card} activeOpacity={0.85} onPress={() => setExpandedId(isOpen ? null : tour.id)}>
              <View style={s.cardImg}><MaterialCommunityIcons name="image-outline" size={26} color="#9cb9ff" /></View>
              <View style={s.cardBody}>
                <View style={s.cardTopRow}>
                  <Text style={s.tourName} numberOfLines={1}>{tour.name}</Text>
                  <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text></View>
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={12} color="#8ea0d6" /><Text style={s.metaText}>{tour.departure}</Text>
                  <Ionicons name="time-outline" size={12} color="#8ea0d6" style={{ marginLeft: 6 }} /><Text style={s.metaText}>{tour.duration}</Text>
                </View>
                <View style={s.cardBottom}>
                  <Text style={s.price}>{Number(tour.price).toLocaleString('vi-VN')}đ</Text>
                  <View style={s.ratingRow}><Ionicons name="star" size={12} color="#f59e0b" /><Text style={s.ratingText}>{tour.rating}</Text><Text style={s.seatsText}>· {tour.seatsLeft}/{tour.seats} chỗ</Text></View>
                </View>
                {isOpen && (
                  <View style={s.expandSection}>
                    {!!tour.description && <Text style={s.descText}>{tour.description}</Text>}
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.btnEdit} onPress={() => { setExpandedId(null); openEdit(tour); }}>
                        <Ionicons name="create-outline" size={14} color="#4f7cff" /><Text style={s.btnEditTxt}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnDel} onPress={() => handleDelete(tour)}>
                        <Ionicons name="trash-outline" size={14} color="#dc2626" /><Text style={s.btnDelTxt}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── MODAL FORM ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Chỉnh sửa tour' : 'Thêm tour mới'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <FL t="Tên tour *" /><TextInput style={s.input} value={form.name} onChangeText={v => f('name', v)} placeholder="VD: Tour Đà Nẵng 3N2Đ" placeholderTextColor="#b0bdd8" />
              <FL t="Điểm xuất phát *" /><TextInput style={s.input} value={form.departure} onChangeText={v => f('departure', v)} placeholder="VD: TP. HCM" placeholderTextColor="#b0bdd8" />
              <FL t="Giá (VNĐ) *" /><TextInput style={s.input} value={form.price} onChangeText={v => f('price', v)} placeholder="VD: 2800000" keyboardType="numeric" placeholderTextColor="#b0bdd8" />
              <FL t="Thời gian" /><TextInput style={s.input} value={form.duration} onChangeText={v => f('duration', v)} placeholder="VD: 3 ngày 2 đêm" placeholderTextColor="#b0bdd8" />

              <FL t="Danh mục" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionRow}>
                {CATEGORIES.map(c => <TouchableOpacity key={c} style={[s.chip, form.category === c && s.chipActive]} onPress={() => f('category', c)}><Text style={[s.chipTxt, form.category === c && s.chipTxtActive]}>{c}</Text></TouchableOpacity>)}
              </ScrollView>

              <FL t="Trạng thái" />
              <View style={s.optionRow}>
                {STATUS_OPTIONS.map(st => { const info = STATUS_MAP[st]; return <TouchableOpacity key={st} style={[s.statusOpt, form.status === st && { backgroundColor: info.bg, borderColor: info.color }]} onPress={() => f('status', st)}><Text style={[s.statusOptTxt, form.status === st && { color: info.color }]}>{info.label}</Text></TouchableOpacity>; })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><FL t="Tổng chỗ" /><TextInput style={s.input} value={String(form.seats)} onChangeText={v => f('seats', Number(v) || 0)} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><FL t="Chỗ còn" /><TextInput style={s.input} value={String(form.seatsLeft)} onChangeText={v => f('seatsLeft', Number(v) || 0)} keyboardType="numeric" /></View>
              </View>

              <FL t="Mô tả ngắn" /><TextInput style={[s.input, { minHeight: 80, paddingTop: 12 }]} value={form.description} onChangeText={v => f('description', v)} placeholder="Mô tả điểm nổi bật..." multiline numberOfLines={3} placeholderTextColor="#b0bdd8" textAlignVertical="top" />

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Ionicons name={editing ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm tour'}</Text>
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
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1f2a58' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: '#e4ebff' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#7a8cc2', marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dfe7ff', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#1f2a58', fontSize: 14 },
  catRow: { gap: 8, paddingHorizontal: 14, marginBottom: 8 },
  catChip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7 },
  catActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  catText: { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  catTextActive: { color: '#fff' },
  resultText: { color: '#7a8cc2', fontSize: 12, paddingHorizontal: 14, marginBottom: 6 },
  list: { paddingHorizontal: 14 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#7a8cc2', fontSize: 15, fontWeight: '600' },
  emptyBtn: { marginTop: 8, backgroundColor: '#4f7cff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 12, marginBottom: 10, gap: 12 },
  cardImg: { width: 78, height: 78, borderRadius: 12, backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  tourName: { color: '#1f2a58', fontWeight: '700', fontSize: 14, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 3 },
  metaText: { color: '#7a8cc2', fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { color: '#4f7cff', fontWeight: '700', fontSize: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#7a8cc2', fontSize: 12, fontWeight: '600' },
  seatsText: { color: '#7a8cc2', fontSize: 12 },
  expandSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f4ff' },
  descText: { color: '#5f73a9', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  btnEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#eaf0ff' },
  btnEditTxt: { fontSize: 12, fontWeight: '700', color: '#4f7cff' },
  btnDel: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fee2e2' },
  btnDelTxt: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,18,50,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: '#e4ebff', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1f2a58' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  formLabel: { color: '#1f2a58', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#f3f7ff', borderRadius: 12, borderWidth: 1, borderColor: '#e4ebff', paddingHorizontal: 14, paddingVertical: 11, color: '#1f2a58', fontSize: 14 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#dfe7ff', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
  chipTxt: { color: '#6c7fb7', fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
  statusOpt: { borderRadius: 10, borderWidth: 1.5, borderColor: '#dfe7ff', paddingHorizontal: 14, paddingVertical: 8 },
  statusOptTxt: { color: '#7a8cc2', fontSize: 13, fontWeight: '700' },
  saveBtn: { marginTop: 20, backgroundColor: '#4f7cff', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});