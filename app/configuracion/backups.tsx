import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../../shared/theme";
import { importData } from "../../context/AppContext";
import { usePatientsStore } from "../../features/patients/store";
import { useFinanceStore } from "../../features/finance/store";
import { useDialog } from "../../shared/context/DialogContext";

export default function ConfigBackups() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const patients = usePatientsStore((s) => s.patients);
  const transactions = useFinanceStore((s) => s.transactions);
  const dialog = useDialog();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      if (patients.length === 0 && transactions.length === 0) {
        dialog.alert(
          "Sin datos",
          "No hay pacientes ni transacciones para exportar. Agrega algunos datos primero.",
          "error"
        );
        return;
      }
      const backupData = {
        metadata: {
          version: "1.0",
          date: new Date().toISOString(),
          appName: "ConsultorioApp",
          patientsCount: patients.length,
          transactionsCount: transactions.length,
        },
        patients,
        transactions,
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toLocaleTimeString("es-ES").replace(/:/g, "-");
      const fileName = `backup_consultorio_${dateStr}_${timeStr}.json`;
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const safePath = cacheDir ? `${cacheDir}${fileName}` : `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(safePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const fileInfo = await FileSystem.getInfoAsync(safePath);
      if (!fileInfo.exists) {
        throw new Error("El archivo no se creó correctamente");
      }
      dialog.custom(
        "Copia Creada",
        `Se exportaron ${patients.length} pacientes y ${transactions.length} transacciones.\n\n¿Qué deseas hacer?`,
        "success",
        [
          {
            text: "Guardar en Descargas",
            style: "primary",
            onPress: async () => {
              try {
                if (Platform.OS === "android") {
                  const permissions =
                    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                  if (permissions.granted) {
                    const fileContent = await FileSystem.readAsStringAsync(safePath);
                    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                      permissions.directoryUri,
                      fileName,
                      "application/json"
                    );
                    await FileSystem.writeAsStringAsync(uri, fileContent);
                    dialog.alert(
                      "Guardado",
                      "Archivo guardado exitosamente en la carpeta seleccionada",
                      "success"
                    );
                  } else {
                    dialog.alert("Permiso denegado", "No se pudo acceder al almacenamiento", "error");
                  }
                }
              } catch (downloadError: any) {
                console.error("Error saving to downloads:", downloadError);
                dialog.alert("Error", `No se pudo guardar: ${downloadError.message}`, "error");
              }
            },
          },
          {
            text: "Compartir",
            style: "primary",
            onPress: async () => {
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(safePath, {
                  UTI: "public.json",
                  mimeType: "application/json",
                  dialogTitle: "Compartir copia de seguridad",
                });
              } else {
                dialog.alert("Error", "No se puede compartir en este dispositivo", "error");
              }
            },
          },
          { text: "Cancelar", style: "cancel", onPress: () => {} },
        ]
      );
    } catch (error: any) {
      console.error("❌ Error al exportar:", error);
      dialog.alert(
        "Error al exportar",
        `No se pudo crear la copia de seguridad.\n\nDetalles: ${error.message || "Error desconocido"}`,
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      dialog.confirm(
        "Advertencia",
        "Importar un respaldo reemplazará TODOS los datos actuales. ¿Estás seguro?",
        async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: "application/json",
              copyToCacheDirectory: true,
            });
            if (result.canceled) {
              setIsImporting(false);
              return;
            }
            const fileUri = result.assets[0].uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri);
            const backupData = JSON.parse(fileContent);
            if (!backupData.metadata || backupData.metadata.appName !== "ConsultorioApp") {
              throw new Error("Archivo de respaldo inválido");
            }
            if (!backupData.patients || !backupData.transactions) {
              throw new Error("El archivo no contiene datos válidos");
            }
            await importData(backupData.patients, backupData.transactions);
            dialog.alert(
              "Importación exitosa",
              `Se importaron ${backupData.patients.length} pacientes y ${backupData.transactions.length} transacciones.`,
              "success"
            );
          } catch (importError: any) {
            console.error("❌ Error al importar:", importError);
            dialog.alert(
              "Error al importar",
              `No se pudo importar el respaldo.\n\nDetalles: ${importError.message || "Error desconocido"}`,
              "error"
            );
          } finally {
            setIsImporting(false);
          }
        },
        "danger"
      );
    } catch (error: any) {
      console.error("❌ Error:", error);
      dialog.alert("Error", error.message || "Error al seleccionar archivo", "error");
      setIsImporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Copias de Seguridad</Text>
        <Text style={styles.sectionSubtitle}>
          Exporta tus datos para tener un respaldo o impórtalos para restaurarlos. Esta acción afecta a todos los datos locales.
        </Text>

        <TouchableOpacity
          style={[styles.item, isExporting && styles.itemDisabled]}
          onPress={handleExport}
          disabled={isExporting || isImporting}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
            )}
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              {isExporting ? "Exportando..." : "Exportar Copia de Seguridad"}
            </Text>
            <Text style={styles.itemSubtitle}>
              {isExporting
                ? "Creando archivo de respaldo..."
                : `Guarda ${patients.length} pacientes y ${transactions.length} transacciones`}
            </Text>
          </View>
          {!isExporting && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity
          style={[styles.item, isImporting && styles.itemDisabled]}
          onPress={handleImport}
          disabled={isExporting || isImporting}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: "#10B981" + "20" }]}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={24} color="#10B981" />
            )}
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              {isImporting ? "Importando..." : "Importar Copia de Seguridad"}
            </Text>
            <Text style={styles.itemSubtitle}>
              {isImporting ? "Restaurando datos..." : "Restaura desde un archivo .json"}
            </Text>
          </View>
          {!isImporting && (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.statsBox}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <Text style={styles.statsText}>{patients.length} pacientes</Text>
        </View>
        <View style={styles.statsBox}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          <Text style={styles.statsText}>{transactions.length} transacciones</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recomendaciones</Text>
        <Text style={styles.infoText}>
          • Haz copias de seguridad periódicamente (antes de cambios importantes).
        </Text>
        <Text style={styles.infoText}>
          • Importar reemplaza los datos actuales; haz primero una copia de seguridad.
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
    },
    itemDisabled: { opacity: 0.6 },
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
    infoSection: {
      alignItems: "center",
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginBottom: 16,
    },
    statsBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 8,
    },
    statsText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 20,
    },
  });
