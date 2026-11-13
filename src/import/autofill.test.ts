import { describe, expect, it } from 'vitest';
import type { ClassId } from '../classes';
import { MAP_SLOTS } from '../layout';
import type { Role } from './analyze';
import { autoFill, type RosterPlayer } from './autofill';

const raid = (rows: [string, ClassId, Role][][]): RosterPlayer[] =>
  rows.flatMap((row, i) => row.map(([name, classId, role]) => ({ name, classId, role, group: i + 1 })));

const RAID = raid([
  [['Zombyra', 'warrior', 'dps'], ['Theelyas', 'paladin', 'healer'], ['Tongpooh', 'monk', 'dps'], ['Sheldz', 'deathknight', 'tank'], ['Henyheny', 'rogue', 'dps']],
  [['Billetin', 'shaman', 'healer'], ['Shmowman', 'mage', 'dps'], ['Carmasan', 'warrior', 'tank'], ['Galaen', 'rogue', 'dps'], ['Stormyen', 'shaman', 'dps']],
  [['Akassa', 'paladin', 'dps'], ['Alyzane', 'priest', 'healer'], ['Betasha', 'shaman', 'healer'], ['Chairowar', 'warrior', 'dps'], ['Kasher', 'priest', 'dps']],
  [['Lumisara', 'mage', 'dps'], ['Flexhack', 'rogue', 'dps'], ['Suggarquee', 'warlock', 'dps'], ['Ddpaladini', 'paladin', 'dps'], ['Skadi', 'hunter', 'dps']],
]);

const names = (result: ReturnType<typeof autoFill>, ids: string[]) => ids.map((id) => result[id]?.name);

describe('autoFill', () => {
  const result = autoFill(RAID);

  it('fills all 20 map spots with 20 different players', () => {
    const placed = MAP_SLOTS.map((s) => result[s.id]?.name);
    expect(placed.every(Boolean)).toBe(true);
    expect(new Set(placed).size).toBe(20);
  });

  it('puts the first ranged dps in spot 1 and the bait box', () => {
    expect(result.m1).toEqual({ name: 'Shmowman', classId: 'mage' });
    expect(result.bait).toEqual(result.m1);
  });

  it('puts tanks on their side tank spot', () => {
    expect(result.m16?.name).toBe('Sheldz');
    expect(result.m17?.name).toBe('Carmasan');
  });

  it('sends odd groups left, even groups right, overflow to the middle', () => {
    expect(names(result, ['m2', 'm4', 'm7', 'm10', 'm12', 'm14', 'm18'])).toEqual([
      'Zombyra', 'Theelyas', 'Tongpooh', 'Henyheny', 'Akassa', 'Alyzane', 'Betasha',
    ]);
    expect(names(result, ['m3', 'm5', 'm8', 'm11', 'm13', 'm15', 'm20'])).toEqual([
      'Billetin', 'Galaen', 'Stormyen', 'Lumisara', 'Flexhack', 'Suggarquee', 'Ddpaladini',
    ]);
    expect(names(result, ['m6', 'm9', 'm19'])).toEqual(['Chairowar', 'Kasher', 'Skadi']);
  });

  it('also lists the healers in the Out spots', () => {
    expect(names(result, ['out1', 'out2', 'out3', 'out4'])).toEqual([
      'Theelyas', 'Billetin', 'Alyzane', 'Betasha',
    ]);
  });

  it('prefers a mage over a hunter for bait regardless of order', () => {
    const r = autoFill(raid([[['Hunty', 'hunter', 'dps'], ['Magey', 'mage', 'dps']]]));
    expect(r.m1?.name).toBe('Magey');
  });

  it('moves a second same-side tank to the other tank spot', () => {
    const r = autoFill(raid([[['TankA', 'warrior', 'tank'], ['Filler', 'rogue', 'dps']], [], [['TankB', 'paladin', 'tank']]]));
    expect(r.m16?.name).toBe('TankA');
    expect(r.m17?.name).toBe('TankB');
  });

  it('still fills spot 1 when nobody can bait, and leaves the bait box empty', () => {
    const r = autoFill(raid([[['Melee', 'rogue', 'dps']]]));
    expect(r.bait).toBeUndefined();
    expect(Object.keys(r)).toEqual(['m2']);
  });
});
