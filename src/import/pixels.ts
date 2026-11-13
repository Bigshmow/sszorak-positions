export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RGB = [number, number, number];

export function rgbAt(px: Pixels, x: number, y: number): RGB {
  const i = (y * px.width + x) * 4;
  return [px.data[i], px.data[i + 1], px.data[i + 2]];
}

export const luma = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b;

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function medianColor(px: Pixels, rect: Rect): RGB {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const [r, g, b] = rgbAt(px, x, y);
      rs.push(r);
      gs.push(g);
      bs.push(b);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

export function subRect(rect: Rect, fx0: number, fy0: number, fx1: number, fy1: number): Rect {
  const x = rect.x + Math.round(rect.w * fx0);
  const y = rect.y + Math.round(rect.h * fy0);
  return {
    x,
    y,
    w: Math.max(1, rect.x + Math.round(rect.w * fx1) - x),
    h: Math.max(1, rect.y + Math.round(rect.h * fy1) - y),
  };
}
