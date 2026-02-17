import { describe, it, expect, vi } from 'vitest';
import { ReaderEngine } from './engine';
import { DEFAULT_SETTINGS } from './types';

function mockFetch(): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
}

describe('ReaderEngine', () => {
  it('creates with default settings', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      fetch: mockFetch(),
    });

    expect(engine.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('creates with custom settings', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      settings: { fontSize: 24, theme: 'dark' },
      fetch: mockFetch(),
    });

    expect(engine.settings.fontSize).toBe(24);
    expect(engine.settings.theme).toBe('dark');
    expect(engine.settings.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
  });

  it('updateSettings merges correctly', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      fetch: mockFetch(),
    });

    engine.updateSettings({ fontSize: 20, lineHeight: 1.8 });

    expect(engine.settings.fontSize).toBe(20);
    expect(engine.settings.lineHeight).toBe(1.8);
    expect(engine.settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(engine.settings.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });

  it('initial state has sensible defaults', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      fetch: mockFetch(),
    });

    const state = engine.state;

    expect(state.bookId).toBeNull();
    expect(state.chapterIndex).toBe(0);
    expect(state.currentPage).toBe(0);
    expect(state.loading).toBe(false);
    expect(state.isFirstPage).toBe(true);
    expect(state.isFirstChapter).toBe(true);
  });

  it('fires onStateChange when settings update', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      fetch: mockFetch(),
    });
    const onChange = vi.fn();
    engine.callbacks.onStateChange = onChange;

    engine.updateSettings({ fontSize: 22 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ loading: false }));
  });

  it('bookDetail is null before loadBook', () => {
    const engine = new ReaderEngine({
      apiBaseUrl: 'https://api.example.com',
      fetch: mockFetch(),
    });

    expect(engine.bookDetail).toBeNull();
    expect(engine.chapters).toEqual([]);
  });
});
