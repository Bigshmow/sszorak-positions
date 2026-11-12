import { useRef, useState, type PointerEvent, type RefObject } from 'react';

export interface Pos {
  x: number;
  y: number;
}

export interface HalfExtent {
  w: number;
  h: number;
}

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  origin: Pos;
  rect: DOMRect;
  half: HalfExtent;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function useDrag(
  containerRef: RefObject<HTMLElement | null>,
  onMove: (id: string, pos: Pos) => void,
) {
  const drag = useRef<DragState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const end = (e: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    setDraggingId(null);
  };

  const dragProps = (id: string, origin: Pos, half: HalfExtent) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const container = containerRef.current;
      if (e.button !== 0 || !container) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origin,
        rect: container.getBoundingClientRect(),
        half,
      };
      setDraggingId(id);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== id || d.pointerId !== e.pointerId) return;
      const x = d.origin.x + ((e.clientX - d.startX) / d.rect.width) * 100;
      const y = d.origin.y + ((e.clientY - d.startY) / d.rect.height) * 100;
      onMove(id, {
        x: round1(clamp(x, d.half.w, 100 - d.half.w)),
        y: round1(clamp(y, d.half.h, 100 - d.half.h)),
      });
    },
    onPointerUp: end,
    onPointerCancel: end,
  });

  return { draggingId, dragProps };
}
