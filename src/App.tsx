import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Hud from './components/Hud';
import { SECTIONS } from './sectionConfig';
import Home from './sections/Home';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';
import type { World } from './world/World';

type Status = 'loading' | 'ready' | 'fallback';

const LAST = SECTIONS.length - 1;
// keep the loading screen up a little after the world is ready, so it doesn't flash by
const LOADER_HOLD_MS = 500;
// brief pause after the reveal starts before the camera sets off toward the first stop
const INTRO_DELAY_MS = 200;
// how much faster look-around turns for a touch swipe than for a mouse drag
const TOUCH_LOOK_SPEED = 2.2;
// A fixed scatter of twinkling stars for the loading screen's night sky.
const LOADER_STARS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 90 }, () => ({
    left: rand() * 100,
    top: rand() * 78,
    size: rand() < 0.12 ? 2.6 : 1.2 + rand() * 1.1,
    delay: rand() * 4,
    duration: 2.5 + rand() * 3,
  }));
})();

function indexFromHash() {
  const i = SECTIONS.findIndex((s) => `#${s.id}` === window.location.hash);
  return i < 0 ? 0 : i;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Walk up from the event target: is there a scroll container that can still move this way?
function canScroll(target: EventTarget | null, dir: number, axis: 'x' | 'y' = 'y') {
  let el = target instanceof Element ? (target as HTMLElement) : null;
  while (el && el !== document.body) {
    if (el.hasAttribute('data-scroll')) {
      if (axis === 'y' && el.scrollHeight > el.clientHeight + 1) {
        if (dir > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dir < 0 && el.scrollTop > 1) return true;
      }
      if (axis === 'x' && el.scrollWidth > el.clientWidth + 1) {
        if (dir > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
        if (dir < 0 && el.scrollLeft > 1) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

// Is the target inside a scroll area that is actually scrollable in this layout (e.g. the
// projects list on phones)? Vertical swipes there only ever scroll, never travel.
function inScrollArea(target: EventTarget | null) {
  const el = target instanceof Element ? target.closest('[data-scroll]') : null;
  if (!el) return false;
  const { overflowY } = getComputedStyle(el);
  return overflowY === 'auto' || overflowY === 'scroll';
}

function Stage({ id, shown, hidden, children }: { id: string; shown: boolean; hidden: boolean; children: ReactNode }) {
  // `hidden`: faded out for look-around mode, but keeps its revealed state for when it returns
  return (
    <section
      id={id}
      className={`stage stage-${id} ${shown ? 'is-shown' : ''}`}
      aria-hidden={!shown || hidden}
      inert={!shown || hidden}
    >
      {children}
    </section>
  );
}

function App() {
  const [initialIndex] = useState(indexFromHash);
  const [active, setActive] = useState(initialIndex);
  const [shown, setShown] = useState<number | null>(null);
  const [travelling, setTravelling] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  // the camera has come to a full stop at the active section
  const [settled, setSettled] = useState(false);
  // look-around mode: text hidden, drag to turn the camera in place
  const [viewing, setViewing] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  // project the cabin TV is showing
  const [preview, setPreview] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const activeRef = useRef(initialIndex);
  // input is held until the intro flight begins; after that, any input (even mid-flight)
  // redirects the camera straight away
  const locked = useRef(true);
  // one destination clicked/keyed during the loading screen (wheel input is never queued)
  const pending = useRef<number | null>(null);
  const navigateRef = useRef<(next: number) => void>(() => {});
  const viewingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let world: World | null = null;

    const fallback = () => {
      if (disposed) return;
      locked.current = false;
      setStatus('fallback');
      setShown(activeRef.current);
    };

    import('./world/World')
      .then(({ World }) => {
        if (disposed || !containerRef.current) return;
        try {
          world = new World(containerRef.current, initialIndex, {
            reducedMotion: prefersReducedMotion(),
            onReady: () => setTimeout(() => !disposed && setStatus('ready'), prefersReducedMotion() ? 0 : LOADER_HOLD_MS),
          });
        } catch (err) {
          console.error(err);
          fallback();
          return;
        }
        worldRef.current = world;
        const started = world;
        return started
          .start()
          // start flying shortly after the reveal begins, so the fade and the move overlap
          .then(
            () =>
              new Promise((resolve) =>
                setTimeout(resolve, prefersReducedMotion() ? 0 : LOADER_HOLD_MS + INTRO_DELAY_MS),
              ),
          )
          .then(() => {
            if (disposed) return;
            started.intro({
              onNear: () => setShown(activeRef.current),
              onArrive: () => setSettled(true),
            });
            locked.current = false;
            const queued = pending.current;
            pending.current = null;
            if (queued !== null) navigateRef.current(queued);
          });
      })
      .catch((err) => {
        console.error(err);
        fallback();
      });

    return () => {
      disposed = true;
      world?.dispose();
      worldRef.current = null;
    };
  }, [initialIndex]);

  const navigate = useCallback((next: number, queue = false) => {
    if (next < 0 || next > LAST || viewingRef.current) return;
    if (locked.current) {
      if (queue) pending.current = next;
      return;
    }
    // already there, or already on the way
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', next === 0 ? pathname + search : `#${SECTIONS[next].id}`);

    const world = worldRef.current;
    if (!world) {
      setShown(next);
      return;
    }
    // (mid-flight, the world turns the camera toward the new stop and drops the old
    // flight's callbacks)
    setShown(null);
    setPreview(null);
    setTravelling(true);
    setSettled(false);
    world.goTo(next, {
      onNear: () => setShown(next),
      onArrive: () => {
        setTravelling(false);
        setSettled(true);
      },
    });
  }, []);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const navigateQueued = useCallback((next: number) => navigate(next, true), [navigate]);

  const setView = useCallback((on: boolean) => {
    viewingRef.current = on;
    setViewing(on);
    // (the cabin TV keeps playing whichever project was last picked)
    worldRef.current?.setLookAround(on);
  }, []);
  const toggleView = useCallback(() => setView(!viewingRef.current), [setView]);

  // wheel / keyboard / swipe → travel
  useEffect(() => {
    let quietUntil = 0;
    let acc = 0;

    const onWheel = (e: WheelEvent) => {
      if (viewingRef.current) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (inScrollArea(e.target) || canScroll(e.target, dy)) {
        quietUntil = now + 260;
        acc = 0;
        return;
      }
      e.preventDefault();
      // swallow trackpad inertia: a new gesture needs a short pause first
      if (locked.current || now < quietUntil) {
        quietUntil = Math.max(quietUntil, now + 160);
        acc = 0;
        return;
      }
      acc += dy;
      if (Math.abs(acc) > 30) {
        navigate(activeRef.current + Math.sign(acc));
        acc = 0;
        quietUntil = now + 160;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (viewingRef.current) {
        if (e.key === 'Escape') setView(false);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const onControl = tag === 'BUTTON' || tag === 'A';
      let next: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') next = activeRef.current + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') next = activeRef.current - 1;
      else if (e.key === ' ' && !onControl) next = activeRef.current + (e.shiftKey ? -1 : 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = LAST;
      if (next === null) return;
      e.preventDefault();
      if (!e.repeat) navigate(next, true);
    };

    let sx = 0;
    let sy = 0;
    let canDown = false;
    let canUp = false;
    let canRight = false;
    let canLeft = false;
    let lockY = false;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      lockY = inScrollArea(e.target);
      canDown = canScroll(e.target, 1);
      canUp = canScroll(e.target, -1);
      canRight = canScroll(e.target, 1, 'x');
      canLeft = canScroll(e.target, -1, 'x');
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0 && !canRight) navigate(activeRef.current + 1);
        else if (dx > 0 && !canLeft) navigate(activeRef.current - 1);
      } else if (!lockY && Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0 && !canDown) navigate(activeRef.current + 1);
        else if (dy > 0 && !canUp) navigate(activeRef.current - 1);
      }
    };

    const onHash = () => navigate(indexFromHash());

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('hashchange', onHash);
    };
  }, [navigate, setView]);

  // look-around: drag (mouse) or swipe (touch) anywhere to turn the camera
  useEffect(() => {
    if (!viewing) return;
    let drag: { id: number; x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target instanceof Element && e.target.closest('button, a')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      setGrabbing(true);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      // phone screens are small, so a swipe turns further than a mouse drag
      const k = e.pointerType === 'mouse' ? 1 : TOUCH_LOOK_SPEED;
      worldRef.current?.lookBy((e.clientX - drag.x) * k, (e.clientY - drag.y) * k);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      setGrabbing(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setGrabbing(false);
    };
  }, [viewing]);

  const previewProject = useCallback((index: number) => {
    if (viewingRef.current) return;
    setPreview(index);
    worldRef.current?.showProject(index);
  }, []);
  const stages = [<Home />, <Projects active={preview} onPreview={previewProject} />, <Experience />, <Contact />];

  return (
    <div
      className={`app status-${status} ${travelling ? 'is-travelling' : ''} ${viewing ? 'is-viewing' : ''} ${grabbing ? 'is-grabbing' : ''}`}
    >
      <div className="world" ref={containerRef} aria-hidden="true" />
      <div className="world-shade" aria-hidden="true" />
      <div className="speed-fx" aria-hidden="true" />

      <Hud
        active={active}
        onNavigate={navigateQueued}
        canView={status === 'ready' && settled}
        viewing={viewing}
        onToggleView={toggleView}
      />

      <main className="stages">
        {SECTIONS.map((s, i) => (
          <Stage key={s.id} id={s.id} shown={shown === i} hidden={viewing}>
            {stages[i]}
          </Stage>
        ))}
      </main>

      <div className="loader" aria-hidden={status !== 'loading'}>
        <div className="loader-stars">
          {LOADER_STARS.map((st, i) => (
            <span
              key={i}
              style={{
                left: `${st.left}%`,
                top: `${st.top}%`,
                width: st.size,
                height: st.size,
                animationDelay: `${st.delay}s`,
                animationDuration: `${st.duration}s`,
              }}
            />
          ))}
        </div>
        <p className="loader-name">
          <em>Justin Ye</em>
        </p>
        <p className="loader-text">loading world</p>
        <span className="loader-bar" />
      </div>
    </div>
  );
}

export default App;
