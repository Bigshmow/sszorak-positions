export interface Slot {
  id: string;
  label: string;
}

export interface MapSlot extends Slot {
  x: number;
  y: number;
}

export const FRAME_WIDTH = 13.5;
export const FRAME_HEIGHT = 9.5;
export const MAP_ASPECT = 685 / 505;

export const MAP_SLOTS: MapSlot[] = [
  { id: 'm1', label: '1', x: 43.2, y: 13.3 },
  { id: 'm2', label: '2', x: 32.3, y: 24.8 },
  { id: 'm3', label: '3', x: 54.6, y: 25.9 },
  { id: 'm4', label: '4', x: 17.1, y: 32.1 },
  { id: 'm5', label: '5', x: 69.2, y: 32.3 },
  { id: 'm6', label: '6', x: 43.8, y: 36.2 },
  { id: 'm7', label: '7', x: 28.3, y: 44.4 },
  { id: 'm8', label: '8', x: 58.5, y: 44.6 },
  { id: 'm9', label: '9', x: 43.6, y: 52.7 },
  { id: 'm10', label: '10', x: 16.2, y: 57.2 },
  { id: 'm11', label: '11', x: 71.2, y: 56.0 },
  { id: 'm12', label: '12', x: 30.8, y: 63.0 },
  { id: 'm13', label: '13', x: 56.6, y: 63.8 },
  { id: 'm14', label: '14', x: 16.5, y: 74.9 },
  { id: 'm15', label: '15', x: 69.1, y: 74.9 },
  { id: 'm16', label: '16', x: 35.0, y: 79.2 },
  { id: 'm17', label: '17', x: 54.2, y: 79.6 },
  { id: 'm18', label: '18', x: 25.3, y: 91.3 },
  { id: 'm19', label: '19', x: 43.9, y: 91.3 },
  { id: 'm20', label: '20', x: 61.2, y: 91.5 },
];

export const STAY_OUT_SLOTS: Slot[] = [
  { id: 'out1', label: 'Out 1' },
  { id: 'out2', label: 'Out 2' },
  { id: 'out3', label: 'Out 3' },
  { id: 'out4', label: 'Out 4' },
];

export const BAIT_SLOT: Slot = { id: 'bait', label: 'Bait' };
