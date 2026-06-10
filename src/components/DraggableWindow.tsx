import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

type Props = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  /** Initial top-left position in px (desktop only). Falls back to centered. */
  initial?: { x: number; y: number };
  /** Tailwind width (and optionally height) classes for the window shell. */
  width?: string;
  /** Tailwind classes for the body wrapper. Override to remove padding. */
  bodyClassName?: string;
  className?: string;
};

type Pos = { x: number; y: number };

// Below this width we drop the windowing metaphor: the window becomes a
// fixed, full-width sheet and dragging is disabled (miserable on phones).
const DRAG_BREAKPOINT = 640;

export default function DraggableWindow({
  title,
  eyebrow,
  children,
  onClose,
  onFocus,
  zIndex = 30,
  initial,
  width = 'w-[min(420px,calc(100vw-1.5rem))]',
  bodyClassName = 'px-5 py-5',
  className = '',
}: Props) {
  const winRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef<Pos>({ x: 0, y: 0 });
  const [pos, setPos] = useState<Pos | null>(initial ?? null);
  const [dragging, setDragging] = useState(false);
  const [canDrag, setCanDrag] = useState(true);

  useEffect(() => {
    const update = () => setCanDrag(window.innerWidth >= DRAG_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function clamp(x: number, y: number): Pos {
    const win = winRef.current;
    const w = win?.offsetWidth ?? 0;
    const h = win?.offsetHeight ?? 0;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }

  // Keep an initial / dragged position inside the viewport on mount and resize.
  useLayoutEffect(() => {
    if (!canDrag || !pos) return;
    const next = clamp(pos.x, pos.y);
    if (next.x !== pos.x || next.y !== pos.y) setPos(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDrag]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onFocus?.();
    if (!canDrag) return;
    const win = winRef.current;
    if (!win) return;
    const rect = win.getBoundingClientRect();
    dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setPos(clamp(event.clientX - dragOffset.current.x, event.clientY - dragOffset.current.y));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const positioned = canDrag && pos;

  return (
    <div
      ref={winRef}
      role="dialog"
      aria-label={title}
      onPointerDown={() => onFocus?.()}
      style={positioned ? { left: pos!.x, top: pos!.y, zIndex } : { zIndex }}
      className={`${
        positioned ? 'fixed' : 'fixed left-1/2 top-20 -translate-x-1/2'
      } ${width} flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#06101d]/80 shadow-[0_0_60px_rgba(34,211,238,0.18)] backdrop-blur-2xl ${className}`}
    >
      <header
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`flex shrink-0 items-center justify-between gap-3 border-b border-cyan-300/15 bg-[#04101b]/80 px-4 py-2.5 ${
          canDrag ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        } select-none`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Close window"
              title="Close"
              className="group grid h-3 w-3 place-items-center rounded-full bg-rose-400/90 text-[8px] font-bold leading-none text-transparent shadow-[0_0_7px_rgba(251,113,133,0.5)] transition hover:text-rose-950/80"
            >
              ✕
            </button>
          )}
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">{title}</p>
        </div>
      </header>

      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200/55">{eyebrow}</p>
        )}
        {children}
      </div>
    </div>
  );
}
