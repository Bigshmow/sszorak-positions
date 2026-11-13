import { CLASS_COLORS, CLASS_IDS, type ClassId } from '../classes';
import { luma, medianColor, rgbAt, subRect, type Pixels, type Rect, type RGB } from './pixels';

export type Role = 'tank' | 'healer' | 'dps';

const DARK_LUMA = 35;
const COLUMN_LINE_RATIO = 0.6;
const ROW_LINE_RATIO = 0.5;
const MIN_INTERVAL = 15;
const MIN_CELL_RATIO = 0.6;
const EMPTY_CELL_LUMA = 25;

type Span = [start: number, end: number];

function lineRuns(profile: number[], threshold: number): Span[] {
  const runs: Span[] = [];
  profile.forEach((v, i) => {
    if (v <= threshold) return;
    const last = runs[runs.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  });
  return runs;
}

function cellSpans(lines: Span[], size: number): Span[] {
  const bounds: Span[] = [[-1, -1], ...lines, [size, size]];
  const spans: Span[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i][1] + 1;
    const end = bounds[i + 1][0] - 1;
    if (end - start >= MIN_INTERVAL) spans.push([start, end]);
  }
  const longest = Math.max(0, ...spans.map(([s, e]) => e - s));
  return spans.filter(([s, e]) => e - s >= longest * MIN_CELL_RATIO);
}

/** Rows of cell rectangles, top to bottom, left to right. Empty when no grid is found. */
export function detectGrid(px: Pixels): Rect[][] {
  const isDark = (x: number, y: number) => luma(rgbAt(px, x, y)) < DARK_LUMA;
  const colProfile = Array.from({ length: px.width }, (_, x) => {
    let n = 0;
    for (let y = 0; y < px.height; y++) if (isDark(x, y)) n++;
    return n / px.height;
  });
  const rowProfile = Array.from({ length: px.height }, (_, y) => {
    let n = 0;
    for (let x = 0; x < px.width; x++) if (isDark(x, y)) n++;
    return n / px.width;
  });

  const cols = cellSpans(lineRuns(colProfile, COLUMN_LINE_RATIO), px.width);
  const rows = cellSpans(lineRuns(rowProfile, ROW_LINE_RATIO), px.height);

  return rows.map(([y0, y1]) =>
    cols.map(([x0, x1]) => ({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 })),
  );
}

export function barColor(px: Pixels, cell: Rect): RGB {
  return medianColor(px, subRect(cell, 0.1, 0.45, 0.75, 0.95));
}

export function isEmptyCell(px: Pixels, cell: Rect): boolean {
  return luma(barColor(px, cell)) < EMPTY_CELL_LUMA;
}

export interface ClassMatch {
  classId: ClassId;
  error: number;
}

const MAX_GREY_BLEND = 60;
const GREY_PENALTY = 0.002;

const hexToRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;

/**
 * Frames shade the class color, and dead or out-of-range frames blend it toward grey,
 * so each class is fitted as `scale * color + grey` before comparing.
 */
export function matchClass(sample: RGB): ClassMatch {
  let best: ClassMatch = { classId: CLASS_IDS[0], error: Infinity };
  const sampleLen = Math.hypot(...sample) || 1;
  const sampleMean = (sample[0] + sample[1] + sample[2]) / 3;

  for (const classId of CLASS_IDS) {
    const c = hexToRgb(CLASS_COLORS[classId]);
    const cMean = (c[0] + c[1] + c[2]) / 3;
    let cov = 0;
    let varC = 0;
    for (let i = 0; i < 3; i++) {
      cov += (c[i] - cMean) * (sample[i] - sampleMean);
      varC += (c[i] - cMean) ** 2;
    }
    let scale = varC > 0 ? cov / varC : sampleMean / (cMean || 1);
    let grey = sampleMean - scale * cMean;
    if (grey < 0 || grey > MAX_GREY_BLEND) {
      grey = Math.min(MAX_GREY_BLEND, Math.max(0, grey));
      scale = (sampleMean - grey) / (cMean || 1);
    }
    scale = Math.max(0, scale);
    const residual = Math.hypot(
      sample[0] - scale * c[0] - grey,
      sample[1] - scale * c[1] - grey,
      sample[2] - scale * c[2] - grey,
    );
    const error = residual / sampleLen + GREY_PENALTY * grey;
    if (error < best.error) best = { classId, error };
  }
  return best;
}

const isRingGold = ([r, g, b]: RGB) =>
  r >= 0x8c && r <= 0xb4 && g >= 0x5c && g <= 0x7c && b >= 0x22 && b <= 0x3a;
const isDpsRed = ([r, g, b]: RGB) => r >= 0x5a && r > 2.5 * g && r > 2.5 * b;
const isHealerGreen = ([r, g, b]: RGB) => r < 0x35 && g > r + 0x10 && g > b && g < 0x60;
const isTankNavy = ([r, g, b]: RGB) => r < 0x35 && b > g && g > r && b < 0x70 && b - r > 0x18;

/** Finds the gold-ringed role icon in the busiest quadrant and reads the color inside it. */
export function detectRole(px: Pixels, cell: Rect): Role | null {
  const quadrants = [
    subRect(cell, 0, 0, 0.5, 0.5),
    subRect(cell, 0.5, 0, 1, 0.5),
    subRect(cell, 0, 0.5, 0.5, 1),
    subRect(cell, 0.5, 0.5, 1, 1),
  ];

  let ring: { xs: number[]; ys: number[] } = { xs: [], ys: [] };
  for (const q of quadrants) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let y = q.y; y < q.y + q.h; y++) {
      for (let x = q.x; x < q.x + q.w; x++) {
        if (isRingGold(rgbAt(px, x, y))) {
          xs.push(x);
          ys.push(y);
        }
      }
    }
    if (xs.length > ring.xs.length) ring = { xs, ys };
  }
  if (ring.xs.length < 12) return null;

  const x0 = Math.min(...ring.xs);
  const x1 = Math.max(...ring.xs);
  const y0 = Math.min(...ring.ys);
  const y1 = Math.max(...ring.ys);
  const inset = (a: number, b: number) => Math.round((b - a) * 0.2);
  const counts = { dps: 0, healer: 0, tank: 0 };
  for (let y = y0 + inset(y0, y1); y <= y1 - inset(y0, y1); y++) {
    for (let x = x0 + inset(x0, x1); x <= x1 - inset(x0, x1); x++) {
      const c = rgbAt(px, x, y);
      if (isDpsRed(c)) counts.dps++;
      else if (isHealerGreen(c)) counts.healer++;
      else if (isTankNavy(c)) counts.tank++;
    }
  }
  const [role, count] = (Object.entries(counts) as [Role, number][]).sort((a, b) => b[1] - a[1])[0];
  return count >= 3 ? role : null;
}

const NAME_TOP = -0.14;
const NAME_BOTTOM = 0.22;
const TEXT_LOW = 0.7;
const TEXT_HIGH = 0.96;
const MIN_TEXT_PEAK = 90;
const MAX_TEXT_SPREAD = 60;
const OCR_SCALE = 5;
const OCR_PAD = 16;

/** Names straddle the cell's top edge; returns them as smooth black-on-white text, enlarged for OCR. */
export function nameStrip(px: Pixels, cell: Rect): Pixels {
  const y0 = Math.max(0, cell.y + Math.round(cell.h * NAME_TOP));
  const y1 = Math.min(px.height, cell.y + Math.round(cell.h * NAME_BOTTOM));
  const sw = cell.w;
  const sh = y1 - y0;

  const greys = new Float32Array(sw * sh);
  const peaks: number[] = [];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const [r, g, b] = rgbAt(px, cell.x + x, y0 + y);
      const lo = Math.min(r, g, b);
      const grey = Math.max(r, g, b) - lo > MAX_TEXT_SPREAD ? 0 : lo;
      greys[y * sw + x] = grey;
      peaks.push(grey);
    }
  }
  peaks.sort((a, b) => a - b);
  const peak = Math.max(MIN_TEXT_PEAK, peaks[Math.floor(peaks.length * 0.97)]);
  const low = peak * TEXT_LOW;
  const high = peak * TEXT_HIGH;
  const ink = greys.map((g) => Math.min(1, Math.max(0, (g - low) / (high - low))));

  const width = sw * OCR_SCALE + OCR_PAD * 2;
  const height = sh * OCR_SCALE + OCR_PAD * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const sample = (fx: number, fy: number) => {
    const x = Math.min(sw - 1, Math.max(0, fx));
    const y = Math.min(sh - 1, Math.max(0, fy));
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xj = Math.min(sw - 1, xi + 1);
    const yj = Math.min(sh - 1, yi + 1);
    const tx = x - xi;
    const ty = y - yi;
    const top = ink[yi * sw + xi] * (1 - tx) + ink[yi * sw + xj] * tx;
    const bottom = ink[yj * sw + xi] * (1 - tx) + ink[yj * sw + xj] * tx;
    return top * (1 - ty) + bottom * ty;
  };
  for (let y = 0; y < sh * OCR_SCALE; y++) {
    for (let x = 0; x < sw * OCR_SCALE; x++) {
      const v = sample((x + 0.5) / OCR_SCALE - 0.5, (y + 0.5) / OCR_SCALE - 0.5);
      if (v < 0.45) continue;
      const i = ((OCR_PAD + y) * width + OCR_PAD + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return { width, height, data };
}

export interface DetectedPlayer {
  row: number;
  col: number;
  classId: ClassId;
  classError: number;
  role: Role | null;
}

export function analyzeCells(px: Pixels, grid: Rect[][]): DetectedPlayer[] {
  const players: DetectedPlayer[] = [];
  grid.forEach((cells, row) =>
    cells.forEach((cell, col) => {
      if (isEmptyCell(px, cell)) return;
      const { classId, error } = matchClass(barColor(px, cell));
      players.push({ row, col, classId, classError: error, role: detectRole(px, cell) });
    }),
  );
  return players;
}
