import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '@/api/admin';

export default function AdminQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from URL params
  const currentPage = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const search = searchParams.get('search') || '';
  const formatDaily = searchParams.get('formatDaily') === 'true';
  const formatMcq = searchParams.get('formatMcq') === 'true';

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [currentPage, status, category, difficulty, search, formatDaily, formatMcq]);

  const loadCategories = async () => {
    try {
      const data = await adminApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getQuestions({
        page: currentPage,
        limit: 20,
        status: status || undefined,
        category: category || undefined,
        difficulty: difficulty || undefined,
        search: search || undefined,
        enabledForDaily: formatDaily || undefined,
        enabledForMcq: formatMcq || undefined,
      });
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to page 1
    setSearchParams(params);
  };

  const toggleFormatFilter = (key: string, currentValue: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (!currentValue) {
      params.set(key, 'true');
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to page 1
    setSearchParams(params);
  };

  const changePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  const toggleQuestionFormat = async (questionId: string, field: 'enabledForDaily' | 'enabledForMcq', currentValue: boolean) => {
    try {
      await adminApi.updateQuestion(questionId, { [field]: !currentValue });

      // Update local state
      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, [field]: !currentValue } : q
      ));
    } catch (err) {
      console.error('Failed to update format:', err);
      alert('Failed to update format');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Questions</h1>
            <p className="text-gray-600 mt-1">
              {pagination && `${pagination.total} total questions`}
            </p>
          </div>
          <Link
            to="/admin"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />

            {/* Status */}
            <select
              value={status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Statuses</option>
              <option value="publie">Published</option>
              <option value="brouillon">Draft</option>
              <option value="archive">Archived</option>
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Difficulty */}
            <select
              value={difficulty}
              onChange={(e) => updateFilter('difficulty', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Difficulties</option>
              <option value="facile">Facile</option>
              <option value="moyen">Moyen</option>
              <option value="difficile">Difficile</option>
            </select>
          </div>

          {/* Format Filters */}
          <div className="flex items-center gap-6 pt-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Format:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formatDaily}
                onChange={() => toggleFormatFilter('formatDaily', formatDaily)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Enabled for Daily</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formatMcq}
                onChange={() => toggleFormatFilter('formatMcq', formatMcq)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Enabled for QCM</span>
            </label>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No questions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const primaryAnswer = q.acceptedAnswers?.[0]?.answer || 'N/A';
              const statusColor =
                q.status === 'publie'
                  ? 'bg-green-100 text-green-800'
                  : q.status === 'brouillon'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800';

              return (
                <div key={q.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}
                        >
                          {q.status}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {q.difficulty || 'N/A'}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {q.category?.name || 'Uncategorized'}
                        </span>
                        <button
                          onClick={() => toggleQuestionFormat(q.id, 'enabledForDaily', q.enabledForDaily)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                            q.enabledForDaily
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={q.enabledForDaily ? 'Désactiver pour Daily' : 'Activer pour Daily'}
                        >
                          Daily
                        </button>
                        <button
                          onClick={() => toggleQuestionFormat(q.id, 'enabledForMcq', q.enabledForMcq)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                            q.enabledForMcq
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={q.enabledForMcq ? 'Désactiver pour QCM' : 'Activer pour QCM'}
                        >
                          QCM
                        </button>
                      </div>
                      <p className="text-lg font-medium text-gray-900">{q.text}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Answer:</strong> {primaryAnswer}
                      </p>
                      <p>
                        Variants: {q._count.acceptedAnswers} | Distractors:{' '}
                        {q._count.distractors}
                      </p>
                      {q.successRate !== null && (
                        <p>
                          Success Rate:{' '}
                          <span
                            className={
                              parseFloat(q.successRate) < 40
                                ? 'text-red-600'
                                : parseFloat(q.successRate) > 80
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            {parseFloat(q.successRate).toFixed(1)}%
                          </span>
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/admin/questions/${q.id}`}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      View/Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
