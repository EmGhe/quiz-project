import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminApi } from '@/api/admin';

export default function AdminQuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newVariant, setNewVariant] = useState('');

  useEffect(() => {
    if (id) loadQuestion();
  }, [id]);

  const loadQuestion = async () => {
    try {
      const data = await adminApi.getQuestion(id!);
      setQuestion(data);
    } catch (err) {
      console.error('Failed to load question:', err);
      alert('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: string | boolean) => {
    try {
      setSaving(true);
      await adminApi.updateQuestion(id!, { [field]: value });
      setQuestion({ ...question, [field]: value });
      alert('Updated!');
    } catch (err) {
      console.error('Failed to update:', err);
      alert('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.trim()) return;

    try {
      await adminApi.addAnswerVariant(id!, newVariant.trim());
      setNewVariant('');
      await loadQuestion();
      alert('Variant added!');
    } catch (err) {
      console.error('Failed to add variant:', err);
      alert('Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return;

    try {
      await adminApi.deleteAnswerVariant(variantId);
      await loadQuestion();
      alert('Variant deleted!');
    } catch (err) {
      console.error('Failed to delete variant:', err);
      alert('Failed to delete variant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Question not found</p>
      </div>
    );
  }

  const primaryAnswer = question.acceptedAnswers.find((a: any) => a.isPrimary);
  const variants = question.acceptedAnswers.filter((a: any) => !a.isPrimary);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Question Details</h1>
          <Link
            to="/admin/questions"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            ← Back to List
          </Link>
        </div>

        {/* Question Text */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Question Text</h2>
          <textarea
            value={question.text}
            onChange={(e) => setQuestion({ ...question, text: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3"
            rows={3}
          />
          <button
            onClick={() => handleUpdate('text', question.text)}
            disabled={saving}
            className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Save Text
          </button>
        </div>

        {/* Status & Difficulty */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Status & Difficulty</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={question.status}
                onChange={(e) => handleUpdate('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="brouillon">Draft</option>
                <option value="publie">Published</option>
                <option value="archive">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                value={question.difficulty || ''}
                onChange={(e) => handleUpdate('difficulty', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
          </div>
        </div>

        {/* Format Availability */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Format Availability</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={question.enabledForDaily}
                onChange={(e) => handleUpdate('enabledForDaily', e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <span className="font-medium">Enabled for Daily</span>
                <p className="text-sm text-gray-500">Open questions format</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={question.enabledForMcq}
                onChange={(e) => handleUpdate('enabledForMcq', e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <span className="font-medium">Enabled for QCM</span>
                <p className="text-sm text-gray-500">Multiple choice format (PVP)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Correct Answer */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Correct Answer</h2>
          <p className="text-xl font-semibold text-green-700">
            {primaryAnswer?.answer || 'N/A'}
          </p>
        </div>

        {/* Answer Variants */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Accepted Variants</h2>
          <div className="space-y-2 mb-4">
            {variants.length === 0 ? (
              <p className="text-gray-500 text-sm">No variants yet</p>
            ) : (
              variants.map((variant: any) => (
                <div
                  key={variant.id}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded"
                >
                  <span>{variant.answer}</span>
                  <button
                    onClick={() => handleDeleteVariant(variant.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              placeholder="Add new variant..."
              className="flex-1 border border-gray-300 rounded-lg p-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddVariant()}
            />
            <button
              onClick={handleAddVariant}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Distractors */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Distractors (QCM)</h2>
          <div className="space-y-2">
            {question.distractors.length === 0 ? (
              <p className="text-gray-500 text-sm">No distractors</p>
            ) : (
              question.distractors.map((d: any, idx: number) => (
                <div key={d.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                  <span className="font-medium text-gray-700">{idx + 1}.</span>
                  <span className="flex-1">{d.distractorText}</span>
                  <span className="text-sm text-gray-500">Score: {d.plausibilityScore}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Displayed</p>
              <p className="text-2xl font-bold">{question.displayCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Correct</p>
              <p className="text-2xl font-bold text-green-600">
                {question.correctAnswersCount || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Incorrect</p>
              <p className="text-2xl font-bold text-red-600">
                {question.incorrectAnswersCount || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold">
                {question.successRate
                  ? `${parseFloat(question.successRate).toFixed(1)}%`
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-3">Metadata</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Category:</strong> {question.category?.name || 'N/A'}
            </p>
            <p>
              <strong>Quality Score:</strong> {question.qualityScore || 'N/A'}/100
            </p>
            <p>
              <strong>Source:</strong> {question.fact?.source?.name || 'N/A'}
            </p>
            {question.fact?.sourceReference && (
              <p>
                <strong>Wikidata ID:</strong>{' '}
                <a
                  href={`https://www.wikidata.org/wiki/${question.fact.sourceReference}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  {question.fact.sourceReference}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
