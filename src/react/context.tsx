import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { ReaderEngine, type ReaderEngineOptions, type ReaderState } from '../engine';
import type { BookDetail, ChapterSummary, ReaderSettings } from '../types';

export interface ReaderProviderProps extends ReaderEngineOptions {
  children: ReactNode;
  onError?: (error: Error) => void;
  onChapterChange?: (chapter: ChapterSummary, index: number) => void;
}

export interface ReaderContextValue {
  engine: ReaderEngine;
  state: ReaderState;
  bookDetail: BookDetail | null;
  chapters: ChapterSummary[];
  loadBook: (bookId: string) => Promise<BookDetail>;
  loadChapter: (index: number) => Promise<void>;
  nextPage: () => boolean;
  prevPage: () => boolean;
  goToChapter: (index: number) => Promise<void>;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({
  children,
  onError,
  onChapterChange,
  ...engineOptions
}: ReaderProviderProps) {
  const engineRef = useRef<ReaderEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new ReaderEngine(engineOptions);
  }

  const engine = engineRef.current;
  const [state, setState] = useState<ReaderState>(() => engine.state);
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);

  useEffect(() => {
    engine.callbacks.onStateChange = (newState) => {
      setState(newState);
    };
    engine.callbacks.onError = onError;
    engine.callbacks.onChapterChange = onChapterChange;

    return () => {
      engine.callbacks.onStateChange = undefined;
      engine.callbacks.onError = undefined;
      engine.callbacks.onChapterChange = undefined;
    };
  }, [engine, onError, onChapterChange]);

  const loadBook = useCallback(async (bookId: string) => {
    const detail = await engine.loadBook(bookId);
    setBookDetail(detail);
    setChapters(engine.chapters);
    return detail;
  }, [engine]);

  const loadChapter = useCallback(async (index: number) => {
    await engine.loadChapter(index);
  }, [engine]);

  const nextPage = useCallback(() => {
    return engine.nextPage();
  }, [engine]);

  const prevPage = useCallback(() => {
    return engine.prevPage();
  }, [engine]);

  const goToChapter = useCallback(async (index: number) => {
    await engine.goToChapter(index);
  }, [engine]);

  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    engine.updateSettings(partial);
  }, [engine]);

  const value: ReaderContextValue = {
    engine,
    state,
    bookDetail,
    chapters,
    loadBook,
    loadChapter,
    nextPage,
    prevPage,
    goToChapter,
    updateSettings,
  };

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReaderContext(): ReaderContextValue {
  const ctx = useContext(ReaderContext);
  if (!ctx) {
    throw new Error('useReaderContext must be used within a ReaderProvider');
  }
  return ctx;
}
