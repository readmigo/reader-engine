import type { ReadingMode } from '../types';

export interface ReadingPosition {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  pageIndex: number;
  scrollProgress: number;
  readingMode: ReadingMode;
  timestamp: number;
  version: number;
}

export interface PositionState {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  currentPage: number;
  totalPages: number;
  scrollProgress: number;
  readingMode: ReadingMode;
}

export interface PositionRestoreCallbacks {
  loadChapter: (index: number) => Promise<void>;
  goToPage: (page: number) => void;
  scrollTo: (progress: number) => void;
  getTotalPages: () => number;
}

const CURRENT_VERSION = 1;

/**
 * Serializes and restores reading positions.
 * Handles mode-switching conversions between paginated and scroll positions.
 */
export class PositionManager {
  /** Serialize the current engine state into a ReadingPosition. */
  savePosition(state: PositionState): ReadingPosition {
    return {
      bookId: state.bookId,
      chapterId: state.chapterId,
      chapterIndex: state.chapterIndex,
      pageIndex: state.currentPage,
      scrollProgress: state.scrollProgress,
      readingMode: state.readingMode,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };
  }

  /** Restore a previously saved position, handling mode conversions. */
  async restorePosition(
    position: ReadingPosition,
    currentMode: ReadingMode,
    callbacks: PositionRestoreCallbacks,
  ): Promise<void> {
    await callbacks.loadChapter(position.chapterIndex);

    if (currentMode === 'paginated') {
      if (position.readingMode === 'paginated') {
        callbacks.goToPage(position.pageIndex);
      } else {
        // Saved in scroll mode, restoring in paginated mode
        const totalPages = callbacks.getTotalPages();
        const estimatedPage = Math.round(position.scrollProgress * (totalPages - 1));
        callbacks.goToPage(estimatedPage);
      }
    } else {
      if (position.readingMode === 'scroll') {
        callbacks.scrollTo(position.scrollProgress);
      } else {
        // Saved in paginated mode, restoring in scroll mode
        const totalPages = callbacks.getTotalPages();
        const estimatedProgress = totalPages > 1 ? position.pageIndex / (totalPages - 1) : 0;
        callbacks.scrollTo(estimatedProgress);
      }
    }
  }
}
