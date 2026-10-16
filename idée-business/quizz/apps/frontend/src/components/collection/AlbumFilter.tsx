import { Album } from '../../types/collection';

interface AlbumFilterProps {
  albums: Album[];
  selectedAlbumId: string | null;
  onSelect: (albumId: string | null) => void;
}

export default function AlbumFilter({ albums, selectedAlbumId, onSelect }: AlbumFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedAlbumId === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        Tous
      </button>

      {albums.map((album) => (
        <button
          key={album.id}
          onClick={() => onSelect(album.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedAlbumId === album.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {album.icon} {album.name}
        </button>
      ))}
    </div>
  );
}
