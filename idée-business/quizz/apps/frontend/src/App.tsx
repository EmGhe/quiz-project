import { useState, useEffect } from 'react';
import { questionsApi } from '@/api/questions';
import type { Question } from '@/types/api';

function App() {
  const [health, setHealth] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not running:', err));
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const result = await questionsApi.getAll();
      setQuestions(result.data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Quiz Game Platform
        </h1>

        {health && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-800 font-medium">
              ✓ Backend Status: {health.status}
            </p>
          </div>
        )}

        <button
          onClick={loadQuestions}
          disabled={loading}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Questions'}
        </button>

        <div className="mt-4">
          <p className="text-gray-600">
            Questions loaded: {questions.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
