// ── TTS State ──────────────────────────────────────────────

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface TTSState {
  status: TTSStatus;
  currentParagraphIndex: number;
  currentSentenceIndex: number;
  globalSentenceIndex: number;
  totalSentences: number;
  totalParagraphs: number;
  currentSentenceText: string | null;
  /** 0-1, completion ratio for current chapter */
  progress: number;
}

// ── TTS Settings ───────────────────────────────────────────

export type PauseLevel = 'short' | 'normal' | 'long';
export type TTSReadingMode = 'continuous' | 'chapter';

export interface TTSSettings {
  rate: number;
  pitch: number;
  volume: number;
  pauseBetweenSentences: PauseLevel;
  pauseBetweenParagraphs: PauseLevel;
  autoPageTurn: boolean;
  readingMode: TTSReadingMode;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  rate: 1,
  pitch: 1,
  volume: 1,
  pauseBetweenSentences: 'normal',
  pauseBetweenParagraphs: 'normal',
  autoPageTurn: true,
  readingMode: 'continuous',
};

export const PAUSE_DELAYS: Record<PauseLevel, { sentence: number; paragraph: number }> = {
  short: { sentence: 100, paragraph: 300 },
  normal: { sentence: 300, paragraph: 800 },
  long: { sentence: 600, paragraph: 1500 },
};

// ── Callbacks ──────────────────────────────────────────────

export interface TTSCallbacks {
  onStateChange?: (state: TTSState) => void;
  onSentenceChange?: (paragraphIndex: number, sentenceIndex: number, text: string) => void;
  onParagraphChange?: (paragraphIndex: number) => void;
  onChapterEnd?: () => void;
  onAutoPageTurn?: (page: number) => void;
  onError?: (error: Error) => void;
}

// ── Speech Synthesis Adapter (Platform interface) ──────────

export interface SpeakOptions {
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeechSynthesisAdapter {
  speak(text: string, options: SpeakOptions): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  onEnd(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}

// ── Parsed Structures (Internal) ───────────────────────────

export interface Sentence {
  index: number;
  text: string;
  globalIndex: number;
}

export interface Paragraph {
  index: number;
  text: string;
  sentences: Sentence[];
  element: HTMLElement;
}
