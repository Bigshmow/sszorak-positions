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

  it('puts group 2/4 tanks on spot 6 and group 1/3 tanks on spot 19', () => {
    expect(result.m6?.name).toBe('Carmasan');
    expect(result.m19?.name).toBe('Sheldz');
  });

  it('sends odd groups left of the boss and even groups right, outside in, overflow to the middle', () => {
    expect(names(result, ['m10', 'm14', 'm4', 'm18', 'm7', 'm12', 'm2', 'm16'])).toEqual([
      'Zombyra', 'Theelyas', 'Tongpooh', 'Henyheny', 'Akassa', 'Alyzane', 'Betasha', 'Chairowar',
    ]);
    expect(names(result, ['m11', 'm5', 'm15', 'm20', 'm8', 'm13', 'm3', 'm17'])).toEqual([
      'Billetin', 'Galaen', 'Stormyen', 'Lumisara', 'Flexhack', 'Suggarquee', 'Ddpaladini', 'Skadi',
    ]);
    expect(result.m9?.name).toBe('Kasher');
  });

  it('follows frames that were dragged to the other side of the boss', () => {
    const moved = autoFill(RAID, { m4: { x: 85, y: 30 } });
    expect(moved.m4?.name).toBe('Billetin');
  });

  it('follows the boss when it is dragged, and gives each side its own groups before overflow', () => {
    const moved = autoFill(RAID, { boss: { x: 30, y: 70 } });
    expect(names(moved, ['m10', 'm14', 'm4'])).toEqual(['Zombyra', 'Theelyas', 'Tongpooh']);
    expect(names(moved, ['m11', 'm5', 'm15', 'm20', 'm8', 'm13', 'm3', 'm17'])).toEqual([
      'Billetin', 'Galaen', 'Stormyen', 'Lumisara', 'Flexhack', 'Suggarquee', 'Ddpaladini', 'Skadi',
    ]);
    expect(moved.m9?.name).toBe('Henyheny');
    expect(names(moved, ['m16', 'm2', 'm12', 'm7', 'm18'])).toEqual([
      'Akassa', 'Alyzane', 'Betasha', 'Chairowar', 'Kasher',
    ]);
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
    expect(r.m19?.name).toBe('TankA');
    expect(r.m6?.name).toBe('TankB');
  });

  it('still fills spot 1 when nobody can bait, and leaves the bait box empty', () => {
    const r = autoFill(raid([[['Melee', 'rogue', 'dps']]]));
    expect(r.bait).toBeUndefined();
    expect(Object.keys(r)).toEqual(['m10']);
  });
});
