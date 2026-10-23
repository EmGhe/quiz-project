import { type PackConfig } from '@/api/packs';
import { Coins, Sparkles } from 'lucide-react';

interface PackCardProps {
  config: PackConfig;
  onPurchase: () => void;
  userGold: number;
  disabled?: boolean;
}

const PACK_COLORS = {
  BRONZE: {
    gradient: 'from-amber-700 to-amber-900',
    border: 'border-amber-600',
    text: 'text-amber-200',
    glow: 'shadow-amber-500/20',
  },
  SILVER: {
    gradient: 'from-slate-400 to-slate-600',
    border: 'border-slate-400',
    text: 'text-slate-100',
    glow: 'shadow-slate-400/20',
  },
  GOLD: {
    gradient: 'from-yellow-400 to-yellow-600',
    border: 'border-yellow-400',
    text: 'text-yellow-50',
    glow: 'shadow-yellow-400/30',
  },
};

export function PackCard({ config, onPurchase, userGold, disabled = false }: PackCardProps) {
  const colors = PACK_COLORS[config.type];
  const canAfford = userGold >= config.cost;
  const isDisabled = disabled || !canAfford;

  return (
    <div
      className={`
        relative rounded-xl border-2 ${colors.border} ${colors.glow}
        bg-gradient-to-br ${colors.gradient}
        p-6 shadow-xl transition-all hover:scale-105
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl'}
      `}
      onClick={isDisabled ? undefined : onPurchase}
    >
      {/* Pack Type Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <div className={`px-4 py-1 rounded-full bg-gradient-to-r ${colors.gradient} border-2 ${colors.border}`}>
          <span className={`font-bold text-sm ${colors.text}`}>Pack {config.type}</span>
        </div>
      </div>

      {/* Pack Icon */}
      <div className="flex justify-center mb-4 mt-2">
        <div className="relative">
          <div className="w-24 h-24 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Sparkles size={48} className={colors.text} />
          </div>
        </div>
      </div>

      {/* Pack Info */}
      <div className="space-y-3">
        <div className={`text-center ${colors.text}`}>
          <p className="text-sm opacity-90">{config.cardCount} cartes</p>
        </div>

        {/* Probabilities */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-white/80">
            <span>Commune</span>
            <span className="font-mono">{config.commonChance}%</span>
          </div>
          <div className="flex justify-between text-blue-200">
            <span>Rare</span>
            <span className="font-mono">{config.rareChance}%</span>
          </div>
          <div className="flex justify-between text-purple-200">
            <span>Épique</span>
            <span className="font-mono">{config.epicChance}%</span>
          </div>
          <div className="flex justify-between text-orange-200">
            <span>Légendaire</span>
            <span className="font-mono">{config.legendaryChance}%</span>
          </div>
        </div>

        {/* Guarantees */}
        <div className="border-t border-white/20 pt-2 space-y-1 text-xs text-white/70">
          {config.minRares > 0 && <p>✓ Min. {config.minRares} Rare{config.minRares > 1 ? 's' : ''}</p>}
          {config.minEpics > 0 && <p>✓ Min. {config.minEpics} Épique{config.minEpics > 1 ? 's' : ''}</p>}
          {config.epicPityCount > 0 && <p>⚡ Pity Épique: {config.epicPityCount} packs</p>}
          <p>⚡ Pity Légendaire: {config.legendaryPityCount} packs</p>
        </div>

        {/* Price */}
        <button
          className={`
            w-full mt-4 py-3 rounded-lg font-semibold
            flex items-center justify-center gap-2
            transition-all
            ${
              isDisabled
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-white/20 hover:bg-white/30 text-white shadow-lg'
            }
          `}
          disabled={isDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onPurchase();
          }}
        >
          <Coins size={20} />
          <span>{config.cost.toLocaleString()} Gold</span>
        </button>

        {!canAfford && !disabled && (
          <p className="text-xs text-center text-red-200 mt-2">
            Pas assez de Gold
          </p>
        )}
      </div>
    </div>
  );
}
