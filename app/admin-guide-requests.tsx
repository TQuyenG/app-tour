/**
 * admin-guide-requests.tsx
 * Admin xem và phê duyệt / từ chối yêu cầu Guest → HDV
 * Đọc @pending_guide_requests, hiện chi tiết, ghi kết quả
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { approveGuideRequest, getPendingGuideRequests, rejectGuideRequest, type GuideRequest } from '@/constants/app-accounts';

export default function AdminGuideRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<GuideRequest[]>([]);
  const [filter,   setFilter]   = useState<'all'|'pending'|'approved'|'rejected'>('pending');
  const [detail,   setDetail]   = useState<GuideRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  useFocusEffect(useCallback(() => {
    getPendingGuideRequests().then(setRequests);
  }, []));

  const visible = requests.filter(r => filter === 'all' || r.status === filter);

  const onApprove = (req: GuideRequest) => {
    Alert.alert('Phê duyệt', `Xác nhận phê duyệt ${req.name} làm HDV?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Duyệt', onPress: async () => {
        await approveGuideRequest(req.id);
        getPendingGuideRequests().then(setRequests);
        setDetail(null);
        Alert.alert('Đã phê duyệt', `${req.name} đã có thêm quyền Hướng dẫn viên.`);
      }},
    ]);
  };

  const onReject = async () => {
    if (!detail) return;
    await rejectGuideRequest(detail.id, rejectNote.trim() || 'Không đáp ứng yêu cầu');
    getPendingGuideRequests().then(setRequests);
    setRejectModal(false); setDetail(null); setRejectNote('');
  };

  const statusMeta = (s: string) => ({
    pending:  { label: 'Chờ duyệt',   color: '#d97706', bg: '#fff8ec' },
    approved: { label: 'Đã duyệt',    color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: 'Đã từ chối',  color: '#ef4444', bg: '#fff5f5' },
  } as any)[s] ?? { label: s, color: '#7a8cc2', bg: '#f3f7ff' };

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r=>r.status==='pending').length,
    approved: requests.filter(r=>r.status==='approved').length,
    rejected: requests.filter(r=>r.status==='rejected').length,
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.content, { paddingTop: insets.top + 14, paddingBottom: 40 }]}>
      <TouchableOpacity style={st.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#4f7cff"/>
        <Text style={st.backTxt}>Admin</Text>
      </TouchableOpacity>

      <Text style={st.title}>Yêu cầu đăng ký HDV</Text>
      <Text style={st.sub}>Xét duyệt khách muốn trở thành Hướng dẫn viên</Text>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {(['pending','approved','rejected','all'] as const).map(f => (
          <TouchableOpacity key={f} style={[st.filterChip, filter === f && st.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[st.filterTxt, filter === f && { color: '#fff' }]}>
              {f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : f === 'rejected' ? 'Từ chối' : 'Tất cả'}
              {counts[f] > 0 && ` (${counts[f]})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {visible.length === 0 && (
        <View style={st.emptyCard}>
          <Ionicons name="clipboard-outline" size={48} color="#c0cbe8"/>
          <Text style={st.emptyTxt}>Không có yêu cầu {filter === 'pending' ? 'đang chờ' : ''}.</Text>
        </View>
      )}

      {visible.map(req => {
        const meta = statusMeta(req.status);
        return (
          <TouchableOpacity key={req.id} style={st.card} onPress={() => setDetail(req)}>
            <View style={st.cardLeft}>
              <View style={st.avatar}><Ionicons name="person" size={20} color="#fff"/></View>
            </View>
            <View style={st.cardBody}>
              <View style={st.cardTop}>
                <Text style={st.cardName}>{req.name}</Text>
                <View style={[st.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[st.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={st.cardMeta}>{req.email} · {req.phone}</Text>
              <Text style={st.cardSkills}>Kỹ năng: {req.skills}</Text>
              <Text style={st.cardDate}>{new Date(req.createdAt).toLocaleDateString('vi-VN')}</Text>
              {req.status === 'pending' && (
                <View style={st.actionRow}>
                  <TouchableOpacity style={st.approveBtn} onPress={() => onApprove(req)}>
                    <Ionicons name="checkmark-outline" size={14} color="#16a34a"/>
                    <Text style={[st.actionBtnTxt, { color: '#16a34a' }]}>Phê duyệt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.rejectBtn} onPress={() => { setDetail(req); setRejectModal(true); }}>
                    <Ionicons name="close-outline" size={14} color="#ef4444"/>
                    <Text style={[st.actionBtnTxt, { color: '#ef4444' }]}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Detail Modal */}
      <Modal visible={!!detail && !rejectModal} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={st.modalOverlay}>
          <TouchableOpacity style={st.modalBackdrop} activeOpacity={1} onPress={() => setDetail(null)}/>
          <View style={st.modalSheet}>
            <View style={st.modalHandle}/>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Chi tiết yêu cầu</Text>
              <TouchableOpacity style={st.closeBtn} onPress={() => setDetail(null)}>
                <Ionicons name="close" size={20} color="#7a8cc2"/>
              </TouchableOpacity>
            </View>
            {detail && (
              <ScrollView contentContainerStyle={st.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={st.detailName}>{detail.name}</Text>
                <View style={st.detailRow}><Text style={st.detailLbl}>Email</Text><Text style={st.detailVal}>{detail.email}</Text></View>
                <View style={st.detailRow}><Text style={st.detailLbl}>SĐT</Text><Text style={st.detailVal}>{detail.phone}</Text></View>
                <View style={st.detailRow}><Text style={st.detailLbl}>Kinh nghiệm</Text><Text style={st.detailVal}>{detail.experience}</Text></View>
                <View style={st.detailRow}><Text style={st.detailLbl}>Kỹ năng</Text><Text style={st.detailVal}>{detail.skills}</Text></View>
                <View style={st.detailRow}><Text style={st.detailLbl}>Ngôn ngữ</Text><Text style={st.detailVal}>{detail.languages}</Text></View>
                <Text style={st.detailLbl}>Giới thiệu</Text>
                <View style={st.bioBox}><Text style={st.bioTxt}>{detail.bio}</Text></View>
                {detail.status === 'pending' && (
                  <View style={st.modalActions}>
                    <TouchableOpacity style={st.modalApproveBtn} onPress={() => onApprove(detail)}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff"/>
                      <Text style={{ color:'#fff',fontWeight:'700',fontSize:14 }}>Phê duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.modalRejectBtn} onPress={() => setRejectModal(true)}>
                      <Ionicons name="close-circle-outline" size={18} color="#ef4444"/>
                      <Text style={{ color:'#ef4444',fontWeight:'700',fontSize:14 }}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ height: 24 }}/>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject reason modal */}
      <Modal visible={rejectModal} animationType="fade" transparent onRequestClose={() => setRejectModal(false)}>
        <View style={st.modalOverlay}>
          <View style={st.rejectModalBox}>
            <Text style={st.rejectModalTitle}>Lý do từ chối</Text>
            <TextInput style={st.rejectInput} placeholder="Nhập lý do (tùy chọn)..." multiline numberOfLines={3} textAlignVertical="top" value={rejectNote} onChangeText={setRejectNote} placeholderTextColor="#b0bdd8"/>
            <View style={st.rejectBtnRow}>
              <TouchableOpacity style={st.rejectCancelBtn} onPress={() => setRejectModal(false)}>
                <Text style={{ color:'#7a8cc2',fontWeight:'600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.rejectConfirmBtn} onPress={onReject}>
                <Text style={{ color:'#fff',fontWeight:'700' }}>Xác nhận từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f3f7ff'},content:{padding:18},
  backRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:12},backTxt:{color:'#4f7cff',fontWeight:'600'},
  title:{color:'#1f2a58',fontSize:24,fontWeight:'700',marginBottom:4},sub:{color:'#7a8cc2',marginBottom:16},
  filterRow:{gap:8,marginBottom:16},
  filterChip:{borderRadius:999,borderWidth:1,borderColor:'#dfe7ff',backgroundColor:'#fff',paddingVertical:8,paddingHorizontal:14},
  filterChipActive:{backgroundColor:'#4f7cff',borderColor:'#4f7cff'},
  filterTxt:{color:'#6c7fb7',fontWeight:'600',fontSize:13},
  emptyCard:{alignItems:'center',gap:10,paddingVertical:40},emptyTxt:{color:'#7a8cc2'},
  card:{flexDirection:'row',gap:12,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:10},
  cardLeft:{},avatar:{width:44,height:44,borderRadius:12,backgroundColor:'#4f7cff',alignItems:'center',justifyContent:'center'},
  cardBody:{flex:1},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  cardName:{color:'#1f2a58',fontWeight:'700',fontSize:15},
  statusBadge:{borderRadius:8,paddingHorizontal:8,paddingVertical:3},statusTxt:{fontSize:11,fontWeight:'700'},
  cardMeta:{color:'#7a8cc2',fontSize:12,marginBottom:3},cardSkills:{color:'#5f73a9',fontSize:12,marginBottom:3},cardDate:{color:'#c0cbe8',fontSize:11},
  actionRow:{flexDirection:'row',gap:10,marginTop:10},
  approveBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#f0fdf4',borderRadius:8,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'#bbf7d0'},
  rejectBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#fff5f5',borderRadius:8,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'#fecaca'},
  actionBtnTxt:{fontWeight:'700',fontSize:12},
  modalOverlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(10,18,50,0.45)'},
  modalBackdrop:{position:'absolute',top:0,left:0,right:0,bottom:0},
  modalSheet:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'85%'},
  modalHandle:{width:40,height:4,backgroundColor:'#e4ebff',borderRadius:2,alignSelf:'center',marginTop:12},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#f0f4ff'},
  modalTitle:{fontSize:17,fontWeight:'800',color:'#1f2a58'},
  closeBtn:{width:32,height:32,borderRadius:10,backgroundColor:'#f3f7ff',alignItems:'center',justifyContent:'center'},
  modalBody:{padding:20},
  detailName:{color:'#1f2a58',fontWeight:'800',fontSize:18,marginBottom:16},
  detailRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#f0f4ff'},
  detailLbl:{color:'#7a8cc2',fontSize:13},detailVal:{color:'#1f2a58',fontWeight:'600',fontSize:13,flex:1,textAlign:'right'},
  bioBox:{backgroundColor:'#f3f7ff',borderRadius:12,padding:12,marginTop:8,marginBottom:14},bioTxt:{color:'#5f73a9',lineHeight:20},
  modalActions:{flexDirection:'row',gap:12,marginTop:8},
  modalApproveBtn:{flex:1,height:48,borderRadius:12,backgroundColor:'#16a34a',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  modalRejectBtn:{flex:1,height:48,borderRadius:12,borderWidth:1.5,borderColor:'#fecaca',backgroundColor:'#fff5f5',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  rejectModalBox:{backgroundColor:'#fff',borderRadius:20,margin:24,padding:20},
  rejectModalTitle:{color:'#1f2a58',fontWeight:'700',fontSize:17,marginBottom:14},
  rejectInput:{backgroundColor:'#f3f7ff',borderRadius:12,borderWidth:1,borderColor:'#e4ebff',padding:12,color:'#1f2a58',minHeight:80},
  rejectBtnRow:{flexDirection:'row',gap:12,marginTop:16},
  rejectCancelBtn:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:'#e4ebff',alignItems:'center',justifyContent:'center'},
  rejectConfirmBtn:{flex:1,height:44,borderRadius:12,backgroundColor:'#ef4444',alignItems:'center',justifyContent:'center'},
});