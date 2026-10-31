import React, { createContext, useContext, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { useSettingsStore } from "../../features/settings/store";

export type Palette = {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  time: string;
  icon: string;
  header: string;
};

export const lightColors: Palette = {
  primary: "#007AFF",
  secondary: "#5AC8FA",
  success: "#34C759",
  danger: "#FF3B30",
  warning: "#FF9500",
  background: "#F2F2F7",
  surface: "#E5E5EA",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#8E8E93",
  border: "#C7C7CC",
  time: "#4d454e",
  icon: "#000000",
  header: "#007AFF",
};

export const darkColors: Palette = {
  primary: "#0A84FF",
  secondary: "#64D2FF",
  success: "#30D158",
  danger: "#FF453A",
  warning: "#FF9F0A",
  background: "#000000",
  surface: "#1C1C1E",
  card: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#98989F",
  border: "#38383A",
  time: "#C7C7CC",
  icon: "#FFFFFF",
  header: "#0A84FF",
};

export type ThemeScheme = "light" | "dark";

type ThemeValue = {
  colors: Palette;
  scheme: ThemeScheme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: "light",
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.theme);

  const scheme: ThemeScheme =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      colors: scheme === "dark" ? darkColors : lightColors,
      scheme,
      isDark: scheme === "dark",
    }),
    [scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

/**
 * Crea estilos dependientes del tema actual.
 * Pasa una función estable (definida a nivel de módulo) que reciba la paleta.
 *
 * const createStyles = (colors: Palette) => ({ ... });
 * ...
 * const styles = useThemedStyles(createStyles);
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [factory, colors]);
}
