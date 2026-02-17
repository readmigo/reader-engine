import type { Paragraph } from './types';

const ACTIVE_PARAGRAPH_CLASS = 'tts-active-paragraph';
const ACTIVE_SENTENCE_CLASS = 'tts-active-sentence';

/**
 * Manages DOM manipulation to visually highlight the current paragraph and sentence
 * during TTS playback.
 */
export class TTSHighlightManager {
  private activeParagraphEl: HTMLElement | null = null;

  /**
   * Highlight a specific sentence within a paragraph.
   * Clears any existing highlights first, then:
   * 1. Adds CSS class to the paragraph element
   * 2. Wraps the sentence text in a <span> within the paragraph's text nodes
   */
  highlightSentence(
    paragraphIndex: number,
    sentenceIndex: number,
    paragraphs: Paragraph[],
  ): void {
    this.clearHighlight();

    const paragraph = paragraphs.find((p) => p.index === paragraphIndex);
    if (!paragraph) return;

    const sentence = paragraph.sentences[sentenceIndex];
    if (!sentence) return;

    // Mark paragraph as active
    paragraph.element.classList.add(ACTIVE_PARAGRAPH_CLASS);
    this.activeParagraphEl = paragraph.element;

    // Wrap matching sentence text in a highlight span
    this.wrapSentenceText(paragraph.element, sentence.text);
  }

  /**
   * Highlight only the paragraph (no sentence-level highlight).
   */
  highlightParagraph(paragraphIndex: number, paragraphs: Paragraph[]): void {
    this.clearHighlight();

    const paragraph = paragraphs.find((p) => p.index === paragraphIndex);
    if (!paragraph) return;

    paragraph.element.classList.add(ACTIVE_PARAGRAPH_CLASS);
    this.activeParagraphEl = paragraph.element;
  }

  /**
   * Remove all TTS highlights from the DOM.
   */
  clearHighlight(): void {
    // Remove paragraph highlight
    if (this.activeParagraphEl) {
      this.activeParagraphEl.classList.remove(ACTIVE_PARAGRAPH_CLASS);
      this.activeParagraphEl = null;
    }

    // Unwrap all sentence highlight spans
    const spans = document.querySelectorAll(`.${ACTIVE_SENTENCE_CLASS}`);
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;

      // Replace span with its text content
      const textNode = document.createTextNode(span.textContent ?? '');
      parent.replaceChild(textNode, span);

      // Normalize to merge adjacent text nodes
      parent.normalize();
    });
  }

  /**
   * Find and wrap the sentence text within the paragraph's text nodes.
   * Uses TreeWalker to locate text nodes and builds a character-to-node offset map.
   */
  private wrapSentenceText(paragraphEl: HTMLElement, sentenceText: string): void {
    const textNodes = this.collectTextNodes(paragraphEl);
    if (textNodes.length === 0) return;

    // Build combined text and character-to-node mapping
    const nodeMap: { node: Text; start: number; end: number }[] = [];
    let combinedText = '';

    for (const node of textNodes) {
      const nodeText = node.textContent ?? '';
      nodeMap.push({
        node,
        start: combinedText.length,
        end: combinedText.length + nodeText.length,
      });
      combinedText += nodeText;
    }

    // Try exact match first
    let matchStart = combinedText.indexOf(sentenceText);

    // If no exact match, try normalized matching
    if (matchStart === -1) {
      const normalizedCombined = this.normalizeText(combinedText);
      const normalizedSentence = this.normalizeText(sentenceText);
      matchStart = normalizedCombined.indexOf(normalizedSentence);
    }

    if (matchStart === -1) return;

    const matchEnd = matchStart + sentenceText.length;

    // Find affected text nodes and wrap in reverse order to preserve offsets
    const wraps: { node: Text; rangeStart: number; rangeEnd: number }[] = [];

    for (const entry of nodeMap) {
      if (entry.end <= matchStart || entry.start >= matchEnd) continue;

      const rangeStart = Math.max(0, matchStart - entry.start);
      const rangeEnd = Math.min(entry.end - entry.start, matchEnd - entry.start);
      wraps.push({ node: entry.node, rangeStart, rangeEnd });
    }

    // Wrap in reverse order to keep DOM offsets valid
    for (let i = wraps.length - 1; i >= 0; i--) {
      const wrap = wraps[i];
      if (!wrap) continue;
      this.wrapTextRange(wrap.node, wrap.rangeStart, wrap.rangeEnd);
    }
  }

  /**
   * Collect all text nodes within an element using TreeWalker.
   */
  private collectTextNodes(element: HTMLElement): Text[] {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];

    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }

    return nodes;
  }

  /**
   * Wrap a range of text within a text node in a highlight span.
   */
  private wrapTextRange(textNode: Text, start: number, end: number): void {
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    const span = document.createElement('span');
    span.className = ACTIVE_SENTENCE_CLASS;

    range.surroundContents(span);
  }

  /**
   * Normalize text for fuzzy matching:
   * - Collapse whitespace
   * - Normalize Unicode quotes to ASCII
   */
  private normalizeText(text: string): string {
    return text
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
