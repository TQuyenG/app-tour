/**
 * components/ui/StaffTabBar.tsx
 * Bottom tab bar dùng chung cho Staff (CSKH) screens
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STAFF_TABS = [
  { icon: "home-outline",         iconActive: "home",         label: "Tổng quan",  route: "/staff-home" },
  { icon: "receipt-outline",      iconActive: "receipt",      label: "Booking",    route: "/staff-booking-management" },
  { icon: "warning-outline",      iconActive: "warning",      label: "Khiếu nại",  route: "/staff-complaints" },
  { icon: "chatbubbles-outline",  iconActive: "chatbubbles",  label: "Live chat",  route: "/staff-livechat" },
  { icon: "person-outline",       iconActive: "person",       label: "Hồ sơ",      route: "/staff-profile" },
] as const;

interface Props {
  activeRoute: string;
}

export function StaffTabBar({ activeRoute }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        st.tabBar,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 8) },
      ]}
    >
      {STAFF_TABS.map((tab) => {
        const isActive = activeRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            style={st.tabItem}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.75}
          >
            <View style={[st.tabIconWrap, isActive && st.tabIconWrapActive]}>
              <Ionicons
                name={isActive ? (tab.iconActive as any) : (tab.icon as any)}
                size={20}
                color={isActive ? "#fff" : "#94a8d8"}
              />
            </View>
            <Text style={[st.tabLabel, isActive && st.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#fef3c7",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: { backgroundColor: "#f59e0b" },
  tabLabel: { color: "#94a8d8", fontSize: 10, fontWeight: "600" },
  tabLabelActive: { color: "#f59e0b" },
});