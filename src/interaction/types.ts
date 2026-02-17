/** Single-point position within a chapter's DOM content. */
export interface TextPosition {
  chapterId: string;
  path: number[];
  offset: number;
}

/** A range spanning two positions within a chapter, with captured text. */
export interface TextRange {
  chapterId: string;
  start: { path: number[]; offset: number };
  end: { path: number[]; offset: number };
  text: string;
}

/** Supported highlight colours (aligned with iOS/Web palette). */
export type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'orange';

/** Full data for a single highlight annotation. */
export interface HighlightData {
  id: string;
  range: TextRange;
  color: HighlightColor;
  note?: string;
}

/** Full data for a single bookmark. */
export interface BookmarkData {
  id: string;
  position: TextPosition;
  label?: string;
}

/** A single search match within chapter content. */
export interface SearchMatch {
  index: number;
  range: TextRange;
  context: { before: string; after: string };
}

/** Options for chapter-level text search. */
export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  contextLength?: number;
}

/** Payload emitted when the user's text selection changes. */
export interface SelectionChangeEvent {
  range: TextRange | null;
  rect: DOMRect | null;
}

/** Payload emitted when the user taps an existing highlight. */
export interface HighlightTapEvent {
  id: string;
  rect: DOMRect;
}
