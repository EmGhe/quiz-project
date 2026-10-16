import { useEffect } from 'react';
import { useCollectionStore } from '../store/collectionStore';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards } = useCollectionStore();

  useEffect(() => {
    fetchAll();
  }, []);

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

        {/* Placeholder - will add components in next tasks */}
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <p className="text-2xl font-semibold mb-4">
            {cards.length} cartes chargées
          </p>
          <p className="text-gray-600">
            Les composants de la galerie seront ajoutés dans les prochaines tâches
          </p>
        </div>
      </div>
    </div>
  );
}
