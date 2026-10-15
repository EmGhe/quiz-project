interface MCQChoiceProps {
  choice: string;
  index: number;
  isSelected: boolean;
  isRevealing: boolean;
  isCorrect: boolean;
  onClick: () => void;
  disabled: boolean;
}

export default function MCQChoice({
  choice,
  index,
  isSelected,
  isRevealing,
  isCorrect,
  onClick,
  disabled,
}: MCQChoiceProps) {
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const getClassName = () => {
    const baseClass = 'w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3';

    if (isRevealing) {
      if (isCorrect) {
        return `${baseClass} bg-green-100 border-green-500 text-green-800`;
      }
      if (isSelected && !isCorrect) {
        return `${baseClass} bg-red-100 border-red-500 text-red-800`;
      }
      return `${baseClass} bg-gray-100 border-gray-300 text-gray-600`;
    }

    if (isSelected) {
      return `${baseClass} bg-purple-100 border-purple-500 text-purple-800`;
    }

    if (disabled) {
      return `${baseClass} bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed`;
    }

    return `${baseClass} bg-white border-gray-300 text-gray-800 hover:bg-purple-50 hover:border-purple-400 cursor-pointer`;
  };

  return (
    <button onClick={onClick} disabled={disabled} className={getClassName()}>
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
        {letters[index]}
      </div>
      <div className="flex-1 font-medium">{choice}</div>
      {isRevealing && isCorrect && <span className="text-2xl">✓</span>}
      {isRevealing && isSelected && !isCorrect && <span className="text-2xl">✗</span>}
    </button>
  );
}
