# Plan: Rendimiento de tabs + Perfil del doctor + Header de Inicio

Proyecto: `consultorio-app` (Expo 57, expo-router, Zustand, tema dinamico `shared/theme`).
Componentes: `AvatarInitials(name,size)`, `SyncIndicator`, `ScreenHeader`.

## Parte 1 - Rendimiento (todo)

### 1.1 Borrar calculos muertos
- `app/(tabs)/home/index.tsx:98-115` borrar bloque `debtors` (no se usa).
- `app/(tabs)/home/index.tsx:62` quitar `isFromCache` del selector (no se usa).
- `app/(tabs)/finanzas.tsx:34` borrar `const summary = React.useMemo(...)` (no se usa).
- `app/(tabs)/finanzas.tsx:62-77` borrar `dailyData` (grafico borrado, se seguia calculando).

### 1.2 Memoizar calculos de Home
- `app/(tabs)/home/index.tsx:74-78` envolver `upcomingAppointments`/`pendingAppointments` en `useMemo([patients])`.

### 1.3 React.memo en componentes de lista
- `features/patients/components/PatientCard.tsx` → `React.memo`.
- `features/finance/components/TransactionCard.tsx` → `React.memo`.
- `shared/components/{StatCard,EmptyState,AvatarInitials,SyncIndicator}.tsx` → `React.memo`.

### 1.4 Callbacks estables (quitar arrows inline)
- `app/(tabs)/finanzas.tsx:108-124` extraer `handleTransactionPress(id)` con `useCallback`.
- `app/(tabs)/home/index.tsx:208,217,226,235` extraer handlers para `<Card onPress>`.
- `app/(tabs)/agenda.tsx:328` idem en `renderItem`.

### 1.5 Memoizar `Card` local de Home
- `app/(tabs)/home/index.tsx` la `function Card(...)` local → `React.memo`.

### 1.6 Agenda: memoizar timeline
- `app/(tabs)/agenda.tsx:576-679` la IIFE que construye `timelineItems` y hace `.sort()` → `useMemo`.

### 1.7 Selectores de store sin funcion (4 lugares)
- `app/configuracion/apariencia.tsx:19` selectores individuales.
- `app/configuracion/sync.tsx:25` selectores individuales.
- `app/registrar-bloque-especialista.tsx:123,188` selectores individuales.

### 1.8 RootLayoutNav sin suscripcion a patients
- `app/_layout.tsx:18` usar `usePatientsStore.getState().patients` dentro del `useEffect` en vez de suscribirse (evita re-render del Stack en cada edicion).

### 1.9 SyncIndicator polling
- `shared/components/SyncIndicator.tsx:22` el interval depende de `isSyncing`; usar ref para no recrear el interval. Bajar costo de `getPendingCount` (lee y parsea toda la cola AsyncStorage cada 10s) - opcional, prioridad baja.

## Parte 2 - Perfil (renombrar + mejorar UI, sin foto)

### 2.1 Renombrar seccion en Configuracion
- `app/configuracion/general.tsx:200` titulo `"doctor"` → `"Perfil"`.
- `general.tsx:211` `"Datos del doctor"` → `"Perfil del doctor"`.
- `general.tsx:213` subtitulo → `"Actualiza tu informacion profesional y del consultorio"`.
- `app/_layout.tsx:123` titulo del Stack.Screen `"Datos del Doctor"` → `"Perfil del doctor"`.

### 2.2 Mejorar UI de `app/perfil-doctor.tsx`
- Agregar `AvatarInitials` (iniciales del nombre) arriba del formulario + especialidad debajo.
- Agrupar campos en secciones: Datos personales (nombre, telefono, correo), Datos profesionales (especialidad, tarjeta profesional), Consultorio (consultorio, direccion).
- Usar `useColors`/`useThemedStyles` si aun no lo usa.

## Parte 3 - Header de Inicio (recomendacion)

### Propuesta (sobre el header vacio actual `home/index.tsx:148-163`)
- Izquierda: hamburguesa (ya existe).
- Centro: `AvatarInitials` (iniciales) + `"Hola, Dr. {nombre}"` + `"{especialidad} · {fecha larga}"`.
- Derecha: `SyncIndicator` (ya existe).

Detalles:
- Importar `useProfileStore` en home (hoy no esta importado) para `profile.fullName` y `profile.specialization`.
- Reutilizar `capitalizedName` ya calculado (`home/index.tsx:127-131`).
- Fecha: `new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })`.
- Agregar `headerRow`/`headerAvatar`/`headerText` en `createStyles` (ya existen `headerTitle`, `headerSubtitle`).
- En estado de carga (`home/index.tsx:134-146`) mantener el header consistente.

## Verificacion final
- `npx tsc --noEmit` → 0 errores.
- `npx expo lint` → baseline 24 problemas.
- `npx expo export --platform web` → build ok.
