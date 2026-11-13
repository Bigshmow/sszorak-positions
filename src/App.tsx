import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { CLASS_IDS, classColor } from './classes';
import { ConfirmButton } from './ConfirmButton';
import { LOCALES, STRINGS, loadLocale, saveLocale, type Locale } from './i18n';
import {
  BAIT_SLOT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOSS,
  BOSS_ID,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MAP_SLOTS,
  SIDE_WIDTH,
  STAY_OUT_SLOTS,
  type Slot,
} from './layout';
import { readSharedFromUrl } from './share';
import { readJson, writeJson } from './storage';
import type { Assignment, Assignments, Positions } from './types';
import { useDrag, type HalfExtent } from './useDrag';
import { useShareLink } from './useShareLink';
import { ImportPanel } from './import/ImportPanel';

type Mode = 'edit' | 'move' | 'view';

const ASSIGNMENTS_KEY = 'sszorak-positions:v1';
const POSITIONS_KEY = 'sszorak-positions:layout:v1';
const EMPTY: Assignment = { name: '', classId: '' };
const FRAME_HALF: HalfExtent = { w: FRAME_WIDTH / 2, h: FRAME_HEIGHT / 2 };
const BOSS_HALF: HalfExtent = { w: BOSS.width / 2, h: (BOSS.width * (61 / 89) * (16 / 9)) / 2 };
const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = (width: number) => setScale(Math.min(1, width / designWidth));
    fit(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth]);

  return { ref, scale };
}

interface FrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string;
  locale: Locale;
  mode: Mode;
  assignment: Assignment;
  onChange: (next: Assignment) => void;
}

function RaidFrame({ label, locale, mode, assignment, onChange, className, style, ...rest }: FrameProps) {
  const t = STRINGS[locale];
  const filled = assignment.name.trim() !== '' || assignment.classId !== '';
  const classes = ['frame', className, filled ? 'filled' : 'empty'].filter(Boolean).join(' ');

  return (
    <div
      {...rest}
      className={classes}
      style={{ ...style, '--class-color': classColor(assignment.classId) } as CSSProperties}
    >
      {mode === 'edit' ? (
        <>
          <input
            className="frame-name"
            value={assignment.name}
            placeholder={label}
            maxLength={24}
            onChange={(e) => onChange({ ...assignment, name: e.target.value })}
          />
          <select
            className="frame-class"
            value={assignment.classId}
            onChange={(e) => onChange({ ...assignment, classId: e.target.value })}
          >
            <option value="">{t.classPlaceholder}</option>
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {t.classes[id]}
              </option>
            ))}
          </select>
          {filled && (
            <button
              className="frame-clear"
              aria-label={t.clearFrame}
              title={t.clearFrame}
              onClick={() => onChange(EMPTY)}
            >
              ×
            </button>
          )}
        </>
      ) : (
        <span className="frame-name">{assignment.name || (mode === 'move' ? label : '')}</span>
      )}
    </div>
  );
}

export default function App() {
  const [shared] = useState(readSharedFromUrl);
  const [assignments, setAssignments] = useState<Assignments>(
    () => shared?.assignments ?? readJson(ASSIGNMENTS_KEY, {}),
  );
  const [positions, setPositions] = useState<Positions>(
    () => shared?.positions ?? readJson(POSITIONS_KEY, {}),
  );
  const [mode, setMode] = useState<Mode>(shared ? 'view' : 'edit');
  const { copyStatus, copyLink } = useShareLink({ assignments, positions });
  const [importOpen, setImportOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const { ref: fitRef, scale } = useFitScale(BOARD_WIDTH);
  const mapRef = useRef<HTMLDivElement>(null);
  const { draggingId, dragProps } = useDrag(mapRef, (id, pos) =>
    setPositions((prev) => ({ ...prev, [id]: pos })),
  );
  const t = STRINGS[locale];
  const moving = mode === 'move';

  useEffect(() => writeJson(ASSIGNMENTS_KEY, assignments), [assignments]);
  useEffect(() => writeJson(POSITIONS_KEY, positions), [positions]);

  useEffect(() => {
    saveLocale(locale);
    document.documentElement.lang = locale;
    document.title = STRINGS[locale].pageTitle;
  }, [locale]);

  const frameProps = (slot: Slot, label: string) => ({
    label,
    locale,
    mode,
    assignment: assignments[slot.id] ?? EMPTY,
    onChange: (next: Assignment) => setAssignments((prev) => ({ ...prev, [slot.id]: next })),
  });

  const copyLabel = { idle: t.copyLink, copied: t.linkCopied, failed: t.copyFromAddressBar }[copyStatus];
  const bossPos = positions[BOSS_ID] ?? BOSS;
  const dragClass = (id: string) => (moving ? (draggingId === id ? 'draggable dragging' : 'draggable') : '');

  return (
    <div className="page">
      <header className="toolbar">
        <h1>{t.heading}</h1>
        <div className="toolbar-actions">
          {mode === 'edit' && (
            <>
              <button onClick={() => setMode('view')}>{t.screenshotView}</button>
              <button onClick={() => setImportOpen(true)}>{t.importFrames}</button>
              <button onClick={() => setMode('move')}>{t.moveFrames}</button>
              <ConfirmButton
                label={t.clearNames}
                confirmLabel={t.confirmAgain}
                onConfirm={() => setAssignments({})}
              />
            </>
          )}
          {mode === 'view' && <button onClick={() => setMode('edit')}>{t.editNames}</button>}
          {!moving && (
            <button className={copyStatus === 'copied' ? 'primary' : undefined} onClick={copyLink}>
              {copyLabel}
            </button>
          )}
          {moving && (
            <>
              <button className="primary" onClick={() => setMode('edit')}>
                {t.doneMoving}
              </button>
              <ConfirmButton
                label={t.resetPositions}
                confirmLabel={t.confirmAgain}
                onConfirm={() => setPositions({})}
              />
            </>
          )}
          <div className="locale-toggle" role="group" aria-label="Language">
            {LOCALES.map((l) => (
              <button
                key={l}
                className={l === locale ? 'active' : undefined}
                aria-pressed={l === locale}
                onClick={() => setLocale(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div
        ref={fitRef}
        className="board-fit"
        style={
          {
            '--scale': scale,
            '--board-w': `${BOARD_WIDTH}px`,
            '--board-h': `${BOARD_HEIGHT}px`,
            '--side-w': `${SIDE_WIDTH}px`,
          } as CSSProperties
        }
      >
        <main className={`board is-${mode}`}>
          <aside className="side">
            <section>
              <p className="note">{t.stackNote}</p>
              <p className="note">{t.stayOutNote}</p>
              <div className="side-frames">
                {STAY_OUT_SLOTS.map((slot, i) => (
                  <RaidFrame
                    key={slot.id}
                    className="side-frame"
                    {...frameProps(slot, t.stayOutSlot(i + 1))}
                  />
                ))}
              </div>
              <p className="note subtle">{t.deathNote}</p>
            </section>
            <section>
              <div className="side-frames">
                <RaidFrame className="side-frame" {...frameProps(BAIT_SLOT, t.baitSlot)} />
              </div>
              <p className="note">{t.baitNote}</p>
            </section>
          </aside>

          <div ref={mapRef} className="map">
            <img className="map-image" src={asset('map.webp')} alt={t.mapAlt} draggable={false} />
            <img
              className={`boss ${dragClass(BOSS_ID)}`}
              src={asset('boss.png')}
              alt={t.bossAlt}
              draggable={false}
              style={{ left: `${bossPos.x}%`, top: `${bossPos.y}%`, width: `${BOSS.width}%` }}
              {...(moving ? dragProps(BOSS_ID, bossPos, BOSS_HALF) : {})}
            />
            {MAP_SLOTS.map((slot) => {
              const pos = positions[slot.id] ?? slot;
              return (
                <RaidFrame
                  key={slot.id}
                  className={`map-frame ${dragClass(slot.id)}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${FRAME_WIDTH}%`,
                    height: `${FRAME_HEIGHT}%`,
                  }}
                  {...frameProps(slot, slot.label)}
                  {...(moving ? dragProps(slot.id, pos, FRAME_HALF) : {})}
                />
              );
            })}
          </div>
        </main>
      </div>
      {importOpen && (
        <ImportPanel locale={locale} onFill={setAssignments} onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}
