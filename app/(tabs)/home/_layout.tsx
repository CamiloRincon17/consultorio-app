import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { View, Text, Image, Pressable, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useColors, useThemedStyles, type Palette } from "../../../shared/theme";
import { useProfileStore } from "../../../features/profile/store";
import { useAuthStore } from "../../../features/auth/store";

type Item = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen?: string;   // pantalla interna del drawer -> navigation.navigate
  route?: string;    // ruta externa -> router.push
  action?: () => void; // acción directa (ej. cerrar sesión)
  badge?: number;
};

function Section({ title, items, onPress, colors, styles }: { title: string; items: Item[]; onPress: (i: Item) => void; colors: Palette; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.label} style={styles.row} activeOpacity={0.7} onPress={() => onPress(item)}>
          <View style={styles.rowIcon}>
            <Ionicons name={item.icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {!!item.badge && item.badge > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CustomDrawer(props: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const openProfile = () => {
    props.navigation.closeDrawer();
    router.push("/perfil-doctor");
  };

  const handlePress = (item: Item) => {
    if (item.action) { props.navigation.closeDrawer(); item.action(); }
    else if (item.screen) props.navigation.navigate(item.screen);
    else if (item.route) { props.navigation.closeDrawer(); router.push(item.route as any); }
  };

  const blocks: { title: string; items: Item[] }[] = [
    {
      title: "General", items: [
        { label: "Inicio", icon: "home-outline", screen: "index" },
      ]
    },
    {
      title: "Gestión", items: [
        { label: "Configuración", icon: "settings-outline", route: "/configuracion" },
      ]
    },
    {
      title: "Reportes", items: [
        { label: "Reporte semanal", icon: "trending-up-outline", route: "/reporte-semanal" },
        { label: "Reporte mensual", icon: "bar-chart-outline", route: "/reporte-mensual" },
      ]
    },
    {
      title: "Cuenta", items: [
        { label: "Cerrar sesión", icon: "log-out-outline", action: signOut },
      ]
    },
  ];

  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      {/* ── Header del doctor (toca para editar) ── */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <Pressable style={styles.header} onPress={openProfile}>
          <View style={styles.headerRow}>
            <Image source={require("../../../assets/images/icon.png")} style={styles.appIcon} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {profile.fullName || "Completa tu perfil"}
              </Text>
              <Text style={styles.headerSpec} numberOfLines={1}>
                {profile.specialization || "Agrega tus datos personales"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#ffffffcc" />
          </View>

          {(profile.clinicName || profile.phone) && (
            <View style={styles.headerMeta}>
              {!!profile.clinicName && (
                <View style={styles.metaItem}>
                  <Ionicons name="business-outline" size={13} color="#ffffffcc" />
                  <Text style={styles.metaText} numberOfLines={1}>{profile.clinicName}</Text>
                </View>
              )}
              {!!profile.phone && (
                <View style={styles.metaItem}>
                  <Ionicons name="call-outline" size={13} color="#ffffffcc" />
                  <Text style={styles.metaText}>{profile.phone}</Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      </SafeAreaView>

      {/* ── Bloques ── */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {blocks.map((b) => (
          <Section key={b.title} title={b.title} items={b.items} onPress={handlePress} colors={colors} styles={styles} />
        ))}
        <Text style={styles.version}>Versión {Constants.expoConfig?.version ?? "—"}</Text>
      </ScrollView>
    </View>
  );
}

export default function HomeDrawerLayout() {
  const colors = useColors();
  const renderDrawer = (props: any) => <CustomDrawer {...props} />;
  return (
    <Drawer
      drawerContent={renderDrawer}
      screenOptions={{ headerShown: false, drawerActiveTintColor: colors.primary }}
    >
      <Drawer.Screen name="index" options={{ title: "Inicio" }} />
    </Drawer>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerSafe: { backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
  },
  headerName: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSpec: {
    color: "#ffffffdd",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerMeta: {
    marginTop: 12,
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#ffffffdd",
    fontSize: 12,
  },
  section: { paddingHorizontal: 12, marginTop: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6,
    color: colors.textSecondary, marginHorizontal: 12, marginTop: 14, marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  rowIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + "14",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  badge: { backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, marginRight: 6 },
  badgeText: { color: "white", fontSize: 11, fontWeight: "700" },
  version: { textAlign: "center", color: colors.textSecondary, fontSize: 11, marginTop: 20, marginBottom: 12 },
});
