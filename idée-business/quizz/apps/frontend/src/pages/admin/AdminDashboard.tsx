import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('Loading admin stats...');
      const data = await adminApi.getStats();
      console.log('Stats loaded:', data);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats - Full error:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      if (err.response?.status === 403) {
        alert('Admin access required');
      } else {
        alert(`Error loading stats: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load admin dashboard</p>
          <p className="text-gray-600">Make sure you're logged in as admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage quiz questions and content</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm">Total Questions</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-6">
            <p className="text-green-700 text-sm">Published</p>
            <p className="text-3xl font-bold text-green-700">{stats.published}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <p className="text-yellow-700 text-sm">Draft</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.draft}</p>
          </div>

          <div className="bg-gray-100 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Archived</p>
            <p className="text-3xl font-bold text-gray-600">{stats.archived}</p>
          </div>
        </div>

        {/* Categories Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Questions by Category</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Questions</th>
                  <th className="px-4 py-2 text-right">Avg Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((cat: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-3">{cat.category}</td>
                    <td className="px-4 py-3 text-right font-medium">{cat.count}</td>
                    <td className="px-4 py-3 text-right">
                      {cat.avgSuccessRate !== null ? (
                        <span
                          className={
                            cat.avgSuccessRate < 40
                              ? 'text-red-600'
                              : cat.avgSuccessRate > 80
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }
                        >
                          {cat.avgSuccessRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        {(stats.alerts.lowSuccess > 0 || stats.alerts.highSuccess > 0) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Alerts</h3>
            <ul className="space-y-1 text-yellow-700">
              {stats.alerts.lowSuccess > 0 && (
                <li>• {stats.alerts.lowSuccess} questions with low success rate (&lt;10%)</li>
              )}
              {stats.alerts.highSuccess > 0 && (
                <li>• {stats.alerts.highSuccess} questions with high success rate (&gt;95%)</li>
              )}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/admin/questions"
            className="bg-primary-600 text-white rounded-lg shadow p-6 hover:bg-primary-700 transition text-center"
          >
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-xl font-bold">Manage Questions</h3>
            <p className="text-sm opacity-90 mt-1">View, edit, and filter questions</p>
          </Link>

          <Link
            to="/admin/reported"
            className="bg-red-600 text-white rounded-lg shadow p-6 hover:bg-red-700 transition text-center"
          >
            <div className="text-4xl mb-2">🚨</div>
            <h3 className="text-xl font-bold">Questions Signalées</h3>
            <p className="text-sm opacity-90 mt-1">Review user reports</p>
          </Link>

          <Link
            to="/admin/questions?status=brouillon"
            className="bg-white border-2 border-gray-200 rounded-lg shadow p-6 hover:border-primary-300 transition text-center"
          >
            <div className="text-4xl mb-2">✏️</div>
            <h3 className="text-xl font-bold text-gray-900">Review Drafts</h3>
            <p className="text-sm text-gray-600 mt-1">Approve or edit draft questions</p>
          </Link>

          <Link
            to="/"
            className="bg-white border-2 border-gray-200 rounded-lg shadow p-6 hover:border-primary-300 transition text-center"
          >
            <div className="text-4xl mb-2">🏠</div>
            <h3 className="text-xl font-bold text-gray-900">Back to App</h3>
            <p className="text-sm text-gray-600 mt-1">Return to main app</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
