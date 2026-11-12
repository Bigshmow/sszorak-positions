export interface Slot {
  id: string;
  label: string;
}

export interface MapSlot extends Slot {
  x: number;
  y: number;
}

export const FRAME_WIDTH = 10;
export const FRAME_HEIGHT = 7.5;
export const BOARD_WIDTH = 1600;
export const SIDE_WIDTH = 260;
export const BOARD_HEIGHT = Math.round(((BOARD_WIDTH - SIDE_WIDTH) * 9) / 16);

export const BOSS = { x: 50.5, y: 69.5, width: 7 };

export const MAP_SLOTS: MapSlot[] = [
  { id: 'm1', label: '1', x: 49.5, y: 14.2 },
  { id: 'm2', label: '2', x: 39.6, y: 26.1 },
  { id: 'm3', label: '3', x: 59.7, y: 27.3 },
  { id: 'm4', label: '4', x: 22.5, y: 33.7 },
  { id: 'm5', label: '5', x: 76.4, y: 33.9 },
  { id: 'm6', label: '6', x: 50.0, y: 38.0 },
  { id: 'm7', label: '7', x: 36.1, y: 46.5 },
  { id: 'm8', label: '8', x: 63.2, y: 46.7 },
  { id: 'm9', label: '9', x: 49.8, y: 55.1 },
  { id: 'm10', label: '10', x: 21.7, y: 59.8 },
  { id: 'm11', label: '11', x: 78.2, y: 58.6 },
  { id: 'm12', label: '12', x: 38.3, y: 65.9 },
  { id: 'm13', label: '13', x: 61.5, y: 66.7 },
  { id: 'm14', label: '14', x: 21.9, y: 78.2 },
  { id: 'm15', label: '15', x: 76.3, y: 78.2 },
  { id: 'm16', label: '16', x: 42.1, y: 82.6 },
  { id: 'm17', label: '17', x: 59.4, y: 83.0 },
  { id: 'm18', label: '18', x: 33.3, y: 95.2 },
  { id: 'm19', label: '19', x: 50.1, y: 95.2 },
  { id: 'm20', label: '20', x: 65.7, y: 95.5 },
];

export const STAY_OUT_SLOTS: Slot[] = [
  { id: 'out1', label: 'Out 1' },
  { id: 'out2', label: 'Out 2' },
  { id: 'out3', label: 'Out 3' },
  { id: 'out4', label: 'Out 4' },
];

export const BAIT_SLOT: Slot = { id: 'bait', label: 'Bait' };
