/**
 * app/guide-onboarding.tsx
 * Hồ sơ HDV & Upload giấy phép kinh doanh
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTabBar } from "@/components/AdminTabBar";

type DocStatus = "not_uploaded" | "pending" | "approved" | "rejected";

interface Document {
  id: string; name: string; desc: string;
  required: boolean; status: DocStatus;
  uploadedAt?: string; note?: string; icon: string;
}

interface OnboardingStep {
  id: string; title: string; desc: string;
  done: boolean; icon: string; color: string;
  route?: string;
}

const STATUS_META: Record<DocStatus, { label: string; color: string; bg: string; icon: string }> = {
  not_uploaded: { label: "Chưa nộp",    color: "#94a3b8", bg: "#f1f5f9", icon: "cloud-upload-outline" },
  pending:      { label: "Đang duyệt", color: "#d97706", bg: "#fef9c3", icon: "time-outline" },
  approved:     { label: "Đã duyệt",   color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  rejected:     { label: "Từ chối",    color: "#dc2626", bg: "#fee2e2", icon: "close-circle-outline" },
};

const SEED_DOCS: Document[] = [
  { id: "d1", name: "Thẻ Hướng dẫn viên",        desc: "Thẻ HDV do Tổng cục Du lịch cấp (bắt buộc)",          required: true,  status: "approved",     uploadedAt: "10/01/2026", icon: "card-outline" },
  { id: "d2", name: "CCCD / Hộ chiếu",            desc: "Giấy tờ tùy thân còn hiệu lực",                      required: true,  status: "approved",     uploadedAt: "10/01/2026", icon: "person-outline" },
  { id: "d3", name: "Ảnh chân dung",               desc: "Ảnh chuyên nghiệp nền trắng, rõ mặt",                required: true,  status: "approved",     uploadedAt: "10/01/2026", icon: "camera-outline" },
  { id: "d4", name: "Chứng chỉ nghiệp vụ",        desc: "Chứng chỉ HDV quốc gia hoặc quốc tế",               required: true,  status: "pending",      uploadedAt: "12/04/2026", note: "Đang xác minh với Tổng cục Du lịch.", icon: "document-text-outline" },
  { id: "d5", name: "Chứng chỉ ngoại ngữ",        desc: "IELTS, TOEFL hoặc tương đương (nếu có)",             required: false, status: "approved",     uploadedAt: "10/01/2026", icon: "language-outline" },
  { id: "d6", name: "Chứng chỉ sơ cấp cứu",      desc: "Bắt buộc cho tour trekking, leo núi",                required: false, status: "not_uploaded",  icon: "medkit-outline" },
  { id: "d7", name: "Bằng lái xe",                 desc: "Hạng B2 trở lên (nếu tự lái xe đưa đón khách)",    required: false, status: "approved",     uploadedAt: "10/01/2026", icon: "car-outline" },
  { id: "d8", name: "Giấy phép kinh doanh",       desc: "Nếu hoạt động dưới dạng doanh nghiệp/hộ cá thể",   required: false, status: "not_uploaded",  icon: "business-outline" },
  { id: "d9", name: "Bảo hiểm trách nhiệm",       desc: "Bảo hiểm dành cho HDV chuyên nghiệp",               required: false, status: "pending",      uploadedAt: "11/04/2026", icon: "shield-outline" },
];

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "s1", title: "Tạo tài khoản",          desc: "Đăng ký thành công",                    done: true,  icon: "person-add-outline",          color: "#16a34a" },
  { id: "s2", title: "Hoàn thiện hồ sơ",       desc: "Điền đầy đủ thông tin HDV",             done: true,  icon: "create-outline",              color: "#16a34a", route: "/guide-profile" },
  { id: "s3", title: "Nộp giấy tờ",            desc: "Upload đầy đủ tài liệu bắt buộc",      done: false, icon: "document-attach-outline",     color: "#d97706" },
  { id: "s4", title: "Xác minh eKYC",          desc: "Xác thực danh tính qua AI",             done: true,  icon: "shield-checkmark-outline",    color: "#16a34a", route: "/guest_kyc" },
  { id: "s5", title: "Admin phê duyệt",         desc: "Tài khoản đang chờ xét duyệt",         done: false, icon: "checkmark-done-outline",      color: "#d97706" },
  { id: "s6", title: "Hoàn tất onboarding",    desc: "Bắt đầu nhận tour và kiếm thu nhập",   done: false, icon: "rocket-outline",              color: "#94a3b8" },
];

export default function GuideOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [docs, setDocs]   = useState<Document[]>([]);
  const [tab, setTab]     = useState<"steps" | "docs">("steps");

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@guide_docs").then(raw => {
      setDocs(raw ? JSON.parse(raw) : SEED_DOCS);
    }).catch(() => setDocs(SEED_DOCS));
  }, []));

  const uploadDoc = async (doc: Document) => {
    Alert.alert(
      `Upload: ${doc.name}`,
      `Bạn muốn nộp "${doc.name}"?\n\nTrong app thực tế sẽ mở camera/thư viện ảnh. Demo này sẽ chuyển sang trạng thái "Đang duyệt".`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Nộp ngay", onPress: async () => {
            const updated = docs.map(d => d.id === doc.id ? { ...d, status: "pending" as DocStatus, uploadedAt: new Date().toLocaleDateString("vi-VN") } : d);
            setDocs(updated);
            await AsyncStorage.setItem("@guide_docs", JSON.stringify(updated)).catch(() => {});
            Alert.alert("✅ Đã nộp!", `"${doc.name}" đang được Admin xét duyệt.`);
          },
        },
      ]
    );
  };

  const approvedCount = docs.filter(d => d.status === "approved").length;
  const pendingCount  = docs.filter(d => d.status === "pending").length;
  const missingReq    = docs.filter(d => d.required && d.status === "not_uploaded").length;
  const completePct   = Math.round((ONBOARDING_STEPS.filter(s => s.done).length / ONBOARDING_STEPS.length) * 100);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#1f2a58" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Hồ sơ & Giấy phép</Text>
        {missingReq > 0 && (
          <View style={s.alertBadge}>
            <Text style={s.alertBadgeTxt}>{missingReq} cần nộp</Text>
          </View>
        )}
      </View>

      {/* Progress Hero */}
      <View style={s.progressHero}>
        <View style={s.progressLeft}>
          <Text style={s.progressTitle}>Tiến độ onboarding</Text>
          <Text style={s.progressPct}>{completePct}% hoàn thành</Text>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${completePct}%` as any }]} />
          </View>
          <Text style={s.progressSub}>
            {completePct === 100 ? "🎉 Hoàn tất! Bạn có thể nhận tour" : "Hoàn thiện để nhận tour và kiếm thu nhập"}
          </Text>
        </View>
        <View style={s.progressCircle}>
          <Text style={s.progressCircleTxt}>{completePct}%</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === "steps" && s.tabBtnActive]} onPress={() => setTab("steps")}>
          <Text style={[s.tabBtnTxt, tab === "steps" && s.tabBtnTxtActive]}>Các bước</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === "docs" && s.tabBtnActive]} onPress={() => setTab("docs")}>
          <Text style={[s.tabBtnTxt, tab === "docs" && s.tabBtnTxtActive]}>Giấy tờ ({docs.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 90 }]}>
        {tab === "steps" && (
          <>
            <View style={s.docSummary}>
              {[
                { label: "Đã duyệt",    value: approvedCount, color: "#16a34a", bg: "#dcfce7" },
                { label: "Đang duyệt", value: pendingCount,  color: "#d97706", bg: "#fef9c3" },
                { label: "Còn thiếu",  value: docs.filter(d=>d.status==="not_uploaded").length, color: "#94a3b8", bg: "#f1f5f9" },
              ].map((item, i) => (
                <View key={i} style={[s.docSumItem, { backgroundColor: item.bg }]}>
                  <Text style={[s.docSumValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.docSumLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            {ONBOARDING_STEPS.map((step, i) => (
              <TouchableOpacity
                key={step.id}
                style={[s.stepCard, step.done && s.stepCardDone]}
                onPress={() => step.route ? router.push(step.route as any) : null}
                activeOpacity={step.route ? 0.8 : 1}
              >
                <View style={s.stepLeft}>
                  <View style={[s.stepNum, step.done && { backgroundColor: "#10b981" }]}>
                    {step.done
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={s.stepNumTxt}>{i + 1}</Text>
                    }
                  </View>
                  {i < ONBOARDING_STEPS.length - 1 && <View style={[s.stepLine, step.done && s.stepLineDone]} />}
                </View>
                <View style={s.stepContent}>
                  <View style={[s.stepIcon, { backgroundColor: step.color + "18" }]}>
                    <Ionicons name={step.icon as any} size={18} color={step.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepDesc}>{step.desc}</Text>
                  </View>
                  {!step.done && step.route && <Ionicons name="chevron-forward" size={16} color="#c0cbe8" />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === "docs" && (
          <>
            {missingReq > 0 && (
              <View style={s.warningBox}>
                <Ionicons name="warning-outline" size={16} color="#d97706" />
                <Text style={s.warningTxt}>Còn {missingReq} giấy tờ bắt buộc chưa nộp. Vui lòng bổ sung để hoàn tất hồ sơ.</Text>
              </View>
            )}
            <Text style={s.sectionTitle}>📋 Bắt buộc</Text>
            {docs.filter(d => d.required).map(doc => {
              const meta = STATUS_META[doc.status];
              return (
                <View key={doc.id} style={s.docCard}>
                  <View style={[s.docIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={doc.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.docTopRow}>
                      <Text style={s.docName}>{doc.name}</Text>
                      <View style={[s.docBadge, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                        <Text style={[s.docBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={s.docDesc}>{doc.desc}</Text>
                    {doc.uploadedAt && <Text style={s.docDate}>Nộp: {doc.uploadedAt}</Text>}
                    {doc.note && (
                      <View style={s.docNote}>
                        <Ionicons name="information-circle-outline" size={12} color="#d97706" />
                        <Text style={s.docNoteTxt}>{doc.note}</Text>
                      </View>
                    )}
                  </View>
                  {(doc.status === "not_uploaded" || doc.status === "rejected") && (
                    <TouchableOpacity style={s.uploadBtn} onPress={() => uploadDoc(doc)}>
                      <Ionicons name="cloud-upload-outline" size={16} color="#10b981" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <Text style={[s.sectionTitle, { marginTop: 10 }]}>📎 Bổ sung (không bắt buộc)</Text>
            {docs.filter(d => !d.required).map(doc => {
              const meta = STATUS_META[doc.status];
              return (
                <View key={doc.id} style={[s.docCard, { opacity: doc.status === "not_uploaded" ? 0.7 : 1 }]}>
                  <View style={[s.docIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={doc.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.docTopRow}>
                      <Text style={s.docName}>{doc.name}</Text>
                      <View style={[s.docBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[s.docBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={s.docDesc}>{doc.desc}</Text>
                    {doc.uploadedAt && <Text style={s.docDate}>Nộp: {doc.uploadedAt}</Text>}
                  </View>
                  {doc.status === "not_uploaded" && (
                    <TouchableOpacity style={s.uploadBtn} onPress={() => uploadDoc(doc)}>
                      <Ionicons name="cloud-upload-outline" size={16} color="#10b981" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
      <AdminTabBar role="guide" activeRoute="/guide-onboarding" />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: "#f3f7ff" },
  topBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e4ebff", gap: 10 },
  iconBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "#edf2ff", alignItems: "center", justifyContent: "center" },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: "800", color: "#1f2a58" },
  alertBadge:      { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  alertBadgeTxt:   { color: "#dc2626", fontWeight: "800", fontSize: 12 },
  progressHero:    { flexDirection: "row", alignItems: "center", backgroundColor: "#10b981", margin: 14, borderRadius: 20, padding: 18, gap: 16 },
  progressLeft:    { flex: 1, gap: 6 },
  progressTitle:   { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  progressPct:     { color: "#fff", fontSize: 22, fontWeight: "900" },
  progressBg:      { height: 6, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  progressSub:     { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  progressCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  progressCircleTxt:{ color: "#fff", fontSize: 18, fontWeight: "900" },
  tabRow:          { flexDirection: "row", marginHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#e4ebff", marginBottom: 4 },
  tabBtn:          { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive:    { backgroundColor: "#10b981" },
  tabBtnTxt:       { color: "#7a8cc2", fontWeight: "600", fontSize: 13 },
  tabBtnTxtActive: { color: "#fff" },
  content:         { padding: 14, paddingTop: 8 },
  docSummary:      { flexDirection: "row", gap: 8, marginBottom: 14 },
  docSumItem:      { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", gap: 3 },
  docSumValue:     { fontSize: 20, fontWeight: "900" },
  docSumLabel:     { color: "#7a8cc2", fontSize: 10, fontWeight: "600" },
  stepCard:        { flexDirection: "row", gap: 12, marginBottom: 4 },
  stepCardDone:    {},
  stepLeft:        { alignItems: "center", width: 32 },
  stepNum:         { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e4ebff", alignItems: "center", justifyContent: "center" },
  stepNumTxt:      { color: "#7a8cc2", fontWeight: "800", fontSize: 12 },
  stepLine:        { width: 2, flex: 1, backgroundColor: "#e4ebff", marginVertical: 4 },
  stepLineDone:    { backgroundColor: "#10b981" },
  stepContent:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  stepIcon:        { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepTitle:       { color: "#1f2a58", fontWeight: "700", fontSize: 13 },
  stepDesc:        { color: "#7a8cc2", fontSize: 11, marginTop: 2 },
  warningBox:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fef9c3", borderRadius: 12, padding: 12, marginBottom: 12 },
  warningTxt:      { flex: 1, color: "#92400e", fontSize: 12, lineHeight: 18 },
  sectionTitle:    { color: "#1f2a58", fontWeight: "700", fontSize: 14, marginBottom: 8 },
  docCard:         { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e4ebff", padding: 12, marginBottom: 8 },
  docIcon:         { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  docTopRow:       { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  docName:         { color: "#1f2a58", fontWeight: "700", fontSize: 13, flex: 1 },
  docBadge:        { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  docBadgeTxt:     { fontSize: 10, fontWeight: "700" },
  docDesc:         { color: "#7a8cc2", fontSize: 11, lineHeight: 16, marginBottom: 3 },
  docDate:         { color: "#94a3b8", fontSize: 10 },
  docNote:         { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 4 },
  docNoteTxt:      { flex: 1, color: "#d97706", fontSize: 11 },
  uploadBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#dcfce7" },
});