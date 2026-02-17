import type { BookDetail, ChapterSummary, ReaderSettings } from './types';
import type { ReadingPosition, PositionState } from './core/position-manager';
import type { SelectionChangeEvent, HighlightTapEvent, HighlightColor, HighlightData, BookmarkData, SearchMatch, SearchOptions } from './interaction';
import type { TTSState, TTSSettings, SpeechSynthesisAdapter } from './tts';
import type { AutoPagerState } from './core/auto-pager';
import { DEFAULT_SETTINGS } from './types';
import { ApiClient } from './api/client';
import { ContentLoader } from './api/content-loader';
import { ChapterRenderer } from './renderer/chapter-renderer';
import { Paginator } from './core/paginator';
import { ScrollMode } from './core/scroll-mode';
import { ChapterManager } from './navigation/chapter-manager';
import { calculateOverallProgress } from './navigation/progress';
import { PageAnimator } from './core/page-animator';
import { GestureHandler } from './core/gesture-handler';
import { PositionManager } from './core/position-manager';
import { AutoPager } from './core/auto-pager';
import { SelectionManager } from './interaction/selection-manager';
import { HighlightManager } from './interaction/highlight-manager';
import { BookmarkManager } from './interaction/bookmark-manager';
import { SearchManager } from './interaction/search-manager';
import { TTSController } from './tts/tts-controller';

export interface ReaderEngineOptions {
  apiBaseUrl: string;
  apiHeaders?: Record<string, string>;
  settings?: Partial<ReaderSettings>;
  fetch?: typeof globalThis.fetch;
}

export interface ReaderState {
  bookId: string | null;
  chapterIndex: number;
  currentPage: number;
  totalPages: number;
  chapterProgress: number;
  overallProgress: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  loading: boolean;
}

export interface ReaderCallbacks {
  onStateChange?: (state: ReaderState) => void;
  onChapterChange?: (chapter: ChapterSummary, index: number) => void;
  onError?: (error: Error) => void;
  onSelectionChange?: (event: SelectionChangeEvent) => void;
  onHighlightTap?: (event: HighlightTapEvent) => void;
  onTTSStateChange?: (state: TTSState) => void;
  onAutoPageTurn?: () => void;
}

export class ReaderEngine {
  private _settings: ReaderSettings;
  private client: ApiClient;
  private loader: ContentLoader;
  private renderer: ChapterRenderer | null = null;
  private paginator: Paginator | null = null;
  private scrollMode: ScrollMode | null = null;
  private chapterManager: ChapterManager | null = null;
  private _bookDetail: BookDetail | null = null;
  private _loading = false;
  private container: HTMLElement | null = null;

  // New modules
  private pageAnimator: PageAnimator | null = null;
  private gestureHandler: GestureHandler | null = null;
  private positionManager = new PositionManager();
  private autoPager: AutoPager | null = null;
  private _selection: SelectionManager | null = null;
  private _highlights: HighlightManager | null = null;
  private _bookmarks: BookmarkManager | null = null;
  private _search: SearchManager | null = null;
  private _tts: TTSController | null = null;
  private selectionListener: (() => void) | null = null;

  readonly callbacks: ReaderCallbacks = {};

  constructor(options: ReaderEngineOptions) {
    this._settings = { ...DEFAULT_SETTINGS, ...options.settings };
    this.client = new ApiClient({
      baseUrl: options.apiBaseUrl,
      headers: options.apiHeaders,
      fetch: options.fetch,
    });
    this.loader = new ContentLoader(this.client);
  }

  // ── Getters ────────────────────────────────────────────

  get settings(): ReaderSettings {
    return { ...this._settings };
  }

  get bookDetail(): BookDetail | null {
    return this._bookDetail;
  }

  get chapters(): ChapterSummary[] {
    return this.chapterManager?.getChapters() ?? [];
  }

  get currentChapterIndex(): number {
    return this.chapterManager?.currentIndex ?? 0;
  }

  get state(): ReaderState {
    const pageState = this.paginator?.getState();
    const chapterIndex = this.chapterManager?.currentIndex ?? 0;
    const totalChapters = this.chapterManager?.totalChapters ?? 1;
    const currentPage = pageState?.currentPage ?? 0;
    const totalPages = pageState?.totalPages ?? 1;

    const chapterProgress = totalPages > 1 ? currentPage / (totalPages - 1) : 1;
    const overallProgress = calculateOverallProgress(
      chapterIndex,
      currentPage,
      totalPages,
      totalChapters,
    );

    return {
      bookId: this._bookDetail?.id ?? null,
      chapterIndex,
      currentPage,
      totalPages,
      chapterProgress,
      overallProgress,
      isFirstPage: pageState?.isFirstPage ?? true,
      isLastPage: pageState?.isLastPage ?? true,
      isFirstChapter: !(this.chapterManager?.hasPrev ?? false),
      isLastChapter: !(this.chapterManager?.hasNext ?? false),
      loading: this._loading,
    };
  }

  /** Lazy-initialized TTS controller. Created on first access. */
  get tts(): TTSController {
    if (!this._tts) {
      this._tts = new TTSController({
        onStateChange: (s) => this.callbacks.onTTSStateChange?.(s),
      });
    }
    return this._tts;
  }

  /** SelectionManager (available after mount). */
  get selection(): SelectionManager | null {
    return this._selection;
  }

  /** HighlightManager (available after mount). */
  get highlights(): HighlightManager | null {
    return this._highlights;
  }

  /** BookmarkManager (available after mount). */
  get bookmarks(): BookmarkManager | null {
    return this._bookmarks;
  }

  /** SearchManager (available after mount). */
  get search(): SearchManager | null {
    return this._search;
  }

  /** Current AutoPager state. */
  get autoPageState(): AutoPagerState {
    return this.autoPager?.state ?? 'stopped';
  }

  // ── Lifecycle ──────────────────────────────────────────

  mount(container: HTMLElement): void {
    this.container = container;
    this.renderer = new ChapterRenderer(container, this._settings);
  }

  unmount(): void {
    this.destroyInteraction();
    this.destroyGesture();
    this.destroyAutoPage();
    this.destroyModes();
    this.renderer?.clear();
    this.renderer = null;
    this.container = null;
  }

  destroy(): void {
    this.unmount();
    this._tts?.stop();
    this._tts = null;
    this.chapterManager = null;
    this._bookDetail = null;
  }

  // ── Book / Chapter ─────────────────────────────────────

  async loadBook(bookId: string): Promise<BookDetail> {
    this.setLoading(true);
    try {
      const detail = await this.client.getBookDetail(bookId);
      this._bookDetail = detail;
      this.chapterManager = new ChapterManager(detail.chapters);
      return detail;
    } catch (err) {
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      this.setLoading(false);
    }
  }

  async loadChapter(index: number): Promise<void> {
    if (!this.chapterManager || !this._bookDetail || !this.renderer) {
      throw new Error('Book not loaded or engine not mounted');
    }

    if (!this.chapterManager.goTo(index)) {
      throw new Error(`Invalid chapter index: ${index}`);
    }

    this.setLoading(true);
    try {
      const chapter = this.chapterManager.currentChapter;
      const loaded = await this.loader.loadChapter(this._bookDetail.id, chapter.id);

      this.renderer.render(loaded.html);
      this.destroyModes();
      this.setupMode();
      this.setupInteraction(chapter.id);
      this.setupGesture();

      // Notify TTS about new chapter content
      const contentEl = this.renderer.contentElement;
      if (this._tts && contentEl) {
        this._tts.setContentElement(contentEl, chapter.id);
      }

      this.callbacks.onChapterChange?.(chapter, index);
      this.emitStateChange();
    } catch (err) {
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      this.setLoading(false);
    }
  }

  // ── Page Navigation ────────────────────────────────────

  nextPage(): boolean {
    if (this._settings.readingMode === 'paginated' && this.paginator) {
      if (!this.paginator.isLastPage) {
        this.paginator.nextPage();
        this.updateGestureBoundary();
        this.emitStateChange();
        return true;
      }
      if (this.chapterManager?.hasNext) {
        const nextIndex = this.chapterManager.currentIndex + 1;
        this.loadChapter(nextIndex);
        return true;
      }
    }
    return false;
  }

  prevPage(): boolean {
    if (this._settings.readingMode === 'paginated' && this.paginator) {
      if (!this.paginator.isFirstPage) {
        this.paginator.prevPage();
        this.updateGestureBoundary();
        this.emitStateChange();
        return true;
      }
      if (this.chapterManager?.hasPrev) {
        const prevIndex = this.chapterManager.currentIndex - 1;
        this.loadChapter(prevIndex).then(() => {
          this.paginator?.goToEnd();
          this.updateGestureBoundary();
          this.emitStateChange();
        });
        return true;
      }
    }
    return false;
  }

  async goToChapter(index: number): Promise<void> {
    return this.loadChapter(index);
  }

  async goToChapterId(chapterId: string): Promise<void> {
    if (!this.chapterManager) {
      throw new Error('Book not loaded');
    }
    const chapters = this.chapterManager.getChapters();
    const index = chapters.findIndex((ch) => ch.id === chapterId);
    if (index === -1) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return this.loadChapter(index);
  }

  // ── Position ───────────────────────────────────────────

  savePosition(): ReadingPosition | null {
    if (!this._bookDetail || !this.chapterManager) return null;

    const chapter = this.chapterManager.currentChapter;
    const posState: PositionState = {
      bookId: this._bookDetail.id,
      chapterId: chapter.id,
      chapterIndex: this.chapterManager.currentIndex,
      currentPage: this.paginator?.currentPage ?? 0,
      totalPages: this.paginator?.totalPages ?? 1,
      scrollProgress: this.scrollMode?.progress ?? 0,
      readingMode: this._settings.readingMode,
    };

    return this.positionManager.savePosition(posState);
  }

  async restorePosition(pos: ReadingPosition): Promise<void> {
    await this.positionManager.restorePosition(pos, this._settings.readingMode, {
      loadChapter: (idx) => this.loadChapter(idx),
      goToPage: (page) => this.paginator?.goToPage(page),
      scrollTo: (progress) => this.scrollMode?.scrollTo(progress),
      getTotalPages: () => this.paginator?.totalPages ?? 1,
    });
    this.emitStateChange();
  }

  // ── Auto Page ──────────────────────────────────────────

  startAutoPage(interval?: number): void {
    const ms = interval ?? this._settings.autoPageInterval ?? 5000;
    if (!this.autoPager) {
      this.autoPager = new AutoPager(() => {
        const result = this.nextPage();
        this.callbacks.onAutoPageTurn?.();
        return result;
      });
    }
    this.autoPager.start(ms);
  }

  pauseAutoPage(): void {
    this.autoPager?.pause();
  }

  resumeAutoPage(): void {
    this.autoPager?.resume();
  }

  stopAutoPage(): void {
    this.autoPager?.stop();
  }

  // ── Settings ───────────────────────────────────────────

  updateSettings(partial: Partial<ReaderSettings>): void {
    const prevMode = this._settings.readingMode;
    this._settings = { ...this._settings, ...partial };

    if (this.renderer) {
      this.renderer.updateSettings(this._settings);

      if (prevMode !== this._settings.readingMode) {
        this.destroyModes();
        this.setupMode();
        this.setupGesture();
      } else if (this.paginator) {
        this.paginator.recalculate();
      }
    }

    // Update PageAnimator settings if active
    this.pageAnimator?.updateSettings(
      this._settings.pageTransition,
      this._settings.transitionDuration,
    );

    this.emitStateChange();
  }

  // ── Private: Mode setup ────────────────────────────────

  private setupMode(): void {
    if (!this.renderer) return;

    const viewport = this.renderer.viewportElement;
    const content = this.renderer.contentElement;
    if (!viewport || !content) return;

    if (this._settings.readingMode === 'paginated') {
      this.paginator = new Paginator(viewport, content, {
        margin: this._settings.margin,
        gap: this._settings.margin * 2,
      });
      this.paginator.onPageChange = () => this.emitStateChange();

      // Set up PageAnimator
      this.pageAnimator = new PageAnimator(content);
      this.pageAnimator.updateSettings(
        this._settings.pageTransition,
        this._settings.transitionDuration,
      );
    } else {
      this.scrollMode = new ScrollMode(viewport);
      this.scrollMode.onScrollChange = () => this.emitStateChange();
    }
  }

  private destroyModes(): void {
    this.paginator = null;
    this.pageAnimator?.destroy();
    this.pageAnimator = null;
    this.scrollMode?.destroy();
    this.scrollMode = null;
  }

  // ── Private: Interaction setup ─────────────────────────

  private setupInteraction(chapterId: string): void {
    this.destroyInteraction();

    const contentEl = this.renderer?.contentElement;
    if (!contentEl) return;

    this._selection = new SelectionManager(contentEl);
    this._selection.setChapterId(chapterId);

    this._highlights = new HighlightManager(contentEl, this._selection);
    this._highlights.onHighlightTap = (event) => this.callbacks.onHighlightTap?.(event);

    this._bookmarks = new BookmarkManager(this._selection);

    this._search = new SearchManager(contentEl, this._selection);
    this._search.setChapterId(chapterId);

    // Listen for selection changes
    this.selectionListener = () => {
      if (!this._selection) return;
      const range = this._selection.captureSelection();
      const sel = document.getSelection();
      let rect: DOMRect | null = null;
      if (sel && sel.rangeCount > 0) {
        rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) rect = null;
      }
      this.callbacks.onSelectionChange?.({ range, rect });
    };
    document.addEventListener('selectionchange', this.selectionListener);
  }

  private destroyInteraction(): void {
    if (this.selectionListener) {
      document.removeEventListener('selectionchange', this.selectionListener);
      this.selectionListener = null;
    }
    this._highlights?.destroy();
    this._highlights = null;
    this._selection = null;
    this._bookmarks = null;
    this._search = null;
  }

  // ── Private: Gesture setup ─────────────────────────────

  private setupGesture(): void {
    this.destroyGesture();

    if (this._settings.readingMode !== 'paginated' || !this._settings.swipeEnabled) return;

    const viewport = this.renderer?.viewportElement;
    if (!viewport) return;

    this.gestureHandler = new GestureHandler(viewport);
    this.gestureHandler.callbacks = {
      onSwipeLeft: () => this.nextPage(),
      onSwipeRight: () => this.prevPage(),
    };
    this.updateGestureBoundary();
  }

  private destroyGesture(): void {
    this.gestureHandler?.destroy();
    this.gestureHandler = null;
  }

  private updateGestureBoundary(): void {
    if (!this.gestureHandler || !this.paginator) return;
    this.gestureHandler.updateBoundary(
      this.paginator.isFirstPage,
      this.paginator.isLastPage,
    );
  }

  // ── Private: AutoPage cleanup ──────────────────────────

  private destroyAutoPage(): void {
    this.autoPager?.destroy();
    this.autoPager = null;
  }

  // ── Private: Helpers ───────────────────────────────────

  private setLoading(loading: boolean): void {
    this._loading = loading;
    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.callbacks.onStateChange?.(this.state);
  }
}
