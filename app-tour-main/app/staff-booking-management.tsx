/**
 * app/staff-booking-management.tsx
 * Staff xem, lọc, tìm kiếm, xem chi tiết và cập nhật trạng thái booking
 * Nâng cấp: Audit log, internal note, SLA warning, dispute, 12 data mẫu
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

type BookStatus =
  | "pending_guide" | "guide_accepted" | "checked_in"
  | "on_tour" | "completed" | "cancelled" | "pending" | "disputed";

interface AuditLog {
  actor: string; action: string; time: string; note?: string;
}

interface Booking {
  id: string; tourName: string; guideName: string;
  guests: number; totalAmount: number; status: BookStatus;
  createdAt: string; tourDate: string;
  customerName?: string; customerPhone?: string; customerEmail?: string;
  paymentMethod?: string; services?: string[];
  internalNote?: string;
  slaMinutes?: number;
  auditLog?: AuditLog[];
  pickupLocation?: string;
  tourCode?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_guide:  { label: "Chờ HDV",      color: "#d97706", bg: "#fef9c3" },
  pending:        { label: "Chờ xử lý",    color: "#d97706", bg: "#fef9c3" },
  guide_accepted: { label: "HDV đã nhận",  color: "#2856d6", bg: "#eaf0ff" },
  checked_in:     { label: "Check-in",     color: "#7c3aed", bg: "#ede9fe" },
  on_tour:        { label: "Đang đi",      color: "#0284c7", bg: "#e0f2fe" },
  completed:      { label: "Hoàn tất",     color: "#16a34a", bg: "#dcfce7" },
  cancelled:      { label: "Đã hủy",       color: "#dc2626", bg: "#fee2e2" },
  disputed:       { label: "Tranh chấp",   color: "#7c3aed", bg: "#ede9fe" },
};

const FILTER_MAP: Record<string, (b: Booking) => boolean> = {
  "Tất cả":     () => true,
  "Chờ xử lý": b => b.status === "pending" || b.status === "pending_guide",
  "Đang đi":    b => b.status === "on_tour" || b.status === "checked_in" || b.status === "guide_accepted",
  "Hoàn tất":   b => b.status === "completed",
  "Đã hủy":     b => b.status === "cancelled",
  "Tranh chấp": b => b.status === "disputed",
};

const FILTERS = Object.keys(FILTER_MAP);
const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const PAGE_SIZE = 6;

const SEED_BOOKINGS: Booking[] = [
  {
    id: "BK001001", tourName: "Đà Lạt 3N2Đ - Săn mây & Chill", guideName: "Trần Minh Khoa",
    guests: 3, totalAmount: 8970000, status: "pending_guide",
    createdAt: "2026-04-10T08:00:00Z", tourDate: "18/04/2026",
    customerName: "Nguyễn An", customerPhone: "0901 234 567", customerEmail: "nguyen.an@gmail.com",
    paymentMethod: "Ví MoMo", services: ["Bảo hiểm du lịch", "Thuê xe máy"],
    slaMinutes: 95, pickupLocation: "70 Trần Phú, Q.1, TP.HCM", tourCode: "DL-3N2D-01",
    internalNote: "Khách VIP, đã mua tour lần thứ 3. Ưu tiên HDV giỏi.",
    auditLog: [
      { actor: "Nguyễn An (Khách)", action: "Đặt tour thành công", time: "08:00 · 10/04" },
      { actor: "Hệ thống", action: "Nhận thanh toán 8.970.000đ qua MoMo", time: "08:02 · 10/04" },
      { actor: "Hệ thống", action: "Gửi yêu cầu xác nhận đến HDV Trần Minh Khoa", time: "08:03 · 10/04" },
      { actor: "Staff Lê CSKH", action: "Ghi chú: Khách VIP, ưu tiên phân bổ", time: "09:30 · 10/04" },
    ],
  },
  {
    id: "BK001002", tourName: "Phú Quốc 4N3Đ - Resort biển xanh", guideName: "Nguyễn Thu Hà",
    guests: 2, totalAmount: 9380000, status: "guide_accepted",
    createdAt: "2026-04-09T10:00:00Z", tourDate: "22/04/2026",
    customerName: "Trần Văn B", customerPhone: "0912 345 678", customerEmail: "tranb@gmail.com",
    paymentMethod: "Thẻ Visa", services: ["Bữa ăn đặc sản", "Snorkeling"],
    slaMinutes: 15, pickupLocation: "Sân bay Tân Sơn Nhất, Cổng T2", tourCode: "PQ-4N3D-05",
    internalNote: "",
    auditLog: [
      { actor: "Trần Văn B (Khách)", action: "Đặt tour", time: "10:00 · 09/04" },
      { actor: "Hệ thống", action: "Thanh toán thẻ Visa thành công", time: "10:01 · 09/04" },
      { actor: "Nguyễn Thu Hà (HDV)", action: "Xác nhận nhận tour", time: "11:30 · 09/04" },
    ],
  },
  {
    id: "BK001003", tourName: "Nha Trang 3N2Đ - Lặn san hô đảo Bà Lụa", guideName: "Lê Quang Dũng",
    guests: 4, totalAmount: 13160000, status: "on_tour",
    createdAt: "2026-04-08T07:00:00Z", tourDate: "12/04/2026",
    customerName: "Lê Thị C", customerPhone: "0933 111 222", customerEmail: "lethic@gmail.com",
    paymentMethod: "Chuyển khoản", services: ["Thiết bị lặn", "Bảo hiểm"],
    slaMinutes: 0, pickupLocation: "Khách sạn Muong Thanh Nha Trang", tourCode: "NT-3N2D-08",
    internalNote: "Nhóm có 1 trẻ em 8 tuổi, cần lưu ý khi lặn.",
    auditLog: [
      { actor: "Lê Thị C (Khách)", action: "Đặt tour", time: "07:00 · 08/04" },
      { actor: "Lê Quang Dũng (HDV)", action: "Xác nhận", time: "09:00 · 08/04" },
      { actor: "Lê Quang Dũng (HDV)", action: "Check-in tại điểm tập kết", time: "07:00 · 12/04" },
      { actor: "Hệ thống", action: "Chuyển trạng thái sang Đang đi", time: "07:05 · 12/04" },
    ],
  },
  {
    id: "BK001004", tourName: "Sapa 3N2Đ - Mùa lúa chín Y Tý", guideName: "Phạm Hoài Nam",
    guests: 2, totalAmount: 7180000, status: "completed",
    createdAt: "2026-04-01T08:00:00Z", tourDate: "03/04/2026",
    customerName: "Phạm Quốc D", customerPhone: "0944 222 333", customerEmail: "pqd@gmail.com",
    paymentMethod: "Ví MoMo", services: ["Bảo hiểm du lịch"],
    slaMinutes: 0, pickupLocation: "Ga Hà Nội", tourCode: "SP-3N2D-12",
    internalNote: "",
    auditLog: [
      { actor: "Phạm Quốc D (Khách)", action: "Đặt tour", time: "08:00 · 01/04" },
      { actor: "Phạm Hoài Nam (HDV)", action: "Xác nhận", time: "09:00 · 01/04" },
      { actor: "Phạm Hoài Nam (HDV)", action: "Check-in với khách", time: "06:00 · 03/04" },
      { actor: "Hệ thống", action: "Hoàn tất tour tự động", time: "20:00 · 05/04" },
    ],
  },
  {
    id: "BK001005", tourName: "Hội An 2N1Đ - Phố cổ đèn lồng", guideName: "Đỗ Trúc Ly",
    guests: 2, totalAmount: 4600000, status: "cancelled",
    createdAt: "2026-04-05T09:00:00Z", tourDate: "10/04/2026",
    customerName: "Hoàng Thị E", customerPhone: "0955 333 444", customerEmail: "hoange@gmail.com",
    paymentMethod: "Thẻ Visa", services: [],
    slaMinutes: 0, pickupLocation: "Sân bay Đà Nẵng", tourCode: "HA-2N1D-03",
    internalNote: "Khách hủy vì sức khỏe, đã xử lý hoàn 70%.",
    auditLog: [
      { actor: "Hoàng Thị E (Khách)", action: "Đặt tour", time: "09:00 · 05/04" },
      { actor: "Hệ thống", action: "Thanh toán thành công", time: "09:02 · 05/04" },
      { actor: "Hoàng Thị E (Khách)", action: "Yêu cầu hủy tour — lý do sức khỏe", time: "14:00 · 07/04" },
      { actor: "Staff Lê CSKH", action: "Duyệt hủy, hoàn 70% = 3.220.000đ", time: "15:00 · 07/04" },
    ],
  },
  {
    id: "BK001006", tourName: "Hạ Long 3N2Đ - Vịnh kỳ quan Thế giới", guideName: "Nguyễn Thu Hà",
    guests: 6, totalAmount: 21000000, status: "pending",
    createdAt: "2026-04-11T11:00:00Z", tourDate: "20/04/2026",
    customerName: "Nguyễn Minh F", customerPhone: "0966 444 555", customerEmail: "nmf@gmail.com",
    paymentMethod: "Chuyển khoản", services: ["Bảo hiểm du lịch", "Máy ảnh", "Kayak"],
    slaMinutes: 75, pickupLocation: "Sofitel Metropole, Hà Nội", tourCode: "HL-3N2D-06",
    internalNote: "Nhóm gia đình lớn, có người cao tuổi. Yêu cầu phòng tầng thấp.",
    auditLog: [
      { actor: "Nguyễn Minh F (Khách)", action: "Đặt tour cho 6 người", time: "11:00 · 11/04" },
      { actor: "Hệ thống", action: "Chờ xác nhận chuyển khoản", time: "11:01 · 11/04" },
      { actor: "Staff Lê CSKH", action: "Xác nhận thanh toán thủ công", time: "12:30 · 11/04" },
    ],
  },
  {
    id: "BK001007", tourName: "Mũi Né 2N1Đ - Đồi cát vàng & Suối Tiên", guideName: "Trần Minh Khoa",
    guests: 2, totalAmount: 3800000, status: "checked_in",
    createdAt: "2026-04-12T06:00:00Z", tourDate: "12/04/2026",
    customerName: "Trần Thanh G", customerPhone: "0977 555 666", customerEmail: "ttg@gmail.com",
    paymentMethod: "Ví MoMo", services: [],
    slaMinutes: 0, pickupLocation: "Phan Thiết — Khách sạn Cocoland", tourCode: "MN-2N1D-09",
    internalNote: "",
    auditLog: [
      { actor: "Trần Thanh G (Khách)", action: "Đặt tour", time: "06:00 · 12/04" },
      { actor: "Trần Minh Khoa (HDV)", action: "Xác nhận & Check-in", time: "07:00 · 12/04" },
    ],
  },
  {
    id: "BK001008", tourName: "Côn Đảo 4N3Đ - Thiên đường hoang sơ", guideName: "Lê Quang Dũng",
    guests: 3, totalAmount: 15900000, status: "completed",
    createdAt: "2026-03-28T08:00:00Z", tourDate: "01/04/2026",
    customerName: "Lý Thu H", customerPhone: "0988 666 777", customerEmail: "lyh@gmail.com",
    paymentMethod: "Thẻ Mastercard", services: ["Bữa ăn đặc sản", "Bảo hiểm du lịch"],
    slaMinutes: 0, pickupLocation: "Sân bay Côn Đảo", tourCode: "CD-4N3D-02",
    internalNote: "",
    auditLog: [
      { actor: "Lý Thu H (Khách)", action: "Đặt tour", time: "08:00 · 28/03" },
      { actor: "Lê Quang Dũng (HDV)", action: "Xác nhận", time: "09:00 · 28/03" },
      { actor: "Lê Quang Dũng (HDV)", action: "Check-in tại sân bay", time: "10:30 · 01/04" },
      { actor: "Hệ thống", action: "Tour hoàn tất", time: "19:00 · 04/04" },
      { actor: "Hệ thống", action: "Giải ngân HDV 11.130.000đ (70%)", time: "07:00 · 05/04" },
    ],
  },
  {
    id: "BK001009", tourName: "Limousine Sài Gòn — Đà Lạt VIP 2N1Đ", guideName: "Võ Thị Kim",
    guests: 4, totalAmount: 12400000, status: "disputed",
    createdAt: "2026-04-10T14:00:00Z", tourDate: "11/04/2026",
    customerName: "Bùi Văn I", customerPhone: "0999 777 888", customerEmail: "bvi@gmail.com",
    paymentMethod: "Chuyển khoản", services: ["Xe Limousine 9 chỗ", "Khách sạn 5 sao"],
    slaMinutes: 0, pickupLocation: "66 Pasteur, Q.3, TP.HCM", tourCode: "SG-DL-LIMO-01",
    internalNote: "⚠️ Khách phản ánh: xe đón là 16 chỗ cũ thay vì Limousine cam kết. Đang xác minh với Partner. HOLD payout đến khi giải quyết.",
    auditLog: [
      { actor: "Bùi Văn I (Khách)", action: "Đặt tour Limousine VIP", time: "14:00 · 10/04" },
      { actor: "Hệ thống", action: "Thanh toán 12.400.000đ thành công", time: "14:02 · 10/04" },
      { actor: "Võ Thị Kim (HDV)", action: "Xác nhận tour", time: "15:00 · 10/04" },
      { actor: "Bùi Văn I (Khách)", action: "Khiếu nại: xe 16 chỗ cũ thay vì Limousine", time: "08:30 · 11/04" },
      { actor: "Staff Lê CSKH", action: "Chuyển sang Tranh chấp, HOLD payout Partner", time: "09:00 · 11/04" },
      { actor: "Staff Lê CSKH", action: "Yêu cầu Partner gửi bằng chứng xe", time: "09:05 · 11/04" },
    ],
  },
  {
    id: "BK001010", tourName: "Huế — Cung đình Di sản 3N2Đ", guideName: "Nguyễn Bảo Châu",
    guests: 5, totalAmount: 17500000, status: "guide_accepted",
    createdAt: "2026-04-11T16:00:00Z", tourDate: "25/04/2026",
    customerName: "Đinh Thị K", customerPhone: "0900 888 999", customerEmail: "dtk@gmail.com",
    paymentMethod: "Ví ZaloPay", services: ["Bảo hiểm", "Thuyết minh tiếng Anh", "Bữa hoàng gia"],
    slaMinutes: 20, pickupLocation: "Ga Huế", tourCode: "HUE-3N2D-04",
    internalNote: "Đoàn có 4 khách Mỹ, cần HDV thông thạo tiếng Anh — đã xác nhận.",
    auditLog: [
      { actor: "Đinh Thị K (Khách)", action: "Đặt tour cho 5 người (1 Việt, 4 Mỹ)", time: "16:00 · 11/04" },
      { actor: "Hệ thống", action: "Thanh toán ZaloPay thành công", time: "16:01 · 11/04" },
      { actor: "Nguyễn Bảo Châu (HDV)", action: "Xác nhận — thông thạo Anh/Việt", time: "17:30 · 11/04" },
    ],
  },
  {
    id: "BK001011", tourName: "Cần Thơ — Miền Tây sông nước 2N1Đ", guideName: "Trần Thị Xuân",
    guests: 2, totalAmount: 3200000, status: "pending_guide",
    createdAt: "2026-04-12T07:30:00Z", tourDate: "15/04/2026",
    customerName: "Cao Minh L", customerPhone: "0911 223 344", customerEmail: "cml@gmail.com",
    paymentMethod: "Ví MoMo", services: [],
    slaMinutes: 110, pickupLocation: "Bến Ninh Kiều, Cần Thơ", tourCode: "CT-2N1D-11",
    internalNote: "",
    auditLog: [
      { actor: "Cao Minh L (Khách)", action: "Đặt tour", time: "07:30 · 12/04" },
      { actor: "Hệ thống", action: "Gửi yêu cầu đến HDV Trần Thị Xuân", time: "07:31 · 12/04" },
    ],
  },
  {
    id: "BK001012", tourName: "Đà Nẵng — Bà Nà Hills & Sơn Trà 3N2Đ", guideName: "Lê Minh Tuấn",
    guests: 3, totalAmount: 10500000, status: "on_tour",
    createdAt: "2026-04-09T09:00:00Z", tourDate: "11/04/2026",
    customerName: "Vũ Thị M", customerPhone: "0922 334 455", customerEmail: "vtm@gmail.com",
    paymentMethod: "Thẻ JCB", services: ["Cáp treo Bà Nà", "Bảo hiểm"],
    slaMinutes: 0, pickupLocation: "Sân bay Đà Nẵng", tourCode: "DN-3N2D-07",
    internalNote: "",
    auditLog: [
      { actor: "Vũ Thị M (Khách)", action: "Đặt tour", time: "09:00 · 09/04" },
      { actor: "Lê Minh Tuấn (HDV)", action: "Xác nhận", time: "10:00 · 09/04" },
      { actor: "Lê Minh Tuấn (HDV)", action: "Check-in tại sân bay Đà Nẵng", time: "09:00 · 11/04" },
    ],
  },
];

export default function StaffBookingManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [filter, setFilter]         = useState("Tất cả");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [detail, setDetail]         = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [noteInput, setNoteInput]   = useState("");
  const [editNote, setEditNote]     = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guest_bookings").then(raw => {
      if (raw) {
        const parsed: Booking[] = JSON.parse(raw);
        setBookings(parsed.length > 0 ? parsed : SEED_BOOKINGS);
      } else {
        setBookings(SEED_BOOKINGS);
        AsyncStorage.setItem("@guest_bookings", JSON.stringify(SEED_BOOKINGS)).catch(() => {});
      }
    }).catch(() => setBookings(SEED_BOOKINGS));
    setPage(1);
  }, []));

  const persist = async (updated: Booking[]) => {
    setBookings(updated);
    await AsyncStorage.setItem("@guest_bookings", JSON.stringify(updated)).catch(() => {});
  };

  const notifyGuest = async (msg: string) => {
    const raw = await AsyncStorage.getItem("@guest_notifications").catch(() => null);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ id: `n${Date.now()}`, message: msg, read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem("@guest_notifications", JSON.stringify(list)).catch(() => {});
  };

  const updateStatus = (b: Booking, newStatus: BookStatus) => {
    const label = STATUS_META[newStatus]?.label ?? newStatus;
    const msgs: Record<string, string> = {
      completed: `Xác nhận hoàn tất booking #${b.id}?\n\nTour: ${b.tourName}\nKhách: ${b.customerName}\nTổng: ${fmt(b.totalAmount)}`,
      cancelled: `Xác nhận HỦY booking #${b.id}?\n\n⚠️ Thao tác này không thể hoàn tác!`,
      disputed:  `Chuyển #${b.id} sang TRANH CHẤP?\n\nLệnh thanh toán cho Partner sẽ bị tạm giữ.`,
    };
    Alert.alert(label, msgs[newStatus] || `Cập nhật sang "${label}"?`, [
      { text: "Hủy bỏ", style: "cancel" },
      {
        text: "Xác nhận",
        style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " · " + now.toLocaleDateString("vi-VN");
          const log: AuditLog = { actor: "Staff Lê CSKH", action: `Cập nhật → ${label}`, time: timeStr };
          const updated = bookings.map(x => x.id === b.id
            ? { ...x, status: newStatus, auditLog: [...(x.auditLog || []), log] }
            : x
          );
          await persist(updated);
          if (detail?.id === b.id) {
            setDetail(d => d ? { ...d, status: newStatus, auditLog: [...(d.auditLog || []), log] } : null);
          }
          if (newStatus === "completed") await notifyGuest(`✅ Booking #${b.id} "${b.tourName}" đã hoàn tất. Cảm ơn bạn!`);
          if (newStatus === "cancelled") await notifyGuest(`❌ Booking #${b.id} đã bị hủy. Liên hệ CSKH để được hỗ trợ.`);
          Alert.alert("✅ Thành công", `Đã cập nhật → ${label}`);
        },
      },
    ]);
  };

  const saveNote = async () => {
    if (!detail) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " · " + now.toLocaleDateString("vi-VN");
    const log: AuditLog = { actor: "Staff Lê CSKH", action: "Cập nhật ghi chú nội bộ", time: timeStr, note: noteInput.trim() };
    const updated = bookings.map(x => x.id === detail.id
      ? { ...x, internalNote: noteInput.trim(), auditLog: [...(x.auditLog || []), log] }
      : x
    );
    await persist(updated);
    setDetail(d => d ? { ...d, internalNote: noteInput.trim(), auditLog: [...(d.auditLog || []), log] } : null);
    setEditNote(false);
    Alert.alert("✅ Đã lưu", "Ghi chú nội bộ đã được cập nhật.");
  };

  const filtered = bookings.filter(b => {
    const kw = search.trim().toLowerCase();
    const matchSearch = !kw ||
      b.id.toLowerCase().includes(kw) ||
      (b.tourName || "").toLowerCase().includes(kw) ||
      (b.guideName || "").toLowerCase().includes(kw) ||
      (b.customerName || "").toLowerCase().includes(kw) ||
      (b.customerPhone || "").includes(kw);
    return matchSearch && FILTER_MAP[filter]?.(b);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalRev   = bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.totalAmount, 0);
  const slaAlerts  = bookings.filter(b => (b.slaMinutes || 0) > 60);

  const openDetail = (b: Booking) => {
    setDetail(b);
    setNoteInput(b.internalNote || "");
    setEditNote(false);
    setShowDetail(true);
  };

  const DetailModal = () => {
    if (!detail) return null;
    const meta = STATUS_META[detail.status] ?? STATUS_META.pending;
    return (
      <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Chi tiết Booking</Text>
                <Text style={s.modalSub}>#{detail.id} · {detail.tourCode}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status */}
              <View style={[s.modalStatusBar, { backgroundColor: meta.bg }]}>
                <View style={[s.modalStatusDot, { backgroundColor: meta.color }]} />
                <Text style={[s.modalStatusTxt, { color: meta.color }]}>{meta.label}</Text>
                {(detail.slaMinutes || 0) > 60 && (
                  <View style={s.slaBadge}>
                    <Ionicons name="time-outline" size={11} color="#dc2626" />
                    <Text style={s.slaBadgeTxt}>SLA {detail.slaMinutes} phút</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={s.infoSection}>
                {[
                  { icon: "map-outline",      label: "Tour",        value: detail.tourName },
                  { icon: "person-outline",   label: "Khách hàng",  value: detail.customerName || "---" },
                  { icon: "call-outline",     label: "Điện thoại",  value: detail.customerPhone || "---" },
                  { icon: "mail-outline",     label: "Email",       value: detail.customerEmail || "---" },
                  { icon: "people-outline",   label: "Số khách",    value: `${detail.guests} người` },
                  { icon: "compass-outline",  label: "HDV",         value: detail.guideName || "---" },
                  { icon: "calendar-outline", label: "Ngày đi",     value: detail.tourDate },
                  { icon: "location-outline", label: "Điểm đón",    value: detail.pickupLocation || "---" },
                  { icon: "card-outline",     label: "Thanh toán",  value: detail.paymentMethod || "---" },
                  { icon: "cash-outline",     label: "Tổng tiền",   value: fmt(detail.totalAmount), highlight: true },
                ].map((row, i) => (
                  <View key={i} style={s.detailRow}>
                    <View style={s.detailIcon}>
                      <Ionicons name={row.icon as any} size={14} color="#7a8cc2" />
                    </View>
                    <Text style={s.detailLabel}>{row.label}</Text>
                    <Text style={[s.detailValue, (row as any).highlight && { color: "#2856d6", fontWeight: "800" }]} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Services */}
              {(detail.services ?? []).length > 0 && (
                <View style={s.servicesBox}>
                  <Text style={s.servicesTitle}>Dịch vụ thêm</Text>
                  <View style={s.servicesTags}>
                    {(detail.services ?? []).map((sv, i) => (
                      <View key={i} style={s.serviceTag}>
                        <Ionicons name="checkmark-circle" size={11} color="#2856d6" />
                        <Text style={s.serviceTagTxt}>{sv}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Internal Note */}
              <View style={s.noteSection}>
                <View style={s.noteSectionHeader}>
                  <Ionicons name="lock-closed-outline" size={13} color="#7c3aed" />
                  <Text style={s.noteSectionTitle}>Ghi chú nội bộ</Text>
                  <View style={s.internalTag}><Text style={s.internalTagTxt}>Chỉ Staff thấy</Text></View>
                  <TouchableOpacity onPress={() => { setNoteInput(detail.internalNote || ""); setEditNote(true); }} style={s.editNoteBtn}>
                    <Ionicons name="pencil-outline" size={13} color="#7c3aed" />
                    <Text style={s.editNoteTxt}>Sửa</Text>
                  </TouchableOpacity>
                </View>
                {editNote ? (
                  <View>
                    <TextInput
                      style={s.noteInput}
                      value={noteInput}
                      onChangeText={setNoteInput}
                      placeholder="Nhập ghi chú nội bộ..."
                      placeholderTextColor="#b0bdd8"
                      multiline
                      numberOfLines={3}
                    />
                    <View style={s.noteActions}>
                      <TouchableOpacity style={s.noteSaveBtn} onPress={saveNote}>
                        <Text style={s.noteSaveTxt}>Lưu ghi chú</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.noteCancelBtn} onPress={() => setEditNote(false)}>
                        <Text style={s.noteCancelTxt}>Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={[s.noteTxt, !detail.internalNote && { color: "#c0cbe8", fontStyle: "italic" }]}>
                    {detail.internalNote || "Chưa có ghi chú..."}
                  </Text>
                )}
              </View>

              {/* Audit Log */}
              <View style={s.auditSection}>
                <View style={s.auditHeader}>
                  <Ionicons name="time-outline" size={14} color="#2856d6" />
                  <Text style={s.auditTitle}>Nhật ký thao tác</Text>
                </View>
                {(detail.auditLog || []).map((log, i, arr) => (
                  <View key={i} style={s.auditItem}>
                    <View style={s.auditTimeline}>
                      <View style={[s.auditDot, { backgroundColor: i === arr.length - 1 ? "#2856d6" : "#c0cbe8" }]} />
                      {i < arr.length - 1 && <View style={s.auditLine} />}
                    </View>
                    <View style={s.auditContent}>
                      <Text style={s.auditAction}>{log.action}</Text>
                      <Text style={s.auditActor}>{log.actor}</Text>
                      <Text style={s.auditTime}>{log.time}</Text>
                      {log.note && <Text style={s.auditNote}>"{log.note}"</Text>}
                    </View>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <Text style={s.actionsTitle}>Thao tác nhanh</Text>
              <View style={s.modalActions}>
                {detail.status !== "completed" && detail.status !== "cancelled" && (
                  <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#dcfce7" }]}
                    onPress={() => { setShowDetail(false); setTimeout(() => updateStatus(detail, "completed"), 300); }}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                    <Text style={[s.modalActionTxt, { color: "#16a34a" }]}>Hoàn tất</Text>
                  </TouchableOpacity>
                )}
                {detail.status !== "cancelled" && detail.status !== "completed" && detail.status !== "disputed" && (
                  <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#fee2e2" }]}
                    onPress={() => { setShowDetail(false); setTimeout(() => updateStatus(detail, "cancelled"), 300); }}>
                    <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                    <Text style={[s.modalActionTxt, { color: "#dc2626" }]}>Hủy booking</Text>
                  </TouchableOpacity>
                )}
                {detail.status !== "disputed" && detail.status !== "cancelled" && detail.status !== "completed" && (
                  <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#ede9fe" }]}
                    onPress={() => { setShowDetail(false); setTimeout(() => updateStatus(detail, "disputed"), 300); }}>
                    <Ionicons name="alert-circle-outline" size={16} color="#7c3aed" />
                    <Text style={[s.modalActionTxt, { color: "#7c3aed" }]}>Tranh chấp</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#fef9c3" }]}
                  onPress={() => { setShowDetail(false); router.push("/staff-voucher-send" as any); }}>
                  <Ionicons name="ticket-outline" size={16} color="#d97706" />
                  <Text style={[s.modalActionTxt, { color: "#d97706" }]}>Gửi voucher</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#eaf0ff" }]}
                  onPress={() => { setShowDetail(false); router.push("/staff-livechat" as any); }}>
                  <Ionicons name="chatbubble-outline" size={16} color="#2856d6" />
                  <Text style={[s.modalActionTxt, { color: "#2856d6" }]}>Mở Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: "#f0fdf4" }]}
                  onPress={() => { setShowDetail(false); router.push("/staff-refund-management" as any); }}>
                  <Ionicons name="refresh-outline" size={16} color="#16a34a" />
                  <Text style={[s.modalActionTxt, { color: "#16a34a" }]}>Xử lý hoàn tiền</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <DetailModal />

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Quản lý Booking</Text>
          <Text style={s.headerSub}>{filtered.length} kết quả</Text>
        </View>
        {slaAlerts.length > 0 && (
          <View style={s.slaBannerSmall}>
            <Ionicons name="warning-outline" size={13} color="#dc2626" />
            <Text style={s.slaBannerTxt}>{slaAlerts.length} SLA</Text>
          </View>
        )}
      </View>

      {/* SLA Warning */}
      {slaAlerts.length > 0 && (
        <View style={s.slaFullBanner}>
          <Ionicons name="time-outline" size={15} color="#dc2626" />
          <Text style={s.slaFullTxt}>
            {slaAlerts.length} booking chờ HDV quá {Math.max(...slaAlerts.map(b => b.slaMinutes || 0))} phút — cần can thiệp ngay!
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm mã, tên tour, SĐT, khách hàng..."
          value={search}
          onChangeText={v => { setSearch(v); setPage(1); }}
          placeholderTextColor="#b0bdd8"
        />
        {!!search && (
          <TouchableOpacity onPress={() => { setSearch(""); setPage(1); }}>
            <Ionicons name="close-circle" size={16} color="#8ea0d6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => {
          const count = bookings.filter(FILTER_MAP[f]).length;
          return (
            <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]}
              onPress={() => { setFilter(f); setPage(1); }}>
              <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
              <View style={[s.filterCount, filter === f && s.filterCountActive]}>
                <Text style={[s.filterCountTxt, filter === f && { color: "#f59e0b" }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 96 }]}>
        {/* KPI Summary */}
        <View style={s.summaryRow}>
          {[
            { label: "Tổng",       value: bookings.length,                                                                  color: "#2856d6" },
            { label: "Chờ",        value: bookings.filter(b => b.status === "pending" || b.status === "pending_guide").length, color: "#d97706" },
            { label: "Đang đi",    value: bookings.filter(b => b.status === "on_tour" || b.status === "checked_in").length,    color: "#0284c7" },
            { label: "Tranh chấp", value: bookings.filter(b => b.status === "disputed").length,                              color: "#7c3aed" },
            { label: "Doanh thu",  value: `${(totalRev / 1000000).toFixed(1)}tr`,                                            color: "#16a34a" },
          ].map((item, i) => (
            <View key={i} style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có booking nào</Text>
          </View>
        )}

        {paginated.map(b => {
          const meta       = STATUS_META[b.status] ?? STATUS_META.pending;
          const isSLA      = (b.slaMinutes || 0) > 60;
          const isDisputed = b.status === "disputed";
          return (
            <TouchableOpacity key={b.id} style={[s.card, isSLA && s.cardSLA, isDisputed && s.cardDisputed]}
              onPress={() => openDetail(b)} activeOpacity={0.85}>
              {isSLA && (
                <View style={s.slaStrip}>
                  <Ionicons name="time-outline" size={11} color="#dc2626" />
                  <Text style={s.slaStripTxt}>SLA vượt {b.slaMinutes} phút — cần xử lý ngay</Text>
                </View>
              )}
              <View style={s.cardHeader}>
                <View style={s.cardIdRow}>
                  <Text style={s.cardId}>#{b.id}</Text>
                  {b.tourCode && <Text style={s.tourCode}>{b.tourCode}</Text>}
                </View>
                <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: meta.color }]} />
                  <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={s.tourName} numberOfLines={1}>{b.tourName}</Text>
              <View style={s.infoGrid}>
                {[
                  { icon: "person-outline",   val: b.customerName || "---" },
                  { icon: "compass-outline",  val: b.guideName },
                  { icon: "people-outline",   val: `${b.guests} khách` },
                  { icon: "calendar-outline", val: b.tourDate },
                ].map((item, i) => (
                  <View key={i} style={s.infoItem}>
                    <Ionicons name={item.icon as any} size={11} color="#8ea0d6" />
                    <Text style={s.infoTxt}>{item.val}</Text>
                  </View>
                ))}
              </View>
              {b.internalNote ? (
                <View style={s.notePreview}>
                  <Ionicons name="lock-closed-outline" size={10} color="#7c3aed" />
                  <Text style={s.notePreviewTxt} numberOfLines={1}>{b.internalNote}</Text>
                </View>
              ) : null}
              <View style={s.cardFooter}>
                <Text style={s.price}>{fmt(b.totalAmount)}</Text>
                <View style={s.footerBtns}>
                  <TouchableOpacity style={s.detailBtn} onPress={() => openDetail(b)}>
                    <Ionicons name="eye-outline" size={12} color="#2856d6" />
                    <Text style={s.detailBtnTxt}>Chi tiết</Text>
                  </TouchableOpacity>
                  {b.status !== "completed" && b.status !== "cancelled" && b.status !== "disputed" && (
                    <TouchableOpacity style={[s.quickBtn, { backgroundColor: "#dcfce7" }]}
                      onPress={() => updateStatus(b, "completed")}>
                      <Ionicons name="checkmark" size={12} color="#16a34a" />
                      <Text style={[s.quickBtnTxt, { color: "#16a34a" }]}>Xong</Text>
                    </TouchableOpacity>
                  )}
                  {b.status !== "cancelled" && b.status !== "completed" && b.status !== "disputed" && (
                    <TouchableOpacity style={[s.quickBtn, { backgroundColor: "#fee2e2" }]}
                      onPress={() => updateStatus(b, "cancelled")}>
                      <Ionicons name="close" size={12} color="#dc2626" />
                      <Text style={[s.quickBtnTxt, { color: "#dc2626" }]}>Hủy</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <Ionicons name="chevron-back" size={16} color={page === 1 ? "#c0cbe8" : "#2856d6"} />
            </TouchableOpacity>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <TouchableOpacity key={p} style={[s.pageNum, page === p && s.pageNumActive]} onPress={() => setPage(p)}>
                <Text style={[s.pageNumTxt, page === p && s.pageNumTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <Ionicons name="chevron-forward" size={16} color={page === totalPages ? "#c0cbe8" : "#2856d6"} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={s.pageInfo}>
          {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} booking
        </Text>
      </ScrollView>
      <StaffTabBar activeRoute="/staff-booking-management" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerSub:        { fontSize: 11, color: "#7a8cc2", marginTop: 1 },
  slaBannerSmall:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fee2e2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  slaBannerTxt:     { color: "#dc2626", fontWeight: "800", fontSize: 11 },
  slaFullBanner:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff5f5", borderBottomWidth: 1, borderBottomColor: "#fecaca", paddingHorizontal: 18, paddingVertical: 10 },
  slaFullTxt:       { flex: 1, color: "#dc2626", fontSize: 12, fontWeight: "700" },
  searchBox:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, margin: 14, marginBottom: 0 },
  searchInput:      { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow:        { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:     { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  filterTxt:        { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive:  { color: "#fff" },
  filterCount:      { backgroundColor: "#eaf0ff", borderRadius: 999, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterCountActive:{ backgroundColor: "rgba(255,255,255,0.25)" },
  filterCountTxt:   { color: "#2856d6", fontSize: 10, fontWeight: "800" },
  content:          { padding: 14, paddingTop: 0 },
  summaryRow:       { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 14, justifyContent: "space-between" },
  summaryItem:      { alignItems: "center", flex: 1 },
  summaryValue:     { fontSize: 16, fontWeight: "900" },
  summaryLabel:     { color: "#7a8cc2", fontSize: 9, fontWeight: "600", marginTop: 2 },
  emptyCard:        { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:         { color: "#7a8cc2" },
  card:             { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", padding: 14, marginBottom: 10, overflow: "hidden" },
  cardSLA:          { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  cardDisputed:     { borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
  slaStrip:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff5f5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8 },
  slaStripTxt:      { color: "#dc2626", fontSize: 11, fontWeight: "700", flex: 1 },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardIdRow:        { flexDirection: "row", alignItems: "center", gap: 6 },
  cardId:           { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  tourCode:         { color: "#c0cbe8", fontSize: 10, fontWeight: "600" },
  statusBadge:      { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  statusTxt:        { fontSize: 11, fontWeight: "700" },
  tourName:         { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 8 },
  infoGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  infoItem:         { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f3f7ff", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  infoTxt:          { color: "#5f73a9", fontSize: 11, fontWeight: "600" },
  notePreview:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f0ff", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  notePreviewTxt:   { color: "#7c3aed", fontSize: 11, flex: 1 },
  cardFooter:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f4ff", paddingTop: 10 },
  price:            { color: "#2856d6", fontWeight: "800", fontSize: 15 },
  footerBtns:       { flexDirection: "row", gap: 6 },
  detailBtn:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  detailBtnTxt:     { color: "#2856d6", fontSize: 11, fontWeight: "700" },
  quickBtn:         { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  quickBtnTxt:      { fontSize: 11, fontWeight: "700" },
  pagination:       { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 4 },
  pageBtn:          { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", alignItems: "center", justifyContent: "center" },
  pageBtnDisabled:  { opacity: 0.4 },
  pageNum:          { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", alignItems: "center", justifyContent: "center" },
  pageNumActive:    { backgroundColor: "#2856d6", borderColor: "#2856d6" },
  pageNumTxt:       { color: "#5f73a9", fontSize: 13, fontWeight: "700" },
  pageNumTxtActive: { color: "#fff" },
  pageInfo:         { color: "#94a3b8", fontSize: 11, textAlign: "center", marginBottom: 8 },
  modalOverlay:     { flex: 1, justifyContent: "flex-end" },
  modalBackdrop:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.55)" },
  modalSheet:       { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%" },
  modalHandle:      { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:       { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  modalSub:         { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  closeBtn:         { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:        { padding: 20, paddingBottom: 40 },
  modalStatusBar:   { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, marginBottom: 16 },
  modalStatusDot:   { width: 8, height: 8, borderRadius: 4 },
  modalStatusTxt:   { fontWeight: "800", fontSize: 14, flex: 1 },
  slaBadge:         { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  slaBadgeTxt:      { color: "#dc2626", fontSize: 10, fontWeight: "700" },
  infoSection:      { backgroundColor: "#f8faff", borderRadius: 14, marginBottom: 14, overflow: "hidden" },
  detailRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon:       { width: 26, height: 26, borderRadius: 7, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  detailLabel:      { color: "#7a8cc2", fontSize: 12, width: 95 },
  detailValue:      { flex: 1, color: "#1f2a58", fontWeight: "600", fontSize: 13, textAlign: "right" },
  servicesBox:      { backgroundColor: "#f3f7ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  servicesTitle:    { color: "#1f2a58", fontWeight: "700", fontSize: 12, marginBottom: 8 },
  servicesTags:     { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  serviceTag:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  serviceTagTxt:    { color: "#2856d6", fontSize: 11, fontWeight: "600" },
  noteSection:      { backgroundColor: "#f5f0ff", borderRadius: 12, padding: 12, marginBottom: 14 },
  noteSectionHeader:{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  noteSectionTitle: { color: "#7c3aed", fontWeight: "700", fontSize: 12, flex: 1 },
  internalTag:      { backgroundColor: "#ede9fe", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  internalTagTxt:   { color: "#7c3aed", fontSize: 9, fontWeight: "700" },
  editNoteBtn:      { flexDirection: "row", alignItems: "center", gap: 3 },
  editNoteTxt:      { color: "#7c3aed", fontSize: 11, fontWeight: "700" },
  noteTxt:          { color: "#5f4b8b", fontSize: 12, lineHeight: 18 },
  noteInput:        { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#ddd6fe", padding: 10, color: "#1f2a58", fontSize: 13, minHeight: 70, textAlignVertical: "top" },
  noteActions:      { flexDirection: "row", gap: 8, marginTop: 8 },
  noteSaveBtn:      { flex: 1, backgroundColor: "#7c3aed", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  noteSaveTxt:      { color: "#fff", fontWeight: "700", fontSize: 13 },
  noteCancelBtn:    { backgroundColor: "#f3f0ff", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  noteCancelTxt:    { color: "#7c3aed", fontWeight: "700", fontSize: 13 },
  auditSection:     { backgroundColor: "#f8faff", borderRadius: 12, padding: 14, marginBottom: 14 },
  auditHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  auditTitle:       { color: "#2856d6", fontWeight: "700", fontSize: 13 },
  auditItem:        { flexDirection: "row", gap: 12 },
  auditTimeline:    { alignItems: "center", width: 14 },
  auditDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  auditLine:        { width: 2, flex: 1, backgroundColor: "#e4ebff", marginTop: 2, marginBottom: 2 },
  auditContent:     { flex: 1, paddingBottom: 14 },
  auditAction:      { color: "#1f2a58", fontWeight: "700", fontSize: 12 },
  auditActor:       { color: "#7a8cc2", fontSize: 11, marginTop: 1 },
  auditTime:        { color: "#b0bdd8", fontSize: 10, marginTop: 1 },
  auditNote:        { color: "#7c3aed", fontSize: 11, fontStyle: "italic", marginTop: 3 },
  actionsTitle:     { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  modalActions:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalActionBtn:   { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  modalActionTxt:   { fontSize: 13, fontWeight: "700" },
});