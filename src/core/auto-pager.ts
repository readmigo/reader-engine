export type AutoPagerState = 'stopped' | 'running' | 'paused';

/**
 * Timer-driven auto page turner with visibility-change awareness.
 */
export class AutoPager {
  private _state: AutoPagerState = 'stopped';
  private _interval = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

  private readonly handleVisibility = (): void => {
    if (document.hidden) {
      if (this._state === 'running') {
        this.clearTimer();
        this._state = 'paused';
      }
    } else {
      if (this._state === 'paused') {
        this.startTimer();
        this._state = 'running';
      }
    }
  };

  constructor(private readonly nextPage: () => boolean) {
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  get state(): AutoPagerState {
    return this._state;
  }

  get interval(): number {
    return this._interval;
  }

  start(interval: number): void {
    this.clearTimer();
    this._interval = interval;
    this.startTimer();
    this._state = 'running';
  }

  pause(): void {
    if (this._state !== 'running') return;
    this.clearTimer();
    this._state = 'paused';
  }

  resume(): void {
    if (this._state !== 'paused') return;
    this.startTimer();
    this._state = 'running';
  }

  stop(): void {
    this.clearTimer();
    this._state = 'stopped';
  }

  destroy(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  private startTimer(): void {
    this.timerId = setInterval(() => {
      const advanced = this.nextPage();
      if (!advanced) {
        // Reached the last page — stop automatically
        this.stop();
      }
    }, this._interval);
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
