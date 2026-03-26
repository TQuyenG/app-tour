/**
 * app/admin-banner.tsx
 * Admin quản lý banner — với ảnh thật, slideshow preview, UI hiện đại
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
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
import { AdminTabBar } from "@/components/AdminTabBar";

const { width: SW } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────
interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkRoute: string;
  color: string;
  imageUrl: string;       // ảnh nền banner
  active: boolean;
  order: number;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  tag: string;            // "HOT" | "NEW" | "SALE" | ""
  targetAudience: string;
}

// ─── Ảnh mẫu Unsplash (free, stable CDN) ─────────────────────
const SAMPLE_IMAGES = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", label: "Núi & thiên nhiên" },
  { url: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80", label: "Biển đảo" },
  { url: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80", label: "Phố cổ Hội An" },
  { url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80", label: "Đền đài văn hóa" },
  { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", label: "Thiên nhiên hùng vĩ" },
  { url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", label: "Du lịch phượt" },
  { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", label: "Ẩm thực" },
  { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80", label: "Resort nghỉ dưỡng" },
  { url: "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=800&q=80", label: "Bãi biển nhiệt đới" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", label: "Trekking núi rừng" },
  { url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80", label: "Đà Nẵng cầu Rồng" },
  { url: "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=800&q=80", label: "Đồng lúa Tây Bắc" },
];

// ─── Seed data với ảnh thật ───────────────────────────────────
const SEED_BANNERS: Banner[] = [
  {
    id: "b1", title: "Ưu đãi mùa hè", subtitle: "Giảm tới 35% tour biển & cao nguyên",
    ctaText: "Xem tour", linkRoute: "/explore",
    color: "#1d4ed8",
    imageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80",
    active: true, order: 1, startDate: "01/04/2026", endDate: "30/06/2026",
    clicks: 1243, impressions: 8920, tag: "HOT", targetAudience: "Tất cả",
  },
  {
    id: "b2", title: "Flash Sale cuối tuần", subtitle: "Chỉ còn 48 giờ – Giảm đến 50%",
    ctaText: "Đặt ngay", linkRoute: "/admin-flash-sale",
    color: "#dc2626",
    imageUrl: "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=800&q=80",
    active: true, order: 2, startDate: "05/04/2026", endDate: "07/04/2026",
    clicks: 876, impressions: 5430, tag: "SALE", targetAudience: "Tất cả",
  },
  {
    id: "b3", title: "Khám phá Tây Bắc", subtitle: "Hành trình văn hóa & thiên nhiên",
    ctaText: "Xem lịch", linkRoute: "/explore",
    color: "#15803d",
    imageUrl: "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=800&q=80",
    active: true, order: 3, startDate: "01/03/2026", endDate: "30/05/2026",
    clicks: 654, impressions: 4210, tag: "NEW", targetAudience: "Tất cả",
  },
  {
    id: "b4", title: "HDV chuyên nghiệp", subtitle: "Kết nối với 200+ hướng dẫn viên xác thực",
    ctaText: "Tìm HDV", linkRoute: "/guest_search_guide",
    color: "#7c3aed",
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
    active: true, order: 4, startDate: "01/02/2026", endDate: "31/12/2026",
    clicks: 432, impressions: 3100, tag: "", targetAudience: "Tất cả",
  },
  {
    id: "b5", title: "Voucher tân sinh viên", subtitle: "Giảm 200k cho lần đặt tour đầu tiên",
    ctaText: "Nhận ngay", linkRoute: "/explore",
    color: "#b45309",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    active: false, order: 5, startDate: "01/09/2026", endDate: "30/09/2026",
    clicks: 0, impressions: 0, tag: "NEW", targetAudience: "Sinh viên",
  },
  {
    id: "b6", title: "Tour Tết Nguyên Đán", subtitle: "Đặt sớm – Giá tốt – Vé hot nhất",
    ctaText: "Đặt tour", linkRoute: "/explore",
    color: "#be123c",
    imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
    active: false, order: 6, startDate: "15/01/2027", endDate: "10/02/2027",
    clicks: 0, impressions: 0, tag: "HOT", targetAudience: "Tất cả",
  },
];

// ─── Constants ────────────────────────────────────────────────
const PALETTE = [
  "#1d4ed8","#dc2626","#15803d","#7c3aed",
  "#b45309","#0e7490","#be123c","#0369a1",
  "#166534","#6d28d9","#c2410c","#0f172a",
];

const TAGS    = ["", "HOT", "NEW", "SALE"];
const TARGETS = ["Tất cả", "Khách mới", "VIP", "Sinh viên"];

const TAG_META: Record<string, { bg: string; text: string; emoji: string }> = {
  HOT:  { bg: "#fef2f2", text: "#ef4444", emoji: "🔥" },
  NEW:  { bg: "#f0fdf4", text: "#16a34a", emoji: "✨" },
  SALE: { bg: "#fffbeb", text: "#d97706", emoji: "🏷️" },
};

const EMPTY: Omit<Banner, "id" | "clicks" | "impressions"> = {
  title: "", subtitle: "", ctaText: "Xem ngay",
  linkRoute: "/explore", color: "#1d4ed8",
  imageUrl: SAMPLE_IMAGES[0].url,
  active: true, order: 99,
  startDate: "", endDate: "",
  tag: "", targetAudience: "Tất cả",
};

// ─── Helpers ──────────────────────────────────────────────────
const ctr = (c: number, i: number) =>
  i > 0 ? ((c / i) * 100).toFixed(1) : "0.0";

const fmtNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const getDaysLeft = (endDate: string) => {
  const p = endDate.split("/");
  if (p.length !== 3) return null;
  const d = Math.ceil((new Date(+p[2], +p[1] - 1, +p[0]).getTime() - Date.now()) / 86400000);
  return d;
};

// ─── Slideshow dot indicator ──────────────────────────────────
function SlideDots({ total, active }: { total: number; active: number }) {
  return (
    <View style={dot.wrap}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[dot.dot, i === active && dot.dotActive]} />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  wrap:      { flexDirection: "row", gap: 5, justifyContent: "center" },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 18, backgroundColor: "#fff" },
});

// ─── Live Slideshow Preview (readonly, admin top area) ────────
function BannerSlideshow({ banners }: { banners: Banner[] }) {
  const active = banners.filter(b => b.active).sort((a, b) => a.order - b.order);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const PREVIEW_W = SW - 32;

  useEffect(() => {
    if (active.length < 2) return;
    const t = setInterval(() => {
      setIdx(prev => {
        const next = (prev + 1) % active.length;
        scrollRef.current?.scrollTo({ x: PREVIEW_W * next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [active.length]);

  if (active.length === 0) return null;

  return (
    <View style={ss.slideshowWrap}>
      <Text style={ss.slideshowTitle}>
        <Ionicons name="play-circle-outline" size={13} color="#94a3b8" />
        {"  "}Xem trước slideshow ({active.length} banner đang hiển thị)
      </Text>
      <View style={[ss.slideshowBox, { width: PREVIEW_W }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => {
            const newIdx = Math.round(e.nativeEvent.contentOffset.x / PREVIEW_W);
            setIdx(newIdx);
          }}
          scrollEventThrottle={16}
        >
          {active.map(b => (
            <View key={b.id} style={[ss.slide, { width: PREVIEW_W }]}>
              <Image
                source={{ uri: b.imageUrl }}
                style={ss.slideImg}
                resizeMode="cover"
              />
              {/* Dark overlay */}
              <View style={ss.slideOverlay} />
              {/* Tag */}
              {!!b.tag && (
                <View style={[ss.slideTag, { backgroundColor: TAG_META[b.tag]?.bg ?? "#fff" }]}>
                  <Text style={[ss.slideTagTxt, { color: TAG_META[b.tag]?.text ?? "#333" }]}>
                    {TAG_META[b.tag]?.emoji} {b.tag}
                  </Text>
                </View>
              )}
              {/* Content */}
              <View style={ss.slideContent}>
                <Text style={ss.slideTitle}>{b.title}</Text>
                <Text style={ss.slideSub}>{b.subtitle}</Text>
                <View style={[ss.slideCta, { backgroundColor: b.color }]}>
                  <Text style={ss.slideCtaTxt}>{b.ctaText}</Text>
                  <Ionicons name="arrow-forward" size={12} color="#fff" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Dots */}
        <View style={ss.dotsWrap}>
          <SlideDots total={active.length} active={idx} />
        </View>
        {/* Duration indicator */}
        <View style={ss.durationBadge}>
          <View style={ss.durationDot} />
          <Text style={ss.durationTxt}>Auto 3s</Text>
        </View>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  slideshowWrap:  { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", padding: 12, paddingTop: 10 },
  slideshowTitle: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginBottom: 8 },
  slideshowBox:   { borderRadius: 16, overflow: "hidden", height: 160, position: "relative" },
  slide:          { height: 160, position: "relative" },
  slideImg:       { width: "100%", height: "100%", position: "absolute" },
  slideOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  slideTag:       { position: "absolute", top: 10, right: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slideTagTxt:    { fontSize: 10, fontWeight: "800" },
  slideContent:   { position: "absolute", bottom: 14, left: 14, right: 14 },
  slideTitle:     { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 3, letterSpacing: -0.3 },
  slideSub:       { color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 10 },
  slideCta:       { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  slideCtaTxt:    { color: "#fff", fontWeight: "700", fontSize: 12 },
  dotsWrap:       { position: "absolute", bottom: 10, left: 0, right: 0, alignItems: "center" },
  durationBadge:  { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  durationDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  durationTxt:    { color: "#fff", fontSize: 10, fontWeight: "600" },
});

// ─── Main Component ───────────────────────────────────────────
export default function AdminBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [banners, setBanners]       = useState<Banner[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editBanner, setEditBanner] = useState<Partial<Banner>>(EMPTY);
  const [isNew, setIsNew]           = useState(true);
  const [filterTab, setFilterTab]   = useState<"all" | "active" | "inactive">("all");
  const [showImgPicker, setShowImgPicker] = useState(false);

  // ── Load / persist ──────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("@admin_banners_v3")
      .then(raw => setBanners(raw ? JSON.parse(raw) : SEED_BANNERS))
      .catch(() => setBanners(SEED_BANNERS));
  }, []));

  const persist = async (data: Banner[]) => {
    setBanners(data);
    await AsyncStorage.setItem("@admin_banners_v3", JSON.stringify(data)).catch(() => {});
  };

  // ── CRUD ─────────────────────────────────────────────────────
  const openNew = () => {
    setEditBanner({ ...EMPTY, order: banners.length + 1 });
    setIsNew(true);
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner({ ...b });
    setIsNew(false);
    setShowModal(true);
  };

  const saveBanner = async () => {
    if (!editBanner.title?.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề banner");
      return;
    }
    if (!editBanner.startDate || !editBanner.endDate) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập ngày bắt đầu và kết thúc");
      return;
    }
    const newList: Banner[] = isNew
      ? [...banners, { ...EMPTY, ...editBanner, id: `b${Date.now()}`, clicks: 0, impressions: 0 } as Banner]
      : banners.map(b => b.id === editBanner.id ? { ...b, ...editBanner } as Banner : b);
    await persist(newList);
    setShowModal(false);
    Alert.alert("✅ Thành công", `Banner "${editBanner.title}" đã được ${isNew ? "tạo" : "cập nhật"}.`);
  };

  const duplicateBanner = async (b: Banner) => {
    const dup: Banner = { ...b, id: `b${Date.now()}`, title: `${b.title} (bản sao)`, active: false, order: banners.length + 1, clicks: 0, impressions: 0 };
    await persist([...banners, dup]);
    Alert.alert("✅ Đã sao chép", dup.title);
  };

  const toggleActive = async (id: string) => {
    await persist(banners.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const deleteBanner = (b: Banner) => {
    Alert.alert("Xóa banner", `Xóa "${b.title}"?\nHành động này không thể hoàn tác.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => await persist(banners.filter(x => x.id !== b.id)) },
    ]);
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const arr = [...filtered];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    await persist(banners.map(b => { const found = arr.find(x => x.id === b.id); return found ? { ...found, order: arr.indexOf(found) + 1 } : b; }));
  };

  const moveDown = async (idx: number) => {
    if (idx === filtered.length - 1) return;
    const arr = [...filtered];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    await persist(banners.map(b => { const found = arr.find(x => x.id === b.id); return found ? { ...found, order: arr.indexOf(found) + 1 } : b; }));
  };

  // ── Derived ──────────────────────────────────────────────────
  const activeCount  = banners.filter(b => b.active).length;
  const totalClicks  = banners.reduce((s, b) => s + b.clicks, 0);
  const totalImpress = banners.reduce((s, b) => s + b.impressions, 0);
  const avgCtr       = ctr(totalClicks, totalImpress);

  const filtered = useMemo(() => {
    const list = [...banners].sort((a, b) => a.order - b.order);
    if (filterTab === "active")   return list.filter(b => b.active);
    if (filterTab === "inactive") return list.filter(b => !b.active);
    return list;
  }, [banners, filterTab]);

  const topBanner = useMemo(() =>
    [...banners].filter(b => b.impressions > 0).sort((a, b) => parseFloat(ctr(b.clicks, b.impressions)) - parseFloat(ctr(a.clicks, a.impressions)))[0]
  , [banners]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Quản lý Banner</Text>
          <Text style={s.headerSub}>Trang chủ · {activeCount} đang hiển thị</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnTxt}>Thêm mới</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { icon: "layers-outline",    val: String(banners.length), label: "Tổng",         color: "#4f7cff" },
          { icon: "eye-outline",       val: String(activeCount),    label: "Hiển thị",     color: "#22c55e" },
          { icon: "hand-left-outline", val: fmtNum(totalClicks),    label: "Clicks",       color: "#f59e0b" },
          { icon: "analytics-outline", val: `${avgCtr}%`,           label: "CTR TB",       color: "#8b5cf6" },
        ].map((item, i) => (
          <View key={i} style={s.statItem}>
            <View style={[s.statIcon, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon as any} size={14} color={item.color} />
            </View>
            <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Banner cards + slideshow + filter đều nằm trong ScrollView ── */}
      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Slideshow preview ── */}
        <BannerSlideshow banners={banners} />

        {/* ── Top performer ── */}
        {topBanner && (
          <View style={s.topPerfBar}>
            <Text style={s.topPerfEmoji}>🏆</Text>
            <Text style={s.topPerfTxt}>
              Hiệu quả nhất: <Text style={s.topPerfName}>{topBanner.title}</Text>
            </Text>
            <View style={[s.topPerfBadge, { backgroundColor: topBanner.color }]}>
              <Text style={s.topPerfBadgeTxt}>CTR {ctr(topBanner.clicks, topBanner.impressions)}%</Text>
            </View>
          </View>
        )}

        {/* ── Filter tabs ── */}
        <View style={s.filterBar}>
          {([
            { key: "all",      label: `Tất cả (${banners.length})` },
            { key: "active",   label: `✅ Hiển thị (${activeCount})` },
            { key: "inactive", label: `⛔ Ẩn (${banners.length - activeCount})` },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.filterTab, filterTab === key && s.filterTabActive]}
              onPress={() => setFilterTab(key)}
            >
              <Text style={[s.filterTabTxt, filterTab === key && s.filterTabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 44, opacity: 0.3 }}>🖼️</Text>
            <Text style={s.emptyTxt}>Không có banner nào</Text>
          </View>
        )}

        {filtered.map((b, idx) => {
          const daysLeft   = getDaysLeft(b.endDate);
          const isExpired  = daysLeft !== null && daysLeft < 0;
          const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
          const bCtr       = ctr(b.clicks, b.impressions);
          const ctrNum     = parseFloat(bCtr);

          return (
            <View key={b.id} style={[s.card, !b.active && s.cardInactive]}>

              {/* ── Banner image preview ── */}
              <View style={s.cardImageWrap}>
                <Image
                  source={{ uri: b.imageUrl }}
                  style={s.cardImage}
                  resizeMode="cover"
                />
                {/* Overlay */}
                <View style={s.cardImageOverlay} />

                {/* Order badge */}
                <View style={s.cardOrderBadge}>
                  <Text style={s.cardOrderTxt}>#{b.order}</Text>
                </View>

                {/* Tag */}
                {!!b.tag && (
                  <View style={[s.cardTag, { backgroundColor: TAG_META[b.tag]?.bg ?? "#fff" }]}>
                    <Text style={[s.cardTagTxt, { color: TAG_META[b.tag]?.text ?? "#333" }]}>
                      {TAG_META[b.tag]?.emoji} {b.tag}
                    </Text>
                  </View>
                )}

                {/* Status overlay on image */}
                {!b.active && (
                  <View style={s.cardPausedOverlay}>
                    <Ionicons name="pause-circle-outline" size={28} color="rgba(255,255,255,0.9)" />
                    <Text style={s.cardPausedTxt}>Đã ẩn</Text>
                  </View>
                )}

                {/* Banner text on image */}
                <View style={s.cardImageContent}>
                  <Text style={s.cardImageTitle} numberOfLines={1}>{b.title}</Text>
                  <Text style={s.cardImageSub} numberOfLines={1}>{b.subtitle}</Text>
                  <View style={[s.cardImageCta, { backgroundColor: b.color }]}>
                    <Text style={s.cardImageCtaTxt}>{b.ctaText}</Text>
                    <Ionicons name="arrow-forward" size={10} color="#fff" />
                  </View>
                </View>
              </View>

              {/* ── Info section ── */}
              <View style={s.cardBody}>

                {/* Status + dates */}
                <View style={s.cardInfoRow}>
                  <View style={[
                    s.statusPill,
                    { backgroundColor: b.active ? "#f0fdf4" : "#f8fafc" },
                  ]}>
                    <View style={[s.statusDot, { backgroundColor: b.active ? "#22c55e" : "#94a3b8" }]} />
                    <Text style={[s.statusTxt, { color: b.active ? "#16a34a" : "#64748b" }]}>
                      {b.active ? "Đang hiển thị" : "Đã ẩn"}
                    </Text>
                  </View>

                  {isExpired && (
                    <View style={s.expiredPill}>
                      <Ionicons name="alert-circle" size={10} color="#ef4444" />
                      <Text style={s.expiredTxt}>Hết hạn</Text>
                    </View>
                  )}
                  {isExpiring && !isExpired && (
                    <View style={s.expiringPill}>
                      <Ionicons name="time-outline" size={10} color="#d97706" />
                      <Text style={s.expiringTxt}>Còn {daysLeft}d</Text>
                    </View>
                  )}

                  <Text style={s.dateTxt}>
                    {b.startDate} → {b.endDate}
                  </Text>
                </View>

                {/* Stats grid */}
                <View style={s.statsGrid}>
                  <View style={s.statsGridItem}>
                    <Text style={s.statsGridVal}>{fmtNum(b.impressions)}</Text>
                    <Text style={s.statsGridLabel}>Lượt xem</Text>
                  </View>
                  <View style={s.statsGridDiv} />
                  <View style={s.statsGridItem}>
                    <Text style={s.statsGridVal}>{fmtNum(b.clicks)}</Text>
                    <Text style={s.statsGridLabel}>Clicks</Text>
                  </View>
                  <View style={s.statsGridDiv} />
                  <View style={s.statsGridItem}>
                    <Text style={[
                      s.statsGridVal,
                      {
                        color: ctrNum >= 15 ? "#16a34a"
                          : ctrNum >= 10 ? "#d97706"
                          : ctrNum > 0 ? "#ef4444" : "#94a3b8",
                      },
                    ]}>
                      {bCtr}%
                    </Text>
                    <Text style={s.statsGridLabel}>CTR</Text>
                  </View>
                  <View style={s.statsGridDiv} />
                  <View style={s.statsGridItem}>
                    <Text style={[
                      s.statsGridVal,
                      { color: b.targetAudience === "Tất cả" ? "#94a3b8" : "#8b5cf6" },
                    ]}>
                      {b.targetAudience === "Tất cả" ? "All" : b.targetAudience}
                    </Text>
                    <Text style={s.statsGridLabel}>Đối tượng</Text>
                  </View>
                </View>

                {/* CTR bar */}
                {b.impressions > 0 && (
                  <View style={s.ctrBarRow}>
                    <View style={s.ctrBarBg}>
                      <View style={[
                        s.ctrBarFill,
                        {
                          width: `${Math.min(ctrNum * 5, 100)}%` as any,
                          backgroundColor: ctrNum >= 15 ? "#22c55e" : ctrNum >= 10 ? "#f59e0b" : "#ef4444",
                        },
                      ]} />
                    </View>
                    <Text style={s.ctrBarTxt}>CTR {bCtr}%</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={s.actRow}>
                  {/* Reorder */}
                  <View style={s.reorderGroup}>
                    <TouchableOpacity
                      style={[s.actBtn, idx === 0 && s.actBtnDim]}
                      onPress={() => moveUp(idx)} disabled={idx === 0}
                    >
                      <Ionicons name="chevron-up" size={14} color={idx === 0 ? "#cbd5e1" : "#4f7cff"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actBtn, idx === filtered.length - 1 && s.actBtnDim]}
                      onPress={() => moveDown(idx)} disabled={idx === filtered.length - 1}
                    >
                      <Ionicons name="chevron-down" size={14} color={idx === filtered.length - 1 ? "#cbd5e1" : "#4f7cff"} />
                    </TouchableOpacity>
                  </View>

                  <View style={s.actDivider} />

                  {/* Toggle */}
                  <TouchableOpacity
                    style={[s.actBtn, { backgroundColor: b.active ? "#fef9c3" : "#f0fdf4" }]}
                    onPress={() => toggleActive(b.id)}
                  >
                    <Ionicons
                      name={b.active ? "eye-off-outline" : "eye-outline"}
                      size={14} color={b.active ? "#d97706" : "#16a34a"}
                    />
                  </TouchableOpacity>

                  {/* Duplicate */}
                  <TouchableOpacity
                    style={[s.actBtn, { backgroundColor: "#f0f9ff" }]}
                    onPress={() => duplicateBanner(b)}
                  >
                    <Ionicons name="copy-outline" size={14} color="#0284c7" />
                  </TouchableOpacity>

                  {/* Edit */}
                  <TouchableOpacity
                    style={[s.actBtn, { backgroundColor: "#eff6ff" }]}
                    onPress={() => openEdit(b)}
                  >
                    <Ionicons name="pencil-outline" size={14} color="#4f7cff" />
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity
                    style={[s.actBtn, { backgroundColor: "#fef2f2" }]}
                    onPress={() => deleteBanner(b)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ══════════════════ MODAL ══════════════════ */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={m.overlay}>
            <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={() => setShowModal(false)} />
            <View style={[m.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={m.handle} />
              <View style={m.header}>
                <View>
                  <Text style={m.title}>{isNew ? "✨ Tạo banner mới" : "✏️ Chỉnh sửa banner"}</Text>
                  <Text style={m.sub}>Ảnh + màu + nội dung hiển thị trên trang chủ</Text>
                </View>
                <TouchableOpacity style={m.closeBtn} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={m.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── Live preview ── */}
                <View style={m.previewCard}>
                  <Image source={{ uri: editBanner.imageUrl || SAMPLE_IMAGES[0].url }} style={m.previewImg} resizeMode="cover" />
                  <View style={m.previewOverlay} />
                  {!!editBanner.tag && (
                    <View style={[m.previewTag, { backgroundColor: TAG_META[editBanner.tag]?.bg ?? "#fff" }]}>
                      <Text style={[m.previewTagTxt, { color: TAG_META[editBanner.tag]?.text ?? "#333" }]}>
                        {TAG_META[editBanner.tag]?.emoji} {editBanner.tag}
                      </Text>
                    </View>
                  )}
                  <View style={m.previewContent}>
                    <Text style={m.previewTitle}>{editBanner.title || "Tiêu đề banner"}</Text>
                    <Text style={m.previewSub}>{editBanner.subtitle || "Mô tả ngắn..."}</Text>
                    <View style={[m.previewCta, { backgroundColor: editBanner.color || "#1d4ed8" }]}>
                      <Text style={m.previewCtaTxt}>{editBanner.ctaText || "Xem ngay"}</Text>
                      <Ionicons name="arrow-forward" size={11} color="#fff" />
                    </View>
                  </View>
                </View>

                {/* ── Chọn ảnh ── */}
                <Text style={m.sectionLabel}>🖼️ Ảnh nền banner</Text>
                <TouchableOpacity
                  style={m.imgPickerBtn}
                  onPress={() => setShowImgPicker(v => !v)}
                >
                  <Image source={{ uri: editBanner.imageUrl || SAMPLE_IMAGES[0].url }} style={m.imgPickerThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={m.imgPickerLabel}>Chọn ảnh mẫu</Text>
                    <Text style={m.imgPickerSub} numberOfLines={1}>{editBanner.imageUrl || "Chưa chọn"}</Text>
                  </View>
                  <Ionicons name={showImgPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                </TouchableOpacity>

                {showImgPicker && (
                  <View style={m.imgGrid}>
                    {SAMPLE_IMAGES.map(img => (
                      <TouchableOpacity
                        key={img.url}
                        style={[m.imgGridItem, editBanner.imageUrl === img.url && m.imgGridItemActive]}
                        onPress={() => { setEditBanner(p => ({ ...p, imageUrl: img.url })); setShowImgPicker(false); }}
                      >
                        <Image source={{ uri: img.url }} style={m.imgGridThumb} resizeMode="cover" />
                        {editBanner.imageUrl === img.url && (
                          <View style={m.imgGridCheck}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          </View>
                        )}
                        <Text style={m.imgGridLabel} numberOfLines={1}>{img.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ── Màu nút CTA ── */}
                <Text style={m.sectionLabel}>🎨 Màu nút CTA</Text>
                <View style={m.colorGrid}>
                  {PALETTE.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[m.colorDot, { backgroundColor: c }, editBanner.color === c && m.colorDotActive]}
                      onPress={() => setEditBanner(p => ({ ...p, color: c }))}
                    >
                      {editBanner.color === c && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Nội dung ── */}
                <Text style={m.sectionLabel}>📝 Nội dung</Text>

                {[
                  { key: "title",     label: "Tiêu đề *",     placeholder: "VD: Ưu đãi mùa hè",             required: true },
                  { key: "subtitle",  label: "Mô tả phụ",     placeholder: "VD: Giảm 35% tour biển",        required: false },
                  { key: "ctaText",   label: "Nút CTA",        placeholder: "VD: Xem ngay",                  required: false },
                  { key: "linkRoute", label: "Link route",     placeholder: "VD: /explore",                  required: false },
                ].map(f => (
                  <View key={f.key} style={m.fieldGroup}>
                    <Text style={m.fieldLabel}>
                      {f.label}{f.required && <Text style={{ color: "#ef4444" }}> *</Text>}
                    </Text>
                    <TextInput
                      style={m.fieldInput}
                      value={(editBanner as any)[f.key] ?? ""}
                      onChangeText={v => setEditBanner(p => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize={f.key === "linkRoute" ? "none" : "sentences"}
                      maxLength={f.key === "title" ? 50 : f.key === "subtitle" ? 80 : 40}
                    />
                  </View>
                ))}

                {/* ── Tag ── */}
                <Text style={m.sectionLabel}>🏷️ Nhãn hiển thị</Text>
                <View style={m.chipRow}>
                  {TAGS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        m.chip,
                        editBanner.tag === tag && m.chipActive,
                        !!tag && editBanner.tag === tag && {
                          backgroundColor: TAG_META[tag]?.bg,
                          borderColor: TAG_META[tag]?.text,
                        },
                      ]}
                      onPress={() => setEditBanner(p => ({ ...p, tag }))}
                    >
                      <Text style={[
                        m.chipTxt,
                        editBanner.tag === tag && !!tag && { color: TAG_META[tag]?.text, fontWeight: "700" },
                        editBanner.tag === tag && !tag && { color: "#0f172a", fontWeight: "700" },
                      ]}>
                        {tag ? `${TAG_META[tag]?.emoji} ${tag}` : "Không có"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Target ── */}
                <Text style={m.sectionLabel}>👥 Đối tượng</Text>
                <View style={m.chipRow}>
                  {TARGETS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[m.chip, editBanner.targetAudience === t && m.chipActive]}
                      onPress={() => setEditBanner(p => ({ ...p, targetAudience: t }))}
                    >
                      <Text style={[m.chipTxt, editBanner.targetAudience === t && { color: "#0f172a", fontWeight: "700" }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Thời gian ── */}
                <Text style={m.sectionLabel}>📅 Thời gian hiển thị</Text>
                <View style={m.dateRow}>
                  {[
                    { key: "startDate", label: "Từ ngày *" },
                    { key: "endDate",   label: "Đến ngày *" },
                  ].map(f => (
                    <View key={f.key} style={{ flex: 1 }}>
                      <Text style={m.fieldLabel}>{f.label}</Text>
                      <View style={m.dateInput}>
                        <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                        <TextInput
                          style={m.dateInputTxt}
                          value={(editBanner as any)[f.key] ?? ""}
                          onChangeText={v => setEditBanner(p => ({ ...p, [f.key]: v }))}
                          placeholder="DD/MM/YYYY"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numbers-and-punctuation"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {/* ── Toggle active ── */}
                <TouchableOpacity
                  style={m.activeRow}
                  onPress={() => setEditBanner(p => ({ ...p, active: !p.active }))}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={m.activeLabel}>Hiển thị ngay sau khi lưu</Text>
                    <Text style={m.activeSub}>Tắt để lưu nháp</Text>
                  </View>
                  <View style={[m.toggle, editBanner.active ? m.toggleOn : m.toggleOff]}>
                    <View style={[m.toggleThumb, editBanner.active ? m.toggleThumbOn : m.toggleThumbOff]} />
                  </View>
                </TouchableOpacity>

                {/* ── Save ── */}
                <TouchableOpacity style={m.saveBtn} onPress={saveBanner}>
                  <Ionicons name={isNew ? "add-circle-outline" : "save-outline"} size={18} color="#fff" />
                  <Text style={m.saveBtnTxt}>{isNew ? "Tạo banner" : "Lưu thay đổi"}</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AdminTabBar role="admin" activeRoute="/admin-banner" />
    </View>
  );
}

// ─── Tokens ───────────────────────────────────────────────────
const BG     = "#f1f5f9";
const WHITE  = "#ffffff";
const BORDER = "#e2e8f0";
const TXT    = "#0f172a";
const TXT2   = "#475569";
const TXT3   = "#94a3b8";
const ACCENT = "#4f7cff";

// ─── Main styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: BG },
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: TXT, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: TXT3, marginTop: 1 },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnTxt:   { color: WHITE, fontSize: 13, fontWeight: "700" },

  statsRow:    { flexDirection: "row", backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 10 },
  statItem:    { flex: 1, alignItems: "center", gap: 3 },
  statIcon:    { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statVal:     { fontSize: 15, fontWeight: "900" },
  statLabel:   { fontSize: 9, color: TXT3, fontWeight: "600" },

  topPerfBar:     { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fffbeb", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#fef3c7" },
  topPerfEmoji:   { fontSize: 14 },
  topPerfTxt:     { flex: 1, fontSize: 12, color: TXT2 },
  topPerfName:    { fontWeight: "800", color: TXT },
  topPerfBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  topPerfBadgeTxt:{ color: WHITE, fontSize: 11, fontWeight: "800" },

  filterBar:       { flexDirection: "row", backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterTab:       { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterTabActive: { borderBottomColor: ACCENT },
  filterTabTxt:    { fontSize: 12, fontWeight: "600", color: TXT3 },
  filterTabTxtActive: { color: ACCENT, fontWeight: "700" },

  list: { padding: 12, gap: 12 },

  // Card
  card:        { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  cardInactive:{ opacity: 0.65 },

  // Image section
  cardImageWrap:    { height: 160, position: "relative" },
  cardImage:        { width: "100%", height: "100%" },
  cardImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
  cardOrderBadge:   { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cardOrderTxt:     { color: WHITE, fontSize: 11, fontWeight: "800" },
  cardTag:          { position: "absolute", top: 10, right: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  cardTagTxt:       { fontSize: 10, fontWeight: "800" },
  cardPausedOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 4 },
  cardPausedTxt:    { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  cardImageContent: { position: "absolute", bottom: 12, left: 12, right: 12 },
  cardImageTitle:   { color: WHITE, fontSize: 16, fontWeight: "900", marginBottom: 3 },
  cardImageSub:     { color: "rgba(255,255,255,0.85)", fontSize: 11, marginBottom: 8 },
  cardImageCta:     { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  cardImageCtaTxt:  { color: WHITE, fontSize: 11, fontWeight: "800" },

  // Body section
  cardBody: { padding: 12, gap: 10 },

  cardInfoRow:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  statusPill:   { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusTxt:    { fontSize: 11, fontWeight: "700" },
  expiredPill:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef2f2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  expiredTxt:   { fontSize: 10, fontWeight: "700", color: "#ef4444" },
  expiringPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fffbeb", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  expiringTxt:  { fontSize: 10, fontWeight: "700", color: "#d97706" },
  dateTxt:      { fontSize: 10, color: TXT3, marginLeft: "auto" as const },

  statsGrid:      { flexDirection: "row", backgroundColor: "#f8fafc", borderRadius: 10, paddingVertical: 8 },
  statsGridItem:  { flex: 1, alignItems: "center", gap: 2 },
  statsGridVal:   { fontSize: 13, fontWeight: "800", color: TXT },
  statsGridLabel: { fontSize: 9, color: TXT3, fontWeight: "600" },
  statsGridDiv:   { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  ctrBarRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  ctrBarBg:    { flex: 1, height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  ctrBarFill:  { height: "100%", borderRadius: 3 },
  ctrBarTxt:   { fontSize: 10, fontWeight: "700", color: TXT3, width: 52, textAlign: "right" as const },

  actRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  reorderGroup: { flexDirection: "row", gap: 4 },
  actDivider:   { width: 1, height: 20, backgroundColor: BORDER },
  actBtn:       { width: 34, height: 34, borderRadius: 9, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  actBtnDim:    { opacity: 0.3 },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTxt:   { fontSize: 14, color: TXT3, fontWeight: "600" },
});

// ─── Modal styles ─────────────────────────────────────────────
const m = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.52)" },
  sheet:    { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "95%" },
  handle:   { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:    { fontSize: 17, fontWeight: "800", color: TXT },
  sub:      { fontSize: 11, color: TXT3, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  body:     { padding: 18, gap: 2 },

  sectionLabel: { fontSize: 12, fontWeight: "700", color: TXT2, marginTop: 14, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 },

  // Preview
  previewCard:    { height: 150, borderRadius: 14, overflow: "hidden", marginBottom: 2, position: "relative" },
  previewImg:     { width: "100%", height: "100%" },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  previewTag:     { position: "absolute", top: 10, right: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  previewTagTxt:  { fontSize: 10, fontWeight: "800" },
  previewContent: { position: "absolute", bottom: 12, left: 12, right: 12 },
  previewTitle:   { color: WHITE, fontSize: 17, fontWeight: "900", marginBottom: 3 },
  previewSub:     { color: "rgba(255,255,255,0.85)", fontSize: 11, marginBottom: 8 },
  previewCta:     { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  previewCtaTxt:  { color: WHITE, fontSize: 12, fontWeight: "700" },

  // Image picker
  imgPickerBtn:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 10, marginBottom: 6 },
  imgPickerThumb: { width: 52, height: 36, borderRadius: 8 },
  imgPickerLabel: { fontSize: 13, fontWeight: "700", color: TXT, marginBottom: 2 },
  imgPickerSub:   { fontSize: 10, color: TXT3 },

  imgGrid:         { flexDirection: "row", flexWrap: "wrap" as const, gap: 8, marginBottom: 6 },
  imgGridItem:     { width: (SW - 36 - 48) / 3, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent", position: "relative" },
  imgGridItemActive: { borderColor: ACCENT },
  imgGridThumb:    { width: "100%", height: 54 },
  imgGridCheck:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(79,124,255,0.55)", alignItems: "center", justifyContent: "center" },
  imgGridLabel:    { fontSize: 9, color: TXT2, fontWeight: "600", paddingHorizontal: 4, paddingVertical: 3, backgroundColor: WHITE, textAlign: "center" as const },

  // Colors
  colorGrid:     { flexDirection: "row", flexWrap: "wrap" as const, gap: 8, marginBottom: 6 },
  colorDot:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  colorDotActive:{ borderWidth: 3, borderColor: TXT },

  // Fields
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: TXT2, marginBottom: 5 },
  fieldInput: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10, color: TXT, fontSize: 13 },

  dateRow:     { flexDirection: "row", gap: 10, marginBottom: 8 },
  dateInput:   { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 10 },
  dateInputTxt:{ flex: 1, color: TXT, fontSize: 13 },

  chipRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" as const, marginBottom: 6 },
  chip:        { borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive:  { borderColor: TXT },
  chipTxt:     { fontSize: 12, fontWeight: "600", color: TXT3 },

  activeRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginVertical: 8 },
  activeLabel: { fontSize: 13, fontWeight: "700", color: TXT, marginBottom: 2 },
  activeSub:   { fontSize: 11, color: TXT3 },
  toggle:      { width: 48, height: 27, borderRadius: 14, justifyContent: "center", padding: 2 },
  toggleOn:    { backgroundColor: "#22c55e" },
  toggleOff:   { backgroundColor: "#e2e8f0" },
  toggleThumb: { width: 23, height: 23, borderRadius: 12, backgroundColor: WHITE, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleThumbOn:  { alignSelf: "flex-end" },
  toggleThumbOff: { alignSelf: "flex-start" },

  saveBtn:    { height: 52, borderRadius: 14, backgroundColor: ACCENT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 },
  saveBtnTxt: { color: WHITE, fontWeight: "700", fontSize: 15 },
});