import { CLASS_COLORS, CLASS_IDS, type ClassId } from '../classes';
import { luma, medianColor, rgbAt, subRect, type Pixels, type Rect, type RGB } from './pixels';

export type Role = 'tank' | 'healer' | 'dps';

const DARK_LUMA = 35;
const MIN_LINE_RUN = 10;
const COLUMN_LINE_RATIO = 0.4;
const ROW_LINE_RATIO = 0.35;
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

/** Share of a line covered by long dark runs: separators are solid, text outlines are broken up. */
function longRunShare(length: number, isDark: (i: number) => boolean): number {
  let covered = 0;
  let run = 0;
  for (let i = 0; i <= length; i++) {
    if (i < length && isDark(i)) {
      run++;
      continue;
    }
    if (run >= MIN_LINE_RUN) covered += run;
    run = 0;
  }
  return covered / length;
}

/** Rows of cell rectangles, top to bottom, left to right. Empty when no grid is found. */
export function detectGrid(px: Pixels): Rect[][] {
  const dark = new Uint8Array(px.width * px.height);
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) dark[y * px.width + x] = luma(rgbAt(px, x, y)) < DARK_LUMA ? 1 : 0;
  }
  const colProfile = Array.from({ length: px.width }, (_, x) =>
    longRunShare(px.height, (y) => dark[y * px.width + x] === 1),
  );
  const rowProfile = Array.from({ length: px.height }, (_, y) =>
    longRunShare(px.width, (x) => dark[y * px.width + x] === 1),
  );

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

export function detectRole(px: Pixels, cell: Rect, band: Band = findNameBand(px, cell)): Role | null {
  return detectRingRole(px, cell) ?? detectGlyphRole(px, cell, band);
}

/** Blizzard's role icons: a gold ring around red (dps), green (healer) or navy (tank). */
function detectRingRole(px: Pixels, cell: Rect): Role | null {
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

const GLYPH_WHITE = 200;
const GLYPH_MAX_SPREAD = 40;
const GLYPH_MIN_PIXELS = 12;
const GLYPH_MAX_PIXELS = 140;
const GLYPH_MIN_SIZE = 5;
const GLYPH_MAX_SIZE = 16;
const CROSS_MAX_FILL = 0.6;

/**
 * Plain white role glyphs (a + for healers, a shield for tanks, nothing for dps) near the top middle
 * of the frame. A cross fills about half its bounding box; a shield fills most of it.
 */
function detectGlyphRole(px: Pixels, cell: Rect, band: Band): Role | null {
  const x0 = cell.x + Math.round(cell.w * 0.3);
  const x1 = cell.x + Math.round(cell.w * 0.7);
  const y0 = Math.max(0, cell.y - Math.round(cell.h * 0.3));
  const y1 = Math.min(px.height, cell.y + cell.h);
  const w = x1 - x0;
  const isWhite = (x: number, y: number) => {
    if (y >= band.y0 && y < band.y1) return false;
    const [r, g, b] = rgbAt(px, x, y);
    return Math.min(r, g, b) >= GLYPH_WHITE && Math.max(r, g, b) - Math.min(r, g, b) <= GLYPH_MAX_SPREAD;
  };

  const seen = new Uint8Array(w * (y1 - y0));
  let best: { count: number; fill: number } | null = null;
  for (let sy = y0; sy < y1; sy++) {
    for (let sx = x0; sx < x1; sx++) {
      const start = (sy - y0) * w + (sx - x0);
      if (seen[start] || !isWhite(sx, sy)) continue;
      seen[start] = 1;
      const stack = [[sx, sy]];
      let count = 0;
      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      while (stack.length) {
        const [x, y] = stack.pop()!;
        count++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
          const i = (ny - y0) * w + (nx - x0);
          if (seen[i] || !isWhite(nx, ny)) continue;
          seen[i] = 1;
          stack.push([nx, ny]);
        }
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const sized = (s: number) => s >= GLYPH_MIN_SIZE && s <= GLYPH_MAX_SIZE;
      if (count < GLYPH_MIN_PIXELS || count > GLYPH_MAX_PIXELS || !sized(bw) || !sized(bh)) continue;
      if (!best || count > best.count) best = { count, fill: count / (bw * bh) };
    }
  }
  if (!best) return null;
  return best.fill < CROSS_MAX_FILL ? 'healer' : 'tank';
}

const NAME_SEARCH_ABOVE = 0.25;
const NAME_BAND_HEIGHT = 0.26;
const NAME_BAND_PAD = 3;
const OUTLINE_LUMA = 70;
const BAND_BRIGHT = 0.7;
const MIN_TEXT_PEAK = 90;
const MAX_TEXT_SPREAD = 60;
const OCR_SCALE = 5;
const OCR_PAD = 16;

export interface Band {
  y0: number;
  y1: number;
}

const greyLevel = ([r, g, b]: RGB) => (Math.max(r, g, b) - Math.min(r, g, b) > MAX_TEXT_SPREAD ? 0 : Math.min(r, g, b));

/**
 * Addons draw names at different heights (straddling the top edge, centered, ...), so this finds the
 * horizontal band with the most white pixels that touch a dark outline, which is how name text is drawn.
 */
export function findNameBand(px: Pixels, cell: Rect): Band {
  const top = Math.max(0, cell.y - Math.round(cell.h * NAME_SEARCH_ABOVE));
  const bottom = Math.min(px.height - 1, cell.y + cell.h - 1);
  const window = Math.max(8, Math.round(cell.h * NAME_BAND_HEIGHT));

  const greys: number[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = cell.x; x < cell.x + cell.w; x++) greys.push(greyLevel(rgbAt(px, x, y)));
  }
  const sorted = [...greys].sort((a, b) => a - b);
  const bright = Math.max(MIN_TEXT_PEAK, sorted[Math.floor(sorted.length * 0.97)]) * BAND_BRIGHT;

  const outlined = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= px.width || ny >= px.height) continue;
        if (luma(rgbAt(px, nx, ny)) < OUTLINE_LUMA) return true;
      }
    }
    return false;
  };

  const rowScore: number[] = [];
  for (let y = top; y <= bottom; y++) {
    let n = 0;
    for (let x = cell.x; x < cell.x + cell.w; x++) {
      if (greyLevel(rgbAt(px, x, y)) >= bright && outlined(x, y)) n++;
    }
    rowScore.push(n);
  }

  let bestStart = 0;
  let bestSum = -1;
  for (let s = 0; s + window <= rowScore.length; s++) {
    let sum = 0;
    for (let i = s; i < s + window; i++) sum += rowScore[i];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = s;
    }
  }
  return {
    y0: Math.max(0, top + bestStart - NAME_BAND_PAD),
    y1: Math.min(px.height, top + bestStart + window + NAME_BAND_PAD),
  };
}

/**
 * Ways of separating name text from the bar behind it; each screenshot uses whichever reads best.
 * `strict` suits thick outlined fonts, `loose` keeps thin strokes, and `outlined` handles light bars
 * (priests) where thin text is no brighter than the bar.
 */
export const INK_STYLES = ['strict', 'loose', 'outlined'] as const;
export type InkStyle = (typeof INK_STYLES)[number];

const THRESHOLD_SHARES = { strict: [0.7, 0.96], loose: [0.45, 0.85] } as const;
const OUTLINE_DARK = 140;
const ENCLOSED_MIN_LIFT = 50;
const ENCLOSED_INK_FLOOR = 70;
const ENCLOSED_INK_RANGE = 80;

function thresholdInk(px: Pixels, cell: Rect, band: Band, [lowShare, highShare]: readonly number[]): Float32Array {
  const sw = cell.w;
  const sh = band.y1 - band.y0;
  const greys = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) greys[y * sw + x] = greyLevel(rgbAt(px, cell.x + x, band.y0 + y));
  }
  const sorted = [...greys].sort((a, b) => a - b);
  const peak = Math.max(MIN_TEXT_PEAK, sorted[Math.floor(sorted.length * 0.97)]);
  const background = sorted[Math.floor(sorted.length * 0.5)];
  const low = background + (peak - background) * lowShare;
  const high = background + (peak - background) * highShare;
  return greys.map((g) => Math.min(1, Math.max(0, (g - low) / (high - low))));
}

/**
 * Text is fenced in by its dark outline while the bar reaches the strip's edge, so ink is whatever
 * bright region can't be reached from the edge without crossing a dark pixel. Letter holes ("o", "a")
 * are also fenced in but only bar-bright, so they stay background.
 */
function outlinedInk(px: Pixels, cell: Rect, band: Band): Float32Array {
  const sw = cell.w;
  const sh = band.y1 - band.y0;
  const lumas = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) lumas[y * sw + x] = luma(rgbAt(px, cell.x + x, band.y0 + y));
  }

  const label = new Int32Array(sw * sh).fill(-1);
  const components: { touchesEdge: boolean; maxLuma: number }[] = [];
  for (let start = 0; start < lumas.length; start++) {
    if (label[start] >= 0 || lumas[start] < OUTLINE_DARK) continue;
    const id = components.length;
    const comp = { touchesEdge: false, maxLuma: 0 };
    components.push(comp);
    label[start] = id;
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % sw;
      const y = (i - x) / sw;
      comp.maxLuma = Math.max(comp.maxLuma, lumas[i]);
      if (x === 0 || y === 0 || x === sw - 1 || y === sh - 1) comp.touchesEdge = true;
      const neighbours = [x > 0 ? i - 1 : -1, x < sw - 1 ? i + 1 : -1, y > 0 ? i - sw : -1, y < sh - 1 ? i + sw : -1];
      for (const n of neighbours) {
        if (n < 0 || label[n] >= 0 || lumas[n] < OUTLINE_DARK) continue;
        label[n] = id;
        stack.push(n);
      }
    }
  }

  const edgeLumas: number[] = [];
  lumas.forEach((l, i) => label[i] >= 0 && components[label[i]].touchesEdge && edgeLumas.push(l));
  edgeLumas.sort((a, b) => a - b);
  const barLuma = edgeLumas[Math.floor(edgeLumas.length / 2)] ?? 0;

  return lumas.map((l, i) => {
    const comp = label[i] >= 0 ? components[label[i]] : null;
    if (!comp || comp.touchesEdge || comp.maxLuma < barLuma + ENCLOSED_MIN_LIFT) return 0;
    return Math.min(1, Math.max(0, (l - ENCLOSED_INK_FLOOR) / ENCLOSED_INK_RANGE));
  });
}

/** Returns the cell's name as smooth black-on-white text, enlarged for OCR. */
export function nameStrip(
  px: Pixels,
  cell: Rect,
  style: InkStyle = 'strict',
  band: Band = findNameBand(px, cell),
): Pixels {
  const sw = cell.w;
  const sh = band.y1 - band.y0;
  const ink = style === 'outlined' ? outlinedInk(px, cell, band) : thresholdInk(px, cell, band, THRESHOLD_SHARES[style]);

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
      players.push({ row, col, classId, classError: error, role: detectRole(px, cell, findNameBand(px, cell)) });
    }),
  );
  return players;
}

/** Every cell's name drawn once per ink style: `result[style][cell]`, ready for `readNames`. */
export function nameStripVariants(px: Pixels, cells: Rect[]): Pixels[][] {
  const bands = cells.map((cell) => findNameBand(px, cell));
  return INK_STYLES.map((style) => cells.map((cell, i) => nameStrip(px, cell, style, bands[i])));
}
