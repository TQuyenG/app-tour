/**
 * app/guide-tour-management.tsx
 * Quản lý Tour của HDV - Đồng bộ dữ liệu, Responsive, Đồng bộ UI với Admin
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@app_tours";
const { width: SCREEN_W } = Dimensions.get("window");

// Giả lập ID của HDV đang đăng nhập
const CURRENT_GUIDE = { id: "g_me_01", name: "Trần Minh Khoa", note: "Sẵn sàng nhận tour ngay." };

interface AppliedGuide { id: string; name: string; note: string; }

interface GuideTour {
  id: string; name: string; category: string; duration: string;
  departure: string; price: string; priceRaw: number;
  status: string; description: string;
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[];
  note?: string;
}

const CATEGORIES = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng", "Phiêu lưu", "Gia đình"];
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Kho Tour" },
  { key: "assigned", label: "Lịch của tôi" },
];

export default function GuideTourManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tours, setTours] = useState<GuideTour[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState("active");
  const [filterCat, setFilterCat] = useState("Tất cả");

  // Modals
  const [noteModal, setNoteModal] = useState<GuideTour | null>(null);
  const [noteText, setNoteText] = useState("");
  const [reportModal, setReportModal] = useState<GuideTour | null>(null);
  const [reportText, setReportText] = useState("");
  const [proposeModal, setProposeModal] = useState(false);
  const [propForm, setPropForm] = useState({ name: "", duration: "", departure: "", category: "Biển đảo", price: "0", description: "" });

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "success" | "error" | "confirm"; title: string; message: string; onConfirm?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });

  // ✅ FIX: Dùng useFocusEffect thay useEffect để đồng bộ mỗi khi vào màn hình
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) setTours(JSON.parse(raw));
      });
    }, [])
  );

  const persist = useCallback(async (data: GuideTour[]) => {
    setTours(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const showPopup = (type: "success" | "error" | "confirm", title: string, message: string, onConfirm?: () => void) => {
    setConfirmPopup({ visible: true, type, title, message, onConfirm });
  };

  // HDV XIN NHẬN TOUR
  const handleApplyTour = (id: string) => {
    showPopup("confirm", "Xác nhận đăng ký", "Bạn muốn đăng ký dẫn tour này?\nYêu cầu sẽ được gửi đến Admin phê duyệt.", () => {
      const updated = tours.map(t => {
        if (t.id === id) {
          const applied = t.appliedGuides || [];
          if (applied.some(g => g.id === CURRENT_GUIDE.id)) return t;
          return { ...t, appliedGuides: [...applied, CURRENT_GUIDE] };
        }
        return t;
      });
      persist(updated);
      showPopup("success", "Đã gửi yêu cầu", "Admin sẽ xem xét và phê duyệt sớm nhất có thể.");
    });
  };

  // HDV ĐỀ XUẤT TOUR MỚI
  const handleSendProposal = () => {
    if (!propForm.name.trim()) {
      showPopup("error", "Thiếu thông tin", "Vui lòng nhập tên tour đề xuất."); return;
    }
    const newProposal: GuideTour = {
      id: `t-${Date.now()}`, name: propForm.name, category: propForm.category,
      duration: propForm.duration || "Chưa xác định", departure: propForm.departure || "TP. HCM",
      price: `${Number(propForm.price).toLocaleString("vi-VN")}đ`, priceRaw: parseInt(propForm.price) || 0,
      status: "draft", description: propForm.description,
      assignedGuideNames: [], appliedGuides: [],
    };
    persist([newProposal, ...tours]);
    setProposeModal(false);
    setPropForm({ name: "", duration: "", departure: "", category: "Biển đảo", price: "0", description: "" });
    showPopup("success", "Đã đề xuất", "Tour của bạn đang chờ Admin xem xét và phê duyệt.");
  };

  const getMyStatus = (tour: GuideTour) => {
    if (tour.status === "draft") return { label: "Chờ duyệt", color: "#d97706", bg: "#fef3c7", icon: "time-outline" as const, key: "draft" };
    if (tour.assignedGuideNames?.includes(CURRENT_GUIDE.name)) return { label: "Đã phân công", color: "#4f7cff", bg: "#eaf0ff", icon: "checkmark-circle-outline" as const, key: "assigned" };
    if (tour.appliedGuides?.some(g => g.id === CURRENT_GUIDE.id)) return { label: "Đang xét duyệt", color: "#8b5cf6", bg: "#ede9fe", icon: "hourglass-outline" as const, key: "registered" };
    if (tour.status === "full") return { label: "Đã đầy", color: "#ef4444", bg: "#fee2e2", icon: "close-circle-outline" as const, key: "full" };
    return { label: "Đang mở", color: "#10b981", bg: "#dcfce7", icon: "add-circle-outline" as const, key: "active" };
  };

  const filtered = tours.filter((t) => {
    const myStat = getMyStatus(t);
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    let matchTab = false;
    if (filterTab === "all") matchTab = true;
    else if (filterTab === "active") matchTab = myStat.key === "active" || myStat.key === "full";
    else if (filterTab === "assigned") matchTab = myStat.key === "assigned" || myStat.key === "registered" || myStat.key === "draft";
    return matchCat && matchTab;
  });

  // Đếm số tour trong lịch của tôi để hiện badge
  const myToursCount = tours.filter(t => {
    const s = getMyStatus(t);
    return s.key === "assigned" || s.key === "registered" || s.key === "draft";
  }).length;

  const iconColor = (type: "success" | "error" | "confirm") => {
    if (type === "success") return { bg: "#d1fae5", icon: "checkmark-circle" as const, color: "#10b981" };
    if (type === "error") return { bg: "#fee2e2", icon: "warning" as const, color: "#ef4444" };
    return { bg: "#eaf0ff", icon: "help-circle" as const, color: "#4f7cff" };
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.replace("/guide-home")} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#1f2a58" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Kho Tour Hệ Thống</Text>
          <Text style={s.headerSub}>{tours.length} tour đang có</Text>
        </View>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor: "#4f7cff" }]} onPress={() => setProposeModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={s.filterScroll}>
        {FILTER_TABS.map((f) => (
          <TouchableOpacity key={f.key} style={[s.filterChip, filterTab === f.key && s.filterActive]} onPress={() => setFilterTab(f.key)}>
            <Text style={[s.filterTxt, filterTab === f.key && s.filterTxtActive]}>{f.label}</Text>
            {f.key === "assigned" && myToursCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{myToursCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CATEGORY FILTER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.filterRow, { paddingTop: 0, paddingBottom: 8 }]} style={{ flexGrow: 0 }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[s.catChip, filterCat === c && s.catActive]} onPress={() => setFilterCat(c)}>
            <Text style={[s.catTxt, filterCat === c && s.catTxtActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* TOUR LIST */}
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="map-outline" size={48} color="#c0cbe8" />
            <Text style={s.emptyTxt}>Không có tour nào ở mục này.</Text>
          </View>
        )}
        {filtered.map((tour) => {
          const myStat = getMyStatus(tour);
          const isOpen = expandedId === tour.id;

          return (
            <TouchableOpacity key={tour.id} style={s.card} activeOpacity={0.88} onPress={() => setExpandedId(isOpen ? null : tour.id)}>
              {/* CARD HEADER */}
              <View style={s.cardHeader}>
                <View style={[s.catBadge, { backgroundColor: "#eaf0ff" }]}>
                  <Text style={s.catBadgeTxt}>{tour.category}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: myStat.bg }]}>
                  <Ionicons name={myStat.icon} size={11} color={myStat.color} />
                  <Text style={[s.statusTxt, { color: myStat.color }]}>{myStat.label}</Text>
                </View>
              </View>

              {/* TÊN TOUR */}
              <Text style={s.tourName} numberOfLines={2}>{tour.name}</Text>

              {/* META - 2 cột compact */}
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#7a8cc2" />
                  <Text style={s.metaTxt} numberOfLines={1}>{tour.duration || "—"}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={12} color="#7a8cc2" />
                  <Text style={s.metaTxt} numberOfLines={1}>{tour.departure || "—"}</Text>
                </View>
              </View>

              {/* FOOTER: GIÁ + NÚT */}
              <View style={s.cardFooter}>
                <Text style={s.priceTxt}>{Number(tour.priceRaw).toLocaleString("vi-VN")}đ</Text>

                {myStat.key === "active" && (
                  <TouchableOpacity style={[s.smartBtn, { backgroundColor: "#4f7cff" }]} onPress={() => handleApplyTour(tour.id)}>
                    <Ionicons name="add-circle-outline" size={13} color="#fff" />
                    <Text style={s.smartBtnTxt}>Đăng ký</Text>
                  </TouchableOpacity>
                )}
                {myStat.key === "registered" && (
                  <View style={[s.smartBtn, { backgroundColor: "#ede9fe" }]}>
                    <Ionicons name="hourglass-outline" size={13} color="#8b5cf6" />
                    <Text style={[s.smartBtnTxt, { color: "#8b5cf6" }]}>Đang xét</Text>
                  </View>
                )}
                {myStat.key === "assigned" && (
                  <View style={[s.smartBtn, { backgroundColor: "#dcfce7" }]}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#10b981" />
                    <Text style={[s.smartBtnTxt, { color: "#10b981" }]}>Đã nhận</Text>
                  </View>
                )}
                {myStat.key === "draft" && (
                  <View style={[s.smartBtn, { backgroundColor: "#fef3c7" }]}>
                    <Ionicons name="time-outline" size={13} color="#d97706" />
                    <Text style={[s.smartBtnTxt, { color: "#d97706" }]}>Chờ duyệt</Text>
                  </View>
                )}
                {/* Mũi tên expand */}
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#94a8d8" style={{ marginLeft: 4 }} />
              </View>

              {/* EXPANDED */}
              {isOpen && (
                <View style={s.expandSection}>
                  {tour.description ? (
                    <View style={s.infoBlock}>
                      <Text style={s.infoBlockLabel}>CHI TIẾT / LỊCH TRÌNH</Text>
                      <Text style={s.infoBlockValue}>{tour.description}</Text>
                    </View>
                  ) : null}

                  {tour.note ? (
                    <View style={[s.infoBlock, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                      <Text style={[s.infoBlockLabel, { color: "#d97706" }]}>GHI CHÚ CỦA TÔI</Text>
                      <Text style={s.infoBlockValue}>{tour.note}</Text>
                    </View>
                  ) : null}

                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#eaf0ff", flex: 1 }]} onPress={() => { setNoteText(tour.note || ""); setNoteModal(tour); }}>
                      <Ionicons name="create-outline" size={13} color="#4f7cff" />
                      <Text style={[s.actionTxt, { color: "#4f7cff" }]}>Ghi chú</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2" }]} onPress={() => { setReportText(""); setReportModal(tour); }}>
                      <Ionicons name="warning-outline" size={13} color="#ef4444" />
                      <Text style={[s.actionTxt, { color: "#ef4444" }]}>Báo cáo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* MODAL ĐỀ XUẤT TOUR */}
      <Modal visible={proposeModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setProposeModal(false)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Đề xuất Tour mới</Text>
              <TouchableOpacity onPress={() => setProposeModal(false)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.formLabel}>Tên tour đề xuất <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <TextInput style={s.input} value={propForm.name} onChangeText={(v) => setPropForm({ ...propForm, name: v })} placeholder="VD: Khám phá Vịnh Lan Hạ..." placeholderTextColor="#b0bdd8" />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Thời lượng</Text>
                  <TextInput style={s.input} value={propForm.duration} onChangeText={(v) => setPropForm({ ...propForm, duration: v })} placeholder="3N2Đ" placeholderTextColor="#b0bdd8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Xuất phát</Text>
                  <TextInput style={s.input} value={propForm.departure} onChangeText={(v) => setPropForm({ ...propForm, departure: v })} placeholder="TP. HCM" placeholderTextColor="#b0bdd8" />
                </View>
              </View>

              <Text style={s.formLabel}>Lịch trình tóm tắt</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]} multiline value={propForm.description} onChangeText={(v) => setPropForm({ ...propForm, description: v })} placeholder="Mô tả ngắn gọn điểm đến, hoạt động..." placeholderTextColor="#b0bdd8" />

              <TouchableOpacity style={s.saveBtn} onPress={handleSendProposal}>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Gửi Admin Phê Duyệt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL BÁO CÁO */}
      <Modal visible={!!reportModal} animationType="fade" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setReportModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Báo cáo sự cố Tour</Text>
              <TouchableOpacity onPress={() => setReportModal(null)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            {reportModal && (
              <View style={[s.tourInfoStrip, { marginHorizontal: 20, marginTop: 4 }]}>
                <Ionicons name="map-outline" size={13} color="#4f7cff" />
                <Text style={s.tourInfoStripTxt} numberOfLines={1}>{reportModal.name}</Text>
              </View>
            )}
            <View style={s.modalBody}>
              <TextInput
                style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
                value={reportText}
                onChangeText={setReportText}
                placeholder="Nêu rõ sự cố (VD: Điểm X đang sửa chữa, đề nghị chuyển hướng sang Y...)"
                placeholderTextColor="#b0bdd8"
                multiline
                autoFocus
              />
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#ef4444" }]} onPress={() => {
                setReportModal(null); setReportText("");
                showPopup("success", "Đã gửi báo cáo", "Góp ý của bạn đã được ghi nhận và chuyển đến Admin.");
              }}>
                <Ionicons name="warning-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Gửi Báo Cáo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL GHI CHÚ */}
      <Modal visible={!!noteModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setNoteModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Ghi chú cá nhân</Text>
              <TouchableOpacity onPress={() => setNoteModal(null)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#7a8cc2" />
              </TouchableOpacity>
            </View>
            {noteModal && (
              <View style={[s.tourInfoStrip, { marginHorizontal: 20, marginTop: 4 }]}>
                <Ionicons name="map-outline" size={13} color="#4f7cff" />
                <Text style={s.tourInfoStripTxt} numberOfLines={1}>{noteModal.name}</Text>
              </View>
            )}
            <View style={s.modalBody}>
              <TextInput style={[s.input, { minHeight: 100, paddingTop: 12 }]} value={noteText} onChangeText={setNoteText} placeholder="Chỉ mình bạn xem được..." placeholderTextColor="#b0bdd8" multiline textAlignVertical="top" />
              <TouchableOpacity style={s.saveBtn} onPress={() => {
                if (noteModal) { persist(tours.map((x) => x.id === noteModal.id ? { ...x, note: noteText } : x)); setNoteModal(null); }
              }}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Lưu ghi chú</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CONFIRM / SUCCESS / ERROR POPUP */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            {(() => {
              const ic = iconColor(confirmPopup.type);
              return (
                <View style={[s.confirmIconWrap, { backgroundColor: ic.bg }]}>
                  <Ionicons name={ic.icon} size={30} color={ic.color} />
                </View>
              );
            })()}
            <Text style={s.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={s.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "confirm" ? (
              <View style={s.confirmActionRow}>
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                  <Text style={s.confirmCancelBtnTxt}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmSubmitBtn} onPress={() => {
                  if (confirmPopup.onConfirm) confirmPopup.onConfirm();
                  setConfirmPopup({ ...confirmPopup, visible: false });
                }}>
                  <Text style={s.confirmSubmitBtnTxt}>Đồng ý</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}>
                <Text style={s.confirmSingleBtnTxt}>Đóng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <GuideTabBar activeRoute="guide-tour-management" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },

  // HEADER
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff",
  },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", textAlign: "center" },
  headerSub: { fontSize: 11, color: "#94a8d8", textAlign: "center", marginTop: 1 },

  // FILTERS
  filterScroll: { flexGrow: 0, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f4ff" },
  filterRow: { gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff",
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6,
  },
  filterActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "700" },
  filterTxtActive: { color: "#fff" },
  badge: { backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },

  catChip: { borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 5 },
  catActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  catTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  catTxtActive: { color: "#4f7cff" },

  // LIST
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyTxt: { color: "#94a8d8", marginTop: 10, fontSize: 14 },

  // CARD
  card: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff",
    padding: 13, marginBottom: 12, elevation: 2,
    shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeTxt: { color: "#4f7cff", fontSize: 10, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  tourName: { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 7, lineHeight: 20 },

  // META ROW - compact 2 cột
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 100 },
  metaTxt: { color: "#7a8cc2", fontSize: 11, flexShrink: 1 },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0f4ff",
  },
  priceTxt: { fontSize: 14, fontWeight: "900", color: "#10b981" },
  smartBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smartBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 11 },

  // EXPAND
  expandSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  infoBlock: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 7, borderWidth: 1, borderColor: "#e2e8f0" },
  infoBlockLabel: { color: "#94a8d8", fontSize: 10, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
  infoBlockValue: { color: "#1f2a58", fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 7, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  actionTxt: { fontSize: 12, fontWeight: "700" },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 36, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 18, paddingBottom: 36 },
  tourInfoStrip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4,
  },
  tourInfoStripTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "600", flex: 1 },
  formLabel: { color: "#1f2a58", fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0",
    paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 13,
  },
  saveBtn: {
    marginTop: 18, backgroundColor: "#4f7cff", borderRadius: 12, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  saveBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // CONFIRM POPUP - đồng bộ với admin
  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 340, borderRadius: 22, padding: 22, alignItems: "center", elevation: 10 },
  confirmIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 6, textAlign: "center" },
  confirmMessage: { fontSize: 13, color: "#7a8cc2", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  confirmActionRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn: { flex: 1, height: 44, borderRadius: 11, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e4ebff" },
  confirmCancelBtnTxt: { color: "#7a8cc2", fontSize: 14, fontWeight: "700" },
  confirmSubmitBtn: { flex: 1, height: 44, borderRadius: 11, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  confirmSubmitBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  confirmSingleBtn: { width: "100%", height: 44, borderRadius: 11, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  confirmSingleBtnTxt: { color: "#1f2a58", fontSize: 14, fontWeight: "800" },
});