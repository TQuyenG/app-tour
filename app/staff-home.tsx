/**
 * app/staff-home.tsx
 * Trang chủ Staff CSKH - Thống kê tự động từ Dữ liệu thực
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaffTabBar } from "@/components/StaffTabBar";

export default function StaffHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [profileName, setProfileName] = useState("Nhân viên CSKH");
  const [stats, setStats] = useState({
    pendingBookings: 0,
    pendingRefunds: 0,
    pendingComplaints: 0,
    newReviews: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    const loadData = async () => {
      try {
        // Lấy tên Staff
        const rawUser = await AsyncStorage.getItem("@app_current_user");
        if (rawUser) setProfileName(JSON.parse(rawUser).name || "Nhân viên CSKH");

        // Lấy dữ liệu các kho
        const [bRaw, rRaw, cRaw, revRaw] = await Promise.all([
          AsyncStorage.getItem("@guest_bookings"),
          AsyncStorage.getItem("@staff_refunds"),
          AsyncStorage.getItem("@app_complaints"),
          AsyncStorage.getItem("@app_reviews")
        ]);

        const bookings = bRaw ? JSON.parse(bRaw) : [];
        const refunds = rRaw ? JSON.parse(rRaw) : [];
        const complaints = cRaw ? JSON.parse(cRaw) : [];
        const reviews = revRaw ? JSON.parse(revRaw) : [];

        // Tính toán thống kê
        setStats({
          pendingBookings: bookings.filter((b: any) => ["pending", "pending_guide", "paid"].includes(b.status)).length,
          pendingRefunds: refunds.filter((r: any) => r.status === "pending").length,
          pendingComplaints: complaints.filter((c: any) => c.status === "pending" || c.status === "investigating").length,
          newReviews: reviews.filter((r: any) => !r.isReplied && !r.isHidden).length
        });

        // Tạo danh sách hoạt động gần đây (Gộp và Sort)
        let acts: any[] = [];
        complaints.slice(0, 3).forEach((c: any) => acts.push({ id: c.id, type: "complaint", title: "Khiếu nại mới", desc: c.title, time: c.createdAt || new Date().toISOString() }));
        refunds.slice(0, 3).forEach((r: any) => acts.push({ id: r.id, type: "refund", title: "Yêu cầu hoàn tiền", desc: `Tour: ${r.tourName}`, time: r.createdAt || new Date().toISOString() }));
        
        acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(acts.slice(0, 5));

      } catch (e) {}
    };
    loadData();
  }, []));

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerAvatar}>
          <Text style={s.avatarTxt}>{profileName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>Xin chào,</Text>
          <Text style={s.name}>{profileName}</Text>
        </View>
        <TouchableOpacity style={s.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color="#1f2a58" />
          {(stats.pendingComplaints > 0 || stats.pendingRefunds > 0) && <View style={s.notifBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.overviewBox}>
          <Text style={s.sectionTitle}>Cần xử lý hôm nay</Text>
          <View style={s.gridRow}>
            <TouchableOpacity style={s.gridItem} onPress={() => router.push("/staff-booking-management" as any)}>
              <View style={[s.gridIcon, { backgroundColor: "#eaf0ff" }]}><Ionicons name="receipt" size={24} color="#2856d6" /></View>
              <Text style={s.gridNum}>{stats.pendingBookings}</Text>
              <Text style={s.gridLabel}>Đơn đặt mới</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.gridItem} onPress={() => router.push("/staff-refund-management" as any)}>
              <View style={[s.gridIcon, { backgroundColor: "#fffbeb" }]}><Ionicons name="cash" size={24} color="#d97706" /></View>
              <Text style={s.gridNum}>{stats.pendingRefunds}</Text>
              <Text style={s.gridLabel}>Hoàn tiền</Text>
            </TouchableOpacity>
          </View>

          <View style={s.gridRow}>
            <TouchableOpacity style={s.gridItem} onPress={() => router.push("/staff-complaints" as any)}>
              <View style={[s.gridIcon, { backgroundColor: "#fee2e2" }]}><Ionicons name="warning" size={24} color="#dc2626" /></View>
              <Text style={s.gridNum}>{stats.pendingComplaints}</Text>
              <Text style={s.gridLabel}>Khiếu nại</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.gridItem} onPress={() => router.push("/staff-review-moderation" as any)}>
              <View style={[s.gridIcon, { backgroundColor: "#f3e8ff" }]}><Ionicons name="star" size={24} color="#7c3aed" /></View>
              <Text style={s.gridNum}>{stats.newReviews}</Text>
              <Text style={s.gridLabel}>Review mới</Text>
            </TouchableOpacity>
          </View>
        </View>

        {stats.pendingComplaints > 0 && (
          <View style={s.slaAlert}>
             <View style={s.slaIcon}><Ionicons name="alert-circle" size={24} color="#dc2626" /></View>
             <View style={{ flex: 1 }}>
               <Text style={s.slaTitle}>Cảnh báo SLA</Text>
               <Text style={s.slaSub}>Có {stats.pendingComplaints} khiếu nại đang chờ xử lý gấp!</Text>
             </View>
             <TouchableOpacity style={s.slaBtn} onPress={() => router.push("/staff-complaints" as any)}>
               <Text style={s.slaBtnTxt}>Xử lý ngay</Text>
             </TouchableOpacity>
          </View>
        )}

        <Text style={s.sectionTitle}>Hoạt động gần đây</Text>
        <View style={s.activityList}>
          {recentActivities.length === 0 && <Text style={{color: '#94a3b8'}}>Chưa có hoạt động mới.</Text>}
          {recentActivities.map((act, i) => (
            <View key={i} style={s.activityRow}>
              <View style={[s.activityIcon, { backgroundColor: act.type === "complaint" ? "#fee2e2" : "#fffbeb" }]}>
                <Ionicons name={act.type === "complaint" ? "warning" : "refresh"} size={20} color={act.type === "complaint" ? "#dc2626" : "#d97706"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityName}>{act.title}</Text>
                <Text style={s.activityMeta}>{act.desc}</Text>
              </View>
              <Text style={s.activityTime}>Vừa xong</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <StaffTabBar activeRoute="/staff-home" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 },
  headerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1f2a58", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "900" },
  greeting: { fontSize: 13, color: "#7a8cc2", fontWeight: "600" },
  name: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  notifBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  notifBadge: { position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1, borderColor: "#fff" },
  content: { padding: 20, paddingBottom: 100 },
  overviewBox: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 12 },
  gridRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  gridItem: { flex: 1, backgroundColor: "#fff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
  gridIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  gridNum: { fontSize: 24, fontWeight: "900", color: "#1f2a58" },
  gridLabel: { fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 4 },
  slaAlert: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#fecaca", marginBottom: 24, gap: 12 },
  slaIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  slaTitle: { color: "#dc2626", fontWeight: "800", fontSize: 13 },
  slaSub: { color: "#ef4444", fontSize: 11, marginTop: 3 },
  slaBtn: { backgroundColor: "#dc2626", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  slaBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  activityList: { gap: 10 },
  activityRow: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 14, alignItems: "center" },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activityName: { color: "#1f2a58", fontWeight: "700", fontSize: 14 },
  activityMeta: { color: "#7a8cc2", fontSize: 12, marginTop: 2 },
  activityTime: { fontSize: 11, color: "#94a8d8" },
});