import type { ClassId } from './classes';
import { readStorage, writeStorage } from './storage';

export type Locale = 'en' | 'es';

export const LOCALES: Locale[] = ['en', 'es'];

interface Strings {
  pageTitle: string;
  heading: string;
  screenshotView: string;
  editNames: string;
  clearNames: string;
  confirmAgain: string;
  copyLink: string;
  linkCopied: string;
  copyFromAddressBar: string;
  moveFrames: string;
  doneMoving: string;
  resetPositions: string;
  stackNote: string;
  stayOutNote: string;
  deathNote: string;
  baitNote: string;
  stayOutSlot: (n: number) => string;
  baitSlot: string;
  classPlaceholder: string;
  mapAlt: string;
  bossAlt: string;
  classes: Record<ClassId, string>;
}

export const STRINGS: Record<Locale, Strings> = {
  en: {
    pageTitle: 'Sszorak Mythic Spread Positions',
    heading: 'Sszorak – Mythic Mechanic Spread Positions',
    screenshotView: 'Screenshot view',
    editNames: 'Edit names',
    clearNames: 'Clear names',
    confirmAgain: 'Click again to confirm',
    copyLink: 'Copy share link',
    linkCopied: 'Link copied!',
    copyFromAddressBar: 'Copy it from the address bar',
    moveFrames: 'Move frames',
    doneMoving: 'Done moving',
    resetPositions: 'Reset positions',
    stackNote: 'Only 16 have to stack to trigger Virulence.',
    stayOutNote: 'Up to 4 can stay out — useful for healers to plant feet and heal.',
    deathNote: 'If anyone dies, these people adjust and stack with the group.',
    baitNote: "Runs far to bait Serpent's Fury.",
    stayOutSlot: (n) => `Out ${n}`,
    baitSlot: 'Bait',
    classPlaceholder: 'Class…',
    mapAlt: 'Sszorak arena',
    bossAlt: 'Boss tank spot',
    classes: {
      deathknight: 'Death Knight',
      demonhunter: 'Demon Hunter',
      druid: 'Druid',
      evoker: 'Evoker',
      hunter: 'Hunter',
      mage: 'Mage',
      monk: 'Monk',
      paladin: 'Paladin',
      priest: 'Priest',
      rogue: 'Rogue',
      shaman: 'Shaman',
      warlock: 'Warlock',
      warrior: 'Warrior',
    },
  },
  es: {
    pageTitle: 'Sszorak – Posiciones de dispersión mítica',
    heading: 'Sszorak – Posiciones de dispersión (mecánica mítica)',
    screenshotView: 'Vista para captura',
    editNames: 'Editar nombres',
    clearNames: 'Borrar nombres',
    confirmAgain: 'Haz clic otra vez para confirmar',
    copyLink: 'Copiar enlace',
    linkCopied: '¡Enlace copiado!',
    copyFromAddressBar: 'Cópialo de la barra de direcciones',
    moveFrames: 'Mover marcos',
    doneMoving: 'Terminar',
    resetPositions: 'Restablecer posiciones',
    stackNote: 'Solo 16 tienen que agruparse para activar Virulencia.',
    stayOutNote: 'Hasta 4 pueden quedarse fuera — útil para que los sanadores se queden quietos y curen.',
    deathNote: 'Si alguien muere, estas personas se ajustan y se agrupan con el resto.',
    baitNote: 'Corre lejos para atraer la Furia de la serpiente.',
    stayOutSlot: (n) => `Fuera ${n}`,
    baitSlot: 'Cebo',
    classPlaceholder: 'Clase…',
    mapAlt: 'Arena de Sszorak',
    bossAlt: 'Posición del jefe',
    classes: {
      deathknight: 'Caballero de la Muerte',
      demonhunter: 'Cazador de demonios',
      druid: 'Druida',
      evoker: 'Evocador',
      hunter: 'Cazador',
      mage: 'Mago',
      monk: 'Monje',
      paladin: 'Paladín',
      priest: 'Sacerdote',
      rogue: 'Pícaro',
      shaman: 'Chamán',
      warlock: 'Brujo',
      warrior: 'Guerrero',
    },
  },
};

const LOCALE_KEY = 'sszorak-positions:locale';

export function loadLocale(): Locale {
  const saved = readStorage(LOCALE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function saveLocale(locale: Locale) {
  writeStorage(LOCALE_KEY, locale);
}
