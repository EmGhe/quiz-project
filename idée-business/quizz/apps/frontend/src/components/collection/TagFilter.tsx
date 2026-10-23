import { Tag } from '../../types/tag';
import TagBadge from './TagBadge';

interface TagFilterProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
}

export default function TagFilter({ tags, selectedTagId, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedTagId === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Toutes
      </button>

      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.id)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedTagId === tag.id
              ? 'ring-2 ring-blue-500 ring-offset-2'
              : 'hover:opacity-80'
          }`}
        >
          <TagBadge label={tag.label} color={tag.color} size="sm" />
          <span className="text-sm text-gray-500">({tag.cardCount})</span>
        </button>
      ))}
    </div>
  );
}
