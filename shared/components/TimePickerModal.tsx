/**
 * TimePickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Selector de hora estilo "rueda de celular" (drum-roll / wheel picker).
 * Funciona en Web y React Native con scroll deslizable y snap preciso.
 *
 * Columnas: Horas (01-12) | Minutos (00-55 de 5 en 5) | AM / PM
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useColors, useThemedStyles, type Palette } from "../theme";

// ─── Constantes ───────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 52;          // Altura de cada ítem en la rueda
const VISIBLE_ITEMS = 5;         // Ítems visibles (centro = seleccionado)
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parse12HourStr(time12h: string) {
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: "08", minute: "00", period: "AM" };
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = (match[3] || "AM").toUpperCase();
  if (h === 0) h = 12;
  if (h > 12) h = h - 12;
  const mRounded = Math.min(Math.round(m / 5) * 5, 55);
  return {
    hour:   String(h).padStart(2, "0"),
    minute: String(mRounded).padStart(2, "0"),
    period,
  };
}

// ─── Componente de Rueda (WheelPicker) ───────────────────────────────────────
interface WheelPickerProps {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  width?: number;
}

function WheelPicker({ items, selected, onSelect, width = 80 }: WheelPickerProps) {
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const selectedIdx = items.indexOf(selected);
  // Montado: scrollar al ítem seleccionado
  const didMount = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const idx = items.indexOf(selected);
      if (scrollRef.current && idx >= 0) {
        scrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated: !didMount.current });
        didMount.current = true;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selected, items]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, items.length - 1));
      onSelect(items[clampedIdx]);
      // Snap exacto en caso de offset irregular
      scrollRef.current?.scrollTo({ y: clampedIdx * ITEM_HEIGHT, animated: true });
    },
    [items, onSelect]
  );

  // Ítems vacíos arriba/abajo para centrar primer y último ítem
  const padding = Math.floor(VISIBLE_ITEMS / 2); // = 2

  return (
    <View style={[styles.wheelOuter, { width }]}>
      {/* Indicador de selección (resaltado central) */}
      <View
        pointerEvents="none"
        style={[styles.selectionHighlight, { top: padding * ITEM_HEIGHT }]}
      />

      <ScrollView
        ref={scrollRef}
        style={{ height: PICKER_HEIGHT }}
        contentContainerStyle={{ paddingTop: padding * ITEM_HEIGHT, paddingBottom: padding * ITEM_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate={Platform.OS === "web" ? 0 : "fast"}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
      >
        {items.map((item, idx) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.wheelItem]}
              onPress={() => {
                onSelect(item);
                scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.wheelText,
                  isSelected && styles.wheelTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Degradados arriba/abajo para efecto visual */}
      <View pointerEvents="none" style={styles.fadeTop} />
      <View pointerEvents="none" style={styles.fadeBottom} />
    </View>
  );
}

// ─── Modal Principal ──────────────────────────────────────────────────────────
interface TimePickerModalProps {
  visible: boolean;
  initialTime: string;   // "08:30 AM"
  onConfirm: (time12h: string) => void;
  onCancel: () => void;
  title?: string;
}

export function TimePickerModal({
  visible,
  initialTime,
  onConfirm,
  onCancel,
  title = "Seleccionar Hora",
}: TimePickerModalProps) {
  const [hour,   setHour]   = useState("08");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (visible) {
      const p = parse12HourStr(initialTime);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
    }
  }, [visible, initialTime]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Fondo oscuro */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        {/* Diálogo (no se cierra al tocar adentro) */}
        <View style={styles.dialog} onStartShouldSetResponder={() => true}>

          {/* Título */}
          <Text style={styles.dialogTitle}>{title}</Text>

          {/* Vista previa grande */}
          <Text style={styles.previewTime}>
            {hour}:{minute}{" "}
            <Text style={{ color: colors.primary }}>{period}</Text>
          </Text>

          {/* Separador */}
          <View style={styles.divider} />

          {/* Ruedas */}
          <View style={styles.wheelsRow}>
            {/* Horas */}
            <WheelPicker items={HOURS}   selected={hour}   onSelect={setHour}   width={72} />

            <Text style={styles.colonText}>:</Text>

            {/* Minutos */}
            <WheelPicker items={MINUTES} selected={minute} onSelect={setMinute} width={72} />

            {/* AM / PM */}
            <View style={styles.periodCol}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Botones */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(`${hour}:${minute} ${period}`)}
            >
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const W = Dimensions.get("window").width;

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    width: Math.min(340, W - 40),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  previewTime: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  wheelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginVertical: 4,
  },
  // ── Rueda ──
  wheelOuter: {
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  selectionHighlight: {
    position: "absolute",
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.primary + "18",
    borderWidth: 1.5,
    borderColor: colors.primary + "60",
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelText: {
    fontSize: 22,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  wheelTextSelected: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    // Gradiente arriba (blanco a transparente)
    backgroundColor: "transparent",
    // En web y native, usamos un enfoque diferente:
    // la opacidad visual la logra el highlight de fondo
    pointerEvents: "none",
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    backgroundColor: "transparent",
    pointerEvents: "none",
  },
  colonText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  // ── AM / PM ──
  periodCol: {
    marginLeft: 10,
    gap: 10,
    justifyContent: "center" as const,
    alignItems: "center",
    height: PICKER_HEIGHT,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 56,
    alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  // ── Botones ──
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
