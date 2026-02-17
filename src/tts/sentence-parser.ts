import type { Paragraph, Sentence } from './types';

/**
 * Extracts text from rendered DOM paragraphs and splits into sentences.
 * Uses Intl.Segmenter when available, with regex fallback for older browsers.
 */
export class SentenceParser {
  private supportsSegmenter: boolean;

  constructor() {
    this.supportsSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;
  }

  /**
   * Parse the content element to extract paragraphs and sentences.
   * Finds all elements with `data-global-paragraph-index` attributes.
   */
  parse(contentElement: HTMLElement, _chapterId: string): Paragraph[] {
    const paragraphEls = contentElement.querySelectorAll<HTMLElement>(
      '[data-global-paragraph-index]',
    );
    const paragraphs: Paragraph[] = [];
    let globalSentenceCounter = 0;

    paragraphEls.forEach((el) => {
      const indexAttr = el.getAttribute('data-global-paragraph-index');
      if (indexAttr == null) return;

      const paragraphIndex = parseInt(indexAttr, 10);
      if (Number.isNaN(paragraphIndex)) return;

      const text = this.extractText(el);
      if (!text.trim()) return;

      const sentenceTexts = this.splitSentences(text);
      const sentences: Sentence[] = sentenceTexts.map((sentenceText, i) => ({
        index: i,
        text: sentenceText,
        globalIndex: globalSentenceCounter++,
      }));

      paragraphs.push({
        index: paragraphIndex,
        text,
        sentences,
        element: el,
      });
    });

    return paragraphs;
  }

  /**
   * Extract plain text from an element using TreeWalker.
   */
  private extractText(element: HTMLElement): string {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];

    let node = walker.nextNode();
    while (node) {
      if (node.textContent) {
        parts.push(node.textContent);
      }
      node = walker.nextNode();
    }

    return parts.join('');
  }

  /**
   * Split text into sentences.
   * Uses Intl.Segmenter for accurate multi-language sentence splitting.
   * Falls back to regex for older browsers.
   */
  private splitSentences(text: string): string[] {
    if (this.supportsSegmenter) {
      return this.splitWithSegmenter(text);
    }
    return this.splitWithRegex(text);
  }

  private splitWithSegmenter(text: string): string[] {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    const segments = segmenter.segment(text);
    const sentences: string[] = [];

    for (const segment of segments) {
      const trimmed = segment.segment.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
    }

    return sentences;
  }

  private splitWithRegex(text: string): string[] {
    // Split on common sentence terminators (English + Chinese + Japanese)
    const parts = text.split(/(?<=[.!?。！？])\s*/);
    const sentences: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
    }

    // If no split occurred, return the full text as one sentence
    if (sentences.length === 0 && text.trim()) {
      sentences.push(text.trim());
    }

    return sentences;
  }
}
