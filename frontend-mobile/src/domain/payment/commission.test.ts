import { commissionPercent } from './commission';

it('turns the basis points the API reports into a percentage', () => {
  expect(commissionPercent(300)).toBe(3);
  expect(commissionPercent(800)).toBe(8);
  expect(commissionPercent(1200)).toBe(12);
  expect(commissionPercent(250)).toBe(2.5);
  expect(commissionPercent(1)).toBe(0.01);
  expect(commissionPercent(3000)).toBe(30);
});

it('reports no rate for a missing or invalid value instead of guessing one', () => {
  for (const value of [undefined, null, 0, -300, 3001, 2.5, Number.NaN, '300']) {
    expect(commissionPercent(value)).toBeNull();
  }
});
