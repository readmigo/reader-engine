import { describe, it, expect, vi } from 'vitest';
import { ContentLoader } from '../content-loader';
import type { ApiClient } from '../client';
import type { ChapterContent } from '../../types';

describe('ContentLoader', () => {
  it('loadChapter combines metadata and HTML fetch', async () => {
    const chapterMeta: ChapterContent = {
      id: 'ch-1',
      title: 'Chapter 1',
      order: 1,
      contentUrl: 'https://r2.example.com/ch-1.html',
      wordCount: 500,
      previousChapterId: null,
      nextChapterId: 'ch-2',
    };
    const html = '<h1>Chapter 1</h1><p>Once upon a time...</p>';

    const mockClient = {
      getChapterContent: vi.fn().mockResolvedValue(chapterMeta),
      fetchHtml: vi.fn().mockResolvedValue(html),
    } as unknown as ApiClient;

    const loader = new ContentLoader(mockClient);
    const result = await loader.loadChapter('book-1', 'ch-1');

    expect(result.meta).toEqual(chapterMeta);
    expect(result.html).toBe(html);
    expect(mockClient.getChapterContent).toHaveBeenCalledWith('book-1', 'ch-1');
    expect(mockClient.fetchHtml).toHaveBeenCalledWith('https://r2.example.com/ch-1.html');
  });
});
