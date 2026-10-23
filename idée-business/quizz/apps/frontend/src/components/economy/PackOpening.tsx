import { useState } from 'react';
import { usePackStore } from '@/store/packStore';
import { X, Sparkles } from 'lucide-react';
import type { PackCard as PackCardType } from '@/api/packs';

interface PackOpeningProps {
  packId: string;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: {
    bg: 'from-gray-400 to-gray-600',
    text: 'text-gray-100',
    glow: 'shadow-gray-400/50',
  },
  rare: {
    bg: 'from-blue-400 to-blue-600',
    text: 'text-blue-100',
    glow: 'shadow-blue-400/50',
  },
  epic: {
    bg: 'from-purple-400 to-purple-600',
    text: 'text-purple-100',
    glow: 'shadow-purple-400/50',
  },
  legendary: {
    bg: 'from-orange-400 to-orange-600',
    text: 'text-orange-100',
    glow: 'shadow-orange-400/70',
  },
};

export function PackOpening({ packId, onClose }: PackOpeningProps) {
  const { openPack } = usePackStore();
  const [stage, setStage] = useState<'opening' | 'revealing' | 'complete'>('opening');
  const [cards, setCards] = useState<PackCardType[]>([]);
  const [pityInfo, setPityInfo] = useState<{ epic: boolean; legendary: boolean } | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  const handleOpen = async () => {
    try {
      setStage('opening');
      // Simulate pack opening animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await openPack(packId);
      setCards(result.cards);
      setPityInfo(result.pityTriggered);
      setStage('revealing');

      // Auto-reveal cards one by one
      for (let i = 0; i < result.cards.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setRevealedCount(i + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      setStage('complete');
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'ouverture du pack');
      onClose();
    }
  };

  // Auto-open on mount
  useState(() => {
    handleOpen();
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-400" />
            Ouverture de pack
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Opening Animation */}
          {stage === 'opening' && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 animate-pulse" />
                <Sparkles
                  size={96}
                  className="absolute inset-0 m-auto text-white animate-spin"
                  style={{ animationDuration: '3s' }}
                />
              </div>
              <p className="text-white text-xl font-semibold mt-8 animate-pulse">
                Ouverture du pack...
              </p>
            </div>
          )}

          {/* Card Reveal */}
          {(stage === 'revealing' || stage === 'complete') && (
            <div>
              {/* Pity Notification */}
              {pityInfo && (pityInfo.epic || pityInfo.legendary) && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg mb-6 text-center font-semibold">
                  🎉 Pity system activé !
                  {pityInfo.legendary && ' Légendaire garantie !'}
                  {pityInfo.epic && !pityInfo.legendary && ' Épique garantie !'}
                </div>
              )}

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card, index) => {
                  const isRevealed = index < revealedCount;
                  const colors = RARITY_COLORS[card.rarity as keyof typeof RARITY_COLORS];

                  return (
                    <div
                      key={index}
                      className={`
                        relative aspect-[3/4] rounded-xl
                        transition-all duration-500
                        ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                      `}
                    >
                      {isRevealed ? (
                        <div
                          className={`
                            h-full rounded-xl border-2 border-white/30
                            bg-gradient-to-br ${colors.bg}
                            shadow-xl ${colors.glow}
                            p-4 flex flex-col items-center justify-center
                            animate-in fade-in zoom-in duration-300
                          `}
                        >
                          <Sparkles size={48} className={colors.text} />
                          <p className={`mt-4 text-center font-bold ${colors.text} uppercase tracking-wide`}>
                            {card.rarity}
                          </p>
                          <p className="text-xs text-white/70 mt-2">
                            {card.cardId.slice(0, 8)}...
                          </p>
                        </div>
                      ) : (
                        <div className="h-full rounded-xl bg-gray-700 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {stage === 'complete' && (
                <div className="mt-8 p-6 bg-gray-800 rounded-lg">
                  <h3 className="text-xl font-bold text-white mb-4">Résumé</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => {
                      const count = cards.filter((c) => c.rarity === rarity).length;
                      if (count === 0) return null;

                      const colors = RARITY_COLORS[rarity];
                      return (
                        <div key={rarity} className="space-y-1">
                          <p className="text-3xl font-bold text-white">{count}</p>
                          <p className={`text-sm font-semibold ${colors.text} uppercase`}>
                            {rarity}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
