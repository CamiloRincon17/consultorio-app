import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Patient, useApp } from '../../context/AppContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getNextControlDate(patient: Patient): Date {
    if (patient.nextControlDate) {
        return new Date(patient.nextControlDate);
    }
    const start = new Date(patient.startDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Check if birthday/start day has passed this month
    let nextControl = new Date(currentYear, currentMonth, start.getDate());
    if (nextControl < today) {
        nextControl = new Date(currentYear, currentMonth + 1, start.getDate());
    }
    return nextControl;
}

const PatientCard = React.memo(({ item, isExpanded, onToggle, stats }: { item: Patient, isExpanded: boolean, onToggle: (id: string) => void, stats: { totalPaid: number, visitCount: number } }) => {
    const router = useRouter();
    const nextControl = getNextControlDate(item);
    // Format: "14 de diciembre"
    const formattedDate = nextControl.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

    return (
        <TouchableOpacity
            style={[styles.card, isExpanded && styles.cardExpanded]}
            onPress={() => onToggle(item.id)}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                        <Text style={styles.controlDate}> Próximo: {formattedDate}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.monthlyFee}>${item.monthlyFee}</Text>
                </View>
            </View>

            {isExpanded && (
                <View style={styles.expandedContent}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Pagado</Text>
                            <Text style={styles.statValue}>${stats.totalPaid}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Visitas</Text>
                            <Text style={styles.statValue}>{stats.visitCount}</Text>
                        </View>
                    </View>

                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({ pathname: '/modificar-control', params: { id: item.id } })}
                        >
                            <Ionicons name="time-outline" size={20} color={Colors.primary} />
                            <Text style={styles.actionText}>Cita</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({ pathname: '/editar-paciente', params: { id: item.id } })}
                        >
                            <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
                            <Text style={styles.actionText}>Editar Info</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
});

export default function PatientsScreen() {
    const router = useRouter();
    const { patients, getPatientStats } = useApp();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = useCallback((id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(prev => prev === id ? null : id);
    }, []);

    const renderItem = useCallback(({ item }: { item: Patient }) => (
        <PatientCard
            item={item}
            isExpanded={expandedId === item.id}
            onToggle={toggleExpand}
            stats={getPatientStats(item.id)}
        />
    ), [expandedId, getPatientStats, toggleExpand]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pacientes</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/registrar-paciente')}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addButtonText}>Nuevo</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={patients}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
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
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    addButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    list: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    cardExpanded: {
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    cardAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlDate: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    monthlyFee: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.success,
    },
    expandedContent: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        minWidth: 100,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
    },
    actionText: {
        color: Colors.text,
        fontWeight: '500',
        fontSize: 14,
    }
});
