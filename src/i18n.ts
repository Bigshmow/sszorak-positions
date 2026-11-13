import type { ClassId } from './classes';
import type { Role } from './import/analyze';
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
  clearFrame: string;
  mapAlt: string;
  bossAlt: string;
  classes: Record<ClassId, string>;
  importFrames: string;
  importTitle: string;
  importHint: string;
  noGrid: string;
  readingNames: (done: number, total: number) => string;
  groupsAre: string;
  groupRows: string;
  groupCols: string;
  groupLabel: (n: number) => string;
  roles: Record<Role, string>;
  importNote: string;
  fillBoard: string;
  cancel: string;
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
    clearFrame: 'Clear this frame',
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
    importFrames: 'Import raid frames',
    importTitle: 'Import from a raid frame screenshot',
    importHint:
      'Paste a screenshot (Ctrl+V), drop an image here, or click to choose a file. Crop it to just the raid frames.',
    noGrid: "Couldn't find raid frames in that image. Try cropping it closer to the frames.",
    readingNames: (done, total) => `Reading names… ${done}/${total}`,
    groupsAre: 'Groups are',
    groupRows: 'Rows',
    groupCols: 'Columns',
    groupLabel: (n) => `Group ${n}`,
    roles: { tank: 'Tank', healer: 'Healer', dps: 'DPS' },
    importNote:
      'Spot 1 and Bait get the first Mage, Warlock, Evoker or Hunter. Tanks go to 6 (groups 2 and 4) and 19 (groups 1 and 3). Healers are also listed in the Out spots.',
    fillBoard: 'Fill board',
    cancel: 'Cancel',
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
    clearFrame: 'Vaciar este marco',
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
    importFrames: 'Importar marcos de banda',
    importTitle: 'Importar desde una captura de los marcos de banda',
    importHint:
      'Pega una captura (Ctrl+V), suelta una imagen aquí o haz clic para elegir un archivo. Recórtala para que solo muestre los marcos de banda.',
    noGrid: 'No se encontraron marcos de banda en esa imagen. Prueba a recortarla más cerca de los marcos.',
    readingNames: (done, total) => `Leyendo nombres… ${done}/${total}`,
    groupsAre: 'Los grupos son',
    groupRows: 'Filas',
    groupCols: 'Columnas',
    groupLabel: (n) => `Grupo ${n}`,
    roles: { tank: 'Tanque', healer: 'Sanador', dps: 'DPS' },
    importNote:
      'La posición 1 y el Cebo son para el primer Mago, Brujo, Evocador o Cazador. Los tanques van a la 6 (grupos 2 y 4) y a la 19 (grupos 1 y 3). Los sanadores también aparecen en las posiciones Fuera.',
    fillBoard: 'Rellenar tablero',
    cancel: 'Cancelar',
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
