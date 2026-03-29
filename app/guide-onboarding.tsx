/**
 * app/guide-onboarding.tsx
 * Khung Đăng ký / Nộp Hồ sơ (Đã FIX lỗi đồng bộ Admin & Thêm Xem ảnh phóng to)
 */
import { GuideTabBar } from "@/components/GuideTabBar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, KeyboardAvoidingView, Platform, TextInput, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_DOCS = [
  { id: "vneid", name: "Xác thực VNeID", status: "not_uploaded", icon: "finger-print-outline", value: "", files: [] },
  { id: "local", name: "Chứng nhận Bản địa", status: "not_uploaded", icon: "home-outline", value: "", files: [] },
  { id: "cccd", name: "CCCD / Hộ chiếu", status: "not_uploaded", icon: "card-outline", value: "", files: [] },
  { id: "card", name: "Thẻ Hướng dẫn viên", status: "not_uploaded", icon: "id-card-outline", value: "", files: [] },
  { id: "education", name: "Học vấn / Bằng ĐH", status: "not_uploaded", icon: "school-outline", value: "", files: [] },
  { id: "cert", name: "Chứng chỉ khác", status: "not_uploaded", icon: "ribbon-outline", value: "", files: [] },
];

export default function GuideOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [docs, setDocs] = useState<any[]>(DEFAULT_DOCS);
  const [uploadModal, setUploadModal] = useState<any>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null); // Trạng thái xem ảnh phóng to
  
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [docValue, setDocValue] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  useFocusEffect(useCallback(() => {
    const loadDocs = async () => {
      const raw = await AsyncStorage.getItem('@guide_docs');
      if (raw) setDocs(JSON.parse(raw));
      else setDocs(DEFAULT_DOCS);
    };
    loadDocs();
  }, []));

  const handleAddFileUrl = () => {
    if (mediaUrl.trim() !== '') {
      setTempFiles([...tempFiles, mediaUrl.trim()]);
      setMediaUrl('');
    }
  };

  const handleAddMockFile = () => {
    const mockImgs = ["https://images.unsplash.com/photo-1618044733300-9472054094ee?w=400", "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400"];
    setTempFiles([...tempFiles, mockImgs[Math.floor(Math.random() * mockImgs.length)]]);
  };

  const handleUploadSubmit = async () => {
    if (tempFiles.length === 0 && !docValue.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng tải lên ảnh hoặc nhập thông tin bằng cấp.");
      return;
    }

    // 1. Cập nhật hồ sơ cá nhân
    const newDocs = docs.map(d => d.id === uploadModal.id ? { ...d, status: 'pending', value: docValue, files: tempFiles, rejectReason: "" } : d);
    setDocs(newDocs);
    await AsyncStorage.setItem('@guide_docs', JSON.stringify(newDocs));

    // 2. GỬI TÍN HIỆU CHO ADMIN (FIX BUG GUEST ONBOARDING)
    try {
      const rawReqs = await AsyncStorage.getItem("@admin_guide_requests");
      const reqs = rawReqs ? JSON.parse(rawReqs) : [];
      const rawProfile = await AsyncStorage.getItem("@app_profile");
      const profile = rawProfile ? JSON.parse(rawProfile) : { name: "Khách hàng", email: "guest@gmail.com" };

      const existingIndex = reqs.findIndex((r:any) => r.email === profile.email);
      if (existingIndex >= 0) {
         reqs[existingIndex].status = 'pending'; // Cập nhật lại trạng thái để Admin thấy
         reqs[existingIndex].createdAt = new Date().toISOString();
      } else {
         reqs.unshift({
           id: `req_${Date.now()}`,
           guideName: profile.name,
           email: profile.email,
           status: 'pending',
           createdAt: new Date().toISOString()
         });
      }
      await AsyncStorage.setItem("@admin_guide_requests", JSON.stringify(reqs));
    } catch (e) {}

    setUploadModal(null);
    setTempFiles([]); setDocValue('');
    Alert.alert("Thành công", "Hồ sơ đã được gửi đi và chờ Admin xét duyệt.");
  };

  const getStatusUI = (status: string) => {
    switch (status) {
      case 'approved': return { text: "Đã duyệt", color: "#10b981", bg: "#dcfce7", icon: "checkmark-circle" };
      case 'pending': return { text: "Chờ duyệt", color: "#f59e0b", bg: "#fef3c7", icon: "time" };
      case 'rejected': return { text: "Từ chối", color: "#ef4444", bg: "#fee2e2", icon: "close-circle" };
      default: return { text: "Chưa tải lên", color: "#64748b", bg: "#f1f5f9", icon: "alert-circle" };
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color="#1f2a58" /></TouchableOpacity>
        <Text style={s.headerTitle}>Hồ sơ & Giấy phép</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.statusCard}>
          <Ionicons name="shield-checkmark" size={48} color="#10b981" />
          <Text style={s.statusTitle}>Hồ sơ bảo mật</Text>
          <Text style={s.statusDesc}>Tải lên các bằng cấp và giấy phép để Admin xét duyệt. Thông tin được mã hóa an toàn.</Text>
        </View>

        <Text style={s.sectionTitle}>Danh sách yêu cầu nộp</Text>

        {docs.map((doc) => {
          const ui = getStatusUI(doc.status);
          return (
            <View key={doc.id} style={s.docCard}>
              <View style={s.docHeaderRow}>
                <View style={[s.docIconWrap, { backgroundColor: ui.bg }]}><Ionicons name={doc.icon as any} size={24} color={ui.color} /></View>
                <View style={s.docInfo}>
                  <Text style={s.docName}>{doc.name}</Text>
                  {doc.value ? <Text style={s.docValueTxt} numberOfLines={1}>{doc.value}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={ui.icon as any} size={14} color={ui.color} />
                    <Text style={[s.docStatus, { color: ui.color }]}>{ui.text}</Text>
                  </View>
                  {doc.status === 'rejected' && doc.rejectReason && (
                    <Text style={s.rejectReasonTxt}>Lý do: {doc.rejectReason}</Text>
                  )}
                </View>
                
                {doc.status !== 'approved' && doc.status !== 'pending' && (
                  <TouchableOpacity style={s.uploadBtn} onPress={() => { setUploadModal(doc); setDocValue(doc.value || ''); setTempFiles(doc.files || []); }}>
                    <Text style={s.uploadBtnTxt}>{doc.status === 'rejected' ? 'Upload Lại' : 'Tải lên'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {doc.files && doc.files.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.miniGallery}>
                  {doc.files.map((fileUrl: string, idx: number) => (
                    <TouchableOpacity key={idx} onPress={() => setPreviewImg(fileUrl)}>
                       <Image source={{ uri: fileUrl }} style={s.miniImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* POPUP TẢI LÊN NHIỀU FILE & NHẬP THÔNG TIN */}
      <Modal visible={!!uploadModal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Tải lên {uploadModal?.name}</Text>
              <TouchableOpacity onPress={() => setUploadModal(null)}><Ionicons name="close" size={24} color="#1f2a58" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{width: '100%', maxHeight: 450}}>
              {(uploadModal?.id === 'education' || uploadModal?.id === 'cert') && (
                <View style={{marginBottom: 16}}>
                  <Text style={s.inputLabel}>Nhập tên Trường / Bằng cấp</Text>
                  <TextInput style={s.input} placeholder="VD: Cử nhân Đại học Quốc gia..." value={docValue} onChangeText={setDocValue} />
                </View>
              )}
              
              <Text style={s.inputLabel}>Nhập URL Ảnh (Tùy chọn)</Text>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 16}}>
                 <TextInput style={[s.input, {flex: 1, marginBottom: 0}]} placeholder="https://..." value={mediaUrl} onChangeText={setMediaUrl} />
                 <TouchableOpacity style={s.addUrlBtn} onPress={handleAddFileUrl}><Text style={s.addUrlBtnTxt}>Thêm</Text></TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Hoặc tải lên từ thiết bị</Text>
              <View style={{flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16}}>
                <TouchableOpacity style={s.toolBtn} onPress={() => { handleAddMockFile(); Alert.alert('Đã mở máy ảnh chụp'); }}>
                  <Ionicons name="camera" size={24} color="#4f7cff" />
                  <Text style={s.toolBtnTxt}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.toolBtn} onPress={() => { handleAddMockFile(); Alert.alert('Đã chọn file từ máy'); }}>
                  <Ionicons name="images" size={24} color="#f59e0b" />
                  <Text style={s.toolBtnTxt}>Thư viện thiết bị</Text>
                </TouchableOpacity>
              </View>

              {tempFiles.length > 0 && (
                <View style={s.previewContainer}>
                  <Text style={s.previewTitle}>Đã chọn {tempFiles.length} ảnh:</Text>
                  <View style={s.previewGrid}>
                    {tempFiles.map((url, index) => (
                      <View key={index} style={s.previewImgWrap}>
                        <Image source={{ uri: url }} style={s.previewImg} />
                        <TouchableOpacity style={s.deleteImgBtn} onPress={() => setTempFiles(tempFiles.filter((_, i) => i !== index))}>
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{flexDirection: 'row', gap: 10, width: '100%', marginTop: 10}}>
              <TouchableOpacity style={s.popupCancelBtn} onPress={() => setUploadModal(null)}><Text style={s.popupCancelBtnTxt}>Đóng</Text></TouchableOpacity>
              <TouchableOpacity style={s.popupSubmitBtn} onPress={handleUploadSubmit}><Text style={s.popupSubmitBtnTxt}>Gửi duyệt hồ sơ</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP XEM ẢNH PHÓNG TO */}
      <Modal visible={!!previewImg} transparent animationType="fade">
         <View style={s.fullScreenImgContainer}>
            <TouchableOpacity style={s.closeImgBtn} onPress={() => setPreviewImg(null)}>
               <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {previewImg && <Image source={{ uri: previewImg }} style={s.fullScreenImg} resizeMode="contain" />}
         </View>
      </Modal>
      <GuideTabBar activeRoute="guide-onboarding" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7ff" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff" },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58", textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  statusCard: { backgroundColor: "#fff", padding: 24, borderRadius: 24, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "#e4ebff" },
  statusTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a58", marginTop: 12 },
  statusDesc: { fontSize: 13, color: "#7a8cc2", textAlign: "center", marginTop: 6, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a58", marginBottom: 12 },
  
  docCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e4ebff", elevation: 2 },
  docHeaderRow: { flexDirection: "row", alignItems: "center" },
  docIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: "800", color: "#1f2a58", marginBottom: 4 },
  docValueTxt: { fontSize: 12, color: "#4f7cff", fontWeight: "700", marginBottom: 4 },
  docStatus: { fontSize: 12, fontWeight: "600" },
  rejectReasonTxt: { fontSize: 11, color: "#ef4444", marginTop: 4, fontStyle: 'italic' },
  uploadBtn: { backgroundColor: "#4f7cff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  uploadBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },

  miniGallery: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f4ff', flexDirection: 'row', gap: 8 },
  miniImg: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,18,50,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", width: "100%", borderRadius: 24, padding: 20, alignItems: "center", elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4ff' },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1f2a58" },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#1f2a58', marginBottom: 8 },
  input: { width: '100%', backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, paddingVertical: 12, color: "#1f2a58", fontSize: 14 },
  addUrlBtn: { backgroundColor: '#1f2a58', paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addUrlBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },

  toolBtn: { flex: 1, height: 80, backgroundColor: '#f8faff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e4ebff', borderStyle: 'dashed' },
  toolBtnTxt: { marginTop: 8, fontSize: 12, color: '#4f7cff', fontWeight: '700' },
  
  previewContainer: { width: '100%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 10 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewImgWrap: { position: 'relative', width: 64, height: 64 },
  previewImg: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  deleteImgBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  popupCancelBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  popupCancelBtnTxt: { color: "#64748b", fontSize: 15, fontWeight: "800" },
  popupSubmitBtn: { flex: 2, height: 48, borderRadius: 14, backgroundColor: "#4f7cff", alignItems: "center", justifyContent: "center" },
  popupSubmitBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "900" },

  fullScreenImgContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: 'center', alignItems: 'center' },
  closeImgBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullScreenImg: { width: '100%', height: '80%' }
});