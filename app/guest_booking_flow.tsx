/**
 * guest_booking_flow.tsx  –  Luồng đặt tour đầy đủ
 *
 * Entry A – Chọn TOUR trước  →  Chọn HDV  →  Dịch vụ  →  Thanh toán
 * Entry B – Chọn HDV trước   →  Chọn Tour →  Dịch vụ  →  Thanh toán
 *
 * Steps 0-8:
 *   0: Xem tour / Xem HDV
 *   1: Chọn HDV / Chọn Tour
 *   2: Dịch vụ thêm
 *   3: Thanh toán (escrow)
 *   4: Chờ HDV xác nhận (+ QR vé + countdown 15ph)
 *   5: Chat 2 bên + nhắc lịch
 *   6: Check-in QR tại điểm hẹn
 *   7: On-Tour  (GPS + AI sức khỏe LSTM + bảo hiểm)
 *   8: Đánh giá tour & HDV  →  Về trang chủ
 *
 * AsyncStorage keys:
 *   @guest_bookings      – khách ghi / đọc
 *   @app_tours           – tour list (admin CRUD)
 *   @app_guides          – guide list (admin CRUD)
 *   @guide_bookings      – HDV nhận booking
 *   @guide_notifications – thông báo HDV
 *   @guest_notifications – thông báo khách
 *   @admin_reports       – báo cáo admin
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────
type PayMethod  = 'card' | 'bank' | 'wallet';
type BookStatus = 'pending_guide'|'guide_accepted'|'guide_rejected'
                |'checked_in'|'on_tour'|'completed'|'cancelled';
interface AppTour  { id:string; name:string; category:string; departure:string; duration:string; date?:string; price:string; priceRaw?:number; rating:number; seatsLeft:number; color?:string; description?:string; assignedGuideIds?:string[]; }
interface AppGuide { id:string; name:string; location:string; experience:string; skills:string[]|string; rating:number; tours:number; match:number; status?:string; phone?:string; }
interface ChatMsg  { from:'guest'|'guide'; text:string; time:string; }
interface GuestBooking {
  id:string; tourId:string; tourName:string; tourDate:string; tourPrice:number;
  guideId:string; guideName:string; guidePhone:string; guests:number;
  servicesTotal:number; totalAmount:number; paymentMethod:PayMethod;
  status:BookStatus; createdAt:string; holdUntil:string; meetingPoint:string;
  services:{label:string;price:number}[]; checkInCode:string;
  messages:ChatMsg[];
}

// ─── Constants ────────────────────────────────────────────────
const ADDONS = [
  {id:'a1',icon:'car-outline'        as const,label:'Thuê xe máy',      price:150000,display:'150.000đ/ngày'},
  {id:'a2',icon:'camera-outline'     as const,label:'Thuê máy ảnh',     price:200000,display:'200.000đ/ngày'},
  {id:'a3',icon:'restaurant-outline' as const,label:'Bữa ăn đặc sản',  price:120000,display:'120.000đ/người'},
  {id:'a4',icon:'umbrella-outline'   as const,label:'Bảo hiểm du lịch', price:50000, display:'50.000đ/người'},
];
const TOUR_ROUTE = [
  {time:'08:15',place:'Khởi hành – Điểm tập hợp',done:true},
  {time:'09:45',place:'Điểm tham quan thứ nhất',done:true},
  {time:'11:30',place:'Điểm tham quan thứ hai',done:false},
  {time:'13:00',place:'Nghỉ trưa & ăn đặc sản',done:false},
  {time:'15:00',place:'Điểm cuối & kết thúc',done:false},
];
const STEP_LABELS_TOUR  = ['Chọn Tour','Chọn HDV','Dịch vụ','Thanh toán','Chờ xác nhận','Chat','Check-in','On-Tour','Đánh giá'];
const STEP_LABELS_GUIDE = ['Chọn HDV','Chọn Tour','Dịch vụ','Thanh toán','Chờ xác nhận','Chat','Check-in','On-Tour','Đánh giá'];
const fmt   = (n:number) => `${n.toLocaleString('vi-VN')}đ`;
const genId = () => `BK${Date.now().toString().slice(-7)}`;
const genQR = () => `CI-TG-${Math.floor(Math.random()*9000+1000)}`;
const nowStr= () => new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});

// ─── AsyncStorage helpers ─────────────────────────────────────
async function saveBk(bk:GuestBooking) {
  const raw=await AsyncStorage.getItem('@guest_bookings').catch(()=>null);
  const list:GuestBooking[]=raw?JSON.parse(raw):[];
  const idx=list.findIndex(x=>x.id===bk.id);
  idx>=0?list[idx]=bk:list.unshift(bk);
  await AsyncStorage.setItem('@guest_bookings',JSON.stringify(list)).catch(()=>{});
}
async function notifyGuide(bk:GuestBooking){
  const raw=await AsyncStorage.getItem('@guide_bookings').catch(()=>null);
  const list=raw?JSON.parse(raw):[];
  list.unshift({id:bk.id,customerName:'Khách hàng',customerPhone:'---',tourName:bk.tourName,
    date:bk.tourDate,duration:'---',guests:bk.guests,price:String(bk.totalAmount),
    status:'pending',note:'',createdAt:'Vừa xong'});
  await AsyncStorage.setItem('@guide_bookings',JSON.stringify(list)).catch(()=>{});
  const nr=await AsyncStorage.getItem('@guide_notifications').catch(()=>null);
  const nl=nr?JSON.parse(nr):[];
  nl.unshift({id:`gn${Date.now()}`,type:'booking_new',title:`Booking mới: ${bk.tourName}`,
    body:`${bk.guests} khách · ${bk.tourDate} · ${fmt(bk.totalAmount)}`,time:'Vừa xong',read:false});
  await AsyncStorage.setItem('@guide_notifications',JSON.stringify(nl)).catch(()=>{});
}
async function notifyGuest(msg:string){
  const raw=await AsyncStorage.getItem('@guest_notifications').catch(()=>null);
  const list=raw?JSON.parse(raw):[];
  list.unshift({id:`n${Date.now()}`,message:msg,read:false,createdAt:new Date().toISOString()});
  await AsyncStorage.setItem('@guest_notifications',JSON.stringify(list)).catch(()=>{});
}
async function sendAdminReport(bk:GuestBooking,event:string){
  const raw=await AsyncStorage.getItem('@admin_reports').catch(()=>null);
  const list=raw?JSON.parse(raw):[];
  list.unshift({id:`rpt${Date.now()}`,bookingId:bk.id,event,tourName:bk.tourName,
    guideName:bk.guideName,amount:bk.totalAmount,at:new Date().toISOString()});
  await AsyncStorage.setItem('@admin_reports',JSON.stringify(list)).catch(()=>{});
}

// ─── Guide Picker Modal ───────────────────────────────────────
function GuidePickerModal({visible,guides,selected,onClose,onSelect}:
  {visible:boolean;guides:AppGuide[];selected:AppGuide|null;onClose:()=>void;onSelect:(g:AppGuide)=>void}){
  const skills=(g:AppGuide):string[]=>Array.isArray(g.skills)?g.skills as string[]:typeof g.skills==='string'?(g.skills as string).split(',').map(s=>s.trim()):[];
  return(
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={onClose}/>
        <View style={s.modalSheet}>
          <View style={s.modalHandle}/>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Chọn Hướng dẫn viên</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2"/></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:16}} showsVerticalScrollIndicator={false}>
            <Text style={s.modalHint}>💡 AI sắp xếp theo độ phù hợp cao nhất (Smart Matching)</Text>
            {guides.length===0&&<View style={{alignItems:'center',paddingVertical:32}}><Ionicons name="people-outline" size={48} color="#c0cbe8"/><Text style={{color:'#7a8cc2',marginTop:8}}>Chưa có HDV. Admin cần thêm trước.</Text></View>}
            {guides.map(g=>{
              const busy=g.status==='busy'; const sel=selected?.id===g.id;
              return(
                <TouchableOpacity key={g.id} style={[s.guidePickCard,busy&&{opacity:0.4},sel&&{borderColor:'#4f7cff',backgroundColor:'#edf2ff'}]}
                  onPress={()=>!busy&&onSelect(g)} disabled={busy} activeOpacity={0.8}>
                  <View style={s.guideAvatar}><Ionicons name="person" size={18} color="#fff"/></View>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Text style={s.guidePickName}>{g.name}</Text>
                      {busy&&<View style={s.busyBadge}><Text style={s.busyTxt}>Đang bận</Text></View>}
                      {sel&&<Ionicons name="checkmark-circle" size={18} color="#4f7cff"/>}
                    </View>
                    <Text style={s.guidePickMeta}>{g.location} · {g.experience}</Text>
                    <View style={s.skillsRow}>{skills(g).slice(0,3).map(sk=><View key={sk} style={s.skillChip}><Text style={s.skillTxt}>{sk}</Text></View>)}</View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:6}}>
                      <Ionicons name="star" size={12} color="#f59e0b"/>
                      <Text style={{color:'#7a8cc2',fontSize:12}}>{g.rating}</Text>
                      <Text style={{color:'#c0cbe8'}}>·</Text>
                      <Text style={{color:'#7a8cc2',fontSize:12}}>{g.tours} tour</Text>
                      <View style={s.matchBadge}><Ionicons name="flash" size={11} color="#4f7cff"/><Text style={s.matchTxt}>{g.match}%</Text></View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{height:24}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tour Picker Modal ────────────────────────────────────────
function TourPickerModal({visible,tours,selected,onClose,onSelect}:
  {visible:boolean;tours:AppTour[];selected:AppTour|null;onClose:()=>void;onSelect:(t:AppTour)=>void}){
  return(
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={onClose}/>
        <View style={s.modalSheet}>
          <View style={s.modalHandle}/>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Chọn Tour</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Ionicons name="close" size={20} color="#7a8cc2"/></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:16}} showsVerticalScrollIndicator={false}>
            {tours.map(t=>{
              const sel=selected?.id===t.id;
              return(
                <TouchableOpacity key={t.id} style={[s.listCard,sel&&s.listCardSel]}
                  onPress={()=>onSelect(t)} activeOpacity={0.8}>
                  <View style={[s.listColorDot,{backgroundColor:t.color||'#99bbff'}]}/>
                  <View style={{flex:1}}>
                    <Text style={s.listName}>{t.name}</Text>
                    <Text style={s.listMeta}>{t.departure} · {t.duration}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:2}}>
                      <Ionicons name="star" size={11} color="#f59e0b"/>
                      <Text style={{color:'#7a8cc2',fontSize:11}}>{t.rating}</Text>
                      <Text style={{color:'#c0cbe8'}}>·</Text>
                      <Text style={{color:'#7a8cc2',fontSize:11}}>{t.seatsLeft} chỗ trống</Text>
                    </View>
                  </View>
                  <Text style={s.listPrice}>{t.price}</Text>
                  {sel&&<Ionicons name="checkmark-circle" size={18} color="#4f7cff" style={{marginLeft:6}}/>}
                </TouchableOpacity>
              );
            })}
            <View style={{height:24}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Row helper ───────────────────────────────────────────────
function Row({label,val,bold,highlight}:{label:string;val:string;bold?:boolean;highlight?:boolean}){
  return(
    <View style={s.rowWrap}>
      <Text style={s.rowLbl}>{label}</Text>
      <Text style={[s.rowVal,bold&&{fontWeight:'700'},highlight&&{color:'#4f7cff',fontSize:16}]}>{val}</Text>
    </View>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function GuestBookingFlow(){
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { bookingId, resumeStep } = useLocalSearchParams<{ bookingId: string; resumeStep: string }>();

  const [entryMode,setEntryMode]=useState<'tour'|'guide'>('tour');
  const [step,setStep]=useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string; type: string; value: number;
    minOrder: number; maxDiscount: number; desc: string; voucherId: string;
  } | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState("");
  const [tours,setTours]=useState<AppTour[]>([]);
  const [guides,setGuides]=useState<AppGuide[]>([]);
  const [loading,setLoading]=useState(true);
  const [selectedTour,setSelectedTour]=useState<AppTour|null>(null);
  const [selectedGuide,setSelectedGuide]=useState<AppGuide|null>(null);
  const [guideModal,setGuideModal]=useState(false);
  const [tourModal,setTourModal]=useState(false);
  const [selectedAddons,setSelectedAddons]=useState<string[]>([]);
  const [guests,setGuests]=useState(2);
  const [payMethod,setPayMethod]=useState<PayMethod>('card');
  const [booking,setBooking]=useState<GuestBooking|null>(null);
  const [holdSecs,setHoldSecs]=useState<number|null>(null);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const [chatInput,setChatInput]=useState('');
  const [guestScanned,setGuestScanned]=useState(false);
  const [guideOK,setGuideOK]=useState(false);
  // On-tour health
  const [heartRate,setHeartRate]=useState(78);
  const [stepCount,setStepCount]=useState(4200);
  const [hasAnomaly,setHasAnomaly]=useState(false);
  const [isTracking,setIsTracking]=useState(true);
  const [insureAlert,setInsureAlert]=useState(false);
  // Review
  const [overallRating,setOverallRating]=useState(5);
  const [reviewComment,setReviewComment]=useState('');
  const [reviewDone,setReviewDone]=useState(false);

  // Load data
  // Resume booking đang có nếu được truyền bookingId
  useEffect(() => {
    if (!bookingId) return;
    AsyncStorage.getItem('@guest_bookings').then(raw => {
      if (!raw) return;
      const list = JSON.parse(raw);
      const found = list.find((b: any) => b.id === bookingId);
      if (found) {
        setBooking(found);
        const s = resumeStep ? parseInt(resumeStep as string) : 4;
        setStep(s);
      }
    }).catch(() => {});
  }, [bookingId]);

  // Load data
  useEffect(()=>{
    Promise.all([
      AsyncStorage.getItem('@app_tours').catch(()=>null),
      AsyncStorage.getItem('@app_guides').catch(()=>null),
    ]).then(([tr,gr])=>{
      if(tr) setTours(JSON.parse(tr).filter((t:AppTour)=>t.seatsLeft>0));
      if(gr){
        let gs:AppGuide[]=JSON.parse(gr).filter((g:AppGuide)=>g.status!=='inactive')
          .map((g:AppGuide)=>({...g,skills:Array.isArray(g.skills)?g.skills:typeof g.skills==='string'?(g.skills as string).split(',').map((s:string)=>s.trim()):[] }));
        // Lọc HDV theo tour được phân công nếu đã chọn tour
        if(tr){
          const tourList = JSON.parse(tr);
          // Sẽ lọc lại khi user chọn tour — lưu toàn bộ vào guides trước
        }
        setGuides(gs);
      }
      setLoading(false);
    });
  },[]);

  // Countdown
  useEffect(()=>{
    if(!booking?.holdUntil||booking.status!=='pending_guide') return;
    timerRef.current=setInterval(()=>{
      const diff=Math.max(0,Math.floor((new Date(booking.holdUntil).getTime()-Date.now())/1000));
      setHoldSecs(diff);
      if(diff<=0){ clearInterval(timerRef.current!); const c={...booking,status:'cancelled' as BookStatus}; setBooking(c); saveBk(c); Alert.alert('Hết giờ','Booking đã bị hủy. Vui lòng đặt lại.'); }
    },1000);
    return()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[booking?.holdUntil]);

  const servicesTotal=selectedAddons.reduce((s,id)=>{const a=ADDONS.find(x=>x.id===id);return s+(a?.price||0);},0);
  const tourPrice=selectedTour?.priceRaw??(Number(String(selectedTour?.price||'0').replace(/[^0-9]/g,''))||0);
  const totalAmount=tourPrice*guests+servicesTotal;
  const discountAmount = appliedVoucher
    ? (() => {
        if ((totalAmount as number) < (appliedVoucher.minOrder || 0)) return 0;
        if (appliedVoucher.type === 'fixed') return Math.min(appliedVoucher.value, totalAmount as number);
        const pct = ((totalAmount as number) * appliedVoucher.value) / 100;
        return appliedVoucher.maxDiscount ? Math.min(pct, appliedVoucher.maxDiscount) : pct;
      })()
    : 0;
  const finalAmount = (totalAmount as number) - discountAmount;
  const skills=(g:AppGuide):string[]=>Array.isArray(g.skills)?g.skills as string[]:typeof g.skills==='string'?(g.skills as string).split(',').map(s=>s.trim()):[];
  const formatPrice=(t:AppTour)=>{ if(t.price&&t.price.includes('đ')) return t.price; const n=t.priceRaw??Number(String(t.price).replace(/[^0-9]/g,'')); return n>0?`${n.toLocaleString('vi-VN')}đ`:t.price; };

  // Actions
  const handleConfirmPayment=async()=>{
    if(!selectedTour||!selectedGuide){ Alert.alert('Thiếu thông tin','Vui lòng chọn tour và HDV.'); return; }
    const id=genId();
    const bk:GuestBooking={
      id,tourId:selectedTour.id,tourName:selectedTour.name,tourDate:selectedTour.date||'---',tourPrice,
      guideId:selectedGuide.id,guideName:selectedGuide.name,guidePhone:selectedGuide.phone||'---',
      guests,servicesTotal,totalAmount:finalAmount,paymentMethod:payMethod,status:'pending_guide',
      createdAt:new Date().toISOString(),holdUntil:new Date(Date.now()+15*60*1000).toISOString(),
      meetingPoint:selectedTour.departure?`Xuất phát từ ${selectedTour.departure}`:'---',
      services:ADDONS.filter(a=>selectedAddons.includes(a.id)).map(a=>({label:a.label,price:a.price})),
      checkInCode:genQR(),messages:[],
    };
    setBooking(bk); await saveBk(bk); await notifyGuide(bk);
    await notifyGuest(`Đã gửi yêu cầu booking "${selectedTour.name}" đến HDV ${selectedGuide.name}. Chờ xác nhận...`);
    await sendAdminReport(bk,'BOOKING_CREATED');

    // ✅ Đánh dấu voucher đã dùng
    if (appliedVoucher) {
      const gRaw = await AsyncStorage.getItem("@guest_vouchers").catch(() => null);
      if (gRaw) {
        const gList = JSON.parse(gRaw).map((v: any) =>
          v.code === appliedVoucher.code ? { ...v, used: true } : v
        );
        await AsyncStorage.setItem("@guest_vouchers", JSON.stringify(gList)).catch(() => {});
      }
      const pRaw = await AsyncStorage.getItem("@promo_codes").catch(() => null);
      if (pRaw) {
        const pList = JSON.parse(pRaw).map((p: any) =>
          p.code === appliedVoucher.code ? { ...p, usedCount: (p.usedCount || 0) + 1 } : p
        );
        await AsyncStorage.setItem("@promo_codes", JSON.stringify(pList)).catch(() => {});
      }
    }

    // ✅ Cộng điểm loyalty (1 điểm / 10.000đ)
    const earnedPoints = Math.floor((tourPrice as number) / 10000);
    if (earnedPoints > 0) {
      const profRaw = await AsyncStorage.getItem("@app_profile").catch(() => null);
      const prof = profRaw ? JSON.parse(profRaw) : {};
      const newPoints = (prof.loyaltyPoints || 0) + earnedPoints;
      await AsyncStorage.setItem("@app_profile", JSON.stringify({ ...prof, loyaltyPoints: newPoints })).catch(() => {});
      const hRaw = await AsyncStorage.getItem("@loyalty_history").catch(() => null);
      const hList = hRaw ? JSON.parse(hRaw) : [];
      hList.unshift({ id: `h${Date.now()}`, type: "earn", points: earnedPoints, desc: `Đặt tour ${selectedTour.name}`, date: new Date().toLocaleDateString("vi-VN") });
      await AsyncStorage.setItem("@loyalty_history", JSON.stringify(hList)).catch(() => {});
    }

    setStep(4);
  
  };

  const simulateGuideAccept=async()=>{
    if(!booking) return;
    const u={...booking,status:'guide_accepted' as BookStatus}; setBooking(u); await saveBk(u);
    await notifyGuest(`HDV ${booking.guideName} đã xác nhận! Hãy chat để trao đổi thêm.`);
  };

  const sendMsg=async()=>{
    if(!booking||!chatInput.trim()) return;
    const msg:ChatMsg={from:'guest',text:chatInput.trim(),time:nowStr()};
    const u={...booking,messages:[...(booking.messages||[]),msg]};
    setBooking(u); await saveBk(u); setChatInput('');
    setTimeout(async()=>{
      const reply:ChatMsg={from:'guide',text:'Dạ tôi đã nhận được. Chúng ta gặp nhau đúng giờ nhé! 🙏',time:nowStr()};
      const u2={...u,messages:[...u.messages,reply]}; setBooking(u2); await saveBk(u2);
    },1500);
  };

  const handleCheckIn=async()=>{
    if(!guestScanned||!guideOK||!booking) return;
    const u={...booking,status:'checked_in' as BookStatus}; setBooking(u); await saveBk(u);
    await notifyGuest('Check-in thành công! Chuyến đi bắt đầu 🎉'); setStep(7);
  };

  const handleEndTour=async()=>{
    if(!booking) return;
    const u={...booking,status:'completed' as BookStatus}; setBooking(u); await saveBk(u);
    await sendAdminReport(u,'TOUR_COMPLETED');
    const commission=Math.round(booking.totalAmount*0.15);
    const payout=booking.totalAmount-commission;
    await sendAdminReport(u,`PAYOUT:${fmt(payout)}→HDV ${booking.guideName} | Hoa hồng:${fmt(commission)}`);
    await notifyGuest('Tour đã hoàn thành! Cảm ơn bạn 🌟'); setStep(8);
  };

  const handleSubmitReview=async()=>{
    if(!booking) return;
    const rev={id:`rev${Date.now()}`,guideId:booking.guideId,guideName:booking.guideName,tourName:booking.tourName,
      overallRating,comment:reviewComment||'Tuyệt vời!',reply:'',
      date:new Date().toLocaleDateString('vi-VN'),createdAt:new Date().toISOString()};
    const rr=await AsyncStorage.getItem('@guide_reviews').catch(()=>null);
    const rl=rr?JSON.parse(rr):[];
    rl.unshift(rev); await AsyncStorage.setItem('@guide_reviews',JSON.stringify(rl)).catch(()=>{});
    const nr=await AsyncStorage.getItem('@guide_notifications').catch(()=>null);
    const nl=nr?JSON.parse(nr):[];
    nl.unshift({id:`rn${Date.now()}`,type:'review',title:`Đánh giá ${overallRating}⭐ từ khách`,body:reviewComment||'Tuyệt vời!',time:'Vừa xong',read:false});
    await AsyncStorage.setItem('@guide_notifications',JSON.stringify(nl)).catch(()=>{});
    setReviewDone(true);
    setTimeout(()=>router.replace('/'),1800);
  };

  // Progress
  // Load voucher được chọn từ kho voucher (nếu có)
  React.useEffect(() => {
    AsyncStorage.getItem("@active_voucher").then(raw => {
      if (raw) {
        setAppliedVoucher(JSON.parse(raw));
        AsyncStorage.removeItem("@active_voucher").catch(() => {});
      }
    }).catch(() => {});

    // ✅ Nếu @promo_codes trống → sync từ @admin_vouchers hoặc dùng seed mặc định
    AsyncStorage.getItem("@promo_codes").then(async raw => {
      if (!raw || JSON.parse(raw).length === 0) {
        const aRaw = await AsyncStorage.getItem("@admin_vouchers").catch(() => null);
        if (aRaw) {
          const adminV: any[] = JSON.parse(aRaw);
          const promoCodes = adminV.map(v => ({
            id: v.id, code: v.code, type: v.type,
            value: Number(v.discount),
            minOrder: Number(v.minOrder) || 0,
            maxDiscount: Number(v.maxDiscount) || 0,
            description: v.description,
            expiry: v.expiry, color: v.color,
            active: v.status === "active",
            usedCount: v.used || 0, limit: v.limit || 100,
            source: "admin",
          }));
          await AsyncStorage.setItem("@promo_codes", JSON.stringify(promoCodes)).catch(() => {});
        } else {
          // Seed mặc định nếu chưa có gì
          const defaultCodes = [
            {id:"p1",code:"SUMMER35",type:"percent",value:35,minOrder:2000000,maxDiscount:500000,description:"Ưu đãi mùa hè – Giảm 35% tour biển & cao nguyên",expiry:"30/06/2026",color:"#4f7cff",active:true,usedCount:0,limit:100,source:"system"},
            {id:"p2",code:"NEWUSER200",type:"fixed",value:200000,minOrder:1500000,maxDiscount:200000,description:"Chào mừng thành viên mới – Giảm 200.000đ",expiry:"31/12/2026",color:"#16a34a",active:true,usedCount:0,limit:200,source:"system"},
            {id:"p3",code:"TOUR10",type:"percent",value:10,minOrder:3000000,maxDiscount:300000,description:"Giảm 10% cho tour trên 3 triệu",expiry:"30/04/2027",color:"#06b6d4",active:true,usedCount:0,limit:100,source:"system"},
          ];
          await AsyncStorage.setItem("@promo_codes", JSON.stringify(defaultCodes)).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  const STEPS=entryMode==='guide'?STEP_LABELS_GUIDE:STEP_LABELS_TOUR;
  const renderProgress=()=>(
    <View style={s.progWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.progRow}>
        {STEPS.map((lbl,i)=>(
          <View key={i} style={s.progItem}>
            <View style={[s.progCircle,step===i&&s.progActive,step>i&&s.progDone]}>
              {step>i?<Ionicons name="checkmark" size={11} color="#fff"/>:<Text style={[s.progNum,step>=i&&{color:'#fff'}]}>{i+1}</Text>}
            </View>
            {i<STEPS.length-1&&<View style={[s.progLine,step>i&&s.progLineDone]}/>}
          </View>
        ))}
      </ScrollView>
      <Text style={s.progLabel}>{STEPS[step]}</Text>
    </View>
  );

  // ── Step renders ──────────────────────────────────────────
  const renderTourCard=(t:AppTour)=>(
    <View style={s.selectedCard} key={t.id}>
      <View style={[s.cardBar,{backgroundColor:t.color||'#99bbff'}]}/>
      <View style={s.selectedBody}>
        <Text style={s.selectedName}>{t.name}</Text>
        <View style={s.metaRow}><Ionicons name="location-outline" size={12} color="#8ea0d6"/><Text style={s.metaTxt}>{t.departure}</Text><Text style={s.dot}>·</Text><Ionicons name="time-outline" size={12} color="#8ea0d6"/><Text style={s.metaTxt}>{t.duration}</Text></View>
        <View style={s.metaRow}><Ionicons name="star" size={11} color="#f59e0b"/><Text style={s.metaTxt}>{t.rating}</Text><Text style={s.dot}>·</Text><Text style={s.priceInline}>{formatPrice(t)}</Text></View>
      </View>
    </View>
  );

  // Step 0A – Chọn Tour
  const S0_Tour=()=>(
    <>
      <Text style={s.stepTitle}>Chọn Tour muốn đặt</Text>
      <Text style={s.stepSub}>Chọn tour phù hợp với hành trình của bạn</Text>
      {selectedTour ? <>
        {renderTourCard(selectedTour)}
        <TouchableOpacity style={s.changeBtn} onPress={()=>setSelectedTour(null)}>
          <Ionicons name="swap-horizontal-outline" size={16} color="#4f7cff"/><Text style={s.changeTxt}>Đổi tour khác</Text>
        </TouchableOpacity>
      </> : (
        <ScrollView style={{maxHeight:300}} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {tours.slice(0,6).map(t=>(
            <TouchableOpacity key={t.id} style={s.listCard} onPress={()=>setSelectedTour(t)}>
              <View style={[s.listColorDot,{backgroundColor:t.color||'#99bbff'}]}/>
              <View style={{flex:1}}><Text style={s.listName}>{t.name}</Text><Text style={s.listMeta}>{t.departure} · {t.duration}</Text></View>
              <Text style={s.listPrice}>{formatPrice(t)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <TouchableOpacity
        style={[s.primaryBtn,!selectedTour&&s.primaryBtnOff]}
        disabled={!selectedTour}
        onPress={()=>{
          // Lọc HDV được phân công cho tour này
          if(selectedTour?.assignedGuideIds && selectedTour.assignedGuideIds.length > 0){
            setGuides(prev => prev.filter(g =>
              (selectedTour.assignedGuideIds as string[]).includes(g.id)
            ));
          }
          setStep(1);
        }}
      >
        <Text style={s.primaryBtnTxt}>Tiếp theo: Chọn HDV</Text><Ionicons name="arrow-forward" size={16} color="#fff"/>
      </TouchableOpacity>
    </>
  );

  // Step 0B – Xem HDV (entry guide)
  const S0_Guide=()=>(
    <>
      <Text style={s.stepTitle}>HDV đã chọn</Text>
      <Text style={s.stepSub}>Bước tiếp theo: chọn tour muốn đặt với HDV này</Text>
      {selectedGuide&&(
        <View style={s.guidePickCard}>
          <View style={s.guideAvatar}><Ionicons name="person" size={20} color="#fff"/></View>
          <View style={{flex:1}}>
            <Text style={s.guidePickName}>{selectedGuide.name}</Text>
            <Text style={s.guidePickMeta}>{selectedGuide.location} · {selectedGuide.experience}</Text>
            <View style={s.skillsRow}>{skills(selectedGuide).slice(0,3).map(sk=><View key={sk} style={s.skillChip}><Text style={s.skillTxt}>{sk}</Text></View>)}</View>
          </View>
          <View style={s.matchBadge}><Ionicons name="flash" size={11} color="#4f7cff"/><Text style={s.matchTxt}>{selectedGuide.match}%</Text></View>
        </View>
      )}
      <TouchableOpacity style={s.primaryBtn} onPress={()=>setStep(1)}>
        <Text style={s.primaryBtnTxt}>Tiếp theo: Chọn Tour</Text><Ionicons name="arrow-forward" size={16} color="#fff"/>
      </TouchableOpacity>
    </>
  );

  // Step 1A – Chọn HDV
  const S1_Guide=()=>(
    <>
      <Text style={s.stepTitle}>Chọn Hướng dẫn viên</Text>
      <Text style={s.stepSub}>AI gợi ý HDV phù hợp nhất với tour của bạn</Text>
      {selectedGuide&&(
        <View style={[s.guidePickCard,{borderColor:'#4f7cff',backgroundColor:'#edf2ff'}]}>
          <View style={s.guideAvatar}><Ionicons name="person" size={20} color="#fff"/></View>
          <View style={{flex:1}}><Text style={s.guidePickName}>{selectedGuide.name}</Text><Text style={s.guidePickMeta}>{selectedGuide.location} · {selectedGuide.experience}</Text></View>
          <Ionicons name="checkmark-circle" size={22} color="#4f7cff"/>
        </View>
      )}
      <TouchableOpacity style={s.pickBtn} onPress={()=>setGuideModal(true)}>
        <Ionicons name={selectedGuide?'swap-horizontal-outline':'person-add-outline'} size={18} color="#4f7cff"/>
        <Text style={s.pickBtnTxt}>{selectedGuide?'Đổi hướng dẫn viên':'Chọn hướng dẫn viên'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.primaryBtn,!selectedGuide&&s.primaryBtnOff]} disabled={!selectedGuide} onPress={()=>setStep(2)}>
        <Text style={s.primaryBtnTxt}>Tiếp theo: Dịch vụ</Text><Ionicons name="arrow-forward" size={16} color="#fff"/>
      </TouchableOpacity>
      <TouchableOpacity style={s.skipBtn} onPress={()=>setStep(2)}><Text style={s.skipTxt}>Bỏ qua, chọn sau</Text></TouchableOpacity>
      <GuidePickerModal visible={guideModal} guides={guides} selected={selectedGuide} onClose={()=>setGuideModal(false)} onSelect={g=>{setSelectedGuide(g);setGuideModal(false);}}/>
    </>
  );

  // Step 1B – Chọn Tour (entry guide)
  const S1_Tour=()=>(
    <>
      <Text style={s.stepTitle}>Chọn Tour muốn đặt</Text>
      <Text style={s.stepSub}>HDV {selectedGuide?.name} sẽ dẫn bạn tour này</Text>
      {selectedTour&&renderTourCard(selectedTour)}
      <TouchableOpacity style={s.pickBtn} onPress={()=>setTourModal(true)}>
        <Ionicons name={selectedTour?'swap-horizontal-outline':'map-outline'} size={18} color="#4f7cff"/>
        <Text style={s.pickBtnTxt}>{selectedTour?'Đổi tour khác':'Chọn tour'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.primaryBtn,!selectedTour&&s.primaryBtnOff]} disabled={!selectedTour} onPress={()=>setStep(2)}>
        <Text style={s.primaryBtnTxt}>Tiếp theo: Dịch vụ</Text><Ionicons name="arrow-forward" size={16} color="#fff"/>
      </TouchableOpacity>
      <TourPickerModal visible={tourModal} tours={tours} selected={selectedTour} onClose={()=>setTourModal(false)} onSelect={t=>{setSelectedTour(t);setTourModal(false);}}/>
    </>
  );

  // Step 2 – Dịch vụ
  const S2=()=>(
    <>
      <Text style={s.stepTitle}>Dịch vụ thêm</Text>
      <Text style={s.stepSub}>Tùy chọn các dịch vụ bổ sung</Text>
      {selectedTour&&<View style={s.tourSummaryCard}><Text style={s.tSumLbl}>Tour</Text><Text style={s.tSumName}>{selectedTour.name}</Text><Text style={s.tSumMeta}>{selectedTour.departure} · {selectedTour.duration}</Text></View>}
      {selectedGuide&&<View style={s.guideMiniCard}><Ionicons name="person-circle-outline" size={16} color="#4f7cff"/><Text style={s.guideMiniTxt}>HDV: <Text style={{fontWeight:'800',color:'#1f2a58'}}>{selectedGuide.name}</Text></Text></View>}
      {ADDONS.map(a=>{
        const active=selectedAddons.includes(a.id);
        return(
          <TouchableOpacity key={a.id} style={[s.addonCard,active&&s.addonCardActive]}
            onPress={()=>setSelectedAddons(p=>active?p.filter(x=>x!==a.id):[...p,a.id])}>
            <View style={[s.addonIcon,active&&{backgroundColor:'#4f7cff'}]}><Ionicons name={a.icon} size={20} color={active?'#fff':'#4f7cff'}/></View>
            <View style={{flex:1}}><Text style={s.addonLabel}>{a.label}</Text><Text style={s.addonPrice}>{a.display}</Text></View>
            <View style={[s.checkbox,active&&s.checkboxActive]}>{active&&<Ionicons name="checkmark" size={14} color="#fff"/>}</View>
          </TouchableOpacity>
        );
      })}
      <View style={s.summaryCard}>
        <Row label={`Giá tour × ${guests} người`} val={fmt(tourPrice*guests)}/>
        {ADDONS.filter(a=>selectedAddons.includes(a.id)).map(a=><Row key={a.id} label={a.label} val={fmt(a.price)}/>)}
        <View style={s.divider}/>

        {/* Voucher box */}
        {appliedVoucher ? (
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#f0fdf4',borderRadius:10,padding:10,marginBottom:6}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="pricetag" size={15} color="#16a34a"/>
              <View>
                <Text style={{color:'#16a34a',fontWeight:'800',fontSize:13}}>{appliedVoucher.code}</Text>
                <Text style={{color:'#7a8cc2',fontSize:11}}>{appliedVoucher.desc}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={()=>setAppliedVoucher(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="close-circle" size={18} color="#dc2626"/>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{marginBottom:6}}>
            <View style={{flexDirection:'row',gap:8}}>
              <TextInput
                style={{flex:1,backgroundColor:'#f3f7ff',borderRadius:10,borderWidth:1,borderColor:'#e4ebff',paddingHorizontal:12,paddingVertical:8,fontSize:13,color:'#1f2a58',fontWeight:'700',letterSpacing:1}}
                placeholder="Nhập mã voucher..."
                placeholderTextColor="#b0bdd8"
                value={voucherInput}
                onChangeText={v=>{setVoucherInput(v.toUpperCase());setVoucherError('');}}
                autoCapitalize="characters"
                autoCorrect={false}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={{backgroundColor:'#4f7cff',borderRadius:10,paddingHorizontal:14,justifyContent:'center'}}
                onPress={async()=>{
                  const code=voucherInput.trim();
                  if(!code) return;
                  // Thử tìm trong @guest_vouchers trước (đã có sẵn)
                  const gRaw=await AsyncStorage.getItem('@guest_vouchers').catch(()=>null);
                  const gList:any[]=gRaw?JSON.parse(gRaw):[];
                  const gFound=gList.find(v=>v.code===code&&!v.used);
                  if(gFound){
                    if(gFound.minOrder&&(totalAmount as number)<gFound.minOrder){
                      setVoucherError(`Đơn tối thiểu ${fmt(gFound.minOrder)}`);return;
                    }
                    setAppliedVoucher({code,type:gFound.type,value:gFound.value,minOrder:gFound.minOrder??0,maxDiscount:gFound.maxDiscount??0,desc:gFound.desc,voucherId:gFound.id});
                    setVoucherInput('');return;
                  }
                  // Tìm trong @promo_codes (Admin tạo)
                  const pRaw=await AsyncStorage.getItem('@promo_codes').catch(()=>null);
                  const pList:any[]=pRaw?JSON.parse(pRaw):[];
                  const found=pList.find(p=>p.code===code&&p.active);
                  if(!found){setVoucherError('Mã không hợp lệ hoặc hết hạn');return;}
                  if((found.usedCount||0)>=(found.limit||999)){setVoucherError('Mã đã hết lượt sử dụng');return;}
                  if(found.minOrder&&(totalAmount as number)<found.minOrder){
                    setVoucherError(`Đơn tối thiểu ${fmt(found.minOrder)}`);return;
                  }
                  setAppliedVoucher({code,type:found.type,value:found.value,minOrder:found.minOrder??0,maxDiscount:found.maxDiscount??0,desc:found.description??'',voucherId:found.id});
                  setVoucherInput('');
                }}
              >
                <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
            {!!voucherError&&<Text style={{color:'#dc2626',fontSize:11,marginTop:4}}>{voucherError}</Text>}
          </View>
        )}

        {discountAmount > 0 && <Row label="Giảm giá voucher" val={`-${fmt(discountAmount)}`}/>}
        <Row label="Tổng cộng" val={fmt(finalAmount)} bold highlight/>
      </View>
      <TouchableOpacity style={s.primaryBtn} onPress={()=>setStep(3)}>
        <Text style={s.primaryBtnTxt}>Tiếp tục thanh toán</Text><Ionicons name="arrow-forward" size={16} color="#fff"/>
      </TouchableOpacity>
    </>
  );

  // Tính discount từ voucher
  const calcDiscount = (total: number) => {
    if (!appliedVoucher) return 0;
    if (total < appliedVoucher.minOrder) return 0;
    if (appliedVoucher.type === "fixed") return Math.min(appliedVoucher.value, total);
    const pct = (total * appliedVoucher.value) / 100;
    return appliedVoucher.maxDiscount ? Math.min(pct, appliedVoucher.maxDiscount) : pct;
  };

  // Step 3 – Thanh toán
  const S3=()=>(
    <>
      <Text style={s.stepTitle}>Xác nhận & Thanh toán</Text>
      <Text style={s.stepSub}>Kiểm tra thông tin trước khi gửi yêu cầu cho HDV</Text>
      <View style={s.checkoutCard}>
        <Row label="Tour" val={selectedTour?.name||'---'}/><Row label="HDV" val={selectedGuide?.name||'---'}/>
        <Row label="Ngày" val={selectedTour?.date||'---'}/><Row label="Số người" val={`${guests} người`}/>
        <View style={s.divider}/>
        <Row label="Giá tour" val={fmt(tourPrice*guests)}/>
        {ADDONS.filter(a=>selectedAddons.includes(a.id)).map(a=><Row key={a.id} label={a.label} val={fmt(a.price)}/>)}
        {appliedVoucher && (
          <View style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4}}>
            <Ionicons name="pricetag" size={13} color="#16a34a"/>
            <Text style={{flex:1,color:'#16a34a',fontSize:12,fontWeight:'700'}}>{appliedVoucher.code} – {appliedVoucher.desc}</Text>
            <Text style={{color:'#16a34a',fontWeight:'800',fontSize:13}}>-{fmt(discountAmount)}</Text>
          </View>
        )}
        <View style={s.divider}/><Row label="Tổng thanh toán" val={fmt(finalAmount)} bold highlight/>
      </View>
      <View style={s.guestCard}>
        <Text style={s.guestLbl}>Số khách</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity style={s.stepperBtn} onPress={()=>setGuests(Math.max(1,guests-1))}><Ionicons name="remove" size={18} color="#4f7cff"/></TouchableOpacity>
          <Text style={s.stepperNum}>{guests}</Text>
          <TouchableOpacity style={s.stepperBtn} onPress={()=>setGuests(guests+1)}><Ionicons name="add" size={18} color="#4f7cff"/></TouchableOpacity>
        </View>
      </View>
      <View style={s.payCard}>
        <Text style={s.payTitle}>Phương thức thanh toán</Text>
        {([['card','card-outline','Thẻ ngân hàng'],['bank','business-outline','Chuyển khoản'],['wallet','wallet-outline','Ví điện tử']] as const).map(([k,ic,lb])=>(
          <TouchableOpacity key={k} style={[s.payOpt,payMethod===k&&s.payOptActive]} onPress={()=>setPayMethod(k as PayMethod)}>
            <Ionicons name={ic} size={17} color="#4f7cff"/><Text style={s.payOptTxt}>{lb}</Text>
            {payMethod===k&&<Ionicons name="checkmark-circle" size={16} color="#4f7cff" style={{marginLeft:'auto'}}/>}
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.escrowBanner}><Ionicons name="shield-checkmark-outline" size={16} color="#4f7cff"/><Text style={s.escrowTxt}>Tiền được tạm giữ an toàn (Escrow). Giải ngân sau khi tour hoàn tất.</Text></View>
      <TouchableOpacity style={s.primaryBtn} onPress={handleConfirmPayment}>
        <Ionicons name="send-outline" size={18} color="#fff"/><Text style={s.primaryBtnTxt}>Gửi yêu cầu cho HDV</Text>
      </TouchableOpacity>
    </>
  );

  // Step 4 – Chờ HDV
  const S4=()=>(
    <>
      <View style={s.waitHeader}>
        <View style={s.waitIconWrap}><Ionicons name="hourglass-outline" size={36} color="#4f7cff"/></View>
        <Text style={s.waitTitle}>Chờ HDV xác nhận</Text>
        <Text style={s.waitSub}>Đã gửi đến {booking?.guideName}. HDV sẽ phản hồi sớm nhất có thể.</Text>
      </View>
      {holdSecs!==null&&<View style={s.timerBox}><Text style={s.timerLbl}>Thời gian giữ chỗ còn</Text><Text style={s.timerNum}>{`${Math.floor(holdSecs/60)}:${String(holdSecs%60).padStart(2,'0')}`}</Text></View>}
      <View style={s.bookInfoCard}>
        <Text style={s.bookInfoTitle}>Thông tin booking</Text>
        <Row label="Mã đơn" val={booking?.id||'---'}/>
        <Row label="Tour" val={booking?.tourName||'---'}/>
        <Row label="HDV" val={booking?.guideName||'---'}/>
        <Row label="Ngày" val={booking?.tourDate||'---'}/>
        <Row label="Tổng tiền" val={fmt(booking?.totalAmount||0)} bold highlight/>
      </View>
      <View style={s.qrCard}>
        <Text style={s.qrLbl}>Mã QR Check-in của bạn</Text>
        <View style={s.qrBox}>
          {[...Array(5)].map((_,r)=><View key={r} style={{flexDirection:'row',gap:4,marginBottom:4}}>{[...Array(5)].map((_,c)=><View key={c} style={(r+c)%2===0?s.qrCell:s.qrCellEmpty}/>)}</View>)}
        </View>
        <Text style={s.qrCode}>{booking?.checkInCode}</Text>
        <Text style={s.qrHint}>HDV quét mã này khi gặp bạn</Text>
      </View>
      <TouchableOpacity style={s.simulateBtn} onPress={simulateGuideAccept}>
        <Ionicons name="person-circle-outline" size={16} color="#16a34a"/>
        <Text style={[s.simulateTxt,{color:'#16a34a'}]}>[Demo] Mô phỏng HDV chấp nhận booking</Text>
      </TouchableOpacity>
      {booking?.status==='guide_accepted'&&(
        <TouchableOpacity style={s.primaryBtn} onPress={()=>setStep(5)}>
          <Ionicons name="chatbubble-outline" size={18} color="#fff"/>
          <Text style={s.primaryBtnTxt}>HDV đã xác nhận! Chat ngay 💬</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // Step 5 – Chat
  const S5=()=>(
    <>
      <View style={s.chatHeader}>
        <View style={s.chatAvatar}><Ionicons name="person" size={18} color="#fff"/></View>
        <View>
          <Text style={s.chatGuideName}>{booking?.guideName}</Text>
          <View style={s.onlineDot}><View style={s.onlineDotInner}/><Text style={s.onlineTxt}>Đang hoạt động</Text></View>
        </View>
      </View>
      <View style={s.reminderBox}>
        <Ionicons name="alarm-outline" size={15} color="#d97706"/>
        <Text style={s.reminderTxt}>⏰ Nhắc nhở: Tour lúc 08:00 ngày {booking?.tourDate}. Chuẩn bị trước 30 phút!</Text>
      </View>
      <ScrollView style={s.chatMessages} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <View style={s.systemMsg}><Text style={s.systemMsgTxt}>Booking #{booking?.id} đã được xác nhận ✓</Text></View>
        {(booking?.messages||[]).map((m,i)=>(
          <View key={i} style={[s.bubble,m.from==='guest'?s.bubbleGuest:s.bubbleGuide]}>
            <Text style={[s.bubbleTxt,m.from==='guest'&&{color:'#fff'}]}>{m.text}</Text>
            <Text style={[s.bubbleTime,m.from==='guest'&&{color:'rgba(255,255,255,0.7)'}]}>{m.time}</Text>
          </View>
        ))}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.chatInputRow}>
          <TextInput style={s.chatInput} value={chatInput} onChangeText={setChatInput} placeholder="Nhắn tin cho HDV..." placeholderTextColor="#b0bdd8"/>
          <TouchableOpacity style={s.sendBtn} onPress={sendMsg}><Ionicons name="send" size={18} color="#fff"/></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <TouchableOpacity style={[s.primaryBtn,{marginTop:12}]} onPress={()=>setStep(6)}>
        <Ionicons name="qr-code-outline" size={18} color="#fff"/><Text style={s.primaryBtnTxt}>Đến điểm hẹn & Check-in</Text>
      </TouchableOpacity>
    </>
  );

  // Step 6 – Check-in
  const S6=()=>(
    <>
      <Text style={s.stepTitle}>Check-in tại điểm hẹn</Text>
      <Text style={s.stepSub}>HDV quét mã QR của bạn để kích hoạt chuyến đi</Text>
      <View style={s.meetCard}>
        <Ionicons name="location" size={18} color="#4f7cff"/>
        <View style={{flex:1}}><Text style={s.meetPlace}>{booking?.meetingPoint}</Text><Text style={s.meetTime}>08:00 · {booking?.tourDate}</Text></View>
      </View>
      <View style={s.qrCard}>
        <Text style={s.qrLbl}>Cho HDV quét mã này</Text>
        <View style={s.qrBox}><MaterialCommunityIcons name="qrcode-scan" size={64} color="#4f7cff"/></View>
        <Text style={s.qrCode}>{booking?.checkInCode}</Text>
      </View>
      <View style={s.verifyCard}>
        {[
          {label:'Khách hàng',done:guestScanned,action:()=>setGuestScanned(true),actionLbl:'Xác nhận có mặt'},
          {label:'Hướng dẫn viên',done:guideOK,action:()=>setGuideOK(true),actionLbl:'[Demo] HDV quét QR'},
          {label:'eKYC 2 bên',done:true,action:null,actionLbl:''},
        ].map((row,i)=>(
          <View key={i} style={s.verifyRow}>
            <Text style={s.verifyLbl}>{row.label}</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              {!row.done&&row.action&&<TouchableOpacity style={s.verifyActionBtn} onPress={row.action}><Text style={s.verifyActionTxt}>{row.actionLbl}</Text></TouchableOpacity>}
              <Text style={[s.verifyStatus,row.done?s.statusOK:s.statusPending]}>{row.done?'✓ Xong':'Chờ'}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.primaryBtn,(!guestScanned||!guideOK)&&s.primaryBtnOff]} disabled={!guestScanned||!guideOK} onPress={handleCheckIn}>
        <Ionicons name="play-circle-outline" size={18} color="#fff"/>
        <Text style={s.primaryBtnTxt}>{guestScanned&&guideOK?'Bắt đầu chuyến đi!':'Hoàn tất đủ 2 bước'}</Text>
      </TouchableOpacity>
    </>
  );

  // Step 7 – On-Tour (AI Health + GPS + Insurance)
  const S7=()=>(
    <>
      <View style={s.liveRow}>
        <Text style={s.stepTitle}>Đang đi tour</Text>
        <View style={s.liveBadge}><View style={s.liveDot}/><Text style={s.liveTxt}>LIVE</Text></View>
      </View>
      <Text style={s.stepSub}>GPS & AI giám sát sức khỏe đang hoạt động</Text>

      {/* Bảo hiểm banner */}
      <View style={[s.insureCard,insureAlert&&s.insureCardAlert]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={insureAlert?'#dc2626':'#16a34a'}/>
        <Text style={[s.insureTxt,insureAlert&&{color:'#dc2626'}]}>
          {insureAlert?'⚠️ Nhịp tim bất thường! Bảo hiểm du lịch đã tự động kích hoạt. HDV đã được cảnh báo.':'✅ Bảo hiểm du lịch đang bảo vệ bạn trong suốt hành trình.'}
        </Text>
      </View>

      {/* GPS Map */}
      <View style={[s.mapBox,!isTracking&&{backgroundColor:'#edf2ff'}]}>
        <MaterialCommunityIcons name="map-marker-path" size={36} color="#4f7cff"/>
        <Text style={s.mapTxt}>{isTracking?'GPS Tracking đang hoạt động':'GPS tạm dừng'}</Text>
        <Text style={s.mapSub}>{booking?.meetingPoint} · {nowStr()}</Text>
      </View>

      <View style={s.controlRow}>
        <TouchableOpacity style={s.controlBtn} onPress={()=>setIsTracking(v=>!v)}>
          <Ionicons name={isTracking?'pause-outline':'play-outline'} size={16} color="#4f7cff"/>
          <Text style={s.controlTxt}>{isTracking?'Tạm dừng GPS':'Bật GPS'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.controlBtn} onPress={()=>{setHeartRate(h=>h+Math.floor(Math.random()*8+2));setStepCount(v=>v+300);}}>
          <Ionicons name="pulse-outline" size={16} color="#4f7cff"/>
          <Text style={s.controlTxt}>Cập nhật chỉ số</Text>
        </TouchableOpacity>
      </View>

      {/* AI Health LSTM */}
      <View style={s.healthCard}>
        <Text style={s.healthTitle}>🤖 AI Giám sát sức khỏe (LSTM)</Text>
        <View style={s.healthRow}>
          {[
            {icon:'heart-outline',val:`${heartRate}`,lbl:'Nhịp tim/phút',warn:heartRate>140},
            {icon:'walk',val:stepCount.toLocaleString('vi-VN'),lbl:'Bước chân',mci:true,warn:false},
            {icon:'thermometer-outline',val:hasAnomaly?'⚠️ Cao':'Bình thường',lbl:'Trạng thái',warn:hasAnomaly},
          ].map((item,i)=>(
            <View key={i} style={s.healthItem}>
              {item.mci?<MaterialCommunityIcons name={item.icon as any} size={22} color={item.warn?'#ef4444':'#4f7cff'}/>:<Ionicons name={item.icon as any} size={22} color={item.warn?'#ef4444':'#4f7cff'}/>}
              <Text style={[s.healthNum,item.warn&&{color:'#ef4444'}]}>{item.val}</Text>
              <Text style={s.healthLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>
        <View style={[s.aiBanner,hasAnomaly&&s.aiBannerWarn]}>
          <MaterialCommunityIcons name="brain" size={14} color={hasAnomaly?'#dc2626':'#16a34a'}/>
          <Text style={[s.aiTxt,hasAnomaly&&{color:'#dc2626'}]}>
            {hasAnomaly?'LSTM phát hiện nhịp tim bất thường! HDV đã được nhận cảnh báo. Hãy nghỉ ngơi.':'LSTM · Không phát hiện bất thường · Sức khỏe ổn định ✓'}
          </Text>
        </View>
      </View>

      {/* Lộ trình */}
      <View style={s.routeCard}>
        <Text style={s.routeTitle}>📍 Lộ trình hành trình</Text>
        {TOUR_ROUTE.map((r,i)=><View key={i} style={s.routeItem}><Ionicons name="ellipse" size={10} color={r.done?'#16a34a':'#c0cbe8'}/><Text style={[s.routeTxt,!r.done&&{color:'#c0cbe8'}]}>{r.time} · {r.place}</Text></View>)}
      </View>

      {/* Simulate anomaly */}
      <TouchableOpacity style={s.simulateBtn} onPress={()=>{setHasAnomaly(v=>!v);setInsureAlert(v=>!v);if(!hasAnomaly)setHeartRate(175);}}>
        <Ionicons name="warning-outline" size={16} color={hasAnomaly?'#16a34a':'#ef4444'}/>
        <Text style={[s.simulateTxt,{color:hasAnomaly?'#16a34a':'#ef4444'}]}>
          {hasAnomaly?'[Demo] Tắt mô phỏng cảnh báo':'[Demo] Mô phỏng nhịp tim bất thường → bảo hiểm kích hoạt'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.primaryBtn,{backgroundColor:'#16a34a'}]} onPress={()=>Alert.alert('Kết thúc tour','Bạn xác nhận kết thúc chuyến đi?',[
        {text:'Hủy',style:'cancel'},
        {text:'Xác nhận',onPress:handleEndTour},
      ])}>
        <Ionicons name="flag-outline" size={18} color="#fff"/>
        <Text style={s.primaryBtnTxt}>Kết thúc tour</Text>
      </TouchableOpacity>
    </>
  );

  // Step 8 – Đánh giá
  const S8=()=>reviewDone?(
    <View style={s.doneWrap}>
      <Ionicons name="heart-circle" size={80} color="#4f7cff"/>
      <Text style={s.doneFinalTitle}>Cảm ơn bạn! 🎉</Text>
      <Text style={s.doneFinalSub}>Đánh giá đã được gửi. Đang chuyển về trang chủ...</Text>
    </View>
  ):(
    <>
      <Text style={s.stepTitle}>Đánh giá chuyến đi</Text>
      <Text style={s.stepSub}>Phản hồi giúp AI cải thiện gợi ý cho lần sau</Text>
      <View style={s.reviewGuideCard}>
        <View style={s.guideAvatar}><Ionicons name="person" size={20} color="#fff"/></View>
        <View><Text style={s.reviewGuideName}>{booking?.guideName}</Text><Text style={s.reviewTourName}>{booking?.tourName}</Text></View>
      </View>
      <View style={s.ratingCard}>
        <Text style={s.ratingLbl}>Chất lượng tổng thể</Text>
        <View style={s.starRow}>{[1,2,3,4,5].map(i=><TouchableOpacity key={i} onPress={()=>setOverallRating(i)}><Ionicons name={i<=overallRating?'star':'star-outline'} size={38} color="#ffbe40"/></TouchableOpacity>)}</View>
        <Text style={s.ratingHint}>{['','Rất tệ','Tệ','Bình thường','Tốt','Xuất sắc'][overallRating]}</Text>
      </View>
      <View style={s.commentWrap}>
        <Text style={s.commentLbl}>Nhận xét chi tiết</Text>
        <TextInput style={s.commentInput} placeholder="Chia sẻ trải nghiệm..." multiline numberOfLines={4} textAlignVertical="top" value={reviewComment} onChangeText={setReviewComment} placeholderTextColor="#b0bdd8"/>
      </View>
      <View style={s.aiBanner}><Ionicons name="bulb-outline" size={15} color="#4f7cff"/><Text style={s.aiTxt}>Dữ liệu đánh giá được AI học để cải thiện Smart Matching lần sau</Text></View>
      <TouchableOpacity style={s.primaryBtn} onPress={handleSubmitReview}>
        <Ionicons name="paper-plane-outline" size={18} color="#fff"/><Text style={s.primaryBtnTxt}>Gửi đánh giá & Về trang chủ</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep=()=>{
    if(entryMode==='guide'){
      if(step===0) return <S0_Guide/>;
      if(step===1) return <S1_Tour/>;
    } else {
      if(step===0) return <S0_Tour/>;
      if(step===1) return <S1_Guide/>;
    }
    if(step===2) return <S2/>;
    if(step===3) return <S3/>;
    if(step===4) return <S4/>;
    if(step===5) return <S5/>;
    if(step===6) return <S6/>;
    if(step===7) return <S7/>;
    if(step===8) return <S8/>;
    return null;
  };

  if(loading) return <View style={s.loadingWrap}><ActivityIndicator size="large" color="#4f7cff"/></View>;

  return(
    <ScrollView style={s.screen} contentContainerStyle={[s.content,{paddingTop:insets.top+14,paddingBottom:40}]} keyboardShouldPersistTaps="handled">
      {step<8&&!reviewDone&&(
        <TouchableOpacity style={s.backRow} onPress={()=>{
          if(step===0) router.back();
          else if(step>=4) {} // không back trong luồng booking đang xử lý
          else setStep(step-1);
        }}>
          <Ionicons name="arrow-back" size={20} color="#4f7cff"/>
          <Text style={s.backTxt}>{step===0?'Trang chủ':'Quay lại'}</Text>
        </TouchableOpacity>
      )}

      {/* Entry mode toggle – chỉ ở step 0 */}
      {step===0&&(
        <View style={s.entryToggle}>
          <TouchableOpacity style={[s.entryBtn,entryMode==='tour'&&s.entryBtnActive]} onPress={()=>setEntryMode('tour')}>
            <Ionicons name="map-outline" size={15} color={entryMode==='tour'?'#fff':'#6c7fb7'}/>
            <Text style={[s.entryBtnTxt,entryMode==='tour'&&{color:'#fff'}]}>Chọn Tour trước</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.entryBtn,entryMode==='guide'&&s.entryBtnActive]} onPress={()=>setEntryMode('guide')}>
            <Ionicons name="person-outline" size={15} color={entryMode==='guide'?'#fff':'#6c7fb7'}/>
            <Text style={[s.entryBtnTxt,entryMode==='guide'&&{color:'#fff'}]}>Chọn HDV trước</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderProgress()}
      {renderStep()}
    </ScrollView>
  );
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f3f7ff'},content:{padding:18},loadingWrap:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f3f7ff'},
  backRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:12},backTxt:{color:'#4f7cff',fontWeight:'600'},
  entryToggle:{flexDirection:'row',backgroundColor:'#fff',borderRadius:14,padding:4,marginBottom:14,borderWidth:1,borderColor:'#e4ebff'},
  entryBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:9,borderRadius:12},
  entryBtnActive:{backgroundColor:'#4f7cff'},entryBtnTxt:{color:'#6c7fb7',fontWeight:'600',fontSize:13},
  progWrap:{marginBottom:20},progRow:{gap:0},progItem:{flexDirection:'row',alignItems:'center'},
  progCircle:{width:24,height:24,borderRadius:12,backgroundColor:'#e4ebff',alignItems:'center',justifyContent:'center'},
  progActive:{backgroundColor:'#4f7cff'},progDone:{backgroundColor:'#3dc87d'},
  progNum:{color:'#7a8cc2',fontSize:10,fontWeight:'700'},
  progLine:{width:16,height:3,backgroundColor:'#e4ebff'},progLineDone:{backgroundColor:'#3dc87d'},
  progLabel:{color:'#1f2a58',fontWeight:'700',fontSize:13,marginTop:8},
  stepTitle:{color:'#1f2a58',fontSize:24,fontWeight:'700',marginBottom:4},
  stepSub:{color:'#7a8cc2',marginBottom:14,lineHeight:20},
  // Tour card
  selectedCard:{flexDirection:'row',backgroundColor:'#fff',borderRadius:16,borderWidth:1.5,borderColor:'#e4ebff',marginBottom:12,overflow:'hidden'},
  cardBar:{width:8},selectedBody:{flex:1,padding:12},selectedName:{color:'#1f2a58',fontWeight:'800',fontSize:15},
  priceInline:{color:'#4f7cff',fontWeight:'800',fontSize:13},metaRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:4},metaTxt:{color:'#7a8cc2',fontSize:12},dot:{color:'#c0cbe8'},
  changeBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8,marginBottom:8},changeTxt:{color:'#4f7cff',fontWeight:'600'},
  listCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#e4ebff',padding:12,marginBottom:8},
  listCardSel:{borderColor:'#4f7cff',backgroundColor:'#edf2ff'},listColorDot:{width:10,height:10,borderRadius:5},
  listName:{color:'#1f2a58',fontWeight:'700',fontSize:13},listMeta:{color:'#7a8cc2',fontSize:11,marginTop:2},listPrice:{color:'#4f7cff',fontWeight:'700',fontSize:13},
  // Guide
  guidePickCard:{flexDirection:'row',alignItems:'flex-start',gap:12,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:10},
  guideAvatar:{width:44,height:44,borderRadius:12,backgroundColor:'#4f7cff',alignItems:'center',justifyContent:'center'},
  guidePickName:{color:'#1f2a58',fontWeight:'800',fontSize:14,flex:1},guidePickMeta:{color:'#7a8cc2',fontSize:12,marginTop:3},
  busyBadge:{backgroundColor:'#fee2e2',borderRadius:8,paddingHorizontal:8,paddingVertical:3},busyTxt:{color:'#dc2626',fontSize:11,fontWeight:'700'},
  skillsRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:6},skillChip:{backgroundColor:'#eaf0ff',borderRadius:8,paddingHorizontal:8,paddingVertical:3},skillTxt:{color:'#4f7cff',fontSize:11,fontWeight:'600'},
  matchBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'#edf2ff',borderRadius:8,paddingHorizontal:7,paddingVertical:3},matchTxt:{color:'#4f7cff',fontSize:11,fontWeight:'700'},
  pickBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#fff',borderRadius:14,borderWidth:1.5,borderColor:'#4f7cff',paddingVertical:12,marginBottom:12},
  pickBtnTxt:{color:'#4f7cff',fontWeight:'700',fontSize:14},skipBtn:{alignItems:'center',paddingVertical:10},skipTxt:{color:'#7a8cc2',fontWeight:'600'},
  // Tour summary
  tourSummaryCard:{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:'#dfe7ff',padding:12,marginBottom:10},
  tSumLbl:{color:'#7a8cc2',fontSize:12},tSumName:{color:'#1f2a58',fontWeight:'700',marginTop:4},tSumMeta:{color:'#6f83bb',fontSize:12,marginTop:2},
  guideMiniCard:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#edf2ff',borderRadius:10,padding:10,marginBottom:12},guideMiniTxt:{flex:1,color:'#4f7cff',fontSize:12},
  // Addons
  addonCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderWidth:1,borderColor:'#e4ebff',borderRadius:14,padding:12,marginBottom:10},
  addonCardActive:{borderColor:'#4f7cff',backgroundColor:'#f0f4ff'},addonIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#edf2ff',alignItems:'center',justifyContent:'center'},
  addonLabel:{color:'#1f2a58',fontWeight:'700'},addonPrice:{color:'#7a8cc2',fontSize:12,marginTop:4},
  checkbox:{width:24,height:24,borderRadius:7,borderWidth:2,borderColor:'#c0cbe8',alignItems:'center',justifyContent:'center'},checkboxActive:{backgroundColor:'#4f7cff',borderColor:'#4f7cff'},
  summaryCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginVertical:4},divider:{height:1,backgroundColor:'#eef2ff',marginVertical:8},
  rowWrap:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#f0f4ff'},rowLbl:{color:'#7a8cc2'},rowVal:{color:'#1f2a58',fontWeight:'600'},
  // Checkout
  checkoutCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12},
  guestCard:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12},
  guestLbl:{color:'#1f2a58',fontWeight:'700'},stepperRow:{flexDirection:'row',alignItems:'center',gap:14},
  stepperBtn:{width:32,height:32,borderRadius:10,backgroundColor:'#edf2ff',alignItems:'center',justifyContent:'center'},stepperNum:{color:'#1f2a58',fontWeight:'800',fontSize:18},
  payCard:{backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12},payTitle:{color:'#1f2a58',fontWeight:'700',marginBottom:8},
  payOpt:{height:44,borderRadius:12,borderWidth:1,borderColor:'#dfe7ff',backgroundColor:'#fff',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,marginTop:8},
  payOptActive:{borderColor:'#4f7cff',backgroundColor:'#edf2ff'},payOptTxt:{color:'#1f2a58',fontWeight:'600'},
  escrowBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#edf2ff',borderWidth:1,borderColor:'#d0dbff',borderRadius:12,padding:10,marginBottom:14},escrowTxt:{color:'#4f7cff',fontWeight:'600',fontSize:12,flex:1},
  // Wait
  waitHeader:{alignItems:'center',marginBottom:16},waitIconWrap:{width:76,height:76,borderRadius:20,backgroundColor:'#edf2ff',alignItems:'center',justifyContent:'center',marginBottom:10},
  waitTitle:{color:'#1f2a58',fontSize:20,fontWeight:'800'},waitSub:{color:'#7a8cc2',textAlign:'center',marginTop:6,lineHeight:20},
  timerBox:{alignItems:'center',backgroundColor:'#fff0f0',borderRadius:14,padding:14,marginBottom:14},timerLbl:{color:'#ef4444',fontWeight:'700'},timerNum:{color:'#ef4444',fontWeight:'900',fontSize:28,marginTop:4},
  bookInfoCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:14},bookInfoTitle:{color:'#1f2a58',fontWeight:'700',marginBottom:10},
  qrCard:{backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:'#e4ebff',padding:20,alignItems:'center',marginBottom:14},qrLbl:{color:'#7a8cc2',marginBottom:14,fontWeight:'600'},
  qrBox:{width:160,height:160,backgroundColor:'#f0f4ff',borderRadius:14,alignItems:'center',justifyContent:'center',marginBottom:12},
  qrCell:{width:20,height:20,backgroundColor:'#4f7cff',borderRadius:3},qrCellEmpty:{width:20,height:20,backgroundColor:'#dae4ff',borderRadius:3},
  qrCode:{color:'#1f2a58',fontWeight:'700',fontSize:15},qrHint:{color:'#7a8cc2',fontSize:12,marginTop:6,textAlign:'center'},
  simulateBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:10,marginBottom:10,borderRadius:12,borderWidth:1,borderColor:'#e4ebff',backgroundColor:'#f7f9ff'},
  simulateTxt:{fontWeight:'600',fontSize:12},
  // Chat
  chatHeader:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:10,borderWidth:1,borderColor:'#e4ebff'},
  chatAvatar:{width:44,height:44,borderRadius:12,backgroundColor:'#4f7cff',alignItems:'center',justifyContent:'center'},chatGuideName:{color:'#1f2a58',fontWeight:'800',fontSize:15},
  onlineDot:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3},onlineDotInner:{width:7,height:7,borderRadius:4,backgroundColor:'#16a34a'},onlineTxt:{color:'#16a34a',fontSize:12,fontWeight:'600'},
  reminderBox:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#fff8ec',borderWidth:1,borderColor:'#f5dba0',borderRadius:12,padding:10,marginBottom:10},reminderTxt:{color:'#a0680e',fontSize:12,flex:1,lineHeight:18},
  chatMessages:{maxHeight:200,backgroundColor:'#fff',borderRadius:14,padding:12,marginBottom:10,borderWidth:1,borderColor:'#e4ebff'},
  systemMsg:{alignItems:'center',marginBottom:8},systemMsgTxt:{color:'#94a3b8',fontSize:11,fontWeight:'600'},
  bubble:{maxWidth:'80%',borderRadius:14,padding:10,marginBottom:8},bubbleGuide:{backgroundColor:'#edf2ff',alignSelf:'flex-start'},bubbleGuest:{backgroundColor:'#4f7cff',alignSelf:'flex-end'},
  bubbleTxt:{color:'#1f2a58',fontSize:13},bubbleTime:{color:'#94a3b8',fontSize:10,marginTop:4,alignSelf:'flex-end'},
  chatInputRow:{flexDirection:'row',gap:8,alignItems:'center'},
  chatInput:{flex:1,backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:'#e4ebff',paddingHorizontal:14,paddingVertical:10,color:'#1f2a58',fontSize:14},
  sendBtn:{width:44,height:44,borderRadius:12,backgroundColor:'#4f7cff',alignItems:'center',justifyContent:'center'},
  // Check-in
  meetCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12},
  meetPlace:{color:'#1f2a58',fontWeight:'700',fontSize:14},meetTime:{color:'#4f7cff',fontSize:13,marginTop:2},
  verifyCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:14,gap:14},
  verifyRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},verifyLbl:{color:'#1f2a58',fontWeight:'600'},verifyStatus:{fontSize:12,fontWeight:'700'},
  verifyActionBtn:{backgroundColor:'#edf2ff',borderRadius:8,paddingHorizontal:10,paddingVertical:5},verifyActionTxt:{color:'#4f7cff',fontWeight:'700',fontSize:12},
  statusOK:{color:'#16a34a'},statusPending:{color:'#d97706'},
  // On-tour
  liveRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  liveBadge:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#fff0f3',borderRadius:10,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:'#ffccd5'},
  liveDot:{width:8,height:8,borderRadius:4,backgroundColor:'#ff4d6d'},liveTxt:{color:'#ff4d6d',fontWeight:'800',fontSize:11},
  insureCard:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'#f0fdf4',borderRadius:14,borderWidth:1,borderColor:'#bbf7d0',padding:12,marginBottom:12},
  insureCardAlert:{backgroundColor:'#fef2f2',borderColor:'#fecaca'},insureTxt:{color:'#16a34a',fontSize:12,fontWeight:'600',lineHeight:18,flex:1},
  mapBox:{height:140,borderRadius:18,backgroundColor:'#dae8ff',alignItems:'center',justifyContent:'center',gap:6,marginBottom:12,borderWidth:1,borderColor:'#b8d4ff'},
  mapTxt:{color:'#4f7cff',fontWeight:'700',fontSize:14},mapSub:{color:'#7a8cc2',fontSize:11},
  controlRow:{flexDirection:'row',gap:10,marginBottom:12},
  controlBtn:{flex:1,height:40,borderRadius:10,borderWidth:1,borderColor:'#dfe7ff',backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  controlTxt:{color:'#4f7cff',fontWeight:'600',fontSize:12},
  healthCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12},healthTitle:{color:'#1f2a58',fontWeight:'700',marginBottom:14},
  healthRow:{flexDirection:'row',justifyContent:'space-between'},healthItem:{flex:1,alignItems:'center',gap:4},healthNum:{color:'#1f2a58',fontWeight:'700',fontSize:18},healthLbl:{color:'#7a8cc2',fontSize:10,textAlign:'center'},
  aiBanner:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',marginTop:12,backgroundColor:'#edf9f0',borderRadius:10,padding:8},aiBannerWarn:{backgroundColor:'#fff4e8'},aiTxt:{color:'#3dc87d',fontWeight:'700',fontSize:11,flex:1},
  routeCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:14,marginBottom:12,gap:10},routeTitle:{color:'#1f2a58',fontWeight:'700',marginBottom:4},
  routeItem:{flexDirection:'row',alignItems:'center',gap:10},routeTxt:{color:'#5a6897',fontSize:12},
  // Review
  reviewGuideCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#e4ebff',padding:12,marginBottom:14},
  reviewGuideName:{color:'#1f2a58',fontWeight:'700',fontSize:15},reviewTourName:{color:'#7a8cc2',fontSize:12,marginTop:3},
  ratingCard:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#e4ebff',padding:16,alignItems:'center',marginBottom:12},
  ratingLbl:{color:'#7a8cc2',marginBottom:12,fontWeight:'600'},starRow:{flexDirection:'row',gap:8},ratingHint:{color:'#f59e0b',fontWeight:'700',marginTop:8,fontSize:14},
  commentWrap:{marginBottom:12},commentLbl:{color:'#1f2a58',fontWeight:'700',marginBottom:8},commentInput:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e4ebff',borderRadius:14,padding:12,minHeight:100,color:'#1f2a58'},
  // Done
  doneWrap:{alignItems:'center',paddingTop:40,gap:16},doneFinalTitle:{color:'#1f2a58',fontSize:26,fontWeight:'800'},doneFinalSub:{color:'#7a8cc2',textAlign:'center'},
  // Modal
  modalOverlay:{flex:1,justifyContent:'flex-end'},modalBackdrop:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(10,18,50,0.45)'},
  modalSheet:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'88%'},modalHandle:{width:40,height:4,backgroundColor:'#e4ebff',borderRadius:2,alignSelf:'center',marginTop:12},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#f0f4ff'},
  modalTitle:{fontSize:17,fontWeight:'800',color:'#1f2a58'},closeBtn:{width:32,height:32,borderRadius:10,backgroundColor:'#f3f7ff',alignItems:'center',justifyContent:'center'},
  modalHint:{backgroundColor:'#edf2ff',borderRadius:12,padding:12,color:'#4f7cff',fontSize:12,marginBottom:12},
  // Shared buttons
  primaryBtn:{height:52,borderRadius:14,backgroundColor:'#4f7cff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,shadowColor:'#4f7cff',shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:10,elevation:4},
  primaryBtnOff:{backgroundColor:'#9bb3ed',shadowOpacity:0},primaryBtnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
});