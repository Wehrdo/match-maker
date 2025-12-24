
export type CellValue = number | null;

export interface GameState {
  grid: CellValue[];
  columns: number;
  refillsRemaining: number;
  selectedIdx: number | null;
  score: number;
  isGameOver: boolean;
  history: CellValue[][];
}

export interface MatchResult {
  isValid: boolean;
  type?: 'sum' | 'identical';
}
