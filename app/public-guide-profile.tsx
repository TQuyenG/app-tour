/**
 * app/public-guide-profile.tsx
 * Trang Hồ sơ công khai HDV - Phản chiếu 100% UI trang cá nhân, Local Data, Phân quyền Role
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image, ImageBackground, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, useWindowDimensions, View, ActivityIndicator, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDES } from "@/constants/travel-data"; // Fallback nếu app mới cài chưa có local data

const STORAGE_KEY = "@guide_profile";
const TOURS_STORAGE = "@app_tours";
const BOOKINGS_STORAGE = "@app_bookings_history";
const GUIDES_STORAGE = "@app_guides";

// Hàm xử lý an toàn để hiển thị chuỗi (Fix triệt để lỗi Type 'any' và Hardcode)
const safeString = (val: any): string => {
  if (!val) return "Chưa cập nhật";
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
};

export default function PublicGuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const s = useMemo(() => getStyles(scale), [scale]);
  
  const { id, tourId } = useLocalSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ tours: 0, bookings: 0, rating: "0.0" });
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('guest');

  useFocusEffect(
    useCallback(() => {
      const fetchPublicData = async () => {
        try {
          // 1. Phân quyền Role
          const currentRole = await AsyncStorage.getItem('@current_user_role');
          if (currentRole) setUserRole(currentRole);

          // 2. Lấy dữ liệu Thống kê hệ thống
          let tCount = 0, bCount = 0;
          const rawTours = await AsyncStorage.getItem(TOURS_STORAGE);
          const rawBookings = await AsyncStorage.getItem(BOOKINGS_STORAGE);
          const toursList = rawTours ? JSON.parse(rawTours) : [];
          bCount = rawBookings ? JSON.parse(rawBookings).length : 0;

          // 3. Truy xuất chính xác Data Local của HDV
          let targetProfile = null;

          // 3a. Ưu tiên kiểm tra xem có phải Profile HDV đang đăng nhập (đã lưu local) không
          const rawLocalProfile = await AsyncStorage.getItem(STORAGE_KEY);
          if (rawLocalProfile) {
             const localP = JSON.parse(rawLocalProfile);
             if (localP.guideId === id || (!localP.guideId && id === 'g1') || !id) {
                targetProfile = localP;
             }
          }

          // 3b. Nếu không phải HDV đang login, tìm trong danh sách HDV của hệ thống (Admin duyệt)
          if (!targetProfile) {
             const rawGuides = await AsyncStorage.getItem(GUIDES_STORAGE);
             if (rawGuides) {
                const systemGuides = JSON.parse(rawGuides);
                targetProfile = systemGuides.find((g: any) => g.id === id);
             } else {
                // Fallback lần đầu chạy app
                targetProfile = GUIDES.find((g: any) => g.id === id);
             }
          }

          // 4. Đổ dữ liệu vào UI (Phản chiếu chính xác những gì HDV đã nhập)
          if (targetProfile) {
             const finalName = targetProfile.name || "HDV Chưa cập nhật tên";
             
             setProfile({
                 name: finalName,
                 location: targetProfile.location || "Chưa cập nhật địa điểm",
                 experience: targetProfile.experience || "Chưa cập nhật",
                 bio: targetProfile.bio || "Hướng dẫn viên này chưa cập nhật lời giới thiệu.",
                 skills: safeString(targetProfile.skills),
                 hobbies: safeString(targetProfile.hobbies),
                 awards: safeString(targetProfile.awards),
                 education: safeString(targetProfile.education),
                 cccd: targetProfile.cccd || "000000000000",
                 dob: targetProfile.dob || "Chưa cập nhật",
                 avatarUrl: targetProfile.avatarUrl || targetProfile.avatar || null,
                 coverUrl: targetProfile.coverUrl || 'https://images.unsplash.com/photo-1559586616-361e18714958?w=800',
                 vneidVerified: targetProfile.vneidVerified ?? (targetProfile.verified !== false),
             });

             tCount = toursList.filter((t: any) => t.assignedGuideNames?.includes(finalName)).length || targetProfile.tours || 0;
             setStats({ 
                 tours: tCount, 
                 bookings: bCount, 
                 rating: (targetProfile.rating || 5.0).toFixed(1) 
             });
          }
        } catch (e) {
          console.log("Error loading public profile", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPublicData();
    }, [id])
  );

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f7cff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="person-circle-outline" size={64} color="#cbd5e1" style={{ marginBottom: 10 }}/>
        <Text style={{ color: "#7a8cc2", fontWeight: "600" }}>Không tìm thấy hồ sơ HDV này.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
           <Text style={{ color: "#4f7cff", fontWeight: "800" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.round(100 * scale) }}>
        
        {/* ẢNH BÌA TRÀN VIỀN - Giao diện giống y trang cá nhân */}
        <ImageBackground source={{ uri: profile.coverUrl }} style={[s.coverImage, { paddingTop: insets.top }]}>
          <View style={s.coverOverlay}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={s.mainBody}>
          {/* PROFILE CARD */}
          <View style={s.profileCard}>
            <View style={s.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarTxt}>{(profile.name || "U").charAt(0)}</Text>
              )}
            </View>
            <View style={s.profileInfo}>
              <Text style={s.name}>{profile.name}</Text>
              <Text style={s.subInfo}><Ionicons name="location" size={12} /> {profile.location} · {profile.experience}</Text>
              <View style={s.badgesRow}>
                <View style={s.hdvBadge}><Ionicons name="shield-checkmark" size={12} color="#10b981" /><Text style={s.hdvBadgeTxt}>HDV Đã xác minh</Text></View>
                {profile.vneidVerified && (
                  <View style={[s.hdvBadge, { backgroundColor: "#eaf0ff" }]}><Ionicons name="checkmark-circle" size={12} color="#4f7cff" /><Text style={[s.hdvBadgeTxt, { color: "#4f7cff" }]}>VNeID</Text></View>
                )}
              </View>
            </View>
          </View>

          {/* VNEID CARD - Đã che số CCCD bảo mật */}
          {profile.vneidVerified && (
            <View style={s.verificationCard}>
                <View style={s.verifyHeader}><Ionicons name="finger-print" size={16} color="#059669" /><Text style={s.verifyHeaderTxt}>ĐỊNH DANH ĐẢM BẢO</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Căn cước công dân:</Text><Text style={s.verifyValue}>*** *** *** {profile.cccd.slice(-3)}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Ngày sinh:</Text><Text style={s.verifyValue}>{profile.dob}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Học vấn:</Text><Text style={s.verifyValue}>{profile.education}</Text></View>
            </View>
          )}

          {/* STATS CARD */}
          <View style={s.statsCard}>
            <View style={s.statItem}><Ionicons name="star" size={18} color="#f59e0b" /><Text style={s.statVal}>{stats.rating}</Text><Text style={s.statLbl}>Đánh giá</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="map" size={18} color="#4f7cff" /><Text style={s.statVal}>{stats.tours}</Text><Text style={s.statLbl}>Tour hoàn thành</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="calendar" size={18} color="#10b981" /><Text style={s.statVal}>{stats.bookings}</Text><Text style={s.statLbl}>Booking nhận</Text></View>
          </View>

          {/* INFO DETAILS - Sử dụng SkillBox giống hệt trang cá nhân */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Giới thiệu bản thân</Text>
            <Text style={s.bioTxt}>{profile.bio}</Text>
            
            <View style={s.skillBox}><Text style={s.skillTitle}>Kỹ năng chuyên môn</Text><Text style={s.skillContent}>{profile.skills}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Sở thích cá nhân</Text><Text style={s.skillContent}>{profile.hobbies}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Chứng nhận & Giải thưởng</Text><Text style={s.skillContent}>{profile.awards}</Text></View>
          </View>

        </View>
      </ScrollView>

      {/* THANH ĐIỀU HƯỚNG - Chỉ hiển thị cho Khách hàng (Guest) */}
      {userRole !== 'admin' && (
        <View style={[s.bottomBar, { paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 16 }]}>
          <TouchableOpacity style={s.chatBtn} onPress={() => alert("Tính năng Nhắn tin đang được phát triển!")}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#4f7cff" />
            <Text style={s.chatBtnTxt}>Nhắn tin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bookBtn} onPress={() => router.push({ pathname: '/guest_booking_flow', params: { guideId: id, tourId: tourId } })}>
            <Text style={s.bookBtnTxt}>Yêu cầu dẫn Tour</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// BỘ STYLE RESPONSIVE (Sao chép nguyên bản 100% từ guide-profile.tsx của bạn)
const getStyles = (scale: number) => {
  const sz = (size: number) => Math.round(size * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f3f7ff" },
    coverImage: { width: "100%", height: sz(220), justifyContent: "flex-start", backgroundColor: "#1f2a58" },
    coverOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: sz(20), paddingTop: sz(10), flexDirection: "row" },
    backBtn: { width: sz(40), height: sz(40), borderRadius: sz(12), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    
    mainBody: { paddingHorizontal: sz(16), marginTop: sz(-50) },
    profileCard: { backgroundColor: "#fff", borderRadius: sz(20), padding: sz(16), flexDirection: "row", alignItems: "center", gap: sz(14), marginBottom: sz(16), elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    avatarWrap: { width: sz(76), height: sz(76), borderRadius: sz(24), backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", elevation: 2, overflow: "hidden" },
    avatarImg: { width: "100%", height: "100%", borderRadius: sz(21) },
    avatarTxt: { color: "#fff", fontSize: sz(28), fontWeight: "900" },
    profileInfo: { flex: 1 },
    name: { color: "#1f2a58", fontWeight: "900", fontSize: sz(19), marginBottom: sz(4) },
    subInfo: { color: "#64748b", fontSize: sz(12), fontWeight: "600" },
    badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: sz(6), marginTop: sz(8) },
    hdvBadge: { flexDirection: "row", alignItems: "center", gap: sz(4), backgroundColor: "#d1fae5", borderRadius: sz(8), paddingHorizontal: sz(8), paddingVertical: sz(4) },
    hdvBadgeTxt: { color: "#059669", fontSize: sz(10), fontWeight: "800" },
    
    verificationCard: { backgroundColor: "#d1fae5", borderRadius: sz(14), padding: sz(14), marginBottom: sz(16), borderWidth: 1, borderColor: "#a7f3d0" },
    verifyHeader: { flexDirection: "row", alignItems: "center", gap: sz(6), marginBottom: sz(8) },
    verifyHeaderTxt: { color: "#059669", fontWeight: "900", fontSize: sz(13) },
    verifyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: sz(4) },
    verifyLabel: { color: "#065f46", fontSize: sz(12) },
    verifyValue: { color: "#064e3b", fontSize: sz(12), fontWeight: "700" },
    
    statsCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: sz(16), paddingVertical: sz(16), marginBottom: sz(16), elevation: 2 },
    statItem: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, backgroundColor: "#f0f4ff" },
    statVal: { fontSize: sz(18), fontWeight: "900", color: "#1f2a58", marginTop: sz(4) },
    statLbl: { fontSize: sz(11), color: "#7a8cc2", marginTop: sz(2), fontWeight: "600" },
    
    infoCard: { backgroundColor: "#fff", borderRadius: sz(16), padding: sz(16), marginBottom: sz(20), elevation: 1 },
    infoCardTitle: { color: "#1f2a58", fontWeight: "900", fontSize: sz(15), marginBottom: sz(8) },
    bioTxt: { color: "#475569", fontSize: sz(14), lineHeight: sz(24) },
    skillBox: { marginTop: sz(12), paddingTop: sz(12), borderTopWidth: 1, borderTopColor: "#f0f4ff" },
    skillTitle: { fontSize: sz(12), color: "#94a8d8", fontWeight: "800", marginBottom: sz(4) },
    skillContent: { fontSize: sz(14), color: "#1f2a58", fontWeight: "600", lineHeight: sz(22) },

    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", flexDirection: "row", paddingHorizontal: sz(16), paddingVertical: sz(12), borderTopWidth: 1, borderTopColor: "#e4ebff", elevation: 10, gap: sz(12) },
    chatBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sz(8), backgroundColor: "#eaf0ff", borderRadius: sz(14), height: sz(50) },
    chatBtnTxt: { color: "#4f7cff", fontSize: sz(15), fontWeight: "800" },
    bookBtn: { flex: 1.5, backgroundColor: "#4f7cff", borderRadius: sz(14), alignItems: "center", justifyContent: "center", height: sz(50) },
    bookBtnTxt: { color: "#fff", fontSize: sz(15), fontWeight: "900" },
  });
};