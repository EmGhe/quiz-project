import { Card } from '../../types/collection';
import RarityBadge from './RarityBadge';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rarity Badge - Top Left */}
        <div className="p-6 pb-2">
          <RarityBadge rarity={card.rarity} />
        </div>

        {/* Entity Name - Centered */}
        <div className="px-6 pb-4">
          <h2 className="text-3xl font-bold text-center text-gray-800">
            {card.entity.label}
          </h2>
        </div>

        {/* Image - ~90% width */}
        <div className="px-8 pb-6">
          <img
            src={card.imageUrl}
            alt={card.entity.label}
            className="w-full rounded-lg shadow-md"
            style={{ maxHeight: '400px', objectFit: 'contain' }}
          />
        </div>

        {/* Description */}
        <div className="px-8 pb-6">
          <p className="text-gray-700 leading-relaxed">
            {card.entity.description}
          </p>
        </div>

        {/* Wikipedia Link */}
        {card.entity.wikipediaUrl && (
          <div className="px-8 pb-8">
            <a
              href={card.entity.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔗 Plus d'info sur Wikipédia
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
