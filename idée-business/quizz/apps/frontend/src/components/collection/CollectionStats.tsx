import { CardStats } from '../../types/collection';

interface CollectionStatsProps {
  stats: CardStats | null;
}

export default function CollectionStats({ stats }: CollectionStatsProps) {
  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Statistiques</h2>

      {/* Total Cards */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-4xl">📦</span>
        <div>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-gray-600">cartes au total</p>
        </div>
      </div>

      {/* By Rarity */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Par rareté</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.byRarity).map(([rarity, count]) => (
            <div key={rarity} className="flex items-center gap-2">
              <span className="capitalize">{rarity}:</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Album */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Par album</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.byAlbum).map(([album, count]) => (
            <div key={album} className="flex items-center gap-2">
              <span>{album}:</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
