import type { PageTransition } from '../types';

const SLIDE_EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
const FADE_EASING = 'ease-in-out';
const FALLBACK_BUFFER_MS = 50;

/**
 * Manages CSS transition lifecycle for paginated page turns.
 * Supports slide, fade, and none transition modes.
 */
export class PageAnimator {
  private transition: PageTransition = 'slide';
  private duration = 300;
  private animating = false;
  private pendingResolve: (() => void) | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly handleTransitionEnd = (): void => {
    this.finishAnimation();
  };

  constructor(private readonly contentElement: HTMLElement) {
    this.contentElement.addEventListener('transitionend', this.handleTransitionEnd);
  }

  updateSettings(transition: PageTransition, duration: number): void {
    this.transition = transition;
    this.duration = duration;
  }

  /** Animate to a target page with the configured transition. */
  animateToPage(page: number, pageWidth: number): Promise<void> {
    // Cancel any in-progress animation
    this.cancelPending();

    if (this.transition === 'none') {
      this.jumpToPage(page, pageWidth);
      return Promise.resolve();
    }

    if (this.transition === 'fade') {
      return this.fadeToPage(page, pageWidth);
    }

    // slide mode
    return new Promise<void>((resolve) => {
      this.animating = true;
      this.pendingResolve = resolve;
      this.applySlideTransition();
      this.setTranslateX(-page * pageWidth);
      this.startFallbackTimer();
    });
  }

  /** Jump to a page instantly with no animation. */
  jumpToPage(page: number, pageWidth: number): void {
    this.cancelPending();
    this.clearTransition();
    this.setTranslateX(-page * pageWidth);
  }

  /** Remove CSS transition (used during gesture drag). */
  disableTransition(): void {
    this.cancelPending();
    this.clearTransition();
  }

  /** Re-enable CSS transition after gesture drag ends. */
  enableTransition(): void {
    if (this.transition === 'slide') {
      this.applySlideTransition();
    }
  }

  /** Set an arbitrary translateX offset (used during gesture drag). */
  setOffset(offset: number): void {
    this.contentElement.style.transform = `translateX(${offset}px)`;
  }

  destroy(): void {
    this.cancelPending();
    this.contentElement.removeEventListener('transitionend', this.handleTransitionEnd);
  }

  private fadeToPage(page: number, pageWidth: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.animating = true;
      this.pendingResolve = resolve;

      const fadeDuration = this.duration / 2;

      // Phase 1: fade out
      this.contentElement.style.transition = `opacity ${fadeDuration}ms ${FADE_EASING}`;
      this.contentElement.style.opacity = '0';

      const onFadeOut = (): void => {
        this.contentElement.removeEventListener('transitionend', onFadeOut);

        // Phase 2: jump position (no transition)
        this.contentElement.style.transition = 'none';
        this.setTranslateX(-page * pageWidth);

        // Force reflow so the position change takes effect before fade-in
        void this.contentElement.offsetHeight;

        // Phase 3: fade in
        this.contentElement.style.transition = `opacity ${fadeDuration}ms ${FADE_EASING}`;
        this.contentElement.style.opacity = '1';

        const onFadeIn = (): void => {
          this.contentElement.removeEventListener('transitionend', onFadeIn);
          this.finishAnimation();
        };
        this.contentElement.addEventListener('transitionend', onFadeIn);
        this.startFallbackTimer();
      };

      this.contentElement.addEventListener('transitionend', onFadeOut);

      // Fallback in case transitionend doesn't fire for fade-out
      setTimeout(() => {
        // If still waiting for fade-out, force it
        if (this.animating && this.contentElement.style.opacity === '0') {
          onFadeOut();
        }
      }, fadeDuration + FALLBACK_BUFFER_MS);
    });
  }

  private applySlideTransition(): void {
    this.contentElement.style.transition = `transform ${this.duration}ms ${SLIDE_EASING}`;
  }

  private clearTransition(): void {
    this.contentElement.style.transition = 'none';
  }

  private setTranslateX(px: number): void {
    this.contentElement.style.transform = `translateX(${px}px)`;
  }

  private finishAnimation(): void {
    this.clearFallbackTimer();
    this.animating = false;
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.();
  }

  private cancelPending(): void {
    this.clearFallbackTimer();
    if (this.animating) {
      this.animating = false;
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve?.();
    }
  }

  private startFallbackTimer(): void {
    this.clearFallbackTimer();
    this.fallbackTimer = setTimeout(() => {
      if (this.animating) {
        this.finishAnimation();
      }
    }, this.duration + FALLBACK_BUFFER_MS);
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
