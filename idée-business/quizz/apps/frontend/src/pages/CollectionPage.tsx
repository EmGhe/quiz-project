import { useEffect, useState } from 'react';
import { useCollectionStore } from '../stores/collectionStore';
import CardGrid from '../components/collection/CardGrid';
import { Card } from '../types/collection';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards } = useCollectionStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    // Modal will be added in next task
    console.log('Card clicked:', card.entity.label);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Chargement de la collection...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>

        <CardGrid cards={cards} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}
