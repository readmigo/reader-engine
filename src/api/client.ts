import type { BookDetail, ChapterContent } from '../types';

export interface ApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetchFn: typeof globalThis.fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.headers = options.headers ?? {};
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async getBookDetail(bookId: string): Promise<BookDetail> {
    return this.get<BookDetail>(`/books/${bookId}`);
  }

  async getChapterContent(bookId: string, chapterId: string): Promise<ChapterContent> {
    return this.get<ChapterContent>(`/books/${bookId}/content/${chapterId}`);
  }

  async fetchHtml(url: string): Promise<string> {
    const res = await this.fetchFn(url);
    if (!res.ok) throw new Error(`Failed to fetch HTML: ${res.status}`);
    return res.text();
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.headers },
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }
}
