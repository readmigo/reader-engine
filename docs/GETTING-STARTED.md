# Getting Started

## Prerequisites

- Node.js >= 18
- npm, yarn, or pnpm
- TypeScript >= 5.7 (for development)

## Installation

```
npm install @readmigo/reader-engine
```

For React integration:

```
npm install @readmigo/reader-engine react react-dom
```

## Module Entry Points

| Import Path | Format | Description |
|------------|--------|-------------|
| `@readmigo/reader-engine` | ESM / CJS | Core engine (types, API, renderer, paginator, navigation) |
| `@readmigo/reader-engine/react` | ESM / CJS | React wrapper (Provider, View, hooks) |

## Integration Flow

### Vanilla TypeScript

```mermaid
sequenceDiagram
    participant App
    participant AC as ApiClient
    participant CL as ContentLoader
    participant CR as ChapterRenderer
    participant P as Paginator
    participant CM as ChapterManager

    App->>AC: Create with baseUrl
    App->>CL: Create with ApiClient
    App->>AC: getBookDetail(bookId)
    AC-->>App: BookDetail
    App->>CM: Create with chapters

    App->>CL: loadChapter(bookId, chapterId)
    CL-->>App: LoadedChapter

    App->>CR: Create with root element + settings
    App->>CR: render(html)

    App->>P: Create with viewport + content elements
    Note over P: Pages auto-calculated

    App->>P: nextPage() / prevPage()
    P-->>App: PageState callback
```

### React Integration

```mermaid
graph TD
    RP[ReaderProvider] --> |context| RV[ReaderView]
    RP --> |context| UR[useReader hook]
    RP --> |context| URS[useReaderSettings hook]
    RP --> |context| UC[useChapters hook]

    UR --> |state| App[Application]
    URS --> |settings| App
    UC --> |chapters| App
```

## Customizing Settings

Override any field from `DEFAULT_SETTINGS` to customize the reading experience:

| Setting | Effect |
|---------|--------|
| `fontSize` | Adjust text size (triggers re-pagination) |
| `fontFamily` | Change typeface (use values from `FONT_FAMILIES`) |
| `lineHeight` | Adjust vertical spacing |
| `theme` | Switch color scheme (`light`, `sepia`, `dark`, `ultraDark`) |
| `readingMode` | Toggle between `paginated` and `scroll` |
| `textAlign` | Change alignment (`left`, `center`, `right`, `justify`) |
| `hyphenation` | Enable/disable CSS hyphenation |
| `margin` | Adjust content padding |

When settings change, call `ChapterRenderer.updateSettings()` followed by `Paginator.recalculate()` to apply changes and re-paginate.

## Theme Switching

```mermaid
graph LR
    User -->|select theme| Settings[Update ReaderSettings.theme]
    Settings --> CSS[generateReaderCSS]
    CSS --> DOM[Inject updated styles]
    DOM --> Repaginate[Paginator.recalculate]
```

Available themes:

| Theme | Background | Best For |
|-------|-----------|----------|
| Light | White (#FFFFFF) | Daytime reading |
| Sepia | Warm tan (#F4ECD8) | Reduced eye strain |
| Dark | Dark gray (#1C1C1E) | Low-light environments |
| Ultra Dark | Pure black (#000000) | OLED screens / night reading |

## Chapter Navigation

```mermaid
stateDiagram-v2
    [*] --> Chapter0: Initialize
    Chapter0 --> Chapter1: goToNext()
    Chapter1 --> Chapter2: goToNext()
    Chapter2 --> Chapter1: goToPrev()
    Chapter1 --> ChapterN: goTo(n) / goToId(id)
    ChapterN --> [*]: Last chapter

    state "Boundary Check" as BC {
        hasPrev: hasPrev (false at start)
        hasNext: hasNext (false at end)
    }
```

Navigation workflow:

| Step | Action | Result |
|------|--------|--------|
| 1 | Create `ChapterManager` with `BookDetail.chapters` | Chapters sorted by `order` |
| 2 | Use `goToNext()` / `goToPrev()` / `goTo()` / `goToId()` | Returns `boolean` success |
| 3 | Read `currentChapter` to get `ChapterSummary` | Contains `id`, `title`, `order` |
| 4 | Load chapter content via `ContentLoader.loadChapter()` | Returns `LoadedChapter` |
| 5 | Render via `ChapterRenderer.render(html)` | DOM updated |
| 6 | Create new `Paginator` for the new content | Pages recalculated |
| 7 | Call `calculateOverallProgress()` for book-level progress | Returns 0.0 to 1.0 |
