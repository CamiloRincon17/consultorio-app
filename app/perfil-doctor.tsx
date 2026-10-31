import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemedStyles, type Palette } from "../shared/theme";
import { FormInput, PrimaryButton } from "../shared/components";
import { AvatarInitials } from "../shared/components/AvatarInitials";
import { useDialog } from "../shared/context/DialogContext";
import { useProfileStore, type DoctorProfile } from "../features/profile/store";

export default function DoctorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const dialog = useDialog();
  const profile = useProfileStore((s) => s.profile);
  const saveProfile = useProfileStore((s) => s.saveProfile);

  const [form, setForm] = useState<DoctorProfile>(profile);
  const set = (key: keyof DoctorProfile, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      dialog.alert("Falta el nombre", "Ingresa el nombre del doctor.", "error");
      return;
    }
    await saveProfile(form);
    dialog.alert("Guardado", "Tus datos se guardaron correctamente.", "success");
    router.back();
  };

  const fullName = form.fullName.trim();
  const specialization = form.specialization.trim();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Encabezado con avatar en vivo ── */}
        <View style={styles.headerCard}>
          <AvatarInitials name={fullName || "Doctor"} size={72} />
          <View style={styles.headerTexts}>
            <Text style={styles.headerName}>
              {fullName || "Sin nombre"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {specialization || "Sin especialidad"}
            </Text>
          </View>
        </View>

        {/* ── Datos personales ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos personales</Text>
          <View style={styles.sectionFields}>
            <FormInput
              label="Nombre completo"
              icon="person-outline"
              value={form.fullName}
              onChangeText={(t) => set("fullName", t)}
              placeholder="Dr. Juan Pérez"
            />
            <FormInput
              label="Teléfono"
              icon="call-outline"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(t) => set("phone", t)}
              placeholder="+57 300 123 4567"
            />
            <FormInput
              label="Correo"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(t) => set("email", t)}
              placeholder="doctor@correo.com"
            />
          </View>
        </View>

        {/* ── Datos profesionales ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos profesionales</Text>
          <View style={styles.sectionFields}>
            <FormInput
              label="Especialización"
              icon="ribbon-outline"
              value={form.specialization}
              onChangeText={(t) => set("specialization", t)}
              placeholder="Ortodoncista"
            />
            <FormInput
              label="Tarjeta profesional"
              icon="id-card-outline"
              value={form.licenseNumber}
              onChangeText={(t) => set("licenseNumber", t)}
              placeholder="TP-123456"
            />
          </View>
        </View>

        {/* ── Consultorio ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultorio</Text>
          <View style={styles.sectionFields}>
            <FormInput
              label="Consultorio / Clínica"
              icon="business-outline"
              value={form.clinicName}
              onChangeText={(t) => set("clinicName", t)}
              placeholder="Consultorio Dental Sonrisa"
            />
            <FormInput
              label="Dirección"
              icon="location-outline"
              value={form.address}
              onChangeText={(t) => set("address", t)}
              placeholder="Calle 123 #45-67"
            />
          </View>
        </View>

        <PrimaryButton label="Guardar datos" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    },
    headerTexts: {
      flex: 1,
    },
    headerName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    sectionFields: {
      gap: 4,
    },
  });
