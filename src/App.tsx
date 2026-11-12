import { useEffect, useState, type CSSProperties } from 'react';
import { CLASSES, classColor } from './classes';
import {
  BAIT_SLOT,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MAP_ASPECT,
  MAP_SLOTS,
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
  slot: Slot;
  assignment: Assignment;
  editing: boolean;
  onChange: (next: Assignment) => void;
  style?: CSSProperties;
  className?: string;
}

function RaidFrame({ slot, assignment, editing, onChange, style, className }: FrameProps) {
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
            placeholder={slot.label}
            maxLength={24}
            onChange={(e) => onChange({ ...assignment, name: e.target.value })}
          />
          <select
            className="frame-class"
            value={assignment.classId}
            onChange={(e) => onChange({ ...assignment, classId: e.target.value })}
          >
            <option value="">Class…</option>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
  const [mapLoaded, setMapLoaded] = useState(true);

  useEffect(() => saveAssignments(assignments), [assignments]);

  const frameProps = (slot: Slot) => ({
    slot,
    editing,
    assignment: assignments[slot.id] ?? EMPTY,
    onChange: (next: Assignment) => setAssignments((prev) => ({ ...prev, [slot.id]: next })),
  });

  const clearAll = () => {
    if (window.confirm('Clear all names and classes?')) setAssignments({});
  };

  return (
    <div className="page">
      <header className="toolbar">
        <h1>Sszorak – Pre-pull Positions</h1>
        <div className="toolbar-actions">
          <button onClick={() => setEditing((v) => !v)}>
            {editing ? 'Screenshot view' : 'Edit names'}
          </button>
          {editing && (
            <button className="danger" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </header>

      <main className={`board ${editing ? 'is-editing' : 'is-viewing'}`}>
        <aside className="side">
          <section>
            <p className="note">Only 16 have to stack to trigger Virulence.</p>
            <p className="note">Up to 4 can stay out — useful for healers to plant feet and heal.</p>
            <div className="side-frames">
              {STAY_OUT_SLOTS.map((slot) => (
                <RaidFrame key={slot.id} className="side-frame" {...frameProps(slot)} />
              ))}
            </div>
            <p className="note subtle">If anyone dies, these people adjust and stack with the group.</p>
          </section>
          <section>
            <div className="side-frames">
              <RaidFrame className="side-frame" {...frameProps(BAIT_SLOT)} />
            </div>
            <p className="note">Runs far to bait Serpent's Fury.</p>
          </section>
        </aside>

        <div className="map" style={mapLoaded ? undefined : { aspectRatio: MAP_ASPECT }}>
          {mapLoaded ? (
            <img
              className="map-image"
              src={`${import.meta.env.BASE_URL}map.webp`}
              alt="Sszorak arena"
              onError={() => setMapLoaded(false)}
            />
          ) : (
            <div className="map-placeholder">Add the arena image as public/map.webp</div>
          )}
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
              {...frameProps(slot)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
