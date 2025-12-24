
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- TYPES ---
type CellValue = number | null;

interface MatchLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- CONSTANTS ---
const GRID_COLUMNS = 10;
const INITIAL_FILL_COUNT = 35;
const MAX_REFILLS = 5;

// --- LOGIC ---
const createInitialGrid = (cols: number, fillCount: number): CellValue[] => {
  const grid: CellValue[] = [];
  for (let i = 0; i < fillCount; i++) {
    grid.push(Math.floor(Math.random() * 9) + 1);
  }
  const remainingInRow = cols - (grid.length % cols);
  if (remainingInRow < cols && remainingInRow !== 0) {
    for (let i = 0; i < remainingInRow; i++) {
      grid.push(null);
    }
  }
  return grid;
};

const getPos = (idx: number, cols: number) => ({
  x: idx % cols,
  y: Math.floor(idx / cols),
});

const getIdx = (x: number, y: number, cols: number) => y * cols + x;

const areMatchable = (idx1: number, idx2: number, grid: CellValue[], cols: number): boolean => {
  const v1 = grid[idx1];
  const v2 = grid[idx2];

  if (v1 === null || v2 === null || idx1 === idx2) return false;
  
  const valuesMatch = (v1 + v2 === 10) || (v1 === v2);
  if (!valuesMatch) return false;

  const pos1 = getPos(idx1, cols);
  const pos2 = getPos(idx2, cols);

  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
  let sequentialClear = true;
  for (let i = start + 1; i < end; i++) {
    if (grid[i] !== null) {
      sequentialClear = false;
      break;
    }
  }
  if (sequentialClear) return true;

  if (pos1.y === pos2.y) {
    const minX = Math.min(pos1.x, pos2.x);
    const maxX = Math.max(pos1.x, pos2.x);
    for (let x = minX + 1; x < maxX; x++) {
      if (grid[getIdx(x, pos1.y, cols)] !== null) return false;
    }
    return true;
  }

  if (pos1.x === pos2.x) {
    const minY = Math.min(pos1.y, pos2.y);
    const maxY = Math.max(pos1.y, pos2.y);
    for (let y = minY + 1; y < maxY; y++) {
      if (grid[getIdx(pos1.x, y, cols)] !== null) return false;
    }
    return true;
  }

  if (absDx === absDy) {
    const stepX = dx / (absDx || 1);
    const stepY = dy / (absDy || 1);
    for (let i = 1; i < absDx; i++) {
      const curX = pos1.x + i * stepX;
      const curY = pos1.y + i * stepY;
      if (grid[getIdx(curX, curY, cols)] !== null) return false;
    }
    return true;
  }

  return false;
};

const collapseEmptyRows = (grid: CellValue[], cols: number): CellValue[] => {
  const newGrid: CellValue[] = [];
  const rows = Math.ceil(grid.length / cols);
  for (let y = 0; y < rows; y++) {
    const row = grid.slice(y * cols, (y + 1) * cols);
    if (row.some(val => val !== null)) {
      newGrid.push(...row);
    }
  }
  return newGrid;
};

const refillGrid = (grid: CellValue[], cols: number): CellValue[] => {
  const existingNumbers = grid.filter(val => val !== null);
  let lastIndex = -1;
  for (let i = grid.length - 1; i >= 0; i--) {
    if (grid[i] !== null) {
      lastIndex = i;
      break;
    }
  }
  if (lastIndex === -1) {
    return createInitialGrid(cols, INITIAL_FILL_COUNT);
  }
  const prunedGrid = grid.slice(0, lastIndex + 1);
  const nextGrid = [...prunedGrid, ...existingNumbers];
  const remainingInRow = cols - (nextGrid.length % cols);
  if (remainingInRow < cols && remainingInRow !== 0) {
    for (let i = 0; i < remainingInRow; i++) {
      nextGrid.push(null);
    }
  }
  return nextGrid;
};

// --- COMPONENTS ---
interface NumberCellProps {
  value: CellValue;
  isSelected: boolean;
  isPossibleMatch?: boolean;
  onClick: () => void;
  id?: string;
}

const NumberCell: React.FC<NumberCellProps> = ({ value, isSelected, isPossibleMatch, onClick, id }) => {
  const baseStyles = "w-full aspect-square flex items-center justify-center text-lg sm:text-xl font-bold transition-all duration-200 cursor-pointer relative";
  let selectionStyles = "bg-white text-slate-700 hover:bg-slate-50";
  let borderStyles = "border-r border-b border-slate-200";

  if (value === null) {
    selectionStyles = "bg-slate-50 opacity-30 cursor-default";
  } else if (isSelected) {
    selectionStyles = "bg-blue-500 text-white z-10 shadow-inner";
  }

  const matchIndicator = isPossibleMatch ? (
    <div className="absolute inset-0 border-4 border-blue-300/60 pointer-events-none rounded-sm z-20"></div>
  ) : null;

  return (
    <div 
      id={id}
      className={`${baseStyles} ${selectionStyles} ${borderStyles}`}
      onClick={value !== null ? onClick : undefined}
    >
      {value}
      {matchIndicator}
    </div>
  );
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<CellValue[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [refillsRemaining, setRefillsRemaining] = useState(MAX_REFILLS);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [activeMatchLine, setActiveMatchLine] = useState<MatchLine | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGrid(createInitialGrid(GRID_COLUMNS, INITIAL_FILL_COUNT));
  }, []);

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

      setActiveMatchLine({
        x1: rect1.left + rect1.width / 2 - containerRect.left,
        y1: rect1.top + rect1.height / 2 - containerRect.top,
        x2: rect2.left + rect2.width / 2 - containerRect.left,
        y2: rect2.top + rect2.height / 2 - containerRect.top,
      });

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

  const handleReset = () => {
    if (confirm("Reset the game?")) {
      setGrid(createInitialGrid(GRID_COLUMNS, INITIAL_FILL_COUNT));
      setRefillsRemaining(MAX_REFILLS);
      setScore(0);
      setSelectedIdx(null);
    }
  };

  const stats = useMemo(() => {
    const counts = new Set(grid.filter(v => v !== null));
    return Array.from({ length: 9 }, (_, i) => ({
      num: i + 1,
      exists: counts.has(i + 1)
    }));
  }, [grid]);

  const isWin = useMemo(() => grid.length > 0 && grid.every(v => v === null), [grid]);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col p-4 bg-slate-50 relative">
      <header className="flex justify-between items-center mb-4 pt-2">
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
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-slate-900">VICTORY!</h2>
            <p className="text-slate-500 mb-6">You've cleared the board like a master.</p>
            <button 
              onClick={handleReset}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg"
            >
              NEW GAME
            </button>
          </div>
        ) : (
          <div 
            className="grid"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}
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
            <line 
              x1={activeMatchLine.x1} 
              y1={activeMatchLine.y1} 
              x2={activeMatchLine.x2} 
              y2={activeMatchLine.y2} 
              stroke="#3b82f6" 
              strokeWidth="4" 
              strokeLinecap="round"
              className="animate-pulse opacity-0"
              style={{
                animation: 'fadeLine 0.6s ease-out forwards'
              }}
            />
            <style>{`
              @keyframes fadeLine {
                0% { opacity: 0; stroke-width: 8; }
                20% { opacity: 1; stroke-width: 6; }
                100% { opacity: 0; stroke-width: 2; }
              }
            `}</style>
          </svg>
        )}
      </div>

      {message && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-4 py-2 rounded-full shadow-2xl z-50 animate-bounce uppercase font-bold tracking-widest whitespace-nowrap">
          {message}
        </div>
      )}

      <div className="mt-4 flex justify-between px-2">
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

      <div className="grid grid-cols-3 gap-2 mt-4 pb-4">
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

        <button onClick={() => setSelectedIdx(null)} className="bg-white border border-slate-200 flex flex-col items-center justify-center py-3 rounded-xl shadow-sm text-slate-700">
          <i className="fa-solid fa-eraser text-sm mb-1 text-slate-400"></i>
          <span className="text-[9px] font-black uppercase tracking-tighter">Clear</span>
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

// --- MOUNT ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
