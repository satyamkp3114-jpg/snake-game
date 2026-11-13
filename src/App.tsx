import { useCallback, useEffect, useRef, useState } from 'react';
import { SnakeEngine, type Dir, type EngineState } from './game/engine';
import { loadScores, saveScore, type ScoreEntry } from './game/scores';

const KEYMAP: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const [state, setState] = useState<EngineState>({ phase: 'start', score: 0, best: 0, combo: 0, length: 3 });
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [lastRank, setLastRank] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [scoreBump, setScoreBump] = useState(0);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // boot engine
  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new SnakeEngine(canvas);
    engineRef.current = engine;
    engine.setBest(loadScores()[0]?.score ?? 0);
    engine.onChange = s => {
      setState(prev => {
        if (s.score !== prev.score) setScoreBump(b => b + 1);
        return s;
      });
    };
    engine.onGameOver = score => {
      const len = engine.length;
      const res = saveScore({ score, length: len, date: Date.now() });
      setScores(res.scores);
      setLastRank(score > 0 ? res.rank : -1);
    };
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas.parentElement!);
    const onVis = () => { if (document.hidden) engine.pause(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { ro.disconnect(); engine.destroy(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current!;
      const dir = KEYMAP[e.key];
      if (dir) {
        e.preventDefault();
        if (eng.phase === 'start' || eng.phase === 'dead') eng.start();
        eng.setDirection(dir);
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (eng.phase === 'start' || eng.phase === 'dead') eng.start();
        else eng.togglePause();
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        eng.togglePause();
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted(m => { engineRef.current!.muted = !m; return !m; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // touch / swipe
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = touchStart.current;
    if (!s || e.pointerType === 'mouse') return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    const threshold = 18;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    engineRef.current!.setDirection(dir);
    // re-anchor so continuous swipes register quickly
    touchStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, []);
  const onPointerUp = useCallback(() => { touchStart.current = null; }, []);

  const start = () => engineRef.current!.start();
  const togglePause = () => engineRef.current!.togglePause();
  const dpad = (d: Dir) => () => {
    const eng = engineRef.current!;
    if (eng.phase === 'start' || eng.phase === 'dead') eng.start();
    eng.setDirection(d);
  };

  const { phase, score, best, combo, length } = state;

  return (
    <div className="min-h-dvh w-full bg-[#070a12] text-slate-100 flex flex-col items-center select-none overflow-hidden font-sans"
      style={{ touchAction: 'none' }}>
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-pink-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* HUD */}
      <header className="relative z-10 w-full max-w-[min(92vw,620px)] flex items-end justify-between pt-4 pb-2 px-1">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Score</div>
          <div key={scoreBump} className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-300 drop-shadow-[0_0_12px_rgba(61,255,180,0.6)] animate-[bump_0.25s_ease-out]">
            {score}
          </div>
        </div>
        <div className="flex flex-col items-center h-full justify-end">
          <h1 className="text-sm sm:text-base font-extrabold tracking-[0.35em] bg-gradient-to-r from-emerald-300 via-teal-200 to-pink-300 bg-clip-text text-transparent">
            NEON SNAKE
          </h1>
          <div className={`mt-1 text-xs font-bold tabular-nums transition-all duration-150 ${combo > 1 ? 'text-amber-300 scale-110 opacity-100' : 'opacity-0 scale-75'}`}>
            COMBO ×{Math.min(combo, 8)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Best</div>
          <div className="text-3xl sm:text-4xl font-black tabular-nums text-pink-300 drop-shadow-[0_0_12px_rgba(255,92,138,0.5)]">{best}</div>
        </div>
      </header>

      {/* Board */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center px-2 pb-2 min-h-0">
        <div className="relative w-[min(92vw,620px,calc(100dvh-230px))] aspect-square"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-br from-emerald-400/60 via-teal-500/20 to-pink-500/60 blur-[1px]" />
          <div className="absolute inset-0 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_60px_rgba(61,255,180,0.12)] flex items-center justify-center bg-[#0b0f1a]">
            <canvas ref={canvasRef} className="block" />
          </div>

          {/* Overlays */}
          {phase === 'start' && (
            <Overlay>
              <div className="text-5xl sm:text-6xl mb-2">🐍</div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-300 to-pink-300 bg-clip-text text-transparent">NEON SNAKE</h2>
              <p className="mt-2 text-sm text-slate-300 max-w-xs">Eat orbs, chain combos for multipliers, grab gold stars for a bonus. Don't bite yourself.</p>
              <button onClick={start} className="mt-6 px-8 py-3 rounded-full bg-emerald-400 text-slate-900 font-black tracking-wider shadow-[0_0_30px_rgba(61,255,180,0.6)] hover:scale-105 active:scale-95 transition-transform animate-[glow_1.6s_ease-in-out_infinite]">
                PLAY
              </button>
              <div className="mt-5 text-[11px] text-slate-400 space-y-1">
                <div><Kbd>↑↓←→</Kbd> / <Kbd>WASD</Kbd> or swipe to move</div>
                <div><Kbd>Space</Kbd> pause · <Kbd>M</Kbd> mute</div>
              </div>
              {scores.length > 0 && <ScoreTable scores={scores} compact />}
            </Overlay>
          )}
          {phase === 'paused' && (
            <Overlay>
              <h2 className="text-3xl font-black tracking-widest">PAUSED</h2>
              <p className="mt-2 text-sm text-slate-300">Score {score} · Length {length}</p>
              <button onClick={togglePause} className="mt-6 px-8 py-3 rounded-full bg-emerald-400 text-slate-900 font-black tracking-wider hover:scale-105 active:scale-95 transition-transform">RESUME</button>
              <button onClick={start} className="mt-3 text-xs text-slate-400 hover:text-white underline-offset-4 hover:underline">Restart</button>
            </Overlay>
          )}
          {phase === 'dead' && (
            <Overlay delay>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-pink-300 drop-shadow-[0_0_20px_rgba(255,92,138,0.6)]">GAME OVER</h2>
              <div className="mt-3 text-5xl font-black tabular-nums text-white">{score}</div>
              {lastRank === 0 && score > 0 && <div className="mt-1 text-amber-300 font-bold text-sm animate-bounce">✨ NEW HIGH SCORE ✨</div>}
              {lastRank > 0 && <div className="mt-1 text-slate-300 text-xs">Ranked #{lastRank + 1}</div>}
              <button onClick={start} autoFocus className="mt-5 px-8 py-3 rounded-full bg-emerald-400 text-slate-900 font-black tracking-wider shadow-[0_0_30px_rgba(61,255,180,0.6)] hover:scale-105 active:scale-95 transition-transform">
                PLAY AGAIN
              </button>
              <p className="mt-2 text-[11px] text-slate-400">or press any arrow key / tap</p>
              <ScoreTable scores={scores} highlight={lastRank} compact />
            </Overlay>
          )}
        </div>
      </main>

      {/* Footer controls */}
      <footer className="relative z-10 w-full max-w-[min(92vw,620px)] flex items-center justify-between pb-4 px-2">
        <button onClick={() => setMuted(m => { engineRef.current!.muted = !m; return !m; })}
          className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 active:scale-95 transition text-lg">
          {muted ? '🔇' : '🔊'}
        </button>

        {/* D-pad for touch */}
        <div className="grid grid-cols-3 gap-1 sm:hidden">
          <span />
          <DBtn label="▲" onPress={dpad('up')} />
          <span />
          <DBtn label="◀" onPress={dpad('left')} />
          <DBtn label="▼" onPress={dpad('down')} />
          <DBtn label="▶" onPress={dpad('right')} />
        </div>
        <div className="hidden sm:block text-[11px] text-slate-500">Length <span className="text-slate-300 font-bold tabular-nums">{length}</span></div>

        <button onClick={() => { const e = engineRef.current!; if (e.phase === 'start' || e.phase === 'dead') e.start(); else e.togglePause(); }}
          className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 active:scale-95 transition text-lg">
          {phase === 'playing' ? '⏸' : '▶'}
        </button>
      </footer>
    </div>
  );
}

function Overlay({ children, delay }: { children: React.ReactNode; delay?: boolean }) {
  return (
    <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-[#070a12]/70 backdrop-blur-[3px] animate-[fadeIn_0.35s_ease-out_both]"
      style={delay ? { animationDelay: '0.45s' } : undefined}>
      <div className="flex flex-col items-center text-center px-6 w-full max-h-full overflow-y-auto py-4 animate-[popIn_0.4s_cubic-bezier(0.2,1.4,0.4,1)_both]"
        style={delay ? { animationDelay: '0.45s' } : undefined}>
        {children}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-white/10 ring-1 ring-white/15 font-mono text-[10px] text-slate-200">{children}</kbd>;
}

function DBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onPress(); }}
      className="h-12 w-12 rounded-xl bg-white/5 ring-1 ring-white/10 active:bg-emerald-400/30 active:scale-95 transition text-emerald-200 text-base">
      {label}
    </button>
  );
}

function ScoreTable({ scores, highlight = -1, compact }: { scores: ScoreEntry[]; highlight?: number; compact?: boolean }) {
  const list = compact ? scores.slice(0, 5) : scores;
  if (!list.length) return null;
  return (
    <div className="mt-5 w-full max-w-[260px]">
      <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-1.5">High Scores</div>
      <ol className="space-y-0.5">
        {list.map((s, i) => (
          <li key={s.date + '-' + i}
            className={`flex items-center justify-between text-xs px-2.5 py-1 rounded-md tabular-nums ${i === highlight ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40' : 'bg-white/5 text-slate-300'}`}>
            <span className="flex items-center gap-2">
              <span className={`w-4 text-right font-bold ${i === 0 ? 'text-amber-300' : 'text-slate-500'}`}>{i + 1}</span>
              <span className="font-bold">{s.score}</span>
            </span>
            <span className="text-slate-500">len {s.length} · {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
      }
