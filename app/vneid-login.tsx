import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VneidLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [idNumber, setIdNumber] = useState('');
  const [pin,      setPin]      = useState('');
  const [showPin,  setShowPin]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleVerify = () => {
    if (!idNumber.trim() || !pin.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số định danh và mã PIN VNeID.');
      return;
    }
    setLoading(true);
    // Mock API call – sau 800ms chuyển sang guest_kyc (step biometric)
    setTimeout(() => {
      setLoading(false);
      // guest_kyc bắt đầu từ step 0 (eKYC), nhưng VNeID đã xác thực
      // nên ta đẩy thẳng vào tab chính
      router.replace('/' as any);
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingTop: insets.top + 14 }]}
        keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={st.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          <Text style={st.backTxt}>Quay lại</Text>
        </TouchableOpacity>

        <Text style={st.brand}>TourGo x VNeID</Text>
        <Text style={st.title}>Đăng nhập nhanh với VNeID</Text>
        <Text style={st.subtitle}>
          Xác minh danh tính một chạm để đăng nhập an toàn và giảm thao tác nhập tay
        </Text>

        <View style={st.secureBadge}>
          <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#4f7cff" />
          <Text style={st.secureTxt}>Kết nối xác thực chính chủ · Mã hóa dữ liệu đầu cuối</Text>
        </View>

        <View style={st.form}>
          {/* Số định danh */}
          <View style={st.inputRow}>
            <Ionicons name="call-outline" size={18} color="#8ea0d6" />
            <TextInput
              placeholder="Số định danh / SĐT VNeID" style={st.input}
              value={idNumber} onChangeText={setIdNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#b0bdd8" />
          </View>

          {/* PIN */}
          <View style={st.inputRow}>
            <Ionicons name="key-outline" size={18} color="#8ea0d6" />
            <TextInput
              placeholder="Mã PIN VNeID" style={[st.input, { flex: 1 }]}
              value={pin} onChangeText={setPin}
              secureTextEntry={!showPin}
              keyboardType="number-pad"
              placeholderTextColor="#b0bdd8" />
            <TouchableOpacity onPress={() => setShowPin(v => !v)} style={st.eyeBtn}>
              <Ionicons name={showPin ? 'eye-outline' : 'eye-off-outline'} size={18} color="#8ea0d6" />
            </TouchableOpacity>
          </View>

          {/* Xác minh → vào app */}
          <TouchableOpacity
            style={[st.primaryBtn, loading && st.primaryBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}>
            <MaterialCommunityIcons name="account-check-outline" size={18} color="#fff" />
            <Text style={st.primaryTxt}>{loading ? 'Đang xác minh...' : 'Xác minh VNeID'}</Text>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={st.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#4f7cff" />
          <Text style={st.noteTxt}>
            Bạn có thể dùng Face ID hoặc vân tay ở bước tiếp theo để hoàn tất đăng nhập.
          </Text>
        </View>

        {/* eKYC thủ công */}
        <TouchableOpacity style={st.altRow} onPress={() => router.push('/guest_kyc' as any)}>
          <Text style={st.altTxt}>Xác thực thủ công bằng CCCD →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18, paddingBottom: 32 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backTxt: { color: '#4f7cff', fontWeight: '600' },
  brand: { color: '#4f7cff', fontSize: 22, fontWeight: '700' },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700', marginTop: 12 },
  subtitle: { color: '#7a8cc2', marginTop: 8, marginBottom: 14, lineHeight: 20 },
  secureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, backgroundColor: '#edf2ff',
    borderWidth: 1, borderColor: '#d0dbff', padding: 10, marginBottom: 16,
  },
  secureTxt: { color: '#4f7cff', fontWeight: '600', fontSize: 12, flex: 1 },
  form: { gap: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebff',
    borderRadius: 14, paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 13, color: '#1f2a58', fontSize: 15 },
  eyeBtn: { padding: 6 },
  primaryBtn: {
    height: 52, borderRadius: 14, backgroundColor: '#4f7cff',
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 8, marginTop: 6,
    shadowColor: '#4f7cff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noteBox: {
    marginTop: 16, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e4ebff', padding: 12,
    flexDirection: 'row', gap: 8,
  },
  noteTxt: { color: '#5f73a9', fontSize: 12, flex: 1, lineHeight: 18 },
  altRow: { alignItems: 'center', marginTop: 16 },
  altTxt: { color: '#4f7cff', fontWeight: '600', fontSize: 13 },
});