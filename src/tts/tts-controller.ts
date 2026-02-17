import type {
  TTSState,
  TTSSettings,
  TTSCallbacks,
  TTSStatus,
  SpeechSynthesisAdapter,
  Paragraph,
} from './types';
import { DEFAULT_TTS_SETTINGS, PAUSE_DELAYS } from './types';
import { SentenceParser } from './sentence-parser';
import { TTSHighlightManager } from './highlight-manager';

/**
 * Central orchestrator that coordinates SentenceParser, HighlightManager,
 * and the platform speech adapter for TTS playback.
 *
 * State machine: idle -> loading -> playing <-> paused -> idle
 */
export class TTSController {
  private _status: TTSStatus = 'idle';
  private _settings: TTSSettings;
  private _callbacks: TTSCallbacks;
  private _adapter: SpeechSynthesisAdapter | null = null;

  private parser: SentenceParser;
  private highlightManager: TTSHighlightManager;

  private paragraphs: Paragraph[] = [];
  private currentParagraphIdx = 0;
  private currentSentenceIdx = 0;
  private totalSentences = 0;

  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private chapterId: string | null = null;

  constructor(callbacks: TTSCallbacks = {}) {
    this._callbacks = callbacks;
    this._settings = { ...DEFAULT_TTS_SETTINGS };
    this.parser = new SentenceParser();
    this.highlightManager = new TTSHighlightManager();
  }

  // ── Public API ─────────────────────────────────────────

  get state(): TTSState {
    const paragraph = this.paragraphs[this.currentParagraphIdx];
    const sentence = paragraph?.sentences[this.currentSentenceIdx];

    return {
      status: this._status,
      currentParagraphIndex: paragraph?.index ?? 0,
      currentSentenceIndex: this.currentSentenceIdx,
      globalSentenceIndex: sentence?.globalIndex ?? 0,
      totalSentences: this.totalSentences,
      totalParagraphs: this.paragraphs.length,
      currentSentenceText: sentence?.text ?? null,
      progress: this.totalSentences > 0
        ? (sentence?.globalIndex ?? 0) / this.totalSentences
        : 0,
    };
  }

  get settings(): TTSSettings {
    return { ...this._settings };
  }

  setAdapter(adapter: SpeechSynthesisAdapter): void {
    this._adapter = adapter;
  }

  /**
   * Provide the content element and chapter ID for parsing.
   * Automatically re-parses the content.
   */
  setContentElement(el: HTMLElement, chapterId: string): void {
    this.chapterId = chapterId;
    this.paragraphs = this.parser.parse(el, chapterId);
    this.totalSentences = this.paragraphs.reduce(
      (sum, p) => sum + p.sentences.length,
      0,
    );
  }

  /**
   * Start playback. Optionally start from a specific paragraph.
   */
  play(fromParagraph?: number): void {
    if (!this._adapter) {
      this._callbacks.onError?.(new Error('No SpeechSynthesisAdapter set'));
      return;
    }

    if (this.paragraphs.length === 0) {
      this._callbacks.onError?.(new Error('No content parsed'));
      return;
    }

    this._adapter.cancel();
    this.clearPauseTimer();

    if (fromParagraph !== undefined) {
      const idx = this.paragraphs.findIndex((p) => p.index === fromParagraph);
      if (idx !== -1) {
        this.currentParagraphIdx = idx;
        this.currentSentenceIdx = 0;
      }
    } else if (this._status === 'idle') {
      this.currentParagraphIdx = 0;
      this.currentSentenceIdx = 0;
    }

    this.setStatus('playing');
    this.speakCurrent();
  }

  pause(): void {
    if (this._status !== 'playing') return;
    this.clearPauseTimer();
    this._adapter?.pause();
    this.setStatus('paused');
  }

  resume(): void {
    if (this._status !== 'paused') return;
    this._adapter?.resume();
    this.setStatus('playing');
  }

  stop(): void {
    if (this._status === 'idle') return;
    this.clearPauseTimer();
    this._adapter?.cancel();
    this.highlightManager.clearHighlight();
    this.currentParagraphIdx = 0;
    this.currentSentenceIdx = 0;
    this.setStatus('idle');
  }

  togglePlayPause(): void {
    switch (this._status) {
      case 'idle':
        this.play();
        break;
      case 'playing':
        this.pause();
        break;
      case 'paused':
        this.resume();
        break;
    }
  }

  nextSentence(): void {
    if (this._status !== 'playing' && this._status !== 'paused') return;
    this.clearPauseTimer();
    this._adapter?.cancel();
    this.advanceToNextSentence();
  }

  previousSentence(): void {
    if (this._status !== 'playing' && this._status !== 'paused') return;
    this.clearPauseTimer();
    this._adapter?.cancel();

    if (this.currentSentenceIdx > 0) {
      this.currentSentenceIdx--;
    } else if (this.currentParagraphIdx > 0) {
      this.currentParagraphIdx--;
      const prevParagraph = this.paragraphs[this.currentParagraphIdx];
      this.currentSentenceIdx = prevParagraph
        ? prevParagraph.sentences.length - 1
        : 0;
    }

    if (this._status === 'playing') {
      this.speakCurrent();
    } else {
      this.applyHighlight();
      this.emitState();
    }
  }

  nextParagraph(): void {
    if (this._status !== 'playing' && this._status !== 'paused') return;
    this.clearPauseTimer();
    this._adapter?.cancel();

    if (this.currentParagraphIdx < this.paragraphs.length - 1) {
      this.currentParagraphIdx++;
      this.currentSentenceIdx = 0;
    }

    if (this._status === 'playing') {
      this.speakCurrent();
    } else {
      this.applyHighlight();
      this.emitState();
    }
  }

  previousParagraph(): void {
    if (this._status !== 'playing' && this._status !== 'paused') return;
    this.clearPauseTimer();
    this._adapter?.cancel();

    if (this.currentParagraphIdx > 0) {
      this.currentParagraphIdx--;
      this.currentSentenceIdx = 0;
    } else {
      this.currentSentenceIdx = 0;
    }

    if (this._status === 'playing') {
      this.speakCurrent();
    } else {
      this.applyHighlight();
      this.emitState();
    }
  }

  goToParagraph(index: number): void {
    const idx = this.paragraphs.findIndex((p) => p.index === index);
    if (idx === -1) return;

    this.clearPauseTimer();
    this._adapter?.cancel();

    this.currentParagraphIdx = idx;
    this.currentSentenceIdx = 0;

    if (this._status === 'playing') {
      this.speakCurrent();
    } else if (this._status === 'paused') {
      this.applyHighlight();
      this.emitState();
    }
  }

  updateSettings(partial: Partial<TTSSettings>): void {
    this._settings = { ...this._settings, ...partial };
  }

  // ── Private: Playback loop ─────────────────────────────

  private speakCurrent(): void {
    const paragraph = this.paragraphs[this.currentParagraphIdx];
    if (!paragraph) {
      this.handleChapterEnd();
      return;
    }

    const sentence = paragraph.sentences[this.currentSentenceIdx];
    if (!sentence) {
      this.handleChapterEnd();
      return;
    }

    // Apply highlight
    this.applyHighlight();

    // Notify callbacks
    this._callbacks.onSentenceChange?.(
      paragraph.index,
      this.currentSentenceIdx,
      sentence.text,
    );

    // Register end handler before speaking
    this._adapter!.onEnd(() => {
      if (this._status !== 'playing') return;
      this.onSentenceEnd();
    });

    this._adapter!.onError((error) => {
      this._callbacks.onError?.(error);
      this.stop();
    });

    // Speak
    this._adapter!.speak(sentence.text, {
      rate: this._settings.rate,
      pitch: this._settings.pitch,
      volume: this._settings.volume,
    });

    this.emitState();
  }

  private onSentenceEnd(): void {
    const currentParagraph = this.paragraphs[this.currentParagraphIdx];
    if (!currentParagraph) return;

    const isLastSentenceInParagraph =
      this.currentSentenceIdx >= currentParagraph.sentences.length - 1;

    if (isLastSentenceInParagraph) {
      // Moving to next paragraph - use paragraph pause
      const delay = PAUSE_DELAYS[this._settings.pauseBetweenParagraphs].paragraph;
      this.pauseTimer = setTimeout(() => {
        this.advanceToNextSentence();
      }, delay);
    } else {
      // Moving to next sentence within same paragraph - use sentence pause
      const delay = PAUSE_DELAYS[this._settings.pauseBetweenSentences].sentence;
      this.pauseTimer = setTimeout(() => {
        this.advanceToNextSentence();
      }, delay);
    }
  }

  private advanceToNextSentence(): void {
    const currentParagraph = this.paragraphs[this.currentParagraphIdx];
    if (!currentParagraph) {
      this.handleChapterEnd();
      return;
    }

    const prevParagraphIdx = this.currentParagraphIdx;

    if (this.currentSentenceIdx < currentParagraph.sentences.length - 1) {
      // Next sentence in same paragraph
      this.currentSentenceIdx++;
    } else if (this.currentParagraphIdx < this.paragraphs.length - 1) {
      // First sentence of next paragraph
      this.currentParagraphIdx++;
      this.currentSentenceIdx = 0;
    } else {
      // End of chapter
      this.handleChapterEnd();
      return;
    }

    // Notify paragraph change if moved to a new paragraph
    if (this.currentParagraphIdx !== prevParagraphIdx) {
      const newParagraph = this.paragraphs[this.currentParagraphIdx];
      if (newParagraph) {
        this._callbacks.onParagraphChange?.(newParagraph.index);
      }
    }

    if (this._status === 'playing') {
      this.speakCurrent();
    }
  }

  private handleChapterEnd(): void {
    this.highlightManager.clearHighlight();
    this._callbacks.onChapterEnd?.();

    if (this._settings.readingMode === 'chapter') {
      this.setStatus('idle');
    }
    // In 'continuous' mode, the consumer (ReaderEngine) handles loading
    // the next chapter and calling setContentElement + play again.
  }

  // ── Private: Helpers ───────────────────────────────────

  private applyHighlight(): void {
    this.highlightManager.highlightSentence(
      this.paragraphs[this.currentParagraphIdx]?.index ?? 0,
      this.currentSentenceIdx,
      this.paragraphs,
    );
  }

  private setStatus(status: TTSStatus): void {
    this._status = status;
    this.emitState();
  }

  private emitState(): void {
    this._callbacks.onStateChange?.(this.state);
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }
}
