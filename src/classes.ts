export const CLASS_COLORS = {
  deathknight: '#C41E3A',
  demonhunter: '#A330C9',
  druid: '#FF7C0A',
  evoker: '#33937F',
  hunter: '#AAD372',
  mage: '#3FC7EB',
  monk: '#00FF98',
  paladin: '#F48CBA',
  priest: '#FFFFFF',
  rogue: '#FFF468',
  shaman: '#0070DD',
  warlock: '#8788EE',
  warrior: '#C69B6D',
} as const;

export type ClassId = keyof typeof CLASS_COLORS;

export const CLASS_IDS = Object.keys(CLASS_COLORS) as ClassId[];

export const EMPTY_COLOR = '#3a3f47';

export function classColor(classId: string): string {
  return CLASS_COLORS[classId as ClassId] ?? EMPTY_COLOR;
}
