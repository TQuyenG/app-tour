import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { registerAccount } from '@/constants/app-accounts';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!name.trim())  { Alert.alert('Thiếu', 'Nhập họ và tên.'); return; }
    if (!email.trim()) { Alert.alert('Thiếu', 'Nhập email.'); return; }
    if (password.length < 6) { Alert.alert('Mật khẩu yếu', 'Tối thiểu 6 ký tự.'); return; }
    if (password !== confirm) { Alert.alert('Không khớp', 'Mật khẩu xác nhận chưa đúng.'); return; }
    setLoading(true);
    const res = await registerAccount(name.trim(), email.trim(), phone.trim(), password);
    setLoading(false);
    if (!res.ok) { Alert.alert('Lỗi', res.error); return; }
    router.push('/guest_kyc' as any);
  };

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <Text style={st.brand}>TourGo</Text>
        <Text style={st.title}>Tạo tài khoản</Text>
        <Text style={st.sub}>Đăng ký để đặt tour và kết nối hướng dẫn viên</Text>
        <View style={st.form}>
          <Row icon="person-outline" placeholder="Họ và tên *" value={name} onChangeText={setName}/>
          <Row icon="mail-outline" placeholder="Email *" value={email} onChangeText={setEmail} keyboard="email-address" cap="none"/>
          <Row icon="call-outline" placeholder="Số điện thoại" value={phone} onChangeText={setPhone} keyboard="phone-pad"/>
          <View style={st.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#8ea0d6"/>
            <TextInput style={[st.input,{flex:1}]} placeholder="Mật khẩu * (≥6 ký tự)" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} placeholderTextColor="#b0bdd8"/>
            <TouchableOpacity onPress={()=>setShowPwd(v=>!v)} style={{padding:6}}>
              <Ionicons name={showPwd?'eye-outline':'eye-off-outline'} size={17} color="#8ea0d6"/>
            </TouchableOpacity>
          </View>
          <View style={[st.inputRow, confirm&&password!==confirm&&{borderColor:'#fecaca'}]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#8ea0d6"/>
            <TextInput style={[st.input,{flex:1}]} placeholder="Xác nhận mật khẩu *" value={confirm} onChangeText={setConfirm} secureTextEntry={!showPwd} placeholderTextColor="#b0bdd8"/>
            {confirm.length>0&&<Ionicons name={password===confirm?'checkmark-circle':'close-circle'} size={17} color={password===confirm?'#16a34a':'#ef4444'}/>}
          </View>
          <TouchableOpacity style={[st.btn,loading&&{opacity:0.6}]} onPress={go} disabled={loading}>
            <Ionicons name="person-add-outline" size={17} color="#fff"/>
            <Text style={st.btnTxt}>{loading?'Đang tạo tài khoản...':'Đăng ký & Xác thực danh tính'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.vneidBtn} onPress={()=>router.push('/vneid-login' as any)}>
            <Ionicons name="shield-checkmark-outline" size={17} color="#1f2a58"/>
            <Text style={st.vneidTxt}>Đăng ký nhanh với VNeID</Text>
          </TouchableOpacity>
        </View>
        <Text style={st.terms}>Bằng cách đăng ký, bạn đồng ý với <Text style={{color:'#4f7cff',fontWeight:'600'}}>Điều khoản</Text> của TourGo.</Text>
        <View style={st.bottomRow}>
          <Text style={st.bottomTxt}>Đã có tài khoản?</Text>
          <Link href="/login" style={st.link}>  Đăng nhập</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({icon,placeholder,value,onChangeText,keyboard,cap}:{icon:any;placeholder:string;value:string;onChangeText:(v:string)=>void;keyboard?:any;cap?:any}){
  return(
    <View style={st.inputRow}>
      <Ionicons name={icon} size={18} color="#8ea0d6"/>
      <TextInput style={st.input} placeholder={placeholder} value={value} onChangeText={onChangeText} keyboardType={keyboard||'default'} autoCapitalize={cap||'words'} placeholderTextColor="#b0bdd8"/>
    </View>
  );
}

const st = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f3f7ff'},
  content:{padding:24,paddingTop:60,paddingBottom:40},
  brand:{color:'#4f7cff',fontWeight:'700',fontSize:24},
  title:{color:'#1f2a58',fontSize:28,fontWeight:'700',marginTop:14},
  sub:{color:'#7a8cc2',marginTop:8,marginBottom:22,lineHeight:20},
  form:{gap:11},
  inputRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fff',borderWidth:1,borderColor:'#e4ebff',borderRadius:14,paddingHorizontal:12},
  input:{flex:1,paddingVertical:13,color:'#1f2a58',fontSize:14},
  btn:{height:52,borderRadius:14,backgroundColor:'#4f7cff',justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8,marginTop:8,elevation:4,shadowColor:'#4f7cff',shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:10},
  btnTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  vneidBtn:{height:48,borderRadius:14,borderWidth:1.5,borderColor:'#d0dbff',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',gap:8,flexDirection:'row'},
  vneidTxt:{color:'#1f2a58',fontWeight:'700'},
  terms:{color:'#94a3b8',fontSize:12,textAlign:'center',marginTop:16,lineHeight:18},
  bottomRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',marginTop:16},
  bottomTxt:{color:'#7a8cc2',fontSize:15},
  link:{color:'#4f7cff',fontWeight:'700',fontSize:15},
});