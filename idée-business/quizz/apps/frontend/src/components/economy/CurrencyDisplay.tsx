import { GoldBalance } from './GoldBalance';
import { FragmentBalance } from './FragmentBalance';

interface CurrencyDisplayProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({ className = '', size = 'md' }: CurrencyDisplayProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <GoldBalance size={size} />
      <FragmentBalance size={size} />
    </div>
  );
}
