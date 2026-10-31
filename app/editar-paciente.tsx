import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Patient } from '../context/AppContext';
import { usePatientsStore } from '../features/patients/store';
import { useFinanceStore } from '../features/finance/store';
import { FormInput, PrimaryButton, PhotoGallery } from '../shared/components';
import { useDialog } from '../shared/context/DialogContext';
import { useColors, useThemedStyles, type Palette } from '../shared/theme';
import { validatePhone, validateAmount } from '../shared/utils/validation';
import { formatInputCOP, parseInputCOP } from '../shared/utils/formatCOP';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface EditPatientFormProps {
  patient: Patient;
}

function EditPatientForm({ patient }: EditPatientFormProps) {
  const router = useRouter();
  const patients = usePatientsStore((s) => s.patients);
  const updatePatient = usePatientsStore((s) => s.updatePatient);
  const deletePatient = usePatientsStore((s) => s.deletePatient);
  const transactions = useFinanceStore((s) => s.transactions);
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [monthlyFee, setMonthlyFee] = useState(formatInputCOP(patient.monthlyFee ?? 0));
  const [notes, setNotes] = useState(patient.notes || '');
  const [appointmentDay, setAppointmentDay] = useState(
    patient.appointmentDay ? patient.appointmentDay.toString() : ''
  );

  // Extraer fotografías con metadatos (procedimiento y fecha) de citas y transacciones del paciente
  const patientPhotosWithInfo = React.useMemo(() => {
    if (!patient) return [];
    const list: any[] = [];
    
    // 1. Fotos registradas en las citas / procedimientos
    if (patient.visits && patient.visits.length > 0) {
      for (const visit of patient.visits) {
        if (visit.photos && visit.photos.length > 0) {
          for (const url of visit.photos) {
            if (!list.some((item) => item.url === url)) {
              list.push({
                url,
                visitId: visit.id,
                visitDate: visit.date,
                visitReason: visit.reason || visit.treatment || 'Procedimiento',
                visitTreatment: visit.treatment || visit.reason || 'Procedimiento',
              });
            }
          }
        }
      }
    }

    // 2. Fotos registradas al cobrar en transacciones del paciente
    const patientTxs = transactions.filter((t) => t.patientId === patient.id && t.photos && t.photos.length > 0);
    for (const tx of patientTxs) {
      if (tx.photos && tx.photos.length > 0) {
        for (const url of tx.photos) {
          if (!list.some((item) => item.url === url)) {
            list.push({
              url,
              visitDate: tx.date ? tx.date.split('T')[0] : 'Pago',
              visitReason: tx.procedure || tx.description || 'Procedimiento cobrado',
              visitTreatment: tx.procedure || tx.description || 'Procedimiento cobrado',
            });
          }
        }
      }
    }

    // 3. Fotos guardadas directamente en el paciente (legadas)
    if (patient.photos && patient.photos.length > 0) {
      for (const url of patient.photos) {
        if (!list.some((item) => item.url === url)) {
          list.push({ url, visitDate: 'General', visitReason: 'Fotografía clínica' });
        }
      }
    }

    return list;
  }, [patient, transactions]);

  const handleSave = () => {
    if (!name.trim()) {
      dialog.alert('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      dialog.alert('Teléfono inválido', phoneError, 'error');
      return;
    }

    const amountError = validateAmount(monthlyFee);
    if (amountError) {
      dialog.alert('Monto inválido', amountError, 'error');
      return;
    }

    const duplicateName = patients.find(
      (p) => p.id !== patient.id && p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicateName) {
      dialog.alert(
        'Nombre Duplicado',
        'Ya existe otro paciente con este nombre. Por favor, agrega algo único (ej. segundo apellido)',
        'error'
      );
      return;
    }

    updatePatient(patient.id, {
      name,
      phone,
      monthlyFee: parseInputCOP(monthlyFee),
      notes,
      ...(patient.treatmentType === 'ortodoncia' && appointmentDay
        ? { appointmentDay: parseInt(appointmentDay, 10) }
        : {}),
    });

    dialog.alert('Éxito', 'Datos del paciente actualizados', 'success', () => router.back());
  };

  const handleDelete = () => {
    dialog.confirm(
      'Eliminar Paciente',
      '¿Estás seguro? Esto borrará al paciente pero mantendrá su historial financiero.',
      () => {
        deletePatient(patient.id);
        router.replace('/(tabs)/pacientes');
      },
      'danger'
    );
  };

  const isOrtodoncia = patient.treatmentType === 'ortodoncia';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Header fijo con botón de volver */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Editar Paciente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Insignia / Badge del Paciente */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: isOrtodoncia ? '#F3E8FF' : '#EFF6FF' }]}>
            <Ionicons
              name={isOrtodoncia ? 'sparkles' : 'person'}
              size={16}
              color={isOrtodoncia ? '#8B5CF6' : colors.primary}
            />
            <Text style={[styles.badgeText, { color: isOrtodoncia ? '#8B5CF6' : colors.primary }]}>
              {isOrtodoncia ? 'Ortodoncia' : 'Tratamiento General'}
            </Text>
          </View>
        </View>

        {/* Tarjeta de Información Personal */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Información Personal</Text>
          <FormInput label="Nombre Completo" value={name} onChangeText={setName} placeholder="Nombre del paciente" />

          <FormInput
            label="Numero de Celular"
            value={phone}
            onChangeText={setPhone}
            placeholder=""
            keyboardType="phone-pad"
          />
                  {/* Tarjeta de Planes y Citas */}

          <FormInput
            label="Valor del Tratamiento (COP)"
            value={monthlyFee}
            onChangeText={(val) => setMonthlyFee(formatInputCOP(val))}
            placeholder=""
            keyboardType="numeric"
          />

          {isOrtodoncia && (
            <FormInput
              label="Día del mes para citas"
              placeholder="Ej. 5 (para citas el día 5 de cada mes)"
              keyboardType="numeric"
              value={appointmentDay}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                if (text === '' || (num >= 1 && num <= 31)) {
                  setAppointmentDay(text);
                }
              }}
              maxLength={2}
              helperText="💡 Este día se usará para calcular las próximas citas automáticamente"
            />
          )}
        </View>
      
        {/* Tarjeta de Galería Fotográfica por Cita */}
        <View style={styles.card}>
          <PhotoGallery
            photosWithInfo={patientPhotosWithInfo}
            onAddPhotoInVisit={() => {
              router.push(`/historial-visitas?patientId=${patient.id}&openAdd=true`);
            }}
            patientId={patient.id}
            title="Fotografías Clínicas por Cita"
          />
        </View>

        {/* Tarjeta de Notas Clínicas */}
        <View style={styles.card}>
          <FormInput
            label="Notas / Antecedentes Médicos"
            value={notes}
            onChangeText={setNotes}
            placeholder="Alergias, condiciones, historial previo..."
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </View>

        {/* Botones de Acción */}
        <View style={styles.actions}>
          <PrimaryButton style={styles.saveButton} label="Guardar Cambios" onPress={handleSave} />

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Eliminar Paciente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditPatient() {
  const { id } = useLocalSearchParams();
  const patients = usePatientsStore((s) => s.patients);
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const patientId = Array.isArray(id) ? id[0] : id;
  const patient = patientId ? patients.find((p) => p.id === patientId) : undefined;

  if (!patient) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando paciente...</Text>
        </View>
      </View>
    );
  }

  return <EditPatientForm key={patient.id} patient={patient} />;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  form: {
    padding: 20,
    gap: 16,
  },

  // Badge header
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Actions
  actions: {
    marginTop: 8,
    gap: 12,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
