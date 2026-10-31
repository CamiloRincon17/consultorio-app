import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";
import { usePatientsStore } from "../../features/patients/store";
import { useAuthStore } from "../../features/auth/store";
import { useDialog } from "../../shared/context/DialogContext";

export default function ConfigGeneral() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const patients = usePatientsStore((s) => s.patients);
  const dialog = useDialog();
  const signOut = useAuthStore((s) => s.signOut);
  const userEmail = useAuthStore((s) => s.user?.email ?? "");

  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    daysInAdvance: 1,
    notificationHour: 9,
    notificationMinute: 0,
  });
  const [pendingNotifications, setPendingNotifications] = useState(0);

  const loadPendingNotifications = async () => {
    try {
      const { NotificationService } = await import(
        "../../services/NotificationService"
      );
      const scheduled = await NotificationService.getAllScheduledNotifications();
      setPendingNotifications(scheduled.length);
    } catch (error) {
      console.error("Error loading pending notifications:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initNotificationData = async () => {
      try {
        const { NotificationService } = await import(
          "../../services/NotificationService"
        );
        const [settings, scheduled] = await Promise.all([
          NotificationService.getSettings(),
          NotificationService.getAllScheduledNotifications(),
        ]);

        if (isMounted) {
          setNotificationSettings(settings);
          setPendingNotifications(scheduled.length);
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
      }
    };

    initNotificationData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      const { NotificationService } = await import(
        "../../services/NotificationService"
      );
      const newSettings = { ...notificationSettings, enabled };
      await NotificationService.saveSettings(newSettings);
      setNotificationSettings(newSettings);

      if (enabled) {
        await NotificationService.rescheduleAllNotifications(patients);
        dialog.alert(
          "Notificaciones activadas",
          "Se han programado las notificaciones pendientes",
          "success"
        );
      } else {
        await NotificationService.cancelAllNotifications();
        dialog.alert(
          "Notificaciones desactivadas",
          "Se cancelaron todas las notificaciones",
          "success"
        );
      }

      await loadPendingNotifications();
    } catch (error) {
      console.error("Error toggling notifications:", error);
      dialog.alert(
        "Error",
        "No se pudo cambiar la configuración de notificaciones",
        "error"
      );
    }
  };

  const handleChangeDaysInAdvance = async (days: number) => {
    try {
      const { NotificationService } = await import(
        "../../services/NotificationService"
      );
      const newSettings = { ...notificationSettings, daysInAdvance: days };
      await NotificationService.saveSettings(newSettings);
      setNotificationSettings(newSettings);

      if (notificationSettings.enabled) {
        await NotificationService.rescheduleAllNotifications(patients);
        await loadPendingNotifications();
      }

      dialog.alert(
        "Guardado",
        `Se notificará ${days} día${days > 1 ? "s" : ""} antes`,
        "success"
      );
    } catch (error) {
      console.error("Error setting days in advance:", error);
      dialog.alert("Error", "No se pudo guardar la configuración", "error");
    }
  };

  const handleViewPendingNotifications = async () => {
    try {
      const { NotificationService } = await import(
        "../../services/NotificationService"
      );
      const scheduled = await NotificationService.getAllScheduledNotifications();

      if (scheduled.length === 0) {
        dialog.alert(
          "Sin notificaciones",
          "No hay notificaciones programadas",
          "info"
        );
        return;
      }

      const list = scheduled
        .map((n, i) => {
          const patientName = n.content.data?.patientName || "Desconocido";
          const trigger = n.trigger as any;
          const date = trigger.value ? new Date(trigger.value) : new Date();
          return `${i + 1}. ${patientName} - ${date.toLocaleDateString(
            "es-ES"
          )} ${date.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
        })
        .join("\n\n");

      dialog.custom(
        `Notificaciones Programadas (${scheduled.length})`,
        list,
        "info",
        [
          {
            text: "Cancelar todas",
            style: "danger",
            onPress: async () => {
              await NotificationService.cancelAllNotifications();
              await loadPendingNotifications();
              dialog.alert(
                "Canceladas",
                "Todas las notificaciones fueron canceladas",
                "success"
              );
            },
          },
          { text: "OK", onPress: () => {} },
        ]
      );
    } catch (error) {
      console.error("Error viewing notifications:", error);
      dialog.alert("Error", "No se pudieron cargar las notificaciones", "error");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Perfil section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Perfil</Text>
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/perfil-doctor")}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="person-outline" size={24} color="#4F46E5" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Perfil del doctor</Text>
            <Text style={styles.itemSubtitle}>
              Actualiza tus datos personales y del consultorio
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Notifications section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
        <View style={styles.toggleItem}>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Recordatorios de Citas</Text>
            <Text style={styles.itemSubtitle}>
              {notificationSettings.enabled
                ? `Activas - ${pendingNotifications} programadas`
                : "Desactivadas"}
            </Text>
          </View>
          <Switch
            value={notificationSettings.enabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: "#D1D5DB", true: colors.primary + "60" }}
            thumbColor={
              notificationSettings.enabled ? colors.primary : "#F3F4F6"
            }
          />
        </View>

        {notificationSettings.enabled && (
          <>
            <View style={styles.separator} />
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Días de Antelación</Text>
              <View style={styles.daysRow}>
                {[1, 2, 3, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.dayButton,
                      notificationSettings.daysInAdvance === days &&
                        styles.dayButtonActive,
                    ]}
                    onPress={() => handleChangeDaysInAdvance(days)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        notificationSettings.daysInAdvance === days &&
                          styles.dayButtonTextActive,
                      ]}
                    >
                      {days} {days === 1 ? "día" : "días"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.item}
              onPress={handleViewPendingNotifications}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: "#8B5CF6" + "20" },
                ]}
              >
                <Ionicons name="list-outline" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>
                  Ver notificaciones programadas
                </Text>
                <Text style={styles.itemSubtitle}>
                  {pendingNotifications} pendiente
                  {pendingNotifications !== 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Specialist & session section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍⚕️ Especialistas & Sesión</Text>
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/registrar-bloque-especialista")}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="medkit-outline" size={24} color="#4F46E5" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Reservar bloque de doctor especialista</Text>
            <Text style={styles.itemSubtitle}>
              Configura turnos recurrentes o fechas del especialista
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <View style={styles.separator} />
        <View style={styles.item}>
          <View
            style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Doctor conectado</Text>
            <Text style={styles.itemSubtitle}>{userEmail || "Sin correo"}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            dialog.confirm(
              "Cerrar sesión",
              "¿Estás seguro de que deseas cerrar sesión?",
              signOut,
              "danger"
            );
          }}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: colors.danger + "20" }]}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, { color: colors.danger }]}>
              Cerrar sesión
            </Text>
            <Text style={styles.itemSubtitle}>
              Volver a la pantalla de inicio de sesión
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </TouchableOpacity>
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
      marginBottom: 16,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    toggleItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      justifyContent: "space-between",
    },
    separator: {
      height: 1,
      backgroundColor: colors.background,
      marginVertical: 8,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
    subsection: { paddingVertical: 8 },
    subsectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    daysRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    dayButton: {
      flex: 1,
      minWidth: 70,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
    },
    dayButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    dayButtonTextActive: { color: "white" },
  });
