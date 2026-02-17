import type { BookDetail, ChapterSummary, ReaderSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { ApiClient } from './api/client';
import { ContentLoader } from './api/content-loader';
import { ChapterRenderer } from './renderer/chapter-renderer';
import { Paginator } from './core/paginator';
import { ScrollMode } from './core/scroll-mode';
import { ChapterManager } from './navigation/chapter-manager';
import { calculateOverallProgress } from './navigation/progress';

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

  mount(container: HTMLElement): void {
    this.container = container;
    this.renderer = new ChapterRenderer(container, this._settings);
  }

  unmount(): void {
    this.destroyModes();
    this.renderer?.clear();
    this.renderer = null;
    this.container = null;
  }

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

      this.callbacks.onChapterChange?.(chapter, index);
      this.emitStateChange();
    } catch (err) {
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      this.setLoading(false);
    }
  }

  nextPage(): boolean {
    if (this._settings.readingMode === 'paginated' && this.paginator) {
      if (!this.paginator.isLastPage) {
        this.paginator.nextPage();
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
        this.emitStateChange();
        return true;
      }
      if (this.chapterManager?.hasPrev) {
        const prevIndex = this.chapterManager.currentIndex - 1;
        this.loadChapter(prevIndex).then(() => {
          this.paginator?.goToEnd();
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

  updateSettings(partial: Partial<ReaderSettings>): void {
    const prevMode = this._settings.readingMode;
    this._settings = { ...this._settings, ...partial };

    if (this.renderer) {
      this.renderer.updateSettings(this._settings);

      if (prevMode !== this._settings.readingMode) {
        this.destroyModes();
        this.setupMode();
      } else if (this.paginator) {
        this.paginator.recalculate();
      }
    }

    this.emitStateChange();
  }

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
    } else {
      this.scrollMode = new ScrollMode(viewport);
      this.scrollMode.onScrollChange = () => this.emitStateChange();
    }
  }

  private destroyModes(): void {
    this.paginator = null;
    this.scrollMode?.destroy();
    this.scrollMode = null;
  }

  private setLoading(loading: boolean): void {
    this._loading = loading;
    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.callbacks.onStateChange?.(this.state);
  }
}
