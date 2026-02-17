import type { SearchMatch, SearchOptions, TextRange } from './types';
import type { SelectionManager } from './selection-manager';

const SEARCH_HIGHLIGHT_CLASS = 're-search-highlight';
const SEARCH_ACTIVE_CLASS = 're-search-highlight--active';
const SEARCH_INDEX_ATTR = 'data-search-index';

const DEFAULT_CONTEXT_LENGTH = 30;

/**
 * Searches within the current chapter's DOM content and manages
 * search-highlight rendering and match navigation.
 */
export class SearchManager {
  private matches: SearchMatch[] = [];
  private _currentMatchIndex = -1;
  private chapterId = '';

  constructor(
    private readonly contentElement: HTMLDivElement,
    private readonly selectionManager: SelectionManager,
  ) {}

  setChapterId(id: string): void {
    this.chapterId = id;
  }

  /** Search for a query string within the chapter's text content. */
  search(query: string, options?: SearchOptions): SearchMatch[] {
    this.clearSearchHighlights();
    this.matches = [];
    this._currentMatchIndex = -1;

    if (!query) return [];

    const caseSensitive = options?.caseSensitive ?? false;
    const wholeWord = options?.wholeWord ?? false;
    const contextLength = options?.contextLength ?? DEFAULT_CONTEXT_LENGTH;

    const fullText = this.contentElement.textContent ?? '';
    const textNodes = this.collectTextNodes();

    let escapedQuery = (caseSensitive ? query : query.toLowerCase())
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) {
      escapedQuery = `\\b${escapedQuery}\\b`;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escapedQuery, flags);

    let regexMatch: RegExpExecArray | null;
    let index = 0;

    while ((regexMatch = regex.exec(fullText)) !== null) {
      const matchStart = regexMatch.index;
      const matchEnd = matchStart + regexMatch[0].length;

      const startPos = this.offsetToNodePosition(textNodes, matchStart);
      const endPos = this.offsetToNodePosition(textNodes, matchEnd);
      if (!startPos || !endPos) continue;

      const before = fullText.slice(Math.max(0, matchStart - contextLength), matchStart);
      const after = fullText.slice(matchEnd, matchEnd + contextLength);

      const range: TextRange = {
        chapterId: this.chapterId,
        start: { path: startPos.path, offset: startPos.offset },
        end: { path: endPos.path, offset: endPos.offset },
        text: regexMatch[0],
      };

      this.matches.push({
        index,
        range,
        context: { before, after },
      });
      index++;
    }

    return this.matches;
  }

  /** Wrap all matches in DOM highlight elements. */
  highlightMatches(matches: SearchMatch[]): void {
    this.clearSearchHighlights();

    // Process matches in reverse order so DOM mutations don't invalidate later positions
    const sorted = [...matches].sort((a, b) => {
      const pathCmp = comparePaths(b.range.start.path, a.range.start.path);
      if (pathCmp !== 0) return pathCmp;
      return b.range.start.offset - a.range.start.offset;
    });

    for (const m of sorted) {
      const range = this.selectionManager.resolveRange(m.range);
      if (!range) continue;
      this.wrapSearchRange(range, m.index);
    }
  }

  /** Remove all search highlight elements from the DOM. */
  clearSearchHighlights(): void {
    const marks = this.contentElement.querySelectorAll(`mark.${SEARCH_HIGHLIGHT_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    });
    this.matches = [];
    this._currentMatchIndex = -1;
  }

  /** Navigate to a specific match by index. */
  goToMatch(index: number): void {
    if (index < 0 || index >= this.matches.length) return;

    // Remove active class from previous
    const prev = this.contentElement.querySelector(`mark.${SEARCH_ACTIVE_CLASS}`);
    prev?.classList.remove(SEARCH_ACTIVE_CLASS);

    this._currentMatchIndex = index;

    const mark = this.contentElement.querySelector(
      `mark.${SEARCH_HIGHLIGHT_CLASS}[${SEARCH_INDEX_ATTR}="${index}"]`,
    );
    if (mark) {
      mark.classList.add(SEARCH_ACTIVE_CLASS);
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /** Navigate to the next match. Returns the new index. */
  nextMatch(): number {
    if (this.matches.length === 0) return -1;
    const next = (this._currentMatchIndex + 1) % this.matches.length;
    this.goToMatch(next);
    return next;
  }

  /** Navigate to the previous match. Returns the new index. */
  prevMatch(): number {
    if (this.matches.length === 0) return -1;
    const prev =
      this._currentMatchIndex <= 0
        ? this.matches.length - 1
        : this._currentMatchIndex - 1;
    this.goToMatch(prev);
    return prev;
  }

  get currentMatchIndex(): number {
    return this._currentMatchIndex;
  }

  get totalMatches(): number {
    return this.matches.length;
  }

  // --- Internal helpers ---

  /** Collect all text nodes with their global character offsets. */
  private collectTextNodes(): { node: Text; start: number; end: number }[] {
    const result: { node: Text; start: number; end: number }[] = [];
    const walker = document.createTreeWalker(this.contentElement, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node = walker.nextNode() as Text | null;

    while (node) {
      const len = node.length;
      result.push({ node, start: offset, end: offset + len });
      offset += len;
      node = walker.nextNode() as Text | null;
    }

    return result;
  }

  /** Convert a global character offset to a node path + local offset. */
  private offsetToNodePosition(
    textNodes: { node: Text; start: number; end: number }[],
    globalOffset: number,
  ): { path: number[]; offset: number } | null {
    for (const entry of textNodes) {
      if (globalOffset >= entry.start && globalOffset <= entry.end) {
        const path = this.buildPathToNode(entry.node);
        if (!path) return null;
        return { path, offset: globalOffset - entry.start };
      }
    }
    return null;
  }

  /** Build the DOM child-index path from contentElement to a node. */
  private buildPathToNode(node: Node): number[] | null {
    const path: number[] = [];
    let current: Node | null = node;

    while (current && current !== this.contentElement) {
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

    if (current !== this.contentElement) return null;
    return path;
  }

  /** Wrap a single Range in a search highlight <mark>. */
  private wrapSearchRange(range: Range, index: number): void {
    const textNodes = this.getTextNodesInRange(range);

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
      mark.className = SEARCH_HIGHLIGHT_CLASS;
      mark.setAttribute(SEARCH_INDEX_ATTR, String(index));

      subRange.surroundContents(mark);
    }
  }

  /** Collect text nodes within a Range. */
  private getTextNodesInRange(range: Range): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(this.contentElement, NodeFilter.SHOW_TEXT);

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

/** Compare two number[] paths lexicographically. */
function comparePaths(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    if (ai !== bi) return ai - bi;
  }
  return a.length - b.length;
}
