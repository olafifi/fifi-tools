export type ContentTrayMotion = 'idle' | 'receiving' | 'opening';

export function contentTrayMotion(
  previousCount: number,
  nextCount: number,
  open: boolean
): ContentTrayMotion {
  if (nextCount > previousCount) return 'receiving';
  return open ? 'opening' : 'idle';
}
