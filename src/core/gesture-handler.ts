export interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number) => void;
  onDragEnd?: () => void;
  onBoundaryReached?: (direction: 'left' | 'right') => void;
}

const DRAG_THRESHOLD = 10;
const FLIP_RATIO = 0.3;
const VELOCITY_THRESHOLD = 0.3; // px/ms
const DAMPING_FACTOR = 0.3;

/**
 * Handles touch events on a container element to detect horizontal
 * swipe gestures for page navigation.
 */
export class GestureHandler {
  private tracking = false;
  private directionLocked = false;
  private isHorizontal = false;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastDeltaX = 0;

  private _isFirstPage = false;
  private _isLastPage = false;

  callbacks: GestureCallbacks = {};

  private readonly handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0]!;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.tracking = true;
    this.directionLocked = false;
    this.isHorizontal = false;
    this.lastDeltaX = 0;
  };

  private readonly handleTouchMove = (e: TouchEvent): void => {
    if (!this.tracking) return;

    const touch = e.touches[0]!;
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    // Lock direction on first significant move
    if (!this.directionLocked) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) {
        return;
      }
      this.directionLocked = true;
      this.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (!this.isHorizontal) {
        this.tracking = false;
        return;
      }

      this.callbacks.onDragStart?.();
    }

    e.preventDefault();

    // Apply boundary damping
    let adjustedDelta = deltaX;
    if ((this._isFirstPage && deltaX > 0) || (this._isLastPage && deltaX < 0)) {
      adjustedDelta = deltaX * DAMPING_FACTOR;
    }

    this.lastDeltaX = deltaX;
    this.callbacks.onDragMove?.(adjustedDelta);
  };

  private readonly handleTouchEnd = (): void => {
    if (!this.tracking || !this.isHorizontal) {
      this.tracking = false;
      return;
    }

    this.tracking = false;
    this.callbacks.onDragEnd?.();

    const elapsed = Date.now() - this.startTime;
    const absDelta = Math.abs(this.lastDeltaX);
    const velocity = elapsed > 0 ? absDelta / elapsed : 0;
    const containerWidth = this.container.clientWidth;

    const shouldFlip =
      absDelta > containerWidth * FLIP_RATIO || velocity > VELOCITY_THRESHOLD;

    if (!shouldFlip) return;

    if (this.lastDeltaX > 0) {
      // Swiped right -> previous page
      if (this._isFirstPage) {
        this.callbacks.onBoundaryReached?.('right');
      } else {
        this.callbacks.onSwipeRight?.();
      }
    } else {
      // Swiped left -> next page
      if (this._isLastPage) {
        this.callbacks.onBoundaryReached?.('left');
      } else {
        this.callbacks.onSwipeLeft?.();
      }
    }
  };

  constructor(private readonly container: HTMLElement) {
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  /** Update boundary state so the handler knows when to apply damping. */
  updateBoundary(isFirstPage: boolean, isLastPage: boolean): void {
    this._isFirstPage = isFirstPage;
    this._isLastPage = isLastPage;
  }

  destroy(): void {
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
  }
}
