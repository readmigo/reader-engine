export const VERSION = '0.1.0';

// Engine facade
export { ReaderEngine } from './engine';
export type { ReaderEngineOptions, ReaderState, ReaderCallbacks } from './engine';

// Types
export type {
  Book,
  ChapterSummary,
  BookDetail,
  ChapterContent,
  LoadedChapter,
  TextAlign,
  ReadingMode,
  ThemeName,
  ThemeColors,
  ReaderSettings,
  ColumnCount,
  FontWeight,
  PageTransition,
  AppearanceMode,
  ThemeMapping,
} from './types';
export { DEFAULT_SETTINGS, THEMES, FONT_FAMILIES, FONT_WEIGHT_MAP, DEFAULT_THEME_MAPPING } from './types';

// API
export { ApiClient } from './api';
export type { ApiClientOptions } from './api';
export { ContentLoader } from './api';

// Renderer
export { ChapterRenderer } from './renderer';
export { generateReaderCSS } from './renderer';

// Core
export { Paginator } from './core';
export type { PageState, PaginatorOptions } from './core';
export { ScrollMode } from './core';
export type { ScrollState } from './core';
export { PageAnimator } from './core';
export { GestureHandler } from './core';
export type { GestureCallbacks } from './core';
export { PositionManager } from './core';
export type { ReadingPosition, PositionState, PositionRestoreCallbacks } from './core';
export { AutoPager } from './core';
export type { AutoPagerState } from './core';

// Navigation
export { ChapterManager } from './navigation';
export { calculateOverallProgress } from './navigation';

// Appearance
export { resolveTheme, watchSystemAppearance, getPreviewStyles } from './appearance';

// Interaction
export { SelectionManager, HighlightManager, BookmarkManager, SearchManager } from './interaction';
export type {
  TextPosition,
  TextRange,
  HighlightColor,
  HighlightData,
  BookmarkData,
  SearchMatch,
  SearchOptions,
  SelectionChangeEvent,
  HighlightTapEvent,
} from './interaction';

// TTS
export { TTSController, SentenceParser, TTSHighlightManager } from './tts';
export { DEFAULT_TTS_SETTINGS, PAUSE_DELAYS } from './tts';
export type {
  TTSState,
  TTSStatus,
  TTSSettings,
  PauseLevel,
  TTSReadingMode,
  TTSCallbacks,
  SpeakOptions,
  SpeechSynthesisAdapter,
  Sentence,
  Paragraph,
} from './tts';
