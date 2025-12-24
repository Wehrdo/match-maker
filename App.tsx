
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  createInitialGrid, 
  areMatchable, 
  getMatchPath,
  collapseEmptyRows, 
  refillGrid, 
  GRID_COLUMNS, 
  INITIAL_FILL_COUNT, 
  MAX_REFILLS 
} from './logic/gameLogic.ts';
import { CellValue } from './types.ts';
import NumberCell from './components/NumberCell.tsx';

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface MatchLine {
  segments: LineSegment[];
}

interface UndoSnapshot {
  grid: CellValue[];
  score: number;
}

interface SavedGameState {
  grid: CellValue[];
  refillsRemaining: number;
  score: number;
  undoUsed: boolean;
  undoSnapshot: UndoSnapshot | null;
}

const STORAGE_KEY = 'tenmaster-save';

const loadGameState = (): SavedGameState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as SavedGameState;
    }
  } catch (e) {
    console.warn('Failed to load saved game:', e);
  }
  return null;
};

const saveGameState = (state: SavedGameState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
};

const clearGameState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear saved game:', e);
  }
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<CellValue[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [refillsRemaining, setRefillsRemaining] = useState(MAX_REFILLS);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [activeMatchLine, setActiveMatchLine] = useState<MatchLine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [undoUsed, setUndoUsed] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winAnimationComplete, setWinAnimationComplete] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Load saved game or create new one on mount
  useEffect(() => {
    const saved = loadGameState();
    if (saved && saved.grid.length > 0) {
      setGrid(saved.grid);
      setRefillsRemaining(saved.refillsRemaining);
      setScore(saved.score);
      setUndoUsed(saved.undoUsed ?? false);
      setUndoSnapshot(saved.undoSnapshot ?? null);
    } else {
      setGrid(createInitialGrid(GRID_COLUMNS, INITIAL_FILL_COUNT));
    }
    setIsInitialized(true);
  }, []);

  // Save game state whenever it changes (after initialization)
  // Clear saved state when game is won (grid is empty)
  useEffect(() => {
    if (isInitialized) {
      if (grid.length > 0) {
        saveGameState({ grid, refillsRemaining, score, undoUsed, undoSnapshot });
      } else {
        // Game won - clear saved state so refresh starts fresh
        clearGameState();
      }
    }
  }, [grid, refillsRemaining, score, undoUsed, undoSnapshot, isInitialized]);

  const possibleMatchIndices = useMemo(() => {
    if (selectedIdx === null) return new Set<number>();
    const matches = new Set<number>();
    grid.forEach((_, idx) => {
      if (idx !== selectedIdx && areMatchable(selectedIdx, idx, grid, GRID_COLUMNS)) {
        matches.add(idx);
      }
    });
    return matches;
  }, [selectedIdx, grid]);

  const triggerMatchLine = (idx1: number, idx2: number) => {
    const el1 = document.getElementById(`cell-${idx1}`);
    const el2 = document.getElementById(`cell-${idx2}`);
    const container = gridRef.current;

    if (el1 && el2 && container) {
      const rect1 = el1.getBoundingClientRect();
      const rect2 = el2.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const x1 = rect1.left + rect1.width / 2 - containerRect.left;
      const y1 = rect1.top + rect1.height / 2 - containerRect.top;
      const x2 = rect2.left + rect2.width / 2 - containerRect.left;
      const y2 = rect2.top + rect2.height / 2 - containerRect.top;

      // Use the same path detection logic as the game matching
      const matchPath = getMatchPath(idx1, idx2, grid, GRID_COLUMNS);

      if (matchPath === 'sequential-wrap') {
        // Wrap-around match: draw lines showing the wrap
        // Line 1: from first cell to the right edge of its row
        // Line 2: from the left edge to the second cell
        const cellWidth = rect1.width;
        const rightEdge = containerRect.width - cellWidth / 2 + 4;
        const leftEdge = cellWidth / 2 - 4;

        setActiveMatchLine({
          segments: [
            { x1, y1, x2: rightEdge, y2: y1 },
            { x1: leftEdge, y1: y2, x2, y2 },
          ]
        });
      } else {
        // All other match types: draw a straight line
        setActiveMatchLine({
          segments: [{ x1, y1, x2, y2 }]
        });
      }

      setTimeout(() => setActiveMatchLine(null), 600);
    }
  };

  const handleCellClick = (idx: number) => {
    if (grid[idx] === null) return;

    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      if (areMatchable(selectedIdx, idx, grid, GRID_COLUMNS)) {
        // Save snapshot for undo (only if undo hasn't been used yet)
        if (!undoUsed) {
          setUndoSnapshot({ grid: [...grid], score });
        }
        
        triggerMatchLine(selectedIdx, idx);
        
        const newGrid = [...grid];
        newGrid[selectedIdx] = null;
        newGrid[idx] = null;
        
        setScore(prev => prev + 10);
        setSelectedIdx(null);
        
        setTimeout(() => {
          setGrid(prev => collapseEmptyRows(newGrid, GRID_COLUMNS));
          setMessage("Nice match!");
          setTimeout(() => setMessage(null), 1200);
        }, 300);
      } else {
        setSelectedIdx(idx);
      }
    }
  };

  const handleRefill = () => {
    if (refillsRemaining <= 0) {
      setMessage("No refills left!");
      setTimeout(() => setMessage(null), 1200);
      return;
    }
    setGrid(prev => refillGrid(prev, GRID_COLUMNS));
    setRefillsRemaining(prev => prev - 1);
    setMessage(`Refilled!`);
    setTimeout(() => setMessage(null), 1200);
  };

  const handleUndo = () => {
    if (undoUsed || !undoSnapshot) {
      setMessage("No undo available!");
      setTimeout(() => setMessage(null), 1200);
      return;
    }
    setGrid(undoSnapshot.grid);
    setScore(undoSnapshot.score);
    setUndoUsed(true);
    setUndoSnapshot(null);
    setSelectedIdx(null);
    setMessage("Move undone!");
    setTimeout(() => setMessage(null), 1200);
  };

  const handleReset = () => {
    if (confirm("Reset the game?")) {
      startNewGame();
    }
  };

  const startNewGame = () => {
    clearGameState();
    setGrid(createInitialGrid(GRID_COLUMNS, INITIAL_FILL_COUNT));
    setRefillsRemaining(MAX_REFILLS);
    setScore(0);
    setSelectedIdx(null);
    setUndoUsed(false);
    setUndoSnapshot(null);
    setShowWinAnimation(false);
    setWinAnimationComplete(false);
  };

  const stats = useMemo(() => {
    const counts = new Set(grid.filter(v => v !== null));
    return Array.from({ length: 9 }, (_, i) => ({
      num: i + 1,
      exists: counts.has(i + 1)
    }));
  }, [grid]);

  // Win when grid becomes empty (all rows collapsed) after initialization
  const isWin = useMemo(() => isInitialized && grid.length === 0, [grid, isInitialized]);

  // Generate stable confetti particles once
  const confettiParticles = useMemo(() => 
    [...Array(50)].map((_, i) => ({
      left: Math.random() * 100,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
      color: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'][i % 6],
    })), 
  []);

  // Trigger win animation when game is won
  useEffect(() => {
    if (isWin && !showWinAnimation) {
      setShowWinAnimation(true);
      // Animation phases complete after 3 seconds
      setTimeout(() => {
        setWinAnimationComplete(true);
      }, 3000);
    }
  }, [isWin, showWinAnimation]);

  return (
    <div 
      className="max-w-md mx-auto min-h-screen flex flex-col p-4 bg-slate-50 relative"
      onClick={() => setSelectedIdx(null)}
    >
      <header className="flex justify-between items-center mb-4 pt-2" onClick={(e) => e.stopPropagation()}>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">TEN MASTER</h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Puzzle Challenge</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-blue-600 tabular-nums">{score}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Points</p>
        </div>
      </header>

      <div 
        ref={gridRef}
        className="flex-1 bg-white border-t border-l border-slate-200 shadow-sm overflow-y-auto max-h-[65vh] relative"
      >
        {isWin ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {showWinAnimation && confettiParticles.map((particle, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{
                    left: `${particle.left}%`,
                    top: '-20px',
                    backgroundColor: particle.color,
                    animation: `confettiFall ${particle.duration}s ease-out ${particle.delay}s forwards`,
                    transform: `rotate(${particle.rotation}deg)`,
                  }}
                />
              ))}
            </div>

            {/* Radial burst effect */}
            <div 
              className={`absolute inset-0 pointer-events-none ${showWinAnimation ? 'animate-ping' : ''}`}
              style={{
                background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
                animationDuration: '1s',
                animationIterationCount: '1',
              }}
            />

            {/* Trophy with scaling animation */}
            <div 
              className={`text-7xl mb-4 ${showWinAnimation ? 'trophy-entrance' : ''}`}
              style={{
                filter: 'drop-shadow(0 4px 20px rgba(251, 191, 36, 0.5))',
              }}
            >
              🏆
            </div>

            {/* Title with staggered letter animation */}
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 mb-2 victory-text">
              VICTORY!
            </h2>

            {/* Score display with pop animation */}
            <div className={`text-5xl font-black text-blue-600 mb-2 ${showWinAnimation ? 'score-pop' : ''}`}>
              {score}
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-4">Final Score</p>

            <p className="text-slate-500 mb-6 fade-in-up">You've cleared the board like a true master!</p>
            
            {/* New Game button - only shows after animation completes */}
            <button 
              onClick={startNewGame}
              className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 shadow-xl transform transition-all duration-300 hover:scale-105 ${
                winAnimationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <i className="fa-solid fa-play mr-2"></i>
              NEW GAME
            </button>

            <style>{`
              @keyframes confettiFall {
                0% {
                  transform: translateY(0) rotate(0deg);
                  opacity: 1;
                }
                100% {
                  transform: translateY(500px) rotate(720deg);
                  opacity: 0;
                }
              }
              
              .trophy-entrance {
                animation: trophyBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
              }
              
              @keyframes trophyBounce {
                0% {
                  transform: scale(0) rotate(-20deg);
                  opacity: 0;
                }
                50% {
                  transform: scale(1.3) rotate(10deg);
                }
                70% {
                  transform: scale(0.9) rotate(-5deg);
                }
                100% {
                  transform: scale(1) rotate(0deg);
                  opacity: 1;
                }
              }
              
              .victory-text {
                animation: victoryShine 2s ease-in-out infinite;
              }
              
              @keyframes victoryShine {
                0%, 100% {
                  background-size: 200% 200%;
                  background-position: left center;
                }
                50% {
                  background-size: 200% 200%;
                  background-position: right center;
                }
              }
              
              .score-pop {
                animation: scorePop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both;
              }
              
              @keyframes scorePop {
                0% {
                  transform: scale(0);
                  opacity: 0;
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                }
              }
              
              .fade-in-up {
                animation: fadeInUp 0.5s ease-out 0.5s both;
              }
              
              @keyframes fadeInUp {
                0% {
                  transform: translateY(20px);
                  opacity: 0;
                }
                100% {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        ) : (
          <div 
            className="grid"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}
            onClick={(e) => e.stopPropagation()}
          >
            {grid.map((val, idx) => (
              <NumberCell
                key={`${idx}-${val}`}
                id={`cell-${idx}`}
                value={val}
                isSelected={selectedIdx === idx}
                isPossibleMatch={possibleMatchIndices.has(idx)}
                onClick={() => handleCellClick(idx)}
              />
            ))}
          </div>
        )}

        {activeMatchLine && (
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
            {activeMatchLine.segments.map((seg, i) => (
              <line 
                key={i}
                x1={seg.x1} 
                y1={seg.y1} 
                x2={seg.x2} 
                y2={seg.y2} 
                stroke="#3b82f6" 
                strokeWidth="4" 
                strokeLinecap="round"
                className="animate-pulse opacity-0"
                style={{
                  animation: 'fadeLine 0.6s ease-out forwards'
                }}
              />
            ))}
            <style>{`
              @keyframes fadeLine {
                0% { opacity: 0; stroke-width: 8; }
                20% { opacity: 1; stroke-width: 6; }
                100% { opacity: 0; stroke-width: 2; }
              }
            `}</style>
          </svg>
        )}

        {message && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center z-50 pointer-events-none">
            <div className="bg-slate-900 text-white text-[10px] px-4 py-2 rounded-full shadow-2xl animate-bounce uppercase font-bold tracking-widest whitespace-nowrap">
              {message}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between px-2" onClick={(e) => e.stopPropagation()}>
        {stats.map(s => (
          <div 
            key={s.num}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${
              s.exists ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-slate-200 text-slate-400 opacity-40'
            }`}
          >
            {s.num}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={handleRefill}
          disabled={refillsRemaining === 0}
          className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all shadow-sm ${
            refillsRemaining > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
          }`}
        >
          <i className="fa-solid fa-layer-group text-sm mb-1"></i>
          <span className="text-[9px] font-black">REFILL ({refillsRemaining})</span>
        </button>

        <button 
          onClick={handleUndo}
          disabled={undoUsed || !undoSnapshot}
          className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all shadow-sm ${
            !undoUsed && undoSnapshot ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
          }`}
        >
          <i className="fa-solid fa-arrow-rotate-left text-sm mb-1"></i>
          <span className="text-[9px] font-black">UNDO {undoUsed ? '(USED)' : '(1)'}</span>
        </button>

        <button onClick={handleReset} className="bg-white border border-slate-200 flex flex-col items-center justify-center py-3 rounded-xl shadow-sm text-slate-700">
          <i className="fa-solid fa-rotate-left text-sm mb-1 text-red-400"></i>
          <span className="text-[9px] font-black uppercase tracking-tighter">Reset</span>
        </button>
      </div>

      <footer className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
        Matches: Identical or Sum 10
      </footer>
    </div>
  );
};

export default App;