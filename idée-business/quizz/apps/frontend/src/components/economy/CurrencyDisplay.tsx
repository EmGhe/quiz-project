import { useEffect } from 'react';
import { GoldBalance } from './GoldBalance';
import { FragmentBalance } from './FragmentBalance';
import { useGoldStore } from '@/store/goldStore';
import { useFragmentStore } from '@/store/fragmentStore';

interface CurrencyDisplayProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({ className = '', size = 'md' }: CurrencyDisplayProps) {
  const { fetchBalance: fetchGold } = useGoldStore();
  const { fetchBalance: fetchFragments } = useFragmentStore();

  // Refresh balances when component mounts
  useEffect(() => {
    fetchGold();
    fetchFragments();
  }, [fetchGold, fetchFragments]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <GoldBalance size={size} />
      <FragmentBalance size={size} />
    </div>
  );
}
