import { useState } from 'react';
import { Card } from '../../types/collection';
import { useTagStore } from '../../stores/tagStore';
import { cardsApi } from '../../services/tags.api';
import RarityBadge from './RarityBadge';
import TagBadge from './TagBadge';
import FavoriteIcon from './FavoriteIcon';

interface CardComponentProps {
  card: Card;
  onClick: () => void;
}

export default function CardComponent({ card, onClick }: CardComponentProps): JSX.Element {
  const tagStore = useTagStore();
  const cardTags = tagStore.getCardTags(card.id);
  const [isFavorite, setIsFavorite] = useState(card.isFavorite || false);

  const handleToggleFavorite = async (): Promise<void> => {
    try {
      await cardsApi.toggleFavorite(card.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Étoile favoris - coin supérieur gauche */}
      <div className="absolute top-2 left-2 z-10">
        <FavoriteIcon isFavorite={isFavorite} onToggle={handleToggleFavorite} size="md" />
      </div>

      <img src={card.imageUrl} alt={card.entity.label} className="w-full h-48 object-cover" />

      <div className="p-4">
        <h3 className="font-semibold text-lg">{card.entity.label}</h3>
        <RarityBadge rarity={card.rarity} />
      </div>

      {cardTags.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1 max-w-[90%]">
          {cardTags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} label={tag.label} color={tag.color} size="sm" truncate />
          ))}
          {cardTags.length > 3 && (
            <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded-full font-medium">
              +{cardTags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
