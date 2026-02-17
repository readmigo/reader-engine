import type { ReaderSettings } from '../types';
import { THEMES } from '../types';

/**
 * Generates a complete CSS stylesheet from the current reader settings.
 * Includes CSS custom properties, typography, element styles, and
 * optional paginated-mode column layout.
 */
export function generateReaderCSS(settings: ReaderSettings): string {
  const theme = THEMES[settings.theme];
  const hyphens = settings.hyphenation ? 'auto' : 'none';

  let css = `
:root {
  --re-bg: ${theme.background};
  --re-text: ${theme.text};
  --re-text-secondary: ${theme.secondaryText};
  --re-highlight: ${theme.highlight};
  --re-link: ${theme.link};
  --re-font-size: ${settings.fontSize}px;
  --re-line-height: ${settings.lineHeight};
  --re-margin: ${settings.margin}px;
}

body, .reader-engine-content {
  margin: 0;
  padding: ${settings.margin}px;
  background-color: ${theme.background};
  color: ${theme.text};
  font-family: ${settings.fontFamily};
  font-size: ${settings.fontSize}px;
  line-height: ${settings.lineHeight};
  letter-spacing: ${settings.letterSpacing}px;
  word-spacing: ${settings.wordSpacing}px;
  text-align: ${settings.textAlign};
  hyphens: ${hyphens};
  -webkit-hyphens: ${hyphens};
  overflow-wrap: break-word;
}

p {
  margin-bottom: ${settings.paragraphSpacing}px;
}

a {
  color: ${theme.link};
  text-decoration: none;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

blockquote {
  border-left: 3px solid ${theme.secondaryText};
  margin: 1em 0;
  padding: 0.5em 1em;
  opacity: 0.9;
}

pre, code {
  font-family: monospace;
  font-size: 0.9em;
}

pre {
  background: rgba(128, 128, 128, 0.1);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

hr {
  border: none;
  border-top: 1px solid ${theme.secondaryText};
  opacity: 0.3;
  margin: 2em 0;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid ${theme.secondaryText};
  padding: 0.5em;
}

figure {
  margin: 1em 0;
  text-align: center;
}

figcaption {
  font-size: 0.85em;
  color: ${theme.secondaryText};
  margin-top: 0.5em;
}`;

  if (settings.readingMode === 'paginated') {
    css += `

.reader-engine-content {
  column-width: calc(100% - ${settings.margin * 2}px);
  column-gap: ${settings.margin * 2}px;
  column-fill: auto;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}`;
  }

  return css;
}
