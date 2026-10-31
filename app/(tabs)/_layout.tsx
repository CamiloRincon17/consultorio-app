import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColors } from "../../shared/theme";

export default function TabsLayout() {
    const colors = useColors();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                lazy: true,
                freezeOnBlur: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                sceneStyle: { backgroundColor: colors.background },
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    elevation: 0,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Inicio",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="pacientes"
                options={{
                    title: "Pacientes",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="agenda"
                options={{
                    title: "Agenda",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="finanzas"
                options={{
                    title: "Finanzas",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
