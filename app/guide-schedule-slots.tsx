/**
 * app/guide-schedule-slots.tsx
 * Quản lý Slots & Giá - Responsive Web/Mobile, Tag Badge UI
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GuideScheduleSlots() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cấu hình Slot & Giá</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* FIXED FILTER: Đủ không gian thở, không bị ép */}
      <View style={s.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {["Tất cả", "Mở đặt", "Đã đặt", "Khóa"].map(item => (
            <TouchableOpacity 
              key={item} 
              style={[s.filterChip, filter === item && s.filterActive]} 
              onPress={() => setFilter(item)}
            >
              <Text style={[s.filterTxt, filter === item && s.filterTxtActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={s.content}>
         {/* Render các slot ở đây... */}
         <View style={s.card}>
            <View style={s.cardTop}>
               <Text style={s.dateTxt}>Thứ 7, 28/03/2026</Text>
               <View style={s.tag}><Text style={s.tagTxt}>MỞ BÁN</Text></View>
            </View>
            <Text style={s.priceTxt}>2.500.000đ / khách</Text>
            <View style={s.slotInfo}>
               <Text style={s.slotLabel}>Số chỗ: 0/15</Text>
               <TouchableOpacity style={s.editSmall}><Ionicons name="pencil" size={14} color="#4f7cff" /></TouchableOpacity>
            </View>
         </View>
      </ScrollView>

      <GuideTabBar activeRoute="guide-schedule-slots" />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  
  filterContainer: { backgroundColor: "#fff", paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e4ebff" },
  filterActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "600" },
  filterTxtActive: { color: "#fff" },

  content: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e4ebff" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  dateTxt: { fontSize: 14, fontWeight: "700", color: "#1f2a58" },
  tag: { backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagTxt: { color: "#059669", fontSize: 10, fontWeight: "800" },
  priceTxt: { fontSize: 18, fontWeight: "900", color: "#10b981", marginBottom: 8 },
  slotInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slotLabel: { color: "#7a8cc2", fontSize: 12 },
  editSmall: { width: 30, height: 30, backgroundColor: "#eaf0ff", borderRadius: 8, alignItems: "center", justifyContent: "center" }
});