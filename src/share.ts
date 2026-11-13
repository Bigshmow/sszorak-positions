import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { CLASS_IDS } from './classes';
import { SHAREABLE_IDS } from './layout';
import type { Assignments, Positions } from './types';

export const SHARE_PARAM = 'l';
const VERSION = '1';

type AssignmentEntry = [slot: number, name: string, classIndex: number];
type PositionEntry = [slot: number, x10: number, y10: number];

interface Payload {
  a?: AssignmentEntry[];
  p?: PositionEntry[];
}

export interface SharedState {
  assignments: Assignments;
  positions: Positions;
}

const isInt = (v: unknown): v is number => Number.isInteger(v);

export function encodeShare({ assignments, positions }: SharedState): string | null {
  const a: AssignmentEntry[] = [];
  const p: PositionEntry[] = [];

  SHAREABLE_IDS.forEach((id, slot) => {
    const entry = assignments[id];
    if (entry && (entry.name.trim() || entry.classId)) {
      a.push([slot, entry.name, (CLASS_IDS as string[]).indexOf(entry.classId)]);
    }
    const pos = positions[id];
    if (pos) p.push([slot, Math.round(pos.x * 10), Math.round(pos.y * 10)]);
  });

  if (!a.length && !p.length) return null;
  const payload: Payload = {};
  if (a.length) payload.a = a;
  if (p.length) payload.p = p;
  return `${VERSION}.${compressToEncodedURIComponent(JSON.stringify(payload))}`;
}

export function decodeShare(value: string): SharedState | null {
  const dot = value.indexOf('.');
  if (dot < 0 || value.slice(0, dot) !== VERSION) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(decompressFromEncodedURIComponent(value.slice(dot + 1)) ?? '');
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;

  const assignments: Assignments = {};
  const positions: Positions = {};

  for (const entry of Array.isArray(payload.a) ? payload.a : []) {
    const [slot, name, classIndex] = entry;
    const id = SHAREABLE_IDS[slot];
    if (!id || typeof name !== 'string' || !isInt(classIndex)) continue;
    assignments[id] = { name: name.slice(0, 24), classId: CLASS_IDS[classIndex] ?? '' };
  }

  for (const entry of Array.isArray(payload.p) ? payload.p : []) {
    const [slot, x10, y10] = entry;
    const id = SHAREABLE_IDS[slot];
    if (!id || !isInt(x10) || !isInt(y10)) continue;
    positions[id] = { x: x10 / 10, y: y10 / 10 };
  }

  return { assignments, positions };
}

export function readSharedFromUrl(): SharedState | null {
  const value = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  return value ? decodeShare(value) : null;
}

export function shareUrl(state: SharedState): string {
  const url = new URL(window.location.href);
  const encoded = encodeShare(state);
  if (encoded) url.searchParams.set(SHARE_PARAM, encoded);
  else url.searchParams.delete(SHARE_PARAM);
  return url.toString();
}
