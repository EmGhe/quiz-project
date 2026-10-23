import { useEffect } from 'react';
import { useFragmentStore } from '@/store/fragmentStore';
import { Sparkles } from 'lucide-react';

interface FragmentBalanceProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function FragmentBalance({
  size = 'md',
  showIcon = true,
  className = '',
}: FragmentBalanceProps) {
  const { balance, loading, fetchBalance } = useFragmentStore();

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
        {showIcon && <Sparkles size={iconSizes[size]} className="text-purple-500 animate-pulse" />}
        <span className="text-gray-400">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}>
      {showIcon && <Sparkles size={iconSizes[size]} className="text-purple-500" />}
      <span className="font-mono text-purple-600 dark:text-purple-400">
        {balance.toLocaleString()}
      </span>
    </div>
  );
}
