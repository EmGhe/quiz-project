import { useState } from 'react';
import { Tag } from '../../types/tag';
import TagBadge from './TagBadge';
import ColorPicker, { PRESET_COLORS } from './ColorPicker';

interface TagManagerProps {
  cardId: string;
  currentTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
  onCreateAndAdd: (label: string, color: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  isParentLoading?: boolean;
}

export default function TagManager({
  currentTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateAndAdd,
  onDeleteTag,
  isParentLoading = false,
}: TagManagerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showManageMode, setShowManageMode] = useState(false);

  const canAddMore = currentTags.length < 4;
  const hasNoTags = availableTags.length === 0;
  const isLoading = loading || isParentLoading;

  const currentTagIds = new Set(currentTags.map(t => t.id));
  const availableToAdd = availableTags.filter(tag => !currentTagIds.has(tag.id));

  const handleCreateAndAdd = async () => {
    if (!newLabel.trim()) return;

    setLoading(true);
    try {
      await onCreateAndAdd(newLabel.trim(), selectedColor);
      setNewLabel('');
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (hasNoTags) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">ÉTIQUETTES</h3>
        </div>

        <p className="text-gray-300 text-sm">
          Tu n&apos;as pas encore d&apos;étiquette : crée la première ci-dessous.
        </p>

        <input
          type="text"
          placeholder="Nouvelle étiquette"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={20}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />

        <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

        <button
          onClick={handleCreateAndAdd}
          disabled={!newLabel.trim() || isLoading}
          className="w-full py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Création...' : 'Créer et ajouter'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">
          ÉTIQUETTES{' '}
          {currentTags.length > 0 && (
            <span className="ml-2 text-sm text-gray-400">
              {currentTags.length} posée{currentTags.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowManageMode(!showManageMode)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showManageMode ? 'Fermer' : 'Gérer'}
        </button>
      </div>

      {showManageMode && (
        <div className="border-t border-gray-700 pt-3 space-y-2">
          <p className="text-sm text-gray-300">Mes étiquettes :</p>
          {availableTags.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune étiquette créée</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <div key={tag.id} className="relative group">
                  <TagBadge label={tag.label} color={tag.color} size="md" />
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Supprimer l'étiquette "${tag.label}" ? Elle sera retirée de toutes les cartes.`,
                        )
                      ) {
                        onDeleteTag(tag.id);
                      }
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer définitivement"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <TagBadge
              key={tag.id}
              label={tag.label}
              color={tag.color}
              size="md"
              removable
              onRemove={() => onRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-amber-500">
          Limite de 4 étiquettes atteinte. Retire-en une pour en ajouter une nouvelle.
        </p>
      )}

      {canAddMore && availableToAdd.length > 0 && (
        <div className="border-t border-gray-700 pt-3 space-y-2">
          <p className="text-sm text-gray-300">Ajouter une étiquette existante :</p>
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map((tag) => (
              <button
                key={tag.id}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onAddTag(tag.id);
                  } catch (error) {
                    console.error(error);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={isLoading}
                className="hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <TagBadge label={tag.label} color={tag.color} size="md" />
              </button>
            ))}
          </div>
        </div>
      )}

      {canAddMore && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Nouvelle étiquette
        </button>
      )}

      {canAddMore && showCreateForm && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <input
            type="text"
            placeholder="Nouvelle étiquette"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

          <div className="flex gap-2">
            <button
              onClick={handleCreateAndAdd}
              disabled={!newLabel.trim() || isLoading}
              className="flex-1 py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Création...' : 'Créer et poser'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewLabel('');
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
