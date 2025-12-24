
import React from 'react';
import { CellValue } from '../types.ts';

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

export default NumberCell;