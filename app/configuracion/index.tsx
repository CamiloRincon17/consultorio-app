import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";

type MenuItem = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

export default function ConfigIndex() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const items: MenuItem[] = [
    {
      label: "General",
      subtitle: "Perfil, notificaciones y sesión",
      icon: "settings-outline",
      color: colors.primary,
      route: "/configuracion/general",
    },
    {
      label: "Sincronización",
      subtitle: "Estado de la nube y datos pendientes",
      icon: "cloud-outline",
      color: "#0EA5E9",
      route: "/configuracion/sync",
    },
    {
      label: "Apariencia",
      subtitle: "Tema claro, oscuro o del sistema",
      icon: "color-palette-outline",
      color: "#8B5CF6",
      route: "/configuracion/apariencia",
    },
    {
      label: "Copias de Seguridad",
      subtitle: "Exportar e importar tus datos",
      icon: "save-outline",
      color: "#10B981",
      route: "/configuracion/backups",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.heading}>Ajustes de la aplicación</Text>

      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push(item.route as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: item.color + "1A" }]}>
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      ))}

      <Text style={styles.footer}>Consultorio App v1.0</Text>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    heading: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 4,
      marginLeft: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    footer: {
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 16,
    },
  });
