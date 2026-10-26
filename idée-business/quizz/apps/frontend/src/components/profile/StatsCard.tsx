import { DailyStats, PvPStats, CollectionStats } from '../../types/profile';

interface StatsCardProps {
  dailyStats: DailyStats;
  pvpStats: PvPStats;
  collectionStats: CollectionStats;
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="ml-2 font-medium">{value}</span>
    </div>
  );
}

export default function StatsCard({
  dailyStats,
  pvpStats,
  collectionStats,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <h3 className="text-2xl font-bold mb-6 text-center">MES STATS</h3>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-lg mb-3 text-blue-600">
            Daily Challenge
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Streak"
              value={`${dailyStats.currentStreak} jours 🔥`}
            />
            <StatItem label="Record" value={`${dailyStats.longestStreak} jours`} />
            <StatItem label="Complétés" value={dailyStats.totalDailyCompleted} />
            <StatItem
              label="Réussite"
              value={`${dailyStats.averageSuccessRate}%`}
            />
            <StatItem label="Gold gagné" value={dailyStats.totalGoldEarned} />
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-lg mb-3 text-purple-600">PvP</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Rang"
              value={`${pvpStats.currentRank} ${pvpStats.currentDivision}`}
            />
            <StatItem
              label="V/D"
              value={`${pvpStats.totalVictories}/${pvpStats.totalDefeats} (${pvpStats.winrate}%)`}
            />
            <StatItem
              label="Série"
              value={`${pvpStats.currentWinStreak} victoires${
                pvpStats.currentWinStreak > 0 ? ' 🔥' : ''
              }`}
            />
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-lg mb-3 text-green-600">
            Collection
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Cartes" value={collectionStats.totalCards} />
            <StatItem label="Common" value={collectionStats.commonCount} />
            <StatItem label="Rare" value={collectionStats.rareCount} />
            <StatItem label="Epic" value={collectionStats.epicCount} />
            <StatItem label="Legendary" value={collectionStats.legendaryCount} />
            <StatItem
              label="Favoris"
              value={`${collectionStats.favoriteCount} ⭐`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
