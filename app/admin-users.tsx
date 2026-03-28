/**
 * app/admin-users.tsx
 * Quản lý Users - Cập nhật UI đồng bộ, ẩn Header đen, thêm Custom Popup Xác nhận
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserRole = "guest" | "guide" | "admin" | "staff";
type UserStatus = "active" | "suspended" | "pending";

interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
  avatarColor: string;
  bookings?: number;
}

const SEED_USERS: AppUser[] = [
  { id: "acc-guest-1", name: "Nguyễn An", email: "guest1@gmail.com", phone: "0901 234 567", roles: ["guest"], status: "active", createdAt: "10/01/2026", avatarColor: "#4f7cff", bookings: 8 },
  { id: "acc-guest-3", name: "Lê Thị Cúc", email: "guest3@gmail.com", phone: "0923 456 789", roles: ["guest"], status: "active", createdAt: "12/02/2026", avatarColor: "#f59e0b", bookings: 2 },
  { id: "acc-guide-1", name: "Trần Minh Khoa", email: "guide1@gmail.com", phone: "0987 654 321", roles: ["guest", "guide"], status: "active", createdAt: "15/01/2026", avatarColor: "#10b981", bookings: 45 },
  { id: "acc-staff-1", name: "Phạm Hữu Nghĩa", email: "staff1@gmail.com", phone: "0933 111 222", roles: ["staff"], status: "active", createdAt: "01/01/2026", avatarColor: "#8b5cf6", bookings: 0 },
];

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Custom Popup State
  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean;
    type: "suspend" | "activate" | "success" | "error";
    title: string;
    message: string;
    targetUserId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      const rawAccounts = await AsyncStorage.getItem("@app_accounts");
      if (rawAccounts) {
        setUsers(JSON.parse(rawAccounts));
      } else {
        await AsyncStorage.setItem("@app_accounts", JSON.stringify(SEED_USERS));
        setUsers(SEED_USERS);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const promptToggleStatus = (user: AppUser) => {
    const isSuspending = user.status === "active";
    setConfirmPopup({
      visible: true,
      type: isSuspending ? "suspend" : "activate",
      title: isSuspending ? "Khóa tài khoản" : "Mở khóa tài khoản",
      message: isSuspending 
        ? `Bạn có chắc chắn muốn khóa tài khoản của "${user.name}"? Người này sẽ không thể đăng nhập vào app.` 
        : `Cho phép tài khoản "${user.name}" hoạt động trở lại?`,
      targetUserId: user.id,
    });
  };

  const executeToggleStatus = async () => {
    if (!confirmPopup.targetUserId) return;
    try {
      const rawAccounts = await AsyncStorage.getItem("@app_accounts");
      if (rawAccounts) {
        let accounts = JSON.parse(rawAccounts);
        const index = accounts.findIndex((a: any) => a.id === confirmPopup.targetUserId);
        
        if (index !== -1) {
          const newStatus = accounts[index].status === "active" ? "suspended" : "active";
          accounts[index].status = newStatus;
          
          await AsyncStorage.setItem("@app_accounts", JSON.stringify(accounts));
          setUsers(accounts);
          
          if (selectedUser && selectedUser.id === confirmPopup.targetUserId) {
            setSelectedUser({ ...selectedUser, status: newStatus });
          }
          
          setConfirmPopup({ 
            visible: true, type: "success", title: "Thành công", 
            message: `Đã ${newStatus === "active" ? "mở khóa" : "khóa"} tài khoản thành công.` 
          });
        }
      }
    } catch (error) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể cập nhật trạng thái." });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole === "all") return true;
    return u.roles.includes(filterRole);
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "guest": return "Khách hàng";
      case "guide": return "Hướng dẫn viên";
      case "admin": return "Quản trị viên";
      case "staff": return "Nhân viên";
      default: return role;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f7ff" />
      
      {/* Ẩn Header Đen */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Người dùng</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Bộ lọc */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {(["all", "guest", "guide", "staff"] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.tabBtn, filterRole === role && styles.tabBtnActive]}
              onPress={() => setFilterRole(role)}
            >
              <Text style={[styles.tabTxt, filterRole === role && styles.tabTxtActive]}>
                {role === "all" ? "Tất cả" : getRoleLabel(role)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => {
              setSelectedUser(user);
              setModalVisible(true);
            }}
          >
            <View style={[styles.avatar, { backgroundColor: user.status === "suspended" ? "#f1f5f9" : user.avatarColor }]}>
              <Text style={[styles.avatarTxt, user.status === "suspended" && { color: "#94a3b8" }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, user.status === "suspended" && { color: "#94a3b8", textDecorationLine: "line-through" }]}>
                {user.name}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.statusCol}>
              {user.status === "suspended" ? (
                <Ionicons name="lock-closed" size={24} color="#ef4444" />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal Chi tiết User */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết Tài khoản</Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#1f2a58" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailAvatarRow}>
                    <View style={[styles.detailAvatar, { backgroundColor: selectedUser.status === "suspended" ? "#f1f5f9" : selectedUser.avatarColor }]}>
                      <Text style={styles.detailAvatarTxt}>{selectedUser.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.detailName}>{selectedUser.name}</Text>
                      <View style={styles.detailBadgeRow}>
                        <View style={[styles.roleBadge, { backgroundColor: selectedUser.status === "active" ? "#dcfce7" : "#fee2e2" }]}>
                          <Text style={[styles.roleBadgeTxt, { color: selectedUser.status === "active" ? "#16a34a" : "#dc2626" }]}>
                            {selectedUser.status === "active" ? "Đang hoạt động" : "Đã bị khóa"}
                          </Text>
                        </View>
                        {selectedUser.roles.map(r => (
                          <View key={r} style={[styles.roleBadge, { backgroundColor: "#eaf0ff" }]}>
                            <Text style={[styles.roleBadgeTxt, { color: "#4f7cff" }]}>{getRoleLabel(r)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}><Ionicons name="mail" size={18} color="#4f7cff" /></View>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedUser.email}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}><Ionicons name="call" size={18} color="#4f7cff" /></View>
                    <Text style={styles.detailLabel}>Số điện thoại</Text>
                    <Text style={styles.detailValue}>{selectedUser.phone}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}><Ionicons name="calendar" size={18} color="#4f7cff" /></View>
                    <Text style={styles.detailLabel}>Ngày tham gia</Text>
                    <Text style={styles.detailValue}>{selectedUser.createdAt}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.suspendBtn, selectedUser.status === "suspended" && styles.activateBtn]} 
                    onPress={() => promptToggleStatus(selectedUser)}
                  >
                    <Ionicons name={selectedUser.status === "active" ? "lock-closed" : "lock-open"} size={20} color="#fff" />
                    <Text style={styles.suspendBtnTxt}>
                      {selectedUser.status === "active" ? "Khóa tài khoản này" : "Mở khóa tài khoản"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* CUSTOM POPUP XÁC NHẬN - CHUẨN UI */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[
              styles.confirmIconWrap, 
              confirmPopup.type === "suspend" && { backgroundColor: "#fee2e2" },
              confirmPopup.type === "activate" && { backgroundColor: "#dcfce7" },
              confirmPopup.type === "success" && { backgroundColor: "#eaf0ff" },
              confirmPopup.type === "error" && { backgroundColor: "#fee2e2" }
            ]}>
              <Ionicons 
                name={
                  confirmPopup.type === "suspend" ? "lock-closed" : 
                  confirmPopup.type === "activate" ? "lock-open" : 
                  confirmPopup.type === "success" ? "checkmark-circle" : "warning"
                } 
                size={32} 
                color={
                  confirmPopup.type === "suspend" || confirmPopup.type === "error" ? "#ef4444" : 
                  confirmPopup.type === "activate" ? "#10b981" : "#4f7cff"
                } 
              />
            </View>
            
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>

            {confirmPopup.type === "success" || confirmPopup.type === "error" ? (
              <TouchableOpacity style={styles.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={styles.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmActionRow}>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={styles.confirmCancelBtnTxt}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmSubmitBtn, confirmPopup.type === "suspend" ? { backgroundColor: "#ef4444" } : { backgroundColor: "#10b981" }]} 
                  onPress={() => executeToggleStatus()}
                >
                  <Text style={styles.confirmSubmitBtnTxt}>{confirmPopup.type === "suspend" ? "Khóa ngay" : "Mở khóa"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-users" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  
  tabContainer: { paddingVertical: 10, backgroundColor: "#f3f7ff" },
  tabScroll: { paddingHorizontal: 16, gap: 10 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  tabBtnActive: { backgroundColor: "#4f7cff", borderColor: "#4f7cff" },
  tabTxt: { color: "#7a8cc2", fontWeight: "600", fontSize: 14 },
  tabTxtActive: { color: "#fff" },
  
  listContent: { padding: 16, paddingBottom: 100, gap: 12 },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 20 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: "#1f2a58", marginBottom: 2 },
  userEmail: { fontSize: 13, color: "#7a8cc2", marginBottom: 6 },
  statusCol: { alignItems: "center", justifyContent: "center", paddingLeft: 10 },

  // Modal Chi tiết
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: "60%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  detailAvatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  detailAvatar: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  detailAvatarTxt: { color: "#fff", fontWeight: "800", fontSize: 28 },
  detailName: { color: "#1f2a58", fontWeight: "800", fontSize: 20, marginBottom: 6 },
  detailBadgeRow: { flexDirection: "row", gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleBadgeTxt: { fontSize: 11, fontWeight: "700" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  detailIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  detailLabel: { color: "#7a8cc2", fontSize: 14, width: 120 },
  detailValue: { flex: 1, color: "#1f2a58", fontWeight: "700", fontSize: 14, textAlign: "right" },
  suspendBtn: { marginTop: 30, backgroundColor: "#ef4444", borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  activateBtn: { backgroundColor: "#10b981" },
  suspendBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Custom Confirm Popup
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, color: "#7a8cc2", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 15, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 48, borderRadius: 12, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 15, fontWeight: "800" },
});