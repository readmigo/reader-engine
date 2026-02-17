import type { ChapterSummary } from '../types';

/**
 * Manages chapter navigation state for a book.
 * Maintains a sorted list of chapters and tracks the current position.
 */
export class ChapterManager {
  private readonly chapters: ChapterSummary[];
  private _currentIndex: number;

  constructor(chapters: ChapterSummary[]) {
    this.chapters = [...chapters].sort((a, b) => a.order - b.order);
    this._currentIndex = 0;
  }

  get totalChapters(): number {
    return this.chapters.length;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get currentChapter(): ChapterSummary {
    return this.chapters[this._currentIndex]!;
  }

  get hasNext(): boolean {
    return this._currentIndex < this.chapters.length - 1;
  }

  get hasPrev(): boolean {
    return this._currentIndex > 0;
  }

  getChapter(index: number): ChapterSummary | undefined {
    return this.chapters[index];
  }

  getChapters(): ChapterSummary[] {
    return this.chapters;
  }

  goTo(index: number): boolean {
    if (index < 0 || index >= this.chapters.length) {
      return false;
    }
    this._currentIndex = index;
    return true;
  }

  goToId(chapterId: string): boolean {
    const index = this.chapters.findIndex((ch) => ch.id === chapterId);
    if (index === -1) {
      return false;
    }
    this._currentIndex = index;
    return true;
  }

  goToNext(): boolean {
    if (!this.hasNext) {
      return false;
    }
    this._currentIndex++;
    return true;
  }

  goToPrev(): boolean {
    if (!this.hasPrev) {
      return false;
    }
    this._currentIndex--;
    return true;
  }
}
