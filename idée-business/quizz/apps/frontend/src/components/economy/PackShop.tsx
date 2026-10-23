import { useEffect, useState } from 'react';
import { usePackStore } from '@/store/packStore';
import { useGoldStore } from '@/store/goldStore';
import { PackCard } from './PackCard';
import { PackOpening } from './PackOpening';
import { CurrencyDisplay } from './CurrencyDisplay';
import { ShoppingBag, Package } from 'lucide-react';

export function PackShop() {
  const { configs, unopenedPacks, loading, fetchConfigs, fetchUnopenedPacks, purchasePack } =
    usePackStore();
  const { balance: goldBalance, fetchBalance: fetchGoldBalance } = useGoldStore();

  const [purchasingType, setPurchasingType] = useState<string | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchConfigs();
    fetchUnopenedPacks();
    fetchGoldBalance();
  }, [fetchConfigs, fetchUnopenedPacks, fetchGoldBalance]);

  const handlePurchase = async (packType: 'BRONZE' | 'SILVER' | 'GOLD') => {
    try {
      setPurchasingType(packType);
      await purchasePack(packType);
      await fetchGoldBalance();
      await fetchUnopenedPacks();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Échec de l\'achat');
    } finally {
      setPurchasingType(null);
    }
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin">
          <ShoppingBag size={48} className="text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Boutique de Packs
            </h1>
          </div>
          <CurrencyDisplay size="lg" />
        </div>

        {showSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            ✓ Pack acheté avec succès !
          </div>
        )}
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {configs
          .sort((a, b) => a.cost - b.cost)
          .map((config) => (
            <PackCard
              key={config.type}
              config={config}
              onPurchase={() => handlePurchase(config.type)}
              userGold={goldBalance}
              disabled={purchasingType !== null}
            />
          ))}
      </div>

      {/* Unopened Packs Section */}
      {unopenedPacks.length > 0 && (
        <div className="border-t pt-8">
          <div className="flex items-center gap-2 mb-6">
            <Package size={28} className="text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Packs à ouvrir ({unopenedPacks.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {unopenedPacks.map((pack) => (
              <button
                key={pack.id}
                onClick={() => setOpeningPackId(pack.id)}
                className="
                  relative aspect-[3/4] rounded-lg
                  bg-gradient-to-br from-purple-500 to-blue-600
                  hover:scale-105 transition-transform
                  shadow-lg hover:shadow-xl
                  flex items-center justify-center
                  border-2 border-white/20
                "
              >
                <div className="text-center">
                  <Package size={48} className="text-white mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">
                    {pack.type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pack Opening Modal */}
      {openingPackId && (
        <PackOpening
          packId={openingPackId}
          onClose={() => {
            setOpeningPackId(null);
            fetchUnopenedPacks();
          }}
        />
      )}
    </div>
  );
}
