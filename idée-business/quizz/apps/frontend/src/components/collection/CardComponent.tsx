import { Card } from '../../types/collection';
import RarityBadge from './RarityBadge';

interface CardComponentProps {
  card: Card;
  onClick: (card: Card) => void;
}

export default function CardComponent({ card, onClick }: CardComponentProps) {
  return (
    <div
      onClick={() => onClick(card)}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
    >
      {/* Image */}
      <div className="aspect-[3/4] bg-gray-200 overflow-hidden">
        <img
          src={card.imageUrl}
          alt={card.entity.label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Name */}
      <div className="p-3 text-center">
        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 min-h-[3.5rem]">
          {card.entity.label}
        </h3>
      </div>

      {/* Rarity Badge */}
      <div className="px-3 pb-3 flex justify-center">
        <RarityBadge rarity={card.rarity} />
      </div>
    </div>
  );
}
