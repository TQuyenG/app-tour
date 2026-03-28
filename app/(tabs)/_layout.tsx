import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GuestChatBubble } from '@/components/GuestChatBubble';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <GuestChatBubble />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f7cff',
        tabBarInactiveTintColor: '#b0bde0',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 14,
          shadowColor: '#2a4caf',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Đơn đặt',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
    </View>
  );
}