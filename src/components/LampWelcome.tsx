import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import './LampWelcome.css';

type Props = { children?: ReactNode };

const particles = Array.from({ length: 26 }, (_, i) => ({
  left: `${8 + ((i * 37) % 84)}%`,
  top: `${10 + ((i * 23) % 76)}%`,
  delay: `${(i % 9) * -0.7}s`,
  duration: `${5 + (i % 6)}s`,
  size: `${2 + (i % 3)}px`,
}));

export function LampWelcome({ children }: Props) {
  const [lit, setLit] = useState(false);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const activePointer = useRef<number | null>(null);
  const currentPull = useRef(0);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (lit) return;
    activePointer.current = event.pointerId;
    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging || activePointer.current !== event.pointerId || lit) return;
    const distance = Math.max(0, Math.min(105, event.clientY - startY.current));
    currentPull.current = distance;
    setPull(distance);
  }

  function finishPull(event?: PointerEvent<HTMLButtonElement>) {
    if (event && activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setDragging(false);
    if (currentPull.current >= 38) {
      setLit(true);
    }
    setPull(0);
    currentPull.current = 0;
  }

  function activateByButton() {
    if (!lit) { setLit(true); setPull(0); currentPull.current = 0; }
  }

  return (
    <main className={`belucih-lamp-screen ${lit ? 'is-lit' : ''}`}>
      <div className="belucih-room-grain" aria-hidden="true" />
      <div className="belucih-light-beam" aria-hidden="true" />
      <div className="belucih-dust" aria-hidden="true">
        {particles.map((p, i) => <i key={i} style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size } as React.CSSProperties} />)}
      </div>

      <div className="belucih-layout">
        <section className="belucih-lamp-side" aria-label="Lampu meja BELUCIH">
          <div className="belucih-window-glow" />
          <div className="belucih-desk">
            <div className="belucih-desk-edge" />
            <div className="belucih-book book-one" />
            <div className="belucih-book book-two" />
          </div>
          <div className="belucih-table-lamp">
            <div className="belucih-lamp-head"><span /></div>
            <div className="belucih-lamp-arm arm-one" />
            <div className="belucih-lamp-arm arm-two" />
            <div className="belucih-lamp-joint joint-one" />
            <div className="belucih-lamp-joint joint-two" />
            <div className="belucih-lamp-stem" />
            <div className="belucih-lamp-base" />
          </div>
          <div className="belucih-pull-cord" aria-hidden="true" />
          <button
            className={`belucih-pull-handle ${dragging ? 'is-dragging' : ''} ${lit ? 'is-pulled' : ''}`}
            type="button"
            aria-label="Tarik tali untuk menyalakan lampu"
            disabled={lit}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={finishPull}
            onPointerCancel={finishPull}
            onClick={activateByButton}
            style={{ transform: `translateY(${pull}px)` }}
          ><span /></button>
          <div className="belucih-lamp-caption">
            <span className="belucih-status-dot" />
            {lit ? 'CAHAYA TELAH MENYALA' : 'TARIK TALI UNTUK MEMULAI'}
          </div>
          {!lit && <button type="button" className="belucih-light-fallback" onClick={activateByButton}>Nyalakan lampu <span>↗</span></button>}
        </section>

        <section className={`belucih-auth-side ${lit ? 'auth-visible' : ''}`} aria-hidden={!lit}>
          <div className="belucih-auth-intro">
            <span className="belucih-brand-mark">B.</span>
            <p className="belucih-overline">SELAMAT DATANG DI</p>
            <h1>BELUCIH<span>.</span></h1>
            <p className="belucih-tagline">Temukan keindahan dalam setiap pilihan.</p>
          </div>
          <div className="belucih-auth-card">{lit ? children : null}</div>
          <p className="belucih-privacy-note">RUANG KECIL UNTUK PILIHAN YANG BERARTI</p>
        </section>
      </div>
      <span className="belucih-corner-signature">BELUCIH <b>®</b></span>
    </main>
  );
}

