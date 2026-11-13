import type { ClassId } from '../classes';
import { AUTO_FILL, BAIT_SLOT, BOSS, BOSS_ID, MAP_SLOTS, STAY_OUT_SLOTS } from '../layout';
import type { Assignments, Positions } from '../types';
import type { Role } from './analyze';

export interface RosterPlayer {
  name: string;
  classId: ClassId;
  role: Role;
  group: number;
}

type Parity = 'odd' | 'even';
const parityOf = (group: number): Parity => (group % 2 === 1 ? 'odd' : 'even');
const otherParity = (p: Parity): Parity => (p === 'odd' ? 'even' : 'odd');

function pickBait(players: RosterPlayer[]): RosterPlayer | undefined {
  const dps = players.filter((p) => p.role === 'dps');
  for (const classId of AUTO_FILL.baitClassPriority) {
    const match = dps.find((p) => p.classId === classId);
    if (match) return match;
  }
  return undefined;
}

type Side = 'left' | 'right';

/**
 * Splits the regular spots by which side of the boss they currently sit on (frames and the boss can
 * be dragged), each ordered outside in: farthest from the boss first, then top to bottom.
 */
function sidesFromBoss(positions: Positions): Record<Side, string[]> {
  const boss = positions[BOSS_ID] ?? BOSS;
  const named = new Set<string>([AUTO_FILL.baitSpot, ...Object.values(AUTO_FILL.tankSpots), ...AUTO_FILL.middle]);
  const spots = MAP_SLOTS.filter((s) => !named.has(s.id)).map((s) => ({ id: s.id, ...(positions[s.id] ?? s) }));
  const outsideIn = (side: Side) =>
    spots
      .filter((s) => (side === 'left' ? s.x < boss.x : s.x >= boss.x))
      .sort((a, b) => Math.abs(b.x - boss.x) - Math.abs(a.x - boss.x) || a.y - b.y)
      .map((s) => s.id);
  return { left: outsideIn('left'), right: outsideIn('right') };
}

/**
 * Places a raid on the map: a ranged dps baits from spot 1, tanks take their group's tank spot,
 * odd groups fill the spots left of the boss and even groups the right (outside in), and overflow
 * goes to the middle. Healers are also listed in the stay-out spots, since they don't stack before
 * the spread.
 */
export function autoFill(players: RosterPlayer[], positions: Positions = {}): Assignments {
  const result: Assignments = {};
  const sides = sidesFromBoss(positions);
  const sideOf = (parity: Parity) => sides[AUTO_FILL.groupSides[parity]];
  const free = new Set<string>(MAP_SLOTS.map((s) => s.id));
  const place = (spot: string, player: RosterPlayer) => {
    free.delete(spot);
    result[spot] = { name: player.name, classId: player.classId };
  };
  const firstFree = (spots: readonly string[]) => spots.find((s) => free.has(s));

  const bait = pickBait(players);
  if (bait) {
    place(AUTO_FILL.baitSpot, bait);
    result[BAIT_SLOT.id] = { name: bait.name, classId: bait.classId };
  }

  const rest = players.filter((p) => p !== bait);
  const unplaced: RosterPlayer[] = [];

  for (const player of rest) {
    if (player.role !== 'tank') continue;
    const parity = parityOf(player.group);
    const spot = firstFree([AUTO_FILL.tankSpots[parity], AUTO_FILL.tankSpots[otherParity(parity)]]);
    if (spot) place(spot, player);
    else unplaced.push(player);
  }

  const overflow: RosterPlayer[] = [];
  for (const player of rest) {
    if (player.role === 'tank' && !unplaced.includes(player)) continue;
    const spot = firstFree(sideOf(parityOf(player.group)));
    if (spot) place(spot, player);
    else overflow.push(player);
  }

  for (const player of overflow) {
    const spot =
      firstFree(AUTO_FILL.middle) ?? firstFree(sideOf(otherParity(parityOf(player.group)))) ?? firstFree([...free]);
    if (spot) place(spot, player);
  }

  players
    .filter((p) => p.role === 'healer')
    .slice(0, STAY_OUT_SLOTS.length)
    .forEach((healer, i) => {
      result[STAY_OUT_SLOTS[i].id] = { name: healer.name, classId: healer.classId };
    });

  return result;
}
