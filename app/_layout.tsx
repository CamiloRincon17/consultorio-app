import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppProvider } from "../context/AppContext";
import { usePatientsStore } from "../features/patients/store";
import { NotificationService } from "../services/NotificationService";
import { DialogProvider } from "../shared/context/DialogContext";
import { useProfileStore } from "../features/profile/store";
import { useSettingsStore } from "../features/settings/store";
import { ThemeProvider, useColors, useTheme } from "../shared/theme";

// Prevenir que el Splash se oculte automáticamente
// Se ocultará manualmente en AppProvider cuando auth/datos estén listos
SplashScreen.preventAutoHideAsync().catch(() => { });

function RootLayoutNav() {
  // Sin suscripción a patients: re-renderiza todo el Stack en cada cambio de lista.
  // Se lee con getState() dentro del effect (solo se ejecuta una vez al montar).
  const colors = useColors();
  const { isDark } = useTheme();

  useEffect(() => {
    // Cargar los datos personales del doctor (locales, editables)
    useProfileStore.getState().loadProfile();
    // Cargar configuraciones de la app (tema, etc.)
    useSettingsStore.getState().loadSettings();

    // Initialize notifications when app starts
    const initNotifications = async () => {
      try {
        const hasPermission = await NotificationService.requestPermissions();

        if (hasPermission?.granted) {
          console.log("🔔 Initializing notification system...");

          // Reschedule all notifications in case app was reinstalled
          await NotificationService.rescheduleAllNotifications(usePatientsStore.getState().patients);

          console.log("✅ Notification system initialized");
        } else {
          console.log("⚠️ Notification permissions not granted");
        }
      } catch (error) {
        console.error("❌ Error initializing notifications:", error);
      }
    };

    initNotifications();
  }, []); // Run once on mount

  return (
    <>
    <StatusBar style={isDark ? "light" : "dark"} />
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="registrar-paciente"
        options={{
          presentation: "modal",
          title: "Nuevo Paciente",
          headerShown: true,
          headerBackTitle: "Cancelar",
        }}
      />
      <Stack.Screen
        name="registrar-transaccion"
        options={{
          presentation: "modal",
          title: "Nueva Transacción",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="registrar-pago"
        options={{
          presentation: "modal",
          title: "Registrar Pago",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="modificar-control"
        options={{
          presentation: "modal",
          title: "Editar Control",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="editar-paciente"
        options={{
          presentation: "modal",
          title: "Editar Paciente",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="editar-transaccion"
        options={{
          presentation: "modal",
          title: "Editar Transacción",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="configuracion"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="perfil-doctor"
        options={{
          presentation: "modal",
          title: "Perfil del doctor",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="reasignar-ortodoncia"
        options={{
          presentation: "modal",
          title: "Reasignar Ortodoncia",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="historial-reasignaciones"
        options={{
          presentation: "modal",
          title: "Historial de Reasignaciones",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reporte-semanal"
        options={{
          presentation: "modal",
          title: "Reporte Semanal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reporte-mensual"
        options={{
          presentation: "modal",
          title: "Reporte Mensual",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="historial-visitas"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="seleccionar-paciente"
        options={{
          presentation: "modal",
          title: "Seleccionar Paciente",
          headerShown: true,
          headerBackTitle: "Atrás",
        }}
      />
      <Stack.Screen
        name="registrar-bloque-especialista"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <DialogProvider>
          <RootLayoutNav />
        </DialogProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
