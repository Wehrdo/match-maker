
import { CellValue } from '../types';

export const GRID_COLUMNS = 10;
export const INITIAL_FILL_COUNT = 35; // Configurable initial count
export const MAX_REFILLS = 5;

export const createInitialGrid = (cols: number, fillCount: number): CellValue[] => {
  const grid: CellValue[] = [];
  for (let i = 0; i < fillCount; i++) {
    grid.push(Math.floor(Math.random() * 9) + 1);
  }
  // Pad to complete the last row if necessary to maintain grid shape
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

export const areMatchable = (idx1: number, idx2: number, grid: CellValue[], cols: number): boolean => {
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

  // Sequential Check (Reading order)
  const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
  let sequentialClear = true;
  for (let i = start + 1; i < end; i++) {
    if (grid[i] !== null) {
      sequentialClear = false;
      break;
    }
  }
  if (sequentialClear) return true;

  // Horizontal
  if (pos1.y === pos2.y) {
    const minX = Math.min(pos1.x, pos2.x);
    const maxX = Math.max(pos1.x, pos2.x);
    for (let x = minX + 1; x < maxX; x++) {
      if (grid[getIdx(x, pos1.y, cols)] !== null) return false;
    }
    return true;
  }

  // Vertical
  if (pos1.x === pos2.x) {
    const minY = Math.min(pos1.y, pos2.y);
    const maxY = Math.max(pos1.y, pos2.y);
    for (let y = minY + 1; y < maxY; y++) {
      if (grid[getIdx(pos1.x, y, cols)] !== null) return false;
    }
    return true;
  }

  // Diagonal
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
  
  // Find the last index of a non-null value in the current grid
  let lastIndex = -1;
  for (let i = grid.length - 1; i >= 0; i--) {
    if (grid[i] !== null) {
      lastIndex = i;
      break;
    }
  }

  // If the grid is empty, start fresh
  if (lastIndex === -1) {
    return createInitialGrid(cols, INITIAL_FILL_COUNT);
  }

  // Remove any trailing nulls from the current grid so the refill starts immediately after the last number
  const prunedGrid = grid.slice(0, lastIndex + 1);
  const nextGrid = [...prunedGrid, ...existingNumbers];

  // Pad the new total length to complete the last row
  const remainingInRow = cols - (nextGrid.length % cols);
  if (remainingInRow < cols && remainingInRow !== 0) {
    for (let i = 0; i < remainingInRow; i++) {
      nextGrid.push(null);
    }
  }
  return nextGrid;
};