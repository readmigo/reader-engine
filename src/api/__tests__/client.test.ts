import { describe, it, expect, vi } from 'vitest';
import { ApiClient } from '../client';

function mockFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

describe('ApiClient', () => {
  it('getBookDetail fetches book by id', async () => {
    const data = { id: 'book-1', title: 'Test Book', chapters: [] };
    const fetch = mockFetch(data);
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch });

    const result = await client.getBookDetail('book-1');

    expect(result).toEqual(data);
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/books/book-1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getChapterContent fetches chapter metadata', async () => {
    const data = { id: 'ch-1', contentUrl: 'https://r2.example.com/ch-1.html' };
    const fetch = mockFetch(data);
    const client = new ApiClient({ baseUrl: 'https://api.example.com/', fetch });

    const result = await client.getChapterContent('book-1', 'ch-1');

    expect(result).toEqual(data);
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/books/book-1/content/ch-1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws on HTTP 404', async () => {
    const fetch = mockFetch(null, 404);
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch });

    await expect(client.getBookDetail('missing')).rejects.toThrow('API error 404');
  });

  it('fetchHtml returns raw HTML text', async () => {
    const html = '<h1>Chapter 1</h1><p>Content here.</p>';
    const fetch = mockFetch(html);
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch });

    const result = await client.fetchHtml('https://r2.example.com/ch-1.html');

    expect(result).toBe(html);
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetch = mockFetch({});
    const client = new ApiClient({ baseUrl: 'https://api.example.com/', fetch });

    await client.getBookDetail('book-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/books/book-1',
      expect.any(Object),
    );
  });

  it('merges custom headers', async () => {
    const fetch = mockFetch({});
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
      fetch,
    });

    await client.getBookDetail('book-1');

    expect(fetch).toHaveBeenCalledWith(expect.any(String), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    });
  });
});
