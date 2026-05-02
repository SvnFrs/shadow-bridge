import { describe, expect, test } from 'bun:test';
import { aggregateSearch } from '../src/core/aggregator.js';
import type { SearchProvider } from '../src/types/index.js';

describe('aggregateSearch', () => {
  test('combines provider results and errors', async () => {
    const providers: SearchProvider[] = [
      {
        name: 'ok',
        async search() {
          return { results: [{ id: '1', source: 'ok', title: 'A', author: 'B', sizeMb: 1, format: 'pdf', downloadUrl: 'x' }], errors: [] };
        },
      },
      {
        name: 'fail',
        async search() {
          throw new Error('boom');
        },
      },
    ];

    const result = await aggregateSearch('query', providers);
    expect(result.totalResults).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.errors).toContain('fail: boom');
  });
});
