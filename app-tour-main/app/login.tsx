import { loginAccount } from "@/constants/app-accounts";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LogoLocalMate from "../components/LogoLocalMate";

const QUICK = [
  {
    type: "guest",
    email: "guest1@gmail.com",
    pw: "123456",
    bg: "#DBEAFE",
    icon: "account-circle-outline",
    color: "#1D4ED8",
  },
  {
    type: "admin",
    email: "admin1@gmail.com",
    pw: "123456",
    bg: "#FEE2E2",
    icon: "shield-account-outline",
    color: "#B91C1C",
  },
  {
    type: "guide",
    email: "guide1@gmail.com",
    pw: "123456",
    bg: "#D1FAE5",
    icon: "map-marker-radius-outline",
    color: "#047857",
  },
  {
    type: "staff",
    email: "staff1@gmail.com",
    pw: "123456",
    bg: "#FEF3C7",
    icon: "headset",
    color: "#D97706",
  },
] as const;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = async (em = email, pw = password) => {
    setLoading(true);
    setError("");
    const res = await loginAccount(em.trim(), pw);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const role = res.user.activeRole;
    if (role === "admin") router.replace("/admin-home" as any);
    else if (role === "guide") router.replace("/guide-home" as any);
    else if (role === "staff") router.replace("/staff-home" as any);
    else router.replace("/");
  };

  const quickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setTimeout(() => doLogin(em, pw), 120);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={st.container}
    >
      <ScrollView
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginTop: -40, zIndex: 2 }}>
          <LogoLocalMate />
        </View>
        <View style={st.header}>
          <Text style={st.title}>Đăng nhập</Text>
          <Text style={st.sub}>Điền thông tin tài khoản của bạn</Text>
        </View>

        <View style={st.formCard}>
          <Text style={st.lbl}>Email</Text>
          <View style={[st.inputWrap, !!error && st.inputErr]}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#64748B"
              style={st.icon}
            />
            <TextInput
              style={st.inputTxt}
              placeholder="example@gmail.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={st.labelRow}>
            <Text style={st.lbl}>Mật khẩu</Text>
            <TouchableOpacity>
              <Text style={st.forgotTxt}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>
          <View style={[st.inputWrap, !!error && st.inputErr]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#64748B"
              style={st.icon}
            />
            <TextInput
              style={[st.inputTxt, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError("");
              }}
              secureTextEntry={!showPwd}
            />
            <TouchableOpacity
              onPress={() => setShowPwd((v) => !v)}
              style={st.eyeBtn}
            >
              <Ionicons
                name={showPwd ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
          {!!error && <Text style={st.errorTxt}>{error}</Text>}
          <TouchableOpacity
            style={[st.loginBtn, loading && { opacity: 0.6 }]}
            onPress={() => doLogin()}
            disabled={loading}
          >
            <Text style={st.loginBtnTxt}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={st.vneidBtn}
          onPress={() => router.push("/vneid-login" as any)}
        >
          <Ionicons name="shield-checkmark-outline" size={17} color="#1f2a58" />
          <Text style={st.vneidTxt}>Đăng nhập với VNeID</Text>
        </TouchableOpacity>

        <View style={st.registerRow}>
          <Text style={st.registerTxt}>Bạn chưa có tài khoản?</Text>
          <TouchableOpacity onPress={() => router.push("/register" as any)}>
            <Text style={st.registerLink}> Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>

        {/* Quick login dưới cùng */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={st.quickLabel}>Demo:</Text>
          <View style={st.quickBtns}>
            {QUICK.map((q) => (
              <TouchableOpacity
                key={q.type}
                onPress={() => quickLogin(q.email, q.pw)}
                style={[st.quickIcon, { backgroundColor: q.bg }]}
              >
                <MaterialCommunityIcons
                  name={q.icon}
                  size={22}
                  color={q.color}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.hintCard}>
            <Text style={st.hintTitle}>
              Tài khoản demo (nhấn icon để đăng nhập nhanh)
            </Text>
            <Text style={st.hintRow}>Guest: guest1@gmail.com</Text>
            <Text style={st.hintRow}>Admin: admin1@gmail.com</Text>
            <Text style={st.hintRow}>HDV: guide1@gmail.com</Text>
            <Text style={st.hintRow}>Staff: staff1@gmail.com</Text>
            <Text style={st.hintRow}>
              Dual: dual1@gmail.com - Mật khẩu đều: 123456
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  quickWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginRight: 6,
    letterSpacing: 1,
  },
  quickBtns: { flexDirection: "row", gap: 6 },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: { marginBottom: 12, marginTop: 0 },
  brand: {
    color: "#4f7cff",
    fontWeight: "800",
    fontSize: 22,
    marginTop: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: -50,
    marginBottom: 6,
  },
  sub: { fontSize: 15, color: "#6B7280" },
  formCard: { marginBottom: 14 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  lbl: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginLeft: 2,
  },
  forgotTxt: { fontSize: 13, color: "#2563EB", fontWeight: "500" },
  inputWrap: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  inputErr: { borderColor: "#EF4444" },
  icon: { marginRight: 10 },
  inputTxt: { flex: 1, fontSize: 15, color: "#111827" },
  eyeBtn: { padding: 4, marginLeft: 6 },
  errorTxt: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 14,
    marginTop: -10,
  },
  loginBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnTxt: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  vneidBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d0dbff",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
    marginBottom: 14,
  },
  vneidTxt: { color: "#1f2a58", fontWeight: "700" },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  registerTxt: { fontSize: 14, color: "#6B7280" },
  registerLink: { fontSize: 14, color: "#2563EB", fontWeight: "700" },
  hintCard: {
    backgroundColor: "#f3f7ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4ebff",
    padding: 14,
    gap: 4,
  },
  hintTitle: {
    color: "#1f2a58",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4,
  },
  hintRow: { color: "#7a8cc2", fontSize: 12 },
});
