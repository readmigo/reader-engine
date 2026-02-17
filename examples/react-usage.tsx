import React, { useState, useEffect, useCallback } from 'react';
import {
  ApiClient,
  ContentLoader,
  ChapterRenderer,
  Paginator,
  ChapterManager,
  calculateOverallProgress,
  DEFAULT_SETTINGS,
  THEMES,
  type ReaderSettings,
  type BookDetail,
  type ThemeName,
  type PageState,
} from '@readmigo/reader-engine';

function ReaderApp({ bookId }: { bookId: string }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterManager | null>(null);
  const [pageState, setPageState] = useState<PageState | null>(null);
  const [progress, setProgress] = useState(0);

  const rendererRef = React.useRef<ChapterRenderer | null>(null);
  const paginatorRef = React.useRef<Paginator | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const client = React.useMemo(() => new ApiClient({ baseUrl: 'https://api.readmigo.com' }), []);
  const loader = React.useMemo(() => new ContentLoader(client), [client]);

  // Load book on mount
  useEffect(() => {
    client.getBookDetail(bookId).then((detail) => {
      setBook(detail);
      setChapters(new ChapterManager(detail.chapters));
    });
  }, [bookId, client]);

  // Load and render chapter
  const loadChapter = useCallback(
    async (chapterId: string) => {
      if (!book || !containerRef.current) return;

      const loaded = await loader.loadChapter(book.id, chapterId);

      if (!rendererRef.current) {
        rendererRef.current = new ChapterRenderer(containerRef.current, settings);
      }
      rendererRef.current.render(loaded.html);

      const paginator = new Paginator(
        rendererRef.current.viewportElement!,
        rendererRef.current.contentElement!,
        { margin: settings.margin, gap: settings.margin * 2 },
      );

      paginator.onPageChange = (state) => {
        setPageState(state);
        if (chapters) {
          setProgress(
            calculateOverallProgress(
              chapters.currentIndex,
              state.currentPage,
              state.totalPages,
              chapters.totalChapters,
            ),
          );
        }
      };

      paginatorRef.current = paginator;
      setPageState(paginator.getState());
    },
    [book, chapters, loader, settings],
  );

  // Load first chapter when book is ready
  useEffect(() => {
    if (chapters) {
      loadChapter(chapters.currentChapter.id);
    }
  }, [chapters, loadChapter]);

  const handleThemeChange = (theme: ThemeName) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    rendererRef.current?.updateSettings(newSettings);
    paginatorRef.current?.recalculate();
  };

  const handleNextPage = async () => {
    if (!paginatorRef.current?.nextPage() && chapters?.goToNext()) {
      await loadChapter(chapters.currentChapter.id);
    }
  };

  const handlePrevPage = async () => {
    if (!paginatorRef.current?.prevPage() && chapters?.goToPrev()) {
      await loadChapter(chapters.currentChapter.id);
      paginatorRef.current?.goToEnd();
    }
  };

  if (!book) return <div>Loading...</div>;

  const theme = THEMES[settings.theme];

  return (
    <div style={{ background: theme.background, color: theme.text, height: '100vh' }}>
      {/* Theme switcher */}
      <div style={{ padding: 8, display: 'flex', gap: 8 }}>
        {(['light', 'sepia', 'dark', 'ultraDark'] as ThemeName[]).map((t) => (
          <button key={t} onClick={() => handleThemeChange(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Reader viewport */}
      <div ref={containerRef} style={{ flex: 1, height: 'calc(100vh - 100px)' }} />

      {/* Navigation controls */}
      <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', color: theme.secondaryText }}>
        <button onClick={handlePrevPage}>Previous</button>
        <span>
          {pageState && `Page ${pageState.currentPage + 1}/${pageState.totalPages}`}
          {` | ${(progress * 100).toFixed(1)}%`}
        </span>
        <button onClick={handleNextPage}>Next</button>
      </div>
    </div>
  );
}

export default ReaderApp;
