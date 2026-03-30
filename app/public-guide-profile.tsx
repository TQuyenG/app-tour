/**
 * app/public-guide-profile.tsx
 * Trang Hồ sơ công khai HDV - BỔ SUNG: Hiển thị Các Tour nổi bật được HDV ghim
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const safeString = (val: any): string => {
  if (!val) return "Chưa cập nhật";
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
};

export default function PublicGuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<any>(null);
  
  const [showTourModal, setShowTourModal] = useState(false);
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [featuredTours, setFeaturedTours] = useState<any[]>([]); // <-- MỚI

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      try {
        const rawGuides = await AsyncStorage.getItem("@app_guides");
        if (rawGuides) {
          const list = JSON.parse(rawGuides);
          const found = list.find((g: any) => g.id === id);
          if (found) {
            setProfile(found);
            
            // --- TẢI DANH SÁCH TOUR NỔI BẬT ---
            if (found.featuredReviewIds && found.featuredReviewIds.length > 0) {
              const rRaw = await AsyncStorage.getItem('@guide_reviews');
              const tRaw = await AsyncStorage.getItem('@app_tours');
              if (rRaw && tRaw) {
                const reviews = JSON.parse(rRaw);
                const tours = JSON.parse(tRaw);
                const matchedFeatures = found.featuredReviewIds.map((revId: string) => {
                   const review = reviews.find((r:any) => r.id === revId);
                   if (!review) return null;
                   const originalTour = tours.find((t:any) => t.id === review.tourId || t.name === review.tourName);
                   return {
                     id: review.id, tourName: review.tourName,
                     rating: review.tourRating || review.overallRating || review.rating || 5,
                     image: originalTour ? originalTour.images[0] : 'https://images.unsplash.com/photo-1596422846543-75c6ff416413?w=300'
                   };
                }).filter(Boolean);
                setFeaturedTours(matchedFeatures);
              }
            }
          }
        }
        const rawTours = await AsyncStorage.getItem("@app_tours");
        if (rawTours) setAvailableTours(JSON.parse(rawTours).filter((t:any) => t.status === 'active'));
      } catch (e) {}
    };
    loadData();
  }, [id]));

  const handleSelectTourSchedule = (tour: any, schedule: any) => {
    setShowTourModal(false);
    router.push({
      pathname: '/guest_booking_flow',
      params: { tourId: tour.id, guideId: profile.id, schStart: schedule.startTime, schEnd: schedule.endTime }
    } as any);
  };

  if (!profile) return <View style={s.screen} />;

  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.coverBox}>
          <Image source={{ uri: profile.coverUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' }} style={s.coverImg} />
          <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2a58" />
          </TouchableOpacity>
        </View>

        <View style={s.profileCard}>
          <Image source={{ uri: profile.avatar || profile.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.avatarImg} />
          <View style={s.nameRow}>
            <Text style={s.nameTxt}>{profile.name}</Text>
            {profile.vneidVerified && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
          </View>
          <Text style={s.locationTxt}><Ionicons name="location" size={12}/> {safeString(profile.location)}</Text>
          
          <View style={s.tagsRow}>
             {profile.isLocal && <View style={s.verifyBadge}><Ionicons name="home" size={12} color="#10b981"/><Text style={s.verifyTxt}>Người địa phương</Text></View>}
             {profile.vneidVerified && <View style={s.verifyBadge}><Ionicons name="finger-print" size={12} color="#4f7cff"/><Text style={[s.verifyTxt, {color:'#4f7cff'}]}>Đã xác thực VNeID</Text></View>}
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
               <Ionicons name="star" size={20} color="#f59e0b" />
               <Text style={s.statVal}>{Number(profile.rating || 5).toFixed(1)}</Text>
               <Text style={s.statLbl}>Đánh giá</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
               <Ionicons name="map" size={20} color="#4f7cff" />
               <Text style={s.statVal}>{profile.tours || 0}</Text>
               <Text style={s.statLbl}>Tour đã dẫn</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
               <Ionicons name="time" size={20} color="#10b981" />
               <Text style={s.statVal}>{safeString(profile.experience || '1 năm')}</Text>
               <Text style={s.statLbl}>Kinh nghiệm</Text>
            </View>
          </View>
        </View>

        {/* ── MỚI: CÁC CHUYẾN ĐI NỔI BẬT ── */}
        {featuredTours.length > 0 && (
          <View style={{ paddingHorizontal: Math.round(16 * scale), marginBottom: Math.round(20 * scale) }}>
            <Text style={{ fontSize: Math.round(16 * scale), fontWeight: '900', color: '#1f2a58', marginBottom: Math.round(12 * scale) }}>Các chuyến đi nổi bật</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Math.round(12 * scale) }}>
              {featuredTours.map((t, idx) => (
                <View key={idx} style={{ width: Math.round(220 * scale), backgroundColor: '#fff', borderRadius: Math.round(16 * scale), borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 2 }}>
                  <Image source={{ uri: t.image }} style={{ width: '100%', height: Math.round(120 * scale), backgroundColor: '#e2e8f0' }} />
                  <View style={{ padding: Math.round(12 * scale) }}>
                    <Text style={{ fontSize: Math.round(14 * scale), fontWeight: '800', color: '#1f2a58', marginBottom: Math.round(6 * scale) }} numberOfLines={2}>{t.tourName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={{ fontSize: Math.round(13 * scale), fontWeight: '700', color: '#d97706' }}>{t.rating} Tuyệt vời</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={s.infoCard}>
          <Text style={s.infoCardTitle}>Tiểu sử</Text>
          <Text style={s.bioTxt}>{profile.bio || "Xin chào, tôi là một người đam mê du lịch."}</Text>
          
          {(profile.videoUrl || (profile.galleryUrls && profile.galleryUrls.length > 0)) && (
            <View style={s.mediaBox}>
              {profile.videoUrl && (
                <View style={s.videoWrapper}>
                  <Image source={{uri: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600'}} style={s.videoCover} />
                  <View style={s.playBtn}><Ionicons name="play" size={30} color="#fff" /></View>
                  <View style={s.videoLabel}><Text style={{color:'#fff', fontSize: 10, fontWeight: 'bold'}}>Video Giới thiệu</Text></View>
                </View>
              )}
              {profile.galleryUrls && profile.galleryUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, marginTop: 10}}>
                  {profile.galleryUrls.map((url:string, i:number) => (
                    <Image key={i} source={{uri: url}} style={s.galleryImg} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <View style={s.skillBox}>
             <Text style={s.skillTitle}>HỌC VẤN & CHUYÊN MÔN</Text>
             {profile.education ? (
               <View style={s.certRow}><Ionicons name="school" size={16} color="#10b981"/><Text style={s.certTxt}>{profile.education}</Text><Ionicons name="checkmark-circle" size={14} color="#10b981"/></View>
             ) : null}
             {profile.certifications ? (
               <View style={s.certRow}><Ionicons name="ribbon" size={16} color="#4f7cff"/><Text style={s.certTxt}>{profile.certifications}</Text><Ionicons name="checkmark-circle" size={14} color="#10b981"/></View>
             ) : null}
             {!profile.education && !profile.certifications && <Text style={{fontSize:13, color:'#94a3b8'}}>Đang cập nhật hồ sơ chuyên môn.</Text>}
          </View>

          <View style={[s.skillBox, { borderTopWidth: 0 }]}>
             <Text style={s.skillTitle}>SỞ THÍCH & KỸ NĂNG</Text>
             <View style={s.chipsRow}>
                {(profile.hobbies || []).concat(profile.skills || []).map((h:string, i:number) => (
                   <View key={i} style={s.chip}><Text style={s.chipTxt}>{h}</Text></View>
                ))}
             </View>
             
             <Text style={[s.skillTitle, {marginTop: 16}]}>NGÔN NGỮ</Text>
             <View style={s.chipsRow}>
                {(profile.languages || []).map((l:string, i:number) => (
                   <View key={i} style={s.chip}><Text style={s.chipTxt}>{l}</Text></View>
                ))}
             </View>
          </View>
        </View>
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={s.bookBtn} onPress={() => setShowTourModal(true)}>
           <Text style={s.bookBtnTxt}>Yêu cầu dẫn tour</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTourModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: '85%' }]}>
            <Text style={s.modalTitle}>Chọn chuyến đi cùng {profile.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%', marginBottom: 20}}>
              {availableTours.map(t => (
                <View key={t.id} style={s.tourChoiceCard}>
                  <Text style={s.tourChoiceName}>{t.name}</Text>
                  <Text style={s.tourChoiceLoc}>{t.departure} · {t.duration}</Text>
                  <View style={s.schList}>
                    {(t.schedules || []).filter((s:any) => new Date(s.startTime).getTime() > Date.now()).map((sch: any) => (
                      <TouchableOpacity key={sch.id} style={s.schBtn} onPress={() => handleSelectTourSchedule(t, sch)}>
                        <Text style={s.schBtnTxt}>{new Date(sch.startTime).toLocaleString('vi-VN')}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#4f7cff" />
                      </TouchableOpacity>
                    ))}
                    {(!t.schedules || t.schedules.length === 0) && <Text style={{fontSize: 12, color: '#ef4444'}}>Tour chưa có lịch trình.</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.closeModalBtn} onPress={() => setShowTourModal(false)}><Text style={s.closeModalBtnTxt}>Hủy bỏ</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8faff" },
    content: { paddingBottom: sz(100) },
    coverBox: { width: "100%", height: sz(220), position: "relative" },
    coverImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    backBtn: { position: "absolute", left: sz(16), width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 2 },
    profileCard: { backgroundColor: "#fff", borderRadius: sz(20), padding: sz(16), marginHorizontal: sz(16), marginTop: -sz(40), marginBottom: sz(16), elevation: 5, alignItems: "center" },
    avatarImg: { width: sz(80), height: sz(80), borderRadius: sz(24), borderWidth: 4, borderColor: "#fff", marginTop: -sz(40), marginBottom: sz(10) },
    nameRow: { flexDirection: "row", alignItems: "center", gap: sz(6) },
    nameTxt: { fontSize: sz(20), fontWeight: "900", color: "#1f2a58" },
    locationTxt: { fontSize: sz(13), color: "#64748b", marginTop: sz(4) },
    tagsRow: { flexDirection: 'row', gap: sz(6), marginTop: sz(8) },
    verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: sz(4), backgroundColor: '#dcfce7', paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(8) },
    verifyTxt: { fontSize: sz(10), fontWeight: '700', color: '#10b981' },
    statsRow: { flexDirection: "row", alignItems: "center", marginTop: sz(16), paddingTop: sz(16), borderTopWidth: 1, borderTopColor: "#f0f4ff", width: "100%" },
    statItem: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, height: sz(30), backgroundColor: "#e4ebff" },
    statVal: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(4) },
    statLbl: { fontSize: sz(11), color: "#7a8cc2", marginTop: sz(2), fontWeight: "600" },
    infoCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(16), marginHorizontal: sz(16), marginBottom: sz(20), elevation: 1 },
    infoCardTitle: { color: "#1f2a58", fontWeight: "900", fontSize: sz(15), marginBottom: sz(8) },
    bioTxt: { color: "#475569", fontSize: sz(14), lineHeight: sz(24) },
    mediaBox: { marginTop: sz(16) },
    videoWrapper: { width: '100%', height: sz(180), borderRadius: sz(16), overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
    videoCover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.8, backgroundColor: '#000' },
    playBtn: { width: sz(50), height: sz(50), borderRadius: sz(25), backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    videoLabel: { position: 'absolute', top: sz(10), left: sz(10), backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(6) },
    galleryImg: { width: sz(120), height: sz(120), borderRadius: sz(12) },
    skillBox: { marginTop: sz(16), paddingTop: sz(16), borderTopWidth: 1, borderTopColor: "#f0f4ff" },
    skillTitle: { fontSize: sz(12), color: "#94a8d8", fontWeight: "800", marginBottom: sz(8) },
    certRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6), backgroundColor: '#f8fafc', padding: sz(10), borderRadius: sz(8), marginBottom: sz(6) },
    certTxt: { flex: 1, fontSize: sz(13), color: '#1f2a58', fontWeight: '600' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sz(6) },
    chip: { backgroundColor: '#f1f5f9', paddingHorizontal: sz(10), paddingVertical: sz(6), borderRadius: sz(8), borderWidth: 1, borderColor: '#e2e8f0' },
    chipTxt: { fontSize: sz(12), color: '#475569', fontWeight: '600' },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", flexDirection: "row", paddingHorizontal: sz(16), paddingTop: sz(12), borderTopWidth: 1, borderTopColor: "#e4ebff", elevation: 10, gap: sz(10) },
    bookBtn: { flex: 1, backgroundColor: "#4f7cff", borderRadius: sz(16), alignItems: "center", justifyContent: "center", paddingVertical: sz(16) },
    bookBtnTxt: { color: "#fff", fontWeight: "900", fontSize: sz(16) },
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", justifyContent: "flex-end" },
    modalBox: { backgroundColor: "#fff", borderTopLeftRadius: sz(24), borderTopRightRadius: sz(24), padding: sz(20), alignItems: "center" },
    modalTitle: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginBottom: sz(6), textAlign: "center" },
    tourChoiceCard: { width: '100%', backgroundColor: '#f8fafc', borderRadius: sz(14), padding: sz(14), marginBottom: sz(12), borderWidth: 1, borderColor: '#e2e8f0' },
    tourChoiceName: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58', marginBottom: sz(2) },
    tourChoiceLoc: { fontSize: sz(12), color: '#64748b', marginBottom: sz(10) },
    schList: { gap: sz(6) },
    schBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: sz(10), borderRadius: sz(8), borderWidth: 1, borderColor: '#e4ebff' },
    schBtnTxt: { color: '#4f7cff', fontWeight: '700', fontSize: sz(13) },
    closeModalBtn: { width: '100%', backgroundColor: '#f1f5f9', paddingVertical: sz(14), borderRadius: sz(14), alignItems: 'center' },
    closeModalBtnTxt: { color: '#64748b', fontWeight: '800', fontSize: sz(14) }
  });
};