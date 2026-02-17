// Types
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
} from './types';
export { DEFAULT_TTS_SETTINGS, PAUSE_DELAYS } from './types';

// Components
export { SentenceParser } from './sentence-parser';
export { TTSHighlightManager } from './highlight-manager';
export { TTSController } from './tts-controller';
