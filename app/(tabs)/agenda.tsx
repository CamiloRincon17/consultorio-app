import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Fragment, useCallback, useMemo, useState } from "react";
import {
    Linking,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { ActivityIndicator } from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";
import { isSameLocalDay, toLocalDateString } from "../../shared/utils/dateUtils";
import { sortSpecialistBlocksByTime } from "../../shared/utils/scheduleUtils";
import { Patient, Visit } from "../../features/patients/types";
import { usePatientsStore } from "../../features/patients/store";
import { useSpecialistStore } from "../../features/specialists/store";
import { useAuthStore } from "../../features/auth/store";
import { useSyncStore } from "../../shared/stores/syncStore";
import { useDialog } from "../../shared/context/DialogContext";
import { AgendaSkeleton } from "../../shared/components/SkeletonLoader";

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const formatDateKey = (date: Date): string => toLocalDateString(date);

/** Convierte "HH:MM AM/PM" a minutos desde medianoche (para comparar/ordenar). */
const parseTimeStr = (t: string): number => {
    const m = t?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return 9999;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
    if (m[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + min;
};

type TimelineItem =
    | { kind: 'doctor'; block: any; sortMinutes: number }
    | { kind: 'patient'; patient: any; sortMinutes: number; index: number };

export default function AgendaScreen() {
    const router = useRouter();
    const colors = useColors();
    const styles = useThemedStyles(createStyles);
    const dialog = useDialog();
    const patients = usePatientsStore((s) => s.patients);
    const isLoading = usePatientsStore((s) => s.isLoading);
    const specialistBlocks = useSpecialistStore((s) => s.specialistBlocks);
    const userId = useAuthStore((s) => s.user?.id ?? "");
    const refetch = useSyncStore((s) => s.refetch);
    const isSyncing = useSyncStore((s) => s.isSyncing);
    
    const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

    // Bloques del especialista para la fecha seleccionada ordenados por hora
    const activeSpecialistBlocks = useMemo(() => {
        const dateObj = new Date(selectedDate + "T12:00:00Z");
        const dayOfWeek = dateObj.getUTCDay();
        const filtered = specialistBlocks.filter((b) => {
            if (b.isRecurring) {
                return b.recurringDays?.includes(dayOfWeek);
            }
            return b.date === selectedDate;
        });
        return sortSpecialistBlocksByTime(filtered);
    }, [specialistBlocks, selectedDate]);

    // Conteo de items pendientes de sincronización
    const pendingCount = useMemo(() => {
        let count = 0;
        patients.forEach((p) => {
            if (p._syncStatus === 'pending') count++;
            if (p.visits) {
                p.visits.forEach((v) => {
                    if (v._syncStatus === 'pending') count++;
                });
            }
        });
        return count;
    }, [patients]);

    const handleRefresh = useCallback(async () => {
        if (!userId) return;
        try { await refetch(userId); } catch {}
    }, [userId, refetch]);

    const agendaData = useMemo(() => {
        const upcoming: (Patient & { 
            controlDateObj: Date; 
            isVisit?: boolean; 
            visitDetails?: string; 
            realId: string; 
            hasAttended?: boolean;
            appointmentId?: string;
            appointmentReason?: string;
            extraVisits?: Visit[];
        })[] = [];

        const attendedVisitIds = new Set<string>();

        patients.forEach((p) => {
            // Recopilar citas programadas activas del paciente
            const activeAppointments: Array<{ id?: string; date: string; reason?: string }> = [];
            if (p.appointments && p.appointments.length > 0) {
                p.appointments.forEach((a) => {
                    if (a.date && a.status !== 'cancelled' && a.status !== 'completed') {
                        activeAppointments.push({ id: a.id, date: a.date, reason: a.reason });
                    }
                });
            } else if (p.nextControlDate) {
                activeAppointments.push({
                    id: undefined,
                    date: p.nextControlDate,
                    reason: p.treatmentType === 'ortodoncia' ? 'Control de ortodoncia' : 'Consulta',
                });
            }

            activeAppointments.forEach((appt) => {
                const controlLocal = toLocalDateString(appt.date);

                // Solo buscar visitas que coincidan con la fecha exacta de esta cita
                // y que no hayan sido vinculadas a otra cita previa
                const matchingVisit = (p.visits || []).find(v => 
                    !attendedVisitIds.has(v.id) && toLocalDateString(v.date) === controlLocal
                );

                if (matchingVisit) {
                    attendedVisitIds.add(matchingVisit.id);
                }

                // Otras visitas en el mismo día que no sean matchingVisit
                const extraVisits = (p.visits || []).filter(v =>
                    v.id !== matchingVisit?.id && toLocalDateString(v.date) === controlLocal
                );

                upcoming.push({ 
                    ...p, 
                    id: appt.id ? `${p.id}-appt-${appt.id}` : `${p.id}-ctrl-${appt.date}`,
                    appointmentId: appt.id,
                    appointmentReason: appt.reason,
                    controlDateObj: new Date(appt.date), 
                    realId: p.id,
                    hasAttended: !!matchingVisit,
                    visitDetails: matchingVisit
                        ? (matchingVisit.reason || matchingVisit.treatment || 'Visita registrada')
                        : (appt.reason || undefined),
                    extraVisits: extraVisits
                });
            });

            if (p.visits && p.visits.length > 0) {
                p.visits.forEach(v => {
                    // Evitar duplicar la visita que ya sirvió para confirmar una cita
                    if (attendedVisitIds.has(v.id)) return;

                    // Usar T12:00:00 para evitar desfase de zona horaria (YYYY-MM-DD a UTC sería día anterior en CO)
                    const visitDateStr = v.date && v.date.length === 10 ? v.date + 'T12:00:00' : v.date;

                    upcoming.push({
                        ...p,
                        id: `${p.id}-visit-${v.id}`,
                        realId: p.id,
                        controlDateObj: new Date(visitDateStr),
                        isVisit: true,
                        visitDetails: v.reason || v.treatment || "Visita",
                        _syncStatus: v._syncStatus || p._syncStatus,
                    });
                });
            }
        });

        upcoming.sort((a, b) => a.controlDateObj.getTime() - b.controlDateObj.getTime());
        return upcoming;
    }, [patients]);

    const items = useMemo(() => {
        const groups: any = {};
        
        // Pre-fill a range of dates with empty arrays to prevent Agenda infinite loops
        const today = new Date();
        for (let i = -30; i < 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            groups[formatDateKey(d)] = [];
        }

        agendaData.forEach((p) => {
            const dateKey = formatDateKey(p.controlDateObj);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(p);
        });
        return groups;
    }, [agendaData]);

    const buildAgendaMessage = useCallback(() => {
        const selectedDateObj = new Date(selectedDate + "T12:00:00Z");
        const selectedMonth = selectedDateObj.getUTCMonth();
        const selectedYear = selectedDateObj.getUTCFullYear();

        // Siempre desde el día seleccionado en el calendario en adelante
        const startKey = selectedDate;

        const allDayKeys = new Set<string>();

        Object.keys(items).forEach(key => {
            const d = new Date(key + "T12:00:00Z");
            if (
                key >= startKey &&
                d.getUTCMonth() === selectedMonth &&
                d.getUTCFullYear() === selectedYear &&
                items[key]?.length > 0
            ) {
                allDayKeys.add(key);
            }
        });

        specialistBlocks.forEach(block => {
            if (block.isRecurring) {
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const d = new Date(selectedYear, selectedMonth, day);
                    const key = toLocalDateString(d);
                    if (key >= startKey && block.recurringDays?.includes(d.getDay())) {
                        allDayKeys.add(key);
                    }
                }
            } else if (block.date) {
                const d = new Date(block.date + "T12:00:00Z");
                if (
                    block.date >= startKey &&
                    d.getUTCMonth() === selectedMonth &&
                    d.getUTCFullYear() === selectedYear
                ) {
                    allDayKeys.add(block.date);
                }
            }
        });

        const upcomingDays = [...allDayKeys].sort().map(key => ({
            dateKey: key,
            dateObj: new Date(key + "T12:00:00Z"),
            patients: items[key] || [],
        }));

        if (upcomingDays.length === 0) return "";

        const startDayLabel = selectedDateObj.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
        const rangeLabel = `Desde el ${startDayLabel}`;

        let message = `📋 *AGENDA DEL CONSULTORIO*\n`;
        message += `📅 *${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        let totalCitas = 0;
        upcomingDays.forEach(({ dateKey, dateObj, patients }) => {
            const dayLabel = dateObj.toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", month: "long", timeZone: "UTC"
            });
            message += `📌 *${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}*\n`;

            const dayOfWeek = dateObj.getUTCDay();
            const blocksForDay = specialistBlocks.filter(b => {
                if (b.isRecurring) return b.recurringDays?.includes(dayOfWeek);
                return b.date === dateKey;
            }).sort((a, b) => parseTimeStr(a.startTime) - parseTimeStr(b.startTime));

            if (blocksForDay.length > 0) {
                blocksForDay.forEach(block => {
                    const specialty = block.specialty ? ` — ${block.specialty}` : '';
                    message += `  🩺 ${block.startTime} a ${block.endTime} — *Dr. ${block.doctorName}*${specialty}\n`;
                });
            }

            patients.forEach((p: any) => {
                const timeStr = p.controlDateObj?.toLocaleTimeString
                    ? p.controlDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                    : "";
                const typeStr = p.isVisit
                    ? `✅ Asistió`
                    : p.treatmentType === "ortodoncia" ? "🦷 Ortodoncia" : "🏥 General";
                const reasonStr = p.appointmentReason ? ` — ${p.appointmentReason}` : '';
                message += `  🕐 ${timeStr} — *${p.name}* (${typeStr}${reasonStr})\n`;
                totalCitas++;
            });
            message += `\n`;
        });

        message += `Total: ${totalCitas} cita(s)`;
        return message;
    }, [items, selectedDate, specialistBlocks]);

    // ── Enviar recordatorio de cita por WhatsApp (Opción A: mensaje listo sin API) ──
    const sendWhatsAppToPatient = useCallback(async (patient: any, timeString: string) => {
        const dateLabel = new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
        });
        const capitalDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        const timeLabel = timeString ? `🕐 *Hora:* ${timeString}\n` : '';
        const typeLabel = patient.treatmentType === 'ortodoncia' ? '🦷 Ortodoncia' : '🏥 Consulta general';
        const reasonLabel = patient.appointmentReason ? `📋 *Motivo:* ${patient.appointmentReason}\n` : '';

        const message =
            `*RECORDATORIO DE CITA*\n` +
            `Hola *${patient.name}* \n\n` +
            `Le recordamos que tiene una cita médica programada:\n\n` +
            `📅 *Fecha:* ${capitalDate}\n` +
            ` ${timeLabel}\n` +
            `Por favor confirme su asistencia respondiendo:\n` +
            `✅ *SÍ* asistiré\n` +
            `❌ *NO* podré asistir\n\n` +
            `_Gracias por su preferencia_ 🙏`;

        // Si tiene teléfono registrado, se formatea sin símbolos (57 Colombia si tiene 10 dígitos)
        let phoneDigits = (patient.phone || '').replace(/\D/g, '');
        if (phoneDigits.length === 10) {
            phoneDigits = `57${phoneDigits}`;
        }

        // Opción A: Abrir WhatsApp con el mensaje listo
        // - Con número: https://wa.me/<número>?text=...
        // - Sin número: whatsapp://send?text=... (el usuario elige el contacto en WhatsApp)
        const encodedText = encodeURIComponent(message);
        const url = phoneDigits
            ? `https://wa.me/${phoneDigits}?text=${encodedText}`
            : `whatsapp://send?text=${encodedText}`;

        try {
            const supported = await Linking.canOpenURL(url).catch(() => false);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Si el esquema whatsapp:// falla o no está instalado, intentar abrir wa.me o compartir
                const webUrl = `https://wa.me/${phoneDigits ? phoneDigits : ''}?text=${encodedText}`;
                const webSupported = await Linking.canOpenURL(webUrl).catch(() => false);
                if (webSupported) {
                    await Linking.openURL(webUrl);
                } else {
                    await Share.share({ message, title: `Cita - ${patient.name}` });
                }
            }
        } catch {
            try {
                await Share.share({ message, title: `Cita - ${patient.name}` });
            } catch {
                dialog.alert('Error', 'No se pudo abrir WhatsApp ni compartir el mensaje.', 'error');
            }
        }
    }, [selectedDate, dialog]);


    const shareToWhatsApp = useCallback(async () => {
        const message = buildAgendaMessage();

        if (!message) {
            dialog.alert("Sin citas", "No hay citas para compartir en este día.", "info");
            return;
        }

        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                dialog.alert(
                    "WhatsApp no disponible",
                    "No se encontró WhatsApp instalado en el dispositivo.",
                    "error"
                );
            }
        } catch {
            dialog.alert("Error", "No se pudo abrir WhatsApp.", "error");
        }
    }, [buildAgendaMessage, dialog]);


    // Puntos del calendario memoizados (solo recalculan cuando cambian los datos de agenda o bloques)
    const baseMarkedDots = useMemo(() => {
        const marks: Record<
            string,
            {
                dots?: Array<{ key: string; color: string; selectedDotColor?: string }>;

                selected?: boolean;
                selectedColor?: string;
            }
        > = {};

        const patientDot = { key: 'patient', color: colors.primary, selectedDotColor: 'white' };
        const doctorDot = { key: 'doctor', color: '#7C3AED', selectedDotColor: '#DDD6FE' };
        const patientDates = new Set<string>();
        Object.keys(items).forEach((dateKey) => {
            if (items[dateKey]?.length > 0) {
                patientDates.add(dateKey);
            }
        });

        const doctorDates = new Set<string>();

        Object.keys(items).forEach((dateKey) => {
            const d = new Date(dateKey + "T12:00:00Z");
            const dayOfWeek = d.getUTCDay();

            const hasDoctor = specialistBlocks.some((block) => {
                if (block.isRecurring) {
                    return block.recurringDays?.includes(dayOfWeek);
                }
                return block.date === dateKey;
            });

            if (hasDoctor) {
                doctorDates.add(dateKey);
            }
        });

        specialistBlocks.forEach((block) => {
            if (!block.isRecurring && block.date) {
                doctorDates.add(block.date);
            }
        });

        const allDateKeys = new Set([...patientDates, ...doctorDates]);

        allDateKeys.forEach((dateKey) => {
            const dots: Array<{ key: string; color: string; selectedDotColor?: string }> = [];

            if (patientDates.has(dateKey)) {
                dots.push(patientDot);
            }
            if (doctorDates.has(dateKey)) {
                dots.push(doctorDot);
            }

            marks[dateKey] = { dots };
        });

        return marks;
    }, [items, specialistBlocks]);

    // Resaltar la fecha seleccionada instantáneamente (O(1) sin bucles)
    const markedDates = useMemo(() => {
        const marks = { ...baseMarkedDots };
        const current = marks[selectedDate];
        marks[selectedDate] = {
            ...current,
            selected: true,
            selectedColor: colors.primary,
        };
        return marks;
    }, [baseMarkedDots, selectedDate, colors]);

    // Timeline unificado (doctores + pacientes) ordenado por hora — solo se
    // recalcula cuando cambian los bloques del día o los pacientes del día.
    const timelineItems = useMemo<TimelineItem[]>(() => {
        const list: TimelineItem[] = [];

        activeSpecialistBlocks.forEach((block) => {
            list.push({
                kind: 'doctor',
                block,
                sortMinutes: parseTimeStr(block.startTime),
            });
        });

        const dayPatients: any[] = items[selectedDate] || [];
        dayPatients.forEach((patient, index) => {
            const d: Date | undefined = patient.controlDateObj;
            const mins = d ? d.getHours() * 60 + d.getMinutes() : 9999;
            list.push({ kind: 'patient', patient, sortMinutes: mins, index });
        });

        list.sort((a, b) => a.sortMinutes - b.sortMinutes);
        return list;
    }, [activeSpecialistBlocks, items, selectedDate]);

    const openTimelineDoctor = useCallback((blockId: string) => {
        router.push({ pathname: '/registrar-bloque-especialista', params: { id: blockId } });
    }, [router]);

    const openPatient = useCallback((patient: any, isFirst: boolean) => {
        if (!patient) return <View />;

        const timeString = patient.controlDateObj?.toLocaleTimeString
            ? patient.controlDateObj.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
              })
            : "";

        const isFinished = patient.isVisit || patient.hasAttended;

        return (
            <TouchableOpacity
                style={[styles.card, { marginTop: isFirst ? 10 : 0 }, isFinished && { backgroundColor: '#dde7d2ff' }]}
                onPress={() => {
                    if (isFinished) {
                        router.push({
                            pathname: "/historial-visitas",
                            params: { id: patient.realId },
                        });
                    } else {
                        router.push({
                            pathname: "/registrar-pago",
                            params: { 
                                id: patient.realId,
                                // Pasar el appointmentId para saber exactamente qué cita eliminar
                                appointmentId: patient.appointmentId ?? '',
                                date: toLocalDateString(patient.controlDateObj),
                                reason: patient.appointmentReason || '',
                            },
                        });
                    }
                }}
                activeOpacity={0.7}
            >
                <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeString}</Text>
                    <View style={[styles.timelineDot, isFinished && { backgroundColor: colors.success }]} />
                </View>
                <View style={styles.contentColumn}>
                    <View style={styles.nameRow}>
                        <Text style={styles.patientName} numberOfLines={1}>{patient.name}</Text>
                        {patient._syncStatus === 'pending' ? (
                            <View style={styles.syncBadgePending}>
                                <ActivityIndicator size={8} color={colors.warning} />
                                <Text style={styles.syncBadgePendingText}>Pendiente</Text>
                            </View>
                        ) : patient._syncStatus === 'synced' ? (
                            <View style={styles.syncBadgeSynced}>
                                <Ionicons name="cloud-done-outline" size={10} color={colors.success} />
                                <Text style={styles.syncBadgeSyncedText}>En la nube</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 }}>
                        <Text style={styles.treatmentText}>
                                    <Ionicons name={isFinished ? "checkmark-circle" : "medical"} size={12} color={colors.textSecondary} />{" "}
                                    {isFinished 
                                        ? `Asistió: ${patient.visitDetails || 'Visita registrada'}` 
                                        : `${patient.treatmentType === "ortodoncia" ? "Ortodoncia" : "General"}${patient.appointmentReason ? ` • ${patient.appointmentReason}` : ' (Pendiente)'}`}
                                </Text>
                                
                                {patient.extraVisits && patient.extraVisits.map((ev: any, index: number) => (
                                    <Fragment key={ev.id || index}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                            <Ionicons name="checkmark-circle" size={12} color={colors.textSecondary} />
                                            <Text style={[styles.treatmentText, { color: colors.textSecondary, marginLeft: 4 }]}>
                                             {ev.reason || ev.treatment || 'Procedimiento'}
                                            </Text>
                                        </View>
                                    </Fragment>
                                ))}
                            </View>
                        </View>
                        {!isFinished && (
                            <TouchableOpacity
                                style={{ padding: 6, marginRight: 2 }}
                                onPress={(e) => {
                                    e.stopPropagation?.();
                                    router.push({
                                        pathname: "/modificar-control",
                                        params: { id: patient.realId, appointmentId: patient.appointmentId },
                                    });
                                }}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {!isFinished && (
                            <TouchableOpacity
                                style={styles.whatsappCardButton}
                                activeOpacity={0.75}
                                onPress={(e) => {
                                    e.stopPropagation?.();
                                    sendWhatsAppToPatient(patient, timeString);
                                }}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                            </TouchableOpacity>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={colors.border} />
                    </TouchableOpacity>
        );
    }, [router, styles, colors, sendWhatsAppToPatient]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.title}>Agenda</Text>
                    {pendingCount > 0 && (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="cloud-upload-outline" size={11} color={colors.warning} />
                            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={shareToWhatsApp}
                    activeOpacity={0.7}
                >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text style={styles.whatsappButtonText}>Enviar</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={{ padding: 16 }}><AgendaSkeleton /></View>
            ) : (
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} />}
                    showsVerticalScrollIndicator={false}
                >
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: any) => setSelectedDate(day.dateString)}
                        markingType={'multi-dot'}
                        markedDates={markedDates}
                        theme={{
                            todayTextColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                            arrowColor: colors.primary,
                        }}
                    />
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                            <Text style={styles.legendText}>Pacientes</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
                            <Text style={styles.legendText}>Doctores</Text>
                        </View>
                    </View>
                    
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.dateHeaderText, { marginBottom: 0, flex: 1 }]}>
                                {new Date(selectedDate + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity 
                                    style={styles.addDoctorButton}
                                    onPress={() => router.push({ pathname: '/registrar-bloque-especialista', params: { date: selectedDate } })}
                                >
                                    <Ionicons name="medkit-outline" size={14} color={colors.primary} />
                                    <Text style={styles.addDoctorText}>+ Doctor</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.addCitaButton}
                                    onPress={() => router.push({ pathname: '/seleccionar-paciente', params: { date: selectedDate } })}
                                >
                                    <Ionicons name="add" size={16} color={colors.primary} />
                                    <Text style={styles.addCitaText}>Cita</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {/* Timeline unificado: doctores + pacientes ordenados por hora */}
                        {(() => {
                            // timelineItems ya viene ordenado por hora (useMemo arriba)
                            if (timelineItems.length === 0) {
                                return (
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="calendar-clear-outline" size={48} color={colors.border} />
                                        <Text style={styles.emptyText}>No hay citas ni doctores para este día</Text>
                                    </View>
                                );
                            }

                            return timelineItems.map((item, i) => {
                                if (item.kind === 'doctor') {
                                    const block = item.block;
                                    return (
                                        <TouchableOpacity
                                            key={`doctor-${block.id}`}
                                            style={[styles.specialistCard, { marginTop: i === 0 ? 20 : 0 }]}
                                            onPress={() => openTimelineDoctor(block.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.specialistHeaderRow}>
                                                <View style={styles.specialistBadge}>
                                                    <Ionicons name="time" size={12} color={colors.primary} />
                                                    <Text style={styles.specialistBadgeText}>
                                                        {block.startTime} - {block.endTime} ({block.shiftTitle || "Reserva"})
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    {block._syncStatus === 'pending' ? (
                                                        <View style={styles.syncBadgePending}>
                                                            <ActivityIndicator size={8} color={colors.warning} />
                                                            <Text style={styles.syncBadgePendingText}>Pendiente</Text>
                                                        </View>
                                                    ) : block._syncStatus === 'synced' ? (
                                                        <View style={styles.syncBadgeSynced}>
                                                            <Ionicons name="cloud-done-outline" size={10} color={colors.success} />
                                                            <Text style={styles.syncBadgeSyncedText}>En la nube</Text>
                                                        </View>
                                                    ) : null}
                                                    <Ionicons name="create-outline" size={16} color={colors.text} />
                                                </View>
                                            </View>
                                            <Text style={styles.specialistDoctorName}>{block.doctorName}</Text>
                                            {block.specialty ? (
                                                <Text style={styles.specialistSubText}>Especialidad: {block.specialty}</Text>
                                            ) : null}
                                            {block.notes ? (
                                                <Text style={styles.specialistNotesText}>Notas: {block.notes}</Text>
                                            ) : null}
                                            <Text style={styles.specialistNotice}>
                                             Consultorio ocupado por el doctor (atiende a sus propios pacientes)
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                } else {
                                    return (
                                        <Fragment key={item.patient.id || i}>
                                            {openPatient(item.patient, i === 0)}
                                        </Fragment>
                                    );
                                }
                            });
                        })()}
                        <View style={{ height: 40 }} />
                        <View style={{ height: 40 }} />
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.text,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    pendingBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.warning,
    },
    whatsappButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#25D366",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 6,
    },
    whatsappButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },
    dateHeaderText: {
        color: colors.primary,
        fontWeight: "bold",
        textTransform: "capitalize",
        fontSize: 16,
        marginBottom: 16,
    },
    addCitaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addCitaText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        shadowColor: "#000000ff",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: "center",
    },
    timeColumn: {
        width: 60,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    timeText: {
        fontSize: 15,
        fontWeight: "bold",
        color: colors.time,
        marginBottom: 4,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 11,
        backgroundColor: colors.primary,
    },
    contentColumn: {
        flex: 1,
    },
    patientName: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    treatmentText: {
        fontSize: 12,
        color: colors.text,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
        textAlign: "center",
        paddingHorizontal: 32,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 8,
    },
    syncBadgePending: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    syncBadgePendingText: {
        fontSize: 9,
        fontWeight: "700",
        color: colors.warning,
    },
    syncBadgeSynced: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: colors.surface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.success,
    },
    syncBadgeSyncedText: {
        fontSize: 9,
        fontWeight: "700",
        color: colors.success,
    },
    addDoctorButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    addDoctorText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.primary,
    },
    whatsappCardButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D36618',
        borderWidth: 1.5,
        borderColor: '#25D366',
        marginRight: 2,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
    },
    specialistCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primary,
        padding: 14,
        marginBottom: 12,
    },
    specialistHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    specialistBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primary + "20",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    specialistBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.primary,
    },
    specialistDoctorName: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 2,
    },
    specialistSubText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: "500",
    },
    specialistNotesText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
        fontStyle: "italic",
    },
    specialistNotice: {
        fontSize: 11,
        color: colors.primary,
        marginTop: 6,
        fontWeight: "600",
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
});
