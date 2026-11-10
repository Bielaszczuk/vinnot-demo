/** WCAG 2.x contrast between two opaque hex colours (`#rgb` or `#rrggbb`). */
export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((digit) => digit + digit).join("") : value;
  const channel = (start: number) => linearChannel(parseInt(full.slice(start, start + 2), 16) / 255);
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function linearChannel(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
