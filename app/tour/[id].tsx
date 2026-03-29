/**
 * app/tour/[id].tsx
 * Chi tiết Tour - Thuật toán Quét Lịch HDV (Loại bỏ HDV kẹt lịch cá nhân hoặc đang dẫn tour)
 * UI: Borderless (Không viền), Shadow/Elevation, Popup Tùy chỉnh.
 *
 * ✅ FIX: Load danh sách HDV từ @guide_profile + GUIDES tĩnh (thay vì chỉ @app_guides luôn null)
 * ✅ FIX: So sánh tên HDV bằng trim().toLowerCase() để tránh lệch khoảng trắng
 * ✅ FIX: Kiểm tra lịch bận từ @guide_schedule (lock) VÀ @guest_bookings (tour đang dẫn)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions, ActivityIndicator, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDES } from '@/constants/travel-data';

export default function TourDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { id } = useLocalSearchParams();
  const [tour, setTour] = useState<any>(null);
  const [guides, setGuides] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [guideSchedules, setGuideSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);

  const [popup, setPopup] = useState({ visible: false, title: "", message: "" });

  useFocusEffect(useCallback(() => {
    const fetchData = async () => {
      try {
        const rawTours         = await AsyncStorage.getItem('@app_tours');
        const rawBookings      = await AsyncStorage.getItem('@guest_bookings');
        const rawGuideSchedule = await AsyncStorage.getItem('@guide_schedule');

        // ── Tìm tour ──────────────────────────────────────────────────────
        if (rawTours) {
          const tList = JSON.parse(rawTours);
          setTour(tList.find((t: any) => t.id === id) || null);
        }

        // ── ✅ BUILD danh sách HDV đúng cách ──────────────────────────────
        // Bắt đầu từ danh sách GUIDES tĩnh (data mẫu)
        let guideList: any[] = [...(GUIDES as any[])];

        // Inject HDV thật từ @guide_profile (HDV đang đăng nhập trên thiết bị)
        const rawGuideProfile = await AsyncStorage.getItem('@guide_profile');
        if (rawGuideProfile) {
          const gp = JSON.parse(rawGuideProfile);
          if (gp.guideId && gp.name) {
            const realGuide = {
              id: gp.guideId,
              name: gp.name,
              location: gp.location || '',
              experience: gp.experience || '',
              skills: gp.skills
                ? gp.skills.split(',').map((x: string) => x.trim())
                : [],
              rating: 5.0,
              tours: 10,
              status: 'active',
            };
            // Thay thế nếu trùng id hoặc trùng tên, tránh trùng lặp
            guideList = [
              realGuide,
              ...guideList.filter(
                g =>
                  g.id !== realGuide.id &&
                  g.name?.trim().toLowerCase() !== realGuide.name.trim().toLowerCase()
              ),
            ];
          }
        }

        // Nếu @app_guides có dữ liệu thêm (nhiều HDV được Admin tạo) thì merge
        const rawAppGuides = await AsyncStorage.getItem('@app_guides');
        if (rawAppGuides) {
          const appGuides: any[] = JSON.parse(rawAppGuides);
          appGuides.forEach(ag => {
            const alreadyIn = guideList.some(
              g =>
                g.id === ag.id ||
                g.name?.trim().toLowerCase() === ag.name?.trim().toLowerCase()
            );
            if (!alreadyIn) guideList.push(ag);
          });
        }

        setGuides(guideList);

        // ── Lịch booking & lịch khóa cá nhân ─────────────────────────────
        if (rawBookings)      setBookings(JSON.parse(rawBookings));
        if (rawGuideSchedule) setGuideSchedules(JSON.parse(rawGuideSchedule));

      } catch (error) {
        console.error('TourDetail fetchData error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]));

  // ── THUẬT TOÁN QUÉT LỊCH HDV RẢNH ────────────────────────────────────────
  const handleSelectSchedule = (schedule: any) => {
    setSelectedSchedule(schedule);
    setSelectedGuide(null);

    const schStart = new Date(schedule.startTime).getTime();
    const schEnd   = new Date(schedule.endTime).getTime();

    // 1. Lọc HDV được phép dẫn tour này (dựa vào assignedGuideNames)
    //    So sánh trim + toLowerCase để tránh lỗi khoảng trắng
    const allowedGuides = guides.filter(g =>
      tour?.assignedGuideNames?.some(
        (n: string) => n.trim().toLowerCase() === g.name?.trim().toLowerCase()
      )
    );

    // 2. Lọc ra HDV còn rảnh trong khung giờ đã chọn
    const freeGuides = allowedGuides.filter(guide => {
      // 2.1 Kẹt lịch dẫn tour (đang có booking active trùng giờ)
      const isBusyTour = bookings.some(b => {
        if (b.guideId !== guide.id) return false;
        if (['cancelled', 'done', 'rejected'].includes(b.status)) return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd   = new Date(b.endTime).getTime();
        return bStart < schEnd && bEnd > schStart; // giao nhau thời gian
      });

      // 2.2 Kẹt lịch bận cá nhân (HDV tự khóa trong @guide_schedule)
      const isBusyPersonal = guideSchedules.some(ls => {
        if (ls.guideId !== guide.id) return false;
        const lStart = new Date(ls.startTime).getTime();
        const lEnd   = new Date(ls.endTime).getTime();
        return lStart < schEnd && lEnd > schStart;
      });

      return !isBusyTour && !isBusyPersonal;
    });

    setAvailableGuides(freeGuides);
  };

  const handleContinue = () => {
    if (!selectedSchedule || !selectedGuide) {
      setPopup({
        visible: true,
        title: "Thiếu thông tin",
        message: "Vui lòng chọn Lịch khởi hành và Hướng dẫn viên đang rảnh để tiếp tục.",
      });
      return;
    }
    router.push({
      pathname: '/guest_booking_flow',
      params: {
        tourId:   tour.id,
        guideId:  selectedGuide.id,
        schStart: selectedSchedule.startTime,
        schEnd:   selectedSchedule.endTime,
      },
    });
  };

  if (isLoading) return (
    <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#4f7cff" />
    </View>
  );

  if (!tour) return (
    <View style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: "#7a8cc2" }}>Không tìm thấy tour.</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: "#4f7cff", marginTop: 10, fontWeight: "800" }}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.round(140 * scale) }}
      >
        <ImageBackground
          source={{ uri: tour.image || 'https://images.unsplash.com/photo-1528360983277-13d401cdc186' }}
          style={[s.cover, { paddingTop: insets.top }]}
        >
          <View style={s.coverOverlay}>
            <TouchableOpacity style={s.circleBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={s.body}>
          <Text style={s.title}>{tour.name}</Text>

          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Ionicons name="time" size={18} color="#4f7cff" />
              <Text style={s.statVal}>{tour.duration}</Text>
            </View>
            <View style={s.statBox}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={s.statVal}>{(tour.rating || 5).toFixed(1)}</Text>
            </View>
          </View>

          <View style={s.descCard}>
            <Text style={s.descText}>
              {tour.description || "Khám phá những vùng đất mới cùng LocalMate."}
            </Text>
          </View>

          {/* ── BƯỚC 1: CHỌN LỊCH KHỞI HÀNH ── */}
          <Text style={s.sectionTitle}>1. Chọn lịch khởi hành</Text>
          {tour.schedules?.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Math.round(12 * scale), paddingBottom: Math.round(10 * scale) }}
            >
              {tour.schedules.map((sch: any) => (
                <TouchableOpacity
                  key={sch.id}
                  style={[s.schCard, selectedSchedule?.id === sch.id && s.schCardActive]}
                  onPress={() => handleSelectSchedule(sch)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={selectedSchedule?.id === sch.id ? "#fff" : "#4f7cff"}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[s.schDate, selectedSchedule?.id === sch.id && { color: '#fff' }]}>
                    {new Date(sch.startTime).toLocaleDateString('vi-VN')}
                  </Text>
                  <Text style={[s.schTime, selectedSchedule?.id === sch.id && { color: 'rgba(255,255,255,0.8)' }]}>
                    {new Date(sch.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={s.emptyTxt}>Tour này chưa có lịch trình nào mở.</Text>
          )}

          {/* ── BƯỚC 2: CHỌN HDV RẢNH ── */}
          {selectedSchedule && (
            <View style={{ marginTop: Math.round(20 * scale) }}>
              <Text style={s.sectionTitle}>2. Chọn Hướng dẫn viên</Text>
              <Text style={s.subTitle}>Những người đang rảnh rỗi trong khung giờ trên</Text>

              {availableGuides.length > 0 ? (
                availableGuides.map(g => (
                  <View
                    key={g.id}
                    style={[s.guideCard, selectedGuide?.id === g.id && s.guideCardActive]}
                  >
                    <TouchableOpacity
                      style={s.avatar}
                      onPress={() =>
                        router.push({ pathname: "/public-guide-profile", params: { id: g.id } })
                      }
                    >
                      <Ionicons name="person" size={20} color="#4f7cff" />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={[s.guideName, selectedGuide?.id === g.id && { color: '#fff' }]}>
                        {g.name}
                      </Text>
                      <Text style={[s.guideMeta, selectedGuide?.id === g.id && { color: 'rgba(255,255,255,0.8)' }]}>
                        ⭐ {g.rating?.toFixed(1)} · {g.experience}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[s.selectBtn, selectedGuide?.id === g.id && { backgroundColor: '#fff' }]}
                      onPress={() => setSelectedGuide(g)}
                    >
                      <Text style={[s.selectBtnTxt, selectedGuide?.id === g.id && { color: '#10b981' }]}>
                        {selectedGuide?.id === g.id ? "Đã chọn" : "Chọn"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={s.emptyBox}>
                  <Ionicons name="calendar-clear-outline" size={32} color="#f87171" style={{ marginBottom: 8 }} />
                  <Text style={s.emptyTxt}>
                    Rất tiếc, các HDV đều đã kín lịch hoặc bận việc cá nhân trong khung giờ này.
                    Vui lòng chọn giờ khác.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── FLOAT BAR ── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, Math.round(14 * scale)) }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#7a8cc2', fontSize: Math.round(12 * scale), fontWeight: '600' }}>
            Giá cơ bản
          </Text>
          <Text style={{ color: '#10b981', fontSize: Math.round(20 * scale), fontWeight: '900' }}>
            {(tour.priceRaw || 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={handleContinue}>
          <Text style={s.btnTxt}>Tiếp tục</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── POPUP BÁO LỖI ── */}
      <Modal visible={popup.visible} transparent animationType="fade">
        <View style={s.popupOverlay}>
          <View style={s.popupBox}>
            <Ionicons name="information-circle" size={64} color="#f59e0b" />
            <Text style={s.popupTitle}>{popup.title}</Text>
            <Text style={s.popupMessage}>{popup.message}</Text>
            <TouchableOpacity
              style={s.popupBtn}
              onPress={() => setPopup({ ...popup, visible: false })}
            >
              <Text style={s.popupBtnTxt}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    cover: {
      width: '100%', height: sz(280),
      justifyContent: 'flex-start', backgroundColor: '#1f2a58',
    },
    coverOverlay: { flexDirection: 'row', paddingHorizontal: sz(16), paddingTop: sz(10) },
    circleBtn: {
      width: sz(44), height: sz(44), borderRadius: sz(22),
      backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
    },
    body: {
      padding: sz(20), marginTop: sz(-40),
      backgroundColor: '#f8faff',
      borderTopLeftRadius: sz(30), borderTopRightRadius: sz(30),
    },
    title: { fontSize: sz(24), fontWeight: '900', color: '#1f2a58', marginBottom: sz(14) },
    descCard: {
      backgroundColor: '#fff', borderRadius: sz(16), padding: sz(16), marginBottom: sz(24),
      elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    descText: { color: '#64748b', fontSize: sz(14), lineHeight: sz(22) },
    statsRow: { flexDirection: 'row', gap: sz(12), marginBottom: sz(24) },
    statBox: {
      flex: 1, backgroundColor: '#fff', borderRadius: sz(16), padding: sz(14),
      alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
      shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    statVal: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58', marginTop: sz(6) },
    sectionTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58', marginBottom: sz(6) },
    subTitle: { fontSize: sz(12), color: '#7a8cc2', marginBottom: sz(12) },
    emptyBox: {
      backgroundColor: '#fef2f2', padding: sz(16), borderRadius: sz(16), alignItems: 'center',
    },
    emptyTxt: {
      color: '#ef4444', fontStyle: 'italic', fontSize: sz(13),
      textAlign: 'center', lineHeight: sz(20),
    },
    schCard: {
      backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16),
      elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 }, minWidth: sz(110), alignItems: 'center',
    },
    schCardActive: { backgroundColor: '#4f7cff' },
    schDate: { fontSize: sz(15), fontWeight: '900', color: '#1f2a58', marginTop: sz(8) },
    schTime: { fontSize: sz(13), color: '#7a8cc2', marginTop: sz(2) },
    guideCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
      padding: sz(14), borderRadius: sz(16), marginBottom: sz(12),
      elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    guideCardActive: { backgroundColor: '#10b981' },
    avatar: {
      width: sz(46), height: sz(46), borderRadius: sz(14),
      backgroundColor: 'rgba(79, 124, 255, 0.1)',
      alignItems: 'center', justifyContent: 'center', marginRight: sz(12),
    },
    guideName: { fontSize: sz(16), fontWeight: '900', color: '#1f2a58' },
    guideMeta: { fontSize: sz(12), color: '#7a8cc2', marginTop: sz(4), fontWeight: '600' },
    selectBtn: {
      backgroundColor: '#eaf0ff', paddingHorizontal: sz(14),
      paddingVertical: sz(8), borderRadius: sz(10),
    },
    selectBtnTxt: { color: '#4f7cff', fontWeight: '800', fontSize: sz(13) },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: sz(20), paddingTop: sz(14),
      elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20,
      shadowOffset: { width: 0, height: -10 },
    },
    btn: {
      flexDirection: 'row', alignItems: 'center', gap: sz(8),
      backgroundColor: '#4f7cff', borderRadius: sz(14),
      paddingHorizontal: sz(24), height: sz(54),
    },
    btnTxt: { color: '#fff', fontSize: sz(16), fontWeight: '900' },
    popupOverlay: {
      flex: 1, backgroundColor: "rgba(10,18,50,0.6)",
      alignItems: "center", justifyContent: "center", padding: sz(24),
    },
    popupBox: {
      backgroundColor: "#fff", width: "100%", borderRadius: sz(28),
      padding: sz(24), alignItems: "center", elevation: 10,
    },
    popupTitle: {
      fontSize: sz(18), fontWeight: "900", color: "#1f2a58",
      marginTop: sz(16), marginBottom: sz(8), textAlign: "center",
    },
    popupMessage: {
      fontSize: sz(14), color: "#64748b",
      textAlign: "center", marginBottom: sz(24), lineHeight: sz(22),
    },
    popupBtn: {
      width: "100%", height: sz(50), borderRadius: sz(14),
      backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
    },
    popupBtnTxt: { color: "#1f2a58", fontSize: sz(15), fontWeight: "900" },
  });
};