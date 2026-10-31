import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../../shared/theme";
import { formatCOPShort } from "../../../shared/utils/formatCOP";
import { AvatarInitials } from "../../../shared/components/AvatarInitials";
import { Patient } from "../types";

export function getNextControlDate(patient: Patient): Date {
  if (patient.nextControlDate) {
    const date = new Date(patient.nextControlDate);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }

  const start = new Date(patient.startDate);
  if (isNaN(start.getTime())) {
    return new Date();
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let nextControl = new Date(currentYear, currentMonth, start.getDate());
  if (nextControl < today) {
    nextControl = new Date(currentYear, currentMonth + 1, start.getDate());
  }
  return nextControl;
}

interface PatientCardProps {
  item: Patient;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  stats: { totalPaid: number; visitCount: number };
}

export const PatientCard = React.memo(({
  item,
  isExpanded,
  onToggle,
  stats,
}: PatientCardProps) => {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  if (!item || !item.id || !item.name) {
    return null;
  }

  const hasAppointment = !!item.nextControlDate;
  const nextControl = hasAppointment
    ? new Date(item.nextControlDate!)
    : getNextControlDate(item);
  const formattedDate = nextControl.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });

  const formattedTime = hasAppointment ? nextControl.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) : "";

  // Optimize RAM: Calc days dynamically without storing it continuously. 
  // It handles the calculation smoothly during render which is O(1) time and memory.
  const startDate = item.startDate ? new Date(item.startDate) : new Date();
  const diffTime = Math.max(0, new Date().getTime() - startDate.getTime());
  const registeredDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const isPending = item._syncStatus === "pending";

  const activeAppointments = (item.appointments || []).filter(
    (a) => a.status !== 'cancelled' && new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0))
  );
  const extraAppointmentsCount = activeAppointments.length > 1 ? activeAppointments.length - 1 : 0;

  return (
    <View style={[styles.card, isExpanded && styles.cardExpanded, isPending && styles.cardPending]}>
      <TouchableOpacity
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={{ marginRight: 12 }}>
            <AvatarInitials name={item.name} size={50} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientName}>{item.name}</Text>
              {item.treatmentType === "ortodoncia" && item.appointmentDay && (
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Día {item.appointmentDay}</Text>
                </View>
              )}
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="cloud-offline-outline" size={10} color={colors.warning} />
                  <Text style={styles.pendingBadgeText}>Pendiente</Text>
                </View>
              )}
            </View>
            <View style={styles.detailRow}>
              <Ionicons
                name={hasAppointment ? "calendar" : "alert-circle-outline"}
                size={14}
                color={hasAppointment ? colors.primary : colors.warning}
              />
              <Text
                style={[
                  styles.controlDate,
                  { color: hasAppointment ? colors.primary : colors.warning },
                ]}
              >
                {hasAppointment
                  ? ` ${formattedDate} - ${formattedTime}`
                  : " Sin Cita Agendada"}
              </Text>
              {extraAppointmentsCount > 0 && (
                <View style={styles.extraApptsBadge}>
                  <Text style={styles.extraApptsText}>+{extraAppointmentsCount} más</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.monthlyFee}>
              {formatCOPShort(item.monthlyFee || 0)}
            </Text>
            {!isPending && (
              <Ionicons name="cloud-done-outline" size={14} color={colors.success} style={{ marginTop: 4 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Pagado</Text>
              <Text style={styles.statValue}>
                {formatCOPShort(stats?.totalPaid || 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Visitas</Text>
              <Text style={styles.statValue}>{stats?.visitCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Antigüedad</Text>
              <Text style={styles.statValue}>
                {registeredDays} {registeredDays === 1 ? 'día' : 'días'}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                router.push({
                  pathname: "/modificar-control",
                  params: { id: item.id },
                })
              }
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Cita</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                router.push({
                  pathname: "/historial-visitas",
                  params: { id: item.id },
                })
              }
            >
              <Ionicons name="list-outline" size={20} color={colors.success} />
              <Text style={styles.actionText}>Historial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                router.push({
                  pathname: "/editar-paciente",
                  params: { id: item.id },
                })
              }
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTouchable: {
    width: "100%",
  },
  cardExpanded: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  cardContent: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  dayBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  controlDate: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  extraApptsBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  extraApptsText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  monthlyFee: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.success,
  },
  expandedContent: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  actionText: {
    color: colors.text,
    fontWeight: "500",
    fontSize: 14,
  },
  cardPending: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.warning + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.warning + "40",
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.warning,
  },
});
