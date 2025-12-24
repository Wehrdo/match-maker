
import { CellValue } from '../types.ts';

export const GRID_COLUMNS = 10;
export const INITIAL_FILL_COUNT = 35;
export const MAX_REFILLS = 5;

export const createInitialGrid = (cols: number, fillCount: number): CellValue[] => {
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

export const getPos = (idx: number, cols: number) => ({
  x: idx % cols,
  y: Math.floor(idx / cols),
});

export const getIdx = (x: number, y: number, cols: number) => y * cols + x;

// Match path types for visualization
export type MatchPathType = 'sequential' | 'sequential-wrap' | 'horizontal' | 'vertical' | 'diagonal' | null;

/**
 * Determines the type of path between two matched cells.
 * Returns null if no valid path exists.
 * 
 * Path types:
 * - 'sequential': cells connected through linear array (same row or continues naturally)
 * - 'sequential-wrap': cells connected through linear array crossing row boundary
 * - 'horizontal': same row, connected horizontally
 * - 'vertical': same column, connected vertically
 * - 'diagonal': connected diagonally
 */
export const getMatchPath = (idx1: number, idx2: number, grid: CellValue[], cols: number): MatchPathType => {
  const v1 = grid[idx1];
  const v2 = grid[idx2];

  if (v1 === null || v2 === null || idx1 === idx2) return null;
  
  const valuesMatch = (v1 + v2 === 10) || (v1 === v2);
  if (!valuesMatch) return null;

  const pos1 = getPos(idx1, cols);
  const pos2 = getPos(idx2, cols);

  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Check sequential path (through linear array)
  const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
  let sequentialClear = true;
  for (let i = start + 1; i < end; i++) {
    if (grid[i] !== null) {
      sequentialClear = false;
      break;
    }
  }
  if (sequentialClear) {
    // Determine if this sequential path wraps around rows
    const startCol = start % cols;
    const endCol = end % cols;
    const startRow = Math.floor(start / cols);
    const endRow = Math.floor(end / cols);
    
    // Wrap-around: different rows AND column decreases (path crosses row boundary backwards)
    const isWrap = startRow !== endRow && startCol > endCol;
    return isWrap ? 'sequential-wrap' : 'sequential';
  }

  // Check horizontal path (same row)
  if (pos1.y === pos2.y) {
    const minX = Math.min(pos1.x, pos2.x);
    const maxX = Math.max(pos1.x, pos2.x);
    for (let x = minX + 1; x < maxX; x++) {
      if (grid[getIdx(x, pos1.y, cols)] !== null) return null;
    }
    return 'horizontal';
  }

  // Check vertical path (same column)
  if (pos1.x === pos2.x) {
    const minY = Math.min(pos1.y, pos2.y);
    const maxY = Math.max(pos1.y, pos2.y);
    for (let y = minY + 1; y < maxY; y++) {
      if (grid[getIdx(pos1.x, y, cols)] !== null) return null;
    }
    return 'vertical';
  }

  // Check diagonal path
  if (absDx === absDy) {
    const stepX = dx / (absDx || 1);
    const stepY = dy / (absDy || 1);
    for (let i = 1; i < absDx; i++) {
      const curX = pos1.x + i * stepX;
      const curY = pos1.y + i * stepY;
      if (grid[getIdx(curX, curY, cols)] !== null) return null;
    }
    return 'diagonal';
  }

  return null;
};

export const areMatchable = (idx1: number, idx2: number, grid: CellValue[], cols: number): boolean => {
  return getMatchPath(idx1, idx2, grid, cols) !== null;
};

export const collapseEmptyRows = (grid: CellValue[], cols: number): CellValue[] => {
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

export const refillGrid = (grid: CellValue[], cols: number): CellValue[] => {
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