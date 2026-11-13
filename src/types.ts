import type { Pos } from './useDrag';

export interface Assignment {
  name: string;
  classId: string;
}

export type Assignments = Record<string, Assignment>;
export type Positions = Record<string, Pos>;
