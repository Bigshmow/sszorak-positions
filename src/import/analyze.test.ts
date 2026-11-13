import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { CLASS_COLORS, CLASS_IDS } from '../classes';
import { analyzeCells, detectGrid, matchClass } from './analyze';
import type { Pixels } from './pixels';

const load = (name: string): Pixels => PNG.sync.read(readFileSync(`test-fixtures/${name}`));

const EXPECTED_CLASSES = [
  ['warrior', 'paladin', 'monk', 'deathknight', 'rogue'],
  ['shaman', 'mage', 'warrior', 'rogue', 'shaman'],
  ['paladin', 'priest', 'shaman', 'warrior', 'priest'],
  ['mage', 'rogue', 'warlock', 'paladin', 'hunter'],
];

const EXPECTED_CLASSES_STYLE_2 = [
  ['paladin', 'deathknight', 'rogue', 'monk', 'warrior'],
  ['shaman', 'warrior', 'rogue', 'mage', 'shaman'],
  ['priest', 'shaman', 'paladin', 'warrior', 'priest'],
  ['paladin', 'rogue', 'mage', 'hunter', 'warlock'],
];

const classGrid = (players: ReturnType<typeof analyzeCells>) =>
  [0, 1, 2, 3].map((row) => players.filter((p) => p.row === row).map((p) => p.classId));

const roleGrid = (players: ReturnType<typeof analyzeCells>) =>
  [0, 1, 2, 3].map((row) => players.filter((p) => p.row === row).map((p) => p.role));

describe('raid frame screenshot analysis', () => {
  for (const fixture of ['raid-frames-1.png', 'raid-frames-2.png']) {
    it(`finds a 4x5 grid and every class in ${fixture}`, () => {
      const px = load(fixture);
      const grid = detectGrid(px);
      expect(grid.length).toBe(4);
      grid.forEach((row) => expect(row.length).toBe(5));

      expect(classGrid(analyzeCells(px, grid))).toEqual(EXPECTED_CLASSES);
    });
  }

  it('handles a frame style with centered names and white role glyphs', () => {
    const px = load('raid-frames-3.png');
    const grid = detectGrid(px);
    expect(grid.map((row) => row.length)).toEqual([5, 5, 5, 5]);
    const players = analyzeCells(px, grid);
    expect(classGrid(players)).toEqual(EXPECTED_CLASSES_STYLE_2);
    expect(roleGrid(players)).toEqual([
      ['healer', 'tank', null, null, null],
      ['healer', 'tank', null, null, null],
      ['healer', 'healer', null, null, null],
      [null, null, null, null, null],
    ]);
  });

  it('matches every class at different shading and grey-out levels', () => {
    const shades = [
      { scale: 1, grey: 0 },
      { scale: 0.63, grey: 0 },
      { scale: 0.45, grey: 0 },
      { scale: 0.3, grey: 12 },
      { scale: 0.25, grey: 25 },
    ];
    for (const classId of CLASS_IDS) {
      const c = [1, 3, 5].map((i) => parseInt(CLASS_COLORS[classId].slice(i, i + 2), 16));
      for (const { scale, grey } of shades) {
        const sample = c.map((v) => Math.round(v * scale + grey)) as [number, number, number];
        expect(matchClass(sample).classId, `${classId} at ${scale}/${grey}`).toBe(classId);
      }
    }
  });

  it('reads tank, healer and dps icons', () => {
    const px = load('raid-frames-2.png');
    const players = analyzeCells(px, detectGrid(px));
    expect(roleGrid(players)).toEqual([
      ['dps', 'healer', 'dps', 'tank', 'dps'],
      ['healer', 'dps', 'tank', 'dps', 'dps'],
      ['dps', 'healer', 'healer', 'dps', 'dps'],
      ['dps', 'dps', 'dps', 'dps', 'dps'],
    ]);
  });
});
