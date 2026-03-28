/**
 * app/public-guide-profile.tsx
 * Trang Hồ sơ công khai HDV - Đã FIX: Loại bỏ Navigation Header mặc định (Thanh bar đen)
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image, ImageBackground, ScrollView, StatusBar, Text,
  TouchableOpacity, useWindowDimensions, View, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStyles } from "./guide-profile"; // Tái sử dụng giao diện đồng bộ

const STORAGE_KEY = "@guide_profile";
const TOURS_STORAGE = "@app_tours";
const BOOKINGS_STORAGE = "@app_bookings_history";

export default function PublicGuideProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 375;
  const s = useMemo(() => getStyles(scale), [scale]);
  const { id } = useLocalSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ tours: 0, bookings: 0, rating: "4.9" });
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPublicData();
    }, [])
  );

  const fetchPublicData = async () => {
    try {
      // 1. Lấy Data Profile chuẩn từ Local
      const rawProfile = await AsyncStorage.getItem(STORAGE_KEY);
      let currentProfile = null;
      if (rawProfile) {
        currentProfile = JSON.parse(rawProfile);
        setProfile(currentProfile);
      }

      // 2. Tính toán Thống kê thực tế từ máy
      if (currentProfile) {
        const rawTours = await AsyncStorage.getItem(TOURS_STORAGE);
        const rawBookings = await AsyncStorage.getItem(BOOKINGS_STORAGE);
        let tCount = 0, bCount = 0;

        if (rawTours) {
          const toursList = JSON.parse(rawTours);
          tCount = toursList.filter((t: any) => t.assignedGuideNames?.includes(currentProfile.name)).length;
        }
        if (rawBookings) {
          const bookingsList = JSON.parse(rawBookings);
          bCount = bookingsList.length; 
        }
        setStats({ tours: tCount, bookings: bCount, rating: "4.9" });
      }
    } catch (e) {
      console.log("Error loading public profile", e);
    } finally {
      setIsLoading(false);
    }
  };

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
        <Text style={{ color: "#94a8d8" }}>Không tìm thấy hồ sơ HDV này.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
           <Text style={{ color: "#4f7cff", fontWeight: "800" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* XÓA VIỀN ĐEN: Ẩn Header mặc định của file và cấu hình thanh trạng thái trong suốt */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.round(40 * scale) }}>
        
        {/* ẢNH BÌA TRÀN VIỀN LÊN TẬN GÓC */}
        <ImageBackground source={{ uri: profile.coverUrl || "https://images.unsplash.com/photo-1559586616-361e18714958" }} style={[s.coverImage, { paddingTop: insets.top }]}>
          <View style={s.coverOverlay}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={s.mainBody}>
          <View style={s.profileCard}>
            <View style={s.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarTxt}>{profile.name.charAt(0)}</Text>
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

          {profile.vneidVerified && (
            <View style={s.verificationCard}>
                <View style={s.verifyHeader}><Ionicons name="finger-print" size={16} color="#059669" /><Text style={s.verifyHeaderTxt}>ĐỊNH DANH ĐẢM BẢO</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Căn cước công dân:</Text><Text style={s.verifyValue}>*** *** *** {profile.cccd.slice(-3)}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Năm sinh:</Text><Text style={s.verifyValue}>{profile.dob}</Text></View>
                <View style={s.verifyRow}><Text style={s.verifyLabel}>Học vấn:</Text><Text style={s.verifyValue}>{profile.education}</Text></View>
            </View>
          )}

          <View style={s.statsCard}>
            <View style={s.statItem}><Ionicons name="star" size={18} color="#f59e0b" /><Text style={s.statVal}>{stats.rating}</Text><Text style={s.statLbl}>Đánh giá</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="map" size={18} color="#4f7cff" /><Text style={s.statVal}>{stats.tours}</Text><Text style={s.statLbl}>Tour hoàn thành</Text></View>
            <View style={s.statDivider} />
            <View style={s.statItem}><Ionicons name="calendar" size={18} color="#10b981" /><Text style={s.statVal}>{stats.bookings}</Text><Text style={s.statLbl}>Đã Booking</Text></View>
          </View>

          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Về {profile.name.split(" ").pop()}</Text>
            <Text style={s.bioTxt}>{profile.bio || "HDV này chưa viết lời giới thiệu."}</Text>
            
            <View style={s.skillBox}><Text style={s.skillTitle}>Kỹ năng chuyên môn</Text><Text style={s.skillContent}>{profile.skills}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Sở thích cá nhân</Text><Text style={s.skillContent}>{profile.hobbies}</Text></View>
            <View style={s.skillBox}><Text style={s.skillTitle}>Chứng nhận & Giải thưởng</Text><Text style={s.skillContent}>{profile.awards}</Text></View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}