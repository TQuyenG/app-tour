/**
 * app/admin-users.tsx
 * Admin quản lý toàn bộ users: guest, guide, staff
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
import { AdminTabBar } from "@/components/AdminTabBar";

type UserRole   = "guest" | "guide" | "admin" | "staff";
type UserStatus = "active" | "suspended" | "pending";

interface AppUser {
  id: string; name: string; email: string; phone: string;
  roles: UserRole[]; activeRole: UserRole; status: UserStatus;
  createdAt: string; avatarColor: string;
  bookings?: number; totalSpent?: number;
}

const SEED_USERS: AppUser[] = [
  { id: "acc-guest-1",  name: "Nguyễn An",         email: "guest1@gmail.com",   phone: "0901 234 567", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "10/01/2026", avatarColor: "#4f7cff", bookings: 8,  totalSpent: 24500000 },
  { id: "acc-guest-2",  name: "Trần Văn Bình",      email: "guest2@gmail.com",   phone: "0912 345 678", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "15/01/2026", avatarColor: "#06b6d4", bookings: 3,  totalSpent: 9870000 },
  { id: "acc-guest-3",  name: "Lê Thị Cúc",         email: "guest3@gmail.com",   phone: "0923 456 789", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "20/01/2026", avatarColor: "#f59e0b", bookings: 5,  totalSpent: 14200000 },
  { id: "acc-guest-4",  name: "Phạm Quốc Dũng",     email: "guest4@gmail.com",   phone: "0934 567 890", roles: ["guest"],         activeRole: "guest",  status: "suspended", createdAt: "22/01/2026", avatarColor: "#ef4444", bookings: 1,  totalSpent: 2990000 },
  { id: "acc-guest-5",  name: "Hoàng Thị Emly",     email: "guest5@gmail.com",   phone: "0945 678 901", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "25/01/2026", avatarColor: "#8b5cf6", bookings: 12, totalSpent: 38600000 },
  { id: "acc-guest-6",  name: "Vũ Minh Phong",      email: "guest6@gmail.com",   phone: "0956 789 012", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "28/01/2026", avatarColor: "#22c55e", bookings: 2,  totalSpent: 6780000 },
  { id: "acc-guest-7",  name: "Đinh Thị Giang",     email: "guest7@gmail.com",   phone: "0967 890 123", roles: ["guest"],         activeRole: "guest",  status: "pending",   createdAt: "01/02/2026", avatarColor: "#ec4899", bookings: 0,  totalSpent: 0 },
  { id: "acc-guest-8",  name: "Bùi Văn Hào",        email: "guest8@gmail.com",   phone: "0978 901 234", roles: ["guest"],         activeRole: "guest",  status: "active",    createdAt: "05/02/2026", avatarColor: "#14b8a6", bookings: 6,  totalSpent: 19300000 },
  { id: "acc-guide-1",  name: "Nguyễn Văn Hùng",    email: "guide1@gmail.com",   phone: "0912 345 678", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "05/01/2026", avatarColor: "#10b981", bookings: 87, totalSpent: 0 },
  { id: "acc-guide-2",  name: "Trần Thị Lan",        email: "guide2@gmail.com",   phone: "0918 765 432", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "07/01/2026", avatarColor: "#8b5cf6", bookings: 54, totalSpent: 0 },
  { id: "acc-guide-3",  name: "Trần Minh Khoa",      email: "guide3@gmail.com",   phone: "0923 111 222", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "12/01/2026", avatarColor: "#f59e0b", bookings: 62, totalSpent: 0 },
  { id: "acc-guide-4",  name: "Nguyễn Thu Hà",       email: "guide4@gmail.com",   phone: "0934 222 333", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "14/01/2026", avatarColor: "#ec4899", bookings: 45, totalSpent: 0 },
  { id: "acc-guide-5",  name: "Lê Quang Dũng",       email: "guide5@gmail.com",   phone: "0945 333 444", roles: ["guide","guest"], activeRole: "guide",  status: "suspended", createdAt: "18/01/2026", avatarColor: "#06b6d4", bookings: 23, totalSpent: 0 },
  { id: "acc-guide-6",  name: "Phạm Hoài Nam",       email: "guide6@gmail.com",   phone: "0956 444 555", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "20/01/2026", avatarColor: "#14b8a6", bookings: 38, totalSpent: 0 },
  { id: "acc-guide-7",  name: "Đỗ Trúc Ly",          email: "guide7@gmail.com",   phone: "0967 555 666", roles: ["guide","guest"], activeRole: "guide",  status: "active",    createdAt: "22/01/2026", avatarColor: "#a855f7", bookings: 29, totalSpent: 0 },
  { id: "acc-admin-1",  name: "Trần Quang Admin",    email: "admin1@gmail.com",   phone: "0909 123 456", roles: ["admin"],         activeRole: "admin",  status: "active",    createdAt: "01/01/2026", avatarColor: "#ef4444", bookings: 0,  totalSpent: 0 },
  { id: "acc-staff-1",  name: "Lê Thị CSKH",         email: "staff1@gmail.com",   phone: "0911 000 111", roles: ["staff"],         activeRole: "staff",  status: "active",    createdAt: "02/01/2026", avatarColor: "#f59e0b", bookings: 0,  totalSpent: 0 },
  { id: "acc-dual-1",   name: "Lê Văn Phong",        email: "dual1@gmail.com",    phone: "0933 111 222", roles: ["guest","guide"], activeRole: "guest",  status: "active",    createdAt: "01/02/2026", avatarColor: "#06b6d4", bookings: 4,  totalSpent: 12600000 },
];

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  guest: { label: "Khách",  color: "#2856d6", bg: "#eaf0ff" },
  guide: { label: "HDV",    color: "#16a34a", bg: "#dcfce7" },
  admin: { label: "Admin",  color: "#dc2626", bg: "#fee2e2" },
  staff: { label: "Staff",  color: "#d97706", bg: "#fef9c3" },
};
const STATUS_META: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Hoạt động", color: "#16a34a", bg: "#dcfce7" },
  suspended: { label: "Bị khóa",   color: "#dc2626", bg: "#fee2e2" },
  pending:   { label: "Chờ xác minh", color: "#d97706", bg: "#fef9c3" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const PAGE_SIZE = 8;

export default function AdminUsers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [filter, setFilter]     = useState<"all" | UserRole>("all");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [detail, setDetail]     = useState<AppUser | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@app_accounts").then(raw => {
      if (raw) {
        const parsed: AppUser[] = JSON.parse(raw);
        setUsers(parsed.length > 0 ? parsed : SEED_USERS);
      } else {
        setUsers(SEED_USERS);
        AsyncStorage.setItem("@app_accounts", JSON.stringify(SEED_USERS)).catch(() => {});
      }
    }).catch(() => setUsers(SEED_USERS));
    setPage(1);
  }, []));

  const persist = async (data: AppUser[]) => {
    setUsers(data);
    await AsyncStorage.setItem("@app_accounts", JSON.stringify(data)).catch(() => {});
  };

  const toggleStatus = (u: AppUser) => {
    const newStatus: UserStatus = u.status === "active" ? "suspended" : "active";
    const action = newStatus === "suspended" ? "Khóa tài khoản" : "Mở khóa";
    Alert.alert(
      action,
      `${action} tài khoản của "${u.name}"?\nEmail: ${u.email}`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận", style: newStatus === "suspended" ? "destructive" : "default",
          onPress: async () => {
            const updated = users.map(x => x.id === u.id ? { ...x, status: newStatus } : x);
            await persist(updated);
            if (detail?.id === u.id) setDetail({ ...u, status: newStatus });
            Alert.alert("✅ Thành công", `Đã ${action.toLowerCase()} "${u.name}".`);
          },
        },
      ]
    );
  };

  const filtered = users.filter(u => {
    const kw = search.trim().toLowerCase();
    const matchSearch = !kw ||
      u.name.toLowerCase().includes(kw) ||
      u.email.toLowerCase().includes(kw) ||
      u.phone.includes(kw);
    const matchRole = filter === "all" || u.roles.includes(filter as UserRole);
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = {
    total:     users.length,
    guests:    users.filter(u => u.roles.includes("guest") && !u.roles.includes("guide")).length,
    guides:    users.filter(u => u.roles.includes("guide")).length,
    suspended: users.filter(u => u.status === "suspended").length,
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowDetail(false)} />
          {detail && (
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Chi tiết tài khoản</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#7a8cc2" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={s.detailAvatarRow}>
                  <View style={[s.detailAvatar, { backgroundColor: detail.avatarColor }]}>
                    <Text style={s.detailAvatarTxt}>{detail.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailName}>{detail.name}</Text>
                    <View style={s.detailBadgeRow}>
                      {detail.roles.map(r => (
                        <View key={r} style={[s.roleBadge, { backgroundColor: ROLE_META[r].bg }]}>
                          <Text style={[s.roleBadgeTxt, { color: ROLE_META[r].color }]}>{ROLE_META[r].label}</Text>
                        </View>
                      ))}
                      <View style={[s.roleBadge, { backgroundColor: STATUS_META[detail.status].bg }]}>
                        <Text style={[s.roleBadgeTxt, { color: STATUS_META[detail.status].color }]}>
                          {STATUS_META[detail.status].label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {/* Info */}
                {[
                  { icon: "mail-outline",     label: "Email",        value: detail.email },
                  { icon: "call-outline",     label: "Điện thoại",  value: detail.phone },
                  { icon: "calendar-outline", label: "Ngày tham gia",value: detail.createdAt },
                  { icon: "receipt-outline",  label: "Booking",     value: `${detail.bookings ?? 0} đơn` },
                  { icon: "cash-outline",     label: "Chi tiêu",    value: fmt(detail.totalSpent ?? 0), highlight: true },
                ].map((row, i) => (
                  <View key={i} style={s.detailRow}>
                    <View style={s.detailIcon}>
                      <Ionicons name={row.icon as any} size={15} color="#7a8cc2" />
                    </View>
                    <Text style={s.detailLabel}>{row.label}</Text>
                    <Text style={[s.detailValue, (row as any).highlight && { color: "#2856d6", fontWeight: "800" }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
                {/* Actions */}
                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={[s.modalActionBtn, { backgroundColor: detail.status === "active" ? "#fee2e2" : "#dcfce7", flex: 1 }]}
                    onPress={() => { setShowDetail(false); setTimeout(() => toggleStatus(detail), 300); }}
                  >
                    <Ionicons
                      name={detail.status === "active" ? "lock-closed-outline" : "lock-open-outline"}
                      size={16}
                      color={detail.status === "active" ? "#dc2626" : "#16a34a"}
                    />
                    <Text style={[s.modalActionTxt, { color: detail.status === "active" ? "#dc2626" : "#16a34a" }]}>
                      {detail.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Quản lý Users</Text>
        <View style={s.countBadge}>
          <Text style={s.countTxt}>{users.length}</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          { label: "Tổng",     value: summary.total,     color: "#2856d6" },
          { label: "Khách",    value: summary.guests,    color: "#06b6d4" },
          { label: "HDV",      value: summary.guides,    color: "#16a34a" },
          { label: "Bị khóa", value: summary.suspended, color: "#dc2626" },
        ].map((item, i) => (
          <View key={i} style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color="#8ea0d6" />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm tên, email, số điện thoại..."
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

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {([["all","Tất cả"],["guest","Khách"],["guide","HDV"],["staff","Staff"],["admin","Admin"]] as const).map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.filterChip, filter === k && s.filterActive]}
            onPress={() => { setFilter(k as any); setPage(1); }}
          >
            <Text style={[s.filterTxt, filter === k && s.filterTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {paginated.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không tìm thấy user nào</Text>
          </View>
        )}
        {paginated.map(u => {
          const statusMeta = STATUS_META[u.status];
          return (
            <TouchableOpacity key={u.id} style={s.card} onPress={() => { setDetail(u); setShowDetail(true); }} activeOpacity={0.85}>
              <View style={[s.avatar, { backgroundColor: u.avatarColor }]}>
                <Text style={s.avatarTxt}>{u.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardTopRow}>
                  <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <Text style={[s.statusTxt, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
                <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                <View style={s.cardMetaRow}>
                  <View style={s.roleTagsRow}>
                    {u.roles.map(r => (
                      <View key={r} style={[s.roleTag, { backgroundColor: ROLE_META[r].bg }]}>
                        <Text style={[s.roleTagTxt, { color: ROLE_META[r].color }]}>{ROLE_META[r].label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.bookingCount}>{u.bookings ?? 0} booking</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.lockBtn, { backgroundColor: u.status === "active" ? "#fee2e2" : "#dcfce7" }]}
                onPress={() => toggleStatus(u)}
              >
                <Ionicons
                  name={u.status === "active" ? "lock-closed-outline" : "lock-open-outline"}
                  size={16}
                  color={u.status === "active" ? "#dc2626" : "#16a34a"}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnOff]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <Ionicons name="chevron-back" size={16} color={page === 1 ? "#c0cbe8" : "#2856d6"} />
            </TouchableOpacity>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <TouchableOpacity key={p} style={[s.pageNum, page === p && s.pageNumActive]} onPress={() => setPage(p)}>
                <Text style={[s.pageNumTxt, page === p && s.pageNumTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnOff]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <Ionicons name="chevron-forward" size={16} color={page === totalPages ? "#c0cbe8" : "#2856d6"} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={s.pageInfo}>Hiển thị {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} / {filtered.length} users</Text>
      </ScrollView>
      <AdminTabBar role="admin" activeRoute="/admin-users" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  countBadge:    { backgroundColor: "#edf2ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  countTxt:      { color: "#4f7cff", fontWeight: "800", fontSize: 13 },
  summaryRow:    { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", padding: 14, justifyContent: "space-between" },
  summaryItem:   { alignItems: "center", flex: 1 },
  summaryValue:  { fontSize: 18, fontWeight: "900" },
  summaryLabel:  { color: "#7a8cc2", fontSize: 10, fontWeight: "600", marginTop: 2 },
  searchBox:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, margin: 14, marginBottom: 0 },
  searchInput:   { flex: 1, color: "#1f2a58", fontSize: 14 },
  filterRow:     { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  filterChip:    { borderRadius: 999, borderWidth: 1, borderColor: "#dfe7ff", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7 },
  filterActive:  { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  filterTxt:     { color: "#6c7fb7", fontSize: 12, fontWeight: "600" },
  filterTxtActive: { color: "#fff" },
  content:       { padding: 14, paddingTop: 0 },
  emptyCard:     { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 32, alignItems: "center", gap: 10 },
  emptyTxt:      { color: "#7a8cc2" },
  card:          { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  avatar:        { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarTxt:     { color: "#fff", fontWeight: "800", fontSize: 18 },
  cardTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  userName:      { color: "#1f2a58", fontWeight: "700", fontSize: 14, flex: 1, marginRight: 6 },
  statusBadge:   { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  statusTxt:     { fontSize: 10, fontWeight: "700" },
  userEmail:     { color: "#7a8cc2", fontSize: 12, marginBottom: 5 },
  cardMetaRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roleTagsRow:   { flexDirection: "row", gap: 4 },
  roleTag:       { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  roleTagTxt:    { fontSize: 10, fontWeight: "700" },
  bookingCount:  { color: "#94a3b8", fontSize: 11 },
  lockBtn:       { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pagination:    { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 4 },
  pageBtn:       { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", alignItems: "center", justifyContent: "center" },
  pageBtnOff:    { opacity: 0.4 },
  pageNum:       { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff", alignItems: "center", justifyContent: "center" },
  pageNumActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  pageNumTxt:    { color: "#5f73a9", fontSize: 13, fontWeight: "700" },
  pageNumTxtActive: { color: "#fff" },
  pageInfo:      { color: "#94a3b8", fontSize: 11, textAlign: "center", marginBottom: 8 },
  modalOverlay:  { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  modalSheet:    { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" },
  modalHandle:   { width: 40, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle:    { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody:     { padding: 20, paddingBottom: 36 },
  detailAvatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  detailAvatar:  { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  detailAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 24 },
  detailName:    { color: "#1f2a58", fontWeight: "800", fontSize: 18, marginBottom: 6 },
  detailBadgeRow:{ flexDirection: "row", gap: 6, flexWrap: "wrap" },
  roleBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeTxt:  { fontSize: 11, fontWeight: "700" },
  detailRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon:    { width: 28, height: 28, borderRadius: 8, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  detailLabel:   { color: "#7a8cc2", fontSize: 13, width: 110 },
  detailValue:   { flex: 1, color: "#1f2a58", fontWeight: "600", fontSize: 13, textAlign: "right" },
  modalActions:  { flexDirection: "row", gap: 10, marginTop: 20 },
  modalActionBtn:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  modalActionTxt:{ fontSize: 14, fontWeight: "700" },
});