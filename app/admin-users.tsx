/**
 * app/admin-users.tsx
 * Quản lý Người dùng - Nâng cấp: Full CRUD, Tìm kiếm, Lưới/Danh sách, 
 * Đổi mật khẩu, Phân quyền Dual Role, Thay đổi hàng loạt.
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@/constants/storage-helper"; 
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
  Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity,
  View, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserRole = "guest" | "guide" | "admin" | "staff";
type UserStatus = "active" | "suspended";

interface AppUser {
  id: string; 
  name: string; 
  email: string; 
  phone: string;
  password?: string; 
  roles: UserRole[]; 
  activeRole: UserRole;
  status: UserStatus; 
  createdAt: string; 
  avatarColor: string;
}

const ROLES: UserRole[] = ["guest", "guide", "staff", "admin"];
const AVATAR_COLORS = ['#4f7cff','#10b981','#f59e0b','#8b5cf6','#ef4444'];

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // Chế độ chọn nhiều
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Sửa/Tạo
  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Popup thông báo/xác nhận
  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "delete" | "success" | "error"; 
    title: string; message: string; targetId?: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(useCallback(() => { loadUsers(); }, []));

  const loadUsers = async () => {
    try {
      const raw = await AsyncStorage.getItem("@app_accounts");
      if (raw) setUsers(JSON.parse(raw));
    } catch (e) { setUsers([]); }
  };

  const saveUser = async () => {
    if (!editingUser?.name || !editingUser?.email) {
      Alert.alert("Lỗi", "Vui lòng nhập tên và email.");
      return;
    }
    
    let updated = [...users];
    const isNew = !users.find(u => u.id === editingUser.id);
    
    // Logic: Mọi tài khoản đều có role Guest mặc định, activeRole phải thuộc danh sách roles
    const finalRoles = editingUser.roles || ["guest"];
    if (!finalRoles.includes("guest")) finalRoles.push("guest");
    const finalActiveRole = (editingUser.activeRole && finalRoles.includes(editingUser.activeRole)) 
      ? editingUser.activeRole 
      : finalRoles[0];

    const userData = {
      ...editingUser,
      roles: finalRoles,
      activeRole: finalActiveRole,
      password: newPassword || editingUser.password || "123456", // Mặc định 123456 nếu tạo mới
      createdAt: editingUser.createdAt || new Date().toLocaleDateString('vi-VN'),
      avatarColor: editingUser.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      status: editingUser.status || "active"
    } as AppUser;

    if (isNew) updated.unshift(userData);
    else updated = updated.map(u => u.id === editingUser.id ? userData : u);

    await AsyncStorage.setItem("@app_accounts", JSON.stringify(updated));
    setUsers(updated);
    setEditModal(false);
    setNewPassword("");
    setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: "Đã cập nhật thông tin tài khoản." });
  };

  // FIX LỖI: Hàm xóa user chính xác
  const deleteUser = async () => {
    const idToDelete = confirmPopup.targetId;
    if (!idToDelete) return;
    
    try {
      const updated = users.filter(u => u.id !== idToDelete);
      await AsyncStorage.setItem("@app_accounts", JSON.stringify(updated));
      setUsers(updated);
      setConfirmPopup({ visible: true, type: "success", title: "Đã xóa", message: "Tài khoản đã được gỡ khỏi hệ thống." });
    } catch (e) {
      setConfirmPopup({ visible: true, type: "error", title: "Lỗi", message: "Không thể xóa tài khoản này." });
    }
  };

  const handleBulkStatusChange = async (newStatus: UserStatus) => {
    const updated = users.map(u => selectedIds.includes(u.id) ? { ...u, status: newStatus } : u);
    await AsyncStorage.setItem("@app_accounts", JSON.stringify(updated));
    setUsers(updated);
    setSelectedIds([]);
    setIsSelectionMode(false);
    setConfirmPopup({ visible: true, type: "success", title: "Thành công", message: `Đã cập nhật trạng thái cho ${selectedIds.length} tài khoản.` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = filterRole === "all" || u.roles.includes(filterRole);
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, filterRole]);

  const renderUserItem = ({ item: user }: { item: AppUser }) => {
    const isSelected = selectedIds.includes(user.id);
    return (
      <TouchableOpacity 
        style={[
            viewMode === "list" ? styles.listCard : styles.gridCard,
            isSelected && { borderColor: '#4f7cff', borderWidth: 2 }
        ]} 
        onPress={() => isSelectionMode ? toggleSelect(user.id) : (setEditingUser(user), setEditModal(true))}
        onLongPress={() => { setIsSelectionMode(true); toggleSelect(user.id); }}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: user.status === "suspended" ? "#cbd5e1" : user.avatarColor }]}>
          <Text style={styles.avatarTxt}>{user.name.charAt(0).toUpperCase()}</Text>
          {isSelected && <View style={styles.checkIcon}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
        </View>
        <View style={styles.userMainInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          <View style={styles.badgeRow}>
             {user.roles.map(r => (
               <View key={r} style={[styles.miniBadge, r === 'guide' && {backgroundColor: '#dcfce7'}]}>
                 <Text style={[styles.miniBadgeTxt, r === 'guide' && {color: '#16a34a'}]}>{r}</Text>
               </View>
             ))}
          </View>
        </View>
        {viewMode === "list" && !isSelectionMode && (
          <Ionicons name={user.status === "active" ? "checkmark-circle" : "lock-closed"} size={20} color={user.status === "active" ? "#10b981" : "#ef4444"} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header với nút Thêm (+) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/admin-home")}>
          <Ionicons name="chevron-back" size={24} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSelectionMode ? `Đã chọn ${selectedIds.length}` : "Người dùng"}</Text>
        
        <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconActionBtn} onPress={() => { setEditingUser({ id: `acc-${Date.now()}`, roles: ["guest"], status: "active" }); setEditModal(true); }}>
                <Ionicons name="add-circle" size={28} color="#4f7cff" />
            </TouchableOpacity>
            {(filterRole === "all" || filterRole === "guide") && (
                <TouchableOpacity style={styles.guideDetailBtn} onPress={() => router.push("/admin-guide-management")}>
                    <Ionicons name="shield-checkmark" size={20} color="#4f7cff" />
                </TouchableOpacity>
            )}
        </View>
      </View>

      {/* Bulk Actions (Chỉnh sửa hàng loạt) */}
      {isSelectionMode && (
        <View style={styles.bulkBar}>
            <TouchableOpacity onPress={() => handleBulkStatusChange("active")} style={styles.bulkBtn}><Ionicons name="lock-open" size={16} color="#10b981"/><Text style={{color:'#10b981', fontWeight:'700', fontSize:12}}>Mở</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleBulkStatusChange("suspended")} style={styles.bulkBtn}><Ionicons name="lock-closed" size={16} color="#ef4444"/><Text style={{color:'#ef4444', fontWeight:'700', fontSize:12}}>Khóa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => {setIsSelectionMode(false); setSelectedIds([]);}} style={styles.bulkBtn}><Text style={{fontSize:12, fontWeight:'600'}}>Hủy</Text></TouchableOpacity>
        </View>
      )}

      {/* Search & View Toggle */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a8d8" />
          <TextInput style={styles.searchInput} placeholder="Tìm tên hoặc email..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === "list" ? "grid" : "list")}>
          <Ionicons name={viewMode === "list" ? "grid-outline" : "list-outline"} size={22} color="#1f2a58" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(["all", ...ROLES] as const).map(r => (
            <TouchableOpacity key={r} style={[styles.filterChip, filterRole === r && styles.filterChipActive]} onPress={() => setFilterRole(r)}>
              <Text style={[styles.filterTxt, filterRole === r && styles.filterTxtActive]}>{r === "all" ? "Tất cả" : r.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredUsers}
        key={viewMode}
        numColumns={viewMode === "list" ? 1 : 2}
        keyExtractor={item => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyTxt}>Không có dữ liệu người dùng.</Text>}
      />

      {/* Modal CRUD & Đổi mật khẩu */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{users.find(u=>u.id === editingUser?.id) ? "Chi tiết tài khoản" : "Tạo tài khoản mới"}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput style={styles.input} value={editingUser?.name} onChangeText={t => setEditingUser(prev => ({...prev!, name: t}))} />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} value={editingUser?.email} onChangeText={t => setEditingUser(prev => ({...prev!, email: t}))} keyboardType="email-address" autoCapitalize="none" />
              
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.input} value={editingUser?.phone} onChangeText={t => setEditingUser(prev => ({...prev!, phone: t}))} keyboardType="phone-pad" />

              <View style={styles.pwdSection}>
                <Text style={styles.inputLabel}>Đổi mật khẩu mới</Text>
                <TextInput style={[styles.input, {borderColor: '#f59e0b'}]} value={newPassword} onChangeText={setNewPassword} placeholder="Nhập để đổi hoặc để trống" secureTextEntry />
              </View>

              <Text style={styles.inputLabel}>Quyền hạn (Dual Role)</Text>
              <View style={styles.rolePicker}>
                {ROLES.map(r => {
                  const hasRole = editingUser?.roles?.includes(r);
                  return (
                    <TouchableOpacity key={r} style={[styles.roleBtn, hasRole && styles.roleBtnActive]} 
                        onPress={() => {
                            const current = editingUser?.roles || [];
                            const next = hasRole ? current.filter(x => x !== r) : [...current, r];
                            if (next.length > 0) setEditingUser(prev => ({...prev!, roles: next}));
                        }}>
                      <Text style={[styles.roleTxt, hasRole && styles.roleTxtActive]}>{r.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Vai trò đăng nhập (Role Mới)</Text>
              <View style={styles.rolePicker}>
                {editingUser?.roles?.map(r => (
                  <TouchableOpacity key={r} style={[styles.roleBtn, editingUser.activeRole === r && {backgroundColor: '#4f7cff', borderColor:'#4f7cff'}]} 
                    onPress={() => setEditingUser(prev => ({...prev!, activeRole: r}))}>
                    <Text style={[styles.roleTxt, editingUser.activeRole === r && {color: '#fff'}]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveUser}><Text style={styles.saveBtnTxt}>Lưu thông tin</Text></TouchableOpacity>
              
              {editingUser?.id && (
                <TouchableOpacity style={styles.deleteLink} onPress={() => setConfirmPopup({ visible: true, type: "delete", title: "Xác nhận xóa", message: "User này sẽ bị xóa vĩnh viễn khỏi Local Storage.", targetId: editingUser.id })}>
                  <Text style={styles.deleteLinkTxt}>Xóa tài khoản</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Popups */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name={confirmPopup.type === "delete" ? "trash" : "checkmark-circle"} size={50} color={confirmPopup.type === "delete" ? "#ef4444" : "#10b981"} />
            <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.cBtnBack} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text>Đóng</Text></TouchableOpacity>
              {confirmPopup.type === "delete" && (
                <TouchableOpacity style={styles.cBtnRed} onPress={async () => { await deleteUser(); setEditModal(false); }}>
                    <Text style={{color:'#fff', fontWeight:'700'}}>Xóa ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <AdminTabBar role="admin" activeRoute="admin-users" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth:1, borderBottomColor:'#e4ebff' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconActionBtn: { padding: 4 },
  guideDetailBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },

  bulkBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
  bulkBtn: { flex: 1, flexDirection: 'row', alignItems:'center', justifyContent:'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e4ebff' },

  searchBarRow: { flexDirection: "row", padding: 16, gap: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: "#e4ebff" },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  viewToggle: { width: 46, height: 46, backgroundColor: "#fff", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },

  filterRow: { paddingBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e4ebff" },
  filterChipActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontWeight: "700", fontSize: 11 },
  filterTxtActive: { color: "#fff" },

  listContainer: { padding: 16, paddingBottom: 120 },
  listCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#e4ebff' },
  gridCard: { width: "48%", backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: "4%", marginHorizontal: "1%", alignItems: "center", elevation: 2, borderWidth: 1, borderColor: '#e4ebff' },
  avatar: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", position: 'relative' },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "800" },
  checkIcon: { position: 'absolute', top: -5, right: -5, backgroundColor: '#4f7cff', width:20, height:20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', alignItems:'center', justifyContent:'center' },
  userMainInfo: { flex: 1, marginHorizontal: 12 },
  userName: { fontSize: 15, fontWeight: "700", color: "#1f2a58" },
  userEmail: { fontSize: 11, color: "#7a8cc2", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  miniBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeTxt: { fontSize: 8, color: "#64748b", fontWeight: "800" },

  emptyTxt: { textAlign: "center", color: "#94a3b8", marginTop: 40 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "90%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1f2a58" },
  modalBody: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "800", color: "#94a8d8", marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  input: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e4ebff", borderRadius: 12, padding: 14, fontSize: 15, color: "#1f2a58" },
  pwdSection: { padding: 12, backgroundColor: '#fffbeb', borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#fef3c7' },
  rolePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: '#fff' },
  roleBtnActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  roleTxt: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  roleTxtActive: { color: "#fff" },
  saveBtn: { backgroundColor: "#4f7cff", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 30, elevation: 3 },
  saveBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },
  deleteLink: { marginTop: 20, padding: 10, alignItems: "center" },
  deleteLinkTxt: { color: "#ef4444", fontWeight: "700", fontSize: 13 },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", width: "100%" },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginTop: 16 },
  confirmMessage: { textAlign: "center", color: "#64748b", marginTop: 8, marginBottom: 24, fontSize: 14 },
  confirmBtnRow: { flexDirection: "row", gap: 10, width: '100%' },
  cBtnBack: { flex: 1, padding: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#f1f5f9" },
  cBtnRed: { flex: 1, padding: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#ef4444" },
  cBtnBlue: { flex: 1, padding: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#4f7cff" },
});