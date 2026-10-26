interface ProfileHeaderProps {
  avatarUrl?: string | null;
  displayName: string | null;
  username: string;
  title: string;
  rank: string;
  division: number;
  elo: number;
}

const RANK_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Master: '#9B30FF',
  Grandmaster: '#FF4500',
};

export default function ProfileHeader({
  avatarUrl,
  displayName,
  username,
  title,
  rank,
  division,
  elo,
}: ProfileHeaderProps) {
  const rankColor = RANK_COLORS[rank] || '#CD7F32';
  const displayedName = displayName || username;

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayedName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">👤</span>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">{displayedName}</h2>
          <p className="text-lg text-gray-600 mt-1">"{title}"</p>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="w-24 h-24 transform rotate-45 flex items-center justify-center"
            style={{ backgroundColor: rankColor }}
          >
            <div className="transform -rotate-45 text-center">
              <div className="text-xs font-bold text-white">
                {rank} {division}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">ELO: {elo}</div>
        </div>
      </div>
    </div>
  );
}
