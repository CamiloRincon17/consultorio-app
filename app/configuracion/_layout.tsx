import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useColors } from "../../shared/theme";

export default function ConfigLayout() {
  const router = useRouter();
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerBackTitle: "Atrás",
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Configuración",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="general" options={{ title: "General" }} />
      <Stack.Screen name="sync" options={{ title: "Sincronización" }} />
      <Stack.Screen name="apariencia" options={{ title: "Apariencia" }} />
      <Stack.Screen name="backups" options={{ title: "Copias de Seguridad" }} />
    </Stack>
  );
}
