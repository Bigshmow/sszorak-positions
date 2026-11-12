import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CLASS_IDS, classColor } from './classes';
import { LOCALES, STRINGS, loadLocale, saveLocale, type Locale } from './i18n';
import {
  BAIT_SLOT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOSS,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MAP_SLOTS,
  SIDE_WIDTH,
  STAY_OUT_SLOTS,
  type Slot,
} from './layout';

interface Assignment {
  name: string;
  classId: string;
}

type Assignments = Record<string, Assignment>;

const STORAGE_KEY = 'sszorak-positions:v1';
const EMPTY: Assignment = { name: '', classId: '' };
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

function loadAssignments(): Assignments {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Assignments) : {};
  } catch {
    return {};
  }
}

function saveAssignments(value: Assignments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

interface FrameProps {
  label: string;
  locale: Locale;
  assignment: Assignment;
  editing: boolean;
  onChange: (next: Assignment) => void;
  style?: CSSProperties;
  className?: string;
}

function RaidFrame({ label, locale, assignment, editing, onChange, style, className }: FrameProps) {
  const t = STRINGS[locale];
  const filled = assignment.name.trim() !== '' || assignment.classId !== '';
  const classes = ['frame', className, filled ? 'filled' : 'empty'].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ ...style, '--class-color': classColor(assignment.classId) } as CSSProperties}
    >
      {editing ? (
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
        </>
      ) : (
        <span className="frame-name">{assignment.name}</span>
      )}
    </div>
  );
}

export default function App() {
  const [assignments, setAssignments] = useState<Assignments>(loadAssignments);
  const [editing, setEditing] = useState(true);
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const { ref: fitRef, scale } = useFitScale(BOARD_WIDTH);
  const t = STRINGS[locale];

  useEffect(() => saveAssignments(assignments), [assignments]);

  useEffect(() => {
    saveLocale(locale);
    document.documentElement.lang = locale;
    document.title = STRINGS[locale].pageTitle;
  }, [locale]);

  const frameProps = (slot: Slot, label: string) => ({
    label,
    locale,
    editing,
    assignment: assignments[slot.id] ?? EMPTY,
    onChange: (next: Assignment) => setAssignments((prev) => ({ ...prev, [slot.id]: next })),
  });

  const clearAll = () => {
    if (window.confirm(t.confirmClear)) setAssignments({});
  };

  return (
    <div className="page">
      <header className="toolbar">
        <h1>{t.heading}</h1>
        <div className="toolbar-actions">
          <button onClick={() => setEditing((v) => !v)}>
            {editing ? t.screenshotView : t.editNames}
          </button>
          {editing && (
            <button className="danger" onClick={clearAll}>
              {t.clearAll}
            </button>
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

      <div ref={fitRef} className="board-fit" style={
          {
            '--scale': scale,
            '--board-w': `${BOARD_WIDTH}px`,
            '--board-h': `${BOARD_HEIGHT}px`,
            '--side-w': `${SIDE_WIDTH}px`,
          } as CSSProperties
        }>
        <main className={`board ${editing ? 'is-editing' : 'is-viewing'}`}>
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

          <div className="map">
            <img className="map-image" src={asset('map.webp')} alt={t.mapAlt} />
            <img
              className="boss"
              src={asset('boss.png')}
              alt={t.bossAlt}
              style={{ left: `${BOSS.x}%`, top: `${BOSS.y}%`, width: `${BOSS.width}%` }}
            />
            {MAP_SLOTS.map((slot) => (
              <RaidFrame
                key={slot.id}
                className="map-frame"
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${FRAME_WIDTH}%`,
                  height: `${FRAME_HEIGHT}%`,
                }}
                {...frameProps(slot, slot.label)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
