/**
 * Tasarım token'ları — web (Tailwind/CSS değişkenleri) ve gelecekteki
 * React Native temasının tek kaynağı. Renkler HSL bileşenleri olarak da verilir.
 */
export const brand = {
  name: 'Havuz',
  tagline: 'Bağımsız işletmelerin ortak satın alma gücü',
} as const;

export const palette = {
  light: {
    background: '#f7f8f6',
    surface: '#ffffff',
    surfaceMuted: '#f0f2ef',
    border: '#e2e6e1',
    text: '#0c1512',
    textMuted: '#55615c',
    primary: '#0e8f6e',
    primaryForeground: '#ffffff',
    accent: '#f2a93b',
    danger: '#d6453d',
    warning: '#c98500',
    success: '#0c8a4c',
  },
  dark: {
    background: '#07110e',
    surface: '#0d1a16',
    surfaceMuted: '#12231e',
    border: '#1e332c',
    text: '#eef4f1',
    textMuted: '#93a69e',
    primary: '#2cc79a',
    primaryForeground: '#04100c',
    accent: '#f5b453',
    danger: '#ef6a62',
    warning: '#e0a526',
    success: '#3ccf7f',
  },
} as const;

/** Kategorik grafik paleti — sabit sırada atanır, döngüye sokulmaz. */
export const chartSeries = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
} as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const motion = {
  spring: { type: 'spring', stiffness: 380, damping: 32 },
  springSoft: { type: 'spring', stiffness: 160, damping: 22 },
  durationFast: 0.18,
  durationBase: 0.32,
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

/** Kategori slug → ikon adı (lucide). Mobilde lucide-react-native aynı adları kullanır. */
export const categoryIcons = {
  temel: 'Wheat',
  kahve: 'Coffee',
  sut: 'Milk',
  taze: 'Apple',
  et: 'Beef',
  ambalaj: 'Package',
  temizlik: 'SprayCan',
} as const;
