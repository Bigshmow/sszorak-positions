import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Worker } from 'tesseract.js';
import { detectGrid, nameStripVariants } from './analyze';
import { cleanName, createOcrWorker, readNames } from './ocr';
import type { Pixels } from './pixels';

const toPng = (p: Pixels) => {
  const png = new PNG({ width: p.width, height: p.height });
  png.data = Buffer.from(p.data);
  return PNG.sync.write(png);
};

const NAMES = [
  'Zombyra', 'Theelyas', 'Tongpooh', 'Sheldz', 'Henyheny',
  'Billetin', 'Shmowman', 'Carmasan', 'Galaen', 'Stormyen',
  'Akassa', 'Alyzane', 'Betasha', 'Chairowar', 'Kasher',
  'Lumisara', 'Flexhack', 'Suggarquee', 'Ddpaladini', 'Skadi',
];

describe('cleanName', () => {
  it('keeps the longest word and fixes capitalization', () => {
    expect(cleanName('| sheldz T')).toBe('Sheldz');
    expect(cleanName('Flexhack 7')).toBe('Flexhack');
    expect(cleanName('  ')).toBe('');
  });
});

describe.skipIf(import.meta.env.MODE !== 'ocr')('name OCR on real screenshots (downloads language data)', () => {
  let worker: Worker;
  beforeAll(async () => {
    worker = await createOcrWorker({ cachePath: process.env.OCR_CACHE ?? 'node_modules/.cache/tesseract' });
  }, 120000);
  afterAll(() => worker?.terminate());

  const readAll = async (fixture: string) => {
    const px = PNG.sync.read(readFileSync(`test-fixtures/${fixture}`)) as Pixels;
    const variants = nameStripVariants(px, detectGrid(px).flat());
    return readNames(worker, variants.map((strips) => strips.map(toPng)));
  };

  it('reads every name in the clean screenshot', async () => {
    expect(await readAll('raid-frames-1.png')).toEqual(NAMES);
  }, 120000);

  it('reads every name not covered by a raid marker', async () => {
    const MARKED = new Set(['Sheldz', 'Carmasan']);
    const names = await readAll('raid-frames-2.png');
    NAMES.forEach((name, i) => {
      if (!MARKED.has(name)) expect(names[i]).toBe(name);
    });
  }, 120000);

  it('reads a thin-font frame style, except names under raid markers or with heavy accents', async () => {
    const names = await readAll('raid-frames-3.png');
    const expected: Record<number, string> = {
      0: 'Theelyas', 2: 'Henyheny', 3: 'Tongpooh', 4: 'Zombyra', 5: 'Billetin', 8: 'Shmowman', 9: 'Stormyen',
      10: 'Alyzane', 11: 'Betasha', 12: 'Akassa', 13: 'Chairowar', 14: 'Kasher', 15: 'Ddpaladini',
      16: 'Flexhack', 17: 'Lumisara', 18: 'Skadi',
    };
    for (const [i, name] of Object.entries(expected)) expect(names[Number(i)]).toBe(name);
  }, 120000);
});
