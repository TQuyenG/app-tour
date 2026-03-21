/**
 * guest_notifications.tsx
 * Đổi tên từ: notifications.tsx
 * Đọc @guest_notifications từ AsyncStorage (ghi bởi booking flow)
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = '@guest_notifications';

interface GuestNotif { id: string; message: string; read: boolean; createdAt: string; }

export default function GuestNotificationsScreen() {
  const [notifs, setNotifs] = useState<GuestNotif[]>([]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => { if (raw) setNotifs(JSON.parse(raw)); }).catch(() => {});
  }, []));

  const markRead = async (id: string) => {
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const clearAll = async () => {
    setNotifs([]);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <ScrollView style={st.screen} contentContainerStyle={st.content}>
      <Text style={st.title}>Thông báo</Text>
      <Text style={st.subtitle}>Cập nhật mới nhất về đặt tour và ưu đãi</Text>

      <View style={st.topRow}>
        {unread > 0 && <View style={st.unreadBadge}><Text style={st.unreadTxt}>{unread} chưa đọc</Text></View>}
        <TouchableOpacity style={st.clearBtn} onPress={clearAll}><Text style={st.clearTxt}>Xóa tất cả</Text></TouchableOpacity>
      </View>

      {notifs.map(item => (
        <TouchableOpacity key={item.id} style={[st.item, item.read && st.itemRead]} onPress={() => markRead(item.id)}>
          <View style={[st.iconWrap, item.read && st.iconRead]}>
            <Ionicons name={item.read ? 'mail-open-outline' : 'notifications-outline'} size={18} color="#4f7cff" />
          </View>
          <View style={st.itemBody}>
            <Text style={[st.itemText, !item.read && { fontWeight: '700', color: '#1f2a58' }]}>{item.message}</Text>
            <Text style={st.itemMeta}>{item.read ? 'Đã đọc' : 'Chưa đọc'}</Text>
          </View>
          {!item.read && <View style={st.unreadDot} />}
        </TouchableOpacity>
      ))}

      {notifs.length === 0 && (
        <View style={st.empty}>
          <Ionicons name="notifications-off-outline" size={48} color="#c0cbe8" />
          <Text style={st.emptyTxt}>Bạn chưa có thông báo nào.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f7ff' },
  content: { padding: 18 },
  title: { color: '#1f2a58', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#7a8cc2', marginTop: 6, marginBottom: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  unreadBadge: { backgroundColor: '#edf2ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  unreadTxt: { color: '#4f7cff', fontWeight: '700', fontSize: 12 },
  clearBtn: { alignSelf: 'flex-end' },
  clearTxt: { color: '#4f7cff', fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e4ebff', backgroundColor: '#fff', padding: 12, marginBottom: 10 },
  itemRead: { backgroundColor: '#f7faff', borderColor: '#eef3ff' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#edf2ff', alignItems: 'center', justifyContent: 'center' },
  iconRead: { backgroundColor: '#f3f7ff' },
  itemBody: { flex: 1 },
  itemText: { color: '#5f73a9', lineHeight: 20 },
  itemMeta: { color: '#7a8cc2', marginTop: 4, fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f7cff' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { color: '#7a8cc2', textAlign: 'center' },
});