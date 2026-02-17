import { useState, useEffect, useCallback } from 'react';
import { useReaderContext } from './context';
import type { TTSState, TTSSettings, SpeechSynthesisAdapter } from '../tts';
import type { AutoPagerState } from '../core/auto-pager';
import type { TextRange, HighlightColor, HighlightData, BookmarkData, SearchMatch, SearchOptions } from '../interaction';

// ── Existing hooks ───────────────────────────────────────

export function useReader() {
  const { state, loadBook, loadChapter, nextPage, prevPage, goToChapter, savePosition, restorePosition } = useReaderContext();
  return { state, loadBook, loadChapter, nextPage, prevPage, goToChapter, savePosition, restorePosition };
}

export function useReaderSettings() {
  const { engine, updateSettings } = useReaderContext();
  return { settings: engine.settings, updateSettings };
}

export function useChapters() {
  const { chapters, state, bookDetail } = useReaderContext();
  return {
    chapters,
    currentIndex: state.chapterIndex,
    totalChapters: chapters.length,
    bookTitle: bookDetail?.title ?? '',
  };
}

// ── New hooks ────────────────────────────────────────────

export function useTTS() {
  const { engine } = useReaderContext();
  const tts = engine.tts;

  const [ttsState, setTTSState] = useState<TTSState>(() => tts.state);

  useEffect(() => {
    const prevCb = engine.callbacks.onTTSStateChange;
    engine.callbacks.onTTSStateChange = (s) => {
      setTTSState(s);
      prevCb?.(s);
    };
    return () => {
      engine.callbacks.onTTSStateChange = prevCb;
    };
  }, [engine, tts]);

  const play = useCallback((fromParagraph?: number) => tts.play(fromParagraph), [tts]);
  const pause = useCallback(() => tts.pause(), [tts]);
  const resume = useCallback(() => tts.resume(), [tts]);
  const stop = useCallback(() => tts.stop(), [tts]);
  const togglePlayPause = useCallback(() => tts.togglePlayPause(), [tts]);
  const nextSentence = useCallback(() => tts.nextSentence(), [tts]);
  const previousSentence = useCallback(() => tts.previousSentence(), [tts]);
  const nextParagraph = useCallback(() => tts.nextParagraph(), [tts]);
  const previousParagraph = useCallback(() => tts.previousParagraph(), [tts]);
  const goToParagraph = useCallback((index: number) => tts.goToParagraph(index), [tts]);
  const setAdapter = useCallback((adapter: SpeechSynthesisAdapter) => tts.setAdapter(adapter), [tts]);
  const updateTTSSettings = useCallback((partial: Partial<TTSSettings>) => tts.updateSettings(partial), [tts]);

  return {
    ...ttsState,
    settings: tts.settings,
    play,
    pause,
    resume,
    stop,
    togglePlayPause,
    nextSentence,
    previousSentence,
    nextParagraph,
    previousParagraph,
    goToParagraph,
    setAdapter,
    updateSettings: updateTTSSettings,
  };
}

export function useAutoPage() {
  const { startAutoPage, pauseAutoPage, resumeAutoPage, stopAutoPage, autoPageState } = useReaderContext();

  return {
    state: autoPageState,
    start: startAutoPage,
    pause: pauseAutoPage,
    resume: resumeAutoPage,
    stop: stopAutoPage,
  };
}

export function useSelection() {
  const { engine } = useReaderContext();

  const [selectionRange, setSelectionRange] = useState<TextRange | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const prevCb = engine.callbacks.onSelectionChange;
    engine.callbacks.onSelectionChange = (event) => {
      setSelectionRange(event.range);
      setSelectionRect(event.rect);
      prevCb?.(event);
    };
    return () => {
      engine.callbacks.onSelectionChange = prevCb;
    };
  }, [engine]);

  const captureSelection = useCallback(() => {
    return engine.selection?.captureSelection() ?? null;
  }, [engine]);

  return {
    range: selectionRange,
    rect: selectionRect,
    captureSelection,
  };
}

export function useHighlights() {
  const { engine } = useReaderContext();

  const addHighlight = useCallback((data: HighlightData) => {
    return engine.highlights?.addHighlight(data) ?? false;
  }, [engine]);

  const removeHighlight = useCallback((id: string) => {
    engine.highlights?.removeHighlight(id);
  }, [engine]);

  const highlightFromSelection = useCallback((id: string, color: HighlightColor) => {
    return engine.highlights?.highlightFromSelection(id, color) ?? null;
  }, [engine]);

  const restoreHighlights = useCallback((highlights: HighlightData[]) => {
    engine.highlights?.restoreHighlights(highlights);
  }, [engine]);

  const updateHighlightColor = useCallback((id: string, color: HighlightColor) => {
    engine.highlights?.updateHighlightColor(id, color);
  }, [engine]);

  const clearHighlights = useCallback(() => {
    engine.highlights?.clearHighlights();
  }, [engine]);

  const getAllHighlights = useCallback(() => {
    return engine.highlights?.getAllHighlights() ?? [];
  }, [engine]);

  return {
    addHighlight,
    removeHighlight,
    highlightFromSelection,
    restoreHighlights,
    updateHighlightColor,
    clearHighlights,
    getAllHighlights,
  };
}

export function useSearch() {
  const { engine } = useReaderContext();
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);

  const search = useCallback((query: string, options?: SearchOptions) => {
    const matches = engine.search?.search(query, options) ?? [];
    setTotalMatches(matches.length);
    setCurrentMatchIndex(-1);
    return matches;
  }, [engine]);

  const highlightMatches = useCallback((matches: SearchMatch[]) => {
    engine.search?.highlightMatches(matches);
  }, [engine]);

  const clearSearchHighlights = useCallback(() => {
    engine.search?.clearSearchHighlights();
    setTotalMatches(0);
    setCurrentMatchIndex(-1);
  }, [engine]);

  const nextMatch = useCallback(() => {
    const idx = engine.search?.nextMatch() ?? -1;
    setCurrentMatchIndex(idx);
    return idx;
  }, [engine]);

  const prevMatch = useCallback(() => {
    const idx = engine.search?.prevMatch() ?? -1;
    setCurrentMatchIndex(idx);
    return idx;
  }, [engine]);

  return {
    search,
    highlightMatches,
    clearSearchHighlights,
    nextMatch,
    prevMatch,
    currentMatchIndex,
    totalMatches,
  };
}
