/**
 * guest_kyc.tsx
 * Gộp từ: ekyc.tsx + biometric-confirm.tsx
 * Step 0: eKYC (upload CCCD + selfie)
 * Step 1: BiometricConfirm (face scan result)
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────
// Shared data
// ─────────────────────────────────────────
const KYC_STEPS = [
  { icon: 'card-outline' as const,           label: 'Tải ảnh CCCD / Passport',       desc: 'Chụp mặt trước và mặt sau thẻ' },
  { icon: 'scan-circle-outline' as const,    label: 'Trích xuất thông tin (OCR)',     desc: 'AI tự động đọc họ tên, số ID, ngày sinh' },
  { icon: 'person-circle-outline' as const,  label: 'Selfie xác thực khuôn mặt',     desc: 'So khớp khuôn mặt với ảnh CCCD (ArcFace)' },
  { icon: 'eye-outline' as const,            label: 'Liveness Detection',            desc: 'Chống giả mạo – phân tích cử động mắt/miệng' },
];

const BIO_CHECKS = [
  { label: 'Nhận diện khuôn mặt',        status: 'Đã quét' },
  { label: 'Kiểm tra chống giả mạo',     status: 'An toàn' },
  { label: 'Đối chiếu hồ sơ eKYC/VNeID', status: 'Khớp dữ liệu' },
];

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────
export default function GuestKYCScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([0, 1]);

  const runOCR = () => {
    setDoneSteps(prev => [...new Set([...prev, 2])]);
    Alert.alert('Mock API', 'OCR trích xuất thông tin thành công!');
  };

  const runFaceMatch = () => {
    setDoneSteps(prev => [...new Set([...prev, 3])]);
    Alert.alert('Mock API', 'Face Matching & Liveness Detection thành công!\nMatch Score: 97%');
  };

  return (
    <ScrollView
      style={st.screen}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 32 }]}>

      {/* Back */}
      <TouchableOpacity style={st.backRow} onPress={() => step === 1 ? setStep(0) : router.back()}>
        <Ionicons name="arrow-back" size={20} color="#4f7cff" />
        <Text style={st.backText}>{step === 1 ? 'Quay lại eKYC' : 'Quay lại'}</Text>
      </TouchableOpacity>

      {/* Progress pill */}
      <View style={st.progressRow}>
        {[0, 1].map(i => (
          <View key={i} style={[st.progressDot, step === i && st.progressDotActive, step > i && st.progressDotDone]} />
        ))}
        <Text style={st.progressLabel}>Bước {step + 1} / 2</Text>
      </View>

      {/* ── STEP 0: eKYC ── */}
      {step === 0 && (
        <>
          <Text style={st.title}>Xác thực danh tính</Text>
          <Text style={st.subtitle}>eKYC – Định danh điện tử bảo vệ cả bạn và hướng dẫn viên</Text>

          <View style={st.aiBadge}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="#4f7cff" />
            <Text style={st.aiBadgeText}>Bảo mật bởi AI · Face Matching · Liveness Detection</Text>
          </View>

          {KYC_STEPS.map((s, i) => {
            const done = doneSteps.includes(i);
            return (
              <View key={i} style={[st.stepCard, done && st.stepDone]}>
                <View style={[st.stepIcon, done && st.stepIconDone]}>
                  <Ionicons name={s.icon} size={20} color={done ? '#fff' : '#4f7cff'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.stepLabel}>{s.label}</Text>
                  <Text style={st.stepDesc}>{s.desc}</Text>
                </View>
                {done && <Ionicons name="checkmark-circle" size={20} color="#3dc87d" />}
              </View>
            );
          })}

          {/* Upload CCCD */}
          <View style={st.uploadBox}>
            <Ionicons name="cloud-upload-outline" size={28} color="#8ea0d6" />
            <Text style={st.uploadTitle}>Chụp hoặc tải ảnh CCCD</Text>
            <Text style={st.uploadSub}>JPG / PNG · Tối đa 5MB</Text>
            <TouchableOpacity style={st.aiBtn} onPress={runOCR}>
              <Ionicons name="scan-circle-outline" size={18} color="#fff" />
              <Text style={st.aiBtnText}>Chạy AI OCR</Text>
            </TouchableOpacity>
          </View>

          {/* Selfie */}
          <View style={st.uploadBox}>
            <Ionicons name="camera-outline" size={28} color="#8ea0d6" />
            <Text style={st.uploadTitle}>Chụp Selfie</Text>
            <Text style={st.uploadSub}>Nhìn thẳng, đủ ánh sáng</Text>
            <TouchableOpacity style={st.aiBtn} onPress={runFaceMatch}>
              <Ionicons name="person-circle-outline" size={18} color="#fff" />
              <Text style={st.aiBtnText}>Chạy AI Face Matching</Text>
            </TouchableOpacity>
          </View>

          <View style={st.matchRow}>
            <View style={st.matchBadge}>
              <Ionicons name="analytics-outline" size={16} color="#4f7cff" />
              <Text style={st.matchText}>Match Score cần đạt {'>'} 90%</Text>
            </View>
          </View>

          <TouchableOpacity style={st.primaryBtn} onPress={() => setStep(1)}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={st.primaryBtnText}>Xác thực ngay</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── STEP 1: Biometric Confirm ── */}
      {step === 1 && (
        <>
          <Text style={st.title}>Xác nhận sinh trắc học</Text>
          <Text style={st.subtitle}>Bước bảo mật đặc biệt trước khi truy cập tài khoản và dữ liệu chuyến đi</Text>

          <View style={st.scanCard}>
            <View style={st.ringOuter}>
              <View style={st.ringMiddle}>
                <View style={st.ringInner}>
                  <MaterialCommunityIcons name="face-recognition" size={34} color="#4f7cff" />
                </View>
              </View>
            </View>
            <Text style={st.scanTitle}>Đang quét khuôn mặt</Text>
            <Text style={st.scanDesc}>Giữ điện thoại ngang tầm mắt trong 1–2 giây</Text>
          </View>

          <View style={st.checkList}>
            {BIO_CHECKS.map(item => (
              <View key={item.label} style={st.checkItem}>
                <View style={st.checkLeft}>
                  <Ionicons name="checkmark-circle" size={18} color="#3dc87d" />
                  <Text style={st.checkLabel}>{item.label}</Text>
                </View>
                <Text style={st.checkStatus}>{item.status}</Text>
              </View>
            ))}
          </View>

          <View style={st.aiBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4f7cff" />
            <Text style={st.aiBadgeText}>ArcFace + Liveness AI score: 97.4% · Đủ điều kiện xác thực</Text>
          </View>

          <TouchableOpacity style={st.primaryBtn} onPress={() => router.replace('/' as any)}>
            <Ionicons name="lock-open-outline" size={18} color="#fff" />
            <Text style={st.primaryBtnText}>Hoàn tất và vào ứng dụng</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: '#4f7cff', fontWeight: '600' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  progressDot: { width: 28, height: 6, borderRadius: 3, backgroundColor: '#dfe7ff' },
  progressDotActive: { backgroundColor: '#4f7cff' },
  progressDotDone: { backgroundColor: '#3dc87d' },
  progressLabel: { color: '#7a8cc2', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 14, lineHeight: 20 },

  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#edf2ff', borderWidth: 1, borderColor: '#d0dbff', padding: 10, marginBottom: 14 },
  aiBadgeText: { color: '#4f7cff', fontWeight: '600', fontSize: 12, flex: 1 },

  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', borderRadius: 14, padding: 12, marginBottom: 10 },
  stepDone: { borderColor: '#c3f0d6', backgroundColor: '#f0fdf6' },
  stepIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: '#3dc87d' },
  stepLabel: { color: '#1f2a58', fontWeight: '700', fontSize: 14 },
  stepDesc: { color: '#7a8cc2', fontSize: 12, marginTop: 3 },

  uploadBox: { borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#c3d0f5', backgroundColor: '#f8faff', alignItems: 'center', padding: 24, marginBottom: 10, gap: 6 },
  uploadTitle: { color: '#4f7cff', fontWeight: '700' },
  uploadSub: { color: '#7a8cc2', fontSize: 12 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4f7cff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  aiBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  matchRow: { alignItems: 'center', marginBottom: 14 },
  matchBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#edf2ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  matchText: { color: '#4f7cff', fontWeight: '600', fontSize: 13 },

  // Biometric
  scanCard: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff', alignItems: 'center', padding: 24, marginBottom: 14 },
  ringOuter: { width: 146, height: 146, borderRadius: 73, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf2ff' },
  ringMiddle: { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dfe8ff' },
  ringInner: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  scanTitle: { color: '#1f2a58', fontSize: 18, fontWeight: '700', marginTop: 14 },
  scanDesc: { color: '#7a8cc2', marginTop: 6 },

  checkList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4ebff', padding: 12, gap: 10, marginBottom: 14 },
  checkItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eef2ff', paddingBottom: 8 },
  checkLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkLabel: { color: '#1f2a58', fontWeight: '600' },
  checkStatus: { color: '#4f7cff', fontWeight: '700', fontSize: 12 },

  primaryBtn: { height: 50, borderRadius: 14, backgroundColor: '#4f7cff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});