/**
 * app/(tabs)/explore.tsx
 * Siêu Trung Tâm Tìm Kiếm - AI Smart Search & Bộ lọc sâu (Tour + HDV)
 * ĐÃ CẬP NHẬT: Thêm tính năng Popup hiển thị Đánh giá Công khai khi bấm vào icon Sao
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@/constants/storage-helper';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { 
  Image, ScrollView, StatusBar, StyleSheet, Text, 
  TextInput, TouchableOpacity, View, useWindowDimensions, 
  ActivityIndicator, Modal 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuestExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.2);
  const s = useMemo(() => getStyles(scale), [scale]);

  const [activeTab, setActiveTab] = useState<'tours' | 'guides'>('tours');
  const [loading, setLoading] = useState(true);
  const [aiQuery, setAiQuery] = useState('');
  
  // Data States
  const [allTours, setAllTours] = useState<any[]>([]);
  const [allGuides, setAllGuides] = useState<any[]>([]);
  const [guideSchedules, setGuideSchedules] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]); // Kho chứa Review

  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'Tất cả', language: 'Tất cả', hobby: 'Tất cả', experience: 'Tất cả', isLocal: false, isAvailable: false
  });

  // Public Review States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [publicReviews, setPublicReviews] = useState<any[]>([]);
  const [reviewTargetName, setReviewTargetName] = useState("");

  const CATEGORIES = ["Tất cả", "Biển đảo", "Núi rừng", "Văn hóa", "Nghỉ dưỡng"];
  const LANGUAGES = ["Tất cả", "Tiếng Việt", "Tiếng Anh", "Tiếng Trung"];
  const HOBBIES = ["Tất cả", "Leo núi", "Chụp ảnh", "Ẩm thực", "Lặn biển"];

  useFocusEffect(useCallback(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [tRaw, gRaw, sRaw, rRaw] = await Promise.all([
          AsyncStorage.getItem('@app_tours'),
          AsyncStorage.getItem('@app_guides'),
          AsyncStorage.getItem('@guide_schedule'),
          AsyncStorage.getItem('@app_reviews')
        ]);

        if (tRaw) setAllTours(JSON.parse(tRaw).filter((t: any) => t.status === 'active'));
        if (gRaw) setAllGuides(JSON.parse(gRaw));
        if (sRaw) setGuideSchedules(JSON.parse(sRaw));
        if (rRaw) setAllReviews(JSON.parse(rRaw));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []));

  const isGuideBusy = useCallback((guideId: string) => {
    return guideSchedules.some(sch => sch.guideId === guideId && sch.type === 'tour');
  }, [guideSchedules]);

  // HÀM MỞ POPUP ĐÁNH GIÁ CÔNG KHAI
  const openPublicReviews = (type: 'tour' | 'guide', targetId: string, targetName: string) => {
    const targetReviews = allReviews.filter(r => {
        if (r.isHidden) return false; // Không hiển thị những đánh giá đã bị Staff ẩn
        if (type === 'tour') return r.tourId === targetId || r.tourName === targetName;
        if (type === 'guide') return r.guideId === targetId || r.guideName === targetName;
        return false;
    });
    setPublicReviews(targetReviews);
    setReviewTargetName(targetName);
    setShowReviewModal(true);
  };

  const filteredResults = useMemo(() => {
    const query = aiQuery.toLowerCase().trim().replace(/[.,]/g, '');
    const keywords = query.split(/\s+/).filter(k => k.length > 0);

    const validGuides = allGuides.filter(g => {
      const content = `${g.name} ${g.location} ${(g.skills||[]).join(' ')} ${g.bio} ${(g.languages||[]).join(' ')} ${(g.hobbies||[]).join(' ')}`.toLowerCase();
      const matchAI = keywords.every(k => content.includes(k));
      const matchLang = filters.language === 'Tất cả' || g.languages?.includes(filters.language);
      const matchHobby = filters.hobby === 'Tất cả' || (g.hobbies && g.hobbies.includes(filters.hobby)) || (g.skills && g.skills.includes(filters.hobby));
      const matchLocal = !filters.isLocal || g.isLocal === true;
      const matchAvailable = !filters.isAvailable || !isGuideBusy(g.id);
      return matchAI && matchLang && matchHobby && matchLocal && matchAvailable;
    });

    const validTours = allTours.filter(t => {
      const content = `${t.name} ${t.departure} ${t.category} ${t.description}`.toLowerCase();
      const matchAI = keywords.every(k => content.includes(k));
      const matchCat = filters.category === 'Tất cả' || t.category === filters.category;
      const hasMatchingGuide = validGuides.some(g =>
        g.location?.toLowerCase().includes(t.departure?.toLowerCase()) ||
        t.departure?.toLowerCase().includes(g.location?.toLowerCase())
      );
      const isGuideFilterActive = filters.language !== 'Tất cả' || filters.hobby !== 'Tất cả' || filters.isLocal || filters.isAvailable;
      return matchAI && matchCat && (!isGuideFilterActive || hasMatchingGuide);
    });

    return { tours: validTours, guides: validGuides };
  }, [aiQuery, allTours, allGuides, filters, isGuideBusy]);

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color="#4f7cff" /></View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.header, { paddingTop: insets.top + Math.round(14 * scale) }]}>
        <Text style={s.title}>Khám phá</Text>
        
        <View style={s.aiSearchContainer}>
          <View style={s.aiSearchBox}>
             <Ionicons name="sparkles" size={20} color="#f59e0b" />
             <TextInput 
               style={s.aiSearchInput} 
               placeholder="Bạn muốn đi đâu? Với ai? (VD: Đà Lạt leo núi...)" 
               placeholderTextColor="#94a3b8" 
               value={aiQuery} 
               onChangeText={setAiQuery}
             />
             {aiQuery.length > 0 && (
               <TouchableOpacity onPress={() => setAiQuery('')}><Ionicons name="close-circle" size={18} color="#cbd5e1" /></TouchableOpacity>
             )}
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilterModal(true)}>
             <Ionicons name="options-outline" size={22} color="#4f7cff" />
          </TouchableOpacity>
        </View>

        <View style={s.tabContainer}>
           <TouchableOpacity style={[s.tabBtn, activeTab === 'tours' && s.tabActive]} onPress={() => setActiveTab('tours')}>
             <Text style={[s.tabTxt, activeTab === 'tours' && s.tabTxtActive]}>Tours ({filteredResults.tours.length})</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[s.tabBtn, activeTab === 'guides' && s.tabActive]} onPress={() => setActiveTab('guides')}>
             <Text style={[s.tabTxt, activeTab === 'guides' && s.tabTxtActive]}>HDV ({filteredResults.guides.length})</Text>
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'tours' ? (
          filteredResults.tours.map(t => (
            <TouchableOpacity key={t.id} style={s.tourCard} onPress={() => router.push({ pathname: '/tour/[id]', params: { id: t.id } })}>
              <Image source={{ uri: t.image || 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600' }} style={s.tourImg} />
              <View style={s.tourBody}>
                <Text style={s.tourName} numberOfLines={2}>{t.name}</Text>
                <View style={s.metaRow}>
                   <Ionicons name="location" size={12} color="#7a8cc2"/>
                   <Text style={s.tourMeta}>{t.departure} · {t.duration}</Text>
                </View>
                <View style={s.priceRow}>
                   <Text style={s.tourPrice}>{(t.priceRaw || 0).toLocaleString('vi-VN')}đ</Text>
                   
                   {/* BẤM VÀO ĐÂY ĐỂ HIỆN REVIEW */}
                   <TouchableOpacity style={s.ratingBadge} onPress={(e) => { e.stopPropagation(); openPublicReviews('tour', t.id, t.name); }}>
                      <Ionicons name="star" size={10} color="#f59e0b"/>
                      <Text style={s.ratingText}>{t.rating}</Text>
                   </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          filteredResults.guides.map(g => {
            const isBusy = isGuideBusy(g.id);
            return (
              <TouchableOpacity key={g.id} style={s.guideCard} onPress={() => router.push({ pathname: '/public-guide-profile', params: { id: g.id } })}>
                <View style={s.guideHeader}>
                  <Image source={{ uri: g.avatar || g.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={s.guideAvatar} />
                  <View style={s.guideInfo}>
                    <View style={s.guideNameRow}>
                      <Text style={s.guideName}>{g.name}</Text>
                      {g.isLocal && <View style={s.localTag}><Text style={s.localTagTxt}>Địa phương</Text></View>}
                    </View>
                    <Text style={s.guideLocTxt}><Ionicons name="location" size={12}/> {g.location} · {g.experience || '1 năm'}</Text>
                  </View>
                  <View style={[s.statusDot, { backgroundColor: isBusy ? '#ef4444' : '#10b981' }]} />
                </View>
                
                <View style={s.skillRow}>
                  {(g.skills || []).concat(g.hobbies || []).slice(0, 3).map((skill: string, i: number) => (
                    <View key={i} style={s.skillTag}><Text style={s.skillTagTxt}>{skill}</Text></View>
                  ))}
                </View>

                <View style={s.guideFooter}>
                   {/* BẤM VÀO ĐÂY ĐỂ HIỆN REVIEW */}
                   <TouchableOpacity style={s.footerStat} onPress={(e) => { e.stopPropagation(); openPublicReviews('guide', g.id, g.name); }}>
                      <Ionicons name="star" size={14} color="#f59e0b"/>
                      <Text style={s.statVal}>{g.rating || '5.0'} (Xem nhận xét)</Text>
                   </TouchableOpacity>
                   
                   <View style={s.footerStat}><Ionicons name="chatbubble-ellipses" size={14} color="#4f7cff"/><Text style={s.statVal}>{(g.languages || ['Tiếng Việt'])[0]}</Text></View>
                   <Text style={[s.availabilityTxt, { color: isBusy ? '#ef4444' : '#10b981' }]}>
                     {isBusy ? 'Đang bận tour' : 'Trống lịch'}
                   </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {(activeTab === 'tours' && filteredResults.tours.length === 0) || (activeTab === 'guides' && filteredResults.guides.length === 0) ? (
          <View style={s.emptyState}>
             <Ionicons name="search-outline" size={60} color="#cbd5e1" />
             <Text style={s.emptyTitle}>Không tìm thấy kết quả</Text>
             <Text style={s.emptySub}>Thử thay đổi từ khóa AI hoặc nới lỏng bộ lọc bạn nhé.</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* MODAL BỘ LỌC CHUYÊN SÂU */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
         <View style={s.modalOverlay}>
            <View style={s.filterSheet}>
               <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Bộ lọc nâng cao</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color="#1f2a58"/></TouchableOpacity>
               </View>

               <ScrollView style={s.filterBody} showsVerticalScrollIndicator={false}>
                  <Text style={s.filterLabel}>Loại hình Tour</Text>
                  <View style={s.chipContainer}>
                    {CATEGORIES.map(c => (
                      <TouchableOpacity key={c} style={[s.chip, filters.category === c && s.chipActive]} onPress={() => setFilters({...filters, category: c})}>
                        <Text style={[s.chipTxt, filters.category === c && s.chipTxtActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.filterLabel}>Ngôn ngữ HDV</Text>
                  <View style={s.chipContainer}>
                    {LANGUAGES.map(l => (
                      <TouchableOpacity key={l} style={[s.chip, filters.language === l && s.chipActive]} onPress={() => setFilters({...filters, language: l})}>
                        <Text style={[s.chipTxt, filters.language === l && s.chipTxtActive]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.filterLabel}>Sở thích & Kỹ năng đặc biệt</Text>
                  <View style={s.chipContainer}>
                    {HOBBIES.map(h => (
                      <TouchableOpacity key={h} style={[s.chip, filters.hobby === h && s.chipActive]} onPress={() => setFilters({...filters, hobby: h})}>
                        <Text style={[s.chipTxt, filters.hobby === h && s.chipTxtActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={s.switchRow}>
                     <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={s.filterLabelMargin}>Ưu tiên HDV địa phương</Text>
                        <Text style={s.switchSub}>Tìm người bản địa am hiểu văn hóa vùng miền</Text>
                     </View>
                     <TouchableOpacity onPress={() => setFilters({...filters, isLocal: !filters.isLocal})}>
                        <Ionicons name={filters.isLocal ? "checkbox" : "square-outline"} size={28} color="#4f7cff" />
                     </TouchableOpacity>
                  </View>

                  <View style={s.switchRow}>
                     <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={s.filterLabelMargin}>Chỉ tìm HDV Trống Lịch</Text>
                        <Text style={s.switchSub}>Lọc ra các HDV đang rảnh, sẵn sàng nhận tour ngay lập tức</Text>
                     </View>
                     <TouchableOpacity onPress={() => setFilters({...filters, isAvailable: !filters.isAvailable})}>
                        <Ionicons name={filters.isAvailable ? "checkbox" : "square-outline"} size={28} color="#10b981" />
                     </TouchableOpacity>
                  </View>
               </ScrollView>

               <View style={s.modalFooter}>
                  <TouchableOpacity style={s.resetBtn} onPress={() => setFilters({category:'Tất cả', language:'Tất cả', hobby:'Tất cả', experience:'Tất cả', isLocal: false, isAvailable: false})}>
                    <Text style={s.resetBtnTxt}>Xóa bộ lọc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilterModal(false)}>
                    <Text style={s.applyBtnTxt}>Áp dụng ({activeTab==='tours' ? filteredResults.tours.length : filteredResults.guides.length} kết quả)</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      {/* MODAL DANH SÁCH ĐÁNH GIÁ CÔNG KHAI */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
            <View style={s.reviewSheet}>
                <View style={s.modalHeader}>
                    <View>
                        <Text style={s.modalTitle}>Đánh giá cộng đồng</Text>
                        <Text style={s.modalSub}>{reviewTargetName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                        <Ionicons name="close-circle" size={28} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    {publicReviews.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Ionicons name="chatbubbles-outline" size={60} color="#e2e8f0" />
                            <Text style={{ color: '#64748b', marginTop: 10, fontWeight: '600' }}>Chưa có đánh giá nào cho mục này.</Text>
                        </View>
                    ) : (
                        publicReviews.map(r => (
                            <View key={r.id} style={s.publicReviewCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontWeight: '900', color: '#1f2a58', fontSize: 15 }}>{r.guestName || 'Khách hàng ẩn danh'}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="star" size={14} color="#f59e0b" />
                                        <Text style={{ fontWeight: '800', color: '#d97706' }}>{r.tourRating || r.overallRating || r.rating || 5}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>"{r.reviewText || r.comment || 'Trải nghiệm tuyệt vời'}"</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>{new Date(r.createdAt || Date.now()).toLocaleDateString('vi-VN')}</Text>
                                
                                {/* HIỂN THỊ PHẢN HỒI TỪ STAFF/ADMIN CHUYÊN NGHIỆP */}
                                {r.isReplied && r.replyText && (
                                    <View style={{ marginTop: 12, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#16a34a' }}>
                                        <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12, marginBottom: 4 }}>Phản hồi từ LocalMate:</Text>
                                        <Text style={{ color: '#15803d', fontSize: 13, lineHeight: 18 }}>{r.replyText}</Text>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (scale: number) => {
  const sz = (val: number) => Math.round(val * scale);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8faff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#fff', paddingHorizontal: sz(16), borderBottomWidth: 1, borderBottomColor: '#e4ebff' },
    title: { fontSize: sz(24), fontWeight: '900', color: '#1f2a58', marginBottom: sz(16) },
    
    aiSearchContainer: { flexDirection: 'row', gap: sz(10), marginBottom: sz(16), alignItems: 'center' },
    aiSearchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf8f6', borderRadius: sz(16), paddingHorizontal: sz(14), paddingVertical: sz(12), borderWidth: 1, borderColor: '#fef3c7' },
    aiSearchInput: { flex: 1, marginLeft: sz(8), fontSize: sz(13), color: '#1f2a58' },
    filterBtn: { width: sz(48), height: sz(48), borderRadius: sz(16), backgroundColor: '#eaf0ff', alignItems: 'center', justifyContent: 'center' },

    tabContainer: { flexDirection: 'row', gap: sz(10), marginBottom: sz(-1) },
    tabBtn: { flex: 1, paddingVertical: sz(14), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#4f7cff' },
    tabTxt: { fontSize: sz(14), fontWeight: '700', color: '#94a3b8' },
    tabTxtActive: { color: '#4f7cff' },

    content: { padding: sz(16), paddingBottom: sz(100) },
    
    tourCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: sz(16), overflow: 'hidden', marginBottom: sz(12), elevation: 3, borderWidth: 1, borderColor: '#e4ebff' },
    tourImg: { width: sz(100), height: '100%' },
    tourBody: { flex: 1, padding: sz(12) },
    tourName: { fontSize: sz(14), fontWeight: '800', color: '#1f2a58', marginBottom: sz(4) },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: sz(4), marginBottom: sz(8) },
    tourMeta: { fontSize: sz(12), color: '#7a8cc2' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tourPrice: { fontSize: sz(16), fontWeight: '900', color: '#10b981' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: sz(2), backgroundColor: '#fef3c7', paddingHorizontal: sz(6), paddingVertical: sz(2), borderRadius: sz(6), borderWidth: 1, borderColor: '#fde68a' },
    ratingText: { fontSize: sz(10), fontWeight: '800', color: '#d97706' },

    guideCard: { backgroundColor: '#fff', padding: sz(16), borderRadius: sz(20), marginBottom: sz(12), elevation: 3, borderWidth: 1, borderColor: '#e4ebff' },
    guideHeader: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
    guideAvatar: { width: sz(54), height: sz(54), borderRadius: sz(16), marginRight: sz(12) },
    guideInfo: { flex: 1 },
    guideNameRow: { flexDirection: 'row', alignItems: 'center', gap: sz(6) },
    guideName: { fontSize: sz(16), fontWeight: '800', color: '#1f2a58' },
    localTag: { backgroundColor: '#dcfce7', paddingHorizontal: sz(6), paddingVertical: sz(2), borderRadius: sz(4) },
    localTagTxt: { fontSize: sz(9), fontWeight: '800', color: '#10b981' },
    guideLocTxt: { fontSize: sz(12), color: '#7a8cc2', marginTop: sz(2) },
    statusDot: { width: sz(12), height: sz(12), borderRadius: sz(6), position: 'absolute', top: 0, right: 0, borderWidth: 2, borderColor: '#fff' },

    skillRow: { flexDirection: 'row', gap: sz(6), marginTop: sz(12), flexWrap: 'wrap' },
    skillTag: { backgroundColor: '#f1f5f9', paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(8) },
    skillTagTxt: { fontSize: sz(11), color: '#64748b', fontWeight: '600' },

    guideFooter: { flexDirection: 'row', alignItems: 'center', marginTop: sz(12), paddingTop: sz(12), borderTopWidth: 1, borderTopColor: '#f0f4ff', gap: sz(15) },
    footerStat: { flexDirection: 'row', alignItems: 'center', gap: sz(4), backgroundColor: '#f8faff', paddingHorizontal: sz(8), paddingVertical: sz(4), borderRadius: sz(8), borderWidth: 1, borderColor: '#e4ebff' },
    statVal: { fontSize: sz(13), fontWeight: '700', color: '#1f2a58' },
    availabilityTxt: { marginLeft: 'auto', fontSize: sz(12), fontWeight: '800' },

    emptyState: { alignItems: 'center', marginTop: sz(60) },
    emptyTitle: { fontSize: sz(18), fontWeight: '800', color: '#1f2a58', marginTop: sz(16) },
    emptySub: { fontSize: sz(14), color: '#94a3b8', textAlign: 'center', marginTop: sz(8), paddingHorizontal: sz(40), lineHeight: sz(20) },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,18,50,0.6)', justifyContent: 'flex-end' },
    filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: sz(28), borderTopRightRadius: sz(28), padding: sz(20), maxHeight: '90%' },
    reviewSheet: { backgroundColor: '#f8faff', borderTopLeftRadius: sz(28), borderTopRightRadius: sz(28), maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: sz(20), borderBottomWidth: 1, borderBottomColor: '#e4ebff', backgroundColor: '#fff', borderTopLeftRadius: sz(28), borderTopRightRadius: sz(28) },
    modalTitle: { fontSize: sz(18), fontWeight: '900', color: '#1f2a58' },
    modalSub: { fontSize: sz(13), color: '#64748b', marginTop: sz(2) },
    
    publicReviewCard: { backgroundColor: '#fff', padding: sz(16), borderRadius: sz(16), marginBottom: sz(14), borderWidth: 1, borderColor: '#e4ebff', elevation: 1 },

    filterBody: { marginBottom: sz(20) },
    filterLabel: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58', marginBottom: sz(12), marginTop: sz(12) },
    filterLabelMargin: { fontSize: sz(15), fontWeight: '800', color: '#1f2a58' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: sz(8) },
    chip: { paddingHorizontal: sz(14), paddingVertical: sz(8), borderRadius: sz(12), backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#4f7cff', borderColor: '#4f7cff' },
    chipTxt: { fontSize: sz(13), color: '#64748b', fontWeight: '600' },
    chipTxtActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: sz(20), paddingVertical: sz(12), borderTopWidth: 1, borderTopColor: '#f0f4ff' },
    switchSub: { fontSize: sz(12), color: '#94a3b8', marginTop: sz(4), lineHeight: sz(18) },
    modalFooter: { flexDirection: 'row', gap: sz(12), paddingTop: sz(12) },
    resetBtn: { flex: 1, paddingVertical: sz(14), alignItems: 'center', borderRadius: sz(14), backgroundColor: '#f1f5f9' },
    resetBtnTxt: { fontWeight: '800', color: '#64748b', fontSize: sz(15) },
    applyBtn: { flex: 2, paddingVertical: sz(14), alignItems: 'center', borderRadius: sz(14), backgroundColor: '#4f7cff' },
    applyBtnTxt: { fontWeight: '800', color: '#fff', fontSize: sz(15) }
  });
};