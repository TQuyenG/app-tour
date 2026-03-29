/**
 * app/admin-guide-requests.tsx
 * Admin xét duyệt yêu cầu đăng ký HDV và duyệt Hồ sơ/Bằng cấp
 * ĐÃ FIX LỖI: Thêm Xem ảnh phóng to (Full-screen)
 */
import { AdminTabBar } from "@/components/AdminTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminGuideRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "need_info" | "approved" | "rejected">("pending");
  const [detail, setDetail] = useState<any | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null); // Trạng thái xem ảnh phóng to
  
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectModal, setRejectModal] = useState(false);
  const [docRejectId, setDocRejectId] = useState("");

  const loadData = async () => {
    try {
      const [rawReqs, rawDocs, rawGuides, pRaw] = await Promise.all([
        AsyncStorage.getItem("@admin_guide_requests"),
        AsyncStorage.getItem("@guide_docs"),
        AsyncStorage.getItem("@app_guides"),
        AsyncStorage.getItem("@app_profile")
      ]);
      
      const fallbackProfile = pRaw ? JSON.parse(pRaw) : { name: "Khách hàng", email: "guest@gmail.com" };
      let parsedReqs = rawReqs ? JSON.parse(rawReqs) : [];
      const docs = rawDocs ? JSON.parse(rawDocs) : [];
      const guidesList = rawGuides ? JSON.parse(rawGuides) : [];

      parsedReqs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const uniqueReqsMap = new Map();
      for (const req of parsedReqs) {
        const identifier = req.email || req.guideName || req.name || fallbackProfile.email;
        if (!uniqueReqsMap.has(identifier)) {
          uniqueReqsMap.set(identifier, req);
        }
      }
      const uniqueReqs = Array.from(uniqueReqsMap.values());

      if (uniqueReqs.length === 0) {
        uniqueReqs.push({
          id: `req_${Date.now()}`, 
          guideName: fallbackProfile.name, 
          email: fallbackProfile.email, 
          status: "pending", 
          createdAt: new Date().toISOString()
        });
      }

      const enrichedReqs = uniqueReqs.map((r: any) => {
        const name = r.guideName || r.name || fallbackProfile.name || "Khách ẩn danh";
        const email = r.email || fallbackProfile.email || "Chưa có email";
        let baseStatus = r.status;
        
        const isAlreadyGuide = guidesList.some((g: any) => g.email === email || g.name === name || g.id === r.guideId);
        let computedStatus = baseStatus;

        if (isAlreadyGuide) {
          const hasMissingOrPendingDocs = docs.some((d: any) => d.status === 'not_uploaded' || d.status === 'pending' || d.status === 'rejected');
          if (hasMissingOrPendingDocs) computedStatus = 'need_info'; 
          else computedStatus = 'approved';  
        } else {
          if (baseStatus !== 'rejected') computedStatus = 'pending';
        }

        return { ...r, guideName: name, email, computedStatus };
      });

      setRequests(enrichedReqs);
      setUserDocs(docs);
    } catch (e) {
      console.log("Error loading admin requests:", e);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const openDetail = (req: any) => {
    setDetail(req);
  };

  const handleUpdateAppStatus = async (newStatus: "approved" | "rejected" | "need_info") => {
    const updated = requests.map(r => r.id === detail.id ? { ...r, status: newStatus } : r);
    await AsyncStorage.setItem("@admin_guide_requests", JSON.stringify(updated));

    if (newStatus === 'approved') {
      const rawGuides = await AsyncStorage.getItem("@app_guides");
      const guides = rawGuides ? JSON.parse(rawGuides) : [];
      const isExist = guides.some((g:any) => g.email === detail.email || g.name === detail.guideName);
      
      if (!isExist) {
        guides.push({
          id: `g_${Date.now()}`,
          name: detail.guideName,
          email: detail.email,
          rating: 5.0, tours: 0, status: 'active',
          vneidVerified: false, isLocal: false
        });
        await AsyncStorage.setItem("@app_guides", JSON.stringify(guides));
      }
    }

    setDetail(null);
    Alert.alert("Thành công", `Đã cập nhật trạng thái hồ sơ của ${detail.guideName}.`);
    loadData(); 
  };

  const handleApproveDoc = async (docId: string) => {
    const newDocs = userDocs.map(d => d.id === docId ? {...d, status: 'approved', rejectReason: ""} : d);
    setUserDocs(newDocs);
    await AsyncStorage.setItem('@guide_docs', JSON.stringify(newDocs));
    
    const pRaw = await AsyncStorage.getItem('@guide_profile');
    const profile = pRaw ? JSON.parse(pRaw) : {};
    if (docId === 'vneid') profile.vneidVerified = true;
    if (docId === 'local') profile.isLocal = true;
    if (docId === 'education') profile.education = newDocs.find(d=>d.id===docId)?.value;
    if (docId === 'cert') profile.certifications = newDocs.find(d=>d.id===docId)?.value;
    await AsyncStorage.setItem('@guide_profile', JSON.stringify(profile));

    loadData(); 
  };

  const handleRejectDocSubmit = async () => {
    const newDocs = userDocs.map(d => d.id === docRejectId ? {...d, status: 'rejected', rejectReason: rejectNote} : d);
    setUserDocs(newDocs);
    await AsyncStorage.setItem('@guide_docs', JSON.stringify(newDocs));
    setRejectModal(false); setRejectNote(""); setDocRejectId("");
    loadData();
  };

  const filteredReqs = requests.filter(r => r.computedStatus === filter);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.title}>Phê duyệt Hướng dẫn viên</Text>
      </View>

      <View style={s.tabContainer}>
        {[{k: 'pending', l: 'Chờ duyệt'}, {k: 'need_info', l: 'Cần bổ sung'}, {k: 'approved', l: 'Đã duyệt'}, {k: 'rejected', l: 'Từ chối'}].map(t => (
          <TouchableOpacity key={t.k} style={[s.tabItem, filter === t.k && s.tabActive]} onPress={() => setFilter(t.k as any)}>
            <Text style={[s.tabTxt, filter === t.k && s.tabTxtActive]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {filteredReqs.map(req => (
          <TouchableOpacity key={req.id} style={s.card} onPress={() => openDetail(req)}>
            <View style={s.cardHeader}>
              <View style={s.avatar}><Text style={s.avatarTxt}>{req.guideName?.charAt(0).toUpperCase() || 'U'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{req.guideName}</Text>
                <Text style={s.date}>{req.email} · {new Date(req.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))}
        {filteredReqs.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
            <Text style={s.emptyTxt}>Không có hồ sơ nào trong mục này.</Text>
          </View>
        )}
      </ScrollView>

      {/* CHI TIẾT & DUYỆT HỒ SƠ TỪNG TÀI LIỆU */}
      <Modal visible={!!detail} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.sheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chi tiết Hồ sơ xét duyệt</Text>
              <TouchableOpacity onPress={() => setDetail(null)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.infoName}>{detail?.guideName}</Text>
              <Text style={s.infoEmail}>{detail?.email}</Text>

              <Text style={s.sectionLabel}>CHI TIẾT CÁC GIẤY TỜ ĐÃ NỘP</Text>
              {userDocs.length === 0 && <Text style={{color: '#64748b'}}>Ứng viên chưa nộp giấy tờ nào.</Text>}
              
              {userDocs.map(doc => (
                <View key={doc.id} style={s.docItem}>
                   <View style={s.docHeader}>
                     <View style={{flex: 1}}>
                       <Text style={s.docName}>{doc.name}</Text>
                       {doc.value ? <Text style={s.docValue}>{doc.value}</Text> : null}
                       <Text style={[s.docStatus, {color: doc.status==='approved'?'#10b981':doc.status==='rejected'?'#ef4444':'#f59e0b'}]}>
                         Trạng thái: {doc.status==='approved'?'Đã duyệt':doc.status==='rejected'?'Bị từ chối':'Chờ xét duyệt'}
                       </Text>
                     </View>
                     {doc.status === 'pending' && (
                       <View style={{flexDirection: 'row', gap: 6}}>
                         <TouchableOpacity style={s.rejectDocBtn} onPress={() => {setDocRejectId(doc.id); setRejectModal(true);}}><Ionicons name="close" size={18} color="#ef4444"/></TouchableOpacity>
                         <TouchableOpacity style={s.approveDocBtn} onPress={() => handleApproveDoc(doc.id)}><Ionicons name="checkmark" size={18} color="#10b981"/></TouchableOpacity>
                       </View>
                     )}
                   </View>

                   {/* Hiển thị Hình ảnh (Có thể click để xem Phóng to) */}
                   {doc.files && doc.files.length > 0 && (
                     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.docImagesRow}>
                        {doc.files.map((fileUrl: string, idx: number) => (
                          <TouchableOpacity key={idx} onPress={() => setPreviewImg(fileUrl)}>
                             <Image source={{ uri: fileUrl }} style={s.docProofImg} />
                          </TouchableOpacity>
                        ))}
                     </ScrollView>
                   )}
                </View>
              ))}

              <View style={s.actionRow}>
                <TouchableOpacity style={[s.btn, {backgroundColor: '#fef2f2'}]} onPress={() => handleUpdateAppStatus('rejected')}>
                   <Text style={[s.btnTxt, {color:'#ef4444'}]}>Từ chối toàn bộ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, {backgroundColor: '#fffbeb'}]} onPress={() => handleUpdateAppStatus('need_info')}>
                   <Text style={[s.btnTxt, {color:'#d97706'}]}>Yêu cầu bổ sung</Text>
                </TouchableOpacity>
              </View>
              
              {detail?.computedStatus === 'pending' && (
                <TouchableOpacity style={[s.btn, {backgroundColor: '#4f7cff', marginTop: 10}]} onPress={() => handleUpdateAppStatus('approved')}>
                   <Text style={s.btnTxt}>Phê duyệt Quyền HDV</Text>
                </TouchableOpacity>
              )}
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL NHẬP LÝ DO TỪ CHỐI GIẤY TỜ */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Lý do từ chối tài liệu</Text>
            <TextInput style={s.input} placeholder="VD: Ảnh mờ, bằng cấp không hợp lệ. Vui lòng chụp lại." value={rejectNote} onChangeText={setRejectNote} multiline autoFocus />
            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setRejectModal(false)}><Text style={{color:'#64748b', fontWeight:'700'}}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirmSubmitBtn, {backgroundColor: '#ef4444'}]} onPress={handleRejectDocSubmit}><Text style={{color:'#fff', fontWeight:'800'}}>Xác nhận Từ chối</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POPUP XEM ẢNH PHÓNG TO CHO ADMIN */}
      <Modal visible={!!previewImg} transparent animationType="fade">
         <View style={s.fullScreenImgContainer}>
            <TouchableOpacity style={s.closeImgBtn} onPress={() => setPreviewImg(null)}>
               <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {previewImg && <Image source={{ uri: previewImg }} style={s.fullScreenImg} resizeMode="contain" />}
         </View>
      </Modal>

      <AdminTabBar activeRoute="admin-guide-requests" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "900", color: "#1f2a58" },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#4f7cff' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTxtActive: { color: '#4f7cff' },
  content: { padding: 16, paddingBottom: 100 },
  
  emptyBox: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTxt: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#4f7cff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '800', color: '#1f2a58', marginBottom: 4 },
  date: { fontSize: 12, color: '#64748b' },
  
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,18,50,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1f2a58' },
  modalBody: { padding: 20 },
  infoName: { fontSize: 20, fontWeight: '900', color: '#1f2a58' },
  infoEmail: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#94a8d8', marginBottom: 10 },
  
  docItem: { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, overflow: 'hidden' },
  docHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, backgroundColor: '#fff' },
  docName: { fontSize: 14, fontWeight: '800', color: '#1f2a58' },
  docValue: { fontSize: 13, color: '#4f7cff', fontWeight: '700', marginTop: 4 },
  docStatus: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  
  docImagesRow: { padding: 14, gap: 10, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row' },
  docProofImg: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },

  rejectDocBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 10 },
  approveDocBtn: { padding: 10, backgroundColor: '#dcfce7', borderRadius: 10 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { backgroundColor: "#fff", width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, elevation: 10 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginBottom: 12 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  confirmSubmitBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  fullScreenImgContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: 'center', alignItems: 'center' },
  closeImgBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullScreenImg: { width: '100%', height: '80%' }
});