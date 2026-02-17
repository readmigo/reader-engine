import type { BookmarkData, TextPosition } from './types';
import type { SelectionManager } from './selection-manager';

/**
 * Manages bookmark position data. Does NOT render bookmarks in the DOM;
 * visual presentation is handled by the Web layer.
 */
export class BookmarkManager {
  private bookmarks = new Map<string, BookmarkData>();

  constructor(private readonly selectionManager: SelectionManager) {}

  /** Add a bookmark. */
  addBookmark(data: BookmarkData): void {
    this.bookmarks.set(data.id, data);
  }

  /** Remove a bookmark by id. */
  removeBookmark(id: string): void {
    this.bookmarks.delete(id);
  }

  /** Get a single bookmark by id. */
  getBookmark(id: string): BookmarkData | undefined {
    return this.bookmarks.get(id);
  }

  /** Get all bookmarks for the current chapter. */
  getAllBookmarks(): BookmarkData[] {
    return Array.from(this.bookmarks.values());
  }

  /** Clear all bookmarks. */
  clearBookmarks(): void {
    this.bookmarks.clear();
  }

  /**
   * Create a bookmark at the current reading position.
   * Finds the first visible text node as the bookmark position.
   */
  createBookmarkAtCurrentPosition(
    id: string,
    chapterId: string,
    contentElement: HTMLDivElement,
    label?: string,
  ): BookmarkData | null {
    const position = this.findFirstVisibleTextPosition(chapterId, contentElement);
    if (!position) return null;

    const data: BookmarkData = { id, position, label };
    this.bookmarks.set(id, data);
    return data;
  }

  /** Batch restore bookmarks after a chapter load. */
  restoreBookmarks(bookmarks: BookmarkData[]): void {
    for (const b of bookmarks) {
      this.bookmarks.set(b.id, b);
    }
  }

  // --- Internal helpers ---

  /**
   * Find the first text node visible in the viewport and convert it to
   * a TextPosition. Used by createBookmarkAtCurrentPosition.
   */
  private findFirstVisibleTextPosition(
    chapterId: string,
    contentElement: HTMLDivElement,
  ): TextPosition | null {
    const walker = document.createTreeWalker(contentElement, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent && node.textContent.trim().length > 0) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();

        if (rect.top >= 0 && rect.top < window.innerHeight) {
          const pos = this.buildPositionForNode(node, chapterId, contentElement);
          if (pos) return pos;
        }
      }
      node = walker.nextNode();
    }
    return null;
  }

  /** Compute a TextPosition for a given DOM node relative to contentElement. */
  private buildPositionForNode(
    node: Node,
    chapterId: string,
    contentElement: HTMLDivElement,
  ): TextPosition | null {
    const path: number[] = [];
    let current: Node | null = node;

    while (current && current !== contentElement) {
      const parent: Node | null = current.parentNode;
      if (!parent) return null;

      let idx = 0;
      let child: Node | null = parent.firstChild;
      while (child && child !== current) {
        idx++;
        child = child.nextSibling;
      }
      path.unshift(idx);
      current = parent;
    }

    if (current !== contentElement) return null;
    return { chapterId, path, offset: 0 };
  }
}
