type PageResult<T> = { data: T[] | null; error: unknown };

/** Continue even when the server caps a page below the requested size. */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

/** Bound IN filters as well as response pages to avoid oversized API URLs. */
export async function fetchByIdBatches<T>(
  ids: string[],
  fetchBatch: (ids: string[]) => Promise<T[]>,
): Promise<T[]> {
  const result: T[] = [];
  const uniqueIds = [...new Set(ids)];
  for (let offset = 0; offset < uniqueIds.length; offset += 50) {
    result.push(...await fetchBatch(uniqueIds.slice(offset, offset + 50)));
  }
  return result;
}
