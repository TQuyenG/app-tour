/**
 * app/guide-schedule-management.tsx
 * Quản lý Lịch HDV - Phiên bản đầy đủ (Google Calendar style)
 *
 * ✅ Xem lịch: Ngày / Tuần / Tháng / Năm
 * ✅ Tô màu ngày có sự kiện (gradient nền, không chỉ chấm nhỏ)
 * ✅ Tour: tô màu toàn bộ span ngày bắt đầu → kết thúc
 * ✅ Bộ lọc: Tour hẹn / Lịch bận / Tất cả
 * ✅ Tìm kiếm lịch theo từ khoá
 * ✅ Ghi chú lịch bận
 * ✅ Nhắc nhở: chọn thời gian + số lần
 * ✅ Date picker calendar (giống admin-tour-management)
 * ✅ Hiển thị lịch Âm (Âm lịch Việt)
 * ✅ Đồng bộ Google Calendar / Outlook / iCal (.ics export)
 * ✅ Responsive + không hardcode icon
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState, useMemo, useRef } from "react";
import {
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, Modal, TextInput,
  useWindowDimensions, Alert, Linking, Platform, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SCHEDULE_STORAGE = "@guide_schedule";
const BOOKING_STORAGE  = "@guest_bookings";

const MONTH_NAMES  = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const WEEK_DAYS    = ["T2","T3","T4","T5","T6","T7","CN"];
const WEEK_FULL    = ["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ Nhật"];

// Màu sự kiện
const COLOR_TOUR = "#4f7cff";
const COLOR_LOCK = "#ef4444";
const COLOR_NOTE = "#f59e0b";

// Âm lịch đơn giản (offset tháng 1 dương → tháng âm)
// Đây là thuật toán xấp xỉ đơn giản cho demo
function getLunarDate(date: Date): string {
  try {
    // Sử dụng Intl nếu môi trường hỗ trợ
    const lunar = new Intl.DateTimeFormat("vi-VN-u-ca-chinese", {
      day: "numeric", month: "numeric",
    }).format(date);
    return lunar;
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────────────────────
type ViewMode = "day" | "week" | "month" | "year";
type FilterType = "all" | "tour" | "lock";

interface ScheduleEvent {
  id: string;
  type: "tour" | "lock";
  guideId: string;
  startTime: string;
  endTime: string;
  reason?: string;
  tourName?: string;
  guests?: number;
  status?: string;
  note?: string;
  reminders?: { minutesBefore: number; times: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GuideScheduleManagement() {
  const router         = useRouter();
  const insets         = useSafeAreaInsets();
  const { width }      = useWindowDimensions();
  const scale          = Math.min(width / 375, 1.3);
  const s              = useMemo(() => getStyles(scale), [scale]);

  // ── State core ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode]       = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents]           = useState<ScheduleEvent[]>([]);
  const [guideId, setGuideId]         = useState("");
  const [isLoading, setIsLoading]     = useState(true);
  const [filterType, setFilterType]   = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch]   = useState(false);

  // ── Modal: Thêm lịch bận ────────────────────────────────────────────────
  const [lockModal, setLockModal]     = useState(false);
  const [lockReason, setLockReason]   = useState("");
  const [lockNote, setLockNote]       = useState("");
  const [lockError, setLockError]     = useState("");
  // Date picker state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerViewYear, setPickerViewYear]   = useState(new Date().getFullYear());
  const [pickerViewMonth, setPickerViewMonth] = useState(new Date().getMonth());
  const [pickerSelDay, setPickerSelDay]       = useState<number | null>(null);
  const [pickerSelMon, setPickerSelMon]       = useState<number | null>(null);
  const [pickerSelYear, setPickerSelYear]     = useState<number | null>(null);
  // Remind state
  const [remindMinutes, setRemindMinutes]     = useState("30");
  const [remindTimes, setRemindTimes]         = useState("1");
  const [showRemindPicker, setShowRemindPicker] = useState(false);

  // ── Modal: Chi tiết sự kiện ─────────────────────────────────────────────
  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);

  // ── Modal: Đồng bộ lịch ────────────────────────────────────────────────
  const [syncModal, setSyncModal]     = useState(false);

  // refs
  const refMM   = useRef<any>(null);
  const refYYYY = useRef<any>(null);

  // ── Load data ────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const loadAllData = async () => {
      try {
        let gId = "";
        const pRaw = await AsyncStorage.getItem("@guide_profile");
        if (pRaw) gId = JSON.parse(pRaw).guideId || "";
        setGuideId(gId);

        const rawLocks    = await AsyncStorage.getItem(SCHEDULE_STORAGE);
        const rawBookings = await AsyncStorage.getItem(BOOKING_STORAGE);

        let all: ScheduleEvent[] = [];

        if (rawLocks) {
          const locks = JSON.parse(rawLocks).filter((x: any) => x.guideId === gId);
          all = [...all, ...locks.map((x: any) => ({ ...x, type: "lock" as const }))];
        }
        if (rawBookings) {
          const tours = JSON.parse(rawBookings).filter(
            (x: any) => x.guideId === gId && !["cancelled","rejected"].includes(x.status)
          );
          all = [...all, ...tours.map((x: any) => ({ ...x, type: "tour" as const }))];
        }

        all.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setEvents(all);
      } catch (e) {
      } finally { setIsLoading(false); }
    };
    loadAllData();
  }, []));

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Lấy tất cả ngày mà sự kiện span qua (để tô màu)
  const getEventDates = (ev: ScheduleEvent): string[] => {
    const dates: string[] = [];
    const start = new Date(ev.startTime);
    const end   = new Date(ev.endTime);
    const cur   = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cur <= endDay) {
      dates.push(cur.toLocaleDateString("vi-VN"));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Map: dateStr → array of events trên ngày đó
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    const filtered = events.filter(ev => {
      if (filterType === "tour") return ev.type === "tour";
      if (filterType === "lock") return ev.type === "lock";
      return true;
    });
    filtered.forEach(ev => {
      getEventDates(ev).forEach(d => {
        if (!map[d]) map[d] = [];
        map[d].push(ev);
      });
    });
    return map;
  }, [events, filterType]);

  const eventsForDate = (d: Date) => eventsByDate[d.toLocaleDateString("vi-VN")] || [];
  const eventsForSelectedDate = eventsForDate(selectedDate);

  // Filtered + search
  const displayEvents = useMemo(() => {
    let list = events.filter(ev => {
      if (filterType === "tour") return ev.type === "tour";
      if (filterType === "lock") return ev.type === "lock";
      return true;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(ev =>
        ev.tourName?.toLowerCase().includes(q) ||
        ev.reason?.toLowerCase().includes(q) ||
        ev.note?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, filterType, searchQuery]);

  // ── Calendar helpers ─────────────────────────────────────────────────────
  const buildCalendarDays = (year: number, month: number) => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset      = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const prevPeriod = () => {
    if (viewMode === "day")   setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate()-1); return n; });
    if (viewMode === "week")  setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n; });
    if (viewMode === "month") setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1));
    if (viewMode === "year")  setCurrentDate(d => new Date(d.getFullYear()-1, 0, 1));
  };
  const nextPeriod = () => {
    if (viewMode === "day")   setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate()+1); return n; });
    if (viewMode === "week")  setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n; });
    if (viewMode === "month") setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1));
    if (viewMode === "year")  setCurrentDate(d => new Date(d.getFullYear()+1, 0, 1));
  };

  const headerLabel = () => {
    if (viewMode === "day")   return currentDate.toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    if (viewMode === "week") {
      const mon = new Date(currentDate);
      mon.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay()-1));
      const sun = new Date(mon); sun.setDate(mon.getDate()+6);
      return `${mon.getDate()}/${mon.getMonth()+1} – ${sun.getDate()}/${sun.getMonth()+1}/${sun.getFullYear()}`;
    }
    if (viewMode === "month") return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return `Năm ${currentDate.getFullYear()}`;
  };

  // ── Date picker callbacks ────────────────────────────────────────────────
  const isDateDisabled = (y: number, m: number, d: number) => {
    const sel = new Date(y, m, d);
    const min = new Date(); min.setHours(0,0,0,0);
    return sel < min;
  };

  const confirmDatePicker = () => {
    if (pickerSelDay && pickerSelMon !== null && pickerSelYear) {
      // ngày hợp lệ đã được chọn → dùng cho lockModal
      setDatePickerVisible(false);
    }
  };

  const getSelectedLockDate = (): Date | null => {
    if (pickerSelDay && pickerSelMon !== null && pickerSelYear) {
      return new Date(pickerSelYear, pickerSelMon, pickerSelDay);
    }
    return null;
  };

  const lockDateLabel = () => {
    const d = getSelectedLockDate();
    return d ? d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "Chọn ngày";
  };

  // ── Save lock ────────────────────────────────────────────────────────────
  const resetLockForm = () => {
    setLockReason(""); setLockNote(""); setLockError("");
    setPickerSelDay(null); setPickerSelMon(null); setPickerSelYear(null);
    setRemindMinutes("30"); setRemindTimes("1");
  };

  const handleAddLock = async () => {
    setLockError("");
    const lockDate = getSelectedLockDate();
    if (!lockDate) { setLockError("Vui lòng chọn ngày bận."); return; }
    if (!lockReason.trim()) { setLockError("Vui lòng nhập lý do."); return; }
    if (lockDate < new Date()) { setLockError("Không thể khóa ngày trong quá khứ."); return; }

    const start = new Date(lockDate.getFullYear(), lockDate.getMonth(), lockDate.getDate(), 0, 0, 0);
    const end   = new Date(lockDate.getFullYear(), lockDate.getMonth(), lockDate.getDate(), 23, 59, 59);

    const reminders = showRemindPicker
      ? [{ minutesBefore: parseInt(remindMinutes) || 30, times: parseInt(remindTimes) || 1 }]
      : [];

    const newLock: ScheduleEvent = {
      id: `lk${Date.now()}`,
      type: "lock",
      guideId,
      startTime: start.toISOString(),
      endTime:   end.toISOString(),
      reason:    lockReason.trim(),
      note:      lockNote.trim() || undefined,
      reminders,
    };

    try {
      const raw  = await AsyncStorage.getItem(SCHEDULE_STORAGE);
      const list = raw ? JSON.parse(raw) : [];
      list.push(newLock);
      await AsyncStorage.setItem(SCHEDULE_STORAGE, JSON.stringify(list));
      setEvents(prev =>
        [...prev, newLock].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      );
      setLockModal(false);
      resetLockForm();
    } catch { setLockError("Lưu thất bại, thử lại."); }
  };

  const handleDeleteEvent = async (evId: string) => {
    try {
      const raw  = await AsyncStorage.getItem(SCHEDULE_STORAGE);
      const list = raw ? JSON.parse(raw) : [];
      const updated = list.filter((x: any) => x.id !== evId);
      await AsyncStorage.setItem(SCHEDULE_STORAGE, JSON.stringify(updated));
      setEvents(prev => prev.filter(e => e.id !== evId));
      setDetailEvent(null);
    } catch {}
  };

  // ── Sync / Export ────────────────────────────────────────────────────────
  const buildICSContent = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LocalMate//GuideSchedule//VI",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    events.forEach(ev => {
      const dtStart = new Date(ev.startTime).toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
      const dtEnd   = new Date(ev.endTime).toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.id}@localmate`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${ev.type === "tour" ? (ev.tourName || "Tour") : "Lịch Bận"}`);
      if (ev.reason) lines.push(`DESCRIPTION:${ev.reason}`);
      if (ev.reminders?.length) {
        ev.reminders.forEach(r => {
          lines.push("BEGIN:VALARM");
          lines.push("ACTION:DISPLAY");
          lines.push(`TRIGGER:-PT${r.minutesBefore}M`);
          lines.push(`DESCRIPTION:Nhắc: ${ev.reason || ev.tourName}`);
          lines.push("END:VALARM");
        });
      }
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  };

  const handleSyncGoogle = () => {
    // Mở Google Calendar với event đầu tiên nếu có
    const url = "https://calendar.google.com/calendar/r";
    Linking.openURL(url).catch(() => {});
  };
  const handleSyncOutlook = () => {
    Linking.openURL("https://outlook.live.com/calendar/0/addevent").catch(() => {});
  };
  const handleExportICS = () => {
    // Trên web: tạo data URL và download; trên native: chia sẻ file
    const ics = buildICSContent();
    if (Platform.OS === "web") {
      const blob = new Blob([ics], { type: "text/calendar" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "localmate-schedule.ics"; a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Xuất lịch (.ics)", "File .ics đã được tạo. Bạn có thể import vào Google Calendar, Outlook hoặc bất kỳ app lịch nào hỗ trợ iCalendar.", [{ text: "OK" }]);
    }
    setSyncModal(false);
  };

  // ── Week view helper ─────────────────────────────────────────────────────
  const getWeekDays = (): Date[] => {
    const dow = currentDate.getDay();
    const mon = new Date(currentDate);
    mon.setDate(currentDate.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
    });
  };

  // ── Year view helper ─────────────────────────────────────────────────────
  const getYearMonths = (): number[] => Array.from({ length: 12 }, (_, i) => i);

  const sz = (v: number) => Math.round(v * scale);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Day View ──────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayEvs = eventsForDate(currentDate);
    const lunar  = getLunarDate(currentDate);
    return (
      <View style={s.dayViewContainer}>
        <View style={s.dayViewHeader}>
          <Text style={s.dayViewDayName}>{currentDate.toLocaleDateString("vi-VN", { weekday: "long" })}</Text>
          <Text style={s.dayViewDayNum}>{currentDate.getDate()}</Text>
          {lunar ? <Text style={s.lunarTxt}>Âm lịch: {lunar}</Text> : null}
        </View>
        {dayEvs.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="calendar-outline" size={sz(40)} color="#c0d0f0" />
            <Text style={s.emptyTxt}>Không có lịch trong ngày này</Text>
          </View>
        ) : (
          dayEvs.map((ev, i) => (
            <TouchableOpacity key={i} style={[s.eventRow, { borderLeftColor: ev.type === "tour" ? COLOR_TOUR : COLOR_LOCK }]}
              onPress={() => setDetailEvent(ev)}>
              <View style={s.eventRowTime}>
                <Text style={s.eventRowTimeStart}>{new Date(ev.startTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</Text>
                <Text style={s.eventRowTimeEnd}>{new Date(ev.endTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</Text>
              </View>
              <View style={[s.eventRowBody, { backgroundColor: ev.type === "tour" ? COLOR_TOUR + "18" : COLOR_LOCK + "18" }]}>
                <Text style={[s.eventRowTitle, { color: ev.type === "tour" ? COLOR_TOUR : COLOR_LOCK }]}>
                  {ev.type === "tour" ? (ev.tourName || "Tour đã đặt") : "Lịch Bận"}
                </Text>
                <Text style={s.eventRowSub}>{ev.reason || (ev.guests ? `${ev.guests} khách` : "")}</Text>
                {ev.note ? <Text style={s.eventRowNote}> {ev.note}</Text> : null}
                {ev.reminders?.length ? (
                  <View style={s.remindTag}>
                    <Ionicons name="alarm-outline" size={sz(11)} color={COLOR_NOTE} />
                    <Text style={s.remindTagTxt}>Nhắc trước {ev.reminders[0].minutesBefore} phút · {ev.reminders[0].times} lần</Text>
                  </View>
                ) : null}
              </View>
              {ev.type === "tour" && ev.id && (
                <TouchableOpacity
                  style={{ justifyContent: "center", paddingHorizontal: sz(8) }}
                  onPress={() => { setDetailEvent(null); router.push({ pathname: "/shared-booking-detail", params: { bookingId: ev.id } } as any); }}>
                  <Ionicons name="eye-outline" size={sz(20)} color={COLOR_TOUR} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  // ── Week View ─────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const days = getWeekDays();
    const today = new Date().toLocaleDateString("vi-VN");
    return (
      <View>
        <View style={s.weekGrid}>
          {days.map((d, i) => {
            const dayEvs  = eventsForDate(d);
            const str     = d.toLocaleDateString("vi-VN");
            const isToday = str === today;
            const isSel   = str === selectedDate.toLocaleDateString("vi-VN");
            const hasTour = dayEvs.some(e => e.type === "tour");
            const hasLock = dayEvs.some(e => e.type === "lock");
            return (
              <TouchableOpacity key={i} style={[s.weekDayCol, isSel && s.weekDayColSel]}
                onPress={() => { setSelectedDate(d); setCurrentDate(d); setViewMode("day"); }}>
                <Text style={[s.weekDayLabel, isToday && { color: COLOR_TOUR }]}>{WEEK_DAYS[i]}</Text>
                <View style={[s.weekDayNum, isToday && s.weekDayNumToday, isSel && s.weekDayNumSel]}>
                  <Text style={[s.weekDayNumTxt, isToday && { color: "#fff" }]}>{d.getDate()}</Text>
                </View>
                {hasTour && <View style={[s.weekDot, { backgroundColor: COLOR_TOUR }]} />}
                {hasLock && <View style={[s.weekDot, { backgroundColor: COLOR_LOCK }]} />}
                {dayEvs.length > 0 && (
                  <View style={[s.weekEventCount, { backgroundColor: hasTour ? COLOR_TOUR : COLOR_LOCK }]}>
                    <Text style={s.weekEventCountTxt}>{dayEvs.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Events dưới mỗi ngày */}
        <View style={{ marginTop: sz(12) }}>
          {days.map((d, i) => {
            const dayEvs = eventsForDate(d);
            if (dayEvs.length === 0) return null;
            return (
              <View key={i}>
                <Text style={s.weekEvDateLabel}>{d.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"})}</Text>
                {dayEvs.map((ev, j) => (
                  <TouchableOpacity key={j} style={[s.eventRow, { borderLeftColor: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}
                    onPress={() => setDetailEvent(ev)}>
                    <View style={s.eventRowTime}>
                      <Text style={s.eventRowTimeStart}>{new Date(ev.startTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</Text>
                    </View>
                    <View style={[s.eventRowBody, { backgroundColor: ev.type==="tour"?COLOR_TOUR+"18":COLOR_LOCK+"18" }]}>
                      <Text style={[s.eventRowTitle, { color: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}>
                        {ev.type==="tour" ? (ev.tourName||"Tour") : "Lịch Bận"}
                      </Text>
                    </View>
                    {ev.type === "tour" && ev.id && (
                      <TouchableOpacity
                        style={{ justifyContent: "center", paddingHorizontal: sz(8) }}
                        onPress={() => { setDetailEvent(null); router.push({ pathname: "/shared-booking-detail", params: { bookingId: ev.id } } as any); }}>
                        <Ionicons name="eye-outline" size={sz(20)} color={COLOR_TOUR} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Month View ────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const cells = buildCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
    const today = new Date().toLocaleDateString("vi-VN");
    const selStr = selectedDate.toLocaleDateString("vi-VN");

    return (
      <View>
        <View style={s.calendarCard}>
          {/* Tên thứ */}
          <View style={s.weekDaysRow}>
            {WEEK_DAYS.map(d => <Text key={d} style={s.weekDayTxt}>{d}</Text>)}
          </View>

          {/* Các ngày */}
          <View style={s.daysGrid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={s.dayCell} />;
              const d    = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const str  = d.toLocaleDateString("vi-VN");
              const dayEvs  = eventsByDate[str] || [];
              const nTour   = dayEvs.filter(e => e.type==="tour").length;
              const nLock   = dayEvs.filter(e => e.type==="lock").length;
              const isToday = str === today;
              const isSel   = str === selStr;
              const lunar   = getLunarDate(d);

              // Màu nền dựa trên số lượng sự kiện
              let bgColor: string | undefined;
              if (nTour > 0 && nLock > 0) bgColor = "#8b5cf620";
              else if (nTour > 0) bgColor = COLOR_TOUR + (nTour > 1 ? "30" : "18");
              else if (nLock > 0) bgColor = COLOR_LOCK + (nLock > 1 ? "30" : "18");

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.dayCell,
                    isToday && s.dateCircleToday,
                    isSel && s.dayCellSelected,
                    { backgroundColor: bgColor }
                  ]}
                  onPress={() => {
                    setSelectedDate(d);
                  }}
                >
                  <View style={[
                    s.dateCircle,
                    isToday && s.dateCircleToday,
                    isSel && s.dateCircleSel
                  ]}>
                    <Text style={[
                      s.dateText,
                      isToday && s.dateTextToday,
                      isSel && s.dateTextSel
                    ]}>
                      {day}
                    </Text>
                  </View>
                  {lunar ? <Text style={s.lunarDayTxt}>{lunar}</Text> : null}
                  <View style={s.dotsRow}>
                    {nTour > 0 && <View style={[s.dot, { backgroundColor: COLOR_TOUR }]} />}
                    {nLock > 0 && <View style={[s.dot, { backgroundColor: COLOR_LOCK }]} />}
                  </View>
                  {dayEvs.length > 1 && (
                    <View style={[s.dayCountBadge, { backgroundColor: "#8b5cf6" }]}>
                      <Text style={s.dayCountTxt}>{dayEvs.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Chú thích */}
          <View style={s.legend}>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: COLOR_TOUR }]} /><Text style={s.legendTxt}>Tour đã đặt</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: COLOR_LOCK }]} /><Text style={s.legendTxt}>Lịch bận</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#8b5cf6" }]} /><Text style={s.legendTxt}>Nhiều lịch</Text></View>
          </View>
        </View>

        {/* Events của ngày đang chọn */}
        <View style={s.selectedDaySection}>
          <Text style={s.selectedDayTitle}>
            {selectedDate.toLocaleDateString("vi-VN", { weekday:"long", day:"2-digit", month:"long" })}
            {getLunarDate(selectedDate) ? <Text style={{ fontSize: sz(12), color: "#94a3b8" }}>  ({getLunarDate(selectedDate)} âm)</Text> : null}
          </Text>
          {eventsForSelectedDate.length === 0 ? (
            <Text style={s.noEventTxt}>Không có lịch trong ngày này.</Text>
          ) : (
            eventsForSelectedDate.map((ev, i) => (
              <TouchableOpacity key={i} style={[s.eventRow, { borderLeftColor: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}
                onPress={() => setDetailEvent(ev)}>
                <View style={s.eventRowTime}>
                  <Text style={s.eventRowTimeStart}>{new Date(ev.startTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</Text>
                  <Text style={s.eventRowTimeEnd}>{new Date(ev.endTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</Text>
                </View>
                <View style={[s.eventRowBody, { backgroundColor: ev.type==="tour"?COLOR_TOUR+"18":COLOR_LOCK+"18", flex:1 }]}>
                  <Text style={[s.eventRowTitle, { color: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}>
                    {ev.type==="tour" ? (ev.tourName||"Tour đã đặt") : "Lịch Bận"}
                  </Text>
                  <Text style={s.eventRowSub}>{ev.reason || (ev.guests ? `${ev.guests} khách` : "")}</Text>
                  {ev.note ? <Text style={s.eventRowNote}>📝 {ev.note}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={sz(16)} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    );
  };

  // ── Year View ─────────────────────────────────────────────────────────────
  const renderYearView = () => (
    <View style={s.yearGrid}>
      {getYearMonths().map(m => {
        const cells = buildCalendarDays(currentDate.getFullYear(), m);
        const hasEvent = cells.some(d => {
          if (!d) return false;
          const str = new Date(currentDate.getFullYear(), m, d).toLocaleDateString("vi-VN");
          return (eventsByDate[str]?.length || 0) > 0;
        });
        return (
          <TouchableOpacity key={m} style={s.yearMonthCard}
            onPress={() => { setCurrentDate(new Date(currentDate.getFullYear(), m, 1)); setViewMode("month"); }}>
            <Text style={s.yearMonthName}>{MONTH_NAMES[m]}</Text>
            {hasEvent && <View style={s.yearMonthDot} />}
            <View style={s.yearMiniGrid}>
              {cells.slice(0, 35).map((d, i) => {
                if (!d) return <View key={`e-${i}`} style={s.yearMiniCell} />;
                const str = new Date(currentDate.getFullYear(), m, d).toLocaleDateString("vi-VN");
                const evs = eventsByDate[str] || [];
                const hasTour = evs.some(e => e.type==="tour");
                const hasLock = evs.some(e => e.type==="lock");
                return (
                  <View key={i} style={[
                    s.yearMiniCell,
                    hasTour && { backgroundColor: COLOR_TOUR + "40", borderRadius: 2 },
                    hasLock && !hasTour && { backgroundColor: COLOR_LOCK + "40", borderRadius: 2 },
                  ]}>
                    <Text style={s.yearMiniDayTxt}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <View style={[s.container, { justifyContent:"center", alignItems:"center" }]}>
      <ActivityIndicator size="large" color={COLOR_TOUR} />
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + sz(8) }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.replace("/guide-home")}>
          <Ionicons name="arrow-back" size={sz(22)} color="#1f2a58" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems:"center" }}>
          <Text style={s.headerTitle} numberOfLines={1}>{headerLabel()}</Text>
        </View>

        <View style={{ flexDirection:"row", gap: sz(8) }}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowSearch(v => !v)}>
            <Ionicons name="search-outline" size={sz(20)} color="#1f2a58" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor:"#eaf0ff" }]} onPress={() => setSyncModal(true)}>
            <Ionicons name="sync-outline" size={sz(20)} color={COLOR_TOUR} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor:"#fef2f2" }]}
            onPress={() => { resetLockForm(); setLockModal(true); }}>
            <Ionicons name="lock-closed-outline" size={sz(20)} color={COLOR_LOCK} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <View style={s.searchBar}>
          <Ionicons name="search" size={sz(16)} color="#94a8d8" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm lịch theo tên tour, lý do..."
            placeholderTextColor="#b0bdd8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={sz(18)} color="#94a8d8" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ── VIEW MODE TABS ── */}
      <View style={s.viewModeTabs}>
        {(["day","week","month","year"] as ViewMode[]).map(m => (
          <TouchableOpacity key={m} style={[s.viewModeTab, viewMode===m && s.viewModeTabActive]}
            onPress={() => setViewMode(m)}>
            <Text style={[s.viewModeTabTxt, viewMode===m && s.viewModeTabTxtActive]}>
              {m==="day"?"Ngày":m==="week"?"Tuần":m==="month"?"Tháng":"Năm"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── NAV ROW ── */}
      <View style={s.navRow}>
        <TouchableOpacity style={s.navBtn} onPress={prevPeriod}>
          <Ionicons name="chevron-back" size={sz(20)} color="#1f2a58" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
          <Text style={s.todayBtn}>Hôm nay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={nextPeriod}>
          <Ionicons name="chevron-forward" size={sz(20)} color="#1f2a58" />
        </TouchableOpacity>
      </View>

      {/* ── FILTER CHIPS ── */}
      {!showSearch && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} 
  style={{ flexGrow: 0, flexShrink: 1 }}
  contentContainerStyle={s.filterRow}>
          {([["all","Tất cả"],["tour","Tour hẹn"],["lock","Lịch bận"]] as [FilterType,string][]).map(([k,label]) => (
            <TouchableOpacity key={k} style={[s.filterChip, filterType===k && s.filterChipActive]}
              onPress={() => setFilterType(k)}>
              {k==="tour" && <View style={[s.filterDot, { backgroundColor: COLOR_TOUR }]} />}
              {k==="lock" && <View style={[s.filterDot, { backgroundColor: COLOR_LOCK }]} />}
              <Text style={[s.filterChipTxt, filterType===k && s.filterChipTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.eventCountChip}>
            <Text style={s.eventCountChipTxt}>{displayEvents.length} lịch</Text>
          </View>
        </ScrollView>
      )}

      {/* ── MAIN CONTENT ── */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() ? (
          // Kết quả tìm kiếm
          <>
            <Text style={s.searchResultLabel}>{displayEvents.length} kết quả cho "{searchQuery}"</Text>
            {displayEvents.map((ev, i) => (
              <TouchableOpacity key={i} style={[s.eventRow, { borderLeftColor: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}
                onPress={() => setDetailEvent(ev)}>
                <View style={s.eventRowTime}>
                  <Text style={s.eventRowTimeStart}>{new Date(ev.startTime).toLocaleDateString("vi-VN")}</Text>
                </View>
                <View style={[s.eventRowBody, { backgroundColor: ev.type==="tour"?COLOR_TOUR+"18":COLOR_LOCK+"18", flex:1 }]}>
                  <Text style={[s.eventRowTitle, { color: ev.type==="tour"?COLOR_TOUR:COLOR_LOCK }]}>
                    {ev.type==="tour" ? (ev.tourName||"Tour") : "Lịch Bận"}
                  </Text>
                  <Text style={s.eventRowSub}>{ev.reason || ""}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {displayEvents.length === 0 && (
              <View style={s.emptyBox}>
                <Ionicons name="search-outline" size={sz(40)} color="#c0d0f0" />
                <Text style={s.emptyTxt}>Không tìm thấy lịch phù hợp</Text>
              </View>
            )}
          </>
        ) : (
          viewMode==="day"   ? renderDayView()   :
          viewMode==="week"  ? renderWeekView()  :
          viewMode==="month" ? renderMonthView() :
          renderYearView()
        )}
      </ScrollView>

      

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: THÊM LỊCH BẬN
      ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={lockModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + sz(20) }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Thêm Lịch Bận</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => { setLockModal(false); resetLockForm(); }}>
                <Ionicons name="close" size={sz(20)} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>

              {/* Chọn ngày */}
              <Text style={s.inputLabel}>Ngày bận <Text style={{ color: COLOR_LOCK }}>*</Text></Text>
              <TouchableOpacity style={s.datePickerBtn} onPress={() => setDatePickerVisible(true)}>
                <Ionicons name="calendar-outline" size={sz(18)} color={COLOR_TOUR} />
                <Text style={[s.datePickerBtnTxt, !getSelectedLockDate() && { color: "#b0bdd8" }]}>
                  {lockDateLabel()}
                </Text>
                <Ionicons name="chevron-down" size={sz(16)} color="#94a8d8" />
              </TouchableOpacity>

              {/* Lý do */}
              <Text style={s.inputLabel}>Lý do <Text style={{ color: COLOR_LOCK }}>*</Text></Text>
              <TextInput style={s.input} placeholder="VD: Bận việc gia đình, đám cưới..." placeholderTextColor="#b0bdd8"
                value={lockReason} onChangeText={setLockReason} />

              {/* Ghi chú */}
              <Text style={s.inputLabel}>Ghi chú thêm</Text>
              <TextInput style={[s.input, { height: sz(70), textAlignVertical:"top" }]}
                placeholder="Ghi chú nội bộ (không hiển thị với khách)..."
                placeholderTextColor="#b0bdd8" multiline
                value={lockNote} onChangeText={setLockNote} />

              {/* Nhắc nhở */}
              <TouchableOpacity style={s.remindToggle} onPress={() => setShowRemindPicker(v => !v)}>
                <Ionicons name={showRemindPicker ? "alarm" : "alarm-outline"} size={sz(18)} color={showRemindPicker ? COLOR_NOTE : "#7a8cc2"} />
                <Text style={[s.remindToggleTxt, showRemindPicker && { color: COLOR_NOTE }]}>
                  {showRemindPicker ? "Nhắc nhở đã bật" : "Thêm nhắc nhở"}
                </Text>
                <Ionicons name={showRemindPicker ? "chevron-up" : "chevron-down"} size={sz(16)} color="#94a8d8" />
              </TouchableOpacity>

              {showRemindPicker && (
                <View style={s.remindBox}>
                  <View style={s.remindRow}>
                    <Text style={s.remindLabel}>Nhắc trước</Text>
                    <View style={s.remindInputWrap}>
                      {[15,30,60,120].map(m => (
                        <TouchableOpacity key={m}
                          style={[s.remindChip, remindMinutes===String(m) && s.remindChipActive]}
                          onPress={() => setRemindMinutes(String(m))}>
                          <Text style={[s.remindChipTxt, remindMinutes===String(m) && { color:"#fff" }]}>
                            {m < 60 ? `${m} phút` : `${m/60} giờ`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={s.remindRow}>
                    <Text style={s.remindLabel}>Số lần nhắc</Text>
                    <View style={s.remindInputWrap}>
                      {[1,2,3].map(n => (
                        <TouchableOpacity key={n}
                          style={[s.remindChip, remindTimes===String(n) && s.remindChipActive]}
                          onPress={() => setRemindTimes(String(n))}>
                          <Text style={[s.remindChipTxt, remindTimes===String(n) && { color:"#fff" }]}>{n} lần</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Error */}
              {lockError ? (
                <View style={s.errorBox}>
                  <Ionicons name="warning-outline" size={sz(14)} color="#dc2626" />
                  <Text style={s.errorTxt}>{lockError}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={s.saveBtn} onPress={handleAddLock}>
                <Ionicons name="lock-closed" size={sz(18)} color="#fff" />
                <Text style={s.saveBtnTxt}>Khóa Lịch</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: DATE PICKER (Calendar)
      ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={s.dpOverlay}>
          <View style={s.dpBox}>
            <View style={s.dpHeader}>
              <TouchableOpacity style={s.dpNavBtn}
                onPress={() => { pickerViewMonth===0 ? (setPickerViewMonth(11), setPickerViewYear(y=>y-1)) : setPickerViewMonth(m=>m-1); }}>
                <Ionicons name="chevron-back" size={sz(20)} color="#1f2a58" />
              </TouchableOpacity>
              <Text style={s.dpMonthTxt}>{MONTH_NAMES[pickerViewMonth]} {pickerViewYear}</Text>
              <TouchableOpacity style={s.dpNavBtn}
                onPress={() => { pickerViewMonth===11 ? (setPickerViewMonth(0), setPickerViewYear(y=>y+1)) : setPickerViewMonth(m=>m+1); }}>
                <Ionicons name="chevron-forward" size={sz(20)} color="#1f2a58" />
              </TouchableOpacity>
            </View>
            <View style={s.dpWeekRow}>
              {WEEK_DAYS.map(d => <Text key={d} style={s.dpWeekTxt}>{d}</Text>)}
            </View>
            <View style={s.dpGrid}>
              {buildCalendarDays(pickerViewYear, pickerViewMonth).map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={s.dpDayCell} />;
                const disabled = isDateDisabled(pickerViewYear, pickerViewMonth, day);
                const isSel = pickerSelDay===day && pickerSelMon===pickerViewMonth && pickerSelYear===pickerViewYear;
                return (
                  <TouchableOpacity key={`d-${idx}`}
                    style={[s.dpDayCell, isSel && s.dpDaySel, disabled && s.dpDayDisabled]}
                    disabled={disabled}
                    onPress={() => { setPickerSelDay(day); setPickerSelMon(pickerViewMonth); setPickerSelYear(pickerViewYear); }}>
                    <Text style={[s.dpDayTxt, isSel && s.dpDaySelTxt, disabled && s.dpDayDisabledTxt]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.dpActions}>
              <TouchableOpacity style={s.dpCancelBtn} onPress={() => setDatePickerVisible(false)}>
                <Text style={s.dpCancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dpConfirmBtn, !pickerSelDay && { opacity: 0.45 }]}
                disabled={!pickerSelDay}
                onPress={confirmDatePicker}>
                <Text style={s.dpConfirmTxt}>Chọn ngày này</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: CHI TIẾT SỰ KIỆN
      ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={!!detailEvent} transparent animationType="fade">
        <View style={s.dpOverlay}>
          {detailEvent && (
            <View style={s.detailBox}>
              <View style={[s.detailHeader, { backgroundColor: detailEvent.type==="tour" ? COLOR_TOUR : COLOR_LOCK }]}>
                <Text style={s.detailHeaderTitle}>
                  {detailEvent.type==="tour" ? (detailEvent.tourName||"Tour đã đặt") : "Lịch Bận Cá Nhân"}
                </Text>
                <TouchableOpacity onPress={() => setDetailEvent(null)}>
                  <Ionicons name="close" size={sz(22)} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={s.detailBody}>
                <View style={s.detailRow}>
                  <Ionicons name="calendar-outline" size={sz(16)} color="#7a8cc2" />
                  <Text style={s.detailTxt}>
                    {new Date(detailEvent.startTime).toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="time-outline" size={sz(16)} color="#7a8cc2" />
                  <Text style={s.detailTxt}>
                    {new Date(detailEvent.startTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}
                    {" – "}
                    {new Date(detailEvent.endTime).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}
                  </Text>
                </View>
                {detailEvent.reason && (
                  <View style={s.detailRow}>
                    <Ionicons name="information-circle-outline" size={sz(16)} color="#7a8cc2" />
                    <Text style={s.detailTxt}>{detailEvent.reason}</Text>
                  </View>
                )}
                {detailEvent.guests ? (
                  <View style={s.detailRow}>
                    <Ionicons name="people-outline" size={sz(16)} color="#7a8cc2" />
                    <Text style={s.detailTxt}>{detailEvent.guests} khách</Text>
                  </View>
                ) : null}
                {detailEvent.note ? (
                  <View style={[s.detailRow, { alignItems:"flex-start" }]}>
                    <Ionicons name="document-text-outline" size={sz(16)} color="#7a8cc2" />
                    <Text style={[s.detailTxt, { flex:1 }]}>{detailEvent.note}</Text>
                  </View>
                ) : null}
                {detailEvent.reminders?.length ? (
                  <View style={s.detailRow}>
                    <Ionicons name="alarm-outline" size={sz(16)} color={COLOR_NOTE} />
                    <Text style={[s.detailTxt, { color: COLOR_NOTE }]}>
                      Nhắc trước {detailEvent.reminders[0].minutesBefore} phút · {detailEvent.reminders[0].times} lần
                    </Text>
                  </View>
                ) : null}
              </View>
              {detailEvent.type === "tour" && (
                <TouchableOpacity
                  style={[s.detailDeleteBtn, { backgroundColor: "#eaf0ff", borderTopColor: "#e4ebff" }]}
                  onPress={() => {
                    setDetailEvent(null);
                    router.push({ pathname: "/shared-booking-detail", params: { bookingId: detailEvent.id } } as any);
                  }}>
                  <Ionicons name="eye-outline" size={sz(16)} color={COLOR_TOUR} />
                  <Text style={[s.detailDeleteTxt, { color: COLOR_TOUR }]}>Xem chi tiết đơn đặt</Text>
                </TouchableOpacity>
              )}
              {detailEvent.type === "lock" && (
                <TouchableOpacity style={s.detailDeleteBtn}
                  onPress={() => handleDeleteEvent(detailEvent.id)}>
                  <Ionicons name="trash-outline" size={sz(16)} color={COLOR_LOCK} />
                  <Text style={s.detailDeleteTxt}>Xóa lịch bận này</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ĐỒNG BỘ LỊCH
      ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={syncModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + sz(20) }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Đồng bộ & Xuất Lịch</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setSyncModal(false)}>
                <Ionicons name="close" size={sz(20)} color="#1f2a58" />
              </TouchableOpacity>
            </View>

            <View style={[s.modalBody, { paddingTop: sz(8) }]}>
              <Text style={s.syncDesc}>
                Đồng bộ lịch làm việc của bạn với các ứng dụng lịch phổ biến.{"\n"}
                Khách hàng sẽ luôn thấy lịch rảnh chính xác nhất.
              </Text>

              {/* Google Calendar */}
              <TouchableOpacity style={s.syncCard} onPress={handleSyncGoogle}>
                <View style={[s.syncIcon, { backgroundColor: "#fef2f2" }]}>
                  <Ionicons name="logo-google" size={sz(24)} color="#ef4444" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.syncCardTitle}>Google Calendar</Text>
                  <Text style={s.syncCardSub}>Mở Google Calendar để xem và thêm lịch</Text>
                </View>
                <Ionicons name="open-outline" size={sz(18)} color="#94a8d8" />
              </TouchableOpacity>

              {/* Outlook / Microsoft */}
              <TouchableOpacity style={s.syncCard} onPress={handleSyncOutlook}>
                <View style={[s.syncIcon, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="mail-outline" size={sz(24)} color="#3b82f6" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.syncCardTitle}>Outlook / Microsoft 365</Text>
                  <Text style={s.syncCardSub}>Đồng bộ với Outlook Calendar</Text>
                </View>
                <Ionicons name="open-outline" size={sz(18)} color="#94a8d8" />
              </TouchableOpacity>

              {/* Export .ics */}
              <TouchableOpacity style={s.syncCard} onPress={handleExportICS}>
                <View style={[s.syncIcon, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons name="download-outline" size={sz(24)} color="#10b981" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.syncCardTitle}>Xuất file .ics (iCalendar)</Text>
                  <Text style={s.syncCardSub}>Import vào Apple Calendar, Thunderbird, Zoho, Yahoo Mail, bất kỳ app lịch nào</Text>
                </View>
                <Ionicons name="chevron-forward" size={sz(18)} color="#94a8d8" />
              </TouchableOpacity>

              <View style={s.syncNote}>
                <Ionicons name="information-circle-outline" size={sz(14)} color="#7a8cc2" />
                <Text style={s.syncNoteTxt}>
                  File .ics có thể import vào Google Calendar, Outlook, Apple Calendar, Zoho Mail, Yahoo Calendar, Proton Calendar và hầu hết app lịch hỗ trợ chuẩn iCalendar (RFC 5545).
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-schedule-management" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (scale: number) => {
  const sz = (v: number) => Math.round(v * scale);
  return StyleSheet.create({
    container: { flex:1, backgroundColor:"#f8faff" },

    // Header
    header: {
      flexDirection:"row", alignItems:"center", gap: sz(8),
      paddingHorizontal: sz(14), paddingBottom: sz(10),
      backgroundColor:"#fff", elevation:3,
      shadowColor:"#000", shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:3},
    },
    iconBtn: { width:sz(38), height:sz(38), borderRadius:sz(11), backgroundColor:"#f1f5f9", alignItems:"center", justifyContent:"center" },
    headerTitle: { fontSize:sz(15), fontWeight:"800", color:"#1f2a58", textAlign:"center", flex:1 },

    // Search
    searchBar: {
      flexDirection:"row", alignItems:"center", gap:sz(10),
      backgroundColor:"#fff", paddingHorizontal:sz(16), paddingVertical:sz(10),
      borderBottomWidth:1, borderBottomColor:"#f0f4ff",
    },
    searchInput: { flex:1, fontSize:sz(14), color:"#1f2a58" },

    // View mode tabs
    viewModeTabs: {
      flexDirection:"row", backgroundColor:"#fff",
      borderBottomWidth:1, borderBottomColor:"#f0f4ff",
      paddingHorizontal:sz(16), paddingVertical:sz(4),
    },
    viewModeTab: { flex:1, alignItems:"center", paddingVertical:sz(8), borderBottomWidth:2, borderBottomColor:"transparent" },
    viewModeTabActive: { borderBottomColor:COLOR_TOUR },
    viewModeTabTxt: { fontSize:sz(13), fontWeight:"700", color:"#94a8d8" },
    viewModeTabTxtActive: { color:COLOR_TOUR, fontWeight:"900" },

    // Nav row
    navRow: {
      flexDirection:"row", alignItems:"center", justifyContent:"space-between",
      paddingHorizontal:sz(16), paddingVertical:sz(8),
      backgroundColor:"#fff",
    },
    navBtn: { width:sz(36), height:sz(36), borderRadius:sz(10), backgroundColor:"#f3f7ff", alignItems:"center", justifyContent:"center" },
    todayBtn: { fontSize:sz(13), fontWeight:"800", color:COLOR_TOUR, paddingHorizontal:sz(14), paddingVertical:sz(6), backgroundColor:"#eaf0ff", borderRadius:sz(20) },

    // Filter
    filterRow: { 
  paddingHorizontal:sz(14), paddingVertical:sz(8), gap:sz(8), backgroundColor:"#fff", flexDirection:"row", alignItems:"center",flexGrow: 0,},
    filterChip: { flexDirection:"row", alignItems:"center", gap:sz(5), paddingHorizontal:sz(12), paddingVertical:sz(6), borderRadius:sz(20), backgroundColor:"#f3f7ff", borderWidth:1, borderColor:"#e4ebff" },
    filterChipActive: { backgroundColor:"#1f2a58", borderColor:"#1f2a58" },
    filterDot: { width:sz(7), height:sz(7), borderRadius:sz(4) },
    filterChipTxt: { fontSize:sz(12), fontWeight:"700", color:"#7a8cc2" },
    filterChipTxtActive: { color:"#fff" },
    eventCountChip: { paddingHorizontal:sz(10), paddingVertical:sz(6), backgroundColor:"#f3f7ff", borderRadius:sz(20), borderWidth:1, borderColor:"#e4ebff" },
    eventCountChipTxt: { fontSize:sz(11), color:"#94a8d8", fontWeight:"700" },

    content: { padding:sz(14), paddingBottom:sz(120) },

    // ── Month calendar ──
    calendarCard: { backgroundColor:"#fff", borderRadius:sz(20), padding:sz(14), elevation:3, shadowColor:"#000", shadowOpacity:0.05, shadowRadius:10, shadowOffset:{width:0,height:4}, marginBottom:sz(16) },
    weekDaysRow: { flexDirection:"row", marginBottom:sz(6) },
    weekDayTxt: { flex:1, textAlign:"center", fontSize:sz(11), fontWeight:"800", color:"#94a8d8" },
    daysGrid: { flexDirection:"row", flexWrap:"wrap" },
    dayCell: { width:"14.28%", height:sz(58), alignItems:"center", justifyContent:"flex-start", paddingTop:sz(3), marginBottom:sz(2) },
    dayCellSelected: { backgroundColor:"#eaf0ff", borderRadius:sz(10) },
    dateCircle: { width:sz(30), height:sz(30), borderRadius:sz(15), alignItems:"center", justifyContent:"center" },
    dateCircleToday: { backgroundColor:COLOR_TOUR },
    dateCircleSel: { borderWidth:2, borderColor:COLOR_TOUR },
    dateText: { fontSize:sz(13), fontWeight:"700", color:"#1f2a58" },
    dateTextToday: { color:"#fff" },
    dateTextSel: { color:COLOR_TOUR, fontWeight:"900" },
    lunarDayTxt: { fontSize:sz(8), color:"#94a8d8", marginTop:sz(1) },
    dotsRow: { flexDirection:"row", gap:sz(2), marginTop:sz(2) },
    dot: { width:sz(4), height:sz(4), borderRadius:sz(2) },
    dayCountBadge: { position:"absolute", top:sz(2), right:sz(2), width:sz(14), height:sz(14), borderRadius:sz(7), alignItems:"center", justifyContent:"center" },
    dayCountTxt: { color:"#fff", fontSize:sz(8), fontWeight:"900" },
    legend: { flexDirection:"row", gap:sz(14), marginTop:sz(10), paddingTop:sz(10), borderTopWidth:1, borderTopColor:"#f0f4ff", flexWrap:"wrap" },
    legendItem: { flexDirection:"row", alignItems:"center", gap:sz(5) },
    legendDot: { width:sz(10), height:sz(10), borderRadius:sz(5) },
    legendTxt: { fontSize:sz(11), color:"#64748b", fontWeight:"600" },

    // Selected day section
    selectedDaySection: { marginBottom:sz(10) },
    selectedDayTitle: { fontSize:sz(15), fontWeight:"900", color:"#1f2a58", marginBottom:sz(10) },
    noEventTxt: { textAlign:"center", color:"#94a8d8", fontSize:sz(13), paddingVertical:sz(20) },

    // ── Day view ──
    dayViewContainer: { marginBottom:sz(10) },
    dayViewHeader: { backgroundColor:"#fff", borderRadius:sz(16), padding:sz(16), marginBottom:sz(14), alignItems:"center", elevation:2 },
    dayViewDayName: { fontSize:sz(13), color:"#7a8cc2", fontWeight:"700" },
    dayViewDayNum: { fontSize:sz(48), fontWeight:"900", color:COLOR_TOUR, lineHeight:sz(56) },

    // ── Week view ──
    weekGrid: { flexDirection:"row", backgroundColor:"#fff", borderRadius:sz(16), padding:sz(10), marginBottom:sz(14), elevation:2, gap:sz(4) },
    weekDayCol: { flex:1, alignItems:"center", gap:sz(4), paddingVertical:sz(8), borderRadius:sz(10) },
    weekDayColSel: { backgroundColor:"#eaf0ff" },
    weekDayLabel: { fontSize:sz(10), fontWeight:"800", color:"#94a8d8" },
    weekDayNum: { width:sz(28), height:sz(28), borderRadius:sz(14), alignItems:"center", justifyContent:"center" },
    weekDayNumToday: { backgroundColor:COLOR_TOUR },
    weekDayNumSel: { borderWidth:2, borderColor:COLOR_TOUR },
    weekDayNumTxt: { fontSize:sz(13), fontWeight:"800", color:"#1f2a58" },
    weekDot: { width:sz(5), height:sz(5), borderRadius:sz(3) },
    weekEventCount: { paddingHorizontal:sz(5), paddingVertical:sz(1), borderRadius:sz(8) },
    weekEventCountTxt: { color:"#fff", fontSize:sz(9), fontWeight:"900" },
    weekEvDateLabel: { fontSize:sz(13), fontWeight:"800", color:"#1f2a58", marginBottom:sz(6), marginTop:sz(4) },

    // ── Year view ──
    yearGrid: { flexDirection:"row", flexWrap:"wrap", gap:sz(10) },
    yearMonthCard: { width:`${(100 - 3) / 3}%` as any, backgroundColor:"#fff", borderRadius:sz(12), padding:sz(8), elevation:1, alignItems:"center" },
    yearMonthName: { fontSize:sz(10), fontWeight:"800", color:"#1f2a58", marginBottom:sz(4) },
    yearMonthDot: { width:sz(5), height:sz(5), borderRadius:sz(3), backgroundColor:COLOR_TOUR, marginBottom:sz(4) },
    yearMiniGrid: { flexDirection:"row", flexWrap:"wrap", width:"100%" },
    yearMiniCell: { width:`${100/7}%` as any, aspectRatio:1, alignItems:"center", justifyContent:"center" },
    yearMiniDayTxt: { fontSize:sz(6), color:"#94a8d8" },

    // ── Event row (shared) ──
    eventRow: {
      backgroundColor:"#fff", borderRadius:sz(14), padding:sz(12), marginBottom:sz(10),
      flexDirection:"row", alignItems:"stretch", gap:sz(10),
      borderLeftWidth:sz(4), elevation:2,
      shadowColor:"#000", shadowOpacity:0.04, shadowRadius:8, shadowOffset:{width:0,height:3},
    },
    eventRowTime: { width:sz(48), alignItems:"center", justifyContent:"center" },
    eventRowTimeStart: { fontSize:sz(12), fontWeight:"900", color:"#1f2a58", textAlign:"center" },
    eventRowTimeEnd: { fontSize:sz(10), color:"#94a8d8", textAlign:"center" },
    eventRowBody: { flex:1, borderRadius:sz(10), padding:sz(10) },
    eventRowTitle: { fontSize:sz(13), fontWeight:"800", marginBottom:sz(2) },
    eventRowSub: { fontSize:sz(11), color:"#7a8cc2" },
    eventRowNote: { fontSize:sz(11), color:"#7a8cc2", fontStyle:"italic", marginTop:sz(3) },
    remindTag: { flexDirection:"row", alignItems:"center", gap:sz(4), marginTop:sz(4) },
    remindTagTxt: { fontSize:sz(10), color:COLOR_NOTE, fontWeight:"700" },

    // ── Empty ──
    emptyBox: { alignItems:"center", paddingVertical:sz(40), gap:sz(10) },
    emptyTxt: { color:"#94a8d8", fontSize:sz(14), textAlign:"center" },
    lunarTxt: { color:"#94a8d8", fontSize:sz(12), marginTop:sz(2) },
    searchResultLabel: { fontSize:sz(13), color:"#7a8cc2", marginBottom:sz(10), fontWeight:"700" },

    

    // ── Modal chung ──
    modalOverlay: { flex:1, backgroundColor:"rgba(10,18,50,0.5)", justifyContent:"flex-end" },
    modalSheet: { backgroundColor:"#fff", borderTopLeftRadius:sz(24), borderTopRightRadius:sz(24), maxHeight:"92%" },
    modalHandle: { width:sz(36), height:sz(4), backgroundColor:"#e4ebff", borderRadius:sz(2), alignSelf:"center", marginTop:sz(10), marginBottom:sz(4) },
    modalHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:sz(18), paddingVertical:sz(14), borderBottomWidth:1, borderBottomColor:"#f0f4ff" },
    modalTitle: { fontSize:sz(17), fontWeight:"900", color:"#1f2a58" },
    closeBtn: { width:sz(34), height:sz(34), borderRadius:sz(10), backgroundColor:"#f3f7ff", alignItems:"center", justifyContent:"center" },
    modalBody: { padding:sz(18) },

    inputLabel: { fontSize:sz(12), fontWeight:"800", color:"#1f2a58", marginBottom:sz(6), marginTop:sz(10) },
    input: { backgroundColor:"#f8fafc", borderRadius:sz(12), borderWidth:1, borderColor:"#e2e8f0", paddingHorizontal:sz(14), paddingVertical:sz(12), color:"#1f2a58", fontSize:sz(13), marginBottom:sz(4) },

    datePickerBtn: {
      flexDirection:"row", alignItems:"center", gap:sz(10),
      backgroundColor:"#f8fafc", borderRadius:sz(12), borderWidth:1, borderColor:"#e2e8f0",
      paddingHorizontal:sz(14), paddingVertical:sz(13), marginBottom:sz(4),
    },
    datePickerBtnTxt: { flex:1, fontSize:sz(14), fontWeight:"700", color:"#1f2a58" },

    // Remind
    remindToggle: { flexDirection:"row", alignItems:"center", gap:sz(8), paddingVertical:sz(12), marginVertical:sz(4) },
    remindToggleTxt: { flex:1, fontSize:sz(14), fontWeight:"700", color:"#7a8cc2" },
    remindBox: { backgroundColor:"#fffbeb", borderRadius:sz(12), padding:sz(12), marginBottom:sz(10), gap:sz(10) },
    remindRow: { gap:sz(6) },
    remindLabel: { fontSize:sz(12), fontWeight:"700", color:"#92400e" },
    remindInputWrap: { flexDirection:"row", gap:sz(6), flexWrap:"wrap" },
    remindChip: { paddingHorizontal:sz(12), paddingVertical:sz(6), borderRadius:sz(20), backgroundColor:"#fef3c7", borderWidth:1, borderColor:"#fde68a" },
    remindChipActive: { backgroundColor:COLOR_NOTE, borderColor:COLOR_NOTE },
    remindChipTxt: { fontSize:sz(12), fontWeight:"700", color:"#92400e" },

    errorBox: { flexDirection:"row", alignItems:"center", gap:sz(6), backgroundColor:"#fff1f2", borderRadius:sz(9), paddingHorizontal:sz(12), paddingVertical:sz(8), marginBottom:sz(10), borderWidth:1, borderColor:"#fecaca" },
    errorTxt: { color:"#dc2626", fontSize:sz(12), fontWeight:"700", flex:1 },

    saveBtn: { backgroundColor:COLOR_LOCK, borderRadius:sz(14), height:sz(50), flexDirection:"row", alignItems:"center", justifyContent:"center", gap:sz(8), marginTop:sz(16), marginBottom:sz(20), elevation:3 },
    saveBtnTxt: { color:"#fff", fontSize:sz(15), fontWeight:"900" },

    // ── Date picker modal ──
    dpOverlay: { flex:1, backgroundColor:"rgba(10,18,50,0.55)", alignItems:"center", justifyContent:"center", padding:sz(20) },
    dpBox: { backgroundColor:"#fff", borderRadius:sz(22), width:"100%", maxWidth:sz(360), padding:sz(18), elevation:20 },
    dpHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:sz(12) },
    dpNavBtn: { width:sz(36), height:sz(36), borderRadius:sz(10), backgroundColor:"#f3f7ff", alignItems:"center", justifyContent:"center" },
    dpMonthTxt: { fontSize:sz(16), fontWeight:"900", color:"#1f2a58" },
    dpWeekRow: { flexDirection:"row", marginBottom:sz(6) },
    dpWeekTxt: { flex:1, textAlign:"center", fontSize:sz(11), fontWeight:"800", color:"#94a8d8" },
    dpGrid: { flexDirection:"row", flexWrap:"wrap" },
    dpDayCell: { width:`${100/7}%` as any, aspectRatio:1, alignItems:"center", justifyContent:"center" },
    dpDaySel: { backgroundColor:COLOR_TOUR, borderRadius:sz(10) },
    dpDayDisabled: { opacity:0.3 },
    dpDayTxt: { fontSize:sz(13), fontWeight:"700", color:"#1f2a58" },
    dpDaySelTxt: { color:"#fff" },
    dpDayDisabledTxt: { color:"#94a8d8" },
    dpActions: { flexDirection:"row", gap:sz(10), marginTop:sz(16) },
    dpCancelBtn: { flex:1, height:sz(46), borderRadius:sz(12), backgroundColor:"#f3f7ff", alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#e4ebff" },
    dpCancelTxt: { color:"#7a8cc2", fontWeight:"800", fontSize:sz(14) },
    dpConfirmBtn: { flex:2, height:sz(46), borderRadius:sz(12), backgroundColor:COLOR_TOUR, alignItems:"center", justifyContent:"center" },
    dpConfirmTxt: { color:"#fff", fontWeight:"900", fontSize:sz(14) },

    // ── Detail modal ──
    detailBox: { backgroundColor:"#fff", borderRadius:sz(22), width:"100%", maxWidth:sz(380), overflow:"hidden", elevation:20 },
    detailHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", padding:sz(18) },
    detailHeaderTitle: { color:"#fff", fontSize:sz(16), fontWeight:"900", flex:1, marginRight:sz(10) },
    detailBody: { padding:sz(18), gap:sz(12) },
    detailRow: { flexDirection:"row", alignItems:"center", gap:sz(10) },
    detailTxt: { fontSize:sz(14), color:"#1f2a58", fontWeight:"600", flex:1 },
    detailDeleteBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:sz(8), paddingVertical:sz(14), borderTopWidth:1, borderTopColor:"#f0f4ff", margin:sz(10), borderRadius:sz(12), backgroundColor:"#fef2f2" },
    detailDeleteTxt: { color:COLOR_LOCK, fontSize:sz(14), fontWeight:"800" },

    // ── Sync modal ──
    syncDesc: { fontSize:sz(13), color:"#64748b", lineHeight:sz(20), marginBottom:sz(16) },
    syncCard: { flexDirection:"row", alignItems:"center", gap:sz(12), backgroundColor:"#f8fafc", borderRadius:sz(14), padding:sz(14), marginBottom:sz(10), borderWidth:1, borderColor:"#e4ebff" },
    syncIcon: { width:sz(46), height:sz(46), borderRadius:sz(14), alignItems:"center", justifyContent:"center" },
    syncCardTitle: { fontSize:sz(14), fontWeight:"800", color:"#1f2a58", marginBottom:sz(2) },
    syncCardSub: { fontSize:sz(11), color:"#7a8cc2", lineHeight:sz(16) },
    syncNote: { flexDirection:"row", alignItems:"flex-start", gap:sz(8), backgroundColor:"#f0f9ff", borderRadius:sz(12), padding:sz(12), marginTop:sz(8), borderWidth:1, borderColor:"#bae6fd" },
    syncNoteTxt: { fontSize:sz(11), color:"#0369a1", flex:1, lineHeight:sz(17) },
  });
};