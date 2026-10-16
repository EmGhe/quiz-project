import { useEffect } from 'react';
import { useCollectionStore } from '../stores/collectionStore';
import CardGrid from '../components/collection/CardGrid';
import AlbumFilter from '../components/collection/AlbumFilter';
import RarityFilter from '../components/collection/RarityFilter';
import SearchInput from '../components/collection/SearchInput';
import { Card } from '../types/collection';

export default function CollectionPage() {
  const { fetchAll, loading, error, cards, albums, filters, setFilter } = useCollectionStore();

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCardClick = (card: Card) => {
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

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 space-y-4">
          {/* Album Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Albums</h3>
            <AlbumFilter
              albums={albums}
              selectedAlbumId={filters.albumId}
              onSelect={(albumId) => setFilter('albumId', albumId)}
            />
          </div>

          {/* Rarity Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Rareté</h3>
            <RarityFilter
              selectedRarity={filters.rarity}
              onSelect={(rarity) => setFilter('rarity', rarity)}
            />
          </div>

          {/* Search */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recherche</h3>
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilter('search', search)}
              placeholder="Rechercher une carte..."
            />
          </div>
        </div>

        <CardGrid cards={cards} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}
