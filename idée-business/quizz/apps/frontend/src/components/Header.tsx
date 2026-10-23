import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { CurrencyDisplay } from './economy';
import { Home, ShoppingBag, Trophy, Users, LogOut } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Quiz App
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/daily')}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Home size={20} />
              <span>Daily</span>
            </button>

            <button
              onClick={() => navigate('/shop')}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ShoppingBag size={20} />
              <span>Shop</span>
            </button>

            <button
              onClick={() => navigate('/collec')}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Trophy size={20} />
              <span>Collection</span>
            </button>

            <button
              onClick={() => navigate('/pvp')}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Users size={20} />
              <span>PvP</span>
            </button>
          </nav>

          {/* Currency & User */}
          <div className="flex items-center gap-6">
            <CurrencyDisplay size="sm" />

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-around py-3 border-t dark:border-gray-700">
          <button
            onClick={() => navigate('/daily')}
            className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
          >
            <Home size={20} />
            <span className="text-xs">Daily</span>
          </button>

          <button
            onClick={() => navigate('/shop')}
            className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
          >
            <ShoppingBag size={20} />
            <span className="text-xs">Shop</span>
          </button>

          <button
            onClick={() => navigate('/collec')}
            className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
          >
            <Trophy size={20} />
            <span className="text-xs">Collection</span>
          </button>

          <button
            onClick={() => navigate('/pvp')}
            className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
          >
            <Users size={20} />
            <span className="text-xs">PvP</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
