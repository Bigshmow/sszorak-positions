import type { ClassId } from '../classes';
import { AUTO_FILL, BAIT_SLOT, STAY_OUT_SLOTS } from '../layout';
import type { Assignments } from '../types';
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

/**
 * Places a raid on the map: a ranged dps baits from spot 1, tanks take their side's tank spot,
 * odd groups fill the left side and even groups the right, and overflow goes to the middle.
 * Healers are also listed in the stay-out spots, since they don't stack before the spread.
 */
export function autoFill(players: RosterPlayer[]): Assignments {
  const result: Assignments = {};
  const free = new Set<string>([
    AUTO_FILL.baitSpot,
    AUTO_FILL.tankSpots.odd,
    AUTO_FILL.tankSpots.even,
    ...AUTO_FILL.sides.odd,
    ...AUTO_FILL.sides.even,
    ...AUTO_FILL.middle,
  ]);
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

  for (const player of rest) {
    if (player.role === 'tank' && !unplaced.includes(player)) continue;
    const parity = parityOf(player.group);
    const spot =
      firstFree(AUTO_FILL.sides[parity]) ??
      firstFree(AUTO_FILL.middle) ??
      firstFree(AUTO_FILL.sides[otherParity(parity)]) ??
      firstFree([...free]);
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
