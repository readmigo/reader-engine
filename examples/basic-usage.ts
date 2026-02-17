import {
  ApiClient,
  ContentLoader,
  ChapterRenderer,
  Paginator,
  ChapterManager,
  calculateOverallProgress,
  DEFAULT_SETTINGS,
  type ReaderSettings,
  type BookDetail,
} from '@readmigo/reader-engine';

async function main() {
  // 1. Initialize API client
  const client = new ApiClient({ baseUrl: 'https://api.readmigo.com' });
  const loader = new ContentLoader(client);

  // 2. Load book details and set up chapter navigation
  const book: BookDetail = await client.getBookDetail('book-123');
  const chapters = new ChapterManager(book.chapters);

  // 3. Set up renderer with default settings
  const root = document.getElementById('reader')!;
  const settings: ReaderSettings = { ...DEFAULT_SETTINGS, theme: 'sepia' };
  const renderer = new ChapterRenderer(root, settings);

  // 4. Load and render the first chapter
  const chapter = await loader.loadChapter(book.id, chapters.currentChapter.id);
  renderer.render(chapter.html);

  // 5. Set up paginator
  const paginator = new Paginator(
    renderer.viewportElement!,
    renderer.contentElement!,
    { margin: settings.margin, gap: settings.margin * 2 },
  );

  paginator.onPageChange = (state) => {
    const overall = calculateOverallProgress(
      chapters.currentIndex,
      state.currentPage,
      state.totalPages,
      chapters.totalChapters,
    );
    console.log(`Page ${state.currentPage + 1}/${state.totalPages} | Overall: ${(overall * 100).toFixed(1)}%`);
  };

  // 6. Navigation: next page, or next chapter if at end of current chapter
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowRight') {
      if (!paginator.nextPage() && chapters.goToNext()) {
        const next = await loader.loadChapter(book.id, chapters.currentChapter.id);
        renderer.render(next.html);
        paginator.recalculate();
      }
    }
    if (e.key === 'ArrowLeft') {
      if (!paginator.prevPage() && chapters.goToPrev()) {
        const prev = await loader.loadChapter(book.id, chapters.currentChapter.id);
        renderer.render(prev.html);
        paginator.recalculate();
        paginator.goToEnd();
      }
    }
  });
}

main();
