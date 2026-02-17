import { useReaderContext } from './context';

export function useReader() {
  const { state, loadBook, loadChapter, nextPage, prevPage, goToChapter } = useReaderContext();
  return { state, loadBook, loadChapter, nextPage, prevPage, goToChapter };
}

export function useReaderSettings() {
  const { engine, updateSettings } = useReaderContext();
  return { settings: engine.settings, updateSettings };
}

export function useChapters() {
  const { chapters, state, bookDetail } = useReaderContext();
  return {
    chapters,
    currentIndex: state.chapterIndex,
    totalChapters: chapters.length,
    bookTitle: bookDetail?.title ?? '',
  };
}
