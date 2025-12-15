import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Transaction, useApp } from '../../context/AppContext';
import { formatCOPShort } from '../../utils/formatCOP';

export default function FinanceScreen() {
    const router = useRouter();
    const { transactions, getFinancialSummary } = useApp();
    const summary = getFinancialSummary();

    const getDisplayName = (item: Transaction) => {
        if (item.type === 'EXPENSE') return item.description;

        // Priority 1: Direct patient name (anonymous or snapshot)
        if (item.patientName) return item.patientName;

        // Priority 2: Look up patient in current list
        if (item.patientId) {
            const patient = useApp().patients.find(p => p.id === item.patientId);
            if (patient) return patient.name;
        }

        return item.description;
    };

    const renderItem = ({ item }: { item: Transaction }) => {
        const displayName = getDisplayName(item);
        const subTitle = displayName !== item.description ? item.description : '';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/editar-transaccion', params: { id: item.id } })}
            >
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: item.type === 'INCOME' ? Colors.success + '20' : Colors.danger + '20' }
                ]}>
                    <Ionicons
                        name={item.type === 'INCOME' ? 'arrow-up' : 'arrow-down'}
                        size={24}
                        color={item.type === 'INCOME' ? Colors.success : Colors.danger}
                    />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.description}>{displayName}</Text>
                    {subTitle ? <Text style={styles.subtitle}>{subTitle}</Text> : null}
                    <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <Text style={[
                    styles.amount,
                    { color: item.type === 'INCOME' ? Colors.success : Colors.danger }
                ]}>
                    {item.type === 'INCOME' ? '+' : '-'}{formatCOPShort(item.amount)}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Finanzas</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/registrar-transaccion')}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addButtonText}>Nueva Transacción</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.balanceContainer}>
                <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Ingresos</Text>
                    <Text style={[styles.balanceValue, { color: Colors.success }]}>{formatCOPShort(summary.income)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Gastos</Text>
                    <Text style={[styles.balanceValue, { color: Colors.danger }]}>{formatCOPShort(summary.expenses)}</Text>
                </View>
            </View>

            <FlatList
                data={transactions}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <Text style={styles.sectionTitle}>{transactions.length > 0 ? 'Historial de Transacciones' : ''}</Text>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>Sin movimientos</Text>
                        <Text style={styles.emptySubtext}>Registra tus ingresos y gastos</Text>
                    </View>
                }
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
    balanceContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        margin: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    balanceItem: {
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: '80%',
        backgroundColor: Colors.border,
    },
    list: {
        padding: 16,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    description: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    date: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 8,
    }
});
