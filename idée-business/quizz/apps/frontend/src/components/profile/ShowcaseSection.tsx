import { useState } from 'react';
import { ShowcaseCard } from '../../types/profile';
import CardModal from './CardModal';

interface ShowcaseSectionProps {
  showcaseCards: ShowcaseCard[];
  maxCards?: number;
}

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
};

function ShowcaseCardItem({ card, onClick }: { card: ShowcaseCard; onClick: () => void }) {
  const borderClass = RARITY_BORDERS[card.rarity] || 'border-gray-400';

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div className={`rounded-lg overflow-hidden border-2 ${borderClass} transform transition-transform hover:scale-105`}>
        <img
          src={card.imageUrl}
          alt={card.entityLabel}
          className="w-full aspect-[3/4] object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
        <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity text-center px-2">
          {card.entityLabel}
        </span>
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-[3/4] flex items-center justify-center">
      <span className="text-4xl text-gray-300">+</span>
    </div>
  );
}

export default function ShowcaseSection({
  showcaseCards,
  maxCards = 10,
}: ShowcaseSectionProps) {
  const [selectedCard, setSelectedCard] = useState<ShowcaseCard | null>(null);
  const emptySlots = Math.max(0, maxCards - showcaseCards.length);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h3 className="text-2xl font-bold mb-6 text-center">MA VITRINE</h3>

      {showcaseCards.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>
            Aucune carte favorite. Marquez des cartes en favori dans votre
            collection pour les afficher ici ⭐
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {showcaseCards.map((card) => (
              <ShowcaseCardItem
                key={card.id}
                card={card}
                onClick={() => setSelectedCard(card)}
              />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {showcaseCards.length}/{maxCards} cartes • Les cartes favorites
            s'affichent automatiquement
          </p>
        </>
      )}

      {/* Modal */}
      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}
