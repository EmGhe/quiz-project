import { useEffect, useState } from 'react';
import { Card } from '../../types/collection';
import { Tag } from '../../types/tag';
import { useTagStore } from '../../stores/tagStore';
import { cardsApi } from '../../services/tags.api';
import RarityBadge from './RarityBadge';
import TagManager from './TagManager';
import FavoriteIcon from './FavoriteIcon';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const tagStore = useTagStore();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [isFavorite, setIsFavorite] = useState(card.isFavorite || false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCardTags = async () => {
      await tagStore.fetchCardTags(card.id);
      setCurrentTags(tagStore.getCardTags(card.id));
    };
    loadCardTags();
  }, [card.id, tagStore]);

  const handleToggleFavorite = async () => {
    try {
      await cardsApi.toggleFavorite(card.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.addTagToCard(tagId, card.id);
      await tagStore.fetchCardTags(card.id);
      setCurrentTags(tagStore.getCardTags(card.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.removeTagFromCard(tagId, card.id);
      await tagStore.fetchCardTags(card.id);
      setCurrentTags(tagStore.getCardTags(card.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async (label: string, color: string) => {
    setLoading(true);
    try {
      const newTag = await tagStore.createTag(label, color);
      await tagStore.addTagToCard(newTag.id, card.id);
      await tagStore.fetchCardTags(card.id);
      setCurrentTags(tagStore.getCardTags(card.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left Panel */}
          <div className="md:w-1/2 p-6 bg-gray-50">
            <div className="relative">
              <RarityBadge rarity={card.rarity} />
              <img
                src={card.imageUrl}
                alt={card.entity.label}
                className="w-full rounded-lg shadow-md mt-4"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <FavoriteIcon
                isFavorite={isFavorite}
                onToggle={handleToggleFavorite}
                size="lg"
              />
              <h2 className="text-2xl font-bold text-center">{card.entity.label}</h2>
            </div>
            <p className="text-gray-700 text-center mt-2">{card.entity.description}</p>
          </div>

          {/* Right Panel */}
          <div className="md:w-1/2 p-6 space-y-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>

            <h2 className="text-3xl font-bold">{card.entity.label}</h2>

            <div>
              <RarityBadge rarity={card.rarity} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600">Type de la carte</h3>
              <p className="text-gray-800">{card.entity.type}</p>
            </div>

            <div className="border border-gray-300 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">{card.entity.description}</p>
            </div>

            {card.entity.wikipediaUrl && (
              <a
                href={card.entity.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                🔗 Lien Wikipédia
              </a>
            )}

            <TagManager
              cardId={card.id}
              currentTags={currentTags}
              availableTags={tagStore.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateAndAdd={handleCreateAndAdd}
              isParentLoading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
