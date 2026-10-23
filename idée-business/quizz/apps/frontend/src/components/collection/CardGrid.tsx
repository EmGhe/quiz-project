import { Card } from '../../types/collection';
import CardComponent from './CardComponent';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export default function CardGrid({ cards, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow">
        <p className="text-xl text-gray-600">
          Aucune carte trouvée avec ces filtres
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card) => (
        <CardComponent key={card.id} card={card} onClick={() => onCardClick(card)} />
      ))}
    </div>
  );
}
