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
} from './types';
export { DEFAULT_SETTINGS, THEMES, FONT_FAMILIES } from './types';

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

// Navigation
export { ChapterManager } from './navigation';
export { calculateOverallProgress } from './navigation';
