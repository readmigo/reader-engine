import type { HighlightColor, HighlightData, HighlightTapEvent } from './types';
import type { SelectionManager } from './selection-manager';

const HIGHLIGHT_CLASS = 're-highlight';
const HIGHLIGHT_ID_ATTR = 'data-highlight-id';
const HIGHLIGHT_COLOR_ATTR = 'data-highlight-color';

/** RGBA values for each highlight colour. */
const COLOR_VALUES: Record<HighlightColor, string> = {
  yellow: 'rgba(255, 235, 59, 0.35)',
  green: 'rgba(76, 175, 80, 0.35)',
  blue: 'rgba(66, 165, 245, 0.35)',
  pink: 'rgba(236, 64, 122, 0.35)',
  purple: 'rgba(171, 71, 188, 0.35)',
  orange: 'rgba(255, 152, 0, 0.35)',
};

/**
 * Manages highlight annotations in the DOM, wrapping text in <mark> elements.
 * Supports add, remove, update, and batch restore of highlights.
 */
export class HighlightManager {
  private highlights = new Map<string, HighlightData>();
  private handleClick: ((e: MouseEvent) => void) | null = null;

  onHighlightTap?: (event: HighlightTapEvent) => void;

  constructor(
    private readonly contentElement: HTMLDivElement,
    private readonly selectionManager: SelectionManager,
  ) {
    this.handleClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest?.(`mark.${HIGHLIGHT_CLASS}`);
      if (mark) {
        const id = mark.getAttribute(HIGHLIGHT_ID_ATTR);
        if (id) {
          this.onHighlightTap?.({ id, rect: mark.getBoundingClientRect() });
        }
      }
    };
    this.contentElement.addEventListener('click', this.handleClick);
  }

  /** Render a highlight in the DOM. Returns true on success. */
  addHighlight(data: HighlightData): boolean {
    const range = this.selectionManager.resolveRange(data.range);
    if (!range) return false;

    this.wrapRange(range, data.id, data.color);
    this.highlights.set(data.id, data);
    return true;
  }

  /** Remove a highlight from DOM and internal state. */
  removeHighlight(id: string): void {
    const marks = this.contentElement.querySelectorAll(
      `mark.${HIGHLIGHT_CLASS}[${HIGHLIGHT_ID_ATTR}="${id}"]`,
    );
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    });
    this.highlights.delete(id);
  }

  /** Update the colour of an existing highlight. */
  updateHighlightColor(id: string, color: HighlightColor): void {
    const marks = this.contentElement.querySelectorAll(
      `mark.${HIGHLIGHT_CLASS}[${HIGHLIGHT_ID_ATTR}="${id}"]`,
    );
    marks.forEach((mark) => {
      (mark as HTMLElement).style.backgroundColor = COLOR_VALUES[color];
      mark.setAttribute(HIGHLIGHT_COLOR_ATTR, color);
    });

    const data = this.highlights.get(id);
    if (data) {
      data.color = color;
    }
  }

  /** Create a highlight from the current browser selection. */
  highlightFromSelection(id: string, color: HighlightColor): HighlightData | null {
    const range = this.selectionManager.captureSelection();
    if (!range) return null;

    const data: HighlightData = { id, range, color };
    const ok = this.addHighlight(data);
    if (!ok) return null;

    document.getSelection()?.removeAllRanges();
    return data;
  }

  /** Batch restore highlights after a chapter load. */
  restoreHighlights(highlights: HighlightData[]): void {
    for (const h of highlights) {
      this.addHighlight(h);
    }
  }

  /** Clear all highlights from DOM and internal state. */
  clearHighlights(): void {
    const marks = this.contentElement.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    });
    this.highlights.clear();
  }

  /** Return all current highlight data. */
  getAllHighlights(): HighlightData[] {
    return Array.from(this.highlights.values());
  }

  /** Return a single highlight by id. */
  getHighlight(id: string): HighlightData | undefined {
    return this.highlights.get(id);
  }

  /** Remove the click listener. Call when no longer needed. */
  destroy(): void {
    if (this.handleClick) {
      this.contentElement.removeEventListener('click', this.handleClick);
      this.handleClick = null;
    }
  }

  // --- Internal helpers ---

  /**
   * Wrap a DOM Range in <mark> elements. Handles ranges spanning multiple
   * text nodes by splitting into per-text-node sub-ranges.
   */
  private wrapRange(range: Range, id: string, color: HighlightColor): void {
    const textNodes = this.getTextNodesInRange(range);
    if (textNodes.length === 0) return;

    for (const textNode of textNodes) {
      let startOffset = 0;
      let endOffset = textNode.length;

      if (textNode === range.startContainer) {
        startOffset = range.startOffset;
      }
      if (textNode === range.endContainer) {
        endOffset = range.endOffset;
      }

      if (startOffset >= endOffset) continue;

      const subRange = document.createRange();
      subRange.setStart(textNode, startOffset);
      subRange.setEnd(textNode, endOffset);

      const mark = document.createElement('mark');
      mark.className = HIGHLIGHT_CLASS;
      mark.setAttribute(HIGHLIGHT_ID_ATTR, id);
      mark.setAttribute(HIGHLIGHT_COLOR_ATTR, color);
      mark.style.backgroundColor = COLOR_VALUES[color];

      subRange.surroundContents(mark);
    }
  }

  /** Collect all text nodes that fall within a Range. */
  private getTextNodesInRange(range: Range): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(
      this.contentElement,
      NodeFilter.SHOW_TEXT,
    );

    let started = false;
    let node = walker.nextNode() as Text | null;

    while (node) {
      if (node === range.startContainer) started = true;
      if (started && node.nodeType === Node.TEXT_NODE && range.intersectsNode(node)) {
        nodes.push(node);
      }
      if (node === range.endContainer) break;
      node = walker.nextNode() as Text | null;
    }

    return nodes;
  }
}
