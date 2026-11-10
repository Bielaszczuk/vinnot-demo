import { describe, expect, it } from 'vitest';

import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  it('isolates cached wine comparisons by requested language', () => {
    const spanish = queryKeys.wines.comparison('wine-a', 'wine-b', 'es');
    const english = queryKeys.wines.comparison('wine-a', 'wine-b', 'en');

    expect(spanish).not.toEqual(english);
    expect(spanish).toEqual(['compare', 'wine-a', 'wine-b', 'es']);
  });
});
