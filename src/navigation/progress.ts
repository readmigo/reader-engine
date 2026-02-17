/**
 * Calculates overall reading progress as a value between 0 and 1.
 *
 * @param chapterIndex - Zero-based index of the current chapter
 * @param currentPage - Zero-based index of the current page within the chapter
 * @param totalPagesInChapter - Total number of pages in the current chapter
 * @param totalChapters - Total number of chapters in the book
 * @returns A number between 0 and 1 representing overall progress
 */
export function calculateOverallProgress(
  chapterIndex: number,
  currentPage: number,
  totalPagesInChapter: number,
  totalChapters: number,
): number {
  if (totalChapters <= 0) {
    return 0;
  }

  const chapterProgress =
    totalPagesInChapter > 1 ? currentPage / (totalPagesInChapter - 1) : 1;

  return (chapterIndex + chapterProgress) / totalChapters;
}
