/**
 * components/AdminTabBar.tsx
 * Bottom tab bar dùng chung cho Admin và Guide screens
 * Thiết kế giống tab của Guest nhưng với màu sắc và items riêng
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Admin tabs ───────────────────────────────────────────────
const ADMIN_TABS = [
  {
    icon: "home-outline",
    iconActive: "home",
    label: "Tổng quan",
    route: "/admin-home",
  },
  {
    icon: "map-outline",
    iconActive: "map",
    label: "Tour",
    route: "/admin-tour-management",
  },
  {
    icon: "people-outline",
    iconActive: "people",
    label: "HDV",
    route: "/admin-guide-management",
  },
  {
    icon: "bar-chart-outline",
    iconActive: "bar-chart",
    label: "Báo cáo",
    route: "/admin-report",
  },
  {
    icon: "person-outline",
    iconActive: "person",
    label: "Profile",
    route: "/admin-profile",
  },
] as const;

// ─── Guide tabs ───────────────────────────────────────────────
const GUIDE_TABS = [
  {
    icon: "home-outline",
    iconActive: "home",
    label: "Tổng quan",
    route: "/guide-home",
  },
  {
    icon: "calendar-outline",
    iconActive: "calendar",
    label: "Booking",
    route: "/guide-booking-management",
  },
  {
    icon: "time-outline",
    iconActive: "time",
    label: "Lịch",
    route: "/guide-schedule-management",
  },
  {
    icon: "cash-outline",
    iconActive: "cash",
    label: "Thu nhập",
    route: "/guide-earnings",
  },
  {
    icon: "person-outline",
    iconActive: "person",
    label: "Hồ sơ",
    route: "/guide-profile",
  },
] as const;

interface Props {
  role: "admin" | "guide";
  activeRoute: string;
}

export function AdminTabBar({ role, activeRoute }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabs = role === "admin" ? ADMIN_TABS : GUIDE_TABS;

  return (
    <View
      style={[
        st.tabBar,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive =
          activeRoute === tab.route || activeRoute.startsWith(tab.route);
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
    borderTopColor: "#e8eeff",
    // Floating style giống guest
    shadowColor: "#2a4caf",
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
  tabIconWrapActive: {
    backgroundColor: "#4f7cff",
  },
  tabLabel: {
    color: "#94a8d8",
    fontSize: 10,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#4f7cff",
  },
});
