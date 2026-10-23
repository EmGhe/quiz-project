interface FavoriteIconProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteIcon({
  isFavorite,
  onToggle,
  size = 'md',
}: FavoriteIconProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`hover:scale-110 transition-transform ${sizeClasses[size]}`}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {isFavorite ? '⭐' : '☆'}
    </button>
  );
}
