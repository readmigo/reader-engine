/** State snapshot returned by the scroll mode after each scroll event. */
export interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  progress: number;
}

/**
 * Manages scroll-based reading mode, tracking scroll progress
 * and providing smooth scroll-to-progress navigation.
 */
export class ScrollMode {
  onScrollChange?: (state: ScrollState) => void;

  private readonly handleScroll = (): void => {
    this.onScrollChange?.(this.getState());
  };

  constructor(private readonly container: HTMLElement) {
    this.container.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  get progress(): number {
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    const maxScroll = scrollHeight - clientHeight;
    return maxScroll <= 0 ? 1 : scrollTop / maxScroll;
  }

  /** Smooth-scroll to a given progress value (0-1). */
  scrollTo(progress: number): void {
    const { scrollHeight, clientHeight } = this.container;
    const maxScroll = scrollHeight - clientHeight;
    this.container.scrollTo({
      top: progress * maxScroll,
      behavior: 'smooth',
    });
  }

  getState(): ScrollState {
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    return { scrollTop, scrollHeight, clientHeight, progress: this.progress };
  }

  /** Remove the scroll listener. Call when the mode is no longer needed. */
  destroy(): void {
    this.container.removeEventListener('scroll', this.handleScroll);
  }
}
