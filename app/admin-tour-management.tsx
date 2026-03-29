/**
 * app/admin-tour-management.tsx
 * Quản lý Tour - GIỮ NGUYÊN GIAO DIỆN CŨ
 * Chỉ thêm logic: Tính toán Giờ kết thúc tự động dựa vào Thời lượng (Duration)
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOURS, GUIDES } from "@/constants/travel-data";

const STORAGE_KEY = "@app_tours";

type TourStatus = "active" | "full" | "draft";
interface AppliedGuide { id: string; name: string; note: string; vneidVerified?: boolean; }
interface RejectedGuide { id: string; name: string; reason: string; }
interface TourReport { id: string; guideName: string; text: string; date: string; isResolved: boolean; }

interface Tour {
  id: string; name: string; category: string; duration: string;
  price: string; priceRaw: number;
  rating: number; reviewCount: number;
  totalBookings: number;
  departure: string; status: TourStatus; tags: string[]; color: string;
  description: string;
  pointsReward?: number; 
  reviewPoints?: number;
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[];
  rejectedGuides?: RejectedGuide[];
  reports?: TourReport[];
  schedules?: any[]; // THÊM TRƯỜNG DỮ LIỆU LỊCH TRÌNH
}

const CATEGORIES = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];

// THUẬT TOÁN TÍNH GIỜ: Bóc tách chuỗi thời lượng (VD: "3 ngày 2 đêm", "5 tiếng") thành Giờ
const parseDurationToHours = (duration: string) => {
  const str = (duration || "").toLowerCase();
  let hours = 0;
  const dayMatch = str.match(/(\d+)\s*(ngày|n)/);
  if (dayMatch) hours += parseInt(dayMatch[1]) * 24;
  const hourMatch = str.match(/(\d+)\s*(tiếng|giờ|h)/);
  if (hourMatch) hours += parseInt(hourMatch[1]);
  return hours > 0 ? hours : 24; // Mặc định 1 ngày nếu không phân tích được
};

const generateSeedTours = (): Tour[] => {
  return TOURS.map((t, index) => {
    let assigned: string[] = [];
    let applied: AppliedGuide[] = [];
    if (index === 0) assigned = [GUIDES[0].name];
    if (index === 1) applied = [{ id: GUIDES[1].id, name: GUIDES[1].name, note: "Tôi chuyên dẫn tuyến này, thuộc từng ngóc ngách.", vneidVerified: true }];
    if (index === 2) applied = [
      { id: GUIDES[2].id, name: GUIDES[2].name, note: "Đã dẫn đoàn gia đình nhiều lần.", vneidVerified: true },
      { id: GUIDES[3].id, name: GUIDES[3].name, note: "Sẵn sàng nhận tour tuần này.", vneidVerified: false },
    ];
    return {
      id: t.id, name: t.name, category: t.category, duration: t.duration,
      price: t.price, priceRaw: parseInt(t.price.replace(/\D/g, "")) || 0,
      rating: t.rating, reviewCount: Math.floor(Math.random() * 200) + 15,
      totalBookings: Math.floor(Math.random() * 500) + 50, departure: t.departure,
      status: "active" as TourStatus, tags: t.tags, color: t.color,
      description: t.summary || "Chưa có mô tả chi tiết.",
      assignedGuideNames: assigned, appliedGuides: applied, rejectedGuides: [], reports: [], schedules: []
    };
  });
};

const docTien = (number: number) => {
  if (!number || number === 0) return "0 đồng";
  let result = ""; let temp = number;
  if (temp >= 1000000000) { result += Math.floor(temp / 1000000000) + " tỷ "; temp %= 1000000000; }
  if (temp >= 1000000) { result += Math.floor(temp / 1000000) + " triệu "; temp %= 1000000; }
  if (temp >= 1000) { result += Math.floor(temp / 1000) + " nghìn "; temp %= 1000; }
  if (temp > 0) result += temp + " ";
  return result.trim() + " đồng";
};

export default function AdminTourManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [tours, setTours] = useState<Tour[]>([]);
  const [filterCat, setFilterCat] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState<TourStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTour, setEditingTour] = useState<Partial<Tour>>({});
  const [priceInput, setPriceInput] = useState("");
  const [newStart, setNewStart] = useState(""); // unused legacy

  // ── SCHEDULE INPUT STATE ─────────────────────────────────────────────────
  const [durationDays,   setDurationDays]   = useState("");
  const [durationHours2, setDurationHours2] = useState("");
  const [durationMins,   setDurationMins]   = useState("");

  const [schDay,  setSchDay]  = useState("");
  const [schMon,  setSchMon]  = useState("");
  const [schYear, setSchYear] = useState("");
  const [schHH,   setSchHH]   = useState("");
  const [schMM,   setSchMM]   = useState("");
  const [schError, setSchError] = useState("");

  // ── DATE PICKER MODAL STATE ──────────────────────────────────────────────
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerViewYear,  setPickerViewYear]  = useState(new Date().getFullYear());
  const [pickerViewMonth, setPickerViewMonth] = useState(new Date().getMonth()); // 0-11
  const [pickerSelDay,    setPickerSelDay]    = useState<number | null>(null);
  const [pickerSelMon,    setPickerSelMon]    = useState<number | null>(null);
  const [pickerSelYear,   setPickerSelYear]   = useState<number | null>(null);

  // ── TIME PICKER MODAL STATE ──────────────────────────────────────────────
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerHH, setPickerHH] = useState(8);
  const [pickerMM, setPickerMM] = useState(0);

  const refMon   = useRef<any>(null);
  const refYear  = useRef<any>(null);
  const refHH    = useRef<any>(null);
  const refSchMM = useRef<any>(null);

  // Helper: sinh các ngày trong tháng cho calendar picker
  const buildCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const MONTH_NAMES = ["Th.1","Th.2","Th.3","Th.4","Th.5","Th.6","Th.7","Th.8","Th.9","Th.10","Th.11","Th.12"];
  const DAY_NAMES   = ["T2","T3","T4","T5","T6","T7","CN"];

  const isDateDisabled = (year: number, month: number, day: number) => {
    const sel = new Date(year, month, day);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1); // tối thiểu ngày mai
    minDate.setHours(0,0,0,0);
    return sel < minDate;
  };

  const openDatePicker = () => {
    // Khởi tạo về tháng hiện tại
    const now = new Date();
    setPickerViewYear(now.getFullYear());
    setPickerViewMonth(now.getMonth());
    if (schDay && schMon && schYear && schYear.length === 4) {
      setPickerSelDay(parseInt(schDay));
      setPickerSelMon(parseInt(schMon) - 1);
      setPickerSelYear(parseInt(schYear));
    } else {
      setPickerSelDay(null); setPickerSelMon(null); setPickerSelYear(null);
    }
    setDatePickerVisible(true);
  };

  const confirmDatePicker = () => {
    if (pickerSelDay && pickerSelMon !== null && pickerSelYear) {
      setSchDay(String(pickerSelDay).padStart(2,"0"));
      setSchMon(String(pickerSelMon + 1).padStart(2,"0"));
      setSchYear(String(pickerSelYear));
    }
    setDatePickerVisible(false);
  };

  const openTimePicker = () => {
    setPickerHH(schHH ? parseInt(schHH) : 8);
    setPickerMM(schMM ? parseInt(schMM) : 0);
    setTimePickerVisible(true);
  };

  const confirmTimePicker = () => {
    setSchHH(String(pickerHH).padStart(2,"0"));
    setSchMM(String(pickerMM).padStart(2,"0"));
    setTimePickerVisible(false);
  };

  // Tính preview giờ kết thúc
  const computePreview = (): { start: Date | null; end: Date | null } => {
    const d = parseInt(durationDays   || "0");
    const h = parseInt(durationHours2 || "0");
    const m = parseInt(durationMins   || "0");
    const totalMs = (d * 24 * 60 + h * 60 + m) * 60 * 1000;

    const dd   = schDay.padStart(2,"0");
    const mm   = schMon.padStart(2,"0");
    const yyyy = schYear;
    const hh   = schHH.padStart(2,"0");
    const min  = schMM.padStart(2,"0");

    if (!dd || !mm || !yyyy || yyyy.length < 4 || !schDay || !schMon) return { start: null, end: null };
    const iso = `${yyyy}-${mm}-${dd}T${hh||"00"}:${min||"00"}:00`;
    const start = new Date(iso);
    if (isNaN(start.getTime())) return { start: null, end: null };
    const end = totalMs > 0 ? new Date(start.getTime() + totalMs) : null;
    return { start, end };
  };

  const { start: previewStart, end: previewEnd } = computePreview();

  const resetSchFields = () => {
    setSchDay(""); setSchMon(""); setSchYear("");
    setSchHH(""); setSchMM(""); setSchError("");
  };

  const [biddingTour, setBiddingTour] = useState<Tour | null>(null);
  const [guideProfiles, setGuideProfiles] = useState<Record<string, any>>({}); // cache profile HDV từ @app_guides
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; guideId: string; guideName: string; reason: string }>({ visible: false, guideId: "", guideName: "", reason: "" });
  const [reportsModal, setReportsModal] = useState<{ visible: boolean; tour: Tour | null }>({ visible: false, tour: null });
  const [pendingTasksModal, setPendingTasksModal] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error"; title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadTours(); }, []));

  const loadTours = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let tourList: Tour[] = [];
      if (raw) {
        tourList = JSON.parse(raw);
      } else {
        tourList = generateSeedTours();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tourList));
      }

      // ── MERGE đơn đăng ký nhận tour từ HDV ─────────────────────────────
      // HDV đăng ký nhận tour ghi vào key: @guide_tour_applications
      // Format mỗi item: { id, guideId, guideName, guideNote, tourId, vneidVerified, status: "pending"|"approved"|"rejected", createdAt }
      const rawApps = await AsyncStorage.getItem("@guide_tour_applications");
      if (rawApps) {
        const apps: any[] = JSON.parse(rawApps);
        const pendingApps = apps.filter((a: any) => a.status === "pending");
        tourList = tourList.map(tour => {
          const newApplicants = pendingApps
            .filter((a: any) => a.tourId === tour.id)
            .filter((a: any) => !(tour.appliedGuides || []).some(g => g.id === a.guideId))
            .map((a: any) => ({
              id: a.guideId,
              name: a.guideName,
              note: a.guideNote || "Không có ghi chú.",
              vneidVerified: a.vneidVerified || false,
              applicationId: a.id,
            }));
          if (newApplicants.length === 0) return tour;
          return { ...tour, appliedGuides: [...(tour.appliedGuides || []), ...newApplicants] };
        });
      }
      setTours(tourList);

      // ── Load profile HDV từ @app_guides để hiển thị trong biddingModal ──
      const rawGuides = await AsyncStorage.getItem("@app_guides");
      if (rawGuides) {
        const guidesList: any[] = JSON.parse(rawGuides);
        const profileMap: Record<string, any> = {};
        guidesList.forEach(g => { profileMap[g.id] = g; });
        setGuideProfiles(profileMap);
      }
    } catch (e) { setTours([]); }
  };

  const saveToursData = async (updatedTours: Tour[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTours));
    setTours(updatedTours);
  };

  const handlePriceChange = (val: string) => {
    const numericOnly = val.replace(/\D/g, "");
    if (!numericOnly) { setPriceInput(""); setEditingTour(prev => ({ ...prev, priceRaw: 0, price: "0đ" })); return; }
    const formatted = parseInt(numericOnly, 10).toLocaleString("vi-VN");
    setPriceInput(formatted);
    setEditingTour(prev => ({ ...prev, priceRaw: parseInt(numericOnly, 10), price: `${formatted}đ` }));
  };

  const openModal = (tour?: Tour) => {
    if (tour) { 
      setEditingTour(tour); 
      setPriceInput((tour.priceRaw || 0).toLocaleString("vi-VN")); 
    }
    else {
      setEditingTour({
        id: `t-${Date.now()}`, name: "", category: "Biển đảo", duration: "1N1Đ", status: "active",
        totalBookings: 0, departure: "TP. HCM", rating: 0, reviewCount: 0, description: "", 
        pointsReward: 100, // <-- THÊM DÒNG NÀY (Mặc định 100đ khi hoàn thành)
        reviewPoints: 50,   // <-- THÊM DÒNG NÀY (Mặc định 50đ khi review)
        assignedGuideNames: [], appliedGuides: [], tags: [], color: "#4f7cff", priceRaw: 0, price: "0đ", schedules: []
      });
      setPriceInput("");
    }
    setNewStart("");
    // Reset duration fields
    setDurationDays(""); setDurationHours2(""); setDurationMins("");
    resetSchFields();
    setModalVisible(true);
  };

  // LOGIC THÊM LỊCH TRÌNH TỰ TÍNH GIỜ
  const handleAddSchedule = () => {
    setSchError("");

    // Validate thời lượng
    const d = parseInt(durationDays  || "0");
    const h = parseInt(durationHours2 || "0");
    const m = parseInt(durationMins  || "0");
    const totalMins = d * 24 * 60 + h * 60 + m;
    if (totalMins <= 0) {
      setSchError("⚠ Vui lòng nhập thời lượng tour (ngày/giờ/phút).");
      return;
    }

    // Validate ngày + giờ
    const dd   = schDay.padStart(2,"0");
    const mm   = schMon.padStart(2,"0");
    const yyyy = schYear;
    const hh   = schHH.padStart(2,"0");
    const min  = schMM.padStart(2,"0");

    if (!dd || !mm || !yyyy || yyyy.length < 4 || !schDay || !schMon) {
      setSchError("⚠ Vui lòng nhập đủ ngày, tháng, năm.");
      return;
    }

    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    const start = new Date(iso);
    if (isNaN(start.getTime())) {
      setSchError("⚠ Ngày/giờ không hợp lệ. Kiểm tra lại DD/MM/YYYY và HH:MM.");
      return;
    }

    // Không được ở quá khứ
    const now = new Date();
    if (start <= now) {
      setSchError("⚠ Thời gian bắt đầu phải ở tương lai.");
      return;
    }

    // Phải nhập trước ít nhất 1 ngày so với thời điểm hiện tại
    const minAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (start < minAllowed) {
      setSchError("⚠ Lịch khởi hành phải cách hiện tại ít nhất 1 ngày.");
      return;
    }

    // Kiểm tra trùng với lịch đã có
    const isDup = (editingTour.schedules || []).some(
      (s: any) => new Date(s.startTime).getTime() === start.getTime()
    );
    if (isDup) {
      setSchError("⚠ Lịch khởi hành này đã tồn tại.");
      return;
    }

    const totalMs = totalMins * 60 * 1000;
    const end = new Date(start.getTime() + totalMs);

    // Cập nhật duration vào editingTour
    const durationStr = [
      d > 0 ? `${d} ngày` : "",
      h > 0 ? `${h} giờ` : "",
      m > 0 ? `${m} phút` : "",
    ].filter(Boolean).join(" ");

    const newSchedule = {
      id: `sch-${Date.now()}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    setEditingTour(prev => ({
      ...prev,
      duration: durationStr || prev.duration,
      schedules: [...(prev.schedules || []), newSchedule],
    }));
    resetSchFields();
  };

  const saveTour = async () => {
    if (!editingTour.name || !editingTour.priceRaw) {
      setConfirmPopup({ visible: true, type: "error", title: "Thiếu thông tin", message: "Vui lòng nhập Tên Tour và Giá tiền." });
      return;
    }
    let updated = [...tours];
    const isNew = !tours.find(t => t.id === editingTour.id);
    if (isNew) updated.unshift(editingTour as Tour);
    else updated = updated.map((t) => t.id === editingTour.id ? editingTour as Tour : t);
    await saveToursData(updated);
    setModalVisible(false);
    setConfirmPopup({ visible: true, type: "success", title: "Đã lưu", message: "Thông tin Tour đã cập nhật." });
  };

  const promptDelete = (id: string, name: string) => setConfirmPopup({ visible: true, type: "delete", title: "Xóa Tour", message: `Bạn có chắc muốn xóa tour "${name}"?`, targetId: id });
  
  const executeDelete = async () => {
    if (!confirmPopup.targetId) return;
    const updated = tours.filter((t) => t.id !== confirmPopup.targetId);
    await saveToursData(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Tour đã được xóa." });
  };

  const handleApproveProposal = async (tourId: string) => {
    const updated = tours.map(t => t.id === tourId ? { ...t, status: "active" as TourStatus, description: `[Đề xuất từ HDV] ${t.description || ""}` } : t);
    await saveToursData(updated);
    setConfirmPopup({ visible: true, type: "success", title: "Đã phê duyệt", message: "Đề xuất Tour đã xuất bản." });
  };

  const handleApproveGuide = async (guide: AppliedGuide) => {
    if (!biddingTour) return;
    try {
      // 1. Cập nhật tour: chuyển HDV từ appliedGuides → assignedGuideNames
      const updatedTour = {
        ...biddingTour,
        appliedGuides: biddingTour.appliedGuides.filter(g => g.id !== guide.id),
        assignedGuideNames: [...(biddingTour.assignedGuideNames || []), guide.name],
      };
      const updatedTours = tours.map(t => t.id === updatedTour.id ? updatedTour : t);
      await saveToursData(updatedTours);
      setBiddingTour(updatedTour);

      // 2. Cập nhật status đơn trong @guide_tour_applications → "approved"
      const guideAny = guide as any;
      if (guideAny.applicationId) {
        const rawApps = await AsyncStorage.getItem("@guide_tour_applications");
        if (rawApps) {
          const apps: any[] = JSON.parse(rawApps);
          const updatedApps = apps.map((a: any) =>
            a.id === guideAny.applicationId ? { ...a, status: "approved", approvedAt: new Date().toISOString() } : a
          );
          await AsyncStorage.setItem("@guide_tour_applications", JSON.stringify(updatedApps));
        }
      }

      // 3. Gắn tourId vào tài khoản HDV trong @app_users
      const rawUsers = await AsyncStorage.getItem("@app_users");
      if (rawUsers) {
        const usersList: any[] = JSON.parse(rawUsers);
        const uIdx = usersList.findIndex((u: any) => u.accountId === guide.id || u.guideId === guide.id);
        if (uIdx >= 0) {
          if (!usersList[uIdx].assignedTourIds) usersList[uIdx].assignedTourIds = [];
          if (!usersList[uIdx].assignedTourIds.includes(biddingTour.id)) {
            usersList[uIdx].assignedTourIds.push(biddingTour.id);
          }
          await AsyncStorage.setItem("@app_users", JSON.stringify(usersList));
        }
      }

      // 4. Thông báo cho HDV tại @guide_notifications_<guideId>
      const notifKey = "@guide_notifications_" + guide.id;
      const rawNotifs = await AsyncStorage.getItem(notifKey);
      const notifs: any[] = rawNotifs ? JSON.parse(rawNotifs) : [];
      notifs.unshift({
        id: "notif-" + Date.now(),
        type: "tour_approved",
        title: "Bạn đã được phân công dẫn tour!",
        body: "Bạn được phân công dẫn tour: " + biddingTour.name,
        tourId: biddingTour.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(notifKey, JSON.stringify(notifs));

      // 5. Lưu vào @guide_assigned_tours_<guideId> để HDV lấy danh sách tour được giao
      const assignedKey = "@guide_assigned_tours_" + guide.id;
      const rawAssigned = await AsyncStorage.getItem(assignedKey);
      const assignedList: any[] = rawAssigned ? JSON.parse(rawAssigned) : [];
      if (!assignedList.find((t: any) => t.tourId === biddingTour.id)) {
        assignedList.unshift({
          tourId: biddingTour.id,
          tourName: biddingTour.name,
          tourCategory: biddingTour.category,
          tourDuration: biddingTour.duration,
          tourPrice: biddingTour.price,
          departure: biddingTour.departure,
          assignedAt: new Date().toISOString(),
          schedules: biddingTour.schedules || [],
        });
        await AsyncStorage.setItem(assignedKey, JSON.stringify(assignedList));
      }

      setConfirmPopup({ visible: true, type: "success", title: "Đã phân công", message: "Đã cấp quyền dẫn tour cho " + guide.name + "." });
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể lưu phân công. Thử lại sau." });
    }
  };

  const promptRejectGuide = (guideId: string, guideName: string) => {
    setRejectModal({ visible: true, guideId, guideName, reason: "" });
  };

  const executeRejectGuide = async () => {
    if (!biddingTour) return;
    const { guideId, guideName, reason } = rejectModal;
    try {
      const updatedTour = {
        ...biddingTour,
        appliedGuides: biddingTour.appliedGuides.filter(g => g.id !== guideId),
        rejectedGuides: [...(biddingTour.rejectedGuides || []), {
          id: guideId, name: guideName,
          reason: reason || "Không phù hợp với lịch trình hiện tại."
        }]
      };
      const updatedTours = tours.map(t => t.id === updatedTour.id ? updatedTour : t);
      await saveToursData(updatedTours);
      setBiddingTour(updatedTour);

      // Cập nhật @guide_tour_applications → "rejected"
      const rawApps = await AsyncStorage.getItem("@guide_tour_applications");
      if (rawApps) {
        const apps: any[] = JSON.parse(rawApps);
        // Tìm đơn pending của guideId cho tour này
        const updatedApps = apps.map((a: any) =>
          a.guideId === guideId && a.tourId === biddingTour.id && a.status === "pending"
            ? { ...a, status: "rejected", rejectedAt: new Date().toISOString(), rejectReason: reason || "Không phù hợp." }
            : a
        );
        await AsyncStorage.setItem("@guide_tour_applications", JSON.stringify(updatedApps));
      }

      // Thông báo từ chối cho HDV tại @guide_notifications_<guideId>
      const notifKey = "@guide_notifications_" + guideId;
      const rawNotifs = await AsyncStorage.getItem(notifKey);
      const notifs: any[] = rawNotifs ? JSON.parse(rawNotifs) : [];
      notifs.unshift({
        id: "notif-" + Date.now(),
        type: "tour_rejected",
        title: "Đơn đăng ký bị từ chối",
        body: "Đơn đăng ký tour " + biddingTour.name + " đã bị từ chối. Lý do: " + (reason || "Không phù hợp."),
        tourId: biddingTour.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(notifKey, JSON.stringify(notifs));

      setRejectModal({ visible: false, guideId: "", guideName: "", reason: "" });
      setConfirmPopup({ visible: true, type: "success", title: "Đã từ chối", message: "Đã gửi phản hồi từ chối đến " + guideName + "." });
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể lưu. Thử lại sau." });
    }
  };

  const markReportResolved = async (tourId: string, reportId: string) => {
    const updatedTours = tours.map(t => {
      if (t.id === tourId && t.reports) {
        return { ...t, reports: t.reports.map(r => r.id === reportId ? { ...r, isResolved: true } : r) };
      }
      return t;
    });
    await saveToursData(updatedTours);
    setReportsModal({ visible: false, tour: null });
    setConfirmPopup({ visible: true, type: "success", title: "Đã xử lý", message: "Báo cáo đã được đánh dấu hoàn tất." });
  };

  const filteredTours = tours.filter((t) => {
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch = (t.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  const toursNeedGuide = tours.filter(t => t.appliedGuides && t.appliedGuides.length > 0);
  const pendingDrafts = tours.filter(t => t.status === "draft");
  const pendingAppliedCount = toursNeedGuide.reduce((sum, t) => sum + (t.appliedGuides?.length || 0), 0);
  const totalPending = pendingAppliedCount + pendingDrafts.length;

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>Quản lý Tour</Text>
          <Text style={st.headerSub}>{tours.length} tour trong hệ thống</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {totalPending > 0 && (
        <TouchableOpacity style={st.notifBanner} activeOpacity={0.85} onPress={() => setPendingTasksModal(true)}>
          <View style={st.notifLeft}>
            <View style={st.notifIconBox}><Ionicons name="notifications" size={16} color="#fff" /></View>
            <View>
              <Text style={st.notifTitle}>Cần xử lý ngay</Text>
              <Text style={st.notifSub}>
                {pendingAppliedCount > 0 && `${pendingAppliedCount} HDV xin nhận tour`}
                {pendingAppliedCount > 0 && pendingDrafts.length > 0 && " · "}
                {pendingDrafts.length > 0 && `${pendingDrafts.length} đề xuất tour mới`}
              </Text>
            </View>
          </View>
          <View style={st.notifBadge}><Text style={st.notifBadgeTxt}>{totalPending}</Text></View>
        </TouchableOpacity>
      )}

      <View style={st.searchRow}>
        <View style={st.searchBox}>
          <Ionicons name="search" size={18} color="#94a8d8" />
          <TextInput style={st.searchInput} placeholder="Tìm kiếm tour..." placeholderTextColor="#94a8d8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={st.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterCatScroll} style={{ marginBottom: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[st.filterChip, filterCat === cat && st.filterChipActive]} onPress={() => setFilterCat(cat)}>
              <Text style={[st.filterTxt, filterCat === cat && st.filterTxtActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.statusTabScroll}>
          {(["all", "active", "full", "draft"] as const).map(st_ => {
            const isActive = filterStatus === st_;
            const label = st_ === "all" ? "Tất cả" : st_ === "active" ? "Đang mở" : st_ === "full" ? "Đã đầy" : "Đề xuất HDV";
            const count = st_ === "draft" ? pendingDrafts.length : st_ === "all" ? tours.length : tours.filter(t => t.status === st_).length;
            return (
              <TouchableOpacity key={st_} style={[st.statusTabBtn, isActive && st.statusTabBtnActive]} onPress={() => setFilterStatus(st_)}>
                <Text style={[st.statusTabTxt, isActive && st.statusTabTxtActive]}>{label}</Text>
                <View style={[st.statusTabCount, isActive && st.statusTabCountActive]}><Text style={[st.statusTabCountTxt, isActive && st.statusTabCountTxtActive]}>{count}</Text></View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTours}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: tour }) => {
          const unresolvedReports = tour.reports?.filter(r => !r.isResolved) || [];
          return (
          <View style={st.tourCard}>
            {unresolvedReports.length > 0 && (
              <TouchableOpacity style={st.reportAlertBanner} onPress={() => setReportsModal({ visible: true, tour })}>
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={st.reportAlertTxt}>Có {unresolvedReports.length} báo cáo sự cố từ HDV cần xử lý!</Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}

            {tour.status === "draft" && (
              <View style={st.draftBanner}>
                <Ionicons name="bulb-outline" size={13} color="#c2410c" />
                <Text style={st.draftBannerTxt}>ĐỀ XUẤT MỚI TỪ HDV · Chờ phê duyệt</Text>
              </View>
            )}

            <View style={st.cardHeader}>
              <View style={st.catBadge}>
                <View style={[st.catDot, { backgroundColor: tour.color || "#4f7cff" }]} />
                <Text style={st.catTxt}>{tour.category}</Text>
              </View>
              <View style={[st.statusBadge, { backgroundColor: tour.status === "active" ? "#d1fae5" : tour.status === "full" ? "#fee2e2" : "#fff7ed" }]}>
                <Text style={[st.statusTxt, { color: tour.status === "active" ? "#059669" : tour.status === "full" ? "#dc2626" : "#c2410c" }]}>
                  {tour.status === "active" ? "MỞ BÁN" : tour.status === "full" ? "Đã ĐẦY" : "CHỜ DUYỆT"}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => openModal(tour)} activeOpacity={0.7}>
              <Text style={st.tourName} numberOfLines={2}>{tour.name}</Text>
              <View style={st.metaGrid}>
                <View style={st.metaItem}><Ionicons name="time-outline" size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{tour.duration}</Text></View>
                <View style={st.metaItem}><Ionicons name="wallet-outline" size={12} color="#7a8cc2" /><Text style={st.metaTxt}>{tour.price}</Text></View>
              </View>
              <View style={st.guideRow}>
                <View style={st.guideIcon}><Ionicons name="person" size={12} color="#4f7cff" /></View>
                <Text style={st.guideNameTxt} numberOfLines={1}>
                  HDV: <Text style={{ fontWeight: "700", color: "#1f2a58" }}>{tour.assignedGuideNames?.length > 0 ? tour.assignedGuideNames.join(", ") : "Chưa có"}</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {tour.appliedGuides?.length > 0 && (
              <TouchableOpacity style={st.biddingBtn} onPress={() => setBiddingTour(tour)} activeOpacity={0.8}>
                <View style={st.biddingBtnLeft}>
                  <View style={st.biddingBellBox}>
                    <Ionicons name="notifications" size={14} color="#fff" />
                    <View style={st.biddingDot} />
                  </View>
                  <Text style={st.biddingBtnTxt}>{tour.appliedGuides.length} HDV xin nhận tour này</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#fff" style={{ opacity: 0.8 }} />
              </TouchableOpacity>
            )}

            <View style={st.cardActionsRow}>
              {tour.status === "draft" ? (
                <TouchableOpacity style={[st.actionBtn, { backgroundColor: "#d1fae5" }]} onPress={() => handleApproveProposal(tour.id)}>
                  <Ionicons name="checkmark-circle" size={15} color="#059669" />
                  <Text style={[st.actionBtnTxt, { color: "#059669" }]}>PHÊ DUYỆT</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={st.actionBtn} onPress={() => openModal(tour)}>
                  <Ionicons name="create-outline" size={15} color="#f59e0b" />
                  <Text style={[st.actionBtnTxt, { color: "#f59e0b" }]}>Sửa Tour</Text>
                </TouchableOpacity>
              )}
              <View style={st.actionDivider} />
              <TouchableOpacity style={st.actionBtn} onPress={() => promptDelete(tour.id, tour.name)}>
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                <Text style={[st.actionBtnTxt, { color: "#ef4444" }]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={st.sheet}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{!tours.find(t => t.id === editingTour.id) ? "Tạo Tour Mới" : "Sửa Tour"}</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Tên Tour <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={st.input} value={editingTour.name} onChangeText={(t) => setEditingTour(prev => ({ ...prev, name: t }))} placeholder="VD: Sapa 3N2Đ..." placeholderTextColor="#b0bdd8" />

              <Text style={st.inputLabel}>Mô tả chi tiết</Text>
              <TextInput style={[st.input, { height: 75, textAlignVertical: "top" }]} multiline value={editingTour.description || ""} onChangeText={(t) => setEditingTour(prev => ({ ...prev, description: t }))} placeholder="Nhập lịch trình tóm tắt..." placeholderTextColor="#b0bdd8" />

              {/* ══════════════════════════════════════════════════════ */}
              {/* CẤU HÌNH ĐIỂM THƯỞNG LOYALTY                          */}
              {/* ══════════════════════════════════════════════════════ */}
              <View style={[st.rowGrid, { marginBottom: 16 }]}>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Điểm thưởng khi Hoàn thành</Text>
                  <TextInput 
                    style={st.input} keyboardType="numeric" 
                    value={editingTour.pointsReward?.toString()} 
                    onChangeText={(t) => setEditingTour(prev => ({ ...prev, pointsReward: parseInt(t) || 0 }))} 
                    placeholder="100" placeholderTextColor="#b0bdd8" 
                  />
                </View>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Điểm thưởng khi Đánh giá</Text>
                  <TextInput 
                    style={st.input} keyboardType="numeric" 
                    value={editingTour.reviewPoints?.toString()} 
                    onChangeText={(t) => setEditingTour(prev => ({ ...prev, reviewPoints: parseInt(t) || 0 }))} 
                    placeholder="50" placeholderTextColor="#b0bdd8" 
                  />
                </View>
              </View>
              
              <View style={st.rowGrid}>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Giá (VNĐ) <Text style={{ color: "#ef4444" }}>*</Text></Text>
                  <TextInput style={[st.input, { marginBottom: 3 }]} keyboardType="numeric" value={priceInput} onChangeText={handlePriceChange} placeholder="2.500.000" placeholderTextColor="#b0bdd8" />
                  <Text style={st.priceReadingTxt}>{docTien(editingTour.priceRaw || 0)}</Text>
                </View>
                <View style={st.col}>
                  <Text style={st.inputLabel}>Nơi xuất phát</Text>
                  <TextInput style={st.input} value={editingTour.departure || ""} onChangeText={(t) => setEditingTour(prev => ({ ...prev, departure: t }))} placeholder="TP. HCM" placeholderTextColor="#b0bdd8" />
                </View>
              </View>

              {/* ══════════════════════════════════════════════════════ */}
              {/*  KHỐI LỊCH TRÌNH                                       */}
              {/* ══════════════════════════════════════════════════════ */}
              <View style={st.schBlock}>

                {/* ── TIÊU ĐỀ KHỐI ── */}
                <View style={st.schBlockHeader}>
                  <View style={st.schBlockHeaderLeft}>
                    <View style={st.schBlockIconWrap}>
                      <Ionicons name="calendar" size={16} color="#4f7cff" />
                    </View>
                    <Text style={st.schBlockTitle}>Lịch Trình Tour</Text>
                  </View>
                  {(editingTour.schedules || []).length > 0 && (
                    <View style={st.schCountBadge}>
                      <Text style={st.schCountTxt}>{(editingTour.schedules || []).length} lịch</Text>
                    </View>
                  )}
                </View>

                {/* ── THỜI LƯỢNG TOUR ── */}
                <Text style={st.schSubLabel}>
                  <Ionicons name="time-outline" size={12} color="#7a8cc2" /> Thời lượng chuyến đi
                </Text>
                <View style={st.durationRow}>
                  <View style={st.durationCell}>
                    <TextInput
                      style={st.durationBox}
                      keyboardType="numeric" maxLength={3}
                      value={durationDays}
                      onChangeText={v => setDurationDays(v.replace(/\D/g,""))}
                      placeholder="0" placeholderTextColor="#c5d0e8"
                    />
                    <Text style={st.durationUnit}>ngày</Text>
                  </View>
                  <Text style={st.durationSep}>:</Text>
                  <View style={st.durationCell}>
                    <TextInput
                      style={st.durationBox}
                      keyboardType="numeric" maxLength={2}
                      value={durationHours2}
                      onChangeText={v => { const n=v.replace(/\D/g,""); if(parseInt(n||"0")>23)return; setDurationHours2(n); }}
                      placeholder="0" placeholderTextColor="#c5d0e8"
                    />
                    <Text style={st.durationUnit}>giờ</Text>
                  </View>
                  <Text style={st.durationSep}>:</Text>
                  <View style={st.durationCell}>
                    <TextInput
                      style={st.durationBox}
                      keyboardType="numeric" maxLength={2}
                      value={durationMins}
                      onChangeText={v => { const n=v.replace(/\D/g,""); if(parseInt(n||"0")>59)return; setDurationMins(n); }}
                      placeholder="0" placeholderTextColor="#c5d0e8"
                    />
                    <Text style={st.durationUnit}>phút</Text>
                  </View>
                </View>
                {(parseInt(durationDays||"0")+parseInt(durationHours2||"0")+parseInt(durationMins||"0"))>0 && (
                  <View style={st.durationSummary}>
                    <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                    <Text style={st.durationSummaryTxt}>
                      {[parseInt(durationDays||"0")>0?`${durationDays} ngày`:"", parseInt(durationHours2||"0")>0?`${durationHours2} giờ`:"", parseInt(durationMins||"0")>0?`${durationMins} phút`:""].filter(Boolean).join(" ")}
                    </Text>
                  </View>
                )}

                {/* ── DIVIDER ── */}
                <View style={st.schDivider} />

                {/* ── NGÀY + GIỜ KHỞI HÀNH ── */}
                <Text style={st.schSubLabel}>
                  <Ionicons name="add-circle-outline" size={12} color="#7a8cc2" /> Thêm lịch khởi hành mới
                </Text>
                <Text style={st.schNote}>Phải cách hiện tại ít nhất 1 ngày. Giờ kết thúc tự động tính từ thời lượng.</Text>

                {/* Hàng ngày: nhập tay + icon lịch */}
                <View style={st.dtRow}>
                  <View style={st.dtGroup}>
                    <Ionicons name="calendar-outline" size={14} color="#7a8cc2" style={{ marginBottom: 2 }} />
                    <Text style={st.dtGroupLabel}>Ngày khởi hành</Text>
                  </View>
                  <View style={st.dtInputsWrap}>
                    {/* DD */}
                    <TextInput ref={null} style={st.dtSeg} keyboardType="numeric" maxLength={2}
                      value={schDay} placeholder="DD" placeholderTextColor="#c5d0e8"
                      onChangeText={v => { const n=v.replace(/\D/g,""); setSchDay(n); if(n.length===2)refMon.current?.focus(); }}
                    />
                    <Text style={st.dtSlash}>/</Text>
                    <TextInput ref={refMon} style={st.dtSeg} keyboardType="numeric" maxLength={2}
                      value={schMon} placeholder="MM" placeholderTextColor="#c5d0e8"
                      onChangeText={v => { const n=v.replace(/\D/g,""); if(parseInt(n||"0")>12)return; setSchMon(n); if(n.length===2)refYear.current?.focus(); }}
                    />
                    <Text style={st.dtSlash}>/</Text>
                    <TextInput ref={refYear} style={[st.dtSeg, st.dtSegYear]} keyboardType="numeric" maxLength={4}
                      value={schYear} placeholder="YYYY" placeholderTextColor="#c5d0e8"
                      onChangeText={v => { const n=v.replace(/\D/g,""); setSchYear(n); if(n.length===4)refHH.current?.focus(); }}
                    />
                    {/* Nút mở lịch */}
                    <TouchableOpacity style={st.dtPickerBtn} onPress={openDatePicker} activeOpacity={0.75}>
                      <Ionicons name="calendar" size={18} color="#4f7cff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hàng giờ: nhập tay + icon đồng hồ */}
                <View style={[st.dtRow, { marginTop: 10 }]}>
                  <View style={st.dtGroup}>
                    <Ionicons name="time-outline" size={14} color="#7a8cc2" style={{ marginBottom: 2 }} />
                    <Text style={st.dtGroupLabel}>Giờ bắt đầu</Text>
                  </View>
                  <View style={st.dtInputsWrap}>
                    <TextInput ref={refHH} style={st.dtSeg} keyboardType="numeric" maxLength={2}
                      value={schHH} placeholder="HH" placeholderTextColor="#c5d0e8"
                      onChangeText={v => { const n=v.replace(/\D/g,""); if(parseInt(n||"0")>23)return; setSchHH(n); if(n.length===2)refSchMM.current?.focus(); }}
                    />
                    <Text style={st.dtSlash}>:</Text>
                    <TextInput ref={refSchMM} style={st.dtSeg} keyboardType="numeric" maxLength={2}
                      value={schMM} placeholder="MM" placeholderTextColor="#c5d0e8"
                      onChangeText={v => { const n=v.replace(/\D/g,""); if(parseInt(n||"0")>59)return; setSchMM(n); }}
                    />
                    <View style={{ flex: 1 }} />
                    {/* Nút mở đồng hồ */}
                    <TouchableOpacity style={st.dtPickerBtn} onPress={openTimePicker} activeOpacity={0.75}>
                      <Ionicons name="time" size={18} color="#4f7cff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview kết thúc */}
                {previewStart && (
                  <View style={st.previewBox}>
                    <View style={st.previewRow}>
                      <View style={[st.previewDot, { backgroundColor: "#4f7cff" }]} />
                      <Text style={st.previewTxt}>
                        Bắt đầu: {previewStart.toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                      </Text>
                    </View>
                    {previewEnd && (
                      <View style={[st.previewRow, { marginTop: 4 }]}>
                        <View style={[st.previewDot, { backgroundColor: "#10b981" }]} />
                        <Text style={[st.previewTxt, { color: "#059669" }]}>
                          Kết thúc: {previewEnd.toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Lỗi */}
                {schError ? (
                  <View style={st.schErrBox}>
                    <Ionicons name="warning-outline" size={14} color="#dc2626" />
                    <Text style={st.schErrTxt}>{schError}</Text>
                  </View>
                ) : null}

                {/* Nút thêm lịch */}
                <TouchableOpacity style={st.addSchBtn} onPress={handleAddSchedule} activeOpacity={0.85}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={st.addSchBtnTxt}>Thêm lịch khởi hành</Text>
                </TouchableOpacity>

                {/* ── DANH SÁCH LỊCH ĐÃ THÊM ── */}
                {(editingTour.schedules || []).length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <View style={st.schDivider} />
                    <Text style={[st.schSubLabel, { marginBottom: 8 }]}>
                      <Ionicons name="list-outline" size={12} color="#7a8cc2" /> Các lịch đã thêm
                    </Text>
                    {(editingTour.schedules || []).map((sch: any, i: number) => (
                      <View key={sch.id || i} style={st.schItem}>
                        <View style={st.schItemNum}>
                          <Text style={st.schItemNumTxt}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.schItemStart}>
                            ▶ {new Date(sch.startTime).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </Text>
                          <Text style={st.schItemEnd}>
                            ■ {new Date(sch.endTime).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={st.schItemDel}
                          hitSlop={{ top:8,bottom:8,left:8,right:8 }}
                          onPress={() => setEditingTour(prev => ({
                            ...prev,
                            schedules: (prev.schedules||[]).filter((_:any,idx:number)=>idx!==i)
                          }))}
                        >
                          <Ionicons name="close-circle" size={20} color="#f87171" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Text style={st.inputLabel}>Trạng thái</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["active", "full", "draft"] as const).map(s => (
                  <TouchableOpacity key={s} style={[st.statusSelectBtn, editingTour.status === s && st.statusSelectBtnActive]} onPress={() => setEditingTour(prev => ({ ...prev, status: s }))}>
                    <Text style={[st.statusSelectTxt, editingTour.status === s && st.statusSelectTxtActive]}>
                      {s === "active" ? "Đang mở" : s === "full" ? "Đã đầy" : "Nháp"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={st.saveBtn} onPress={saveTour}>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={st.saveBtnTxt}>Lưu Thông tin</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CÁC MODAL KHÁC GIỮ NGUYÊN (REPORTS, PENDING TASKS, REJECT GUIDE, BIDDING GUIDE) */}
      <Modal visible={pendingTasksModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: "85%" }]}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Danh sách chờ xử lý</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setPendingTasksModal(false)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {toursNeedGuide.length > 0 && <Text style={st.sectionTitle}>HDV xin nhận Tour</Text>}
              {toursNeedGuide.map(t => (
                <TouchableOpacity key={t.id} style={st.pendingTaskCard} onPress={() => { setPendingTasksModal(false); setBiddingTour(t); }}>
                  <View style={st.pendingIcon}><Ionicons name="people" size={18} color="#f59e0b" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pendingTaskName} numberOfLines={1}>{t.name}</Text>
                    <Text style={st.pendingTaskSub}>{t.appliedGuides.length} yêu cầu đang chờ</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a8d8" />
                </TouchableOpacity>
              ))}

              {pendingDrafts.length > 0 && <Text style={[st.sectionTitle, { marginTop: 10 }]}>Đề xuất Tour mới</Text>}
              {pendingDrafts.map(t => (
                <TouchableOpacity key={t.id} style={st.pendingTaskCard} onPress={() => { setPendingTasksModal(false); openModal(t); }}>
                  <View style={[st.pendingIcon, { backgroundColor: "#fff7ed" }]}><Ionicons name="bulb" size={18} color="#c2410c" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pendingTaskName} numberOfLines={1}>{t.name}</Text>
                    <Text style={st.pendingTaskSub}>Đề xuất cần phê duyệt</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a8d8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={reportsModal.visible} animationType="fade" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: "80%" }]}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Báo cáo Sự cố</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setReportsModal({ visible: false, tour: null })}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {reportsModal.tour?.reports?.filter(r => !r.isResolved).map(r => (
                <View key={r.id} style={st.reportItemBox}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={st.reportItemGuide}>{r.guideName} báo cáo:</Text>
                    <Text style={st.reportItemDate}>{r.date}</Text>
                  </View>
                  <Text style={st.reportItemText}>{r.text}</Text>
                  <TouchableOpacity style={st.resolveBtn} onPress={() => markReportResolved(reportsModal.tour!.id, r.id)}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Đánh dấu đã xử lý</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!biddingTour} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { paddingBottom: insets.bottom + 20, maxHeight: "90%" }]}>
            <View style={st.handle} />
            <View style={st.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={st.modalTitle}>Duyệt HDV Nhận Tour</Text>
                {biddingTour && (
                  <Text style={{ fontSize: 11, color: "#7a8cc2", marginTop: 2 }} numberOfLines={1}>
                    Tour: {biddingTour.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={st.closeBtn} onPress={() => setBiddingTour(null)}>
                <Ionicons name="close" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Banner tổng số đơn */}
              {(biddingTour?.appliedGuides?.length ?? 0) > 0 && (
                <View style={st.biddingBannerBox}>
                  <Ionicons name="people" size={16} color="#f59e0b" />
                  <Text style={st.biddingBannerTxt}>
                    {biddingTour!.appliedGuides.length} HDV đang chờ xét duyệt cho tour này
                  </Text>
                </View>
              )}

              {biddingTour?.appliedGuides?.map((guide, idx) => {
                // Lấy thêm thông tin từ cache @app_guides
                const profile = guideProfiles[guide.id] || guideProfiles["g_" + guide.id] || null;
                const guideAny = guide as any;
                return (
                  <View key={guide.id} style={st.biddingCard}>
                    {/* ── HEADER: Avatar + Tên + Badge ── */}
                    <View style={st.biddingHeader}>
                      <View style={st.biddingAvatar}>
                        <Ionicons name="person" size={22} color="#4f7cff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.biddingName}>{guide.name}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                          {guide.vneidVerified && (
                            <View style={st.vneidBadge}>
                              <Ionicons name="shield-checkmark" size={10} color="#059669" />
                              <Text style={st.vneidBadgeTxt}>VNeID xác minh</Text>
                            </View>
                          )}
                          {profile?.rating && (
                            <View style={[st.vneidBadge, { backgroundColor: "#fef3c7" }]}>
                              <Ionicons name="star" size={9} color="#d97706" />
                              <Text style={[st.vneidBadgeTxt, { color: "#d97706" }]}>{profile.rating.toFixed(1)}</Text>
                            </View>
                          )}
                          {profile?.tours > 0 && (
                            <View style={[st.vneidBadge, { backgroundColor: "#ede9fe" }]}>
                              <Ionicons name="map" size={9} color="#7c3aed" />
                              <Text style={[st.vneidBadgeTxt, { color: "#7c3aed" }]}>{profile.tours} tour</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={st.biddingIndexBadge}>
                          <Text style={st.biddingIndexTxt}>{idx + 1}/{biddingTour!.appliedGuides.length}</Text>
                        </View>
                        <TouchableOpacity
                          style={st.biddingProfileBtn}
                          onPress={() => { setBiddingTour(null); router.push({ pathname: "/public-guide-profile", params: { id: guide.id } }); }}
                        >
                          <Text style={st.biddingProfileTxt}>Hồ sơ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* ── THÔNG TIN TỪ @app_guides ── */}
                    {profile && (
                      <View style={st.biddingInfoGrid}>
                        {profile.location ? (
                          <View style={st.biddingInfoItem}>
                            <Ionicons name="location-outline" size={12} color="#7a8cc2" />
                            <Text style={st.biddingInfoTxt} numberOfLines={1}>{profile.location}</Text>
                          </View>
                        ) : null}
                        {profile.experience ? (
                          <View style={st.biddingInfoItem}>
                            <Ionicons name="briefcase-outline" size={12} color="#7a8cc2" />
                            <Text style={st.biddingInfoTxt} numberOfLines={1}>{profile.experience}</Text>
                          </View>
                        ) : null}
                        {profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                          <View style={[st.biddingInfoItem, { flexWrap: "wrap" }]}>
                            <Ionicons name="ribbon-outline" size={12} color="#7a8cc2" />
                            <Text style={st.biddingInfoTxt} numberOfLines={2}>{profile.skills.join(", ")}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                    {!profile && (
                      <View style={st.biddingNoProfileBox}>
                        <Ionicons name="alert-circle-outline" size={13} color="#f59e0b" />
                        <Text style={st.biddingNoProfileTxt}>
                          Chưa tìm thấy hồ sơ công khai — có thể HDV chưa hoàn thiện profile.
                        </Text>
                      </View>
                    )}

                    {/* ── GHI CHÚ ĐƠN ĐĂNG KÝ ── */}
                    <View style={st.biddingNoteBox}>
                      <Text style={st.biddingNoteLabel}>Lý do xin nhận tour:</Text>
                      <Text style={st.biddingNoteTxt}>"{guide.note || "Không có ghi chú."}"</Text>
                      {guideAny.applicationId && (
                        <Text style={st.biddingAppIdTxt}>ID đơn: {guideAny.applicationId}</Text>
                      )}
                    </View>

                    {/* ── ACTIONS ── */}
                    <View style={st.biddingActions}>
                      <TouchableOpacity style={st.biddingRejectBtn} onPress={() => promptRejectGuide(guide.id, guide.name)}>
                        <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                        <Text style={st.biddingRejectTxt}>Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={st.biddingApproveBtn} onPress={() => handleApproveGuide(guide)}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={st.biddingApproveTxt}>Phân công dẫn tour</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {(!biddingTour?.appliedGuides || biddingTour.appliedGuides.length === 0) && (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color="#d1fae5" style={{ marginBottom: 10 }} />
                  <Text style={{ color: "#7a8cc2", fontWeight: "700", fontSize: 14 }}>Đã xử lý hết yêu cầu.</Text>
                  <Text style={{ color: "#94a8d8", fontSize: 12, marginTop: 4 }}>Không còn HDV nào đang chờ duyệt.</Text>
                </View>
              )}

              {/* HDV đã được phân công */}
              {(biddingTour?.assignedGuideNames?.length ?? 0) > 0 && (
                <View style={st.assignedSection}>
                  <Text style={st.assignedSectionTitle}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" /> HDV đã được phân công
                  </Text>
                  {biddingTour!.assignedGuideNames.map((name, i) => (
                    <View key={i} style={st.assignedItem}>
                      <View style={st.assignedDot} />
                      <Text style={st.assignedName}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView style={st.confirmOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={st.confirmBox}>
            <View style={[st.confirmIconWrap, { backgroundColor: "#fee2e2" }]}><Ionicons name="close-circle" size={30} color="#ef4444" /></View>
            <Text style={st.confirmTitle}>Từ chối {rejectModal.guideName}</Text>
            <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 10, textAlign: "center" }}>Vui lòng ghi rõ lý do để HDV rút kinh nghiệm (bắt buộc)</Text>
            <TextInput
              style={[st.input, { width: "100%", height: 80, textAlignVertical: "top", marginBottom: 16 }]}
              multiline
              placeholder="VD: Tour này yêu cầu tiếng Anh giao tiếp tốt..."
              value={rejectModal.reason}
              onChangeText={r => setRejectModal(prev => ({ ...prev, reason: r }))}
            />
            <View style={st.confirmActionRow}>
              <TouchableOpacity style={st.confirmCancelBtn} onPress={() => setRejectModal({ visible: false, guideId: "", guideName: "", reason: "" })}><Text style={st.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[st.confirmSubmitBtn, { backgroundColor: "#ef4444", opacity: rejectModal.reason ? 1 : 0.5 }]} disabled={!rejectModal.reason} onPress={executeRejectGuide}>
                <Text style={st.confirmSubmitBtnTxt}>Xác nhận từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <View style={[st.confirmIconWrap, { backgroundColor: confirmPopup.type === "success" ? "#d1fae5" : confirmPopup.type === "error" ? "#fee2e2" : "#eaf0ff" }]}>
              <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : confirmPopup.type === "error" ? "warning" : "help-circle"} size={30} color={confirmPopup.type === "success" ? "#10b981" : confirmPopup.type === "error" ? "#ef4444" : "#4f7cff"} />
            </View>
            <Text style={st.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={st.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "delete" ? (
              <View style={st.confirmActionRow}>
                <TouchableOpacity style={st.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={st.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={[st.confirmSubmitBtn, { backgroundColor: "#ef4444" }]} onPress={executeDelete}><Text style={st.confirmSubmitBtnTxt}>Xóa Tour</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[st.confirmSubmitBtn, { width: "100%", backgroundColor: confirmPopup.type === "success" ? "#10b981" : "#ef4444" }]} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={st.confirmSubmitBtnTxt}>Đóng</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-tour-management" />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  DATE PICKER MODAL                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={st.dpOverlay}>
          <View style={st.dpBox}>
            {/* Header tháng/năm */}
            <View style={st.dpHeader}>
              <TouchableOpacity style={st.dpNavBtn} onPress={() => {
                if (pickerViewMonth === 0) { setPickerViewMonth(11); setPickerViewYear(y=>y-1); }
                else setPickerViewMonth(m=>m-1);
              }}>
                <Ionicons name="chevron-back" size={20} color="#1f2a58" />
              </TouchableOpacity>
              <Text style={st.dpMonthTxt}>{MONTH_NAMES[pickerViewMonth]} {pickerViewYear}</Text>
              <TouchableOpacity style={st.dpNavBtn} onPress={() => {
                if (pickerViewMonth === 11) { setPickerViewMonth(0); setPickerViewYear(y=>y+1); }
                else setPickerViewMonth(m=>m+1);
              }}>
                <Ionicons name="chevron-forward" size={20} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            {/* Tên ngày */}
            <View style={st.dpWeekRow}>
              {DAY_NAMES.map(d => <Text key={d} style={st.dpWeekTxt}>{d}</Text>)}
            </View>
            {/* Các ngày */}
            <View style={st.dpGrid}>
              {buildCalendarDays(pickerViewYear, pickerViewMonth).map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={st.dpDayCell} />;
                const disabled = isDateDisabled(pickerViewYear, pickerViewMonth, day);
                const isSelected = pickerSelDay===day && pickerSelMon===pickerViewMonth && pickerSelYear===pickerViewYear;
                return (
                  <TouchableOpacity
                    key={`d-${idx}`}
                    style={[st.dpDayCell, isSelected && st.dpDaySel, disabled && st.dpDayDisabled]}
                    onPress={() => {
                      if (disabled) return;
                      setPickerSelDay(day);
                      setPickerSelMon(pickerViewMonth);
                      setPickerSelYear(pickerViewYear);
                    }}
                    disabled={disabled}
                  >
                    <Text style={[st.dpDayTxt, isSelected && st.dpDaySelTxt, disabled && st.dpDayDisabledTxt]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Actions */}
            <View style={st.dpActions}>
              <TouchableOpacity style={st.dpCancelBtn} onPress={()=>setDatePickerVisible(false)}>
                <Text style={st.dpCancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.dpConfirmBtn, !pickerSelDay && { opacity: 0.45 }]}
                onPress={confirmDatePicker}
                disabled={!pickerSelDay}
              >
                <Text style={st.dpConfirmTxt}>Chọn ngày này</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TIME PICKER MODAL                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <View style={st.dpOverlay}>
          <View style={[st.dpBox, { paddingBottom: 20 }]}>
            <Text style={[st.dpMonthTxt, { textAlign:"center", marginBottom: 20, marginTop: 4 }]}>Chọn giờ bắt đầu</Text>
            <View style={st.tpRow}>
              {/* Giờ */}
              <View style={st.tpCol}>
                <TouchableOpacity style={st.tpArrow} onPress={()=>setPickerHH(h=>(h+1)%24)}>
                  <Ionicons name="chevron-up" size={22} color="#4f7cff" />
                </TouchableOpacity>
                <View style={st.tpValBox}>
                  <Text style={st.tpValTxt}>{String(pickerHH).padStart(2,"0")}</Text>
                </View>
                <TouchableOpacity style={st.tpArrow} onPress={()=>setPickerHH(h=>(h+23)%24)}>
                  <Ionicons name="chevron-down" size={22} color="#4f7cff" />
                </TouchableOpacity>
                <Text style={st.tpUnitTxt}>giờ</Text>
              </View>
              <Text style={st.tpColon}>:</Text>
              {/* Phút — bước 5 */}
              <View style={st.tpCol}>
                <TouchableOpacity style={st.tpArrow} onPress={()=>setPickerMM(m=>((Math.floor(m/5)+1)*5)%60)}>
                  <Ionicons name="chevron-up" size={22} color="#4f7cff" />
                </TouchableOpacity>
                <View style={st.tpValBox}>
                  <Text style={st.tpValTxt}>{String(pickerMM).padStart(2,"0")}</Text>
                </View>
                <TouchableOpacity style={st.tpArrow} onPress={()=>setPickerMM(m=>((Math.floor(m/5)+11)*5)%60)}>
                  <Ionicons name="chevron-down" size={22} color="#4f7cff" />
                </TouchableOpacity>
                <Text style={st.tpUnitTxt}>phút</Text>
              </View>
            </View>
            {/* Quick picks */}
            <Text style={[st.schNote,{textAlign:"center",marginTop:16,marginBottom:8}]}>Chọn nhanh</Text>
            <View style={st.tpQuickRow}>
              {[6,7,8,9,10,12,14,16,18,20].map(h=>(
                <TouchableOpacity key={h} style={[st.tpQuickBtn, pickerHH===h && pickerMM===0 && st.tpQuickBtnSel]} onPress={()=>{setPickerHH(h);setPickerMM(0);}}>
                  <Text style={[st.tpQuickTxt, pickerHH===h && pickerMM===0 && st.tpQuickTxtSel]}>{String(h).padStart(2,"0")}:00</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.dpActions}>
              <TouchableOpacity style={st.dpCancelBtn} onPress={()=>setTimePickerVisible(false)}>
                <Text style={st.dpCancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmTimePicker}>
                <Text style={st.dpConfirmTxt}>Xác nhận {String(pickerHH).padStart(2,"0")}:{String(pickerMM).padStart(2,"0")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58", textAlign: "center" },
  headerSub: { fontSize: 11, color: "#94a8d8", textAlign: "center", marginTop: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  addBtn: { width: 40, height: 40, backgroundColor: "#4f7cff", borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 4 },
  notifBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1f2a58", marginHorizontal: 14, marginTop: 10, marginBottom: 2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 3, },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  notifIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  notifTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  notifSub: { color: "#94a8d8", fontSize: 11, marginTop: 1 },
  notifBadge: { backgroundColor: "#ef4444", borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  notifBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },
  searchRow: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: "#e4ebff", gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#1f2a58" },
  filtersWrapper: { paddingBottom: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  filterCatScroll: { paddingHorizontal: 14, gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 12 },
  filterTxtActive: { color: "#fff" },
  statusTabScroll: { paddingHorizontal: 14, gap: 7 },
  statusTabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f7ff", borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff" },
  statusTabBtnActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  statusTabTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "700" },
  statusTabTxtActive: { color: "#fff" },
  statusTabCount: { backgroundColor: "#e4ebff", borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  statusTabCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  statusTabCountTxt: { color: "#4f7cff", fontSize: 10, fontWeight: "800" },
  statusTabCountTxtActive: { color: "#fff" },
  listContent: { padding: 14, paddingBottom: 100 },
  tourCard: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, overflow: "hidden", },
  draftBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff7ed", paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#fed7aa", },
  draftBannerTxt: { color: "#c2410c", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0, marginBottom: 8 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTxt: { fontSize: 12, fontWeight: "700", color: "#1f2a58" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  tourName: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 3, paddingHorizontal: 14, lineHeight: 22 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10, paddingHorizontal: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  metaTxt: { fontSize: 11, color: "#1f2a58", fontWeight: "600" },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  guideIcon: { width: 22, height: 22, borderRadius: 5, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  guideNameTxt: { fontSize: 12, color: "#7a8cc2", flex: 1 },
  biddingBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f59e0b", paddingVertical: 9, paddingHorizontal: 14, marginHorizontal: 12, marginBottom: 10, borderRadius: 10, elevation: 2, },
  biddingBtnLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  biddingBellBox: { position: "relative", width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  biddingDot: { position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#f59e0b" },
  biddingBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f0f4ff", backgroundColor: "#fafbff" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  actionBtnTxt: { fontSize: 12, fontWeight: "800" },
  actionDivider: { width: 1, backgroundColor: "#f0f4ff", marginVertical: 6 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,18,50,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "92%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, width: "100%" },
  handle: { width: 36, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff", },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 18 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#1f2a58", marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 13, marginBottom: 4 },
  rowGrid: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  statusSelectBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  statusSelectBtnActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  statusSelectTxt: { color: "#64748b", fontWeight: "700", fontSize: 12 },
  statusSelectTxtActive: { color: "#4f7cff" },
  saveBtn: { backgroundColor: "#4f7cff", borderRadius: 12, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, marginBottom: 28 },
  saveBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  priceReadingTxt: { fontSize: 11, color: "#10b981", fontStyle: "italic", fontWeight: "600", marginBottom: 8 },
  reportAlertBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 8 },
  reportAlertTxt: { color: "#fff", fontSize: 12, fontWeight: "800", flex: 1 },
  biddingCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 12 },
  biddingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  biddingAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  biddingName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#1f2a58" },
  biddingProfileBtn: { backgroundColor: "#eaf0ff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  biddingProfileTxt: { color: "#4f7cff", fontSize: 11, fontWeight: "700" },
  biddingNoteBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 12 },
  biddingNoteLabel: { fontSize: 11, color: "#64748b", marginBottom: 3, fontWeight: "700" },
  biddingNoteTxt: { fontSize: 13, color: "#1f2a58", fontStyle: "italic", lineHeight: 18 },
  biddingActions: { flexDirection: "row", gap: 8 },
  biddingRejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#fecaca" },
  biddingRejectTxt: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  biddingApproveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 9, backgroundColor: "#10b981", elevation: 2 },
  biddingApproveTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  vneidBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#d1fae5", alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  vneidBadgeTxt: { color: "#059669", fontSize: 9, fontWeight: "800" },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 340, borderRadius: 22, padding: 22, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 6, textAlign: "center" },
  confirmMessage: { fontSize: 13, color: "#7a8cc2", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  confirmActionRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 44, borderRadius: 11, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 14, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1f2a58", marginBottom: 10, marginTop: 4 },
  pendingTaskCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 8 },
  pendingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginRight: 12 },
  pendingTaskName: { fontSize: 14, fontWeight: "700", color: "#1f2a58", marginBottom: 2 },
  pendingTaskSub: { fontSize: 12, color: "#7a8cc2" },
  reportItemBox: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 14, marginBottom: 10 },
  reportItemGuide: { fontSize: 13, fontWeight: "700", color: "#1f2a58" },
  reportItemDate: { fontSize: 11, color: "#7a8cc2" },
  reportItemText: { fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 12, backgroundColor: "#f8fafc", padding: 10, borderRadius: 8 },
  resolveBtn: { backgroundColor: "#10b981", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },

  // ══════════════════════════════════════════════════════════════════════
  //  SCHEDULE BLOCK STYLES
  // ══════════════════════════════════════════════════════════════════════
  schBlock: { backgroundColor: "#f4f7ff", borderRadius: 16, borderWidth: 1.5, borderColor: "#dbe4ff", padding: 16, marginTop: 14 },
  schBlockHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  schBlockHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  schBlockIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#e0e9ff", alignItems: "center", justifyContent: "center" },
  schBlockTitle: { fontSize: 14, fontWeight: "900", color: "#1f2a58" },
  schCountBadge: { backgroundColor: "#4f7cff", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  schCountTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },

  schSubLabel: { fontSize: 11, fontWeight: "800", color: "#7a8cc2", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  schNote: { fontSize: 11, color: "#94a3b8", lineHeight: 16, marginBottom: 10, fontStyle: "italic" },
  schDivider: { height: 1, backgroundColor: "#dbe4ff", marginVertical: 14 },

  // Duration row
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationCell: { flex: 1, alignItems: "center" },
  durationBox: { width: "100%", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#dbe4ff", paddingVertical: 12, fontSize: 20, fontWeight: "900", color: "#1f2a58", textAlign: "center" },
  durationUnit: { fontSize: 11, color: "#7a8cc2", fontWeight: "700", marginTop: 4 },
  durationSep: { fontSize: 20, color: "#c5d0e8", fontWeight: "700", marginBottom: 16 },
  durationSummary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#d1fae5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  durationSummaryTxt: { fontSize: 12, color: "#059669", fontWeight: "800" },

  // Date/time row
  dtRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dtGroup: { width: 64, alignItems: "center" },
  dtGroupLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textAlign: "center", marginTop: 2 },
  dtInputsWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#dbe4ff", paddingHorizontal: 10, paddingVertical: 4 },
  dtSeg: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1f2a58", textAlign: "center", paddingVertical: 8, minWidth: 28 },
  dtSegYear: { flex: 1.6 },
  dtSlash: { fontSize: 16, fontWeight: "700", color: "#c5d0e8" },
  dtPickerBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center", marginLeft: 2 },

  // Preview
  previewBox: { backgroundColor: "#eef2ff", borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#dbe4ff" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewTxt: { fontSize: 12, color: "#4f7cff", fontWeight: "700", flex: 1 },

  // Error
  schErrBox: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff1f2", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10, borderWidth: 1, borderColor: "#fecaca" },
  schErrTxt: { fontSize: 12, color: "#dc2626", fontWeight: "700", flex: 1 },

  // Add button
  addSchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4f7cff", borderRadius: 12, height: 46, marginTop: 14, elevation: 3, shadowColor: "#4f7cff", shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:6 },
  addSchBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 14 },

  // Schedule items list
  schItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#dbe4ff", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 10 },
  schItemNum: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  schItemNumTxt: { fontSize: 12, fontWeight: "900", color: "#4f7cff" },
  schItemStart: { fontSize: 12, fontWeight: "800", color: "#1f2a58" },
  schItemEnd: { fontSize: 11, color: "#10b981", fontWeight: "700", marginTop: 2 },
  schItemDel: { padding: 2 },

  // ══════════════════════════════════════════════════════════════════════
  //  DATE PICKER STYLES
  // ══════════════════════════════════════════════════════════════════════
  dpOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
  dpBox: { backgroundColor: "#fff", borderRadius: 22, width: "100%", maxWidth: 360, padding: 18, elevation: 20 },
  dpHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  dpNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  dpMonthTxt: { fontSize: 16, fontWeight: "900", color: "#1f2a58" },
  dpWeekRow: { flexDirection: "row", marginBottom: 6 },
  dpWeekTxt: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#94a8d8" },
  dpGrid: { flexDirection: "row", flexWrap: "wrap" },
  dpDayCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dpDaySel: { backgroundColor: "#4f7cff", borderRadius: 10 },
  dpDayDisabled: { opacity: 0.3 },
  dpDayTxt: { fontSize: 13, fontWeight: "700", color: "#1f2a58" },
  dpDaySelTxt: { color: "#fff" },
  dpDayDisabledTxt: { color: "#94a8d8" },
  dpActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  dpCancelBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  dpCancelTxt: { color: "#7a8cc2", fontWeight: "800", fontSize: 14 },
  dpConfirmBtn: { flex: 2, height: 46, borderRadius: 12, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  dpConfirmTxt: { color: "#fff", fontWeight: "900", fontSize: 14 },

  // ══════════════════════════════════════════════════════════════════════
  //  TIME PICKER STYLES
  // ══════════════════════════════════════════════════════════════════════
  tpRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  tpCol: { alignItems: "center", gap: 6 },
  tpArrow: { width: 44, height: 36, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  tpValBox: { width: 72, height: 60, borderRadius: 14, backgroundColor: "#f4f7ff", borderWidth: 2, borderColor: "#dbe4ff", alignItems: "center", justifyContent: "center" },
  tpValTxt: { fontSize: 28, fontWeight: "900", color: "#1f2a58" },
  tpUnitTxt: { fontSize: 11, color: "#7a8cc2", fontWeight: "700" },
  tpColon: { fontSize: 32, fontWeight: "900", color: "#dbe4ff", marginBottom: 20 },
  tpQuickRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tpQuickBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f7ff", borderWidth: 1, borderColor: "#e4ebff" },
  tpQuickBtnSel: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  tpQuickTxt: { fontSize: 12, fontWeight: "700", color: "#4f7cff" },
  tpQuickTxtSel: { color: "#fff" },

  // ── BIDDING MODAL ENHANCED STYLES ───────────────────────────────────────
  biddingBannerBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, borderWidth: 1, borderColor: "#fde68a" },
  biddingBannerTxt: { fontSize: 12, color: "#92400e", fontWeight: "700", flex: 1 },
  biddingIndexBadge: { backgroundColor: "#f3f7ff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#e4ebff" },
  biddingIndexTxt: { fontSize: 10, color: "#7a8cc2", fontWeight: "700" },
  biddingInfoGrid: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 10, gap: 6 },
  biddingInfoItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  biddingInfoTxt: { fontSize: 12, color: "#475569", flex: 1, lineHeight: 17 },
  biddingNoProfileBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fffbeb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, borderWidth: 1, borderColor: "#fde68a" },
  biddingNoProfileTxt: { fontSize: 11, color: "#92400e", flex: 1, lineHeight: 16 },
  biddingAppIdTxt: { fontSize: 10, color: "#b0bdd8", marginTop: 6, fontStyle: "italic" },
  assignedSection: { marginTop: 16, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  assignedSectionTitle: { fontSize: 12, fontWeight: "800", color: "#059669", marginBottom: 8 },
  assignedItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  assignedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  assignedName: { fontSize: 13, color: "#065f46", fontWeight: "700" },
});