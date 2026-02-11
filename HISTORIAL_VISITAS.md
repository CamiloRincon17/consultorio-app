# Historial de Visitas - Documentación

## 🎯 Funcionalidad Implementada

Se ha agregado un **sistema completo de historial de visitas** para los pacientes en la aplicación de consultorio.

## 📋 Características

### 1. **Tipo de Datos - Visit**
Se creó una nueva interface `Visit` en `AppContext.tsx` que incluye:
- `id`: Identificador único de la visita
- `date`: Fecha de la visita (requerido)
- `reason`: Motivo de la visita (opcional)
- `treatment`: Tratamiento realizado (opcional)
- `notes`: Notas adicionales (opcional)
- `cost`: Costo de la visita (opcional)
- `paid`: Estado de pago (opcional)

### 2. **Funciones en AppContext**
Se agregaron las siguientes funciones al contexto global:

- **`addVisit(patientId, visit)`**: Agregar una nueva visita
- **`updateVisit(patientId, visitId, updates)`**: Actualizar una visita existente
- **`deleteVisit(patientId, visitId)`**: Eliminar una visita
- **`getPatientVisits(patientId)`**: Obtener todas las visitas de un paciente

### 3. **Nueva Pantalla - Historial de Visitas**
**Archivo**: `app/historial-visitas.tsx`

Esta pantalla incluye:

#### 📊 Resumen de Estadísticas
- Total de visitas
- Monto total cobrado
- Número de visitas pagadas

#### 📝 Lista de Visitas
Cada tarjeta de visita muestra:
- Fecha formateada (día, mes, año)
- Motivo de la visita
- Tratamiento realizado
- Notas
- Costo y estado de pago (Pagado/Pendiente)
- Botones para editar y eliminar

#### ➕ Agregar/Editar Visitas
Modal con formulario completo que incluye:
- Campo de fecha (requerido)
- Motivo de la visita
- Tratamiento realizado (área de texto)
- Notas adicionales (área de texto)
- Costo numérico
- Toggle para marcar como pagado/pendiente

#### ✨ Estados Especiales
- Vista de lista vacía con mensaje amigable
- Validaciones en el formulario
- Confirmación antes de eliminar

### 4. **Integración en Pantalla de Pacientes**
Se agregó un botón **"Historial"** en la tarjeta expandida de cada paciente que permite navegar directamente al historial de visitas.

## 🎨 Diseño

El diseño sigue los estándares de la app:
- Usa la paleta de colores definida en `Colors.ts`
- Cards con sombras sutiles
- Iconos de Ionicons
- Formato de moneda colombiana (COP)
- Diseño responsivo y moderno
- Modal deslizante desde abajo
- Botón flotante para agregar visitas

## 📱 Uso

### Para agregar una visita:
1. Ve a la pantalla de "Pacientes"
2. Toca en un paciente para expandir su tarjeta
3. Presiona el botón "Historial"
4. Presiona el botón flotante "+" en la esquina inferior derecha
5. Llena el formulario
6. Presiona "Guardar"

### Para editar una visita:
1. En el historial de visitas, toca el icono de lápiz en cualquier visita
2. Modifica los campos necesarios
3. Presiona "Guardar"

### Para eliminar una visita:
1. En el historial de visitas, toca el icono de basura en cualquier visita
2. Confirma la acción

## 💾 Persistencia de Datos

Los datos se guardan automáticamente en `AsyncStorage` cada vez que se modifican los pacientes, por lo que el historial de visitas se mantiene incluso al cerrar la app.

## 🔄 Compatibilidad con Backup

El historial de visitas se incluye automáticamente en los backups de la app ya que forma parte del objeto `Patient`.

## ⚡ Próximas Mejoras Sugeridas

1. Selector de fecha visual (DatePicker)
2. Filtros por fecha o estado de pago
3. Exportación de historial a PDF
4. Estadísticas mensuales de visitas
5. Recordatorios automáticos basados en frecuencia de visitas
6. Adjuntar fotos a las visitas
7. Integración con transacciones financieras automáticas

---

**Fecha de Implementación**: 2026-02-01
**Desarrollado por**: Antigravity AI Assistant
