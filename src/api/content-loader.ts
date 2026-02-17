import type { LoadedChapter } from '../types';
import type { ApiClient } from './client';

export class ContentLoader {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  async loadChapter(bookId: string, chapterId: string): Promise<LoadedChapter> {
    const meta = await this.client.getChapterContent(bookId, chapterId);
    const html = await this.client.fetchHtml(meta.contentUrl);
    return { meta, html };
  }
}
