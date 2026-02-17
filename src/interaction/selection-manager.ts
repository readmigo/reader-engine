import type { TextPosition, TextRange } from './types';

/**
 * Manages browser text selection and converts between browser Selection/Range
 * objects and the engine's serialisable TextPosition/TextRange types.
 */
export class SelectionManager {
  private chapterId = '';

  constructor(private readonly contentElement: HTMLDivElement) {}

  setChapterId(id: string): void {
    this.chapterId = id;
  }

  /** Capture the current browser Selection as a TextRange, or null if empty. */
  captureSelection(): TextRange | null {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!range || !this.contentElement.contains(range.commonAncestorContainer)) {
      return null;
    }

    const start = this.nodeToPosition(range.startContainer, range.startOffset);
    const end = this.nodeToPosition(range.endContainer, range.endOffset);
    if (!start || !end) return null;

    return {
      chapterId: this.chapterId,
      start: { path: start.path, offset: start.offset },
      end: { path: end.path, offset: end.offset },
      text: range.toString(),
    };
  }

  /** Resolve a TextPosition back to a live DOM node + offset. */
  resolvePosition(pos: TextPosition): { node: Node; offset: number } | null {
    let node: Node = this.contentElement;
    for (const idx of pos.path) {
      const child = node.childNodes[idx];
      if (!child) return null;
      node = child;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).length;
      return { node, offset: Math.min(pos.offset, len) };
    }
    return { node, offset: pos.offset };
  }

  /** Resolve a TextRange back to a live browser Range object. */
  resolveRange(range: TextRange): Range | null {
    const startPos: TextPosition = {
      chapterId: range.chapterId,
      path: range.start.path,
      offset: range.start.offset,
    };
    const endPos: TextPosition = {
      chapterId: range.chapterId,
      path: range.end.path,
      offset: range.end.offset,
    };
    const start = this.resolvePosition(startPos);
    const end = this.resolvePosition(endPos);
    if (!start || !end) return null;

    const domRange = document.createRange();
    try {
      domRange.setStart(start.node, start.offset);
      domRange.setEnd(end.node, end.offset);
    } catch {
      return null;
    }
    return domRange;
  }

  /** Serialise a TextPosition to a string: `chapterId|path.join('.')|offset` */
  serializePosition(pos: TextPosition): string {
    return `${pos.chapterId}|${pos.path.join('.')}|${pos.offset}`;
  }

  /** Deserialise a TextPosition from its string representation. */
  deserializePosition(serialized: string): TextPosition {
    const [chapterId, pathStr, offsetStr] = serialized.split('|') as [string, string, string];
    return {
      chapterId,
      path: pathStr ? pathStr.split('.').map(Number) : [],
      offset: Number(offsetStr),
    };
  }

  /** Serialise a TextRange to a string. */
  serializeRange(range: TextRange): string {
    return `${range.chapterId}|${range.start.path.join('.')},${range.start.offset}|${range.end.path.join('.')},${range.end.offset}`;
  }

  /** Deserialise a TextRange from its string representation. */
  deserializeRange(serialized: string): TextRange {
    const [chapterId, startStr, endStr] = serialized.split('|') as [string, string, string];

    const [startPath, startOffset] = startStr.split(',') as [string, string];
    const [endPath, endOffset] = endStr.split(',') as [string, string];

    return {
      chapterId,
      start: {
        path: startPath ? startPath.split('.').map(Number) : [],
        offset: Number(startOffset),
      },
      end: {
        path: endPath ? endPath.split('.').map(Number) : [],
        offset: Number(endOffset),
      },
      text: '',
    };
  }

  // --- Internal helpers ---

  /** Compute the DOM child-index path from contentElement to the given node. */
  private nodeToPosition(node: Node, offset: number): { path: number[]; offset: number } | null {
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
    return { path, offset };
  }
}
