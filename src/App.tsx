import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Hud from './components/Hud';
import { SECTIONS } from './sectionConfig';
import Home from './sections/Home';
import About from './sections/About';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Contact from './sections/Contact';
import type { World } from './world/World';

type Status = 'loading' | 'ready' | 'fallback';

const LAST = SECTIONS.length - 1;

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

function Stage({ id, shown, children }: { id: string; shown: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`stage stage-${id} ${shown ? 'is-shown' : ''}`} aria-hidden={!shown} inert={!shown}>
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

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const activeRef = useRef(initialIndex);
  const busy = useRef(true);
  // one queued destination for clicks/keys pressed mid-flight (wheel input is never queued)
  const pending = useRef<number | null>(null);
  const navigateRef = useRef<(next: number) => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let world: World | null = null;

    const fallback = () => {
      if (disposed) return;
      busy.current = false;
      setStatus('fallback');
      setShown(activeRef.current);
    };

    import('./world/World')
      .then(({ World }) => {
        if (disposed || !containerRef.current) return;
        try {
          world = new World(containerRef.current, initialIndex, {
            reducedMotion: prefersReducedMotion(),
            onReady: () => setStatus('ready'),
          });
        } catch (err) {
          console.error(err);
          fallback();
          return;
        }
        worldRef.current = world;
        const started = world;
        return started.start().then(() => {
          if (disposed) return;
          started.intro({
            onNear: () => setShown(activeRef.current),
            onArrive: () => {
              busy.current = false;
              const queued = pending.current;
              pending.current = null;
              if (queued !== null) navigateRef.current(queued);
            },
          });
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
    if (next < 0 || next > LAST) return;
    if (busy.current) {
      if (queue) pending.current = next;
      return;
    }
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
    busy.current = true;
    setShown(null);
    setTravelling(true);
    world.goTo(next, {
      onNear: () => setShown(next),
      onArrive: () => {
        busy.current = false;
        setTravelling(false);
        const queued = pending.current;
        pending.current = null;
        if (queued !== null) navigateRef.current(queued);
      },
    });
  }, []);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const navigateQueued = useCallback((next: number) => navigate(next, true), [navigate]);

  // wheel / keyboard / swipe → travel
  useEffect(() => {
    let quietUntil = 0;
    let acc = 0;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (canScroll(e.target, dy)) {
        quietUntil = now + 260;
        acc = 0;
        return;
      }
      e.preventDefault();
      // swallow trackpad inertia: a new gesture needs a short pause first
      if (busy.current || now < quietUntil) {
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
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
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
      } else if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
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
  }, [navigate]);

  const stages = [<Home />, <About />, <Projects />, <Experience />, <Contact />];

  return (
    <div className={`app status-${status} ${travelling ? 'is-travelling' : ''}`}>
      <div className="world" ref={containerRef} aria-hidden="true" />
      <div className="world-shade" aria-hidden="true" />
      <div className="speed-fx" aria-hidden="true" />

      <Hud active={active} onNavigate={navigateQueued} />

      <main className="stages">
        {SECTIONS.map((s, i) => (
          <Stage key={s.id} id={s.id} shown={shown === i}>
            {stages[i]}
          </Stage>
        ))}
      </main>

      <div className="loader" aria-hidden={status !== 'loading'}>
        <p className="loader-name">
          <em>Justin</em> Ye
        </p>
        <p className="loader-text">generating world</p>
        <span className="loader-bar" />
      </div>
    </div>
  );
}

export default App;
