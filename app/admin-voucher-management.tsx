/**
 * app/admin-voucher-management.tsx
 * Admin quản lý Voucher siêu chi tiết
 * Đã fix lỗi không hiện Lịch (Hỗ trợ Web Fallback và Fix Z-index Modal iOS)
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@admin_vouchers_advanced";

type VoucherType = "percent" | "fixed";
type VoucherGroup = "discount" | "shipping" | "partner";
type VoucherStatus = "active" | "hidden";

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: VoucherType;
  discountValue: number;
  maxDiscount: number; 
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  group: VoucherGroup;
  status: VoucherStatus;
  color: string;
}

const COLORS = ["#4f7cff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const SEED_VOUCHERS: Voucher[] = [
  {
    id: "v1", code: "HE2026", title: "Giảm 10% Tour Biển", description: "Áp dụng cho tất cả tour Biển Đảo. Tối đa 500k.",
    type: "percent", discountValue: 10, maxDiscount: 500000, minOrderValue: 2000000,
    usageLimit: 100, usedCount: 85, startDate: "01/06/2026 00:00", endDate: "30/08/2026 23:59", group: "discount", status: "active", color: "#4f7cff"
  },
  {
    id: "v2", code: "FREESHIP", title: "Miễn phí đón tiễn", description: "Áp dụng cho đơn từ 5 triệu. Hỗ trợ xe đưa đón.",
    type: "fixed", discountValue: 250000, maxDiscount: 250000, minOrderValue: 5000000,
    usageLimit: 50, usedCount: 50, startDate: "15/05/2026 08:00", endDate: "15/07/2026 22:00", group: "shipping", status: "active", color: "#10b981"
  }
];

const formatVND = (val: number) => val.toLocaleString("vi-VN") + "đ";

const docTien = (number: number): string => {
  if (!number || number === 0) return "0 đồng";
  const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const donVi = ["", "nghìn", "triệu", "tỷ"];

  const docBlock = (so: number, dayDu: boolean) => {
    let chuoi = "";
    let tram = Math.floor(so / 100);
    let chuc = Math.floor((so % 100) / 10);
    let donvi = so % 10;
    if (dayDu || tram > 0) { chuoi += chuSo[tram] + " trăm "; if (chuc === 0 && donvi > 0) chuoi += "lẻ "; }
    if (chuc === 1) chuoi += "mười "; else if (chuc > 1) chuoi += chuSo[chuc] + " mươi ";
    if (chuc > 0 && donvi === 1) chuoi += "mốt "; else if (chuc > 0 && donvi === 5) chuoi += "lăm "; else if (donvi > 0) chuoi += chuSo[donvi] + " ";
    return chuoi.trim();
  };

  let chuoiKetQua = "";
  let i = 0; let so = number;
  while (so > 0) {
    let block = so % 1000;
    let dayDu = Math.floor(number / Math.pow(1000, i + 1)) > 0;
    if (block > 0) { let strBlock = docBlock(block, dayDu); chuoiKetQua = strBlock + " " + donVi[i] + " " + chuoiKetQua; }
    i++; so = Math.floor(so / 1000);
  }
  chuoiKetQua = chuoiKetQua.replace(/\s+/g, ' ').trim() + " đồng";
  return chuoiKetQua.charAt(0).toUpperCase() + chuoiKetQua.slice(1);
};

export default function AdminVoucherManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<VoucherGroup | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "table">("list"); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Partial<Voucher>>({});

  // STATE CHO DATETIME PICKER
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [pickerField, setPickerField] = useState<"startDate" | "endDate">("startDate");
  const [pickerDate, setPickerDate] = useState(new Date());

<<<<<<< Updated upstream
  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "distribute" | "delete" | "success" | "error"; title: string; message: string; targetVoucher?: Voucher;
  }>({ visible: false, type: "success", title: "", message: "" });
=======
  const persist = useCallback(async (data: Voucher[]) => {
    setVouchers(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});

    // ✅ Sync sang @promo_codes để Guest có thể nhập mã
    const promoCodes = data.map(v => ({
      id: v.id,
      code: v.code,
      type: v.type,
      value: Number(v.discount),
      minOrder: Number(v.minOrder) || 0,
      maxDiscount: Number(v.maxDiscount) || 0,
      description: v.description,
      expiry: v.expiry,
      color: v.color,
      active: v.status === "active",
      usedCount: v.used,
      limit: v.limit,
      source: "admin",
    }));
    await AsyncStorage.setItem("@promo_codes", JSON.stringify(promoCodes)).catch(() => {});
  }, []);
>>>>>>> Stashed changes

  useFocusEffect(useCallback(() => { loadVouchers(); }, []));

  const loadVouchers = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setVouchers(JSON.parse(raw) || []);
      else { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_VOUCHERS)); setVouchers(SEED_VOUCHERS); }
    } catch (e) { setVouchers([]); }
  };

  const openModal = (item?: Voucher) => {
    if (item) setEditingVoucher(item);
    else setEditingVoucher({
      id: `v-${Date.now()}`, code: "", title: "", description: "",
      type: "percent", discountValue: 0, maxDiscount: 0, minOrderValue: 0,
      usageLimit: 100, usedCount: 0, startDate: "", endDate: "",
      group: "discount", status: "active", color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
    setShowPicker(false);
    setModalVisible(true);
  };

  const handleNumericInput = (field: keyof Voucher, value: string) => {
    const num = parseInt(value.replace(/\D/g, "")) || 0;
    setEditingVoucher(prev => ({ ...prev, [field]: num }));
  };

<<<<<<< Updated upstream
  // LOGIC MỞ LỊCH ĐÃ ĐƯỢC LÀM LẠI
  const handleOpenPicker = (field: "startDate" | "endDate") => {
    setPickerField(field);
    setPickerMode("date"); 
    setPickerDate(new Date()); 
    setShowPicker(true);
  };
=======
  const handleDelete = (v: Voucher) =>
    Alert.alert(
      "Xóa voucher",
      `Bạn có chắc muốn xóa voucher "${v.code}"?\nHành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            const updated = vouchers.filter((x) => x.id !== v.id);
            await persist(updated);
            // ✅ Xóa luôn khỏi kho voucher Guest nếu chưa dùng
            const gRaw = await AsyncStorage.getItem("@guest_vouchers").catch(() => null);
            if (gRaw) {
              const gList = JSON.parse(gRaw).filter((gv: any) => gv.code !== v.code);
              await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(gList)).catch(() => {});
            }
          },
        },
      ],
    );
>>>>>>> Stashed changes

  const saveDateToString = (d: Date, field: string) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setEditingVoucher(prev => ({ ...prev, [field]: `${day}/${month}/${year} ${hrs}:${mins}` }));
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === "dismissed") {
        setShowPicker(false);
        return;
      }
      const currentDate = selectedDate || pickerDate;
      setPickerDate(currentDate);

      if (pickerMode === "date") {
        setPickerMode("time"); // Chọn xong ngày thì mở đồng hồ
      } else {
        setShowPicker(false); // Chọn xong giờ thì tắt
        saveDateToString(currentDate, pickerField);
      }
    } else {
      // iOS chỉ lưu tạm Date
      if (selectedDate) setPickerDate(selectedDate);
    }
  };

  const confirmIOSPicker = () => {
    setShowPicker(false);
    saveDateToString(pickerDate, pickerField);
  };

  const saveVoucher = async () => {
    if (!editingVoucher.code || !editingVoucher.title || !editingVoucher.discountValue) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Mã, Tiêu đề và Giá trị giảm không được để trống." });
      return;
    }
    try {
      let updated = [...vouchers];
      const isNew = !vouchers.find(v => v.id === editingVoucher.id);
      if (isNew) updated.unshift(editingVoucher as Voucher);
      else updated = updated.map((v) => v.id === editingVoucher.id ? editingVoucher as Voucher : v);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setVouchers(updated);
      setModalVisible(false);
      setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã lưu Voucher." });
    } catch (error) {}
  };

  const promptDistribute = (voucher: Voucher) => { setConfirmPopup({ visible: true, type: "distribute", title: "Phát hành Voucher", message: `Gửi mã "${voucher.code}" qua thông báo đẩy đến tất cả Khách hàng?`, targetVoucher: voucher }); };
  const promptDelete = (voucher: Voucher) => { setConfirmPopup({ visible: true, type: "delete", title: "Xóa Voucher", message: `Bạn muốn xóa mã "${voucher.code}"?`, targetVoucher: voucher }); };

  const executeAction = async () => {
    if (!confirmPopup.targetVoucher) return;
    try {
      if (confirmPopup.type === "delete") {
        const updated = vouchers.filter((v) => v.id !== confirmPopup.targetVoucher!.id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setVouchers(updated);
        setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Voucher đã được xóa khỏi hệ thống." });
      } else if (confirmPopup.type === "distribute") {
        setConfirmPopup({ visible: true, type: "success", title: "Đã phát hành", message: `Đã gửi mã giảm giá đến toàn bộ thiết bị khách hàng!` });
      }
    } catch (e) {}
  };

  const getGroupLabel = (group: string) => {
    switch(group) {
      case "discount": return "Giảm giá Tour";
      case "shipping": return "Đưa đón/Vận chuyển";
      case "partner": return "Đối tác/Thanh toán";
      default: return "Khác";
    }
  };

  const getRealStatus = (v: Voucher) => {
    if (v.status === "hidden") return { label: "Đã ẩn", color: "#64748b", bg: "#f1f5f9" };
    if (v.usedCount >= v.usageLimit) return { label: "Hết lượt", color: "#dc2626", bg: "#fee2e2" };
    return { label: "Đang chạy", color: "#059669", bg: "#d1fae5" };
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchSearch = (v.code||"").toLowerCase().includes(searchQuery.toLowerCase()) || (v.title||"").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup = filterGroup === "all" || v.group === filterGroup;
    return matchSearch && matchGroup;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Khuyến mãi</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.iconTopBtn} onPress={() => setViewMode(prev => prev === "list" ? "table" : "list")}>
            <Ionicons name={viewMode === "list" ? "list" : "grid"} size={20} color="#4f7cff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

<<<<<<< Updated upstream
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a8d8" />
          <TextInput style={styles.searchInput} placeholder="Tìm mã hoặc tên khuyến mãi..." placeholderTextColor="#94a8d8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>
=======
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={{ flexGrow: 0 }}
      >
        {["Tất cả", ...STATUS_OPTIONS].map((st) => {
          const label =
            st === "Tất cả" ? "Tất cả" : STATUS_MAP[st as VoucherStatus].label;
          return (
            <TouchableOpacity
              key={st}
              style={[s.filterChip, selStatus === st && s.filterActive]}
              onPress={() => setSelStatus(st)}
            >
              <Text
                style={[s.filterTxt, selStatus === st && s.filterTxtActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
>>>>>>> Stashed changes

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(["all", "discount", "shipping", "partner"] as const).map(grp => (
            <TouchableOpacity key={grp} style={[styles.filterChip, filterGroup === grp && styles.filterChipActive]} onPress={() => setFilterGroup(grp)}>
              <Text style={[styles.filterTxt, filterGroup === grp && styles.filterTxtActive]}>{grp === "all" ? "Tất cả nhóm" : getGroupLabel(grp)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* RENDER LIST OR TABLE */}
      {viewMode === "list" ? (
        <FlatList
          data={filteredVouchers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const st = getRealStatus(item);
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardInfo} onPress={() => openModal(item)} activeOpacity={0.7}>
                  <View style={styles.codeRow}>
                    <Text style={[styles.codeTxt, { color: item.color || "#4f7cff" }]}>{item.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}><Text style={[styles.statusTxt, { color: st.color }]}>{st.label}</Text></View>
                  </View>
                  <Text style={styles.titleTxt}>{item.title}</Text>
                  <Text style={styles.descTxt} numberOfLines={2}>{item.description}</Text>
                  
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}><Ionicons name="calendar-outline" size={14} color="#7a8cc2" /><Text style={styles.metaTxt}>{item.startDate} đến {item.endDate}</Text></View>
                    <View style={styles.metaItem}><Ionicons name="pricetag-outline" size={14} color="#7a8cc2" /><Text style={styles.metaTxt}>Đơn tối thiểu: {formatVND(item.minOrderValue)}</Text></View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Lượt dùng: {item.usedCount} / {item.usageLimit}</Text>
                      <Text style={styles.progressLabel}>{Math.round(((item.usedCount)/(item.usageLimit||1))*100)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${((item.usedCount)/(item.usageLimit||1))*100}%`, backgroundColor: item.color || "#4f7cff" }]} />
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActionsCol}>
                  <TouchableOpacity style={[styles.actionSideBtn, { backgroundColor: "#eaf0ff" }]} onPress={() => promptDistribute(item)}><Ionicons name="paper-plane" size={20} color="#4f7cff" /></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionSideBtn, { backgroundColor: "#fee2e2", marginTop: 8 }]} onPress={() => promptDelete(item)}><Ionicons name="trash" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <ScrollView horizontal style={styles.tableWrapper} showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, { width: 120 }]}>Mã Voucher</Text>
              <Text style={[styles.thCell, { width: 200 }]}>Tiêu đề / Mức giảm</Text>
              <Text style={[styles.thCell, { width: 140 }]}>Nhóm</Text>
              <Text style={[styles.thCell, { width: 120 }]}>Đã dùng / Tổng</Text>
              <Text style={[styles.thCell, { width: 220 }]}>Thời hạn</Text>
              <Text style={[styles.thCell, { width: 100 }]}>Trạng thái</Text>
              <Text style={[styles.thCell, { width: 100, textAlign: "center" }]}>Thao tác</Text>
            </View>
            <FlatList
              data={filteredVouchers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const st = getRealStatus(item);
                return (
                  <View style={styles.tableRow}>
                    <TouchableOpacity style={{ flexDirection: "row", width: 900, alignItems: "center" }} onPress={() => openModal(item)} activeOpacity={0.7}>
                      <Text style={[styles.tdCell, { width: 120, fontWeight: "800", color: item.color }]}>{item.code}</Text>
                      <View style={{ width: 200, justifyContent: "center", paddingRight: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#1f2a58" }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ fontSize: 11, color: "#7a8cc2" }}>Giảm {item.type === "percent" ? `${item.discountValue}%` : formatVND(item.discountValue)}</Text>
                      </View>
                      <Text style={[styles.tdCell, { width: 140 }]}>{getGroupLabel(item.group)}</Text>
                      <View style={{ width: 120, justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#1f2a58" }}>{item.usedCount} <Text style={{ color: "#94a8d8", fontWeight: "400" }}>/ {item.usageLimit}</Text></Text>
                      </View>
                      <View style={{ width: 220, justifyContent: "center" }}>
                        <Text style={{ fontSize: 11, color: "#64748b" }}>{item.startDate}{"\n"}- {item.endDate}</Text>
                      </View>
                      <View style={{ width: 100, justifyContent: "center", alignItems: "flex-start" }}>
                        <View style={[styles.statusBadge, { backgroundColor: st.bg, margin: 0 }]}><Text style={[styles.statusTxt, { color: st.color }]}>{st.label}</Text></View>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={{ width: 100, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 }}>
                      <TouchableOpacity onPress={() => promptDistribute(item)}><Ionicons name="paper-plane" size={18} color="#4f7cff" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => promptDelete(item)}><Ionicons name="trash" size={18} color="#ef4444" /></TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* MODAL THÊM / SỬA VOUCHER */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{(editingVoucher?.id || "").startsWith("v-") && !vouchers.find(v=>v.id===editingVoucher?.id) ? "Tạo Khuyến mãi Mới" : "Cập nhật Khuyến mãi"}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setShowPicker(false); }} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              {/* Box 1: Thông tin chung */}
              <View style={styles.formGroup}>
                <Text style={styles.groupTitle}>1. Thông tin chung</Text>
                <Text style={styles.inputLabel}>Mã Voucher <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput style={styles.input} value={editingVoucher?.code || ""} onChangeText={(t) => setEditingVoucher(prev => ({...prev, code: t.toUpperCase()}))} placeholder="VD: SUMMER2026" />

                <Text style={styles.inputLabel}>Tiêu đề hiển thị <Text style={{ color: "#ef4444" }}>*</Text></Text>
                <TextInput style={styles.input} value={editingVoucher?.title || ""} onChangeText={(t) => setEditingVoucher(prev => ({...prev, title: t}))} placeholder="VD: Giảm 10% Tour Biển" />

                <Text style={styles.inputLabel}>Mô tả chi tiết</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} multiline value={editingVoucher?.description || ""} onChangeText={(t) => setEditingVoucher(prev => ({...prev, description: t}))} placeholder="Điều kiện, lưu ý..." />
              </View>

              {/* Box 2: Thiết lập Giảm giá */}
              <View style={styles.formGroup}>
                <Text style={styles.groupTitle}>2. Thiết lập Khuyến mãi</Text>
                <Text style={styles.inputLabel}>Loại giảm giá</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity style={[styles.typeBtn, editingVoucher?.type === "percent" && styles.typeBtnActive]} onPress={() => setEditingVoucher(prev => ({...prev, type: "percent"}))}>
                    <Text style={[styles.typeTxt, editingVoucher?.type === "percent" && styles.typeTxtActive]}>Giảm theo %</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, editingVoucher?.type === "fixed" && styles.typeBtnActive]} onPress={() => setEditingVoucher(prev => ({...prev, type: "fixed"}))}>
                    <Text style={[styles.typeTxt, editingVoucher?.type === "fixed" && styles.typeTxtActive]}>Giảm số tiền</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rowGrid}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Mức giảm <Text style={{ color: "#ef4444" }}>*</Text></Text>
                    <TextInput 
                      style={[styles.input, { marginBottom: 4 }]} 
                      keyboardType="numeric" 
                      value={editingVoucher?.discountValue ? editingVoucher.discountValue.toLocaleString("vi-VN") : ""} 
                      onChangeText={(t) => handleNumericInput("discountValue", t)} 
                    />
                    {editingVoucher?.type === "fixed" ? (
                      <Text style={styles.priceReadingTxt}>{docTien(editingVoucher?.discountValue || 0)}</Text>
                    ) : (
                      <Text style={styles.priceReadingTxt}>Phần trăm (%)</Text>
                    )}
                  </View>
                  
                  {editingVoucher?.type === "percent" && (
                    <View style={styles.col}>
                      <Text style={styles.inputLabel}>Giảm Tối đa (VNĐ)</Text>
                      <TextInput 
                        style={[styles.input, { marginBottom: 4 }]} 
                        keyboardType="numeric" 
                        value={editingVoucher?.maxDiscount ? editingVoucher.maxDiscount.toLocaleString("vi-VN") : ""} 
                        onChangeText={(t) => handleNumericInput("maxDiscount", t)} 
                      />
                      <Text style={styles.priceReadingTxt}>{docTien(editingVoucher?.maxDiscount || 0)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Box 3: Điều kiện & Thời gian */}
              <View style={styles.formGroup}>
                <Text style={styles.groupTitle}>3. Điều kiện & Thời gian</Text>
                
                <Text style={styles.inputLabel}>Giá trị Đơn hàng Tối thiểu (VNĐ)</Text>
                <TextInput 
                  style={[styles.input, { marginBottom: 4 }]} 
                  keyboardType="numeric" 
                  value={editingVoucher?.minOrderValue ? editingVoucher.minOrderValue.toLocaleString("vi-VN") : ""} 
                  onChangeText={(t) => handleNumericInput("minOrderValue", t)} 
                />
                <Text style={styles.priceReadingTxt}>{docTien(editingVoucher?.minOrderValue || 0)}</Text>

                <View style={styles.rowGrid}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tổng Lượt dùng</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={(editingVoucher?.usageLimit || 0).toString()} onChangeText={(t) => handleNumericInput("usageLimit", t)} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Đã sử dụng</Text>
                    <TextInput style={[styles.input, { backgroundColor: "#f1f5f9", color: "#64748b" }]} keyboardType="numeric" value={(editingVoucher?.usedCount || 0).toString()} editable={false} />
                  </View>
                </View>

                {/* HỖ TRỢ WEB FALLBACK VÀ LỊCH TRÊN APP */}
                <View style={[styles.rowGrid, { marginTop: 12 }]}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Bắt đầu (Giờ & Ngày)</Text>
                    {Platform.OS === "web" ? (
                      <TextInput style={styles.input} value={editingVoucher?.startDate || ""} onChangeText={(t) => setEditingVoucher(prev => ({...prev, startDate: t}))} placeholder="VD: 01/06/2026 08:00" />
                    ) : (
                      <TouchableOpacity style={styles.datePickerBtn} onPress={() => handleOpenPicker("startDate")} activeOpacity={0.7}>
                        <Text style={[styles.datePickerTxt, !editingVoucher?.startDate && { color: "#94a8d8", fontWeight: "400" }]}>
                          {editingVoucher?.startDate || "Chọn thời gian"}
                        </Text>
                        <Ionicons name="calendar" size={18} color="#4f7cff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Hết hạn (Giờ & Ngày)</Text>
                    {Platform.OS === "web" ? (
                      <TextInput style={styles.input} value={editingVoucher?.endDate || ""} onChangeText={(t) => setEditingVoucher(prev => ({...prev, endDate: t}))} placeholder="VD: 30/08/2026 23:59" />
                    ) : (
                      <TouchableOpacity style={styles.datePickerBtn} onPress={() => handleOpenPicker("endDate")} activeOpacity={0.7}>
                        <Text style={[styles.datePickerTxt, !editingVoucher?.endDate && { color: "#94a8d8", fontWeight: "400" }]}>
                          {editingVoucher?.endDate || "Chọn thời gian"}
                        </Text>
                        <Ionicons name="calendar" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveVoucher}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>Lưu Voucher</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* RENDER LỊCH VÀ ĐỒNG HỒ TRỰC TIẾP TRONG MODAL ĐỂ FIX Z-INDEX IOS */}
            {showPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={pickerDate}
                mode={pickerMode}
                is24Hour={true}
                display="default"
                onChange={onPickerChange}
              />
            )}

            {showPicker && Platform.OS === "ios" && (
              <View style={styles.iosPickerOverlay}>
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text style={styles.iosPickerCancel}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmIOSPicker}>
                      <Text style={styles.iosPickerConfirm}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pickerDate}
                    mode={pickerMode}
                    display="spinner"
                    locale="vi-VN"
                    onChange={onPickerChange}
                    style={{ height: 200 }}
                  />
                </View>
              </View>
            )}

          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* CUSTOM POPUP CONFIRM */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "distribute" && { backgroundColor: "#eaf0ff" },
              confirmPopup.type === "success" && { backgroundColor: "#d1fae5" },
              confirmPopup.type === "error" || confirmPopup.type === "delete" ? { backgroundColor: "#fee2e2" } : {}
            ]}>
              <Ionicons 
                name={confirmPopup.type === "distribute" ? "paper-plane" : confirmPopup.type === "success" ? "checkmark-circle" : confirmPopup.type === "delete" ? "trash" : "warning"} 
                size={32} 
                color={confirmPopup.type === "distribute" ? "#4f7cff" : confirmPopup.type === "success" ? "#10b981" : "#ef4444"} 
              />
            </View>
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>

            {confirmPopup.type === "success" || confirmPopup.type === "error" ? (
              <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmActionRow}>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={styles.confirmCancelBtnTxt}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmSubmitBtn, { backgroundColor: confirmPopup.type === "delete" ? "#ef4444" : "#4f7cff" }]} onPress={executeAction}>
                  <Text style={styles.confirmSubmitBtnTxt}>{confirmPopup.type === "delete" ? "Xóa" : "Thực hiện"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-voucher-management" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  iconTopBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
<<<<<<< Updated upstream
  
  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: "#e4ebff" },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1f2a58" },
  filtersWrapper: { flexShrink: 0, paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
=======
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebff",
  },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#e4ebff" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLbl: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ff",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff", height: 34 },
  filterTxt: { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
>>>>>>> Stashed changes
  filterTxtActive: { color: "#fff" },

  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, flexDirection: "row", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden" },
  cardInfo: { flex: 1, padding: 16 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  codeTxt: { fontSize: 18, fontWeight: "900" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginVertical: 4 },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  titleTxt: { fontSize: 15, color: "#1f2a58", fontWeight: "800", marginBottom: 4 },
  descTxt: { fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 18 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaTxt: { fontSize: 11, color: "#1f2a58", fontWeight: "600" },
  
  progressContainer: { marginTop: 4 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { fontSize: 11, color: "#7a8cc2", fontWeight: "600" },
  progressBarBg: { height: 6, backgroundColor: "#e4ebff", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },

  cardActionsCol: { borderLeftWidth: 1, borderLeftColor: "#f0f4ff", backgroundColor: "#fafbff", padding: 10, justifyContent: "center" },
  actionSideBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  tableWrapper: { marginHorizontal: 16, marginBottom: 100, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 12, paddingHorizontal: 16 },
  thCell: { color: "#64748b", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f4ff", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  tdCell: { color: "#1f2a58", fontSize: 13 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  
  formGroup: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 16, marginBottom: 20 },
  groupTitle: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff", paddingBottom: 8 },

  inputLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a58", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, color: "#1f2a58", fontSize: 14 },
  priceReadingTxt: { fontSize: 12, color: "#10b981", fontStyle: "italic", marginLeft: 4, marginBottom: 12, fontWeight: "600", marginTop: 4 },
  
  datePickerBtn: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  datePickerTxt: { fontSize: 14, color: "#1f2a58", fontWeight: "600" },
  
  iosPickerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, top: 0, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999 },
  iosPickerContainer: { backgroundColor: "#fff", paddingBottom: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  iosPickerHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  iosPickerCancel: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
  iosPickerConfirm: { color: "#4f7cff", fontSize: 16, fontWeight: "800" },

  rowGrid: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  typeBtn: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" },
  typeBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  typeTxt: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  typeTxtActive: { color: "#4f7cff", fontWeight: "700" },
  
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 14, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, marginBottom: 30, elevation: 4, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});