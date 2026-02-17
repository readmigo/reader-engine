import { describe, it, expect } from 'vitest';
import { generateReaderCSS } from '../style-injector';
import { DEFAULT_SETTINGS, THEMES } from '../../types';
import type { ReaderSettings } from '../../types';

describe('generateReaderCSS', () => {
  it('generates CSS with default settings', () => {
    const css = generateReaderCSS(DEFAULT_SETTINGS);

    expect(css).toContain('font-size: 18px');
    expect(css).toContain('Georgia');
    expect(css).toContain('line-height: 1.6');
    expect(css).toContain('text-align: justify');
    expect(css).toContain(`background-color: ${THEMES.light.background}`);
    expect(css).toContain(`color: ${THEMES.light.text}`);
  });

  it('applies dark theme colors', () => {
    const settings: ReaderSettings = { ...DEFAULT_SETTINGS, theme: 'dark' };
    const css = generateReaderCSS(settings);

    expect(css).toContain(`background-color: ${THEMES.dark.background}`);
    expect(css).toContain(`color: ${THEMES.dark.text}`);
  });

  it('includes column layout for paginated mode', () => {
    const settings: ReaderSettings = { ...DEFAULT_SETTINGS, readingMode: 'paginated' };
    const css = generateReaderCSS(settings);

    expect(css).toContain('column-width');
    expect(css).toContain('column-fill');
    expect(css).toContain('overflow');
  });

  it('does not include column layout for scroll mode', () => {
    const settings: ReaderSettings = { ...DEFAULT_SETTINGS, readingMode: 'scroll' };
    const css = generateReaderCSS(settings);

    expect(css).not.toContain('column-width');
  });

  it('sets hyphens to auto when hyphenation is true', () => {
    const settings: ReaderSettings = { ...DEFAULT_SETTINGS, hyphenation: true };
    const css = generateReaderCSS(settings);

    expect(css).toContain('hyphens: auto');
  });

  it('sets hyphens to none when hyphenation is false', () => {
    const settings: ReaderSettings = { ...DEFAULT_SETTINGS, hyphenation: false };
    const css = generateReaderCSS(settings);

    expect(css).toContain('hyphens: none');
  });
});
