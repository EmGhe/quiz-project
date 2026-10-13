import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/api/admin';

interface ReportedQuestion {
  questionId: string;
  question: string;
  category: string;
  reportCount: number;
  status: string;
  reports: any[];
}

export default function AdminReportedQuestions() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<ReportedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minReports, setMinReports] = useState(1);

  useEffect(() => {
    loadReportedQuestions();
  }, [minReports]);

  const loadReportedQuestions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getReportedQuestions({ minReports });
      setQuestions(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reported questions');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (questionId: string, action: 'dismiss' | 'archive' | 'fix') => {
    const question = questions.find(q => q.questionId === questionId);
    if (!question) return;

    const confirmMessages = {
      dismiss: 'Marquer tous les signalements comme traités (sans action) ?',
      archive: 'Archiver cette question (elle ne sera plus affichée) ?',
      fix: 'Marquer comme corrigée ?',
    };

    if (!confirm(confirmMessages[action])) return;

    try {
      await adminApi.resolveReport(questionId, action);
      setQuestions(questions.filter(q => q.questionId !== questionId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve report');
    }
  };

  const formatReason = (reason: string) => {
    const reasons: Record<string, string> = {
      incorrect_answer: 'Réponse incorrecte',
      ambiguous: 'Question ambiguë',
      typo: 'Faute de frappe',
      inappropriate: 'Contenu inapproprié',
      other: 'Autre',
    };
    return reasons[reason] || reason;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Questions Signalées
            </h1>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Retour
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">
              Minimum de signalements:
            </label>
            <select
              value={minReports}
              onChange={(e) => setMinReports(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={5}>5+</option>
            </select>
            <span className="text-sm text-gray-600">
              {questions.length} question{questions.length !== 1 ? 's' : ''} trouvée{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Aucune question signalée</p>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question) => (
              <div key={question.questionId} className="bg-white rounded-lg shadow-md p-6">
                {/* Question Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {question.question}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Catégorie: {question.category || 'N/A'}</span>
                      <span className="font-semibold text-red-600">
                        {question.reportCount} signalement{question.reportCount > 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-500">
                        Statut: {question.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/questions/${question.questionId}`)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Voir détails
                  </button>
                </div>

                {/* Reports */}
                <div className="mb-4 space-y-2">
                  {Array.isArray(question.reports) && question.reports.length > 0 ? (
                    question.reports.map((report: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-700">
                            {formatReason(report.reason || 'other')}
                          </span>
                          {report.timestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(report.timestamp).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                        {report.comment && (
                          <p className="text-gray-600 mt-1">
                            "{report.comment}"
                          </p>
                        )}
                        {report.username && (
                          <p className="text-xs text-gray-500 mt-1">
                            Par: {report.username}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Aucun détail de signalement</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleResolve(question.questionId, 'fix')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✅ Marquer comme corrigée
                  </button>
                  <button
                    onClick={() => handleResolve(question.questionId, 'archive')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    📦 Archiver
                  </button>
                  <button
                    onClick={() => handleResolve(question.questionId, 'dismiss')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    ❌ Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
