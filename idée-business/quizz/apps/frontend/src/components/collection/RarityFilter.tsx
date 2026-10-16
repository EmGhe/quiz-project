interface RarityFilterProps {
  selectedRarity: string | null;
  onSelect: (rarity: string | null) => void;
}

const RARITIES = [
  { value: 'common', label: 'Common', emoji: '⚪' },
  { value: 'uncommon', label: 'Uncommon', emoji: '🟠' },
  { value: 'rare', label: 'Rare', emoji: '🔵' },
  { value: 'epic', label: 'Epic', emoji: '🟣' },
  { value: 'legendary', label: 'Legendary', emoji: '🟡' },
];

export default function RarityFilter({ selectedRarity, onSelect }: RarityFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedRarity === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        Toutes
      </button>

      {RARITIES.map((rarity) => (
        <button
          key={rarity.value}
          onClick={() => onSelect(rarity.value)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRarity === rarity.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {rarity.emoji} {rarity.label}
        </button>
      ))}
    </div>
  );
}
