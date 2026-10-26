import { ShowcaseCard } from '../../types/profile';

interface CardModalProps {
  card: ShowcaseCard;
  onClose: () => void;
}

const rarityColors = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-orange-500',
};

const rarityLabels = {
  common: 'Commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export default function CardModal({ card, onClose }: CardModalProps) {
  const rarityColor = rarityColors[card.rarity as keyof typeof rarityColors] || 'bg-gray-500';
  const rarityLabel = rarityLabels[card.rarity as keyof typeof rarityLabels] || card.rarity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold z-10"
          aria-label="Fermer"
        >
          ×
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Image */}
          <div className="flex justify-center mb-6">
            <img
              src={card.imageUrl}
              alt={card.entityLabel}
              className={`max-w-full max-h-80 object-contain rounded-lg border-4 ${
                card.rarity === 'legendary'
                  ? 'border-orange-500'
                  : card.rarity === 'epic'
                  ? 'border-purple-500'
                  : card.rarity === 'rare'
                  ? 'border-blue-500'
                  : 'border-gray-400'
              }`}
            />
          </div>

          {/* Title and Rarity */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              {card.entityLabel}
            </h2>
            <span
              className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold ${rarityColor}`}
            >
              {rarityLabel}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Description
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {card.description}
            </p>
          </div>

          {/* Wikipedia Link */}
          {card.wikipediaUrl && (
            <div className="flex justify-center">
              <a
                href={card.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.09 2C6.52 2 2 6.52 2 12.09s4.52 10.09 10.09 10.09 10.09-4.52 10.09-10.09S17.66 2 12.09 2zm0 18.18c-4.46 0-8.09-3.63-8.09-8.09S7.63 4 12.09 4s8.09 3.63 8.09 8.09-3.63 8.09-8.09 8.09z" />
                  <path d="M12.09 6.18c-3.27 0-5.91 2.64-5.91 5.91s2.64 5.91 5.91 5.91 5.91-2.64 5.91-5.91-2.64-5.91-5.91-5.91zm.85 8.95h-1.7v-5.68h1.7v5.68z" />
                </svg>
                Voir sur Wikipédia
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
