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
export const MAP_ASPECT = 16 / 9;

export const MAP_SLOTS: MapSlot[] = [
  { id: 'm1', label: '1', x: 49.5, y: 6.2 },
  { id: 'm2', label: '2', x: 39.6, y: 15.4 },
  { id: 'm3', label: '3', x: 59.7, y: 16.3 },
  { id: 'm4', label: '4', x: 26.0, y: 21.2 },
  { id: 'm5', label: '5', x: 72.9, y: 21.4 },
  { id: 'm6', label: '6', x: 50.0, y: 24.5 },
  { id: 'm7', label: '7', x: 36.1, y: 31.1 },
  { id: 'm8', label: '8', x: 63.2, y: 31.2 },
  { id: 'm9', label: '9', x: 49.8, y: 37.7 },
  { id: 'm10', label: '10', x: 25.2, y: 41.3 },
  { id: 'm11', label: '11', x: 74.7, y: 40.4 },
  { id: 'm12', label: '12', x: 38.3, y: 46.0 },
  { id: 'm13', label: '13', x: 61.5, y: 46.6 },
  { id: 'm14', label: '14', x: 25.4, y: 55.5 },
  { id: 'm15', label: '15', x: 72.8, y: 55.5 },
  { id: 'm16', label: '16', x: 42.1, y: 58.9 },
  { id: 'm17', label: '17', x: 59.4, y: 59.2 },
  { id: 'm18', label: '18', x: 33.3, y: 68.6 },
  { id: 'm19', label: '19', x: 50.1, y: 68.6 },
  { id: 'm20', label: '20', x: 65.7, y: 68.8 },
];

export const STAY_OUT_SLOTS: Slot[] = [
  { id: 'out1', label: 'Out 1' },
  { id: 'out2', label: 'Out 2' },
  { id: 'out3', label: 'Out 3' },
  { id: 'out4', label: 'Out 4' },
];

export const BAIT_SLOT: Slot = { id: 'bait', label: 'Bait' };
