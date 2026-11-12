export interface WowClass {
  id: string;
  name: string;
  color: string;
}

export const CLASSES: WowClass[] = [
  { id: 'deathknight', name: 'Death Knight', color: '#C41E3A' },
  { id: 'demonhunter', name: 'Demon Hunter', color: '#A330C9' },
  { id: 'druid', name: 'Druid', color: '#FF7C0A' },
  { id: 'evoker', name: 'Evoker', color: '#33937F' },
  { id: 'hunter', name: 'Hunter', color: '#AAD372' },
  { id: 'mage', name: 'Mage', color: '#3FC7EB' },
  { id: 'monk', name: 'Monk', color: '#00FF98' },
  { id: 'paladin', name: 'Paladin', color: '#F48CBA' },
  { id: 'priest', name: 'Priest', color: '#FFFFFF' },
  { id: 'rogue', name: 'Rogue', color: '#FFF468' },
  { id: 'shaman', name: 'Shaman', color: '#0070DD' },
  { id: 'warlock', name: 'Warlock', color: '#8788EE' },
  { id: 'warrior', name: 'Warrior', color: '#C69B6D' },
];

export const EMPTY_COLOR = '#3a3f47';

export function classColor(classId: string): string {
  return CLASSES.find((c) => c.id === classId)?.color ?? EMPTY_COLOR;
}
