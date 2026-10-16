interface RarityBadgeProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

const RARITY_CONFIG = {
  common: {
    color: 'bg-gray-400',
    label: 'Common',
  },
  uncommon: {
    color: 'bg-amber-600',
    label: 'Uncommon',
  },
  rare: {
    color: 'bg-blue-500',
    label: 'Rare',
  },
  epic: {
    color: 'bg-purple-600',
    label: 'Epic',
  },
  legendary: {
    color: 'bg-yellow-500',
    label: 'Legendary',
  },
};

export default function RarityBadge({ rarity, className = '' }: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-semibold ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
