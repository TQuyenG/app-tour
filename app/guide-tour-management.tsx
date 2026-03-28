/**
 * app/guide-tour-management.tsx
 * Quản lý Tour của HDV - Đã FIX: Xóa Ghi chú, Popup Nhập Lý do, Đăng ký lại
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "@app_tours";
const PROFILE_KEY = "@guide_profile";

const CURRENT_GUIDE = { id: "g_me_01", name: "Trần Minh Khoa", note: "" };

interface AppliedGuide { id: string; name: string; note: string; vneidVerified?: boolean; }
interface RejectedGuide { id: string; name: string; reason: string; }
interface TourReport { id: string; guideName: string; text: string; date: string; isResolved: boolean; }

interface GuideTour {
  id: string; name: string; category: string; duration: string;
  departure: string; price: string; priceRaw: number;
  status: string; description: string;
  assignedGuideNames: string[];
  appliedGuides: AppliedGuide[];
  rejectedGuides?: RejectedGuide[];
  reports?: TourReport[];
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
  const [isVneidVerified, setIsVneidVerified] = useState(false);

  // Modals
  const [applyModal, setApplyModal] = useState<{ visible: boolean; tourId: string }>({ visible: false, tourId: "" });
  const [applyNote, setApplyNote] = useState("");
  const [reportModal, setReportModal] = useState<GuideTour | null>(null);
  const [reportText, setReportText] = useState("");
  const [proposeModal, setProposeModal] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean; type: "success" | "error" | "confirm"; title: string; message: string; onConfirm?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => { if (raw) setTours(JSON.parse(raw)); });
      AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
        if (raw) setIsVneidVerified(JSON.parse(raw).vneidVerified || false);
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

  const openApplyModal = (id: string) => {
    setApplyNote("");
    setApplyModal({ visible: true, tourId: id });
  };

  const executeApplyTour = () => {
    if (!applyModal.tourId) return;
    if (!applyNote.trim()) {
      showPopup("error", "Thiếu thông tin", "Vui lòng nhập lý do/thế mạnh của bạn để Admin ưu tiên.");
      return;
    }
    
    const updated = tours.map(t => {
      if (t.id === applyModal.tourId) {
        const applied = t.appliedGuides || [];
        return { ...t, appliedGuides: [...applied, { ...CURRENT_GUIDE, note: applyNote, vneidVerified: isVneidVerified }] };
      }
      return t;
    });
    persist(updated);
    setApplyModal({ visible: false, tourId: "" });
    showPopup("success", "Đã gửi yêu cầu", "Admin sẽ xem xét và phê duyệt dựa trên lý do của bạn.");
  };

  const handleReapplyTour = (id: string) => {
    showPopup("confirm", "Đăng ký lại Tour", "Bạn muốn nộp lại yêu cầu dẫn tour này?\nAdmin sẽ nhận được yêu cầu xét duyệt mới của bạn.", () => {
      const updated = tours.map(t => {
        if (t.id === id) {
          const applied = t.appliedGuides || [];
          const rejected = t.rejectedGuides?.filter(g => g.id !== CURRENT_GUIDE.id) || [];
          if (applied.some(g => g.id === CURRENT_GUIDE.id)) return t;
          return { ...t, appliedGuides: [...applied, { ...CURRENT_GUIDE, note: "Xin đăng ký lại tour này.", vneidVerified: isVneidVerified }], rejectedGuides: rejected };
        }
        return t;
      });
      persist(updated);
      showPopup("success", "Đã gửi lại yêu cầu", "Yêu cầu đăng ký lại của bạn đã được chuyển đến Admin.");
    });
  };

  const handleSendReport = () => {
    if (!reportModal || !reportText.trim()) return;
    const newReport: TourReport = {
      id: `rep-${Date.now()}`, guideName: CURRENT_GUIDE.name, text: reportText, 
      date: new Date().toLocaleDateString('vi-VN'), isResolved: false
    };
    const updated = tours.map(t => {
      if (t.id === reportModal.id) return { ...t, reports: [...(t.reports || []), newReport] };
      return t;
    });
    persist(updated);
    setReportModal(null); setReportText("");
    showPopup("success", "Đã gửi báo cáo", "Góp ý của bạn đã được ghi nhận và chuyển đến Admin.");
  };

  const getMyStatus = (tour: GuideTour) => {
    if (tour.rejectedGuides?.some(g => g.id === CURRENT_GUIDE.id)) return { label: "Bị từ chối", color: "#ef4444", bg: "#fee2e2", icon: "close-circle" as const, key: "rejected" };
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
    else if (filterTab === "assigned") matchTab = myStat.key === "assigned" || myStat.key === "registered" || myStat.key === "draft" || myStat.key === "rejected";
    return matchCat && matchTab;
  });

  const myToursCount = tours.filter(t => ["assigned", "registered", "draft", "rejected"].includes(getMyStatus(t).key)).length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.stickyTop}>
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

        <View style={s.filterTabRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRowContent}>
            {FILTER_TABS.map((f) => (
              <TouchableOpacity key={f.key} style={[s.filterChip, filterTab === f.key && s.filterActive]} onPress={() => setFilterTab(f.key)}>
                <Text style={[s.filterTxt, filterTab === f.key && s.filterTxtActive]}>{f.label}</Text>
                {f.key === "assigned" && myToursCount > 0 && (
                  <View style={s.badge}><Text style={s.badgeTxt}>{myToursCount}</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={s.catFilterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRowContent}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} style={[s.catChip, filterCat === c && s.catActive]} onPress={() => setFilterCat(c)}>
                <Text style={[s.catTxt, filterCat === c && s.catTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.emptyBox}><Ionicons name="map-outline" size={48} color="#c0cbe8" /><Text style={s.emptyTxt}>Không có tour nào ở mục này.</Text></View>
        )}
        {filtered.map((tour) => {
          const myStat = getMyStatus(tour);
          const isOpen = expandedId === tour.id;
          const myRejectInfo = tour.rejectedGuides?.find(g => g.id === CURRENT_GUIDE.id);

          return (
            <View key={tour.id} style={s.card}>
              <TouchableOpacity activeOpacity={0.88} onPress={() => setExpandedId(isOpen ? null : tour.id)}>
                <View style={s.cardHeader}>
                  <View style={[s.catBadge, { backgroundColor: "#eaf0ff" }]}><Text style={s.catBadgeTxt}>{tour.category}</Text></View>
                  <View style={[s.statusBadge, { backgroundColor: myStat.bg }]}>
                    <Ionicons name={myStat.icon} size={11} color={myStat.color} />
                    <Text style={[s.statusTxt, { color: myStat.color }]}>{myStat.label}</Text>
                  </View>
                </View>

                <Text style={s.tourName} numberOfLines={2}>{tour.name}</Text>

                <View style={s.metaRow}>
                  <View style={s.metaItem}><Ionicons name="time-outline" size={12} color="#7a8cc2" /><Text style={s.metaTxt} numberOfLines={1}>{tour.duration || "—"}</Text></View>
                  <View style={s.metaItem}><Ionicons name="location-outline" size={12} color="#7a8cc2" /><Text style={s.metaTxt} numberOfLines={1}>{tour.departure || "—"}</Text></View>
                </View>
              </TouchableOpacity>

              <View style={s.cardFooter}>
                <Text style={s.priceTxt}>{Number(tour.priceRaw).toLocaleString("vi-VN")}đ</Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {myStat.key === "active" && (
                    <TouchableOpacity style={[s.smartBtn, { backgroundColor: "#4f7cff" }]} onPress={() => openApplyModal(tour.id)}>
                      <Ionicons name="add-circle-outline" size={13} color="#fff" />
                      <Text style={s.smartBtnTxt}>Đăng ký</Text>
                    </TouchableOpacity>
                  )}
                  {myStat.key === "registered" && (
                    <View style={[s.smartBtn, { backgroundColor: "#ede9fe" }]}><Ionicons name="hourglass-outline" size={13} color="#8b5cf6" /><Text style={[s.smartBtnTxt, { color: "#8b5cf6" }]}>Đang xét</Text></View>
                  )}
                  {myStat.key === "assigned" && (
                    <View style={[s.smartBtn, { backgroundColor: "#dcfce7" }]}><Ionicons name="checkmark-circle-outline" size={13} color="#10b981" /><Text style={[s.smartBtnTxt, { color: "#10b981" }]}>Đã nhận</Text></View>
                  )}
                  {myStat.key === "draft" && (
                    <View style={[s.smartBtn, { backgroundColor: "#fef3c7" }]}><Ionicons name="time-outline" size={13} color="#d97706" /><Text style={[s.smartBtnTxt, { color: "#d97706" }]}>Chờ duyệt</Text></View>
                  )}
                  {myStat.key === "rejected" && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={[s.smartBtn, { backgroundColor: "#fee2e2" }]}><Ionicons name="close-circle" size={13} color="#ef4444" /><Text style={[s.smartBtnTxt, { color: "#ef4444" }]}>Từ chối</Text></View>
                      <TouchableOpacity style={[s.smartBtn, { backgroundColor: "#4f7cff" }]} onPress={() => handleReapplyTour(tour.id)}>
                        <Ionicons name="refresh-outline" size={13} color="#fff" />
                        <Text style={s.smartBtnTxt}>Đăng ký lại</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setExpandedId(isOpen ? null : tour.id)}>
                     <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a8d8" />
                  </TouchableOpacity>
                </View>
              </View>

              {isOpen && (
                <View style={s.expandSection}>
                  {myStat.key === "rejected" && myRejectInfo && (
                     <View style={[s.infoBlock, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                        <Text style={[s.infoBlockLabel, { color: "#ef4444" }]}>LÝ DO TỪ CHỐI (ADMIN)</Text>
                        <Text style={[s.infoBlockValue, { fontStyle: "italic", color: "#b91c1c" }]}>"{myRejectInfo.reason}"</Text>
                     </View>
                  )}

                  {tour.description ? (
                    <View style={s.infoBlock}><Text style={s.infoBlockLabel}>CHI TIẾT / LỊCH TRÌNH</Text><Text style={s.infoBlockValue}>{tour.description}</Text></View>
                  ) : null}

                  {myStat.key === "assigned" && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#fee2e2", flex: 1 }]} onPress={() => { setReportText(""); setReportModal(tour); }}>
                        <Ionicons name="warning-outline" size={13} color="#ef4444" /><Text style={[s.actionTxt, { color: "#ef4444" }]}>Báo cáo sự cố Tour</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL NHẬP LÝ DO XIN NHẬN TOUR */}
      <Modal visible={applyModal.visible} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setApplyModal({ visible: false, tourId: "" })} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Đăng ký dẫn Tour</Text>
              <TouchableOpacity onPress={() => setApplyModal({ visible: false, tourId: "" })} style={s.closeBtn}><Ionicons name="close" size={18} color="#7a8cc2" /></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={[s.formLabel, { marginTop: 0, fontWeight: "700", marginBottom: 4 }]}>Vì sao bạn phù hợp với Tour này?</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>VD: Tôi có 3 năm kinh nghiệm tuyến này, tiếng Anh tốt...</Text>
              <TextInput 
                style={[s.input, { minHeight: 100, textAlignVertical: "top" }]} 
                value={applyNote} 
                onChangeText={setApplyNote} 
                placeholder="Nhập lợi thế của bạn để thuyết phục Admin..." 
                placeholderTextColor="#b0bdd8" 
                multiline 
                autoFocus 
              />
              <TouchableOpacity style={s.saveBtn} onPress={executeApplyTour}>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Gửi Yêu Cầu Cho Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL BÁO CÁO SỰ CỐ */}
      <Modal visible={!!reportModal} animationType="fade" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setReportModal(null)} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Báo cáo sự cố Tour</Text>
              <TouchableOpacity onPress={() => setReportModal(null)} style={s.closeBtn}><Ionicons name="close" size={18} color="#7a8cc2" /></TouchableOpacity>
            </View>
            {reportModal && (
              <View style={[s.tourInfoStrip, { marginHorizontal: 20, marginTop: 4 }]}><Ionicons name="map-outline" size={13} color="#4f7cff" /><Text style={s.tourInfoStripTxt} numberOfLines={1}>{reportModal.name}</Text></View>
            )}
            <View style={s.modalBody}>
              <TextInput style={[s.input, { minHeight: 100, textAlignVertical: "top" }]} value={reportText} onChangeText={setReportText} placeholder="Nêu rõ sự cố (Sửa chữa lộ trình, khách gặp vấn đề...)" placeholderTextColor="#b0bdd8" multiline autoFocus />
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#ef4444" }]} onPress={handleSendReport}>
                <Ionicons name="warning-outline" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Gửi Báo Cáo Cho Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL XÁC NHẬN */}
      <Modal visible={confirmPopup.visible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <View style={[s.confirmIconWrap, { backgroundColor: confirmPopup.type === "success" ? "#d1fae5" : confirmPopup.type === "error" ? "#fee2e2" : "#eaf0ff" }]}>
              <Ionicons name={confirmPopup.type === "success" ? "checkmark-circle" : confirmPopup.type === "error" ? "warning" : "help-circle"} size={30} color={confirmPopup.type === "success" ? "#10b981" : confirmPopup.type === "error" ? "#ef4444" : "#4f7cff"} />
            </View>
            <Text style={s.confirmTitle}>{confirmPopup.title}</Text>
            <Text style={s.confirmMessage}>{confirmPopup.message}</Text>
            {confirmPopup.type === "confirm" ? (
              <View style={s.confirmActionRow}>
                <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={s.confirmCancelBtnTxt}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={s.confirmSubmitBtn} onPress={() => { if (confirmPopup.onConfirm) confirmPopup.onConfirm(); setConfirmPopup({ ...confirmPopup, visible: false }); }}><Text style={s.confirmSubmitBtnTxt}>Đồng ý</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.confirmSingleBtn} onPress={() => setConfirmPopup({ ...confirmPopup, visible: false })}><Text style={s.confirmSingleBtnTxt}>Đóng</Text></TouchableOpacity>
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
  stickyTop: { backgroundColor: "#fff", zIndex: 10, elevation: 5, shadowColor: "#1f2a58", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", textAlign: "center" },
  headerSub: { fontSize: 11, color: "#94a8d8", textAlign: "center", marginTop: 1 },
  filterTabRow: { borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  catFilterRow: { borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  filterRowContent: { gap: 6, paddingHorizontal: 14, paddingVertical: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 16, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#f3f7ff", paddingHorizontal: 12, paddingVertical: 6, },
  filterActive: { backgroundColor: "#1f2a58", borderColor: "#1f2a58" },
  filterTxt: { color: "#7a8cc2", fontSize: 12, fontWeight: "700" },
  filterTxtActive: { color: "#fff" },
  badge: { backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
  catChip: { borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", backgroundColor: "#f3f7ff", paddingHorizontal: 10, paddingVertical: 5 },
  catActive: { backgroundColor: "#eaf0ff", borderColor: "#4f7cff" },
  catTxt: { color: "#7a8cc2", fontSize: 11, fontWeight: "600" },
  catTxtActive: { color: "#4f7cff" },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyTxt: { color: "#94a8d8", marginTop: 10, fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 13, marginBottom: 12, elevation: 2, shadowColor: "#4f7cff", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  catBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeTxt: { color: "#4f7cff", fontSize: 10, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  tourName: { color: "#1f2a58", fontWeight: "800", fontSize: 14, marginBottom: 7, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 100 },
  metaTxt: { color: "#7a8cc2", fontSize: 11, flexShrink: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0f4ff", },
  priceTxt: { fontSize: 14, fontWeight: "900", color: "#10b981" },
  smartBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smartBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 11 },
  expandSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f4ff" },
  infoBlock: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 7, borderWidth: 1, borderColor: "#e2e8f0" },
  infoBlockLabel: { color: "#94a8d8", fontSize: 10, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
  infoBlockValue: { color: "#1f2a58", fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 7, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  actionTxt: { fontSize: 12, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,18,50,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 36, height: 4, backgroundColor: "#e4ebff", borderRadius: 2, alignSelf: "center", marginTop: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f4ff", },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f7ff", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 18, paddingBottom: 36 },
  tourInfoStrip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#eaf0ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4, },
  tourInfoStripTxt: { color: "#4f7cff", fontSize: 12, fontWeight: "600", flex: 1 },
  formLabel: { fontSize: 14, color: "#1f2a58" },
  input: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 12, color: "#1f2a58", fontSize: 13, },
  saveBtn: { marginTop: 18, backgroundColor: "#4f7cff", borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, },
  saveBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
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