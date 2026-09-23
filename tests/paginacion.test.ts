import { expect, test } from 'vitest';
import { fetchAllPages, fetchByIdBatches } from '../src/infraestructura/paginacion';
test('reads all rows even with a smaller server page limit', async () => {
  const records = Array.from({length: 1205}, (_, id) => ({id}));
  const actual = await fetchAllPages(async (from) => ({data: records.slice(from, from + 73), error: null}));
  expect(actual).toEqual(records);
});

test('large ID filters are bounded and duplicate IDs do not duplicate results', async () => {
  const ids = Array.from({ length: 1205 }, (_, i) => String(i));
  const sizes: number[] = [];
  const result = await fetchByIdBatches([...ids, ...ids], async batch => {
    sizes.push(batch.length);
    return batch;
  });
  expect(result).toEqual(ids);
  expect(Math.max(...sizes)).toBeLessThanOrEqual(50);
});
test('a later failed page rejects rather than returning a partial report', async () => {
  await expect(fetchAllPages(async from => from ? {data: null, error: new Error('offline')} : {data: [{id:1}], error:null})).rejects.toThrow('offline');
});
