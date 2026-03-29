/**
 * app/admin-voucher-management.tsx
 * Admin quản lý Voucher - Hiển thị Trực quan Lượt dùng / Giới hạn
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_vouchers_advanced";

type VoucherType = "percent" | "fixed";
type VoucherGroup = "discount" | "loyalty"; 
type VoucherStatus = "active" | "hidden";

interface Voucher {
  id: string; code: string; title: string; description: string;
  type: VoucherType; discountValue: number; maxDiscount: number; 
  minOrderValue: number; 
  usageLimit: number; // Tổng số lượng phát hành
  usedCount: number;  // SỐ LƯỢT ĐÃ SỬ DỤNG
  userLimit: number;  
  isGiftAll: boolean; 
  pointsCost?: number; 
  startDate: string; endDate: string; group: VoucherGroup;
  status: VoucherStatus; color: string;
}

const DEFAULT_FORM: Partial<Voucher> = {
  code: "", title: "", description: "", type: "percent",
  discountValue: 0, maxDiscount: 0, minOrderValue: 0, 
  usageLimit: 100, usedCount: 0, userLimit: 1, isGiftAll: false,
  pointsCost: 500, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000*30).toISOString(),
  group: "discount", status: "active", color: "#4f7cff"
};

export default function AdminVoucherManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Partial<Voucher>>(DEFAULT_FORM);

  useFocusEffect(useCallback(() => {
    const loadVouchers = async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setVouchers(JSON.parse(raw));
    };
    loadVouchers();
  }, []));

  const saveVouchers = async (data: Voucher[]) => {
    setVouchers(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleSaveVoucher = () => {
    if (!form.code || !form.title) return;
    const newVoucher = { ...form, id: form.id || `v_${Date.now()}`, usedCount: form.usedCount || 0 } as Voucher;
    const isEdit = vouchers.some(v => v.id === newVoucher.id);
    
    if (isEdit) saveVouchers(vouchers.map(v => v.id === newVoucher.id ? newVoucher : v));
    else saveVouchers([newVoucher, ...vouchers]);
    
    setModalVisible(false);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.title}>Kho Voucher & Quà Tặng</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(DEFAULT_FORM); setModalVisible(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnTxt}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vouchers}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isFull = item.usedCount >= item.usageLimit;
          return (
          <TouchableOpacity style={s.card} onPress={() => { setForm(item); setModalVisible(true); }}>
            <View style={[s.cardLeft, { backgroundColor: item.color }]}>
              <Ionicons name={item.group === 'loyalty' ? "gift" : "ticket"} size={28} color="#fff" />
              <Text style={s.cardTypeTxt}>{item.group === 'loyalty' ? 'Đổi điểm' : 'Giảm giá'}</Text>
            </View>
            <View style={s.cardRight}>
              <View style={s.cardHeader}>
                <Text style={s.codeTxt}>{item.code}</Text>
                <View style={[s.statusBadge, { backgroundColor: item.status === 'active' ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[s.statusTxt, { color: item.status === 'active' ? '#10b981' : '#ef4444' }]}>{item.status === 'active' ? 'Đang chạy' : 'Đã ẩn'}</Text>
                </View>
              </View>
              <Text style={s.titleTxt}>{item.title}</Text>
              
              {/* HIỂN THỊ SỐ LƯỢT ĐÃ DÙNG */}
              <View style={[s.usageProgress, { borderColor: isFull ? '#fecaca' : '#e2e8f0', backgroundColor: isFull ? '#fef2f2' : '#f8fafc' }]}>
                 <Text style={{fontSize: 11, color: isFull ? '#ef4444' : '#64748b', fontWeight: 'bold'}}>
                   <Ionicons name="pie-chart"/> Đã dùng: {item.usedCount} / {item.usageLimit}
                 </Text>
                 {isFull && <Text style={{fontSize: 10, color: '#ef4444', fontWeight: 'bold'}}>HẾT LƯỢT</Text>}
              </View>
              
              <View style={{flexDirection: 'row', gap: 10, marginTop: 8}}>
                 {item.group === 'loyalty' && <Text style={{color: '#f59e0b', fontWeight: 'bold', fontSize: 11}}>• {item.pointsCost} điểm</Text>}
                 <Text style={{fontSize: 11, color: '#64748b'}}>• Tối đa: {item.userLimit} lần/user</Text>
                 {item.isGiftAll && <Text style={{fontSize: 11, color: '#10b981', fontWeight: 'bold'}}>• Gift All</Text>}
              </View>
            </View>
          </TouchableOpacity>
        )}}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{form.id ? "Sửa Voucher" : "Tạo Voucher mới"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              <Text style={s.label}>Phân loại hệ thống</Text>
              <View style={s.typeRow}>
                {[ {k: 'discount', l: 'Mã Giảm Giá'}, {k: 'loyalty', l: 'Quà Đổi Điểm'} ].map(t => (
                  <TouchableOpacity key={t.k} style={[s.typeBtn, form.group === t.k && s.typeBtnActive]} onPress={() => setForm({...form, group: t.k as any})}>
                    <Text style={[s.typeBtnTxt, form.group === t.k && s.typeBtnTxtActive]}>{t.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Mã Code (Chữ in hoa)</Text>
              <TextInput style={s.input} value={form.code} onChangeText={t => setForm({...form, code: t.toUpperCase()})} placeholder="VD: SUMMER26" />

              <Text style={s.label}>Tiêu đề hiển thị</Text>
              <TextInput style={s.input} value={form.title} onChangeText={t => setForm({...form, title: t})} placeholder="VD: Giảm 50K cho Tour Biển" />

              {form.group === 'loyalty' && (
                <>
                  <Text style={s.label}>Số điểm CẦN ĐỂ ĐỔI lấy mã này</Text>
                  <TextInput style={s.input} value={form.pointsCost?.toString()} onChangeText={t => setForm({...form, pointsCost: Number(t)})} keyboardType="number-pad" />
                </>
              )}

              <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Số lượt tối đa / User</Text>
                  <TextInput style={s.input} value={form.userLimit?.toString()} onChangeText={t => setForm({...form, userLimit: Number(t)})} keyboardType="number-pad" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Tổng SL phát hành</Text>
                  <TextInput style={s.input} value={form.usageLimit?.toString()} onChangeText={t => setForm({...form, usageLimit: Number(t)})} keyboardType="number-pad" />
                </View>
              </View>

              {form.id && (
                <View style={{marginTop: 10}}>
                  <Text style={s.label}>Cập nhật Lượt đã dùng (Thủ công)</Text>
                  <TextInput style={s.input} value={form.usedCount?.toString()} onChangeText={t => setForm({...form, usedCount: Number(t)})} keyboardType="number-pad" />
                </View>
              )}

              {form.group === 'discount' && (
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginTop: 14, borderWidth: 1, borderColor: '#e2e8f0'}}>
                   <View>
                     <Text style={{fontWeight: 'bold', color: '#1f2a58', fontSize: 13}}>Tặng mọi Khách hàng</Text>
                     <Text style={{fontSize: 11, color: '#64748b'}}>Tự động thêm vào Kho Voucher của khách.</Text>
                   </View>
                   <TouchableOpacity onPress={() => setForm({...form, isGiftAll: !form.isGiftAll})}>
                     <Ionicons name={form.isGiftAll ? "checkbox" : "square-outline"} size={26} color="#4f7cff" />
                   </TouchableOpacity>
                </View>
              )}

              <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Mức giảm</Text>
                  <TextInput style={s.input} value={form.discountValue?.toString()} onChangeText={t => setForm({...form, discountValue: Number(t)})} keyboardType="number-pad" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={s.label}>Loại giảm</Text>
                  <TouchableOpacity style={s.input} onPress={() => setForm({...form, type: form.type === 'percent' ? 'fixed' : 'percent'})}>
                    <Text style={{fontWeight: 'bold', color: '#4f7cff'}}>{form.type === 'percent' ? '% Phần trăm' : 'VNĐ Tiền mặt'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={handleSaveVoucher}><Text style={s.saveBtnTxt}>Lưu Voucher</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AdminTabBar activeRoute="admin-voucher-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "900", color: "#1f2a58" },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4f7cff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  addBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 12, elevation: 2 },
  cardLeft: { width: 80, justifyContent: "center", alignItems: "center", padding: 10 },
  cardTypeTxt: { color: "#fff", fontSize: 10, fontWeight: "800", marginTop: 4, textAlign: "center" },
  cardRight: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  codeTxt: { fontSize: 14, fontWeight: "900", color: "#1f2a58", letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  titleTxt: { fontSize: 13, color: "#475569", fontWeight: "600", marginBottom: 6 },
  usageProgress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, borderRadius: 8, borderWidth: 1 },
  
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.6)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 14, color: "#1f2a58" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  typeBtnActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  typeBtnTxt: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  typeBtnTxtActive: { color: "#fff" },
  saveBtn: { backgroundColor: "#4f7cff", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 30, marginBottom: 40 },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" }
});