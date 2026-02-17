export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ReadingMode = 'paginated' | 'scroll';
export type ThemeName = 'light' | 'sepia' | 'dark' | 'ultraDark';

// Layout & Typography
export type ColumnCount = 1 | 2 | 3;
export type FontWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold';

export const FONT_WEIGHT_MAP: Record<FontWeight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Page Navigation
export type PageTransition = 'slide' | 'fade' | 'none';

// Appearance
export type AppearanceMode = 'light' | 'dark' | 'auto';

export interface ThemeMapping {
  lightTheme: ThemeName;
  darkTheme: ThemeName;
}

export const DEFAULT_THEME_MAPPING: ThemeMapping = {
  lightTheme: 'light',
  darkTheme: 'dark',
};

export interface ThemeColors {
  background: string;
  text: string;
  secondaryText: string;
  highlight: string;
  link: string;
}

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  paragraphSpacing: number;
  textAlign: TextAlign;
  hyphenation: boolean;
  theme: ThemeName;
  readingMode: ReadingMode;
  margin: number;
  // Layout & Typography
  columnCount: ColumnCount;
  textIndent: number;
  fontWeight: FontWeight;
  // Page Navigation
  pageTransition: PageTransition;
  transitionDuration: number;
  swipeEnabled: boolean;
  autoPageInterval: number | null;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 12,
  textAlign: 'justify',
  hyphenation: true,
  theme: 'light',
  readingMode: 'paginated',
  margin: 20,
  // Layout & Typography
  columnCount: 1,
  textIndent: 0,
  fontWeight: 'regular',
  // Page Navigation
  pageTransition: 'slide',
  transitionDuration: 300,
  swipeEnabled: true,
  autoPageInterval: null,
};

export const THEMES: Record<ThemeName, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    text: '#1A1A1A',
    secondaryText: '#666666',
    highlight: '#FFD700',
    link: '#2563EB',
  },
  sepia: {
    background: '#F4ECD8',
    text: '#5B4636',
    secondaryText: '#8B7355',
    highlight: '#D4A574',
    link: '#8B4513',
  },
  dark: {
    background: '#1C1C1E',
    text: '#E5E5E7',
    secondaryText: '#8E8E93',
    highlight: '#4A90D9',
    link: '#64B5F6',
  },
  ultraDark: {
    background: '#000000',
    text: '#E5E5E7',
    secondaryText: '#8E8E93',
    highlight: '#4A90D9',
    link: '#64B5F6',
  },
};

export const FONT_FAMILIES = [
  { name: 'Georgia', css: 'Georgia, serif' },
  { name: 'Palatino', css: '"Palatino Linotype", Palatino, serif' },
  { name: 'Times', css: '"Times New Roman", Times, serif' },
  { name: 'Baskerville', css: 'Baskerville, serif' },
  { name: 'Helvetica', css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { name: 'Avenir', css: '"Avenir Next", Avenir, sans-serif' },
  { name: 'System', css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: 'PingFang SC', css: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
  { name: 'Songti SC', css: '"Songti SC", "SimSun", serif' },
  { name: 'System Serif', css: 'ui-serif, Georgia, serif' },
  { name: 'Kaiti SC', css: '"Kaiti SC", "STKaiti", serif' },
] as const;
