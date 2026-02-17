import type { ReaderSettings } from '../types/settings';
import { THEMES } from '../types/settings';

export function getPreviewStyles(settings: ReaderSettings): Record<string, string> {
  const theme = THEMES[settings.theme];

  return {
    backgroundColor: theme.background,
    color: theme.text,
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    lineHeight: String(settings.lineHeight),
    letterSpacing: `${settings.letterSpacing}px`,
    wordSpacing: `${settings.wordSpacing}px`,
    textAlign: settings.textAlign,
  };
}
