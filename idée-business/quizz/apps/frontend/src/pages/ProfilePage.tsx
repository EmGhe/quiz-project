import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../store/authStore';
import ProfileHeader from '../components/profile/ProfileHeader';
import StatsCard from '../components/profile/StatsCard';
import ShowcaseSection from '../components/profile/ShowcaseSection';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    profile,
    dailyStats,
    pvpStats,
    collectionStats,
    showcaseCards,
    loading,
    error,
    fetchProfile,
  } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  if (!profile || !dailyStats || !pvpStats || !collectionStats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">PROFIL</h1>

        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
          username={user?.username || ''}
          title={profile.currentTitle}
          rank={pvpStats.currentRank}
          division={pvpStats.currentDivision}
          elo={pvpStats.currentElo}
        />

        <StatsCard
          dailyStats={dailyStats}
          pvpStats={pvpStats}
          collectionStats={collectionStats}
        />

        <ShowcaseSection showcaseCards={showcaseCards} maxCards={10} />

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => navigate('/collec')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Voir toute ma collec
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Retour à la page d'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
