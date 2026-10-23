interface TagBadgeProps {
  label: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  truncate?: boolean;
}

export default function TagBadge({
  label,
  color,
  size = 'md',
  removable = false,
  onRemove,
  truncate = false,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full text-white font-medium ${sizeClasses[size]} ${truncate ? 'max-w-[100px]' : ''}`}
      style={{ backgroundColor: color }}
    >
      <span className={truncate ? 'truncate' : ''}>{label}</span>
      {removable && (
        <button
          onClick={onRemove}
          className="hover:opacity-80 ml-1"
          aria-label="Retirer l'étiquette"
        >
          ×
        </button>
      )}
    </div>
  );
}
