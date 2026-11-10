/**
 * Premium Tab Bar Layout — Vinnot Mobile
 */
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { iconStrokes, radii, shadowColors } from "@/shared/theme/tokens";
import { TabBarLabel } from "@/presentation/components/layout/TabBarLabel";
import { openTabRoot } from "@/presentation/navigation/tabNavigation";
import { Map, CalendarDays, House, UserRound, Wine, type LucideIcon } from "lucide-react-native";

interface TabIconProps {
  focused: boolean;
  Icon: LucideIcon;
}

/** Same tints as tabBarActiveTintColor / tabBarInactiveTintColor; Lucide takes string colours only. */
function TabIcon({ focused, Icon }: TabIconProps) {
  return (
    <Icon
      size={focused ? 23 : 22}
      color={focused ? vinnotColors.brand : vinnotColors.muted}
      strokeWidth={focused ? iconStrokes.strong : iconStrokes.regular}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenListeners={({ route, navigation }) => ({
        tabPress: (event) => {
          const tab = route.name;
          if (
            tab === "home" ||
            tab === "wines" ||
            tab === "events" ||
            tab === "routes" ||
            tab === "profile"
          ) {
            event.preventDefault();
            openTabRoot(navigation, tab);
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: vinnotColors.canvas,
        },
        tabBarStyle: {
          height: 66 + insets.bottom,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingHorizontal: 4,
          backgroundColor: vinnotColors.white,
          borderTopWidth: 1,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderColor: vinnotColors.borderSoft,
          borderTopLeftRadius: radii["3xl"],
          borderTopRightRadius: radii["3xl"],
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          ...Platform.select({
            ios: {
              shadowColor: shadowColors.soft,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 14,
            },
            android: { elevation: 10 },
          }),
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: vinnotColors.brand,
        tabBarInactiveTintColor: vinnotColors.muted,
        tabBarActiveBackgroundColor: vinnotColors.brandSoft,
        tabBarInactiveBackgroundColor: vinnotColors.white,
        tabBarLabel: ({ color, children }) => <TabBarLabel color={color}>{children}</TabBarLabel>,
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarItemStyle: {
          height: 56,
          marginHorizontal: 2,
          borderRadius: radii.lg,
          overflow: "hidden",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("navigation.home"),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={House} />
          ),
        }}
      />
      <Tabs.Screen
        name="wines"
        options={{
          title: t("navigation.wines"),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Wine} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t("navigation.events"),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={CalendarDays} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: t("navigation.routes"),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Map} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={UserRound} />
          ),
        }}
      />
    </Tabs>
  );
}
