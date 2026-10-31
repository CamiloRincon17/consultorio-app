import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  Appearance,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";
import { useSettingsStore } from "../../features/settings/store";
import { useDialog } from "../../shared/context/DialogContext";

export default function ConfigApariencia() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const dialog = useDialog();
  const theme = useSettingsStore((s) => s.theme);
  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    // ensure color scheme applied on mount
    if (isLoaded) {
      Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
    }
  }, [isLoaded, theme]);

  const themes = [
    { key: "system", label: "Sistema", icon: "phone-portrait-outline", desc: "Seguir configuración del dispositivo" },
    { key: "light", label: "Claro", icon: "sunny-outline", desc: "Interfaz clara" },
    { key: "dark", label: "Oscuro", icon: "moon-outline", desc: "Interfaz oscura" },
  ] as const;

  const handleChange = async (newTheme: typeof themes[number]["key"]) => {
    try {
      await setTheme(newTheme as any);
      dialog.alert(
        "Guardado",
        `Tema configurado: ${themes.find((t) => t.key === newTheme)?.label}`,
        "success"
      );
    } catch {
      dialog.alert("Error", "No se pudo guardar la preferencia de tema", "error");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tema de la aplicación</Text>
        <Text style={styles.sectionSubtitle}>
          Esta preferencia aplica el esquema de color a nivel del sistema. Algunos componentes ya usan colores fijos (por diseño de la app), pero el esquema afecta a barras de estado y componentes nativos.
        </Text>
        {themes.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.item, theme === t.key && styles.itemActive]}
            onPress={() => handleChange(t.key)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: (theme === t.key ? colors.primary : colors.surface) + "20" },
              ]}
            >
              <Ionicons
                name={t.icon as any}
                size={22}
                color={theme === t.key ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{t.label}</Text>
              <Text style={styles.itemSubtitle}>{t.desc}</Text>
            </View>
            {theme === t.key && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <Text style={styles.infoText}>
          • &quot;Sistema&quot; usa el valor de &lsquo;userInterfaceStyle&rsquo; del dispositivo.
        </Text>
        <Text style={styles.infoText}>
          • Los cambios se guardan localmente y se aplicarán la próxima vez que abras la app.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 24 },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 18,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginBottom: 6,
    },
    itemActive: {
      backgroundColor: colors.primary + "0D",
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    itemContent: { flex: 1 },
    itemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    itemSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 20,
    },
  });
