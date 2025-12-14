import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../context/AppContext';

export default function Dashboard() {
    const router = useRouter();
    const { patients, getFinancialSummary } = useApp();
    const summary = useMemo(() => getFinancialSummary(), [getFinancialSummary]);

    const activePatients = patients.length;
    // Mock data for appointments
    const pendingAppointments = patients.length;

    const Card = ({ title, value, icon, color, onPress }: any) => (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="white" />
            </View>
            <View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardValue}>{value}</Text>
            </View>
            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Resumen</Text>
                    <Text style={styles.headerSubtitle}>Bienvenido, Doctor</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/configuracion')}>
                    <Ionicons name="settings-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.statsContainer}>
                    <Card
                        title="Pacientes"
                        value={activePatients}
                        icon="people"
                        color={Colors.primary}
                        onPress={() => router.push('/(tabs)/pacientes')}
                    />
                    <Card
                        title="Ingresos Mes"
                        value={`$${summary.income}`}
                        icon="cash"
                        color={Colors.success}
                        onPress={() => router.push('/(tabs)/finanzas')}
                    />
                    <Card
                        title="Próx. Controles"
                        value={pendingAppointments}
                        icon="calendar"
                        color={Colors.warning}
                        onPress={() => router.push('/(tabs)/pacientes')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/registrar-pago')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: Colors.success }]}>
                            <Ionicons name="card-outline" size={24} color="white" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Registrar Pago</Text>
                            <Text style={styles.actionSubtitle}>Cobrar mensualidad a paciente</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/registrar-paciente')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
                            <Ionicons name="person-add-outline" size={24} color="white" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Nuevo Paciente</Text>
                            <Text style={styles.actionSubtitle}>Registrar historial y cuota</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    content: {
        padding: 16,
    },
    statsContainer: {
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    chevron: {
        marginLeft: 'auto',
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 16,
    },
    // Action Button Styles
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    actionSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    }
});
