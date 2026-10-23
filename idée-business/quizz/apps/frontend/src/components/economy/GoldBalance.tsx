import { useEffect } from 'react';
import { useGoldStore } from '@/store/goldStore';
import { Coins } from 'lucide-react';

interface GoldBalanceProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function GoldBalance({ size = 'md', showIcon = true, className = '' }: GoldBalanceProps) {
  const { balance, loading, fetchBalance } = useGoldStore();

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  if (loading && balance === 0) {
    return (
      <div className={`flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
        {showIcon && <Coins size={iconSizes[size]} className="text-yellow-500 animate-pulse" />}
        <span className="text-gray-400">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
      {showIcon && <Coins size={iconSizes[size]} className="text-yellow-500" />}
      <span className="font-mono text-yellow-600 dark:text-yellow-400">
        {balance.toLocaleString()}
      </span>
    </div>
  );
}
