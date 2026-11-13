import { useEffect, useRef, useState, type DragEvent } from 'react';
import { CLASS_IDS, classColor, type ClassId } from '../classes';
import { STRINGS, type Locale } from '../i18n';
import type { Assignments } from '../types';
import { analyzeCells, detectGrid, nameStripVariants, type Role } from './analyze';
import { autoFill, type RosterPlayer } from './autofill';
import { blobToPixels, imageFromClipboard, pixelsToCanvas } from './browser';

interface ReviewPlayer {
  row: number;
  col: number;
  name: string;
  classId: ClassId;
  role: Role;
}

type GroupAxis = 'rows' | 'cols';
type Status = { kind: 'idle' } | { kind: 'reading'; done: number; total: number } | { kind: 'ready' } | { kind: 'error' };

const ROLES: Role[] = ['tank', 'healer', 'dps'];

interface ImportPanelProps {
  locale: Locale;
  onFill: (assignments: Assignments) => void;
  onClose: () => void;
}

export function ImportPanel({ locale, onFill, onClose }: ImportPanelProps) {
  const t = STRINGS[locale];
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [players, setPlayers] = useState<ReviewPlayer[]>([]);
  const [axis, setAxis] = useState<GroupAxis>('rows');
  const [preview, setPreview] = useState<string | null>(null);
  const runId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const groupOf = (p: ReviewPlayer) => (axis === 'rows' ? p.row : p.col) + 1;

  const readImage = async (blob: Blob) => {
    const id = ++runId.current;
    setPreview(URL.createObjectURL(blob));
    setPlayers([]);

    try {
      const px = await blobToPixels(blob);
      const grid = detectGrid(px);
      const detected = analyzeCells(px, grid);
      if (!detected.length) {
        setStatus({ kind: 'error' });
        return;
      }
      const initial = detected.map((d) => ({
        row: d.row,
        col: d.col,
        name: '',
        classId: d.classId,
        role: d.role ?? 'dps',
      }));
      setPlayers(initial);
      setStatus({ kind: 'reading', done: 0, total: initial.length });

      const { createOcrWorker, readNames } = await import('./ocr');
      const variants = nameStripVariants(px, detected.map((d) => grid[d.row][d.col]));
      const worker = await createOcrWorker();
      let names: string[];
      try {
        names = await readNames(
          worker,
          variants.map((strips) => strips.map(pixelsToCanvas)),
          (done, total) => runId.current === id && setStatus({ kind: 'reading', done, total }),
        );
      } finally {
        await worker.terminate();
      }
      if (runId.current !== id) return;
      setPlayers((prev) => prev.map((p, i) => (p.name ? p : { ...p, name: names[i] ?? '' })));
      setStatus({ kind: 'ready' });
    } catch {
      if (runId.current === id) setStatus({ kind: 'error' });
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromClipboard(e);
      if (file) {
        e.preventDefault();
        void readImage(file);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
      runId.current++;
    };
  }, []);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (file) void readImage(file);
  };

  const update = (index: number, patch: Partial<ReviewPlayer>) =>
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const fill = () => {
    const roster: RosterPlayer[] = players
      .map((p) => ({
        name: p.name.trim() || t.classes[p.classId],
        classId: p.classId,
        role: p.role,
        group: groupOf(p),
      }))
      .sort((a, b) => a.group - b.group);
    onFill(autoFill(roster));
    onClose();
  };

  const groups = [...new Set(players.map(groupOf))].sort((a, b) => a - b);
  const reading = status.kind === 'reading';

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t.importTitle}>
        <header className="modal-header">
          <h2>{t.importTitle}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.cancel}>
            ×
          </button>
        </header>

        <div
          className="drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
        >
          {preview ? <img src={preview} alt="" /> : <p>{t.importHint}</p>}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readImage(file);
              e.target.value = '';
            }}
          />
        </div>

        {status.kind === 'error' && <p className="import-error">{t.noGrid}</p>}
        {reading && <p className="import-status">{t.readingNames(status.done, status.total)}</p>}

        {players.length > 0 && (
          <>
            <div className="import-options">
              <span>{t.groupsAre}</span>
              <div className="segmented">
                {(['rows', 'cols'] as GroupAxis[]).map((a) => (
                  <button key={a} className={axis === a ? 'active' : undefined} onClick={() => setAxis(a)}>
                    {a === 'rows' ? t.groupRows : t.groupCols}
                  </button>
                ))}
              </div>
            </div>

            <div className="import-groups">
              {groups.map((g) => (
                <section key={g} className="import-group">
                  <h3>{t.groupLabel(g)}</h3>
                  {players.map((p, i) =>
                    groupOf(p) !== g ? null : (
                      <div key={`${p.row}-${p.col}`} className="import-row">
                        <span className="swatch" style={{ background: classColor(p.classId) }} />
                        <input
                          value={p.name}
                          placeholder={reading ? '…' : t.classes[p.classId]}
                          maxLength={24}
                          onChange={(e) => update(i, { name: e.target.value })}
                        />
                        <select value={p.classId} onChange={(e) => update(i, { classId: e.target.value as ClassId })}>
                          {CLASS_IDS.map((id) => (
                            <option key={id} value={id}>
                              {t.classes[id]}
                            </option>
                          ))}
                        </select>
                        <select value={p.role} onChange={(e) => update(i, { role: e.target.value as Role })}>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t.roles[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ),
                  )}
                </section>
              ))}
            </div>
            <p className="import-note">{t.importNote}</p>
          </>
        )}

        <footer className="modal-footer">
          <button onClick={onClose}>{t.cancel}</button>
          <button className="primary" disabled={!players.length || reading} onClick={fill}>
            {t.fillBoard}
          </button>
        </footer>
      </div>
    </div>
  );
}
